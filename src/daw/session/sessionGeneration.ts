// ── Session generation ─────────────────────────────────────────────────────
//
// A counter that moves on with every load or reset of the Studio project.
// Some caches are keyed by track id and live outside the store: the Oracle
// patch cache and its live-track marker, the TrackEngine registry, the synth
// panel's bridge. A new session can reuse a track id (kept work restored, a
// project reopened, a Save-As copy opened next to its original), so an id
// alone can't tell the new session's track from the old one. The generation
// can: anything cached in an earlier generation belongs to another project.
//
// A bump forgets the open project: every Oracle patch cached for its tracks,
// which track the synth panel shows, and (as the editor re-renders) every
// track engine. So a loader does everything that can refuse or throw first:
// it validates, migrates and decodes the project, plans its ids, and collects
// the patches to seed instead of seeding them as it goes. Only then, with the
// load certain, does it bump, seed the caches and set the store, all in one
// synchronous block. Listeners run inside the bump, so a cache is empty by
// the time the loader seeds it. With no await between the three steps, no
// render sees the old project's tracks in the new generation: a panel shown
// in that gap would mark the old track live and keep its seed from showing,
// and an engine made in it would never get the new patch. A reset has
// nothing to refuse, so it bumps straight away (resetProjectState).

type SessionGenerationListener = (generation: number, reason: string) => void;

let generation = 0;
const listeners = new Set<SessionGenerationListener>();

/** The current session generation: 0 until the first load or reset. */
export function getSessionGeneration(): number {
  return generation;
}

/**
 * Start a new session generation for a load or reset of the project. `reason`
 * names it ('restore', 'cloud-open', 'new', …) for listeners and logs. Every
 * listener has run when this returns. One that throws is logged and the rest
 * still run: a load must not stop halfway over a cache that failed to clear.
 * Listeners must not bump the generation themselves.
 *
 * Bump only once the load is certain: a load that bumps and then refuses
 * (an unreadable draft, a payload that fails to decode) leaves the open
 * project in the store without its Oracle patches, and its next save
 * without them. Seed the caches and set the store right after, with no await
 * in between (see the top of this file).
 */
export function bumpSessionGeneration(reason: string): number {
  generation += 1;
  const current = generation;
  for (const listener of [...listeners]) {
    try {
      listener(current, reason);
    } catch (err) {
      console.error(`[session] generation listener failed (${reason}):`, err);
    }
  }
  return current;
}

/**
 * Call `listener` on every bump, until the returned function is called. With
 * getSessionGeneration it is also a useSyncExternalStore subscription, which
 * re-renders a component when a load or reset starts.
 */
export function onSessionGeneration(
  listener: SessionGenerationListener,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
