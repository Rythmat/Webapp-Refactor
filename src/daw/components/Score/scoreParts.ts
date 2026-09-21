import { midiNameInKey, noteNameInKey } from '@prism/engine';
import { parseNoteName } from '@/curriculum/engine/genreGeneration/enharmonicEngine';
import type { Track } from '@/daw/store/tracksSlice';
import { guessTrackRole } from '@/daw/utils/trackRole';
import {
  buildScore,
  keyFifthsForTonic,
  type NotationNoteInput,
  type NotationScore,
} from '@/lib/notation';

// ── Studio tracks → score parts ────────────────────────────────────────────
// One part per MIDI track, all sharing the song's bars so every staff lines up.
// Each track picks its own clef from the register it actually plays in.

export const TICKS_PER_QUARTER = 480;
const MIN_MEASURES = 4;
/** Wider than this, crossing middle C, needs both clefs. */
const GRAND_STAFF_SPAN = 20;
/** Below this average pitch a single-staff part reads better in bass clef. */
const BASS_CLEF_MEAN = 58;

export interface ScoreTrackPart {
  id: string;
  name: string;
  color: string;
  score: NotationScore;
  noteCount: number;
}

/** Audio has no notes to write; every MIDI track does. */
export function isNotatable(track: Track): boolean {
  return track.type === 'midi';
}

/**
 * A kit, by its instrument or by the role the track was given — an imported
 * MIDI drum part has no drum-machine instrument but is still a kit.
 */
export function isDrumTrack(track: Track): boolean {
  if (track.instrument === 'drum-machine') return true;
  const role =
    track.trackRole === 'auto' || track.trackRole === undefined
      ? guessTrackRole(track.name, track.instrument)
      : track.trackRole;
  return role === 'drums';
}

function chooseStaves(midis: number[]): 'grand' | 'treble' | 'bass' {
  const low = Math.min(...midis);
  const high = Math.max(...midis);
  const mean = midis.reduce((a, b) => a + b, 0) / midis.length;
  if (high - low > GRAND_STAFF_SPAN && low < 60) return 'grand';
  return mean < BASS_CLEF_MEAN ? 'bass' : 'treble';
}

export interface ScoreBuildOptions {
  tracks: Track[];
  /** Note ids the user has switched to rhythmic slash notation. */
  slashNotes?: ReadonlySet<string>;
  /**
   * Spellings pinned by writing an accidental, by note id. These win over the
   * key's own spelling so a note sharpened by hand is written with a sharp.
   */
  spellings?: ReadonlyMap<string, string>;
  rootNote: number | null;
  mode: string;
  timeSignature: [number, number];
  /** At least this many bars, whatever the notes need — the sheet's length. */
  minMeasures?: number;
}

/**
 * A part per notatable track holding notes, plus the bar count they share.
 * Tracks with no notes are left out.
 */
export function buildScoreParts({
  tracks,
  rootNote,
  mode,
  timeSignature,
  slashNotes,
  spellings,
  minMeasures,
}: ScoreBuildOptions): ScoreTrackPart[] {
  const [numerator, denominator] = timeSignature;
  const ticksPerBar = ((TICKS_PER_QUARTER * 4) / denominator) * numerator;

  const perTrack = tracks.filter(isNotatable).map((track) => {
    const drums = isDrumTrack(track);
    return {
      track,
      drums,
      notes: track.midiClips.flatMap((clip) =>
        clip.events.map((event) => ({
          id: `${track.id}:${clip.id}:${event.startTick}:${event.note}`,
          ...(slashNotes?.has(
            `${track.id}:${clip.id}:${event.startTick}:${event.note}`,
          )
            ? { slash: true }
            : {}),
          midi: event.note,
          startTick: clip.startTick + event.startTick,
          durationTicks: event.durationTicks,
          // A drum note names an instrument, not a pitch — it is not spelled.
          // A spelling the user pinned with an accidental wins over the key's.
          ...(drums
            ? {}
            : (() => {
                const noteId = `${track.id}:${clip.id}:${event.startTick}:${event.note}`;
                const pinned = spellings?.get(noteId);
                if (pinned) return { name: pinned };
                return rootNote !== null
                  ? { name: midiNameInKey(event.note, rootNote, mode) }
                  : {};
              })()),
        })),
      ) as NotationNoteInput[],
    };
  });

  // Every part shares the song's bar count. A drum hit counts by its onset —
  // its recorded length never reaches the drum staff — so a closing hi-hat
  // with a long tail can't add an empty bar to every part.
  const songEnd = Math.max(
    0,
    ...perTrack.flatMap(({ drums, notes }) =>
      notes.map((n) => n.startTick + (drums ? 1 : n.durationTicks)),
    ),
  );
  const measures = Math.max(
    minMeasures ?? MIN_MEASURES,
    Math.ceil(songEnd / ticksPerBar),
  );

  const tonic =
    rootNote === null
      ? null
      : parseNoteName(noteNameInKey(rootNote, rootNote, mode));
  const keyFifths = tonic
    ? keyFifthsForTonic(tonic.letterIndex, tonic.accidental, mode)
    : undefined;

  return perTrack
    .filter(({ notes }) => notes.length > 0)
    .map(({ track, drums, notes }) => ({
      id: track.id,
      name: track.name,
      color: track.color,
      noteCount: notes.length,
      score: buildScore(notes, {
        ticksPerQuarter: TICKS_PER_QUARTER,
        timeSignature,
        minMeasures: measures,
        staves: drums ? 'percussion' : chooseStaves(notes.map((n) => n.midi)),
        ...(keyFifths !== undefined && !drums ? { keyFifths } : {}),
      }),
    }));
}
