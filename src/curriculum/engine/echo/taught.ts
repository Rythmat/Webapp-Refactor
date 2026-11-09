/**
 * A teacher's call: what the teacher played over a call's bars, made into a
 * call the class echoes as it echoes Atlas's (docs/echo-classroom.md, The
 * Teacher Leads). The run plays an empty one (`emptyTaughtCall`) until the
 * call bars are over; then what was played becomes the call
 * (`taughtCall`), before the count-off bar is out.
 *
 * A MELODY
 * The notes played, quantized to the level's grid (an eighth at Level 1, a
 * 16th after) as a take is under Auto Fill (takes.ts `processTake`), and,
 * unless the teacher turns it off, snapped to the key (Auto-Tune Melody's
 * rule), so the pads can always answer. Moved by octaves to sit on the pads
 * (the 1 to the 1 above) as far as it can. Its contour is its notes' scale
 * positions from the 1 (zero point 1), its rhythm their hits: the call
 * carries them as Atlas's does.
 *
 * CHORDS
 * Each strike as a chord echo hears it (strikes.ts `chordStrikes`, at the
 * tempo), its notes snapped to the key first (unless that's off), at its
 * place on the level's grid, recognized as one of the key's six (takes.ts
 * `recognizeChord`); a strike that's none of them is left out. Voiced
 * together as a progression (chords.ts `voicedProgression`). A bar's chord,
 * as the call names it, is the first struck in it; a bar with none keeps
 * the chord sounding into it.
 *
 * Nothing played that makes a call: null ("No call heard").
 *
 * Pure, no React.
 */

import type { LiteracyScaleDegree } from '@/content/musicLiteracy/schemas';
import {
  voicedChord,
  voicedProgression,
  type VoicedChord,
} from '../musicLiteracy/chords';
import type { PlayedNote } from '../musicLiteracy/grading';
import { chordNotes, type ChordAttack } from '../musicLiteracy/literacy';
import {
  SCALE_SEMITONES,
  degreeLabel,
  tonicMidi,
  type LiteracyKey,
} from '../musicLiteracy/pitch';
import {
  echoTonic,
  positionChromatic,
  type ChordCall,
  type EchoCall,
  type EchoNote,
  type MelodyCall,
} from './calls';
import { PAD_WINDOW, contourMotion, type EchoContour } from './contours';
import {
  BAR_TICKS,
  CHORD_CALL_BARS,
  MELODY_CALL_BARS,
  SIXTEENTH_TICKS,
  echoLevel,
  type EchoLevelNumber,
} from './levels';
import type { ChordRhythm, MelodyRhythm, RhythmHit } from './rhythm';
import { chordStrikes } from './strikes';
import { processTake, recognizeChord, snapToKey } from './takes';

export interface TaughtCallOptions {
  /** The call's downbeat, in `played`'s ticks. */
  start: number;
  /** The tempo it was played at, BPM. */
  tempo: number;
  /** Snap its notes to the key (the default). */
  snap?: boolean;
}

/** The kind of call a section's teacher plays. */
export type TaughtKind = 'melody' | 'chords';

/** A rhythm's grid as the libraries write it: x a note, - held, . a rest. */
function gridOf(hits: readonly RhythmHit[], bars: number): string {
  const cells = Array<string>((bars * BAR_TICKS) / SIXTEENTH_TICKS).fill('.');
  for (const hit of hits) {
    const first = Math.round(hit.onset / SIXTEENTH_TICKS);
    const last = Math.round((hit.onset + hit.duration) / SIXTEENTH_TICKS);
    for (let i = first; i < last && i < cells.length; i++) {
      cells[i] = i === first ? 'x' : '-';
    }
  }
  return cells.join('');
}

/** A teacher's contour: positions from the 1, on zero point 1. */
function taughtContour(
  positions: readonly number[],
  level: EchoLevelNumber,
): EchoContour {
  return {
    id: `taught:${positions.join(',')}`,
    noteCount: positions.length,
    contour: positions,
    shape: 'taught',
    tier: 1,
    tag: 'common',
    level,
    motion: contourMotion(positions),
  };
}

