import type { InstrumentType, Track } from '@/daw/store/tracksSlice';
import {
  TRACK_FIELDS,
  trackFieldDefault,
  type TrackDefaultContext,
} from './fields';

// ── A new track's defaults ─────────────────────────────────────────────────
//
// What a new track starts with, taken from the registry (TRACK_FIELDS), so
// addTrack and loadProjectTemplate need no track literals of their own.
//
// This module is for the store's own slices, so it must never load the
// store. The store's index creates every slice as it loads: if a module
// tracksSlice imports pulled the index in, a page that reached a slice before
// the index (the practice-track and UNISON modules import prismSlice helpers
// first) would run the index before tracksSlice had finished loading, and the
// store would fail to build with 'createTracksSlice is not a function'. So
// values come only from ./fields, which stays clear of the store too, and
// types from the slices. trackDefaults.test.ts loads this module with the
// store's index and its slices replaced by modules that throw.

/** The fields a new track's defaults fill in: all but its id. */
const NEW_TRACK_KEYS = (Object.keys(TRACK_FIELDS) as (keyof Track)[]).filter(
  (key) => key !== 'id',
);

/**
 * A new track of `instrument` named `name`, all but its id: the one place
 * new-track defaults live (the registry's TRACK_FIELDS). A drum machine starts
 * with its compressor on, a live guitar, bass or vocal track is an audio
 * track on the first input channel, and the role is guessed from the name and
 * the instrument. The optional fields a new track has none of are left out
 * rather than set to undefined, so the track holds the same keys, in the same
 * order, as one made before.
 *
 * Two fields depend on more than the instrument and the name, so callers set
 * their own: `color` (the next palette colour, the key colour while a key is
 * set, a template's colour, a collaborator's) and, when the caller knows it,
 * `type` (an imported audio file makes an audio track whose instrument is
 * 'none'). The default type follows the instrument.
 *
 * For new tracks only. A decoder filling in a field that an older save or an
 * older peer left out takes trackFieldDefault(key) with no context instead:
 * the new-track rules would switch an old drum machine's compressor on and
 * fix a guessed role where 'auto' follows the track's name (see
 * TrackFieldSpec in ./fields).
 */
export function initialTrackDefaults(
  instrument: InstrumentType,
  name: string,
): Omit<Track, 'id'> {
  const ctx: TrackDefaultContext = { instrument, name };
  return Object.fromEntries(
    NEW_TRACK_KEYS.map(
      (key) => [key, trackFieldDefault(key, ctx)] as const,
    ).filter(([, value]) => value !== undefined),
  ) as Omit<Track, 'id'>;
}
