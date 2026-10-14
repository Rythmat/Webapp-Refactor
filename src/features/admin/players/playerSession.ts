/**
 * Players saved or deleted this session, laid over the registry (a
 * build-time glob of the JSON files), so every page agrees before Vite
 * reloads the module.
 */

import { useSyncExternalStore } from 'react';
import type { Player } from '@/curriculum/engine/players/player';
import {
  listPlayers,
  rememberPlayer,
} from '@/curriculum/engine/players/registry';

const listeners = new Set<() => void>();
let version = 0;
const emit = () => {
  version++;
  listeners.forEach((l) => l());
};

export function rememberSavedPlayer(player: Player) {
  rememberPlayer(player.id, player);
  emit();
}

export function rememberDeletedPlayer(id: string) {
  rememberPlayer(id, null);
  emit();
}

let cache = { version: -1, list: [] as Player[] };

/** Every player, this session's saves and deletes applied. */
export function usePlayerList(): Player[] {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => {
      if (cache.version !== version) cache = { version, list: listPlayers() };
      return cache.list;
    },
  );
}
