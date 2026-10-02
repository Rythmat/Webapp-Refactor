import { describe, expect, it } from 'vitest';
import { suggestionId } from '@/content/suggestions/keys';
import type { Suggestion } from '@/content/suggestions/types';
import { loadSuggestionSeed } from '../seed';
import {
  appPlannerFrom,
  mergeSuggestions,
  plannerInput,
  readSuggestionArtifacts,
} from '../suggestions';

/**
 * Where the mock's suggestions come from: the importer's committed
 * artifacts, read as the contract describes them, and the app's planners,
 * found by name when they exist. Neither has to be there.
 */

const DIR = '/src/scripts/enrichment/suggestions';

const row = (
  slug: string,
  path: string,
  value: unknown,
  extra: Partial<Suggestion> = {},
): Suggestion => {
  const target = { kind: 'artist', slug };
  return {
    id: suggestionId({ target, path, op: 'set', value }),
    target,
    path,
    op: 'set',
    value,
    display: `${path} ${JSON.stringify(value)}`,
    sources: [{ provider: 'musicbrainz', url: 'https://musicbrainz.org/x' }],
    evidence: ['name exact'],
    confidence: 0.9,
    tier: 'sure',
    batch: 'mb-2026-09-30',
    ...extra,
  };
};

const ABALAK = {
  id: 'abalak',
  name: 'Abalak',
  country: 'Niger',
  region: 'west-africa',
  coordinates: [15.4615, 6.2834],
  pin: false,
};

const files = (entries: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(entries).map(([name, value]) => [
      `${DIR}/${name}`,
      typeof value === 'string' ? value : JSON.stringify(value),
    ]),
  );

