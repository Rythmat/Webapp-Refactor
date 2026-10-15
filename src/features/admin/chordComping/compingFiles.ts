/**
 * Comping patterns are repo files for now, like drum grooves and bass lines:
 * the dev server writes them (scripts/vite/devContentWriter.ts), then they're
 * committed. A deployed console can't write, so it gets Export instead.
 */

import type { ChordComping } from '@/curriculum/engine/chordComping/chordComping';
import { CAN_WRITE_FILES } from '../drumGrooves/devFiles';
import { rememberDeleted, rememberSaved } from './compingSession';

export { CAN_WRITE_FILES };

async function call(url: string, init: RequestInit) {
  const res = await fetch(url, init);
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(body.error ?? `${res.status} ${res.statusText}`);
}

export async function saveComping(pattern: ChordComping) {
  await call(`/__dev/chord-comping/${pattern.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(pattern),
  });
  rememberSaved(pattern);
}

export async function deleteComping(id: string) {
  // The writer's transport check wants every write marked JSON, deletes too.
  await call(`/__dev/chord-comping/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });
  rememberDeleted(id);
}

/** The pattern as a .json download, for a console that can't write files. */
export function downloadComping(pattern: ChordComping) {
  const blob = new Blob([`${JSON.stringify(pattern, null, 2)}\n`], {
    type: 'application/json',
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${pattern.id}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}
