import type { VoicedChord } from '@/curriculum/engine/musicLiteracy/chords';
import {
  chordNotes,
  placeChords,
  type ChordAttack,
  type TimedNote,
} from '@/curriculum/engine/musicLiteracy/literacy';
import type { LiteracyKey } from '@/curriculum/engine/musicLiteracy/pitch';
import {
  pitchFrom,
  placeMelody,
  type WrittenNote,
} from '@/curriculum/engine/musicLiteracy/register';
import type { RunCue } from '@/curriculum/engine/musicLiteracy/run';

// ── Hearing a choice ───────────────────────────────────────────────────────
// What the choose steps play when the student picks or asks to hear: a key
// (its 1, 3 and 5, then the three together), a mode the same way, and a
// chord progression, a chord each half bar. Pure cues for the run's
// transport (literacyRun.ts), drawn on the keys as they sound; no count-in,
// nothing graded. A key's 1, 3 and 5 sit where its melodies will, in the
// treble staff (register.ts); a progression is voiced as the steps that
// play it will voice it (chords.ts `voicedProgression`).

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

/** A key's 1, 3 and 5, as the mode has them. */
const TRIAD: readonly WrittenNote[] = [
  { degree: '1' },
  { degree: '3' },
  { degree: '5' },
];

/**
 * A key in a mode, heard: 1, 3 and 5 in eighths, then the three together,
 * placed as a melody (the fewest ledger lines, in C4–A5).
 */
export function keyPreviewNotes(
  key: LiteracyKey,
): Pick<TimedNote, 'midi' | 'onset' | 'duration'>[] {
  const { tonic } = placeMelody(key, TRIAD, 'scale');
  const triad = TRIAD.map((note) => pitchFrom(note, tonic, key, 'scale'));
  return [
    ...triad.map((midi, i) => ({ midi, onset: i * 240, duration: 240 })),
    ...triad.map((midi) => ({ midi, onset: 720, duration: 1200 })),
  ];
}

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
