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
  },
  {
    id: 'nam-vox-ac15',
    name: 'Fire Opal',
    toneType: 'crunch',
    architecture: 'WaveNet',
    source: 'bundled',
    forInstrument: 'guitar',
    url: '/daw-assets/nam-models/vox-ac15.nam',
  },
  {
    id: 'nam-marshall-jcm-clean',
    name: 'Amber',
    toneType: 'clean',
    architecture: 'WaveNet',
    source: 'bundled',
    forInstrument: 'guitar',
    url: '/daw-assets/nam-models/marshall-jcm-clean.nam',
  },
  {
    id: 'nam-magnatone-59',
    name: 'Aquamarine',
    toneType: 'clean',
    architecture: 'WaveNet',
    source: 'bundled',
    forInstrument: 'guitar',
    url: '/daw-assets/nam-models/magnatone-59.nam',
  },
  {
    id: 'nam-roland-jc120',
    name: 'Celestite',
    toneType: 'clean',
    architecture: 'WaveNet',
    source: 'bundled',
    forInstrument: 'guitar',
    url: '/daw-assets/nam-models/roland-jc120.nam',
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
  },
  {
    id: 'nam-orange-rockerverb',
    name: 'Rose Quartz',
    toneType: 'hi_gain',
    architecture: 'WaveNet',
    source: 'bundled',
    forInstrument: 'guitar',
    url: '/daw-assets/nam-models/orange-rockerverb.nam',
  },
  {
    id: 'nam-vox-ac30',
    name: 'Emerald',
    toneType: 'clean',
    architecture: 'WaveNet',
    source: 'bundled',
    forInstrument: 'guitar',
    url: '/daw-assets/nam-models/vox-ac30.nam',
  },
  {
    id: 'nam-marshall-jcm800',
    name: 'Ruby',
    toneType: 'crunch',
    architecture: 'WaveNet',
    source: 'bundled',
    forInstrument: 'guitar',
    url: '/daw-assets/nam-models/marshall-jcm800.nam',
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
  },
  {
    id: 'nam-mesa-mark-iv',
    name: 'Amethyst',
    toneType: 'hi_gain',
    architecture: 'WaveNet',
    source: 'bundled',
    forInstrument: 'guitar',
    url: '/daw-assets/nam-models/mesa-mark-iv.nam',
  },
  {
    id: 'nam-engl-savage',
    name: 'Amazonite',
    toneType: 'hi_gain',
    architecture: 'WaveNet',
    source: 'bundled',
    forInstrument: 'guitar',
    url: '/daw-assets/nam-models/engl-savage.nam',
  },
  {
    id: 'nam-friedman-be',
    name: 'Obsidian',
    toneType: 'hi_gain',
    architecture: 'WaveNet',
    source: 'bundled',
    forInstrument: 'guitar',
    url: '/daw-assets/nam-models/friedman-be.nam',
  },
  {
    id: 'nam-soldano-slo',
    name: 'Sapphire',
    toneType: 'hi_gain',
    architecture: 'WaveNet',
    source: 'bundled',
    forInstrument: 'guitar',
    url: '/daw-assets/nam-models/soldano-slo.nam',
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
  },
  {
    id: 'nam-fender-bassman',
    name: 'Garnet',
    toneType: 'crunch',
    architecture: 'WaveNet',
    source: 'bundled',
    forInstrument: 'bass',
    url: '/daw-assets/nam-models/fender-bassman.nam',
  },
  {
    id: 'nam-markbass-lm3',
    name: 'Pyrite',
    toneType: 'crunch',
    architecture: 'WaveNet',
    source: 'bundled',
    forInstrument: 'bass',
    url: '/daw-assets/nam-models/markbass-lm3.nam',
  },
  {
    id: 'nam-gk-800rb',
    name: 'Azurite',
    toneType: 'clean',
    architecture: 'WaveNet',
    source: 'bundled',
    forInstrument: 'bass',
    url: '/daw-assets/nam-models/gk-800rb.nam',
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
  },
  {
    id: 'nam-svt-cranked',
    name: 'Malachite',
    toneType: 'hi_gain',
    architecture: 'WaveNet',
    source: 'bundled',
    forInstrument: 'bass',
    url: '/daw-assets/nam-models/svt-cranked.nam',
  },
  {
    id: 'nam-aguilar-th500',
    name: 'Goldstone',
    toneType: 'crunch',
    architecture: 'WaveNet',
    source: 'bundled',
    forInstrument: 'bass',
    url: '/daw-assets/nam-models/aguilar-th500.nam',
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
  },
  {
    id: 'nam-mesa-subway',
    name: 'Moonstone',
    toneType: 'clean',
    architecture: 'WaveNet',
    source: 'bundled',
    forInstrument: 'bass',
    url: '/daw-assets/nam-models/mesa-subway.nam',
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