describe('readSuggestionArtifacts', () => {
  it('reads rows, the places they need, and each run’s calibration', () => {
    const born = row('mdou-moctar', 'born.placeId', 'abalak');
    const city = row('toto', 'basedInPlaceId', 'los-angeles');
    const read = readSuggestionArtifacts(
      files({
        'artists.json': {
          artifactsVersion: 1,
          batch: 'mb-2026-09-30',
          suggestions: [born, city, { id: 'x', tier: 'weak' }],
        },
        'places.json': {
          artifactsVersion: 1,
          places: [
            {
              slug: 'abalak',
              body: ABALAK,
              sources: [],
              neededBy: [born.id],
            },
          ],
        },
        'manifest.json': {
          batch: 'mb-2026-09-30',
          calibrated: true,
          measuredPrecision: 0.985,
        },
        // Not the importer's: read by decisions.ts, never as suggestions.
        'decisions.json': { artifactsVersion: 1, decisions: [] },
        'broken.json': '{',
      }),
    );
    expect(read.suggestions.map((s) => s.id)).toEqual([born.id, city.id]);
    expect(read.suggestions[0].requires).toEqual([
      { kind: 'globe_city', slug: 'abalak', body: ABALAK },
    ]);
    expect(read.suggestions[1].requires).toBeUndefined();
    expect(read.batches).toEqual([
      { batch: 'mb-2026-09-30', calibrated: true, measuredPrecision: 0.985 },
    ]);
    expect(read.refused).toEqual([
      'artists.json: 1 rows the contract does not describe',
      'broken.json: not JSON',
    ]);
  });

  it('serves nothing, and no error, when there are no artifacts yet', () => {
    expect(readSuggestionArtifacts({})).toEqual({
      suggestions: [],
      batches: [],
      refused: [],
    });
  });

  it('reads each half of the manifest as its own run', () => {
    const read = readSuggestionArtifacts(
      files({
        'manifest.json': {
          batch: 'mb-2026-09-30',
          calibrated: true,
          measuredPrecision: 0.985,
          counts: { suggestions: 2 },
          // The song half is its own run, and calibrated only when it says so.
          songs: { batch: 'mb-songs-2026-09-30', calibrated: false },
        },
      }),
    );
    expect(read.batches).toEqual([
      { batch: 'mb-2026-09-30', calibrated: true, measuredPrecision: 0.985 },
      {
        batch: 'mb-songs-2026-09-30',
        calibrated: false,
        measuredPrecision: null,
      },
    ]);
  });

  describe("the song half's records", () => {
    const LABEL_MBID = '2182a316-c4bd-4605-936a-5e2fac52bdd2';
    const release = {
      slug: '4-non-blondes-bigger-better-faster-more',
      title: 'Bigger, Better, Faster, More!',
      artistIds: ['4-non-blondes'],
      format: 'album',
      externalIds: { mbid: '0d26ee11-05f3-3a02-ba40-1414fa325554' },
      unverified: true,
      source: 'musicbrainz',
    };
    const interscope = {
      slug: 'interscope-records',
      name: 'Interscope Records',
      unverified: true,
      source: `https://musicbrainz.org/label/${LABEL_MBID}`,
    };
    const onSong = (path: string, value: unknown): Suggestion => {
      const target = { kind: 'song', slug: 'whats_up' };
      const op = path.endsWith('[]') ? 'add' : 'set';
      return {
        ...row('x', path, value, { batch: 'mb-songs-2026-09-30' }),
        id: suggestionId({ target, path, op, value }),
        target,
        op,
      };
    };
    const album = onSong('releases[]', { releaseId: release.slug });
    const labelRow: Suggestion = {
      ...row('x', 'labelId', interscope.slug, {
        batch: 'mb-2026-09-30',
        dependsOn: album.id,
      }),
      target: { kind: 'release', slug: release.slug },
      id: suggestionId({
        target: { kind: 'release', slug: release.slug },
        path: 'labelId',
        op: 'set',
        value: interscope.slug,
      }),
    };
    const records = (list: string, entries: object[]) => ({
      artifactsVersion: 1,
      [list]: entries,
    });

    it('gives a row each record the record files say it needs, of its kind', () => {
      const read = readSuggestionArtifacts(
        files({
          'songs.json': { suggestions: [album, labelRow] },
          'releases.json': records('releases', [
            {
              slug: release.slug,
              body: release,
              neededBy: [album.id, labelRow.id],
            },
          ]),
          'labels.json': records('labels', [
            {
              slug: interscope.slug,
              body: interscope,
              neededBy: [labelRow.id],
            },
          ]),
        }),
      );
      const [first, second] = read.suggestions;
      expect(first.requires).toEqual([
        { kind: 'release', slug: release.slug, body: release },
      ]);
      // A Label row carries the release it labels, as well as its label.
      expect(second.requires).toEqual([
        { kind: 'label', slug: interscope.slug, body: interscope },
        { kind: 'release', slug: release.slug, body: release },
      ]);
      expect(read.refused).toEqual([]);
    });

    it('keeps the copy a row carries itself', () => {
      const own = {
        ...album,
        requires: [
          {
            kind: 'release',
            slug: release.slug,
            body: { ...release, year: 1992 },
          },
        ],
      };
      const read = readSuggestionArtifacts(
        files({
          'songs.json': { suggestions: [own] },
          'releases.json': records('releases', [
            { slug: release.slug, body: release, neededBy: [album.id] },
          ]),
        }),
      );
      expect(read.suggestions[0].requires).toEqual(own.requires);
    });

    it('serves no row out of step with record-slugs.json, and says how many', () => {
      const renamed = {
        ...labelRow,
        requires: [
          {
            kind: 'label',
            slug: 'interscope',
            body: { ...interscope, slug: 'interscope' },
          },
        ],
      };
      const other = {
        ...album,
        requires: [
          {
            kind: 'label',
            slug: interscope.slug,
            body: {
              ...interscope,
              source:
                'https://musicbrainz.org/label/00000000-0000-0000-0000-000000000000',
            },
          },
        ],
      };
      const inStep = {
        ...album,
        id: 'in-step',
        requires: [{ kind: 'label', slug: interscope.slug, body: interscope }],
      };
      const read = readSuggestionArtifacts(
        files({
          'songs.json': { suggestions: [renamed, other, inStep] },
          'record-slugs.json': {
            artifactsVersion: 1,
            slugs: { label: { [LABEL_MBID]: interscope.slug } },
          },
        }),
      );
      expect(read.suggestions.map((s) => s.id)).toEqual(['in-step']);
      expect(read.refused).toEqual([
        'songs.json: 2 rows need a record under another slug than record-slugs.json gives it',
      ]);
    });
  });

  it('counts a run with no manifest as not calibrated', () => {
    const read = readSuggestionArtifacts(
      files({
        'songs.json': {
          batch: 'mb-2026-10-02',
          suggestions: [
            row('toto', 'activeFrom', 1977, { batch: 'mb-2026-10-02' }),
          ],
        },
      }),
    );
    expect(read.batches).toEqual([
      { batch: 'mb-2026-10-02', calibrated: false, measuredPrecision: null },
    ]);
  });
});

