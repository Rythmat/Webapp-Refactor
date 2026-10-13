import type { LazyResource } from '@/components/atlas/data/lazyResource';

/**
 * Navigation that has to wait for on-demand data (a US event needs the state
 * outlines, a tour needs the tours) must not land after the user has already
 * moved on. Each wait takes a ticket; a newer wait, or a new stop in the URL
 * (cancelPendingNavigation, called by useAtlasUrlSync), voids the older ones.
 */
let latest = 0;

/**
 * Run `apply` with the resource's data: at once when it has loaded, else when
 * it lands, unless another navigation started in between. A failed load still
 * runs `apply`, with undefined, so the caller can fall back.
 */
export function afterLoad<T>(
  resource: LazyResource<T>,
  apply: (data: T | undefined) => void,
): void {
  const ticket = ++latest;
  const ready = resource.peek();
  if (ready !== undefined) {
    apply(ready);
    return;
  }
  resource.load().then(
    (data) => {
      if (ticket === latest) apply(data);
    },
    () => {
      if (ticket === latest) apply(undefined);
    },
  );
}

/** Void every navigation still waiting for data. */
export function cancelPendingNavigation(): void {
  latest++;
}
