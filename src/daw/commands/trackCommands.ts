import {
  instrumentSettings,
  nameFollowsInstrument,
  simpleInstrument,
  trackSoundString,
} from '@/daw/instruments/simpleInstruments';
import { useStore } from '@/daw/store';
import { withTransaction } from '@/daw/store/history';

// ── Track commands: the instrument, a new instrument track ─────────────────
//
// What the simple instrument picker does, as commands so the track menu, the
// dock, the Add-track picker, lessons and tests share them. Each is one undo
// step with its own label, as the clip commands are. (Duplicate track is
// shell/tracklist/duplicateTrack.ts.)

/**
 * Puts the catalog instrument `instrumentId` (simpleInstruments.ts) on MIDI
 * track `trackId`. The track keeps its clips and notes, its mixer and
 * effects, and its name, unless the name only said what it played ('Bass',
 * 'Synth'), in which case it takes the new instrument's. The engine follows
 * the store: a new instrument type builds a new one, a new General MIDI
 * program or kit loads into the one there. One undo step. Returns whether
 * anything changed: not for an audio track, an unknown instrument, or the
 * one the track already plays.
 */
export function setTrackInstrument(
  trackId: string,
  instrumentId: string,
): boolean {
  const state = useStore.getState();
  const track = state.tracks.find((t) => t.id === trackId);
  const item = simpleInstrument(instrumentId);
  if (!track || !item || track.type !== 'midi') return false;
  if (trackSoundString(track) === item.sound) return false;
  const { settings, drumKit } = instrumentSettings(item);
  const rename = nameFollowsInstrument(track);
  withTransaction('Change instrument', () => {
    const s = useStore.getState();
    s.updateTrack(trackId, {
      ...settings,
      ...(rename ? { name: item.label } : {}),
    });
    if (drumKit) s.setDrumKit(trackId, drumKit);
  });
  return true;
}

/**
 * Adds a MIDI track playing the catalog instrument `instrumentId`, named
 * after it, and selects it: the simple picker's way to add a track. One undo
 * step. Returns its id, or `''` when the instrument is unknown or a track
 * limit is reached (addTrack says so).
 */
export function addInstrumentTrack(instrumentId: string): string {
  const item = simpleInstrument(instrumentId);
  if (!item) return '';
  const { settings, drumKit } = instrumentSettings(item);
  const instrument = settings.instrument ?? 'soundfont';
  return withTransaction('Add track', () => {
    const s = useStore.getState();
    const id = s.addTrack('midi', instrument, item.label);
    if (!id) return '';
    s.updateTrack(id, settings);
    if (drumKit) s.setDrumKit(id, drumKit);
    s.setSelectedTrackId(id);
    return id;
  });
}
