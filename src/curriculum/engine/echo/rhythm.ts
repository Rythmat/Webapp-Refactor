/**
 * Echo's rhythms: the owner's rhythm libraries, as the calls play them.
 * scripts/echo/importRhythms.mjs reads the CSVs, keeps what a straight 4/4
 * echo can play, and sets the tiers (its comment says what it leaves out).
 *
 * MELODY RHYTHMS (melodyRhythms.json)
 * The melody phrase rhythms: a bar each, of three to five notes, as many
 * as a contour has. A melody call is one of them, the contour's notes on
 * its hits.
 *
 *   Tier 1  quarters and eighths from beat 1, nothing held over a beat, the
 *           last note by beat 4
 *   Tier 2  eighths with a syncopation, an offbeat start, or a last note on
 *           the "and" of 4
 *   Tier 3  one 16th, from beat 1
 *   Tier 4  more 16ths, or a 16th start: the funk
 *
 * CHORD RHYTHMS (chordRhythms.json)
 * The comping patterns, a bar long and two. A chord call strikes a one-bar
 * pattern in each of its bars, as Melodies and Chords' progressions repeat
 * one rhythm a bar, and a two-bar pattern across both.
 *
 *   Tier 1  on the beats, from beat 1
 *   Tier 2  on the eighths, from beat 1
 *   Tier 3  eighths off the beat (a skank), or a few 16ths from beat 1
 *   Tier 4  the rest, three strikes a beat at most
 *
 * WHICH ONE (`melodyRhythm`, `chordRhythm`)
 * A level draws on its tiers (levels.ts): its newest tier half the time,
 * the earlier ones the rest, as its contours do. The Final Boss plays the
 * tier above the level's, every call (`bossRhythmTier`). Each distinct
 * rhythm is as likely as the next: the importer keeps one of a rhythm that
 * several genres share.
 *
 * Pure, no React.
 */

import CHORD_FILE from '@/curriculum/data/echo/chordRhythms.json';
import MELODY_FILE from '@/curriculum/data/echo/melodyRhythms.json';
import { BAR_TICKS, type EchoTier } from './levels';
import { pickOne, type EchoRandom } from './random';

/** A note of a rhythm: ticks from its first downbeat, and how long it lasts. */
export interface RhythmHit {
  onset: number;
  duration: number;
}

interface LibraryRhythm {
  /** The CSV's id: "mp_pop_3a", "comp2_rnb_03". */
  id: string;
  /** "Pop 3-note: beats 1-2-3", "Gospel Push". */
  name: string;
  tier: EchoTier;
  /** As the CSV writes it: x a note, - held, . a rest, a 16th each. */
  grid: string;
  hits: readonly RhythmHit[];
  /** The CSV's other ids with this rhythm exactly. */
  sameAs: readonly string[];
}

/** One of the melody phrase rhythms: a bar, a contour's notes. */
export interface MelodyRhythm extends LibraryRhythm {
  notes: number;
  /** The genres the library files it under: "pop", "hip_hop". */
  genres: readonly string[];
}

/** One of the comping patterns: a bar or two of a chord's strikes. */
export interface ChordRhythm extends LibraryRhythm {
  bars: 1 | 2;
  /** Where the library uses it: "Pop, Rock, Jam Band", "Reggae". */
  style: string;
}

const hitsOf = (pairs: readonly (readonly number[])[]): RhythmHit[] =>
  pairs.map(([onset, duration]) => ({ onset, duration }));

/** Every melody rhythm, by tier. */
export const MELODY_RHYTHMS: readonly MelodyRhythm[] = MELODY_FILE.rhythms.map(
  (r) => ({ ...r, tier: r.tier as EchoTier, hits: hitsOf(r.hits) }),
);

/** Every comping pattern, by tier. */
export const CHORD_RHYTHMS: readonly ChordRhythm[] = CHORD_FILE.rhythms.map(
  (r) => ({
    ...r,
    tier: r.tier as EchoTier,
    bars: r.bars as 1 | 2,
    hits: hitsOf(r.hits),
  }),
);

/** A melody rhythm by its id (or an id in its `sameAs`). */
export const melodyRhythmById = (id: string): MelodyRhythm | undefined =>
  MELODY_RHYTHMS.find((r) => r.id === id || r.sameAs.includes(id));

/** A comping pattern by its id (or an id in its `sameAs`). */
export const chordRhythmById = (id: string): ChordRhythm | undefined =>
  CHORD_RHYTHMS.find((r) => r.id === id || r.sameAs.includes(id));

/** What a call's rhythm is drawn from. */
export interface RhythmPool {
  /** The level's tiers: its own and every earlier one. */
  tiers: readonly EchoTier[];
  /** Only this tier: the boss's. */
  only?: EchoTier;
}

/** How often a level's calls take its newest tier, not an earlier one. */
export const NEW_RHYTHM_SHARE = 0.5;

function chooseRhythm<T extends LibraryRhythm>(
  from: readonly T[],
  pool: RhythmPool,
  rng: EchoRandom,
  what: string,
): T {
  if (pool.only !== undefined) {
    const boss = from.filter((r) => r.tier === pool.only);
    if (!boss.length) throw new Error(`No Tier ${pool.only} rhythm ${what}`);
    return pickOne(rng, boss);
  }
  const newest = Math.max(...pool.tiers);
  const own = from.filter((r) => r.tier === newest);
  const earlier = from.filter(
    (r) => r.tier < newest && pool.tiers.includes(r.tier),
  );
  if (!own.length && !earlier.length) {
    throw new Error(`No rhythm ${what} in Tiers ${pool.tiers.join(', ')}`);
  }
  const useOwn =
    own.length > 0 && (!earlier.length || rng() < NEW_RHYTHM_SHARE);
  return pickOne(rng, useOwn ? own : earlier);
}

/** A melody call's rhythm: one with `notes` notes, from the pool. */
export const melodyRhythm = (
  notes: number,
  pool: RhythmPool,
  rng: EchoRandom,
): MelodyRhythm =>
  chooseRhythm(
    MELODY_RHYTHMS.filter((r) => r.notes === notes),
    pool,
    rng,
    `of ${notes} notes`,
  );

/** A chord call's rhythm, from the pool. */
export const chordRhythm = (pool: RhythmPool, rng: EchoRandom): ChordRhythm =>
  chooseRhythm(CHORD_RHYTHMS, pool, rng, 'for chords');

/**
 * A comping pattern's strikes in each of `bars` bars, ticks from each
 * bar's downbeat: a one-bar pattern in every bar, a two-bar one by turns.
 */
export function chordRhythmBars(
  rhythm: Pick<ChordRhythm, 'bars' | 'hits'>,
  bars: number,
): RhythmHit[][] {
  return Array.from({ length: bars }, (_, bar) => {
    const from = (bar % rhythm.bars) * BAR_TICKS;
    return rhythm.hits
      .filter((hit) => hit.onset >= from && hit.onset < from + BAR_TICKS)
      .map((hit) => ({ onset: hit.onset - from, duration: hit.duration }));
  });
}
