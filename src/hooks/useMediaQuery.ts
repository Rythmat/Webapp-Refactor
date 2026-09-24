import { useCallback, useSyncExternalStore } from 'react';

/**
 * A media query as React state.
 *
 * `useIsMobile` answers one fixed question (under 520px) and is wired to the
 * shadcn sidebar; this is the general form, for layouts that need to know
 * about a tablet as well as a phone.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (listener: () => void) => {
      if (typeof window === 'undefined' || !window.matchMedia) return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener('change', listener);
      return () => mql.removeEventListener('change', listener);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () =>
      typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia(query).matches
        : false,
    () => false,
  );
}
