import { hashText } from '@/content/suggestions/keys';
import { MB_ARTIST, WD_ITEM } from './artistFields';
import type { ScoredArtist } from './buildSuggestions';
import { PRECISION_BAR } from './emit';
import type { CandidateScore, IdentityTier } from './scoreIdentity';

/**
 * Calibration: does "sure" deserve bulk accept? (design §5.2)
 *
 * The owner hand-checks 100 of our artists against the MusicBrainz artist the
 * importer picked, judging each act by its songs, so every artist in the
 * sample is billed on at least one song in the library (the cache stage's
 * billing, as gathered: 344 of the 907 artists when this was written). The
 * gate is sure-tier precision, so most of the sample is sure picks, and it
 * is drawn by stratum, because the ways a pick can be wrong differ by
 * evidence:
 *
 * | Stratum          | What it is                                        | Drawn |
 * |------------------|---------------------------------------------------|-------|
 * | `sure-songs`     | sure, with a song of ours on the act's own record | 65 between them, |
 * | `sure-no-songs`  | sure without one (name, releases, area, life-span; | at least 25 each, |
 * |                  | a compilation credit at most) — pass 2's new ones | or all it has |
 * | `likely`         | offered one at a time: is the tier too cautious?  | 20    |
 * | `ambiguous`      | the "pick the artist" rows: is the best one right? | 5     |
 * | `weak`           | nothing offered: what is being missed?            | 5     |
 * | `no-candidate`   | MusicBrainz named no one (joint billings, mostly): | 5     |
 * |                  | is there an act it missed?                        |       |
 *
 * The shares follow the artists with songs, not the whole scoring. When this
 * was written they were 266 sure with songs, 7 sure without, 44 likely, 3
 * ambiguous, 8 weak and 16 with no candidate, 73 of them one-word names. A
 * sure pick with a library song nearly always has that song on the act's own
 * record, so `sure-no-songs` has only a handful to give, and all of them are
 * drawn; `likely` gives up 5 of its old 25 so the sample shows the misses
 * too. A stratum that runs short passes its share to the sure strata. Across
 * the sample, 20 are one-word names — the hardest case — spread over the
 * strata in proportion, once each stratum has the ones it cannot fill its
 * quota without. The draw is by a hash of each slug, so the same scoring
 * gives the same 100 and nobody chooses them.
 *
 * Precision is measured per sure stratum and weighted by how many sure
 * picks each stratum holds now, songs or not (the sample draws the strata
 * at different rates, so the plain share would miscount them; a stratum's
 * artists with songs stand for the rest of it). The manifest says
 * `calibrated` only when:
 *  - every sure pick in the sample is judged;
 *  - at least 50 are (three right out of three proves nothing);
 *  - each sure stratum with picks has at least 10 judged, or every one of
 *    its artists with songs (the sample can hold no others);
 *  - the weighted precision is 98% or better.
 *
 * Labels are about a pick, and a re-score can change a pick. So each label
 * is read against the pick it was given for: "correct" for a pick that has
 * since changed makes the new pick wrong; "wrong" with the right MBID filled
 * in (`correctMbid`) still judges any new pick; otherwise a changed pick
 * needs labelling again and is counted as such, never guessed.
 *
 * The labels are the owner's work, so a sheet with anything written in it is
 * never drawn again. Until then every `calibrate` draws it afresh: a sheet
 * from an older scoring, or drawn by an older rule (`SAMPLE_RULE`), is
 * replaced before anyone labels it.
 */

export type CalibrationLabel = '' | 'correct' | 'wrong' | 'none';

export const STRATA = [
  'sure-songs',
  'sure-no-songs',
  'likely',
  'ambiguous',
  'weak',
  'no-candidate',
] as const;
export type Stratum = (typeof STRATA)[number];
export const SURE_STRATA: readonly Stratum[] = ['sure-songs', 'sure-no-songs'];

