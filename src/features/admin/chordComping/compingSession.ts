/**
 * Comping patterns saved or deleted this session, laid over the registry. The
 * registry is a build-time glob of the JSON files, so a file the editor just
 * wrote only appears there after Vite reloads the module — this keeps the
 * list and the editor current in between.
 */

import { useSyncExternalStore } from 'react';
import type { ChordComping } from '@/curriculum/engine/chordComping/chordComping';
import {
  byOrder,
  listCompings,
} from '@/curriculum/engine/chordComping/registry';

const saved = new Map<string, ChordComping>();
const deleted = new Set<string>();
const listeners = new Set<() => void>();
let version = 0;

const emit = () => {
  version++;
  listeners.forEach((l) => l());
};

export function rememberSaved(pattern: ChordComping) {
  saved.set(pattern.id, pattern);
  deleted.delete(pattern.id);
  emit();
}

export function rememberDeleted(id: string) {
  saved.delete(id);
  deleted.add(id);
  emit();
}

function current(): ChordComping[] {
  const byId = new Map(listCompings().map((c) => [c.id, c]));
  saved.forEach((c, id) => byId.set(id, c));
  deleted.forEach((id) => byId.delete(id));
  return [...byId.values()].sort(byOrder);
}

let cache = { version: -1, list: [] as ChordComping[] };

/** Every comping pattern, this session's saves and deletes applied. */
export function useCompingList(): ChordComping[] {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => {
      if (cache.version !== version) cache = { version, list: current() };
      return cache.list;
    },
  );
}
