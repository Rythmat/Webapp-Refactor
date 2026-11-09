import * as Tone from 'tone';
import { outputDelayOf } from './heardTime';

// ── Note events ─────────────────────────────────────────────────────────────
//
// What each track's engine plays, by track id, for the views that show it:
// the dock's instrument lights a drum pad or holds a key down as the timeline
// plays it (owner, 2026-10-23). The track reconciler's engines report every
// note-on, note-off and all-notes-off (the timeline's, a live keyboard's, an
// audition's); an offline render's don't. A track id outlives its engine, so
// a view listening keeps hearing a rebuilt one.

/** A note event; `time` is the context time it is scheduled at, or
 *  undefined for one played now. */
export type NoteEvent =
  | { type: 'on'; note: number; velocity: number; time?: number }
  | { type: 'off'; note: number; time?: number }
  | { type: 'allOff'; time?: number };

export type NoteEventListener = (event: NoteEvent) => void;

const listeners = new Map<string, Set<NoteEventListener>>();

export function emitNoteEvent(trackId: string, event: NoteEvent): void {
  const set = listeners.get(trackId);
  if (!set) return;
  for (const listener of set) listener(event);
}

/** Every event as the engine gets it: scheduled ones a look-ahead early. */
export function subscribeNoteEvents(
  trackId: string,
  listener: NoteEventListener,
): () => void {
  let set = listeners.get(trackId);
  if (!set) listeners.set(trackId, (set = new Set()));
  set.add(listener);
  return () => {
    set.delete(listener);
    if (set.size === 0 && listeners.get(trackId) === set) {
      listeners.delete(trackId);
    }
  };
}

/** How long until an event at context time `time` reaches the speakers, in
 *  ms: the transport schedules a look-ahead early, and the device's output
 *  latency comes after. 0 for one played now. */
export function msUntilHeard(time: number | undefined): number {
  if (time === undefined) return 0;
  try {
    const ctx = Tone.getContext().rawContext as AudioContext;
    const wait = time - ctx.currentTime + outputDelayOf(ctx);
    return Math.max(0, wait * 1000);
  } catch {
    return 0;
  }
}

/** At one moment: an all-off, then the note-offs, then the note-ons, so a
 *  loop's seam lets go of the last lap before the next one's first notes. */
const RANK: Record<NoteEvent['type'], number> = { allOff: 0, off: 1, on: 2 };

/**
 * Every event when it's heard, in time order (RANK breaks ties), on animation
 * frames; one played now comes at once. For a view to show what sounds, not
 * what's booked a look-ahead ahead.
 */
export function subscribeHeardNotes(
  trackId: string,
  listener: NoteEventListener,
): () => void {
  type Due = { at: number; rank: number; seq: number; event: NoteEvent };
  const queue: Due[] = [];
  let seq = 0;
  let frame: number | null = null;

  const flush = () => {
    const now = performance.now();
    queue.sort((a, b) => a.at - b.at || a.rank - b.rank || a.seq - b.seq);
    let due = 0;
    while (due < queue.length && queue[due].at <= now) due++;
    for (const { event } of queue.splice(0, due)) listener(event);
  };
  const tick = () => {
    frame = null;
    flush();
    if (queue.length > 0) frame = requestAnimationFrame(tick);
  };

  const off = subscribeNoteEvents(trackId, (event) => {
    queue.push({
      at: performance.now() + msUntilHeard(event.time),
      rank: RANK[event.type],
      seq: seq++,
      event,
    });
    flush();
    if (queue.length > 0 && frame === null) {
      frame = requestAnimationFrame(tick);
    }
  });
  return () => {
    off();
    if (frame !== null) cancelAnimationFrame(frame);
    queue.length = 0;
  };
}
