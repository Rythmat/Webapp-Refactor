/**
 * Echo's calls: what Atlas plays for the student to echo, made fresh from a
 * seeded random source (random.ts).
 *
 * A MELODY CALL (`melodyCall`)
 * A bar: a contour of the level's (contours.ts: its own tier's half the
 * time, an earlier level's the rest), on one of the level's zero points
 * that keeps it inside the 1 to the 1 above, resolved through the key's
 * scale, on one of the owner's phrase rhythms with as many notes
 * (rhythm.ts). The answer comes in the next bar, as Rhythm and Harmony's
 * do.
 *
 * THE REGISTER (`echoTonic`)
 * Music Literacy's rule (register.ts `placeMelody`): the treble staff, the
 * fewest ledger lines, in C4–A5 when it can be. Placed once for the whole
 * pad window, the 1 up to the 1 above, not call by call, so the 1 sits in
 * one octave at every level: a pad always plays the pitch Atlas played,
 * and a call never jumps an octave from the last.
 *
 * A CHORD CALL (`chordCall`)
 * Two chords, a bar each, from the mode's six (no diminished chord):
 *
 *   major  1 maj  2 min  3 min  4 maj  5 maj  6 min
 *   minor  1 min  ♭3 maj 4 min  5 min  ♭6 maj ♭7 maj
 *
 * At Level 1 the call starts on the 1 chord, home, and moves to another;
 * from Level 2 it may start on any of the six. The two are always
 * different. They're voiced together, as Music Literacy voices a
 * progression (chords.ts `voiceChords`: the fewest ledger lines, no root
 * moving past a 4th), and struck in one of the owner's comping patterns
 * (rhythm.ts): a one-bar pattern in both bars, or a two-bar one across
 * them. The call's last beat is a breath: nothing struck or ringing in it,
 * so the student can find the first chord again.
 *
 * THE BOSS (`bossCalls`)
 * Four calls, melody and chords by turns, from the level's contours and
 * chords, every one on the tier of rhythms above the level's.
 *
 * THE TEMPO
 * A call carries the tempo it plays at (`tempo`): the one asked for (the
 * game's now, tempo.ts), else its level's base. Its ticks don't change with
 * it; grading.ts lays its run out at it.
 *
 * Every tick here is from the call's own downbeat; grading.ts places a call
 * on its run's timeline. Pure, no React.
 */

import {
  LITERACY_DIMINISHED_DEGREE,
  LITERACY_SCALE_DEGREES,
  type LiteracyDegree,
  type LiteracyMode,
  type LiteracyScaleDegree,
} from '@/content/musicLiteracy/schemas';
import { voicedProgression, type VoicedChord } from '../musicLiteracy/chords';
import {
  chordNotes,
  type ChordAttack,
  type TimedNote,
} from '../musicLiteracy/literacy';
import {
  DEGREE_OF_SEMITONE,
  degreeLabel,
  tonicMidi,
  type LiteracyKey,
} from '../musicLiteracy/pitch';
import { placeMelody } from '../musicLiteracy/register';
import {
  ECHO_CONTOURS,
  PAD_WINDOW,
  contourMotion,
  contourPositions,
  levelContours,
  libraryContour,
  positionNote,
  positionSemitones,
  zeroPointsFor,
  type EchoContour,
} from './contours';
import {
  BAR_TICKS,
  BEAT_TICKS,
  MELODY_CALL_BARS,
  echoLevel,
  type EchoLevelNumber,
  type EchoZeroPoint,
} from './levels';
import { pickOne, type EchoRandom } from './random';
import {
  chordRhythm,
  chordRhythmBars,
  chordRhythmById,
  melodyRhythm,
  melodyRhythmById,
  type ChordRhythm,
  type MelodyRhythm,
  type RhythmPool,
} from './rhythm';

/** A note of a melody call: a TimedNote, ticks from the call's downbeat. */
export interface EchoNote extends TimedNote {
  /** Its scale position from the 1, the zero point applied: −1 is the 7 below. */
  position: number;
  /** Its scale degree as shown: "1", "♭3", "7". */
  label: string;
}

interface CallBase {
  level: EchoLevelNumber;
  key: LiteracyKey;
  /** One of the Final Boss's: on Tier 4 rhythms too. */
  boss: boolean;
  bars: number;
  barTicks: number;
  /** The MIDI of the 1 its notes are read from. */
  tonic: number;
  /** The tempo it plays at, BPM (THE TEMPO above). */
  tempo: number;
}

export interface MelodyCall extends CallBase {
  kind: 'melody';
  contour: EchoContour;
  zeroPoint: EchoZeroPoint;
  /** Its rhythm: one of the owner's phrase rhythms, a bar long. */
  rhythm: MelodyRhythm;
  notes: EchoNote[];
}

