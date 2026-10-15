import { useCallback, useEffect, useSyncExternalStore } from 'react';
import type {
  LazyResource,
  LazySnapshot,
} from '@/components/atlas/data/lazyResource';

/**
 * Read a lazily loaded resource, starting its load while `enabled`.
 *
 * Re-renders when the resource changes state, so a component can show a
 * loading line, then its data. `retry` loads again after a failure.
 */
export function useLazyResource<T>(
  resource: LazyResource<T>,
  enabled = true,
): LazySnapshot<T> & { retry: () => void } {
  const snapshot = useSyncExternalStore(
    resource.subscribe,
    resource.getSnapshot,
    resource.getSnapshot,
  );
  const idle = snapshot.status === 'idle';

  useEffect(() => {
    // The error is in the snapshot; the rejection itself has no reader here.
    if (enabled && idle) resource.load().catch(() => undefined);
  }, [enabled, idle, resource]);

  const retry = useCallback(() => {
    resource.load().catch(() => undefined);
  }, [resource]);

  return { ...snapshot, retry };
}
