// ── Takes still being recorded or committed (milestone 1.4) ────────────────
//
// Before another session replaces the open one, a take in progress is
// stopped and committed into it, so the kept draft holds it (E10). The
// recorders count themselves in here (beginTake) from the moment a take
// starts until its clip is in the store or abandoned; openSession waits on
// whenTakesSettled. No imports: the recorders, the transport and openSession
// all load this.
//
// A recorder calls its settle in a `finally`, so a throw can't leave a take
// counted. As a backstop it passes `alive` (say, "the transport is still
// recording or committing this take"): a take whose check says it's gone
// counts as settled, so one missed settle (a decode failure, a mic error,
// HMR) can't refuse every later open as 'busy' until a reload.

type TakeKind = 'midi' | 'audio';

interface Take {
  kind: TakeKind;
  alive: (() => boolean) | null;
}

const live = new Set<Take>();
const waiters = new Set<() => void>();

/** How often a waiter re-checks the takes' liveness. */
const LIVENESS_POLL_MS = 250;

function wakeIfSettled(): void {
  if (live.size !== 0) return;
  for (const wake of [...waiters]) wake();
}

/** Settle every take whose liveness check says it has gone. */
function sweepStale(): void {
  for (const take of [...live]) {
    if (take.alive === null) continue;
    let alive = false;
    try {
      alive = take.alive();
    } catch (err) {
      // A check that throws can't keep a take (and every open) waiting.
      console.warn('[takes] a liveness check failed:', err);
    }
    if (!alive) {
      console.warn(
        `[takes] a ${take.kind} take never settled; counting it done`,
      );
      live.delete(take);
    }
  }
  wakeIfSettled();
}

/**
 * Count a take as in flight. Returns its settle, to call (in a `finally`)
 * once the take is committed or dropped; calling it again does nothing.
 * `alive`, when given, is asked while someone waits: false settles the take.
 */
export function beginTake(
  kind: TakeKind,
  opts: { alive?: () => boolean } = {},
): () => void {
  const take: Take = { kind, alive: opts.alive ?? null };
  live.add(take);
  return () => {
    if (!live.delete(take)) return;
    wakeIfSettled();
  };
}

/** How many takes are in flight now; of one kind when given. */
export function takesInFlight(kind?: TakeKind): number {
  sweepStale();
  if (kind === undefined) return live.size;
  let count = 0;
  for (const take of live) if (take.kind === kind) count += 1;
  return count;
}

/**
 * Resolve true once no take is in flight (at once when none is, stale takes
 * swept), or false after `timeoutMs`.
 */
export function whenTakesSettled(timeoutMs: number): Promise<boolean> {
  sweepStale();
  if (live.size === 0) return Promise.resolve(true);
  return new Promise<boolean>((resolve) => {
    const finish = (settled: boolean) => {
      clearTimeout(timer);
      clearInterval(poll);
      waiters.delete(wake);
      resolve(settled);
    };
    const wake = () => finish(true);
    const timer = setTimeout(
      () => {
        sweepStale();
        finish(live.size === 0);
      },
      Math.max(0, timeoutMs),
    );
    const poll = setInterval(sweepStale, LIVENESS_POLL_MS);
    waiters.add(wake);
  });
}
