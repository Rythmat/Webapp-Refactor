/**
 * resolveStepContent.ts — Content generation engine for v2 genre curriculum.
 *
 * Produces GenreNoteEvent[] for any v2 activity step.
 * Self-contained — no dependency on buildStepEvents(), GCM, or Prism API.
 */

import type { NoteEvent as PianoRollNoteEvent } from '../../../components/Games/PianoRollPlay';
import type { ActivitySectionId } from '../../types/activity';
import type { ActivityStepV2 } from '../../types/activity.v2';

// ── Our internal note format ─────────────────────────────────────────────────

export interface GenreNoteEvent {
  midi: number;
  onset: number; // ticks, PPQ=480
  duration: number; // ticks
  velocity?: number;
  hand?: 'lh' | 'rh'; // grand staff stave assignment (passed through from TargetNote)
}

export interface StepContext {
  section: ActivitySectionId;
  keyRoot: number; // MIDI root note e.g. 62 for D4
  tempo: number; // BPM
  timeSignature: [number, number]; // default [4, 4]
  tpb: number; // ticks per beat, default 480
  defaultScale?: number[]; // flow-level default scale intervals
}

// ── Tag detection helpers ────────────────────────────────────────────────────

function isScaleStep(tag: string): boolean {
  return (
    /pentatonic|blues_scale|minor_blues|dorian_scale|dorian_full|ascending|descending/.test(
      tag,
    ) &&
    !tag.includes('arpeggio') &&
    !tag.includes('arpeggiate') &&
    !tag.includes('voicing') &&
    !tag.includes('shell') &&
    !tag.includes('progression')
  );
}

function isArpeggioStep(tag: string): boolean {
  return tag.includes('arpeggio') || tag.includes('arpeggiate');
}

function isBassScaleStep(tag: string, section: ActivitySectionId): boolean {
  return (
    section === 'C' &&
    (tag.includes('pentatonic') ||
      tag.includes('scale') ||
      tag.includes('root'))
  );
}

function isPlayAlongStep(tag: string): boolean {
  return tag.includes('playalong');
}

function isPhraseStep(tag: string): boolean {
  return (
    tag.includes('phrase') ||
    tag.includes('shape_a') ||
    tag.includes('shape_c') ||
    tag.includes('call') ||
    tag.includes('answer') ||
    tag.includes('motivic') ||
    tag.includes('dual_functionality') ||
    tag.includes('final_answer') ||
    tag.includes('density_arc')
  );
}

function isVoicingStep(tag: string): boolean {
  return (
    tag.includes('shell') ||
    tag.includes('rootless') ||
    tag.includes('sizzle') ||
    tag.includes('voicing') ||
    tag.includes('funk9') ||
    tag.includes('progression') ||
    tag.includes('vamp') ||
    tag.includes('performance')
  );
}

// ── Scale generation ─────────────────────────────────────────────────────────

function generateScale(
  step: ActivityStepV2,
  ctx: StepContext,
): GenreNoteEvent[] {
  const intervals = step.scaleIntervals ??
    ctx.defaultScale ?? [0, 2, 3, 5, 7, 9, 10];
  const tag = step.tag.toLowerCase();
  const descending = tag.includes('descending');
  const register = ctx.section === 'C' ? ctx.keyRoot - 24 : ctx.keyRoot; // bass = 2 octaves down

  // Build scale MIDI notes
  let notes = intervals.map((i) => register + i);
  // Add octave top note
  notes = [...notes, register + 12];
  if (descending) notes = notes.reverse();

  // One note per beat, quarter note duration
  return notes.map((midi, i) => ({
    midi,
    onset: i * ctx.tpb,
    duration: ctx.tpb - 20, // slight gap between notes
  }));
}

// ── Arpeggio generation ──────────────────────────────────────────────────────

function generateArpeggio(
  step: ActivityStepV2,
  ctx: StepContext,
): GenreNoteEvent[] {
  const intervals = step.scaleIntervals ?? ctx.defaultScale ?? [0, 3, 7, 10]; // default min7
  const tag = step.tag.toLowerCase();
  const descending = tag.includes('descending');
  const register = ctx.keyRoot;

  let notes = intervals.map((i) => register + i);
  if (descending) notes = notes.reverse();

  return notes.map((midi, i) => ({
    midi,
    onset: i * ctx.tpb,
    duration: ctx.tpb - 20,
  }));
}

// ── Main resolver ────────────────────────────────────────────────────────────

