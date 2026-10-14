/**
 * Bass lines saved or deleted this session, laid over the registry. The
 * registry is a build-time glob of the JSON files, so a file the editor just
 * wrote only appears there after Vite reloads the module — this keeps the
 * list and the editor current in between.
 */

import { useSyncExternalStore } from 'react';
import type { BassLine } from '@/curriculum/engine/bassLines/bassLine';
import { byOrder, listBassLines } from '@/curriculum/engine/bassLines/registry';

const saved = new Map<string, BassLine>();
const deleted = new Set<string>();
const listeners = new Set<() => void>();
let version = 0;

const emit = () => {
  version++;
  listeners.forEach((l) => l());
};

export function rememberSaved(line: BassLine) {
  saved.set(line.id, line);
  deleted.delete(line.id);
  emit();
}

export function rememberDeleted(id: string) {
  saved.delete(id);
  deleted.add(id);
  emit();
}

function current(): BassLine[] {
  const byId = new Map(listBassLines().map((l) => [l.id, l]));
  saved.forEach((l, id) => byId.set(id, l));
  deleted.forEach((id) => byId.delete(id));
  return [...byId.values()].sort(byOrder);
}

let cache = { version: -1, list: [] as BassLine[] };

/** Every bass line, this session's saves and deletes applied. */
export function useBassLineList(): BassLine[] {
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