/** Where a scored artist falls, by its tier and, when sure, its song evidence. */
export function stratumOf(identity: {
  tier: IdentityTier;
  songEvidence?: CandidateScore['songEvidence'] | null;
}): Stratum {
  switch (identity.tier) {
    case 'sure':
      return identity.songEvidence === 'strong'
        ? 'sure-songs'
        : 'sure-no-songs';
    case 'none':
      return 'no-candidate';
    default:
      return identity.tier;
  }
}

export interface CalibrationCandidate {
  mbid: string;
  name: string;
  disambiguation?: string;
  type: string | null;
  score: number;
  musicbrainz: string;
  reasons: string[];
}

export interface CalibrationEntry {
  slug: string;
  name: string;
  oneWord: boolean;
  /** Billed on a song in the library (every one, since `SAMPLE_RULE` 2). */
  hasSongs: boolean;
  /** The stratum it was drawn from. */
  stratum: Stratum;
  /** A few of the artist's events, to judge by. */
  events: string[];
  songPin?: string;
  importer: {
    tier: IdentityTier;
    confidence: number;
    pick: (CalibrationCandidate & { wikidata?: string }) | null;
    notes: string[];
  };
  /** The runners-up, best first. */
  others: CalibrationCandidate[];
  /**
   * For the owner: "correct" — the pick is this artist; "wrong" — it is
   * another act (fill `correctMbid` if you know the right one); "none" —
   * MusicBrainz has no artist that is this one.
   */
  label: CalibrationLabel;
  correctMbid?: string;
  note?: string;
}

export interface CalibrationFile {
  about: string;
  howToLabel: string[];
  sample: {
    /** The rule it was drawn by (`SAMPLE_RULE`); a sheet without one is rule 1. */
    rule?: number;
    size: number;
    oneWord: number;
    withSongs: number;
    seed: string;
    /**
     * Per stratum: how many the scoring held when drawn, how many of those
     * have library songs (what the draw could take), and how many were drawn.
     */
    strata: Record<
      Stratum,
      { population: number; withSongs: number; sampled: number }
    >;
  };
  artists: CalibrationEntry[];
}

/**
 * The rule the sample is drawn by, written into the sheet. 1: any scored
 * artist with a pick (the first sheets carry no rule); 2: only artists
 * billed on a library song, with the no-candidate stratum.
 */
export const SAMPLE_RULE = 2;
export const CALIBRATION_SEED = 'calibration-2026-09';
export const SAMPLE_SIZE = 100;
export const SAMPLE_ONE_WORD = 20;
/** Sure picks the draw aims for, and the least each sure stratum gets. */
export const SAMPLE_SURE = 65;
export const SAMPLE_SURE_FLOOR = 25;
export const SAMPLE_OTHER: Readonly<Record<Stratum, number>> = {
  'sure-songs': 0,
  'sure-no-songs': 0,
  likely: 20,
  ambiguous: 5,
  weak: 5,
  'no-candidate': 5,
};
/** Judged sure picks below which no precision is trusted. */
export const MIN_SURE_JUDGED = 50;
/**
 * Judged picks each sure stratum needs (or all of its artists with songs,
 * when fewer).
 */
export const MIN_STRATUM_JUDGED = 10;

const hashOf = (s: ScoredArtist) =>
  hashText(`${CALIBRATION_SEED}|${s.evidence.slug}`);
const byHash = (a: ScoredArtist, b: ScoredArtist) =>
  hashOf(a).localeCompare(hashOf(b));

/**
 * Billed on a song in the library: the cache stage's billing (a song's
 * artist, slugged, is the artist or one of its aliases), as gathered.
 */
const hasSongs = (s: ScoredArtist) =>
  Object.keys(s.evidence.songTitles).length > 0;

/** A held-back artist has no stratum: its search is not in the cache yet. */
const scoredStratum = (s: ScoredArtist): Stratum | null =>
  s.evidence.pending
    ? null
    : stratumOf({
        tier: s.identity.tier,
        songEvidence: s.identity.pick?.songEvidence,
      });

/**
 * `total` shared out in proportion to `weights`, no share above its `room`,
 * by largest remainder; what a full share cannot take goes to the others.
 */