export function resolveStepContent(
  step: ActivityStepV2,
  ctx: StepContext,
): GenreNoteEvent[] | null {
  const tag = step.tag.toLowerCase();

  // Diagnostic — trace step 96 path
  if (
    step.stepNumber === 96 ||
    (step.activity && step.activity.includes('A1.1'))
  ) {
    console.log(
      '[resolveStepContent TRACE]',
      'stepNumber:',
      step.stepNumber,
      '| tag:',
      tag,
      '| targetNotes:',
      step.targetNotes?.length ?? 'none',
      '| scaleId:',
      (step as any).scaleId ?? 'none',
      '| scaleIntervals:',
      (step as any).scaleIntervals ?? 'none',
      '| keyRoot:',
      ctx.keyRoot,
      '| section:',
      ctx.section,
    );
  }

  // Priority 1: explicit targetNotes — always use if present
  if (step.targetNotes && step.targetNotes.length > 0) {
    return step.targetNotes;
  }

  // Priority 2: play-along steps — student improvises, no notes to display
  // Return empty array (not null) so piano roll renders blank, not a scale fallback
  if (isPlayAlongStep(tag)) {
    return [];
  }

  // Priority 3: scale steps
  if (isScaleStep(tag) || isBassScaleStep(tag, step.section)) {
    return generateScale(step, ctx);
  }

  // Priority 4: arpeggio steps
  if (isArpeggioStep(tag)) {
    return generateArpeggio(step, ctx);
  }

  // Priority 5: phrase steps — use targetNotes if available, scale fallback otherwise
  if (isPhraseStep(tag)) {
    if (step.targetNotes && step.targetNotes.length > 0) {
      return step.targetNotes;
    }
    console.warn(
      `[resolveStepContent] Phrase step missing targetNotes: ${step.activity} — using scale fallback`,
    );
    return generateScale(step, ctx);
  }

  // Priority 5: voicing/chord/progression steps — require targetNotes
  // Free-form steps (full_groove, capstone) are intentionally empty — no warning
  if (isVoicingStep(tag)) {
    if (!tag.includes('full_groove') && !tag.includes('capstone')) {
      console.warn(
        `[resolveStepContent] Voicing step missing targetNotes: ${step.activity}`,
      );
    }
    return [];
  }

  // Priority 6: unknown — return null to signal fallback
  return null;
}

// ── Enharmonic spelling ──────────────────────────────────────────────────────
// Definitive key-specific note name table.
// One source of truth for all enharmonic spelling decisions.
// Key = root note name, Value = 12 note names indexed by semitone 0-11.
// DO NOT MODIFY THIS TABLE — it is the canonical enharmonic reference.

export const KEY_NOTE_NAMES: Record<string, string[]> = {
  C: ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'],
  Db: ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'Cb'],
  D: ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'],
  Eb: ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'],
  E: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'],
  F: ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'],
  'F#': ['B#', 'C#', 'D', 'D#', 'E', 'E#', 'F#', 'G', 'G#', 'A', 'A#', 'B'],
  Gb: ['C', 'Db', 'D', 'Eb', 'Fb', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'Cb'],
  G: ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'],
  Ab: ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'],
  A: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'],
  Bb: ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'],
  B: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'],
};

// Map MIDI root number to key name
export const MIDI_ROOT_TO_KEY: Record<number, string> = {
  0: 'C',
  1: 'Db',
  2: 'D',
  3: 'Eb',
  4: 'E',
  5: 'F',
  6: 'F#',
  7: 'G',
  8: 'Ab',
  9: 'A',
  10: 'Bb',
  11: 'B',
};

/**
 * Convert MIDI note to pitch name with key-context-aware enharmonic spelling.
 * Uses KEY_NOTE_NAMES lookup — the single source of truth.
 *
 * @param midi - MIDI note number (0-127)
 * @param keyRoot - optional MIDI root for key context (e.g., 62 for D)
 */
export function midiToPitchName(midi: number, keyRoot?: number): string {
  const semitone = midi % 12;
  const octave = Math.floor(midi / 12) - 1;

  const keyName =
    keyRoot !== undefined ? (MIDI_ROOT_TO_KEY[keyRoot % 12] ?? 'C') : 'C';

  const noteNames = KEY_NOTE_NAMES[keyName] ?? KEY_NOTE_NAMES['C'];
  return `${noteNames[semitone]}${octave}`;
}

// ── PianoRoll conversion ─────────────────────────────────────────────────────

export function toPianoRollEvents(
  notes: GenreNoteEvent[],
  keyColor?: string,
  keyRoot?: number,
): PianoRollNoteEvent[] {
  return notes.map((note, i) => ({
    id: `genre_note_${i}`,
    pitchName: midiToPitchName(note.midi, keyRoot),
    midi: note.midi,
    startTicks: note.onset,
    durationTicks: note.duration,
    velocity: note.velocity ?? 80,
    color: keyColor ? `${keyColor}b3` : undefined, // 70% opacity target color
    ...(note.hand !== undefined ? { hand: note.hand } : {}),
  }));
}
