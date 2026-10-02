import { useSyncExternalStore } from 'react';
import type { EntityEntry } from './rankEntities';

/**
 * Records created from a picker in this session.
 *
 * A create is a PUT; the served list catches up on its next fetch. Until
 * then the new record would be missing from the very picker that made it,
 * and the author would make it twice. These entries fill that gap, and the
 * index lets the served copy replace them once it arrives.
 */

let entries: EntityEntry[] = [];
const listeners = new Set<() => void>();

export function addSessionEntity(entry: EntityEntry): void {
  entries = [...entries.filter((e) => e.id !== entry.id), entry];
  for (const listener of listeners) listener();
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useSessionEntities = (): readonly EntityEntry[] =>
  useSyncExternalStore(subscribe, () => entries);

/** Tests only. */
export const resetSessionEntitiesForTests = () => {
  entries = [];
};