/** A pitch's scale position from the 1 (the one below, if out of the key). */
function positionOf(midi: number, tonic: number, key: LiteracyKey): number {
  const scale = SCALE_SEMITONES[key.mode];
  const above = midi - tonic;
  const octave = Math.floor(above / 12);
  const within = above - 12 * octave;
  const step = scale.reduce((at, s, i) => (s <= within ? i : at), 0);
  return step + scale.length * octave;
}

/** The octave shift that puts the most of `midis` on the pads. */
function padShift(midis: readonly number[], tonic: number): number {
  // The pads' octave: the 1 to the 1 above (PAD_WINDOW).
  const low = tonic + PAD_WINDOW.low;
  const high = tonic + 12;
  let best = 0;
  let most = -1;
  for (const shift of [0, -12, 12, -24, 24]) {
    const inside = midis.filter(
      (m) => m + shift >= low && m + shift <= high,
    ).length;
    if (inside > most) {
      most = inside;
      best = shift;
    }
  }
  return best;
}

interface CallFrame {
  level: EchoLevelNumber;
  key: LiteracyKey;
  tempo: number;
}

/** A call the teacher is still to play: what the run plays meanwhile. */
export function emptyTaughtCall(
  kind: TaughtKind,
  { level, key, tempo }: CallFrame,
): EchoCall {
  if (kind === 'melody') {
    return {
      kind: 'melody',
      level,
      key,
      boss: false,
      taught: true,
      bars: MELODY_CALL_BARS,
      barTicks: BAR_TICKS,
      tonic: echoTonic(key),
      tempo,
      contour: taughtContour([], level),
      zeroPoint: 1,
      rhythm: taughtMelodyRhythm([]),
      notes: [],
    };
  }
  return {
    kind: 'chords',
    level,
    key,
    boss: false,
    taught: true,
    bars: CHORD_CALL_BARS,
    barTicks: BAR_TICKS,
    tonic: tonicMidi(key.tonic),
    tempo,
    degrees: [],
    labels: [],
    chords: [],
    rhythm: taughtChordRhythm([]),
    attacks: [],
    notes: [],
  };
}

/** Whether a call is a teacher's not yet played. */
export const awaitsTeacher = (call: EchoCall): boolean =>
  !!call.taught && call.notes.length === 0;

const taughtMelodyRhythm = (hits: RhythmHit[]): MelodyRhythm => ({
  id: 'taught',
  name: 'The teacher’s rhythm',
  notes: hits.length,
  tier: 1,
  genres: [],
  grid: gridOf(hits, MELODY_CALL_BARS),
  hits,
  sameAs: [],
});

const taughtChordRhythm = (hits: RhythmHit[]): ChordRhythm => ({
  id: 'taught',
  name: 'The teacher’s rhythm',
  bars: CHORD_CALL_BARS,
  tier: 1,
  style: '',
  grid: gridOf(hits, CHORD_CALL_BARS),
  hits,
  sameAs: [],
});

/** The teacher's melody call, or null if nothing was played. */
export function taughtMelodyCall(
  played: readonly PlayedNote[],
  frame: CallFrame,
  { start, tempo, snap = true }: TaughtCallOptions,
): MelodyCall | null {
  const { level, key } = frame;
  const take = processTake(played, {
    kind: 'melody',
    key,
    level,
    bars: MELODY_CALL_BARS,
    scaffolding: { autoTune: snap, autoFill: true },
    start,
    tempo,
  });
  if (take.notes.length === 0) return null;
  const tonic = echoTonic(key);
  const shift = padShift(
    take.notes.map((n) => n.midi),
    tonic,
  );
  const notes: EchoNote[] = take.notes.map((note, index) => {
    const midi = note.midi + shift;
    const position = positionOf(midi, tonic, key);
    const degree = snap ? positionChromatic(position, key.mode) : note.degree;
    return {
      midi,
      onset: note.tick,
      duration: note.duration,
      degree,
      label: snap ? degreeLabel(degree) : note.label,
      position,
      index,
    };
  });
  const positions = notes.map((n) => n.position);
  return {
    ...(emptyTaughtCall('melody', { ...frame, tempo }) as MelodyCall),
    contour: taughtContour(positions, level),
    rhythm: taughtMelodyRhythm(
      notes.map((n) => ({ onset: n.onset, duration: n.duration })),
    ),
    notes,
  };
}

