// ── NAM Model Store ───────────────────────────────────────────────────────
// Registry of bundled and user-loaded NAM models.

import { parseNamFile, isSupported, type NamModelFile } from './NamModelParser';

export interface NamModelEntry {
  id: string;
  name: string;
  toneType: string;
  architecture: string;
  source: 'bundled' | 'user';
  forInstrument: 'guitar' | 'bass';
  url?: string; // bundled: relative to public/
  file?: NamModelFile; // user: already parsed
  gainCompensation?: number; // per-model output level multiplier (default 1.0)
}

export const BUNDLED_MODELS: NamModelEntry[] = [
  // ── Guitar Amps ─────────────────────────────────────────────────────────
  // Clean
  {
    id: 'nam-clean-twin',
    name: 'Quartz',
    toneType: 'clean',
    architecture: 'WaveNet',
    source: 'bundled',
    forInstrument: 'guitar',
    url: '/daw-assets/nam-models/clean-twin.nam',
    gainCompensation: 1.0,
  },
  {
    id: 'nam-vox-ac15',
    name: 'Fire Opal',
    toneType: 'crunch',
    architecture: 'WaveNet',
    source: 'bundled',
    forInstrument: 'guitar',
    url: '/daw-assets/nam-models/vox-ac15.nam',
    gainCompensation: 0.7,
  },
  {
    id: 'nam-marshall-jcm-clean',
    name: 'Amber',
    toneType: 'clean',
    architecture: 'WaveNet',
    source: 'bundled',
    forInstrument: 'guitar',
    url: '/daw-assets/nam-models/marshall-jcm-clean.nam',
    gainCompensation: 1.0,
  },
  {
    id: 'nam-magnatone-59',
    name: 'Aquamarine',
    toneType: 'clean',
    architecture: 'WaveNet',
    source: 'bundled',
    forInstrument: 'guitar',
    url: '/daw-assets/nam-models/magnatone-59.nam',
    gainCompensation: 1.0,
  },
  {
    id: 'nam-roland-jc120',
    name: 'Celestite',
    toneType: 'clean',
    architecture: 'WaveNet',
    source: 'bundled',
    forInstrument: 'guitar',
    url: '/daw-assets/nam-models/roland-jc120.nam',
    gainCompensation: 1.0,
  },
  // Crunch
  {
    id: 'nam-crunch-plexi',
    name: 'Sunstone',
    toneType: 'crunch',
    architecture: 'WaveNet',
    source: 'bundled',
    forInstrument: 'guitar',
    url: '/daw-assets/nam-models/crunch-plexi.nam',
    gainCompensation: 0.7,
  },
  {
    id: 'nam-orange-rockerverb',
    name: 'Rose Quartz',
    toneType: 'hi_gain',
    architecture: 'WaveNet',
    source: 'bundled',
    forInstrument: 'guitar',
    url: '/daw-assets/nam-models/orange-rockerverb.nam',
    gainCompensation: 0.5,
  },
  {
    id: 'nam-vox-ac30',
    name: 'Emerald',
    toneType: 'clean',
    architecture: 'WaveNet',
    source: 'bundled',
    forInstrument: 'guitar',
    url: '/daw-assets/nam-models/vox-ac30.nam',
    gainCompensation: 1.0,
  },
  {
    id: 'nam-marshall-jcm800',
    name: 'Ruby',
    toneType: 'crunch',
    architecture: 'WaveNet',
    source: 'bundled',
    forInstrument: 'guitar',
    url: '/daw-assets/nam-models/marshall-jcm800.nam',
    gainCompensation: 0.7,
  },
  // Hi Gain
  {
    id: 'nam-high-gain',
    name: "Tiger's Eye",
    toneType: 'hi_gain',
    architecture: 'WaveNet',
    source: 'bundled',
    forInstrument: 'guitar',
    url: '/daw-assets/nam-models/high-gain.nam',
    gainCompensation: 0.5,
  },
  {
    id: 'nam-mesa-mark-iv',
    name: 'Amethyst',
    toneType: 'hi_gain',
    architecture: 'WaveNet',
    source: 'bundled',
    forInstrument: 'guitar',
    url: '/daw-assets/nam-models/mesa-mark-iv.nam',
    gainCompensation: 0.5,
  },
  {
    id: 'nam-engl-savage',
    name: 'Amazonite',
    toneType: 'hi_gain',
    architecture: 'WaveNet',
    source: 'bundled',
    forInstrument: 'guitar',
    url: '/daw-assets/nam-models/engl-savage.nam',
    gainCompensation: 0.5,
  },
  {
    id: 'nam-friedman-be',
    name: 'Obsidian',
    toneType: 'hi_gain',
    architecture: 'WaveNet',
    source: 'bundled',
    forInstrument: 'guitar',
    url: '/daw-assets/nam-models/friedman-be.nam',
    gainCompensation: 0.5,
  },
  {
    id: 'nam-soldano-slo',
    name: 'Sapphire',
    toneType: 'hi_gain',
    architecture: 'WaveNet',
    source: 'bundled',
    forInstrument: 'guitar',
    url: '/daw-assets/nam-models/soldano-slo.nam',
    gainCompensation: 0.5,
  },
  // ── Bass Amps ───────────────────────────────────────────────────────────
  // Clean
  {
    id: 'nam-ampeg-svt',
    name: 'Diamond',
    toneType: 'clean',
    architecture: 'WaveNet',
    source: 'bundled',
    forInstrument: 'bass',
    url: '/daw-assets/nam-models/ampeg-svt.nam',
    gainCompensation: 1.0,
  },
  {
    id: 'nam-fender-bassman',
    name: 'Garnet',
    toneType: 'crunch',
    architecture: 'WaveNet',
    source: 'bundled',
    forInstrument: 'bass',
    url: '/daw-assets/nam-models/fender-bassman.nam',
    gainCompensation: 0.7,
  },
  {
    id: 'nam-markbass-lm3',
    name: 'Pyrite',
    toneType: 'crunch',
    architecture: 'WaveNet',
    source: 'bundled',
    forInstrument: 'bass',
    url: '/daw-assets/nam-models/markbass-lm3.nam',
    gainCompensation: 0.7,
  },
  {
    id: 'nam-gk-800rb',
    name: 'Azurite',
    toneType: 'clean',
    architecture: 'WaveNet',
    source: 'bundled',
    forInstrument: 'bass',
    url: '/daw-assets/nam-models/gk-800rb.nam',
    gainCompensation: 1.0,
  },
  // Crunch
  {
    id: 'nam-ampeg-v4',
    name: 'Lapis Lazuli',
    toneType: 'crunch',
    architecture: 'WaveNet',
    source: 'bundled',
    forInstrument: 'bass',
    url: '/daw-assets/nam-models/ampeg-v4.nam',
    gainCompensation: 0.7,
  },
  {
    id: 'nam-svt-cranked',
    name: 'Malachite',
    toneType: 'hi_gain',
    architecture: 'WaveNet',
    source: 'bundled',
    forInstrument: 'bass',
    url: '/daw-assets/nam-models/svt-cranked.nam',
    gainCompensation: 0.5,
  },
  {
    id: 'nam-aguilar-th500',
    name: 'Goldstone',
    toneType: 'crunch',
    architecture: 'WaveNet',
    source: 'bundled',
    forInstrument: 'bass',
    url: '/daw-assets/nam-models/aguilar-th500.nam',
    gainCompensation: 0.7,
  },
  // Hi Gain
  {
    id: 'nam-darkglass-b7k',
    name: 'Bloodstone',
    toneType: 'hi_gain',
    architecture: 'WaveNet',
    source: 'bundled',
    forInstrument: 'bass',
    url: '/daw-assets/nam-models/darkglass-b7k.nam',
    gainCompensation: 0.5,
  },
  {
    id: 'nam-mesa-subway',
    name: 'Moonstone',
    toneType: 'clean',
    architecture: 'WaveNet',
    source: 'bundled',
    forInstrument: 'bass',
    url: '/daw-assets/nam-models/mesa-subway.nam',
    gainCompensation: 1.0,
  },
];

export async function fetchBundledModel(url: string): Promise<NamModelFile> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch model: ${response.status} ${response.statusText}`,
    );
  }
  const json = await response.text();
  const model = parseNamFile(json);
  if (!isSupported(model)) {
    throw new Error(
      `${model.architecture} models are not yet supported. Please use an LSTM, Linear, or WaveNet model.`,
    );
  }
  return model;
}

export async function loadModelFromFile(file: File): Promise<NamModelFile> {
  if (file.size > 20 * 1024 * 1024) {
    throw new Error('Model file exceeds 20 MB maximum size');
  }
  const json = await file.text();
  const model = parseNamFile(json);
  if (!isSupported(model)) {
    throw new Error(
      `${model.architecture} models are not yet supported. Please use an LSTM, Linear, or WaveNet model.`,
    );
  }
  return model;
}
