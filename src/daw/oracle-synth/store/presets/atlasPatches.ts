import type { PresetData } from './PresetData';

/**
 * Music Atlas patches: Oracle Synth presets made in the Studio and saved "for
 * everyone" (dev server → ./atlas/*.json — scripts/vite/devContentWriter.ts).
 * They join the factory list, so every preset menu, demo project, project
 * template and Parts Library part can name them. Commit a file to ship it.
 */
const files = import.meta.glob<PresetData & { id?: string }>('./atlas/*.json', {
  eager: true,
  import: 'default',
});

export const ATLAS_PATCHES: PresetData[] = Object.values(files)
  .map(({ id: _id, ...preset }) => preset)
  .sort((a, b) => a.name.localeCompare(b.name));

/** A patch name as a file id: 'WARM RHODES' → 'warm-rhodes'. */
export const patchFileId = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || `patch-${Date.now().toString(36)}`;

/** Save the synth's current patch as a Music Atlas patch (dev server only). */
export async function saveAtlasPatch(preset: PresetData): Promise<void> {
  const id = patchFileId(preset.name);
  const res = await fetch(`/__dev/synth-patches/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...preset }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Save failed: ${res.status}`);
  }
}
