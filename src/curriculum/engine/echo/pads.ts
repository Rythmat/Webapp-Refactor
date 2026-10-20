/**
 * Echo's pads, the default input at Level 1 (docs/echo-game.md, Input and
 * views): Simon-style, touch first.
 *
 * MELODY PADS (`melodyPads`)
 * The scale positions a level's calls reach, lowest to highest, with no
 * gap (contours.ts `levelSpan`): Level 1's the 5 below the 1 up to the 5
 * above, eight pads; Levels 2 and 3 the whole pad window, the 5 below up to
 * the 7, ten. Each plays its pitch as the level's calls place it (calls.ts
 * `echoTonic`), so a pad always plays what Atlas played. Each wears its
 * note's color on the circle in the key's mode, as Part 2's chooser colors
 * a chord by its root (chart.ts `chartColors`): the 1's pad is the key's
 * own color (a minor key wears its relative major's).
 *
 * CHORD PADS (`chordPads`)
 * The mode's six chords, no diminished one, each voiced on its own (the
 * fewest ledger lines), colored by its root the same way. A chord echo is
 * graded by pitch class, so a pad's octave never costs a point.
 *
 * Pure, no React.
 */

import type {
  LiteracyDegree,
  LiteracyMode,
  LiteracyScaleDegree,
} from '@/content/musicLiteracy/schemas';
import { chartKeyColor } from '../musicLiteracy/chart';
import { circleOfFifths } from '../musicLiteracy/choices';
import { voicedChord, type VoicedChord } from '../musicLiteracy/chords';
import {
  degreeLabel,
  pitchClassOf,
  type LiteracyKey,
} from '../musicLiteracy/pitch';
import { echoChordDegrees, echoTonic, positionChromatic } from './calls';
import { levelSpan, positionSemitones, type PositionSpan } from './contours';
import type { EchoLevelNumber } from './levels';

/** One melody pad. */
export interface MelodyPad {
  /** Its scale position from the 1: −3 is the 5 below. */
  position: number;
  midi: number;
  /** Its chromatic degree: 'b3'. */
  degree: LiteracyDegree;
  /** As shown: "♭3". */
  label: string;
  /** Its octave from the 1's: −1 below it, 1 above. */
  octave: number;
  color: string;
}

export interface MelodyPads {
  level: EchoLevelNumber;
  key: LiteracyKey;
  /** The MIDI of the 1. */
  tonic: number;
  /** The key's color: the 1's pad's. */
  keyColor: string;
  span: PositionSpan;
  /** Lowest to highest. */
  pads: MelodyPad[];
}

/** One chord pad. */
export interface ChordPad {
  degree: LiteracyScaleDegree;
  /** "♭6 maj". */
  label: string;
  color: string;
  /** What one tap plays. */
  chord: VoicedChord;
}

/** A pitch class's color on the circle, in a mode (chart.ts `chartColors`). */
function circleColor(pitchClass: number, mode: LiteracyMode): string {
  return (
    circleOfFifths(mode).find((k) => k.pitchClass === pitchClass)?.color ??
    '#888888'
  );
}

/** The melody pads of a level, in a key (MELODY PADS above). */
export function melodyPads(
  level: EchoLevelNumber,
  key: LiteracyKey,
): MelodyPads {
  const span = levelSpan(level);
  const tonic = echoTonic(level, key);
  const one = pitchClassOf(key.tonic);
  const pads = Array.from({ length: span.high - span.low + 1 }, (_, i) => {
    const position = span.low + i;
    const semitones = positionSemitones(position, key.mode);
    const degree = positionChromatic(position, key.mode);
    return {
      position,
      midi: tonic + semitones,
      degree,
      label: degreeLabel(degree),
      octave: Math.floor(position / 7),
      color: circleColor((one + semitones + 120) % 12, key.mode),
    };
  });
  return { level, key, tonic, keyColor: chartKeyColor(key), span, pads };
}

/** The six chord pads of a key, the 1 first (CHORD PADS above). */
export function chordPads(key: LiteracyKey): ChordPad[] {
  const one = pitchClassOf(key.tonic);
  return echoChordDegrees(key.mode).map((degree) => {
    const chord = voicedChord(key, degree)!;
    return {
      degree,
      label: chord.label,
      color: circleColor((one + chord.rootSemitones) % 12, key.mode),
      chord,
    };
  });
}
