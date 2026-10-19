// ── A take committed to the song (milestone 1.11 d, for 1.16b) ──────────────
// Fired once for each audio take when its clip is in the store: the track,
// the clip, where it landed and the audio it plays. A tiny emitter, so later
// work (1.16b) can follow takes without reaching into the recording hook.

export interface CommittedTake {
  trackId: string;
  clipId: string;
  startTick: number;
  buffer: AudioBuffer;
}

type TakeListener = (take: CommittedTake) => void;

const listeners = new Set<TakeListener>();

/** Calls `listener` for every take committed from now on. Returns the
 *  unsubscribe function. */
export function onTakeCommitted(listener: TakeListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Tells every listener a take is in the song. A listener that throws
 *  doesn't stop the others. */
export function emitTakeCommitted(take: CommittedTake): void {
  for (const listener of Array.from(listeners)) {
    try {
      listener(take);
    } catch (err) {
      console.error('[recording] a take listener failed', err);
    }
  }
}
