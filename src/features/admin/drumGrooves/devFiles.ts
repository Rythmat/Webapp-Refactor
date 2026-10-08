/**
 * Writes the designer's files through the dev server (scripts/vite/
 * devContentWriter.ts). Grooves, kits and samples are repo files for now: save
 * locally, then commit. A deployed console can't write, so it gets Export.
 */

import type { DrumGroove } from '@/curriculum/engine/drumGrooves/drumGroove';
import type { CustomDrumKitFile } from '@/daw/instruments/drumKits';

/** True on `npm run dev`, where the dev server can write repo files. */
export const CAN_WRITE_FILES = import.meta.env.DEV;

async function call<T>(url: string, init: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(body.error ?? `${res.status} ${res.statusText}`);
  return body;
}

const json = (value: unknown): RequestInit => ({
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(value),
});

export const saveGrooveFile = (groove: DrumGroove) =>
  call(`/__dev/drum-grooves/${groove.id}`, json(groove));

export const deleteGrooveFile = (id: string) =>
  call(`/__dev/drum-grooves/${id}`, { method: 'DELETE' });

export const saveKitFile = (kit: CustomDrumKitFile) =>
  call(`/__dev/drum-kits/${kit.id}`, json(kit));

export const listUploadedSamples = () =>
  call<{ samples: string[] }>('/__dev/drum-samples', { method: 'GET' }).then(
    (r) => r.samples,
  );

export const uploadSample = (file: File) =>
  call<{ url: string }>(
    `/__dev/drum-samples?name=${encodeURIComponent(file.name)}`,
    {
      method: 'POST',
      // The writer only takes audio here; a file the browser can't type
      // still goes as bytes.
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
      body: file,
    },
  ).then((r) => r.url);

/** The groove as a .json download, for a console that can't write files. */
export function downloadGroove(groove: DrumGroove) {
  const blob = new Blob([`${JSON.stringify(groove, null, 2)}\n`], {
    type: 'application/json',
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${groove.id}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}
