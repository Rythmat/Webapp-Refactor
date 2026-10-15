/**
 * Players are repo files for now, like bands: the dev server writes them
 * (scripts/vite/devContentWriter.ts), then they're committed.
 */

import {
  type Player,
  type PlayerItem,
  withItem,
  withoutItem,
} from '@/curriculum/engine/players/player';
import { listPlayers } from '@/curriculum/engine/players/registry';
import { CAN_WRITE_FILES } from '../drumGrooves/devFiles';
import { rememberDeletedPlayer, rememberSavedPlayer } from './playerSession';

export { CAN_WRITE_FILES };

const JSON_HEADERS = { 'Content-Type': 'application/json' };

async function call(url: string, init: RequestInit) {
  const res = await fetch(url, init);
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(body.error ?? `${res.status} ${res.statusText}`);
}

export async function savePlayer(player: Player) {
  await call(`/__dev/players/${player.id}`, {
    method: 'PUT',
    headers: JSON_HEADERS,
    body: JSON.stringify(player),
  });
  rememberSavedPlayer(player);
}

export async function deletePlayer(id: string) {
  await call(`/__dev/players/${id}`, {
    method: 'DELETE',
    headers: JSON_HEADERS,
  });
  rememberDeletedPlayer(id);
}

/**
 * Files an item under a player — or under nobody, with `null` — taking it
 * from whoever had it, so it belongs to one player at most.
 */
export async function fileItem(item: PlayerItem, playerId: string | null) {
  for (const player of listPlayers()) {
    const has = player.items.some(
      (i) => i.kind === item.kind && i.id === item.id,
    );
    if (player.id === playerId) {
      if (!has) await savePlayer(withItem(player, item));
    } else if (has) {
      await savePlayer(withoutItem(player, item));
    }
  }
}
