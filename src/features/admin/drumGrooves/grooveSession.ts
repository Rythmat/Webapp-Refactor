/**
 * Grooves saved or deleted this session, laid over the registry. The registry
 * is a build-time glob of the JSON files, so a file the designer just wrote
 * only appears there after Vite reloads the module — this keeps the list and
 * the editor current in between.
 */

import { useSyncExternalStore } from 'react';
import type { DrumGroove } from '@/curriculum/engine/drumGrooves/drumGroove';
import { listDesignedGrooves } from '@/curriculum/engine/drumGrooves/registry';
import { STUDIO_GROOVES } from './studioGrooves';

const saved = new Map<string, DrumGroove>();
const deleted = new Set<string>();
const listeners = new Set<() => void>();
let version = 0;

const emit = () => {
  version++;
  listeners.forEach((l) => l());
};

export function rememberSaved(groove: DrumGroove) {
  saved.set(groove.id, groove);
  deleted.delete(groove.id);
  emit();
}

export function rememberDeleted(id: string) {
  saved.delete(id);
  deleted.add(id);
  emit();
}

function current(): DrumGroove[] {
  const byId = new Map(
    [...listDesignedGrooves(), ...STUDIO_GROOVES].map((g) => [g.id, g]),
  );
  saved.forEach((g, id) => byId.set(id, g));
  deleted.forEach((id) => byId.delete(id));
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

let cache = { version: -1, list: [] as DrumGroove[] };

/** Every groove, this session's saves and deletes applied. */
export function useGrooveList(): DrumGroove[] {
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
