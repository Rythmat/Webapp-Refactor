/**
 * Echo's levels, as the design sets them (docs/echo-game.md, Levels): what
 * a level's calls are made of, and how long the song it ends with is.
 *
 *                  Level 1        Level 2       Level 3
 *   contours       Tier 1         + Tier 2      + Tier 3
 *   zero points    1              1, 3, 5       1, 3, 5
 *   rhythms        Tier 1         + Tier 2      + Tier 3
 *   the boss       Tier 2         Tier 3        Tier 4
 *   melody calls   1 bar          1 bar         1 bar
 *   chord calls    2 bars         2 bars        2 bars
 *   the song       2 bars ×4      4 bars ×2     8 bars ×1
 *   tempo          80             90            100   (+16 at most)
 *
 * A level adds to the one before: its calls draw on its own contours and
 * rhythms and every earlier level's. The rhythms are the owner's libraries
 * (rhythm.ts), a tier for each level, and the boss plays the tier above.
 * The song is always eight bars, a phrase played as many times as fill
 * them.
 *
 * Everything is in 4/4 at 480 ticks a quarter note (LITERACY_TPQ), as in
 * Music Literacy. Pure, no React.
 */

import { LITERACY_TPQ } from '@/content/musicLiteracy/schemas';

export type EchoLevelNumber = 1 | 2 | 3;

export const ECHO_LEVEL_NUMBERS: readonly EchoLevelNumber[] = [1, 2, 3];

/**
 * A zero point: the scale degree a contour's 0 sits on. Only the 1, the 3
 * and the 5 (scale positions 0, 2 and 4).
 */
export type EchoZeroPoint = 1 | 3 | 5;

/** The scale position a zero point puts a contour's 0 on: the 3 is 2. */
export const zeroPosition = (zeroPoint: EchoZeroPoint): number => zeroPoint - 1;

/** A contour tier (the library's 1–4) or a rhythm tier (rhythm.ts, 1–4). */
export type EchoTier = 1 | 2 | 3 | 4;

export const ECHO_TIME_SIGNATURE: readonly [number, number] = [4, 4];
export const BEAT_TICKS = LITERACY_TPQ;
export const SIXTEENTH_TICKS = LITERACY_TPQ / 4;
export const EIGHTH_TICKS = LITERACY_TPQ / 2;
export const BAR_TICKS = 4 * LITERACY_TPQ;

/**
 * A melody call is a bar: a contour on one of the owner's one-bar phrase
 * rhythms, echoed in the next bar, as Rhythm and Harmony's calls are.
 */
export const MELODY_CALL_BARS = 1;

/** A chord call is two bars: a chord each. */
export const CHORD_CALL_BARS = 2;

/** The Final Boss's calls, back to back: melody and chords by turns. */
export const BOSS_CALLS = 4;

/** The song is always eight bars: its phrase, repeated to fill them. */
export const SONG_BARS = 8;

/**
 * Level 1's base tempo, Music Literacy's 80. Each level has its own base
 * (`EchoLevel.tempo`: 80, 90, 100), and a game's tempo climbs from it as
 * the student does well (tempo.ts).
 */
export const ECHO_TEMPO = 80;

export interface EchoLevel {
  level: EchoLevelNumber;
  /** The contour tiers its calls draw on: its own and every earlier one. */
  contourTiers: readonly EchoTier[];
  zeroPoints: readonly EchoZeroPoint[];
  /** The rhythm tiers its calls draw on (rhythm.ts). */
  rhythmTiers: readonly EchoTier[];
  /** The tier the Final Boss plays, every call: the one above the level's. */
  bossRhythmTier: EchoTier;
  /** The song's phrase, in bars: what a take records. */
  phraseBars: 2 | 4 | 8;
  /** How many times the song plays its phrase. */
  repeats: 4 | 2 | 1;
  /**
   * Its base tempo, BPM: where a game starts, and the lowest it goes
   * (80, 90, 100). A game climbs from it (tempo.ts `nextEchoTempo`).
   */
  tempo: number;
  countInBars: number;
  /**
   * Auto Fill Bars' grid for a melody take, in ticks: the level's shortest
   * note, an eighth at Level 1 and a 16th from Level 2.
   */
  melodyGrid: number;
  /**
   * Auto Fill Bars' grid for a chord take: chords change on the bar line,
   * or the half bar at Level 3.
   */
  chordGrid: number;
}

export const ECHO_LEVELS: Readonly<Record<EchoLevelNumber, EchoLevel>> = {
  1: {
    level: 1,
    contourTiers: [1],
    zeroPoints: [1],
    rhythmTiers: [1],
    bossRhythmTier: 2,
    phraseBars: 2,
    repeats: 4,
    tempo: ECHO_TEMPO,
    countInBars: 1,
    melodyGrid: EIGHTH_TICKS,
    chordGrid: BAR_TICKS,
  },
  2: {
    level: 2,
    contourTiers: [1, 2],
    zeroPoints: [1, 3, 5],
    rhythmTiers: [1, 2],
    bossRhythmTier: 3,
    phraseBars: 4,
    repeats: 2,
    tempo: 90,
    countInBars: 1,
    melodyGrid: SIXTEENTH_TICKS,
    chordGrid: BAR_TICKS,
  },
  3: {
    level: 3,
    contourTiers: [1, 2, 3],
    zeroPoints: [1, 3, 5],
    rhythmTiers: [1, 2, 3],
    bossRhythmTier: 4,
    phraseBars: 8,
    repeats: 1,
    tempo: 100,
    countInBars: 1,
    melodyGrid: SIXTEENTH_TICKS,
    chordGrid: BAR_TICKS / 2,
  },
};

export const echoLevel = (level: EchoLevelNumber): EchoLevel =>
  ECHO_LEVELS[level];
