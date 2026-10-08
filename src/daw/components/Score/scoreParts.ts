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
  /**
   * Keep parts here between builds and rebuild only the tracks that changed
   * (see ScorePartsCache). Without it every build starts from scratch.
   */
  cache?: ScorePartsCache;
}

/** One track's notes, as the notation reads them. */
function trackNotes(
  track: Track,
  drums: boolean,
  { rootNote, mode, slashNotes, spellings }: ScoreBuildOptions,
): NotationNoteInput[] {
  return track.midiClips.flatMap((clip) =>
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
  ) as NotationNoteInput[];
}

/**
 * Where a track's last note ends. A drum hit counts by its onset — its
 * recorded length never reaches the drum staff — so a closing hi-hat with a
 * long tail can't add an empty bar to every part.
 */
function trackEnd(notes: NotationNoteInput[], drums: boolean): number {
  let end = 0;
  for (const n of notes) {
    end = Math.max(end, n.startTick + (drums ? 1 : n.durationTicks));
  }
  return end;
}

/** The key signature every pitched part shares, in fifths. */
function keyFifthsOf(rootNote: number | null, mode: string) {
  const tonic =
    rootNote === null
      ? null
      : parseNoteName(noteNameInKey(rootNote, rootNote, mode));
  return tonic
    ? keyFifthsForTonic(tonic.letterIndex, tonic.accidental, mode)
    : undefined;
}

/** One part's notation, `measures` bars long. */
function partScore(
  notes: NotationNoteInput[],
  drums: boolean,
  timeSignature: [number, number],
  measures: number,
  keyFifths: number | undefined,
): NotationScore {
  return buildScore(notes, {
    ticksPerQuarter: TICKS_PER_QUARTER,
    timeSignature,
    minMeasures: measures,
    staves: drums ? 'percussion' : chooseStaves(notes.map((n) => n.midi)),
    ...(keyFifths !== undefined && !drums ? { keyFifths } : {}),
  });
}

/** The bar count every part shares: the song's, or the sheet's if longer. */
function sharedMeasures(
  songEnd: number,
  [numerator, denominator]: [number, number],
  minMeasures = MIN_MEASURES,
): number {
  const ticksPerBar = ((TICKS_PER_QUARTER * 4) / denominator) * numerator;
  return Math.max(minMeasures, Math.ceil(songEnd / ticksPerBar));
}

/**
 * A part per notatable track holding notes, plus the bar count they share.
 * Tracks with no notes are left out.
 */
export function buildScoreParts(options: ScoreBuildOptions): ScoreTrackPart[] {
  if (options.cache) return options.cache.build(options);
  const { tracks, rootNote, mode, timeSignature, minMeasures } = options;

  const perTrack = tracks.filter(isNotatable).map((track) => {
    const drums = isDrumTrack(track);
    return { track, drums, notes: trackNotes(track, drums, options) };
  });

  // Every part shares the song's bar count.
  const songEnd = Math.max(
    0,
    ...perTrack.map(({ drums, notes }) => trackEnd(notes, drums)),
  );
  const measures = sharedMeasures(songEnd, timeSignature, minMeasures);
  const keyFifths = keyFifthsOf(rootNote, mode);

  return perTrack
    .filter(({ notes }) => notes.length > 0)
    .map(({ track, drums, notes }) => ({
      id: track.id,
      name: track.name,
      color: track.color,
      noteCount: notes.length,
      score: partScore(notes, drums, timeSignature, measures, keyFifths),
    }));
}

/** A track's own slash notes and pinned spellings, as one string. */
function trackMarks(
  trackId: string,
  { slashNotes, spellings }: ScoreBuildOptions,
): string {
  const prefix = `${trackId}:`;
  const marks: string[] = [];
  for (const id of slashNotes ?? []) {
    if (id.startsWith(prefix)) marks.push(`/${id}`);
  }
  for (const [id, name] of spellings ?? []) {
    if (id.startsWith(prefix)) marks.push(`${id}=${name}`);
  }
  return marks.sort().join('\n');
}

interface CachedTrack {
  midiClips: Track['midiClips'];
  /** Everything else the notes were built from. */
  notesKey: string;
  notes: NotationNoteInput[];
  end: number;
  /** The metre, bar count and key the score was built for. */
  scoreKey?: string;
  score?: NotationScore;
  part?: ScoreTrackPart;
}

/**
 * Keeps each track's part between builds, so a Score edit rebuilds only the
 * tracks it touched instead of every part (finding score-06). A part is
 * reused while its track's midiClips array is the same object and nothing
 * else it reads has changed: whether it is a kit, the key, mode and metre,
 * the bar count every part shares, and the track's own slash notes and
 * pinned spellings. That holds because the store replaces a track's clip
 * array whenever a clip changes; it never edits one in place.
 *
 * An unchanged part keeps its score object, whose bars an incremental
 * StaffView recognises, and a build where nothing changed returns the
 * previous array itself.
 */
export class ScorePartsCache {
  private tracks = new Map<string, CachedTrack>();
  private last: ScoreTrackPart[] | null = null;

  /** buildScoreParts, rebuilding only what changed since the last build. */
  build(options: ScoreBuildOptions): ScoreTrackPart[] {
    const { tracks, rootNote, mode, timeSignature, minMeasures } = options;

    const present = new Set<string>();
    const perTrack = tracks.filter(isNotatable).map((track) => {
      present.add(track.id);
      const drums = isDrumTrack(track);
      const notesKey = JSON.stringify([
        drums,
        rootNote,
        mode,
        trackMarks(track.id, options),
      ]);
      let cached = this.tracks.get(track.id);
      if (
        !cached ||
        cached.midiClips !== track.midiClips ||
        cached.notesKey !== notesKey
      ) {
        const notes = trackNotes(track, drums, options);
        cached = {
          midiClips: track.midiClips,
          notesKey,
          notes,
          end: trackEnd(notes, drums),
        };
        this.tracks.set(track.id, cached);
      }
      return { track, drums, cached };
    });
    for (const id of [...this.tracks.keys()]) {
      if (!present.has(id)) this.tracks.delete(id);
    }

    const songEnd = Math.max(0, ...perTrack.map(({ cached }) => cached.end));
    const measures = sharedMeasures(songEnd, timeSignature, minMeasures);
    const keyFifths = keyFifthsOf(rootNote, mode);
    const scoreKey = JSON.stringify([timeSignature, measures, keyFifths]);

    const parts = perTrack
      .filter(({ cached }) => cached.notes.length > 0)
      .map(({ track, drums, cached }) => {
        if (!cached.score || cached.scoreKey !== scoreKey) {
          cached.score = partScore(
            cached.notes,
            drums,
            timeSignature,
            measures,
            keyFifths,
          );
          cached.scoreKey = scoreKey;
        }
        const kept = cached.part;
        if (
          kept?.score === cached.score &&
          kept.name === track.name &&
          kept.color === track.color
        ) {
          return kept;
        }
        cached.part = {
          id: track.id,
          name: track.name,
          color: track.color,
          noteCount: cached.notes.length,
          score: cached.score,
        };
        return cached.part;
      });

    const last = this.last;
    if (
      last?.length === parts.length &&
      parts.every((part, i) => part === last[i])
    ) {
      return last;
    }
    this.last = parts;
    return parts;
  }
}
