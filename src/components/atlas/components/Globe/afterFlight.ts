import type { Channel, MapPhase } from '@/components/atlas/state/stageSignals';

/** A moment for a flight to start; and never longer than this in all. */
const WAIT = { graceMs: 150, capMs: 2600 } as const;

/**
 * Calls `then` once the map has flown where it is going: at once after a
 * moment if no flight started, else when it settles, and whatever happens by
 * `capMs`. Returns a cancel.
 */
export function afterFlight(
  phase: Channel<MapPhase>,
  then: () => void,
): () => void {
  let done = false;
  const go = () => {
    if (done) return;
    done = true;
    then();
  };
  const grace = window.setTimeout(() => {
    if (phase.get() !== 'flying') go();
  }, WAIT.graceMs);
  const cap = window.setTimeout(go, WAIT.capMs);
  const off = phase.subscribe(() => {
    if (phase.get() === 'settled') go();
  });
  return () => {
    done = true;
    off();
    window.clearTimeout(grace);
    window.clearTimeout(cap);
  };
}
