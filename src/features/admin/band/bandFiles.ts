/**
 * Bands and their lesson pairings are repo files for now, like drum grooves,
 * bass lines and comping patterns: the dev server writes them
 * (scripts/vite/devContentWriter.ts), then they're committed. A deployed
 * console can't write, so it gets Export instead.
 */

import type { Band } from '@/curriculum/engine/band/band';
import type { LessonPairing } from '@/curriculum/engine/lessonPairings/registry';
import { CAN_WRITE_FILES } from '../drumGrooves/devFiles';
import {
  rememberDeletedBand,
  rememberSavedBand,
  rememberSavedPairing,
} from './bandSession';

export { CAN_WRITE_FILES };

async function call(url: string, init: RequestInit) {
  const res = await fetch(url, init);
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(body.error ?? `${res.status} ${res.statusText}`);
}

// The writer's transport check wants every write marked JSON, deletes too.
const JSON_HEADERS = { 'Content-Type': 'application/json' };

export async function saveBand(band: Band) {
  await call(`/__dev/bands/${band.id}`, {
    method: 'PUT',
    headers: JSON_HEADERS,
    body: JSON.stringify(band),
  });
  rememberSavedBand(band);
}

export async function deleteBand(id: string) {
  await call(`/__dev/bands/${id}`, { method: 'DELETE', headers: JSON_HEADERS });
  rememberDeletedBand(id);
}

/** A style's pairing; one with nothing in it deletes the file. */
export async function savePairing(pairing: LessonPairing) {
  const empty =
    !pairing.band &&
    !pairing.overrides?.length &&
    !pairing.drums &&
    !pairing.bass &&
    !pairing.comping;
  await call(`/__dev/lesson-pairings/${pairing.id}`, {
    method: empty ? 'DELETE' : 'PUT',
    headers: JSON_HEADERS,
    ...(empty ? {} : { body: JSON.stringify(pairing) }),
  });
  rememberSavedPairing(pairing);
}

/** The band as a .json download, for a console that can't write files. */
export function downloadBand(band: Band) {
  const blob = new Blob([`${JSON.stringify(band, null, 2)}\n`], {
    type: 'application/json',
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${band.id}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}
