/**
 * Echo's pads, the default input at Level 1 (docs/echo-game.md, Input and
 * views): Simon-style, touch first.
 *
 * MELODY PADS (`melodyPads`)
 * The pad window, at every level: the 1 up to the 1 above it, eight pads,
 * a full octave with a 1 at each end (the owner's rule). Each plays its
 * pitch as the calls place it (calls.ts `echoTonic`), so a pad always
 * plays what Atlas played. Each wears its
 * note's color on the circle in the key's mode, as Part 2's chooser colors
 * a chord by its root (chart.ts `chartColors`): the 1's pad is the key's
 * own color (a minor key wears its relative major's).
 *
 * CHORD PADS (`chordPads`)
 * The mode's six chords, no diminished one, each voiced on its own (the
 * fewest ledger lines), colored by its root the same way, and the 1 chord
 * again an octave up: a 1 at each end, as the melody pads have. A chord
 * echo is graded by pitch class, so a pad's octave never costs a point.
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
import { PAD_WINDOW, positionSemitones, type PositionSpan } from './contours';

/** One melody pad. */
export interface MelodyPad {
  /** Its scale position from the 1: 7 is the 1 above. */
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
  /** 1 for the 1 chord an octave up, the last pad; else 0. */
  octave: 0 | 1;
}

/** A pitch class's color on the circle, in a mode (chart.ts `chartColors`). */
function circleColor(pitchClass: number, mode: LiteracyMode): string {
  return (
    circleOfFifths(mode).find((k) => k.pitchClass === pitchClass)?.color ??
    '#888888'
  );
}

/** The melody pads of a key, at every level (MELODY PADS above). */
export function melodyPads(key: LiteracyKey): MelodyPads {
  const span = PAD_WINDOW;
  const tonic = echoTonic(key);
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
  return { key, tonic, keyColor: chartKeyColor(key), span, pads };
}

/** A key's seven chord pads: the six, the 1 first, then the 1 up an octave. */
export function chordPads(key: LiteracyKey): ChordPad[] {
  const one = pitchClassOf(key.tonic);
  const six = echoChordDegrees(key.mode).map((degree): ChordPad => {
    const chord = voicedChord(key, degree)!;
    return {
      degree,
      label: chord.label,
      color: circleColor((one + chord.rootSemitones) % 12, key.mode),
      chord,
      octave: 0,
    };
  });
  const home = six[0];
  return [
    ...six,
    {
      ...home,
      chord: {
        ...home.chord,
        root: home.chord.root + 12,
        midis: home.chord.midis.map((midi) => midi + 12),
      },
      octave: 1,
    },
  ];
}
