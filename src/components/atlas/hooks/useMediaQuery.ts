import { useCallback, useSyncExternalStore } from 'react';

const mediaQuery = (query: string): MediaQueryList | null =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(query)
    : null;

/**
 * Whether a CSS media query matches, read live: a change (a rotated phone, a
 * system setting) re-renders the reader. False where matchMedia is missing
 * (tests, SSR).
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mq = mediaQuery(query);
      if (!mq) return () => {};
      mq.addEventListener?.('change', onChange);
      return () => mq.removeEventListener?.('change', onChange);
    },
    [query],
  );
  const getSnapshot = () => mediaQuery(query)?.matches ?? false;
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

/**
 * True below Tailwind's `sm` breakpoint (640 px): the left panel becomes a
 * bottom sheet.
 */
export function useIsPhone(): boolean {
  return useMediaQuery('(max-width: 639.98px)');
}

/**
 * True while the system asks for reduced motion. The Globe then cuts its
 * camera flights, holds its arc dashes still, and scrolls without smoothing.
 */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}

/** The scroll behaviour to pass to scrollIntoView / scrollTo. */
export const scrollBehavior = (reduced: boolean): ScrollBehavior =>
  reduced ? 'auto' : 'smooth';