function share(
  total: number,
  weights: readonly number[],
  room: readonly number[],
): number[] {
  const out = weights.map(() => 0);
  let left = Math.min(
    total,
    room.reduce((a, b) => a + b, 0),
  );
  while (left > 0) {
    const open = weights
      .map((w, i) => (out[i] < room[i] ? w : 0))
      .map((w) => Math.max(w, 0));
    const sum = open.reduce((a, b) => a + b, 0);
    const exact = open.map((w, i) =>
      out[i] < room[i] ? (sum ? (left * w) / sum : left / open.length) : 0,
    );
    let given = 0;
    const floors = exact.map((x, i) =>
      Math.min(Math.floor(x), room[i] - out[i]),
    );
    floors.forEach((n, i) => {
      out[i] += n;
      given += n;
    });
    if (given === 0) {
      // Largest remainder first, then the lower index: one at a time.
      const order = exact
        .map((x, i) => ({ i, r: x - Math.floor(x) }))
        .filter(({ i }) => out[i] < room[i])
        .sort((a, b) => b.r - a.r || a.i - b.i);
      if (!order.length) break;
      out[order[0].i] += 1;
      given = 1;
    }
    left -= given;
  }
  return out;
}

/** How many to draw from each stratum, given what each can give. */
export function stratumQuotas(
  population: Readonly<Record<Stratum, number>>,
  size = SAMPLE_SIZE,
): Record<Stratum, number> {
  const quotas = Object.fromEntries(STRATA.map((s) => [s, 0])) as Record<
    Stratum,
    number
  >;
  const scale = size / SAMPLE_SIZE;
  let spare = 0;
  for (const s of STRATA.filter((s) => !SURE_STRATA.includes(s))) {
    const want = Math.round(SAMPLE_OTHER[s] * scale);
    quotas[s] = Math.min(want, population[s]);
    spare += want - quotas[s];
  }
  // The sure strata: a floor each, the rest by how many picks each holds.
  const sure = SURE_STRATA.map((s) => population[s]);
  const target = Math.round(SAMPLE_SURE * scale) + spare;
  const floor = Math.round(SAMPLE_SURE_FLOOR * scale);
  const floors = sure.map((n) => Math.min(n, floor));
  const rest = share(
    target - floors.reduce((a, b) => a + b, 0),
    sure,
    sure.map((n, i) => n - floors[i]),
  );
  SURE_STRATA.forEach((s, i) => (quotas[s] = floors[i] + rest[i]));
  // Sure picks too few to take their share: the likely stratum takes it.
  const drawn = STRATA.reduce((a, s) => a + quotas[s], 0);
  quotas.likely = Math.min(population.likely, quotas.likely + size - drawn);
  return quotas;
}

/**
 * The same sample every time: only artists with library songs; per stratum
 * its quota, one-word names first up to that stratum's share of the 20, the
 * rest in hash order. A stratum with too few multi-word names to fill its
 * quota takes the one-word names it must before the 20 are shared out, so
 * the sample still holds 20 when the pool allows.
 */
export function sampleForCalibration(
  scored: readonly ScoredArtist[],
  size = SAMPLE_SIZE,
  oneWord = SAMPLE_ONE_WORD,
): ScoredArtist[] {
  const eligible = scored
    .filter((s) => hasSongs(s) && scoredStratum(s))
    .sort(byHash);
  const pools = new Map<Stratum, ScoredArtist[]>(STRATA.map((s) => [s, []]));
  for (const s of eligible) pools.get(scoredStratum(s)!)!.push(s);
  const population = Object.fromEntries(
    STRATA.map((s) => [s, pools.get(s)!.length]),
  ) as Record<Stratum, number>;
  const quotas = stratumQuotas(population, size);
  const oneWords = STRATA.map(
    (s) => pools.get(s)!.filter((a) => a.evidence.oneWord).length,
  );
  // No quota is larger than its pool, so the one-word names a stratum must
  // take are what its multi-word names leave, and it can take no more than
  // it holds.
  const least = STRATA.map((s, i) =>
    Math.max(0, quotas[s] - (population[s] - oneWords[i])),
  );
  const most = STRATA.map((s, i) => Math.min(quotas[s], oneWords[i]));
  const extra = share(
    Math.max(
      0,
      Math.round((oneWord * size) / SAMPLE_SIZE) -
        least.reduce((a, b) => a + b, 0),
    ),
    STRATA.map((s) => quotas[s]),
    most.map((n, i) => n - least[i]),
  );
  const chosen: ScoredArtist[] = [];
  STRATA.forEach((stratum, i) => {
    const pool = pools.get(stratum)!;
    const ones = pool.filter((a) => a.evidence.oneWord);
    const many = pool.filter((a) => !a.evidence.oneWord);
    const takeOnes = ones.slice(0, least[i] + extra[i]);
    chosen.push(
      ...takeOnes,
      ...many.slice(0, quotas[stratum] - takeOnes.length),
    );
  });
  return chosen.sort((a, b) => a.evidence.slug.localeCompare(b.evidence.slug));
}

