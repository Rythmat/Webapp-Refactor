import type { GrooveItem } from '@/daw/data/groovesLibrary';
import { getPlayheadTick } from '@/daw/engine/playheadClock';
import { loadGrooveEvents } from '@/daw/midi/loadGrooveEvents';
import { useStore } from '@/daw/store';
import { withTransaction } from '@/daw/store/history';
import { barStartTick, timeSignatureOf } from '@/daw/time/timeModel';

// ── A groove added to the timeline ─────────────────────────────────────────
//
// The Grooves tab's Add and the drum dock menu's (owner, 2026-10-22: listen
// first, then add): one new clip at the bar the playhead is in (live, also
// while playing), named for the groove and selected, so the drum grid shows
// it, as one undo step. It used to land on bar 1 on top of the beat already
// there, while the grid kept showing the old pattern (dock-instruments-03).

/** Adds `groove` to the track; its clip's id, or null when it can't. */
export async function addGrooveClip(
  trackId: string,
  groove: GrooveItem,
): Promise<string | null> {
  // loadGrooveEvents logs a groove it can't fetch or parse; that adds
  // nothing.
  const events = await loadGrooveEvents(groove.id);
  if (!events) return null;
  const s = useStore.getState();
  if (!s.tracks.some((t) => t.id === trackId)) return null;
  const id = `clip-groove-${crypto.randomUUID().slice(0, 8)}`;
  withTransaction(`Add ${groove.name}`, () => {
    useStore.getState().addMidiClip(trackId, {
      id,
      name: groove.name,
      startTick: barStartTick(
        Math.round(getPlayheadTick()),
        timeSignatureOf(s),
      ),
      events,
    });
    useStore.getState().setSelectedClip(id, trackId);
  });
  return id;
}

/** The groove a clip is, by its name, if it is one. */
export function grooveInPattern(
  clipName: string | undefined,
  grooves: readonly GrooveItem[],
): string | null {
  if (!clipName) return null;
  return grooves.find((g) => g.name === clipName)?.id ?? null;
}
