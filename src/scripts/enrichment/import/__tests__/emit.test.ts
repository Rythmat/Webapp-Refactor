import { describe, expect, it } from 'vitest';
import type { Suggestion } from '@/content/suggestions/types';
import type { WikidataView } from '../artistFields';
import { buildSuggestions, scoreArtists } from '../buildSuggestions';
import {
  type CalibrationEntry,
  type CalibrationFile,
  calibrationFile,
  calibrationStep,
  type CurrentPick,
  measurePrecision,
  SAMPLE_RULE,
  sampleForCalibration,
  sampleRuleOf,
  STRATA,
  type Stratum,
  stratumQuotas,
  verdictFor,
} from '../calibrate';
import { ARTIFACTS_VERSION, emitArtifacts } from '../emit';
import type { IdentityTier } from '../scoreIdentity';
import {
  area,
  candidate,
  evidence,
  mbid,
  songCandidate,
} from './scoreFixtures';

const noWikidata: WikidataView = {
  item: () => undefined,
  place: () => undefined,
  label: () => null,
};

/** One sure artist, one ambiguous, one held back while the fetch runs. */
function built() {
  const { scored, shared } = scoreArtists([
    evidence({
      songCandidates: [songCandidate(1, ['lets_get_it_on'])],
      years: [1971],
      pin: {
        key: 'marvin gaye',
        city: 'Detroit',
        country: 'US',
        coordinates: [42.33, -83.05],
        placeId: 'detroit',
      },
      candidates: [
        candidate(1, {
          lifeSpan: { begin: '1939-04-02' },
          area: area('Detroit'),
        }),
      ],
    }),
    evidence({
      slug: 'common',
      name: 'Common',
      oneWord: true,
      candidates: [
        candidate(2, { name: 'Common' }),
        candidate(3, { name: 'Common' }),
      ],
    }),
    evidence({
      slug: 'asa',
      name: 'Asa',
      pending: true,
      candidates: [candidate(4, { name: 'Asa' })],
    }),
  ]);
  return {
    scored,
    built: buildSuggestions(scored, shared, noWikidata, 'mb-2026-10-01'),
  };
}

describe('the suggestion rows', () => {
  it('holds back an artist the fetch has not reached, and counts every tier and field', () => {
    const { built: b } = built();
    expect(b.counts.identity).toEqual({
      sure: 1,
      likely: 0,
      ambiguous: 1,
      weak: 0,
      none: 0,
      pending: 1,
    });
    expect(b.suggestions.some((s) => s.target.slug === 'asa')).toBe(false);
    expect(b.counts.byField['externalIds.mbid']).toEqual({
      sure: 1,
      likely: 0,
      ambiguous: 1,
    });
    expect(b.counts.byField['basedInPlaceId']).toEqual({
      sure: 1,
      likely: 0,
      ambiguous: 0,
    });
    expect(b.counts.suggestions).toBe(b.suggestions.length);
    // Sorted by artist, then path.
    expect(b.suggestions.map((s) => s.target.slug)).toEqual(
      [...b.suggestions.map((s) => s.target.slug)].sort(),
    );
  });
});

describe('the artifacts', () => {
  it('writes one row per line, a manifest with hashes and counts, and no timestamps in the rows', () => {
    const { built: b } = built();
    const now = () => new Date('2026-10-01T12:00:00Z');
    const input = {
      built: b,
      batch: 'mb-2026-10-01',
      registryArtists: 3,
      cache: { digest: 'd', responses: 10, byHost: { 'musicbrainz.org': 10 } },
      inputs: { '_mb_cache.json': { sha256: 'abc', bytes: 1 } },
      stageFingerprint: 'fp',
      now,
    };
    const { files, manifest } = emitArtifacts(input);

    const artists = JSON.parse(files['artists.json']) as {
      artifactsVersion: number;
      batch: string;
      suggestions: Suggestion[];
    };
    expect(artists.artifactsVersion).toBe(ARTIFACTS_VERSION);
    expect(artists.suggestions).toEqual(b.suggestions);
    const lines = files['artists.json'].split('\n');
    expect(lines.filter((l) => l.startsWith('    {"id":'))).toHaveLength(
      b.suggestions.length,
    );
    expect(files['artists.json']).not.toMatch(/generatedAt/);
    expect(JSON.parse(files['places.json']).places).toEqual([]);

    expect(manifest).toMatchObject({
      artifactsVersion: ARTIFACTS_VERSION,
      batch: 'mb-2026-10-01',
      generatedAt: '2026-10-01T12:00:00.000Z',
      calibrated: false,
      measuredPrecision: null,
      cache: { digest: 'd' },
      inputs: { '_mb_cache.json': { sha256: 'abc' } },
      stageFingerprint: 'fp',
      counts: { registryArtists: 3, suggestions: b.suggestions.length },
    });
    expect(manifest.files.map((f) => f.file)).toEqual([
      'artists.json',
      'places.json',
    ]);
    expect(JSON.parse(files['manifest.json'])).toEqual(manifest);

    // The same cache emits the same rows; calibration carries over only
    // while the rows are unchanged.
    const calibrated = {
      ...manifest,
      calibrated: true,
      measuredPrecision: 0.99,
    };
    const again = emitArtifacts({ ...input, previous: calibrated });
    expect(again.files['artists.json']).toBe(files['artists.json']);
    expect(again.manifest).toMatchObject({
      calibrated: true,
      measuredPrecision: 0.99,
    });
    const changed = emitArtifacts({
      ...input,
      built: { ...b, suggestions: b.suggestions.slice(1) },
      previous: calibrated,
    });
    expect(changed.manifest).toMatchObject({
      calibrated: false,
      measuredPrecision: null,
    });
  });
});

