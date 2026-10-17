import { noteKey } from '@/daw/model/noteKeys';
import type { Track } from '@/daw/store/tracksSlice';
import { resolveTrackRole } from '@/daw/utils/trackRole';
import {
  buildScoreParts,
  isDrumTrack,
  isNotatable,
  type ScoreBuildOptions,
  type ScoreTrackPart,
} from '../Score/scoreParts';
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

// ── Which tracks are the melody ────────────────────────────────────────────
// The sheet writes the tracks assigned to it (leadSheetMelodyTrackIds), a
// staff each, stacked in track order. With none assigned it picks one
// itself — Auto — and the toolbar's picker says which, and why.

/**
 * How several melody tracks share the sheet. 'stacked': a staff per track,
 * top to bottom in track order, each named at the left of its system (when
 * there are two or more), the chord symbols over the top one only. Putting
 * every track on one staff would be a second layout, with its own entry in
 * MELODY_PARTS building one part from all of them. The Score editor finds a
 * note's track from the note's own id, so editing notes would carry on as it
 * is; only a paste into bare bars, which writes to the part's track, would
 * need the merged part to say which track that is.
 */
export type MelodyStaffLayout = 'stacked';
export const MELODY_STAFF_LAYOUT: MelodyStaffLayout = 'stacked';

/**
 * A track the melody can be read from: a pitched MIDI instrument. A kit's
 * notes name drums, not pitches, and audio has no notes to write.
 */
export function isMelodyCandidate(track: Track): boolean {
  return isNotatable(track) && !isDrumTrack(track);
}

/** The tracks the picker offers, in track order. */
export function melodyCandidates(tracks: readonly Track[]): Track[] {
  return tracks.filter(isMelodyCandidate);
}

/**
 * Auto, for a sheet with nothing assigned: the first track whose role says
 * melody (set in its track header, or guessed from its name), else the first
 * one with clips. Only tracks with clips count, so Auto never lands on an
 * empty track; kits and audio never count.
 */
export function autoMelodyTrack(tracks: readonly Track[]): Track | null {
  const withClips = melodyCandidates(tracks).filter(
    (track) => track.midiClips.length > 0,
  );
  return (
    withClips.find((track) => resolveTrackRole(track) === 'melody') ??
    withClips[0] ??
    null
  );
}

export interface MelodyPick {
  /** The tracks the sheet writes, a staff each, top first: track order. */
  tracks: Track[];
  /** Nothing usable is assigned, so the sheet picked (`tracks` holds it). */
  auto: boolean;
}

/**
 * The tracks the melody is read from: the assigned ones that still exist and
 * can carry a melody, in track order, notes or not (a staff of rests says
 * the track is there and empty); else Auto's pick, when there is one. An id
 * whose track was deleted, or became a kit, is passed over: when none is
 * left the sheet goes back to Auto.
 */
export function pickMelodyTracks(
  tracks: readonly Track[],
  assignedIds: readonly string[],
): MelodyPick {
  const assigned = new Set(assignedIds);
  const picked = melodyCandidates(tracks).filter((track) =>
    assigned.has(track.id),
  );
  if (picked.length > 0) return { tracks: picked, auto: false };
  const auto = autoMelodyTrack(tracks);
  return { tracks: auto ? [auto] : [], auto: true };
}

/** Whether a track has any note to write. */
export const hasMelodyNotes = (track: Track): boolean =>
  track.midiClips.some((clip) => clip.events.length > 0);

type MelodyPartOptions = Omit<ScoreBuildOptions, 'tracks' | 'keepEmpty'>;

/** How each layout turns the melody tracks into the parts it draws. */
const MELODY_PARTS: Record<
  MelodyStaffLayout,
  (tracks: Track[], options: MelodyPartOptions) => ScoreTrackPart[]
> = {
  // Each track is a part, and one with no notes keeps its staff, rests all
  // through, so a track that was ticked always shows.
  stacked: (tracks, options) =>
    buildScoreParts({ ...options, tracks, keepEmpty: true }),
};

/** The parts the sheet draws for its melody tracks, top first. */
export function melodyScoreParts(
  tracks: Track[],
  options: MelodyPartOptions,
  layout: MelodyStaffLayout = MELODY_STAFF_LAYOUT,
): ScoreTrackPart[] {
  return MELODY_PARTS[layout](tracks, options);
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
        id: noteKey(track.id, clip.id, event.startTick, event.note),
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