const candidate = (c: CandidateScore): CalibrationCandidate => ({
  mbid: c.mbid,
  name: c.name,
  ...(c.disambiguation ? { disambiguation: c.disambiguation } : {}),
  type: c.type,
  score: c.score,
  musicbrainz: `${MB_ARTIST}${c.mbid}`,
  reasons: c.reasons,
});

export function calibrationEntry(s: ScoredArtist): CalibrationEntry {
  const { evidence, identity } = s;
  const pick = identity.pick;
  const facts = pick
    ? evidence.candidates.find((c) => c.mbid === pick.mbid)
    : undefined;
  return {
    slug: evidence.slug,
    name: evidence.name,
    oneWord: evidence.oneWord,
    hasSongs: hasSongs(s),
    stratum: scoredStratum(s) ?? 'weak',
    events: evidence.events.slice(0, 3).map((e) => e.title),
    ...(evidence.pin
      ? { songPin: `${evidence.pin.city}, ${evidence.pin.country}` }
      : {}),
    importer: {
      tier: identity.tier,
      confidence: identity.confidence,
      pick: pick
        ? {
            ...candidate(pick),
            ...(facts?.wikidata[0]
              ? { wikidata: `${WD_ITEM}${facts.wikidata[0]}` }
              : {}),
          }
        : null,
      notes: identity.notes,
    },
    others: identity.ranked.slice(1, 4).map(candidate),
    label: '',
  };
}

export function calibrationFile(
  scored: readonly ScoredArtist[],
): CalibrationFile {
  const sample = sampleForCalibration(scored);
  const count = () =>
    Object.fromEntries(STRATA.map((s) => [s, 0])) as Record<Stratum, number>;
  const population = count();
  const withSongs = count();
  for (const s of scored) {
    const stratum = scoredStratum(s);
    if (!stratum) continue;
    population[stratum]++;
    if (hasSongs(s)) withSongs[stratum]++;
  }
  const entries = sample.map(calibrationEntry);
  return {
    about:
      "The owner's hand check of the importer's artist matching, on 100 artists that each have a song in the " +
      'library. The sample is fixed for a scoring (a hash of each slug, drawn by stratum: mostly sure picks, ' +
      'which the gate is about); fill in `label` for each artist and run `calibrate` again to measure sure-tier ' +
      'precision. Until something is filled in, each `calibrate` draws the sheet again; after that it is kept.',
    howToLabel: [
      'Open importer.pick.musicbrainz (and its wikidata link) beside the artist name and events.',
      'label "correct": the pick is this artist.',
      'label "wrong": the pick is another act. If one of `others` (or any MBID) is right, put its MBID in correctMbid.',
      'label "none": MusicBrainz has no artist that is this one.',
      'No pick (importer.pick is null): label "none" if MusicBrainz has no artist that is this one, or "wrong" with its MBID in correctMbid if it has.',
      'Leave label empty to skip; every sure-tier pick must be labelled before precision counts.',
    ],
    sample: {
      rule: SAMPLE_RULE,
      size: sample.length,
      oneWord: sample.filter((s) => s.evidence.oneWord).length,
      withSongs: sample.filter(hasSongs).length,
      seed: CALIBRATION_SEED,
      strata: Object.fromEntries(
        STRATA.map((s) => [
          s,
          {
            population: population[s],
            withSongs: withSongs[s],
            sampled: entries.filter((e) => e.stratum === s).length,
          },
        ]),
      ) as CalibrationFile['sample']['strata'],
    },
    artists: entries,
  };
}