export interface ChordCall extends CallBase {
  kind: 'chords';
  /** A chord a bar, by its root's degree of the mode: '3' in minor is ♭3. */
  degrees: LiteracyScaleDegree[];
  /** "1 maj", "♭6 maj": how the app names them. */
  labels: string[];
  /** A bar's chord, voiced with the other. */
  chords: VoicedChord[];
  /** Its rhythm: one of the owner's comping patterns. */
  rhythm: ChordRhythm;
  /** Each strike, ticks from the call's downbeat. */
  attacks: ChordAttack[];
  /** The strikes' notes, low to high each: the roll's. */
  notes: TimedNote[];
}

export type EchoCall = MelodyCall | ChordCall;

/** How often a level's calls take one of its own contours, not an earlier level's. */
export const NEW_CONTOUR_SHARE = 0.5;

/**
 * The 1 the melodies are read from, in a key (THE REGISTER above): every
 * position of the pad window, the 1 to the 1 above, placed together by
 * Music Literacy's rule.
 */
export function echoTonic(key: LiteracyKey): number {
  const { low, high } = PAD_WINDOW;
  const notes = Array.from({ length: high - low + 1 }, (_, i) =>
    positionNote(low + i, key.mode),
  );
  return placeMelody(key, notes).tonic;
}

/** The chromatic degree of a scale position (minor's 3rd is 'b3'). */
export const positionChromatic = (
  position: number,
  mode: LiteracyMode,
): LiteracyDegree =>
  DEGREE_OF_SEMITONE[((positionSemitones(position, mode) % 12) + 12) % 12];

/** The rhythms a level's calls draw on; the boss's, the tier above. */
function rhythmPool(level: EchoLevelNumber, boss: boolean): RhythmPool {
  const { rhythmTiers, bossRhythmTier } = echoLevel(level);
  return boss
    ? { tiers: rhythmTiers, only: bossRhythmTier }
    : { tiers: rhythmTiers };
}

/** A contour by id: the starter set's, or (a preview) any of the library's. */
function contourById(id: string, level: EchoLevelNumber): EchoContour {
  const curated = ECHO_CONTOURS.find((c) => c.id === id);
  if (curated) return curated;
  const found = libraryContour(id);
  if (!found) throw new Error(`No contour "${id}" in the library`);
  return { ...found, level, motion: contourMotion(found.contour) };
}

/** A contour for a call: its level's own half the time, avoiding `exclude`. */
function chooseContour(
  level: EchoLevelNumber,
  rng: EchoRandom,
  exclude: readonly string[] = [],
): EchoContour {
  const pool = levelContours(level);
  const fresh = pool.filter((c) => !exclude.includes(c.id));
  const from = fresh.length ? fresh : pool;
  const own = from.filter((c) => c.level === level);
  const earlier = from.filter((c) => c.level < level);
  const useOwn =
    own.length > 0 && (earlier.length === 0 || rng() < NEW_CONTOUR_SHARE);
  return pickOne(rng, useOwn ? own : earlier);
}

export interface MelodyCallOptions {
  /** A contour by its library id instead of one chosen (a preview, a test). */
  contourId?: string;
  /** A zero point instead of one chosen. */
  zeroPoint?: EchoZeroPoint;
  /**
   * A rhythm by its id instead of one chosen (a preview, a test): one with
   * as many notes as the contour.
   */
  rhythmId?: string;
  /** One of the Final Boss's calls. */
  boss?: boolean;
  /** Contour ids not to use, the last few played, while others remain. */
  exclude?: readonly string[];
  /** The tempo it plays at; the level's base when left out. */
  tempo?: number;
}

/** A one-bar melody call in a key (A MELODY CALL above). */
export function melodyCall(
  level: EchoLevelNumber,
  key: LiteracyKey,
  rng: EchoRandom,
  options: MelodyCallOptions = {},
): MelodyCall {
  const boss = options.boss ?? false;
  const contour = options.contourId
    ? contourById(options.contourId, level)
    : chooseContour(level, rng, options.exclude);
  const fitting = zeroPointsFor(contour, level);
  const zeroPoint =
    options.zeroPoint ??
    pickOne(rng, fitting.length ? fitting : echoLevel(level).zeroPoints);
  const positions = contourPositions(contour.contour, zeroPoint);
  const rhythm = options.rhythmId
    ? melodyRhythmById(options.rhythmId)
    : melodyRhythm(positions.length, rhythmPool(level, boss), rng);
  if (!rhythm || rhythm.notes !== positions.length) {
    throw new Error(
      `A melody call's rhythm has its contour's ${positions.length} notes: ${options.rhythmId}`,
    );
  }
  const tonic = echoTonic(key);
  const notes: EchoNote[] = rhythm.hits.map((hit, index) => {
    const position = positions[index];
    const degree = positionChromatic(position, key.mode);
    return {
      midi: tonic + positionSemitones(position, key.mode),
      onset: hit.onset,
      duration: hit.duration,
      degree,
      label: degreeLabel(degree),
      position,
      index,
    };
  });
  return {
    kind: 'melody',
    level,
    key,
    boss,
    bars: MELODY_CALL_BARS,
    barTicks: BAR_TICKS,
    tonic,
    tempo: options.tempo ?? echoLevel(level).tempo,
    contour,
    zeroPoint,
    rhythm,
    notes,
  };
}