/** The teacher's chord call, or null if no chord of the key was struck. */
export function taughtChordCall(
  played: readonly PlayedNote[],
  frame: CallFrame,
  { start, tempo, snap = true }: TaughtCallOptions,
): ChordCall | null {
  const { level, key } = frame;
  const grid = echoLevel(level).melodyGrid;
  const length = CHORD_CALL_BARS * BAR_TICKS;
  const tuned = played.map((note) => ({
    ...note,
    onset: note.onset - start,
    midi: snap ? snapToKey(note.midi, key) : note.midi,
  }));
  const strikes = chordStrikes(tuned, {
    tempo,
    complete: (midis) => recognizeChord(midis, key) !== null,
  });

  // Each strike at its place on the grid, as one of the six.
  const heard: { onset: number; end: number; degree: LiteracyScaleDegree }[] =
    [];
  for (const strike of strikes) {
    const onset = Math.round(strike.onset / grid) * grid;
    if (onset < 0 || onset >= length) continue;
    if (heard.some((h) => h.onset === onset)) continue;
    const degree = recognizeChord(
      [...strike.notes, ...strike.held].map((n) => n.midi),
      key,
    );
    if (!degree) continue;
    const end = Number.isFinite(strike.end)
      ? Math.round(strike.end / grid) * grid
      : onset + grid;
    heard.push({ onset, end: Math.max(end, onset + grid), degree });
  }
  if (heard.length === 0) return null;
  heard.sort((a, b) => a.onset - b.onset);

  // Voiced together: one voicing for each run of the same chord.
  const runs: LiteracyScaleDegree[] = heard
    .map((h) => h.degree)
    .filter((degree, i, all) => i === 0 || degree !== all[i - 1]);
  const voiced = voicedProgression(key, runs);
  let run = -1;
  const chordOf = heard.map((h, i) => {
    if (i === 0 || h.degree !== heard[i - 1].degree) run += 1;
    return voiced[run] ?? voicedChord(key, h.degree)!;
  });

  const attacks: ChordAttack[] = heard.map((h, i) => {
    const bar = Math.floor(h.onset / BAR_TICKS);
    const next = heard[i + 1]?.onset ?? length;
    const barEnd = (bar + 1) * BAR_TICKS;
    return {
      index: i,
      bar,
      onset: h.onset,
      duration: Math.max(grid, Math.min(h.end, next, barEnd) - h.onset),
      chord: chordOf[i],
    };
  });

  // A bar's chord: its first, or the one sounding into it.
  const chords: VoicedChord[] = [];
  for (let bar = 0; bar < CHORD_CALL_BARS; bar++) {
    const first = attacks.find((a) => a.bar === bar);
    const sounding = [...attacks].reverse().find((a) => a.bar < bar);
    chords.push((first ?? sounding ?? attacks[0]).chord);
  }
  const call = emptyTaughtCall('chords', { ...frame, tempo }) as ChordCall;
  return {
    ...call,
    degrees: chords.map((c) => c.degree),
    labels: chords.map((c) => c.label),
    chords,
    rhythm: taughtChordRhythm(
      attacks.map((a) => ({ onset: a.onset, duration: a.duration })),
    ),
    attacks,
    notes: chordNotes(attacks, call.tonic),
  };
}

/** The teacher's call of a kind, or null if nothing made one. */
export const taughtCall = (
  kind: TaughtKind,
  played: readonly PlayedNote[],
  frame: CallFrame,
  options: TaughtCallOptions,
): EchoCall | null =>
  kind === 'melody'
    ? taughtMelodyCall(played, frame, options)
    : taughtChordCall(played, frame, options);