// ── calibration ──────────────────────────────────────────────────────────

/**
 * 500 artists: sure with songs (i % 5 === 0), sure without (1, name +
 * release title + area + life-span + genre), likely (2), weak (3), no
 * candidate (4); every third a one-word name. Every sure pick with a song on
 * its own record has the song in the library, as in the real library; of
 * the rest only some do: one in five without song evidence, one in two of
 * the others.
 */
function population() {
  return Array.from({ length: 500 }, (_, i) => {
    const oneWord = i % 3 === 0;
    const name = oneWord ? `Solo${i}` : `Two Words ${i}`;
    const kind = i % 5;
    const inLibrary = kind === 0 || (kind === 1 ? i % 25 === 1 : i % 10 < 5);
    return evidence({
      slug: `artist-${i}`,
      name,
      oneWord,
      songTitles: inLibrary ? { [`song-${i}`]: `Song ${i}` } : {},
      years: [1980],
      genres: new Set(['rock']),
      pin: {
        key: name.toLowerCase(),
        city: 'Detroit',
        country: 'US',
        coordinates: [42.33, -83.05],
        placeId: 'detroit',
      },
      events: [
        {
          id: `evt-${i}`,
          title: `${name} releases "Record ${i}"`,
          text: `${name} releases "Record ${i}"`,
        },
      ],
      songCandidates:
        kind === 0 || kind === 2 ? [songCandidate(i, [`song-${i}`])] : [],
      candidates:
        kind === 4
          ? []
          : [
              candidate(i, {
                name,
                ...(kind <= 1
                  ? { lifeSpan: { begin: '1970' }, area: area('Detroit') }
                  : {}),
                releaseTitles: kind === 1 ? [`Record ${i}`] : [],
                genres: kind === 1 ? ['rock'] : [],
              }),
            ],
    });
  });
}

