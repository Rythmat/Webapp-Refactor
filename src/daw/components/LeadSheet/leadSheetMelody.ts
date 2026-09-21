import type { Track } from '@/daw/store/tracksSlice';
import { guessTrackRole } from '@/daw/utils/trackRole';
import {
  buildScore,
  type Accidental,
  type NotationNoteInput,
  type NoteValue,
} from '@/lib/notation';

// ── Melody on the lead sheet ───────────────────────────────────────────────
// With "Add Melody" on, the sheet stops being a chord chart and becomes a real
// lead sheet: the melody track written on the staff, chord symbols above it.
// The notation engine does the hard part — note values, ties, accidentals —
// and this places what comes back on the lead sheet's own five lines.
//
// Positions are in staff steps counted up from the bottom line (E4 in treble),
// so a renderer only multiplies by half a line space.

/** Steps count letters, not semitones: C=0 … B=6, rising by 7 an octave. */
const LETTER_STEPS: Record<string, number> = {
  c: 0,
  d: 1,
  e: 2,
  f: 3,
  g: 4,
  a: 5,
  b: 6,
};

const absoluteStep = (letter: string, octave: number) =>
  octave * 7 + (LETTER_STEPS[letter.toLowerCase()] ?? 0);

/** Treble clef: the bottom line is E4, which is where steps are counted from. */
const BOTTOM_LINE_STEP = absoluteStep('e', 4);

export interface MelodyNote {
  /** `trackId:clipId:startTick:midi`, as the Score names its notes. */
  id: string;
  measureIndex: number;
  /** Where in the bar it falls, 0 (downbeat) to 1 (next barline). */
  position: number;
  /** How much of the bar it lasts, for drawing a stem-less duration hint. */
  width: number;
  midi: number;
  /** Staff steps above the bottom line; may be negative. */
  step: number;
  value: NoteValue;
  dots: 0 | 1;
  accidental: Accidental | null;
  tieToNext: boolean;
}

export interface MelodyLayout {
  notes: MelodyNote[];
  /** Measures that carry at least one note, so slashes can stand down. */
  measuresWithNotes: Set<number>;
}

export const EMPTY_MELODY: MelodyLayout = {
  notes: [],
  measuresWithNotes: new Set(),
};

/**
 * The track the melody is read from: the one explicitly assigned, else the
 * first whose role says melody, else the first MIDI track with notes.
 */
export function pickMelodyTrack(
  tracks: Track[],
  assignedId: string | null,
): Track | null {
  const midi = tracks.filter(
    (track) => track.type === 'midi' && track.midiClips.length > 0,
  );
  if (assignedId) {
    const assigned = midi.find((track) => track.id === assignedId);
    if (assigned) return assigned;
  }
  const roleOf = (track: Track) =>
    track.trackRole === 'auto' || track.trackRole === undefined
      ? guessTrackRole(track.name, track.instrument)
      : track.trackRole;
  return midi.find((track) => roleOf(track) === 'melody') ?? midi[0] ?? null;
}

const stepOf = (letter: string, octave: number) =>
  absoluteStep(letter, octave) - BOTTOM_LINE_STEP;

export interface MelodyLayoutOptions {
  ticksPerQuarter: number;
  timeSignature: [number, number];
  keyFifths: number;
  measureCount: number;
}

/** Lay a track's notes out across the lead sheet's bars. */
export function layOutMelody(
  track: Track | null,
  options: MelodyLayoutOptions,
): MelodyLayout {
  if (!track) return EMPTY_MELODY;

  const inputs: NotationNoteInput[] = [];
  for (const clip of track.midiClips) {
    for (const event of clip.events) {
      inputs.push({
        id: `${track.id}:${clip.id}:${event.startTick}:${event.note}`,
        midi: event.note,
        startTick: clip.startTick + event.startTick,
        durationTicks: event.durationTicks,
      });
    }
  }
  if (inputs.length === 0) return EMPTY_MELODY;

  const score = buildScore(inputs, {
    ticksPerQuarter: options.ticksPerQuarter,
    timeSignature: options.timeSignature,
    keyFifths: options.keyFifths,
    staves: 'treble',
    minMeasures: options.measureCount,
  });

  const notes: MelodyNote[] = [];
  const measuresWithNotes = new Set<number>();
  const ticksPerMeasure = score.ticksPerMeasure || 1;

  for (const measure of score.measures) {
    for (const voice of measure.staves.treble ?? []) {
      for (const item of voice.items) {
        if (item.kind !== 'note' || item.hidden || item.keys.length === 0) {
          continue;
        }
        // A lead sheet carries one line, so a stacked chord shows its top note.
        const key = item.keys[item.keys.length - 1];
        notes.push({
          id: key.noteId,
          measureIndex: measure.index,
          position: (item.startTick - measure.startTick) / ticksPerMeasure,
          width: item.durationTicks / ticksPerMeasure,
          midi: key.midi,
          step: stepOf(key.letter, key.octave),
          value: item.value,
          dots: item.dots,
          accidental: key.accidental,
          tieToNext: item.tieToNext,
        });
        measuresWithNotes.add(measure.index);
      }
    }
  }

  return { notes, measuresWithNotes };
}

/** Note ids in the order they sound — what a Shift-click range walks. */
export function melodyNoteOrder(layout: MelodyLayout): string[] {
  return [...layout.notes]
    .sort(
      (a, b) =>
        a.measureIndex - b.measureIndex ||
        a.position - b.position ||
        a.midi - b.midi,
    )
    .map((note) => note.id);
}

/** A filled notehead for anything shorter than a half note. */
export const isFilledNotehead = (value: NoteValue): boolean =>
  value !== 'w' && value !== 'h';

/** Flags drawn on the stem: one for an eighth, two for a sixteenth. */
export const flagCount = (value: NoteValue): number =>
  value === '8' ? 1 : value === '16' ? 2 : value === '32' ? 3 : 0;
