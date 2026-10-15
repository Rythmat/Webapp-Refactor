/**
 * Every player, read from the JSON files the console writes into
 * src/curriculum/data/players/ (dev server only —
 * scripts/vite/devContentWriter.ts). Commit a file to ship it.
 */

import { type Player, type PlayerItem, sameItem } from './player';

const files = import.meta.glob<Player>('../../data/players/*.json', {
  eager: true,
  import: 'default',
});

const PLAYERS = new Map<string, Player>(
  Object.values(files).map((p) => [p.id, p]),
);

export function byOrder(a: Player, b: Player): number {
  return (
    (a.order ?? Infinity) - (b.order ?? Infinity) ||
    a.name.localeCompare(b.name)
  );
}

export function listPlayers(): Player[] {
  return [...PLAYERS.values()].sort(byOrder);
}

export function getPlayer(id: string | undefined): Player | undefined {
  return id ? PLAYERS.get(id) : undefined;
}

/** The player an item is filed under, if any. */
export function playerOf(item: PlayerItem): Player | undefined {
  return listPlayers().find((p) => p.items.some((i) => sameItem(i, item)));
}

/**
 * The console's save, applied at once so every page agrees before the dev
 * server's reload; `null` forgets a deleted player.
 */
export function rememberPlayer(id: string, player: Player | null): void {
  if (player) PLAYERS.set(id, player);
  else PLAYERS.delete(id);
}