describe('the calibration sample', () => {
  it('draws only artists with library songs, mostly sure picks, by stratum', () => {
    const { scored } = scoreArtists(population());
    const file = calibrationFile(scored);
    const { strata } = file.sample;
    // The fixture is what it says: 100 sure with songs; 20 sure without
    // song evidence have a library song, less the 6 one-word names among
    // them (never sure without a song on their own record: likely).
    expect(strata['sure-songs']).toMatchObject({
      population: 100,
      withSongs: 100,
    });
    expect(strata['sure-no-songs']).toMatchObject({
      population: 67,
      withSongs: 14,
    });
    expect(strata['no-candidate']).toMatchObject({
      population: 100,
      withSongs: 50,
    });

    const sample = sampleForCalibration(scored);
    expect(sample).toHaveLength(100);
    expect(
      sample.every((s) => Object.keys(s.evidence.songTitles).length > 0),
    ).toBe(true);
    expect(file.sample).toMatchObject({
      rule: SAMPLE_RULE,
      size: 100,
      withSongs: 100,
      oneWord: 20,
    });
    expect(file.artists.every((a) => a.hasSongs)).toBe(true);

    const drawn = (s: Stratum) => strata[s].sampled;
    // Every sure pick without song evidence that has a song (fewer than the
    // floor of 25), and 65 sure in all, with the five no ambiguous pick
    // here could fill.
    expect(drawn('sure-no-songs')).toBe(14);
    expect(drawn('sure-songs') + drawn('sure-no-songs')).toBe(70);
    expect(drawn('likely')).toBe(20);
    expect(drawn('ambiguous')).toBe(0);
    expect(drawn('weak')).toBe(5);
    expect(drawn('no-candidate')).toBe(5);
    expect(file.artists.every((a) => STRATA.includes(a.stratum))).toBe(true);
  });

  it('keeps to 20 one-word names when a small stratum must take its own', () => {
    // Three ambiguous artists with songs, two of them one-word names: all
    // three are drawn, and the two count toward the 20.
    const ambiguous = ['Grease', 'Redbone', 'Jungle Book'].map((name, i) =>
      evidence({
        slug: `ambiguous-${i}`,
        name,
        oneWord: !name.includes(' '),
        candidates: [
          candidate(9000 + 2 * i, { name }),
          candidate(9001 + 2 * i, { name }),
        ],
      }),
    );
    const { scored } = scoreArtists([...population(), ...ambiguous]);
    const file = calibrationFile(scored);
    expect(file.sample.strata.ambiguous).toMatchObject({
      withSongs: 3,
      sampled: 3,
    });
    expect(file.sample).toMatchObject({ size: 100, oneWord: 20 });
  });

  it('draws the same 100 every time, to the byte', () => {
    const { scored } = scoreArtists(population());
    const first = sampleForCalibration(scored);
    const second = sampleForCalibration([...scored].reverse());
    expect(first.map((s) => s.evidence.slug)).toEqual(
      second.map((s) => s.evidence.slug),
    );
    expect(JSON.stringify(calibrationFile([...scored].reverse()))).toBe(
      JSON.stringify(calibrationFile(scored)),
    );
  });

  it('shares out a short stratum, and floors each sure stratum at 25', () => {
    expect(
      stratumQuotas({
        'sure-songs': 300,
        'sure-no-songs': 10,
        likely: 200,
        ambiguous: 2,
        weak: 100,
        'no-candidate': 40,
      }),
    ).toEqual({
      'sure-songs': 58,
      'sure-no-songs': 10,
      likely: 20,
      ambiguous: 2,
      weak: 5,
      'no-candidate': 5,
    });
    const quotas = stratumQuotas({
      'sure-songs': 250,
      'sure-no-songs': 50,
      likely: 200,
      ambiguous: 60,
      weak: 300,
      'no-candidate': 40,
    });
    // 25 each, and the other 15 by how many each holds (250 : 50).
    expect(quotas['sure-no-songs']).toBe(27);
    expect(quotas['sure-songs']).toBe(38);
    expect(Object.values(quotas).reduce((a, b) => a + b)).toBe(100);
  });

  it('gives the owner the pick, its links and an empty label', () => {
    const { scored } = scoreArtists(population().slice(0, 10));
    const file = calibrationFile(scored);
    expect(file.artists[0]).toMatchObject({
      label: '',
      importer: {
        pick: {
          musicbrainz: expect.stringMatching(
            /^https:\/\/musicbrainz\.org\/artist\//,
          ),
        },
      },
    });
    // An artist MusicBrainz named no one for: nothing picked, and a way to
    // say so.
    expect(
      file.artists.find((a) => a.stratum === 'no-candidate'),
    ).toMatchObject({ importer: { tier: 'none', pick: null } });
    expect(file.howToLabel.join(' ')).toMatch(/correct.*wrong.*none/s);
    expect(file.howToLabel.join(' ')).toMatch(/No pick/);
  });

  it('draws a sheet again until the owner writes in it, never after', () => {
    const { scored } = scoreArtists(population());
    const fresh = calibrationFile(scored);
    expect(calibrationStep(null)).toBe('draw');
    expect(calibrationStep(fresh)).toBe('draw');
    expect(sampleRuleOf(fresh)).toBe(SAMPLE_RULE);

    // A sheet drawn by the first rule (no rule written, artists without
    // songs in it) and never labelled: drawn again.
    const old: CalibrationFile = {
      ...fresh,
      sample: { ...fresh.sample, rule: undefined },
    };
    expect(sampleRuleOf(old)).toBe(1);
    expect(calibrationStep(old)).toBe('draw');

    // One label, an MBID or a note is the owner's work: kept, whatever
    // rule drew the sheet.
    const writtenIn = (more: Partial<CalibrationEntry>) => ({
      ...old,
      artists: [{ ...old.artists[0], ...more }, ...old.artists.slice(1)],
    });
    expect(calibrationStep(writtenIn({ label: 'correct' }))).toBe('measure');
    expect(calibrationStep(writtenIn({ correctMbid: mbid(1) }))).toBe(
      'measure',
    );
    expect(calibrationStep(writtenIn({ note: 'ask Ryan' }))).toBe('measure');
  });
});

