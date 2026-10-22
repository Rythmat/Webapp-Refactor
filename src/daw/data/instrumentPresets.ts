// ── Instrument Preset Catalog ────────────────────────────────────────────
// Static catalog of instrument presets organized by category.
//
// Every preset names a sound of its own: picking it switches the track's
// instrument (and GM program), and no two presets share one. Presets that only
// renamed the track are not listed until they map to a real sound — the 808s,
// Natural, the Drum Pads, Hyperbrite and Lofi Piano, the Leads, the Pads and
// the Percussion — nor are those that duplicated another preset's sound: Grand
// Piano (Studio Grand), Rhodes and Wurlitzer (Mellow EP), Hammond B3 and Jazz
// Organ (Church Organ). Every preset is an Instruments track's sound
// (SoundFont) or another Studio track type's since the sampled piano,
// electric piano, organ, bass, guitar and cello tracks went (2026-10-22):
// those presets play their General MIDI instrument now.

import type { InstrumentType } from '@/daw/store/tracksSlice';

export interface Preset {
  id: string;
  name: string;
  category: string;
  /** The instrument selecting this preset switches the track to. */
  instrumentType: InstrumentType;
  /** GM program number (0-127) for SoundFont presets. */
  gmProgram?: number;
}

export const PRESETS: Preset[] = [
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
    id: 'studio-grand',
    name: 'Grand Piano',
    category: 'Keyboards',
    instrumentType: 'soundfont',
    gmProgram: 0,
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
  {
    id: 'mellow-ep',
    name: 'Electric Piano',
    category: 'Keyboards',
    instrumentType: 'soundfont',
    gmProgram: 4,
  },

  // Organs
  {
    id: 'church-organ',
    name: 'Church Organ',
    category: 'Organs',
    instrumentType: 'soundfont',
    gmProgram: 19,
  },
  {
    id: 'drawbar-organ',
    name: 'Drawbar Organ',
    category: 'Organs',
    instrumentType: 'soundfont',
    gmProgram: 16,
  },

  // Strings
  {
    id: 'cello',
    name: 'Cello',
    category: 'Strings',
    instrumentType: 'soundfont',
    gmProgram: 42,
  },
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

/**
 * The browser's categories, A to Z: built from the presets so it never offers
 * an empty category.
 */
export const PRESET_CATEGORIES: readonly string[] = [
  ...new Set(PRESETS.map((p) => p.category)),
].sort((a, b) => a.localeCompare(b));

/** Get presets filtered by category */
export function getPresetsByCategory(category: string): Preset[] {
  return PRESETS.filter((p) => p.category === category);
}

/** Search presets by name (case-insensitive) */
export function searchPresets(query: string): Preset[] {
  const lower = query.toLowerCase();
  return PRESETS.filter((p) => p.name.toLowerCase().includes(lower));
}
