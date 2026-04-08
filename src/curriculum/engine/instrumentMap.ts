/**
 * Phase 30 — Genre-Specific Instrument Sounds.
 *
 * Maps genres to appropriate instrument sounds for authentic-sounding
 * backing tracks during play-along. Initially uses Tone.js synth
 * configurations per genre; can later be upgraded to sampled instruments.
 */

import type { CurriculumGenreId } from '../bridge/genreIdMap';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InstrumentConfig {
  /** Tone.js oscillator type */
  oscillator: 'sine' | 'triangle' | 'square' | 'sawtooth';
  /** Attack time (seconds) */
  attack: number;
  /** Decay time */
  decay: number;
  /** Sustain level (0-1) */
  sustain: number;
  /** Release time */
  release: number;
  /** Volume in dB */
  volume: number;
}

export interface GenreInstrumentSet {
  /** Chord instrument config */
  chords: InstrumentConfig;
  /** Bass instrument config */
  bass: InstrumentConfig;
  /** Melody instrument config */
  melody: InstrumentConfig;
  /** Description of the intended sound */
  description: string;
}

// ---------------------------------------------------------------------------
// Instrument presets
// ---------------------------------------------------------------------------

const PIANO: InstrumentConfig = {
  oscillator: 'triangle',
  attack: 0.005,
  decay: 0.3,
  sustain: 0.4,
  release: 0.8,
  volume: -10,
};

const RHODES: InstrumentConfig = {
  oscillator: 'sine',
  attack: 0.01,
  decay: 0.4,
  sustain: 0.5,
  release: 1.0,
  volume: -8,
};

const ORGAN: InstrumentConfig = {
  oscillator: 'square',
  attack: 0.01,
  decay: 0.1,
  sustain: 0.8,
  release: 0.3,
  volume: -12,
};

const SYNTH_PAD: InstrumentConfig = {
  oscillator: 'sawtooth',
  attack: 0.1,
  decay: 0.5,
  sustain: 0.6,
  release: 1.2,
  volume: -14,
};

const ELECTRIC_BASS: InstrumentConfig = {
  oscillator: 'triangle',
  attack: 0.01,
  decay: 0.2,
  sustain: 0.6,
  release: 0.3,
  volume: -6,
};

const UPRIGHT_BASS: InstrumentConfig = {
  oscillator: 'sine',
  attack: 0.02,
  decay: 0.3,
  sustain: 0.5,
  release: 0.5,
  volume: -6,
};

const SYNTH_BASS: InstrumentConfig = {
  oscillator: 'sawtooth',
  attack: 0.005,
  decay: 0.15,
  sustain: 0.4,
  release: 0.2,
  volume: -8,
};

const CLEAN_LEAD: InstrumentConfig = {
  oscillator: 'sine',
  attack: 0.01,
  decay: 0.2,
  sustain: 0.6,
  release: 0.4,
  volume: -10,
};

const SYNTH_LEAD: InstrumentConfig = {
  oscillator: 'sawtooth',
  attack: 0.005,
  decay: 0.1,
  sustain: 0.7,
  release: 0.3,
  volume: -12,
};

// ---------------------------------------------------------------------------
// Genre → Instrument map
// ---------------------------------------------------------------------------

export const GENRE_INSTRUMENT_MAP: Record<
  CurriculumGenreId,
  GenreInstrumentSet
> = {
  POP: {
    chords: PIANO,
    bass: SYNTH_BASS,
    melody: CLEAN_LEAD,
    description: 'Acoustic piano, synth bass, clean lead',
  },
  ROCK: {
    chords: { ...PIANO, sustain: 0.3 },
    bass: ELECTRIC_BASS,
    melody: { ...SYNTH_LEAD, oscillator: 'square' },
    description: 'Electric piano, electric bass, overdriven lead',
  },
  'HIP HOP': {
    chords: SYNTH_PAD,
    bass: SYNTH_BASS,
    melody: SYNTH_LEAD,
    description: 'Synth pad, 808 bass, synth lead',
  },
  'JAM BAND': {
    chords: ORGAN,
    bass: ELECTRIC_BASS,
    melody: CLEAN_LEAD,
    description: 'Hammond organ, electric bass, clean guitar',
  },
  FUNK: {
    chords: { ...ORGAN, sustain: 0.5, volume: -10 },
    bass: { ...ELECTRIC_BASS, attack: 0.005 },
    melody: SYNTH_LEAD,
    description: 'Clavinet, slap bass, synth lead',
  },
  'NEO SOUL': {
    chords: RHODES,
    bass: ELECTRIC_BASS,
    melody: { ...RHODES, volume: -10 },
    description: 'Rhodes piano, electric bass, Rhodes lead',
  },
  JAZZ: {
    chords: RHODES,
    bass: UPRIGHT_BASS,
    melody: { ...CLEAN_LEAD, oscillator: 'triangle' },
    description: 'Rhodes/piano, upright bass, muted trumpet',
  },
  'R&B': {
    chords: RHODES,
    bass: ELECTRIC_BASS,
    melody: CLEAN_LEAD,
    description: 'Rhodes, electric bass, smooth lead',
  },
  LATIN: {
    chords: PIANO,
    bass: ELECTRIC_BASS,
    melody: CLEAN_LEAD,
    description: 'Piano, bass guitar, flute-like lead',
  },
  BLUES: {
    chords: PIANO,
    bass: UPRIGHT_BASS,
    melody: { ...CLEAN_LEAD, release: 0.6 },
    description: 'Piano, upright bass, expressive lead',
  },
  FOLK: {
    chords: { ...PIANO, attack: 0.02 },
    bass: UPRIGHT_BASS,
    melody: CLEAN_LEAD,
    description: 'Acoustic piano, upright bass, clean lead',
  },
  ELECTRONIC: {
    chords: SYNTH_PAD,
    bass: SYNTH_BASS,
    melody: SYNTH_LEAD,
    description: 'Synth pad, synth bass, synth lead',
  },
  AFRICAN: {
    chords: { ...PIANO, oscillator: 'sine', volume: -8 },
    bass: ELECTRIC_BASS,
    melody: { ...CLEAN_LEAD, oscillator: 'sine' },
    description: 'Kalimba/marimba, acoustic bass, flute',
  },
  REGGAE: {
    chords: ORGAN,
    bass: ELECTRIC_BASS,
    melody: { ...CLEAN_LEAD, oscillator: 'sine' },
    description: 'Organ skank, bass guitar, melodica',
  },
};

/**
 * Get the instrument configuration for a genre.
 */
export function getGenreInstruments(
  genre: CurriculumGenreId,
): GenreInstrumentSet {
  return GENRE_INSTRUMENT_MAP[genre];
}