describe('sure-tier precision', () => {
  const entry = (
    slug: string,
    label: CalibrationEntry['label'],
    pick: string | null,
    correctMbid?: string,
    stratum: Stratum = 'sure-songs',
  ): CalibrationEntry => ({
    slug,
    name: slug,
    oneWord: false,
    hasSongs: false,
    stratum,
    events: [],
    importer: {
      tier: 'sure',
      confidence: 0.9,
      pick: pick
        ? {
            mbid: pick,
            name: slug,
            type: null,
            score: 0.9,
            musicbrainz: '',
            reasons: [],
          }
        : null,
      notes: [],
    },
    others: [],
    label,
    ...(correctMbid ? { correctMbid } : {}),
  });
  const file = (entries: CalibrationEntry[]): CalibrationFile => ({
    about: '',
    howToLabel: [],
    sample: {
      size: entries.length,
      oneWord: 0,
      withSongs: 0,
      seed: 's',
      strata: Object.fromEntries(
        STRATA.map((s) => [s, { population: 0, withSongs: 0, sampled: 0 }]),
      ) as CalibrationFile['sample']['strata'],
    },
    artists: entries,
  });
  const now = (
    tier: IdentityTier,
    pick: string,
    stratum: Stratum | null = tier === 'sure'
      ? 'sure-songs'
      : tier === 'likely'
        ? 'likely'
        : null,
    hasSongs = true,
  ): CurrentPick => ({ tier, pick, stratum, hasSongs });

  it('judges a label against the pick it was given for', () => {
    expect(verdictFor(entry('a', 'correct', mbid(1)), mbid(1))).toBe('correct');
    expect(verdictFor(entry('a', 'wrong', mbid(1)), mbid(1))).toBe('wrong');
    expect(verdictFor(entry('a', 'none', mbid(1)), mbid(2))).toBe('wrong');
    // Labelled correct, and the importer has since moved off it: wrong now.
    expect(verdictFor(entry('a', 'correct', mbid(1)), mbid(2))).toBe('wrong');
    // Labelled wrong, and a new pick: unknown, unless the owner named the right one.
    expect(verdictFor(entry('a', 'wrong', mbid(1)), mbid(2))).toBe('relabel');
    expect(verdictFor(entry('a', 'wrong', mbid(1), mbid(2)), mbid(2))).toBe(
      'correct',
    );
    expect(verdictFor(entry('a', '', mbid(1)), mbid(1))).toBe('unlabelled');
  });

  it('passes at 98% with every sure pick judged, and at least 50 of them', () => {
    const entries = Array.from({ length: 50 }, (_, i) =>
      entry(`s${i}`, 'correct', mbid(i)),
    );
    const current = new Map(
      entries.map((e, i) => [e.slug, now('sure', mbid(i))]),
    );

    const perfect = measurePrecision(file(entries), current);
    expect(perfect).toMatchObject({
      sure: 50,
      sureCorrect: 50,
      sureWrong: 0,
      precision: 1,
      passes: true,
      blocking: [],
    });

    // One wrong in 50 is 98%: passes. Two is 96%: does not.
    const oneWrong = [...entries];
    oneWrong[0] = entry('s0', 'wrong', mbid(0));
    expect(measurePrecision(file(oneWrong), current)).toMatchObject({
      precision: 0.98,
      passes: true,
    });
    const twoWrong = [...oneWrong];
    twoWrong[1] = entry('s1', 'none', mbid(1));
    const failing = measurePrecision(file(twoWrong), current);
    expect(failing).toMatchObject({ precision: 0.96, passes: false });
    expect(failing.wrong.map((w) => w.slug)).toEqual(['s0', 's1']);
    expect(failing.blocking).toEqual([
      'sure-tier precision 96.0% is below 98%',
    ]);

    // A sure pick left unlabelled blocks it, however good the rest.
    const open = [...entries];
    open[0] = entry('s0', '', mbid(0));
    expect(measurePrecision(file(open), current)).toMatchObject({
      sureOpen: 1,
      precision: 1,
      passes: false,
    });

    // Three right out of three proves nothing.
    const few = entries.slice(0, 3);
    const small = measurePrecision(
      file(few),
      new Map(few.map((e, i) => [e.slug, now('sure', mbid(i))])),
    );
    expect(small).toMatchObject({ precision: 1, passes: false });
    expect(small.blocking[0]).toMatch(/3 sure picks judged; at least 50/);

    // Likely picks are reported, never counted in sure precision.
    const likely = new Map(current);
    likely.set('s0', now('likely', mbid(0)));
    expect(measurePrecision(file(oneWrong), likely)).toMatchObject({
      sure: 49,
      precision: 1,
      likely: { correct: 0, wrong: 1 },
    });
  });

  it('weighs each sure stratum by the picks it holds, and needs ten judged in each', () => {
    // 40 sure picks with songs, all right; 20 without, two of them wrong
    // (90%). The scoring holds 900 and 100: 0.9 × 1 + 0.1 × 0.9 = 99%.
    const withSongs = Array.from({ length: 40 }, (_, i) =>
      entry(`a${i}`, 'correct', mbid(i)),
    );
    const without = Array.from({ length: 20 }, (_, i) =>
      entry(
        `b${i}`,
        i < 2 ? 'wrong' : 'correct',
        mbid(100 + i),
        undefined,
        'sure-no-songs',
      ),
    );
    const current = new Map<string, CurrentPick>([
      ...withSongs.map((e, i): [string, CurrentPick] => [
        e.slug,
        now('sure', mbid(i)),
      ]),
      ...without.map((e, i): [string, CurrentPick] => [
        e.slug,
        now('sure', mbid(100 + i), 'sure-no-songs'),
      ]),
    ]);
    // The rest of the scoring, outside the sample.
    for (let i = 0; i < 860; i++)
      current.set(`x${i}`, now('sure', mbid(1000 + i)));
    for (let i = 0; i < 80; i++)
      current.set(`y${i}`, now('sure', mbid(5000 + i), 'sure-no-songs'));

    const result = measurePrecision(file([...withSongs, ...without]), current);
    expect(result.strata['sure-no-songs']).toMatchObject({
      population: 100,
      correct: 18,
      wrong: 2,
      precision: 0.9,
    });
    expect(result.plainPrecision).toBeCloseTo(58 / 60);
    expect(result.precision).toBeCloseTo(0.99);
    expect(result.passes).toBe(true);

    // A sure stratum with picks but too few judged: no pass.
    const thin = measurePrecision(
      file([...withSongs, ...without.slice(2, 7)]),
      current,
    );
    expect(thin.passes).toBe(false);
    expect(thin.blocking.join(' ')).toMatch(
      /sure-no-songs: 5 judged of the 10/,
    );
  });

  it('needs only the artists with songs a sure stratum has, and still weighs all its picks', () => {
    // The shape of the real scoring: 266 sure with songs, 79 sure without
    // song evidence of which 7 have a library song. The sample holds 60
    // and all 7.
    const withSongs = Array.from({ length: 60 }, (_, i) =>
      entry(`a${i}`, 'correct', mbid(i)),
    );
    const without = Array.from({ length: 7 }, (_, i) =>
      entry(`b${i}`, 'correct', mbid(100 + i), undefined, 'sure-no-songs'),
    );
    const current = new Map<string, CurrentPick>([
      ...withSongs.map((e, i): [string, CurrentPick] => [
        e.slug,
        now('sure', mbid(i)),
      ]),
      ...without.map((e, i): [string, CurrentPick] => [
        e.slug,
        now('sure', mbid(100 + i), 'sure-no-songs'),
      ]),
    ]);
    for (let i = 0; i < 206; i++)
      current.set(`x${i}`, now('sure', mbid(1000 + i)));
    const songless = new Map(current);
    for (let i = 0; i < 72; i++)
      songless.set(
        `y${i}`,
        now('sure', mbid(5000 + i), 'sure-no-songs', false),
      );

    const result = measurePrecision(file([...withSongs, ...without]), songless);
    expect(result.strata['sure-no-songs']).toMatchObject({
      population: 79,
      withSongs: 7,
      correct: 7,
    });
    expect(result).toMatchObject({ precision: 1, passes: true, blocking: [] });

    // Its seven stand for all 79: one of them wrong is 86% over a fifth of
    // the sure picks, below the bar however right the rest.
    const oneWrong = [...without];
    oneWrong[0] = entry('b0', 'wrong', mbid(100), undefined, 'sure-no-songs');
    const failing = measurePrecision(
      file([...withSongs, ...oneWrong]),
      songless,
    );
    expect(failing.precision).toBeCloseTo((266 + (79 * 6) / 7) / 345);
    expect(failing.passes).toBe(false);

    // A sure stratum none of whose artists has a song: nothing can measure
    // it, and the report says why.
    const none = new Map(
      [...songless].filter(([slug]) => !slug.startsWith('b')),
    );
    const unmeasured = measurePrecision(file(withSongs), none);
    expect(unmeasured.passes).toBe(false);
    expect(unmeasured.blocking).toContain(
      'sure-no-songs: none of its 72 sure picks has a library song, so the sample cannot measure it',
    );
  });
});
