// Factory extension pack loader. Packs live entirely under
// public/daw-assets/oracle-packs/<id>/ (manifest + preset JSONs + wavetable
// wavs) so licensed/derived content stays out of the source bundle —
// deleting the asset directory fully removes a pack (the picker section
// disappears; saved projects keep full params and degrade to basic
// waveforms via the oscillator's missing-table fallback).

import { registerPackTables } from '../../audio/wavetableImport';
import { useSynthStore } from '../index';
import type { PresetData } from './PresetData';

interface PackManifest {
  packId: string;
  displayName: string;
  version: number;
  presets: { name: string; file: string; category: string }[];
  wavetables: { name: string; file: string; frames: number }[];
}

const PACK_BASE = '/daw-assets/oracle-packs/serum2/';

let loadAttempted = false;

/**
 * Fetches the pack manifest + preset data (small JSONs, eager) and
 * registers wavetable URLs (large wavs, lazy-fetched on first use).
 * Silent no-op when no pack is installed (404). Idempotent.
 */
export async function loadOraclePacks(): Promise<void> {
  if (loadAttempted) return;
  loadAttempted = true;

  try {
    const res = await fetch(`${PACK_BASE}manifest.json`);
    if (!res.ok) return; // no pack installed
    const manifest = (await res.json()) as PackManifest;

    registerPackTables(
      manifest.wavetables.map((w) => ({
        name: w.name,
        url: `${PACK_BASE}wavetables/${encodeURIComponent(w.file)}`,
      })),
    );

    const presets = await Promise.all(
      manifest.presets.map(async (p) => {
        const pres = await fetch(
          `${PACK_BASE}presets/${encodeURIComponent(p.file)}`,
        );
        if (!pres.ok) return null;
        const data = (await pres.json()) as PresetData;
        return { name: p.name, data, category: p.category };
      }),
    );

    useSynthStore.getState().registerPackPresets(
      manifest.displayName,
      presets.filter((p): p is NonNullable<typeof p> => p !== null),
    );
  } catch (err) {
    // Pack loading must never break the synth
    console.warn('[oracle] pack load failed:', err);
  }
}

/** Test hook: allows re-attempting a load after a mocked failure. */
export function resetPackLoaderForTests(): void {
  loadAttempted = false;
}
