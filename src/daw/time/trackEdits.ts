// ── Duplicating a track (milestone 2.15) ───────────────────────────────────
// The track menu's Duplicate track, its key in the track list and the
// palette's command: a copy of the whole track, put in right after it. The
// copy holds everything the document keeps about the track, read from the
// track registry (TRACK_FIELDS), so a field added there later is copied
// without anyone remembering to. What each person keeps for themself (armed,
// monitoring, inputs) and what no save keeps start as on a new track.
//
// Every clip, every note and a Chops sample get an id of their own, and the
// Score's marks on the notes (articulations, slurs, spellings, slash notes)
// are copied onto the copy's notes. What points at the source by id stays on the source: the
// Score's chord parts, chords read from its clips, the lead sheet's melody.
//
// Pure: the caller writes the patch in one store write, as one undo step,
// then lets each new audio clip, and the sample, play its source's audio
// (sharedAudio, sampleAudio) and copies the Oracle synth patch, which lives
// outside the store.

import {
  TRACK_DOC_FIELDS,
  TRACK_FIELDS,
  trackFieldDefault,
  type TrackDefaultContext,
} from '@/daw/persistence/projectDocument/fields';
import { samplerBufferKey } from '@/daw/instruments/samplerChops';
import { noteKey } from '@/daw/model/noteKeys';
import type { AudioClip, MidiClip, Track } from '@/daw/store/tracksSlice';
import {
  copyNoteMarks,
  marksPatch,
  noteMarksOf,
  type ArrangementEdit,
  type ArrangementState,
} from './arrangementEdits';

/**
 * A new id of each kind Duplicate needs ('sample': a Chops sample's
 * sampleId). A section edit's Mint (which has no track or sample ids) can't
 * stand in for it, but this one can stand in for a Mint's clip and note ids.
 */
export type TrackMint = (kind: 'track' | 'clip' | 'note' | 'sample') => string;

/** What duplicateTrackEdit makes. */
export interface TrackDuplicate {
  edit: ArrangementEdit;
  newTrackId: string;
  /**
   * The Chops sample's audio, by AudioBufferStore key (samplerBufferKey):
   * the copy's sample has an id of its own, so loading another sample on
   * one track, which lets go of the old sample's key, never silences the
   * other. Null when the track has no sample.
   */
  sampleAudio: { from: string; to: string } | null;
}

/** The keys the copy gets its own of, rather than the source's. */
const OWN_KEYS: ReadonlySet<keyof Track> = new Set([
  'id',
  'name',
  'midiClips',
  'audioClips',
  'samplerSample',
]);

/** The document's track fields the copy takes from the source as they are. */
const COPIED_KEYS: ReadonlySet<keyof Track> = new Set(
  TRACK_DOC_FIELDS.filter((key) => !OWN_KEYS.has(key)),
);

/** A copy's name: its base, and its number when it has one. */
const COPY_NAME = /^(.*\S) copy(?: (\d+))?$/;

/**
 * The copy's name: "<name> copy", or "<name> copy 2", 3… when a track
 * already has it. A copy of a copy is numbered from the same base:
 * "Bass copy" gives "Bass copy 2", and "Bass copy 2" the next free number,
 * rather than "Bass copy copy".
 */
export function copyName(name: string, tracks: readonly Track[]): string {
  const taken = new Set(tracks.map((t) => t.name));
  const copied = COPY_NAME.exec(name);
  const first = `${copied ? copied[1] : name} copy`;
  if (!copied && !taken.has(first)) return first;
  let n = 2;
  while (taken.has(`${first} ${n}`)) n += 1;
  return `${first} ${n}`;
}

/**
 * A copy of track `trackId`, inserted right after it: its document fields
 * deep-copied, its clips and notes under new ids, the Score's marks on its
 * notes copied to theirs. Null when there is no such track.
 */
export function duplicateTrackEdit(
  state: ArrangementState,
  trackId: string,
  mint: TrackMint,
): TrackDuplicate | null {
  const index = state.tracks.findIndex((t) => t.id === trackId);
  if (index < 0) return null;
  const source = state.tracks[index];
  const newTrackId = mint('track');
  const name = copyName(source.name, state.tracks);
  const ctx: TrackDefaultContext = { instrument: source.instrument, name };

  /** Score keys of copied notes: the note's → its copy's. */
  const copyOfNote = new Map<string, string>();
  const midiClips = source.midiClips.map((clip): MidiClip => {
    const id = mint('clip');
    const events = clip.events.map((e) => {
      copyOfNote.set(
        noteKey(source.id, clip.id, e.startTick, e.note),
        noteKey(newTrackId, id, e.startTick, e.note),
      );
      return { ...structuredClone(e), id: mint('note') };
    });
    // Controller events have no ids: they are copied as they are.
    return { ...structuredClone(clip), id, events };
  });
  const sharedAudio: ArrangementEdit['sharedAudio'] = [];
  const audioClips = source.audioClips.map((clip): AudioClip => {
    const id = mint('clip');
    sharedAudio.push({ from: clip.id, to: id });
    return { ...structuredClone(clip), id };
  });
  // The sample keeps everything but its id: its cloud asset or bundled URL
  // too, so the copy plays (and saves) the same audio.
  const sample = source.samplerSample;
  const samplerSample = sample && {
    ...structuredClone(sample),
    sampleId: mint('sample'),
  };
  const sampleAudio =
    sample && samplerSample
      ? {
          from: samplerBufferKey(sample.sampleId),
          to: samplerBufferKey(samplerSample.sampleId),
        }
      : null;

  // In the registry's order, so the copy holds its keys in the order a new
  // track does. An optional field the source has none of stays absent, as
  // does one whose new-track default is undefined (initialTrackDefaults).
  const copy: Record<string, unknown> = {};
  for (const key of Object.keys(TRACK_FIELDS) as (keyof Track)[]) {
    let value: unknown;
    if (key === 'id') value = newTrackId;
    else if (key === 'name') value = name;
    else if (key === 'midiClips') value = midiClips;
    else if (key === 'audioClips') value = audioClips;
    else if (key === 'samplerSample') value = samplerSample;
    else if (COPIED_KEYS.has(key)) value = structuredClone(source[key]);
    else value = trackFieldDefault(key, ctx);
    if (value !== undefined) copy[key] = value;
  }

  const tracks = [...state.tracks];
  tracks.splice(index + 1, 0, copy as unknown as Track);
  const marks = noteMarksOf(state);
  return {
    edit: {
      patch: {
        tracks,
        ...marksPatch(marks, copyNoteMarks(marks, copyOfNote)),
      },
      sharedAudio,
    },
    newTrackId,
    sampleAudio,
  };
}