describe('mergeSuggestions', () => {
  it("makes two sources of one fact one suggestion, at the surer tier, in the importer's batch", () => {
    const imported = row('marvin-gaye', 'basedInPlaceId', 'detroit', {
      dependsOn: 'identity-marvin-gaye',
    });
    const app = row('marvin-gaye', 'basedInPlaceId', 'detroit', {
      sources: [{ provider: 'app', label: 'artist_location "marvin gaye"' }],
      evidence: ['song pins'],
      tier: 'likely',
      confidence: 0.7,
      display: 'Song pins say Detroit',
      batch: 'app-stage1',
    });
    // Read after the app's copy, the importer's batch and identity gate
    // still stand: its calibration and its identity decide bulk accepts.
    const [merged] = mergeSuggestions([app, imported]);
    expect(merged).toMatchObject({
      id: imported.id,
      tier: 'sure',
      confidence: 0.9,
      display: imported.display,
      batch: 'mb-2026-09-30',
      dependsOn: 'identity-marvin-gaye',
    });
    expect(mergeSuggestions([imported, app])[0]).toEqual({
      ...merged,
      sources: [...imported.sources, ...app.sources],
      evidence: ['name exact', 'song pins'],
    });
    expect(merged.sources.map((s) => s.provider)).toEqual([
      'app',
      'musicbrainz',
    ]);
    expect(merged.evidence).toEqual(['song pins', 'name exact']);
    expect(mergeSuggestions([imported, imported])).toEqual([imported]);
  });
});

describe('the planners', () => {
  const input = plannerInput(
    [
      { kind: 'artist', body: { slug: 'toto', name: 'Toto' }, deleted: false },
      { kind: 'artist', body: { slug: 'gone', name: 'Gone' }, deleted: true },
      { kind: 'globe_city', body: { id: 'detroit' }, deleted: false },
      { kind: 'activity_flow', body: { id: 'x' }, deleted: false },
      { kind: 'song', body: null, deleted: false },
    ],
    [],
    2026,
  );

  it('read the store’s live bodies in the graph snapshot’s lists', () => {
    expect(input).toEqual({
      artists: [{ slug: 'toto', name: 'Toto' }],
      places: [{ id: 'detroit' }],
      asOfYear: 2026,
      imported: [],
    });
  });

  it('are found by name in the Stage-1 index, and checked', () => {
    const planned = row('toto', 'activeFrom', 1977, { batch: 'app-stage1' });
    let given: unknown = null;
    const planner = appPlannerFrom({
      planStageOne: (lists: unknown, options: unknown) => {
        given = { lists, options };
        return { planned: [{ suggestion: planned, precondition: {} }] };
      },
    })!;
    expect(planner(input)).toEqual([planned]);
    expect(given).toEqual({
      lists: {
        artists: [{ slug: 'toto', name: 'Toto' }],
        places: [{ id: 'detroit' }],
        asOfYear: 2026,
      },
      options: { imported: [] },
    });

    expect(appPlannerFrom({})).toBeNull();
    expect(appPlannerFrom(null)).toBeNull();
    const wrong = appPlannerFrom({
      planStageOne: () => ({ planned: [{ suggestion: { id: 'x' } }] }),
    })!;
    expect(() => wrong(input)).toThrow(/does not describe/);
    const empty = appPlannerFrom({ planStageOne: () => ({}) })!;
    expect(() => empty(input)).toThrow(/no `planned` list/);
  });
});