/** The owner has written in the sheet: a label, an MBID or a note. */
export const ownerHasWritten = (file: CalibrationFile): boolean =>
  file.artists.some((a) => a.label || a.correctMbid || a.note);

/**
 * What `calibrate` does with the sheet on disk: draw it (none yet, or one
 * with nothing written in, whatever rule and scoring drew it), or measure it
 * (one the owner has written in, which is never drawn again).
 */
export const calibrationStep = (
  onDisk: CalibrationFile | null,
): 'draw' | 'measure' =>
  onDisk && ownerHasWritten(onDisk) ? 'measure' : 'draw';

/** The rule a sheet on disk was drawn by. */
export const sampleRuleOf = (file: CalibrationFile): number =>
  file.sample?.rule ?? 1;

export type Verdict = 'correct' | 'wrong' | 'unlabelled' | 'relabel';

/** A labelled entry judged against the importer's pick now. */
export function verdictFor(
  entry: CalibrationEntry,
  currentPick: string | null,
): Verdict {
  if (!entry.label) return 'unlabelled';
  const labelled = entry.importer.pick?.mbid ?? null;
  if (entry.correctMbid && currentPick)
    return entry.correctMbid === currentPick ? 'correct' : 'wrong';
  if (!currentPick) return 'relabel';
  if (entry.label === 'none') return 'wrong';
  if (currentPick === labelled)
    return entry.label === 'correct' ? 'correct' : 'wrong';
  // The pick has changed since it was labelled.
  return entry.label === 'correct' ? 'wrong' : 'relabel';
}

/** Where an artist stands now, as the latest scoring has it. */
export interface CurrentPick {
  tier: IdentityTier;
  pick: string | null;
  /** The stratum now; absent for an artist held back (its search is not in the cache). */
  stratum?: Stratum | null;
  /** Billed on a song in the library: one the sample could draw. */
  hasSongs: boolean;
}

/** Where a scored artist stands now, as `measurePrecision` reads it. */
export const currentPickOf = (s: ScoredArtist): CurrentPick => ({
  tier: s.evidence.pending ? 'none' : s.identity.tier,
  pick: s.identity.pick?.mbid ?? null,
  stratum: scoredStratum(s),
  hasSongs: hasSongs(s),
});

export interface StratumPrecision {
  /** The stratum's artists in the scoring now. */
  population: number;
  /** Of those, the ones with library songs: all the sample can hold. */
  withSongs: number;
  /** In the sample, judged against the current pick. */
  correct: number;
  wrong: number;
  /** Unlabelled, or a pick changed since it was labelled. */
  open: number;
  precision: number | null;
}

export interface PrecisionResult {
  labelled: number;
  unlabelled: number;
  /** Sure picks now, among the sample. */
  sure: number;
  sureCorrect: number;
  sureWrong: number;
  /** Sure picks with no usable label: unlabelled, or a pick changed since. */
  sureOpen: number;
  /**
   * Sure-tier precision: each sure stratum's, weighted by how many sure
   * picks it holds now; null with none judged.
   */
  precision: number | null;
  /** correct / (correct + wrong) over the judged sure picks, unweighted. */
  plainPrecision: number | null;
  strata: Record<Stratum, StratumPrecision>;
  likely: { correct: number; wrong: number };
  /** True when every gate in the header holds. */
  passes: boolean;
  /** Why it does not pass, in words; empty when it does. */
  blocking: string[];
  wrong: { slug: string; tier: IdentityTier; pick: string | null }[];
}

