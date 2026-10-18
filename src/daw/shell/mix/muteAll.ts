import { useStore } from '@/daw/store';
import { withTransaction } from '@/daw/store/history';

// ── Mute All (milestone 2.10) ──────────────────────────────────────────────
//
// The master column's Mute All is a real toggle (design-system-15). It shows
// pressed while every track is muted. Pressing it mutes every track that is
// playing and remembers which ones it muted (muteAllSet, session UI state);
// pressing it again unmutes exactly those that are still muted, so a track
// the student had muted before stays muted. With nothing of its own left
// (a reload, every track muted by hand, or its tracks deleted) it unmutes
// them all.
//
// Mute is each person's own (fields.ts: not shared, not undone), so the
// press is wrapped in one transaction for its label, but undo has nothing
// of it to record; the button itself is the way back.

/** Whether Mute All shows pressed: there are tracks and all are muted. */
export function allMuted(tracks: readonly { mute: boolean }[]): boolean {
  return tracks.length > 0 && tracks.every((t) => t.mute);
}

/** Presses Mute All: mutes every playing track, or unmutes the ones it muted. */
export function toggleMuteAll(): void {
  const s = useStore.getState();
  const { tracks } = s;
  if (tracks.length === 0) return;

  if (!allMuted(tracks)) {
    const muting = tracks.filter((t) => !t.mute).map((t) => t.id);
    // Tracks an earlier press muted and that are still muted stay
    // remembered: one unmuted by hand and muted again here joins them.
    const kept = (s.muteAllSet ?? []).filter((id) =>
      tracks.some((t) => t.id === id && t.mute),
    );
    withTransaction('Mute all', () =>
      setMutes(new Set(muting), true, [...kept, ...muting]),
    );
    return;
  }

  const remembered = s.muteAllSet ?? [];
  const mine = tracks.filter((t) => remembered.includes(t.id)).map((t) => t.id);
  // Nothing of its own left to unmute (the tracks it muted were deleted):
  // the press still does what it says.
  const unmuting = mine.length > 0 ? mine : tracks.map((t) => t.id);
  withTransaction('Unmute all', () => setMutes(new Set(unmuting), false, null));
}

/**
 * Sets `ids`' mute to `mute` and Mute All's memory in one store write, so
 * the engine, autosave and the room see the press once, not once a track.
 */
function setMutes(
  ids: ReadonlySet<string>,
  mute: boolean,
  remembered: string[] | null,
): void {
  useStore.setState((state) => ({
    tracks: state.tracks.map((t) =>
      ids.has(t.id) && t.mute !== mute ? { ...t, mute } : t,
    ),
    muteAllSet: remembered,
  }));
}
