import { useSyncExternalStore } from 'react';

// ── Reduced motion for the lesson overlay ──────────────────────────────────
// True while the student's system asks for reduced motion. The lesson overlay
// then drops its pulses, glides, fades and confetti. Read live (a change in
// the system setting applies mid-lesson), and false where matchMedia is
// missing (tests, SSR).

const QUERY = '(prefers-reduced-motion: reduce)';

const mediaQuery = (): MediaQueryList | null =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(QUERY)
    : null;

function subscribe(onChange: () => void): () => void {
  const mq = mediaQuery();
  if (!mq) return () => {};
  mq.addEventListener?.('change', onChange);
  return () => mq.removeEventListener?.('change', onChange);
}

const getSnapshot = () => mediaQuery()?.matches ?? false;
const getServerSnapshot = () => false;

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
