// ── Instrument Preset Catalog ────────────────────────────────────────────
// Static catalog of instrument presets organized by category.

import type { InstrumentType } from '@/daw/store/tracksSlice';

export interface Preset {
  id: string;
  name: string;
  category: string;
  /** When set, selecting this preset switches the track to this instrument. */
  instrumentType?: InstrumentType;
  /** GM program number (0-127) for SoundFont presets. */
  gmProgram?: number;
}

export const PRESET_CATEGORIES = [
  '808s',
  'Brass',
  'Drum Kits',
  'Drum Pads',
  'Electric Basses',
  'Guitars',
  'Keyboards',
  'Leads',
  'Organs',
  'Pads',
  'Percussion',
  'Strings',
] as const;

export type PresetCategory = (typeof PRESET_CATEGORIES)[number];

export const PRESETS: Preset[] = [
  // 808s
  { id: '808-boom', name: '808 Boom', category: '808s' },
  { id: '808-sub', name: '808 Sub Bass', category: '808s' },
  { id: '808-trap', name: '808 Trap Kit', category: '808s' },

  // Brass
  {
    id: 'brass-ensemble',
    name: 'Brass Ensemble',
    category: 'Brass',
    instrumentType: 'soundfont',
    gmProgram: 61,
  },
  {
    id: 'french-horn',
    name: 'French Horn',
    category: 'Brass',
    instrumentType: 'soundfont',
    gmProgram: 60,
  },
  {
    id: 'trumpet',
    name: 'Trumpet',
    category: 'Brass',
    instrumentType: 'soundfont',
    gmProgram: 56,
  },
  {
    id: 'trombone',
    name: 'Trombone',
    category: 'Brass',
    instrumentType: 'soundfont',
    gmProgram: 57,
  },

  // Drum Kits
  { id: 'natural', name: 'Natural', category: 'Drum Kits' },

  // Drum Pads
  { id: 'finger-drums', name: 'Finger Drums', category: 'Drum Pads' },
  { id: 'lo-fi-pads', name: 'Lo-Fi Pads', category: 'Drum Pads' },
  { id: 'perc-pads', name: 'Percussion Pads', category: 'Drum Pads' },

  // Electric Basses
  {
    id: 'electric-bass',
    name: 'Electric Bass',
    category: 'Electric Basses',
    instrumentType: 'soundfont',
    gmProgram: 33,
  },
  {
    id: 'slap-bass',
    name: 'Slap Bass',
    category: 'Electric Basses',
    instrumentType: 'soundfont',
    gmProgram: 36,
  },
  {
    id: 'synth-bass',
    name: 'Synth Bass',
    category: 'Electric Basses',
    instrumentType: 'soundfont',
    gmProgram: 38,
  },
  {
    id: 'upright-bass',
    name: 'Upright Bass',
    category: 'Electric Basses',
    instrumentType: 'soundfont',
    gmProgram: 32,
  },

  // Guitars
  {
    id: 'acoustic-guitar',
    name: 'Acoustic Guitar',
    category: 'Guitars',
    instrumentType: 'soundfont',
    gmProgram: 25,
  },
  {
    id: 'clean-electric',
    name: 'Clean Electric',
    category: 'Guitars',
    instrumentType: 'soundfont',
    gmProgram: 27,
  },
  {
    id: 'distorted-guitar',
    name: 'Distorted Guitar',
    category: 'Guitars',
    instrumentType: 'soundfont',
    gmProgram: 30,
  },
  {
    id: 'nylon-guitar',
    name: 'Nylon Guitar',
    category: 'Guitars',
    instrumentType: 'soundfont',
    gmProgram: 24,
  },

  // Keyboards
  {
    id: 'grand-piano',
    name: 'Grand Piano',
    category: 'Keyboards',
    instrumentType: 'piano-sampler',
  },
  {
    id: 'studio-grand',
    name: 'Studio Grand',
    category: 'Keyboards',
    instrumentType: 'piano-sampler',
  },
  {
    id: 'harpsichord',
    name: 'Harpsichord',
    category: 'Keyboards',
    instrumentType: 'soundfont',
    gmProgram: 6,
  },
  {
    id: 'honky-tonk',
    name: 'Honky Tonk Piano',
    category: 'Keyboards',
    instrumentType: 'soundfont',
    gmProgram: 3,
  },
  { id: 'hyperbrite-piano', name: 'Hyperbrite Piano', category: 'Keyboards' },
  { id: 'lofi-piano', name: 'Lofi Piano', category: 'Keyboards' },
  {
    id: 'mellow-ep',
    name: 'Mellow EP',
    category: 'Keyboards',
    instrumentType: 'electric-piano',
  },
  {
    id: 'rhodes',
    name: 'Rhodes',
    category: 'Keyboards',
    instrumentType: 'electric-piano',
  },
  {
    id: 'wurlitzer',
    name: 'Wurlitzer',
    category: 'Keyboards',
    instrumentType: 'electric-piano',
  },

  // Leads
  { id: 'analog-lead', name: 'Analog Lead', category: 'Leads' },
  { id: 'bright-lead', name: 'Bright Lead', category: 'Leads' },
  { id: 'pluck-lead', name: 'Pluck Lead', category: 'Leads' },
  { id: 'square-lead', name: 'Square Lead', category: 'Leads' },

  // Organs
  {
    id: 'church-organ',
    name: 'Church Organ',
    category: 'Organs',
    instrumentType: 'organ',
  },
  {
    id: 'hammond-b3',
    name: 'Hammond B3',
    category: 'Organs',
    instrumentType: 'organ',
  },
  {
    id: 'jazz-organ',
    name: 'Jazz Organ',
    category: 'Organs',
    instrumentType: 'organ',
  },

  // Pads
  { id: 'ambient-pad', name: 'Ambient Pad', category: 'Pads' },
  { id: 'choir-pad', name: 'Choir Pad', category: 'Pads' },
  { id: 'warm-pad', name: 'Warm Pad', category: 'Pads' },
  { id: 'shimmer-pad', name: 'Shimmer Pad', category: 'Pads' },

  // Percussion
  { id: 'bongos', name: 'Bongos', category: 'Percussion' },
  { id: 'congas', name: 'Congas', category: 'Percussion' },
  { id: 'shaker', name: 'Shaker', category: 'Percussion' },
  { id: 'tambourine', name: 'Tambourine', category: 'Percussion' },

  // Strings
  { id: 'cello', name: 'Cello', category: 'Strings', instrumentType: 'cello' },
  {
    id: 'string-ensemble',
    name: 'String Ensemble',
    category: 'Strings',
    instrumentType: 'soundfont',
    gmProgram: 48,
  },
  {
    id: 'violin',
    name: 'Violin',
    category: 'Strings',
    instrumentType: 'soundfont',
    gmProgram: 40,
  },
  {
    id: 'pizzicato',
    name: 'Pizzicato Strings',
    category: 'Strings',
    instrumentType: 'soundfont',
    gmProgram: 45,
  },
];

/** Get presets filtered by category */
export function getPresetsByCategory(category: string): Preset[] {
  return PRESETS.filter((p) => p.category === category);
}

/** Search presets by name (case-insensitive) */
export function searchPresets(query: string): Preset[] {
  const lower = query.toLowerCase();
  return PRESETS.filter((p) => p.name.toLowerCase().includes(lower));
}
