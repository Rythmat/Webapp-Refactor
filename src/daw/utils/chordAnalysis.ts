import {
  deriveChordRegionsFromNotes,
  deriveChordRegionsFromSession,
  refineChordRegionsWithMelody,
  type ChordRegion,
} from '@/daw/store/prismSlice';
import type { Track } from '@/daw/store/tracksSlice';
import { guessTrackRole, type DawTrackRole } from '@/daw/utils/trackRole';
import type { MelodyAnalysis } from '@/unison/types/schema';
import { detectKey } from '@/unison/engine/keyDetector';

// ── Chord symbols from the music ───────────────────────────────────────────
// Analysis only proposes chord symbols; the chord lane takes them when the
// user chooses "Use Chord Symbols", so it always holds chords they accepted.
// A proposal remembers the notes it read (harmonyNotesKey), so Insight can
// tell when they've changed and offer to re-analyze.

export interface ChordAnalysis {
  regions: ChordRegion[];
  /** The key the chords were read in (0–11 root + mode id). */
  rootNote: number;
  mode: string;
  /** The project had no key, so it was detected from the notes. */
  keyDetected: boolean;
  /** The tracks analyzed; null for every track, by role. */
  trackIds: string[] | null;
  /** harmonyNotesKey of those tracks when analyzed; null for audio. */
  notesKey: string | null;
  source: 'notes' | 'audio';
}

/** A track's role, with 'auto' resolved from its name and instrument. */
export const trackRole = (
  track: Pick<Track, 'trackRole' | 'name' | 'instrument'>,
): DawTrackRole =>
  track.trackRole === 'auto'
    ? guessTrackRole(track.name, track.instrument)
    : track.trackRole;

// Roles whose notes make up the chords: harmony, voiced over the bass.
const CHORD_ROLES = new Set<DawTrackRole>(['chords', 'auto', 'bass']);

const hasNotes = (track: Track) =>
  track.midiClips.some((c) => c.events.length > 0);

/** Whether any track plays chords that analysis could read. */
export const hasHarmonyNotes = (tracks: readonly Track[]) =>
  tracks.some(
    (t) =>
      t.type === 'midi' &&
      hasNotes(t) &&
      ['chords', 'auto'].includes(trackRole(t)),
  );

/**
 * Identifies the notes an analysis of these tracks reads — the chord and bass
 * tracks' roles and notes on the song timeline. It changes when one of those
 * notes, their clip positions or a track's role changes; not for melody,
 * drums, or mixer and effect edits.
 */
export function harmonyNotesKey(
  tracks: readonly Track[],
  trackIds: readonly string[] | null = null,
): string {
  let hash = 0x811c9dc5; // FNV-1a
  const mix = (n: number) => {
    hash ^= n;
    hash = Math.imul(hash, 0x01000193);
  };
  for (const track of tracks) {
    if (track.type !== 'midi' || (trackIds && !trackIds.includes(track.id)))
      continue;
    const role = trackRole(track);
    if (!CHORD_ROLES.has(role)) continue;
    for (const ch of `${track.id}:${role}`) mix(ch.charCodeAt(0));
    for (const clip of track.midiClips) {
      for (const e of clip.events) {
        mix(e.note);
        mix(clip.startTick + e.startTick);
        mix(e.durationTicks);
      }
    }
  }
  return (hash >>> 0).toString(36);
}

/** The track with all its notes in one clip, on song-timeline ticks. */
const withTimelineNotes = (track: Track): Track => ({
  ...track,
  midiClips: [
    {
      id: `${track.id}-notes`,
      startTick: 0,
      events: track.midiClips
        .flatMap((clip) =>
          clip.events.map((e) => ({
            ...e,
            startTick: clip.startTick + e.startTick,
          })),
        )
        .sort((a, b) => a.startTick - b.startTick),
    },
  ],
});

/**
 * Chord symbols for the music in these tracks (null: every track), read the
 * way the chord lane is derived — harmony tracks voiced over the bass, melody
 * and drums left out — in the project key, or the key the notes suggest when
 * it has none. A melody UNISON identified is kept out of the chords. When the
 * chosen tracks hold no harmony-role notes, chords are read from all of them.
 */
export function analyzeChordSymbols(
  tracks: readonly Track[],
  {
    rootNote,
    mode,
    trackIds = null,
    melody = null,
  }: {
    rootNote: number | null;
    mode: string;
    trackIds?: string[] | null;
    melody?: Pick<MelodyAnalysis, 'trackId' | 'pitchRange'> | null;
  },
): ChordAnalysis {
  const chosen = tracks
    .filter((t) => t.type === 'midi' && (!trackIds || trackIds.includes(t.id)))
    .map(withTimelineNotes);
  const pitched = chosen
    .filter((t) => trackRole(t) !== 'drums')
    .flatMap((t) => t.midiClips[0].events);

  const keyDetected = rootNote === null && pitched.length > 0;
  const key = keyDetected
    ? detectKey(pitched)
    : { rootPc: rootNote ?? 0, mode };
  const rootMidi = key.rootPc + 48;

  let regions = deriveChordRegionsFromSession(chosen, rootMidi, key.mode);
  if (melody && chosen.some((t) => t.id === melody.trackId)) {
    const refined = refineChordRegionsWithMelody(
      chosen,
      rootMidi,
      key.mode,
      melody.trackId,
      melody.pitchRange,
    );
    if (refined.length > 0) regions = refined;
  }
  if (regions.length === 0 && pitched.length > 0) {
    regions = deriveChordRegionsFromNotes(pitched, rootMidi, key.mode);
  }

  return {
    regions,
    rootNote: key.rootPc,
    mode: key.mode,
    keyDetected,
    trackIds,
    notesKey: harmonyNotesKey(tracks, trackIds),
    source: 'notes',
  };
}

/** A proposal of the chord symbols heard in an audio recording. */
export const audioChordAnalysis = (
  regions: ChordRegion[],
  rootNote: number,
  mode: string,
): ChordAnalysis => ({
  regions,
  rootNote,
  mode,
  keyDetected: false,
  trackIds: null,
  notesKey: null,
  source: 'audio',
});

/** Whether two sets of chord symbols name the same chords at the same times. */
export const sameChordSymbols = (
  a: readonly ChordRegion[],
  b: readonly ChordRegion[],
) =>
  a.length === b.length &&
  a.every(
    (r, i) =>
      r.startTick === b[i].startTick &&
      r.endTick === b[i].endTick &&
      r.noteName === b[i].noteName,
  );