export function measurePrecision(
  file: CalibrationFile,
  current: ReadonlyMap<string, CurrentPick>,
): PrecisionResult {
  const strata = Object.fromEntries(
    STRATA.map((s) => [
      s,
      {
        population: 0,
        withSongs: 0,
        correct: 0,
        wrong: 0,
        open: 0,
        precision: null,
      },
    ]),
  ) as Record<Stratum, StratumPrecision>;
  for (const now of current.values()) {
    if (!now.stratum) continue;
    strata[now.stratum].population++;
    if (now.hasSongs) strata[now.stratum].withSongs++;
  }

  const out: PrecisionResult = {
    labelled: 0,
    unlabelled: 0,
    sure: 0,
    sureCorrect: 0,
    sureWrong: 0,
    sureOpen: 0,
    precision: null,
    plainPrecision: null,
    strata,
    likely: { correct: 0, wrong: 0 },
    passes: false,
    blocking: [],
    wrong: [],
  };
  for (const entry of file.artists) {
    if (entry.label) out.labelled++;
    else out.unlabelled++;
    const now = current.get(entry.slug);
    if (!now) continue;
    const pick = now.tier === 'sure' || now.tier === 'likely' ? now.pick : null;
    const verdict = verdictFor(entry, pick);
    if (verdict === 'wrong')
      out.wrong.push({ slug: entry.slug, tier: now.tier, pick });
    const stratum = now.stratum ? strata[now.stratum] : null;
    if (stratum) {
      if (verdict === 'correct') stratum.correct++;
      else if (verdict === 'wrong') stratum.wrong++;
      else stratum.open++;
    }
    if (now.tier === 'sure') {
      out.sure++;
      if (verdict === 'correct') out.sureCorrect++;
      else if (verdict === 'wrong') out.sureWrong++;
      else out.sureOpen++;
    } else if (now.tier === 'likely') {
      if (verdict === 'correct') out.likely.correct++;
      else if (verdict === 'wrong') out.likely.wrong++;
    }
  }
  for (const s of STRATA) {
    const judged = strata[s].correct + strata[s].wrong;
    strata[s].precision = judged ? strata[s].correct / judged : null;
  }

  const judged = out.sureCorrect + out.sureWrong;
  out.plainPrecision = judged ? out.sureCorrect / judged : null;
  const held = SURE_STRATA.filter((s) => strata[s].population > 0);
  const surePopulation = held.reduce((a, s) => a + strata[s].population, 0);
  const unmeasured = held.filter((s) => strata[s].precision === null);
  out.precision =
    judged && !unmeasured.length && surePopulation
      ? held.reduce(
          (sum, s) =>
            sum +
            (strata[s].population / surePopulation) * strata[s].precision!,
          0,
        )
      : null;

  if (out.sureOpen)
    out.blocking.push(
      `${out.sureOpen} sure pick(s) in the sample are not judged (unlabelled, or the pick changed since)`,
    );
  if (judged < MIN_SURE_JUDGED)
    out.blocking.push(
      `${judged} sure picks judged; at least ${MIN_SURE_JUDGED} are needed`,
    );
  for (const s of held) {
    const need = Math.min(MIN_STRATUM_JUDGED, strata[s].withSongs);
    const got = strata[s].correct + strata[s].wrong;
    // Its picks still weigh in, and the sample can hold none of them.
    if (!strata[s].withSongs)
      out.blocking.push(
        `${s}: none of its ${strata[s].population} sure picks has a library song, so the sample cannot measure it`,
      );
    else if (got < need)
      out.blocking.push(
        `${s}: ${got} judged of the ${need} needed (it holds ${strata[s].population} sure picks, ` +
          `${strata[s].withSongs} with songs)`,
      );
  }
  if (out.precision === null)
    out.blocking.push('no sure-tier precision can be measured yet');
  else if (out.precision < PRECISION_BAR)
    out.blocking.push(
      `sure-tier precision ${(out.precision * 100).toFixed(1)}% is below ${PRECISION_BAR * 100}%`,
    );
  out.passes = out.blocking.length === 0;
  return out;
}
