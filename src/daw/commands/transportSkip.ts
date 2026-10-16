import { projectEndTick } from '@/daw/audio/renderProject';
import { getPlayheadTick } from '@/daw/engine/playheadClock';
import { seekTo } from '@/daw/hooks/useTransport';
import { useStore } from '@/daw/store';
import {
  barStartTick,
  ticksPerBar,
  ticksPerBeat,
  timeSignatureOf,
  type TimeSignature,
} from '@/daw/time/timeModel';

// ── Moving the playhead (milestones 2.5, 2.7, 2.8) ─────────────────────────
//
// Home goes back to the marker before the playhead (or the start), End on
// to the marker after it (or the end of the song). They were the top bar's
// Back and Forward buttons until the bar was trimmed; a click on the ruler
// goes anywhere. The bottom rail's Go to start, Rewind and Fast-forward
// (2.8, after Soundtrap's) go to bar 1 and one bar back or on. All of them
// read from the live playhead, since the store's position is parked while
// playing, and read the song when pressed rather than subscribing to it
// (shell-17).

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

/**
 * Where Rewind goes from `pos`: the start of its bar, or of the bar before
 * when `pos` is within half a beat of its bar's start. So a press while
 * playing goes back a whole bar, never to just behind the playhead.
 */
export function rewindTargetTick(pos: number, ts: TimeSignature): number {
  const start = barStartTick(pos, ts);
  if (pos - start > ticksPerBeat(ts) / 2) return start;
  return Math.max(0, start - ticksPerBar(ts));
}

/** Where Fast-forward goes from `pos`: the start of the next bar. */
export function fastForwardTargetTick(pos: number, ts: TimeSignature): number {
  return barStartTick(pos, ts) + ticksPerBar(ts);
}

export function goToStart(): void {
  seekTo(0);
}

export function rewindBar(): void {
  const ts = timeSignatureOf(useStore.getState());
  seekTo(rewindTargetTick(getPlayheadTick(), ts));
}

export function fastForwardBar(): void {
  const ts = timeSignatureOf(useStore.getState());
  seekTo(fastForwardTargetTick(getPlayheadTick(), ts));
}
