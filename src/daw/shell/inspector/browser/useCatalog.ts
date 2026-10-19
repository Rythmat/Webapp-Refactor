import { useEffect, useMemo, useState } from 'react';
import type { DrumGroove } from '@/curriculum/engine/drumGrooves/drumGroove';
import { loadStudioGrooves } from '@/curriculum/engine/drumGrooves/registry';
import { listLiveParts } from '@/curriculum/engine/parts/registry';
import { GROOVES } from '@/daw/data/groovesLibrary';
import { PRESETS } from '@/daw/data/instrumentPresets';
import { PROJECT_TEMPLATES } from '@/daw/data/projectTemplates';
import { DRUM_KIT_CONFIGS } from '@/daw/instruments/drumKits';
import { useSynthStore } from '@/daw/oracle-synth/store';
import { FACTORY_PRESETS } from '@/daw/oracle-synth/store/presets/factoryPresets';
import {
  fetchPackManifest,
  type PackManifest,
} from '@/daw/oracle-synth/store/presets/packLoader';
import {
  grooveItem,
  kitItem,
  partItem,
  studioPresetItem,
  synthPresetItem,
  templateItem,
  type BrowserItem,
} from './items';

// ── What the Library lists, gathered (milestone 2.14) ──────────────────────
//
// The sources that never change in a session are built once. Two arrive
// later and fill in: the designed grooves (their tempo, length and kit, a
// lazy chunk of about 32 kB) and the SERUM pack's manifest (20 kB; its
// patches load only when one is previewed or added). The student's own
// synth patches follow the synth store.

let parts: BrowserItem[] | null = null;
let fixed: {
  kits: BrowserItem[];
  studio: BrowserItem[];
  oracle: BrowserItem[];
  templates: BrowserItem[];
} | null = null;

function fixedItems() {
  parts ??= listLiveParts().map(partItem);
  fixed ??= {
    kits: DRUM_KIT_CONFIGS.map(kitItem),
    studio: PRESETS.map(studioPresetItem),
    oracle: FACTORY_PRESETS.filter((p) => p.name !== 'INITIALIZE').map((p) =>
      synthPresetItem('oracle', p.name),
    ),
    templates: PROJECT_TEMPLATES.map(templateItem),
  };
  return { parts, ...fixed };
}

let designedCache: Map<string, DrumGroove> | null = null;
let manifestCache: PackManifest | null = null;

/** Every item the Library lists, in type order (parts, grooves, kits, presets, templates). */
export function useCatalog(): BrowserItem[] {
  const [designed, setDesigned] = useState(designedCache);
  const [manifest, setManifest] = useState(manifestCache);
  const mine = useSynthStore((s) => s.userPresets);

  useEffect(() => {
    let live = true;
    if (!designedCache) {
      void loadStudioGrooves()
        .then((list) => {
          designedCache = new Map(list.map((g) => [g.id, g]));
          if (live) setDesigned(designedCache);
        })
        .catch(() => {});
    }
    if (!manifestCache) {
      void fetchPackManifest().then((m) => {
        if (!m) return;
        manifestCache = m;
        if (live) setManifest(m);
      });
    }
    return () => {
      live = false;
    };
  }, []);

  return useMemo(() => {
    const f = fixedItems();
    const grooves = GROOVES.map((g) =>
      grooveItem(g, designed?.get(g.id) ?? undefined),
    );
    const pack =
      manifest?.presets.map((p) =>
        synthPresetItem('pack', p.name, p.category),
      ) ?? [];
    const own = mine
      .filter((p) => !p.isFactory)
      .map((p) => synthPresetItem('mine', p.name));
    return [
      ...f.parts,
      ...grooves,
      ...f.kits,
      ...own,
      ...f.oracle,
      ...pack,
      ...f.studio,
      ...f.templates,
    ];
  }, [designed, manifest, mine]);
}