/** The mode's six chords, by root degree, the 1 first: no diminished one. */
export const echoChordDegrees = (mode: LiteracyMode): LiteracyScaleDegree[] =>
  LITERACY_SCALE_DEGREES.filter(
    (degree) => degree !== LITERACY_DIMINISHED_DEGREE[mode],
  );

/** A chord call's two chords: from the 1 at Level 1, then any but the first. */
function chooseChordDegrees(
  level: EchoLevelNumber,
  mode: LiteracyMode,
  rng: EchoRandom,
): LiteracyScaleDegree[] {
  const six = echoChordDegrees(mode);
  const first = level === 1 ? '1' : pickOne(rng, six);
  return [
    first,
    pickOne(
      rng,
      six.filter((degree) => degree !== first),
    ),
  ];
}

/**
 * A figure's strikes: each bar's chord in the comping pattern's strikes for
 * that bar. With the breath, the last beat of all is left silent: nothing
 * struck in it, and nothing ringing into it.
 */
export function chordAttacks(
  chords: readonly VoicedChord[],
  rhythm: Pick<ChordRhythm, 'bars' | 'hits'>,
  { breath = true }: { breath?: boolean } = {},
): ChordAttack[] {
  const end = chords.length * BAR_TICKS - (breath ? BEAT_TICKS : 0);
  const attacks: ChordAttack[] = [];
  chordRhythmBars(rhythm, chords.length).forEach((hits, bar) => {
    for (const hit of hits) {
      const onset = bar * BAR_TICKS + hit.onset;
      if (onset >= end) continue;
      attacks.push({
        index: attacks.length,
        bar,
        onset,
        duration: Math.min(hit.duration, end - onset),
        chord: chords[bar],
      });
    }
  });
  return attacks;
}

export interface ChordCallOptions {
  /** The two chords instead of ones chosen: degrees of the mode's six. */
  degrees?: readonly LiteracyScaleDegree[];
  /** A comping pattern by its id instead of one chosen (a preview, a test). */
  rhythmId?: string;
  /** One of the Final Boss's calls. */
  boss?: boolean;
  /** The tempo it plays at; the level's base when left out. */
  tempo?: number;
}

/** A two-bar chord call in a key (A CHORD CALL above). */
export function chordCall(
  level: EchoLevelNumber,
  key: LiteracyKey,
  rng: EchoRandom,
  options: ChordCallOptions = {},
): ChordCall {
  const boss = options.boss ?? false;
  const six = echoChordDegrees(key.mode);
  if (options.degrees?.some((degree) => !six.includes(degree))) {
    throw new Error(
      `A chord call plays the mode's six chords: ${options.degrees}`,
    );
  }
  const degrees = options.degrees
    ? [...options.degrees]
    : chooseChordDegrees(level, key.mode, rng);
  const chords = voicedProgression(key, degrees);
  const rhythm = options.rhythmId
    ? chordRhythmById(options.rhythmId)
    : chordRhythm(rhythmPool(level, boss), rng);
  if (!rhythm) throw new Error(`No comping pattern "${options.rhythmId}"`);
  const attacks = chordAttacks(chords, rhythm);
  const tonic = tonicMidi(key.tonic);
  return {
    kind: 'chords',
    level,
    key,
    boss,
    bars: degrees.length,
    barTicks: BAR_TICKS,
    tonic,
    tempo: options.tempo ?? echoLevel(level).tempo,
    degrees,
    labels: chords.map((chord) => chord.label),
    chords,
    rhythm,
    attacks,
    notes: chordNotes(attacks, tonic),
  };
}

/**
 * The Final Boss's four calls (THE BOSS above): melody, chords, melody,
 * chords, its two melodies on different contours. `tempo`: the boss's
 * (tempo.ts `echoBossTempo`), the level's base when left out.
 */
export function bossCalls(
  level: EchoLevelNumber,
  key: LiteracyKey,
  rng: EchoRandom,
  { tempo }: { tempo?: number } = {},
): [MelodyCall, ChordCall, MelodyCall, ChordCall] {
  const first = melodyCall(level, key, rng, { boss: true, tempo });
  const second = chordCall(level, key, rng, { boss: true, tempo });
  const third = melodyCall(level, key, rng, {
    boss: true,
    exclude: [first.contour.id],
    tempo,
  });
  const fourth = chordCall(level, key, rng, { boss: true, tempo });
  return [first, second, third, fourth];
}
