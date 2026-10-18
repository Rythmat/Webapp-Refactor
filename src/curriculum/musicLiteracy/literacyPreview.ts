import type { LiteracyMode } from '@/content/musicLiteracy/schemas';
import type { VoicedChord } from '@/curriculum/engine/musicLiteracy/chords';
import {
  chordNotes,
  placeChords,
  type ChordAttack,
  type TimedNote,
} from '@/curriculum/engine/musicLiteracy/literacy';
import {
  SCALE_SEMITONES,
  tonicMidi,
  type LiteracyKey,
} from '@/curriculum/engine/musicLiteracy/pitch';
import type { RunCue } from '@/curriculum/engine/musicLiteracy/run';

// ── Hearing a choice ───────────────────────────────────────────────────────
// What the choose steps play when the student picks or asks to hear: a key
// (its 1, 3 and 5, then the three together), a mode the same way, and a
// chord progression, a chord each half bar. Pure cues for the run's
// transport (literacyRun.ts), drawn on the keys as they sound; no count-in,
// nothing graded.

/** A preview's chord lasts a half note: four chords in two bars. */
export const PREVIEW_CHORD_TICKS = 960;

/** Let the last notes ring this long before the preview ends. */
const RING_TICKS = 480;

/** Cues sounding and lighting each note, then the end. */
export function previewCues(
  notes: readonly Pick<TimedNote, 'midi' | 'onset' | 'duration'>[],
): RunCue[] {
  const cues: RunCue[] = notes.flatMap((note, index): RunCue[] => [
    {
      kind: 'note',
      tick: note.onset,
      segment: 'call',
      index,
      midi: note.midi,
      duration: note.duration,
      sound: true,
      light: true,
    },
    {
      kind: 'noteEnd',
      tick: note.onset + note.duration,
      segment: 'call',
      index,
      midi: note.midi,
    },
  ]);
  const last = Math.max(0, ...notes.map((n) => n.onset + n.duration));
  cues.push({ kind: 'end', tick: last + RING_TICKS });
  // A key lets go before it's struck again; the end comes last.
  const order = { noteEnd: 0, beat: 1, drum: 2, note: 3, end: 4 } as const;
  return cues.sort((a, b) => a.tick - b.tick || order[a.kind] - order[b.kind]);
}

/** A key in a mode, heard: 1, 3 and 5 in eighths, then the three together. */
export function keyPreviewNotes(
  key: LiteracyKey,
): Pick<TimedNote, 'midi' | 'onset' | 'duration'>[] {
  const one = tonicMidi(key.tonic);
  const triad = [0, third(key.mode), 7].map((semitones) => one + semitones);
  return [
    ...triad.map((midi, i) => ({ midi, onset: i * 240, duration: 240 })),
    ...triad.map((midi) => ({ midi, onset: 720, duration: 1200 })),
  ];
}

const third = (mode: LiteracyMode) => SCALE_SEMITONES[mode][2];

/** A progression heard: each chord a half note, voiced as the lesson plays it. */
export function progressionPreview(
  chords: readonly VoicedChord[],
  tonic: number,
): { attacks: ChordAttack[]; notes: TimedNote[]; cues: RunCue[] } {
  const attacks = placeChords(
    chords,
    [PREVIEW_CHORD_TICKS],
    0,
    PREVIEW_CHORD_TICKS,
  );
  const notes = chordNotes(attacks, tonic);
  return { attacks, notes, cues: previewCues(notes) };
}
