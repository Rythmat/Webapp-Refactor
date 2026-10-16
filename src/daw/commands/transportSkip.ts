import { projectEndTick } from '@/daw/audio/renderProject';
import { getPlayheadTick } from '@/daw/engine/playheadClock';
import { seekTo } from '@/daw/hooks/useTransport';
import { useStore } from '@/daw/store';

// ── Back and Forward (milestones 2.5, 2.7) ─────────────────────────────────
//
// Home goes back to the marker before the playhead (or the start), End on
// to the marker after it (or the end of the song). They were the top bar's
// Back and Forward buttons until the bar was trimmed; a click on the ruler
// goes anywhere. Both read from the live playhead, since the store's
// position is parked while playing, and read the song when pressed rather
// than subscribing to it (shell-17).

/** The marker before `pos`, or the start: where Back goes. */
export function backTargetTick(pos: number): number {
  const sorted = [...useStore.getState().markers].sort(
    (a, b) => a.tick - b.tick,
  );
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].tick < pos) return sorted[i].tick;
  }
  return 0;
}

/**
 * The marker after `pos`, else the end of the content (audio clips
 * included), else null: where Forward goes.
 */
export function forwardTargetTick(pos: number): number | null {
  const state = useStore.getState();
  const sorted = [...state.markers].sort((a, b) => a.tick - b.tick);
  for (const m of sorted) {
    if (m.tick > pos) return m.tick;
  }
  const lastTick = projectEndTick(state);
  return lastTick > pos ? lastTick : null;
}

export function skipBack(): void {
  seekTo(backTargetTick(getPlayheadTick()));
}

export function skipForward(): void {
  const target = forwardTargetTick(getPlayheadTick());
  if (target !== null) seekTo(target);
}