describe('loadSuggestionSeed', () => {
  it('serves nothing in legacy mode', async () => {
    expect(await loadSuggestionSeed('legacy')).toEqual({});
  });

  it('starts with no files and no planners at all', async () => {
    expect(await loadSuggestionSeed('all', {}, {})).toEqual({
      imported: [],
      batches: [],
      refused: [],
      app: null,
    });
  });

  it('reads the committed decisions beside the artifacts', async () => {
    const seed = await loadSuggestionSeed(
      'all',
      {
        [`${DIR}/decisions.json`]: async () =>
          JSON.stringify({ artifactsVersion: 1, decisions: [] }),
      },
      { '/src/content/linking/index.ts': async () => ({}) },
    );
    expect(seed.committed).toEqual({ decisions: [], refused: [], error: null });
    // An index without planStageOne plans nothing.
    expect(seed.app).toBeNull();
  });

  it("serves every row of the repo's artifacts, as the importer counted them", async () => {
    const texts = import.meta.glob<string>(
      '/src/scripts/enrichment/suggestions/*.json',
      { query: '?raw', import: 'default', eager: true },
    );
    const ids = new Set<string>();
    for (const [path, text] of Object.entries(texts)) {
      if (path.endsWith('/decisions.json')) continue;
      const parsed = JSON.parse(text) as { suggestions?: { id: string }[] };
      for (const suggestion of parsed.suggestions ?? []) ids.add(suggestion.id);
    }
    const seed = await loadSuggestionSeed('all', undefined, {});
    expect(seed.refused).toEqual([]);
    expect(seed.imported!.map((s) => s.id).sort()).toEqual([...ids].sort());
    // Each half is its own run, as calibrated as its part of the manifest
    // says: until the song half has been measured, none of its rows is
    // accepted in bulk.
    const manifest = texts[`${DIR}/manifest.json`];
    if (manifest) {
      const { batch, calibrated, songs } = JSON.parse(manifest) as {
        batch: string;
        calibrated?: boolean;
        songs?: { batch: string; calibrated?: boolean };
      };
      const runs = new Map(seed.batches!.map((b) => [b.batch, b.calibrated]));
      expect(runs.get(batch)).toBe(calibrated === true);
      if (songs) expect(runs.get(songs.batch)).toBe(songs.calibrated === true);
    }
    // A Label row carries the release it labels, which its Album row makes.
    const byId = new Map(seed.imported!.map((s) => [s.id, s]));
    for (const label of seed.imported!.filter((s) => s.path === 'labelId')) {
      expect(label.target.kind).toBe('release');
      expect(
        label.requires?.some(
          (r) => r.kind === 'release' && r.slug === label.target.slug,
        ),
      ).toBe(true);
      const album = byId.get(label.dependsOn!);
      expect(album?.path).toBe('releases[]');
      expect(
        album?.requires?.some(
          (r) => r.kind === 'release' && r.slug === label.target.slug,
        ),
      ).toBe(true);
    }
    // Each row that needs a place carries it.
    const places = texts[`${DIR}/places.json`];
    if (places) {
      const needed = (
        JSON.parse(places) as { places: { slug: string; neededBy: string[] }[] }
      ).places.flatMap((place) =>
        place.neededBy.map((id) => [id, place.slug] as const),
      );
      const byId = new Map(seed.imported!.map((s) => [s.id, s]));
      const missing = needed.filter(
        ([id, slug]) =>
          byId.has(id) && !byId.get(id)!.requires?.some((r) => r.slug === slug),
      );
      expect(missing).toEqual([]);
    }
  });
});
