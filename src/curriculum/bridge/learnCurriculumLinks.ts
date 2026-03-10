/**
 * Phase 27 — Learn ↔ Curriculum Cross-Links.
 *
 * Bidirectional mapping between the Learn module (theory/modes) and
 * the Curriculum module (genre application). Students who learn a mode
 * can see where to apply it; students in a genre can see relevant theory.
 */

import type { CurriculumLevelId } from '../types/curriculum';
import type { CurriculumGenreId } from './genreIdMap';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GenreForMode {
  genre: CurriculumGenreId;
  level: CurriculumLevelId;
  description: string;
}

export interface ModeForGenre {
  mode: string;
  usage: string;
}

// ---------------------------------------------------------------------------
// Mode → Genre mappings
// ---------------------------------------------------------------------------

/**
 * Maps a scale/mode name to the genres and levels where it's used.
 * Data sourced from GCM scale parameters per genre/level.
 */
const MODE_TO_GENRES: Record<string, GenreForMode[]> = {
  ionian: [
    {
      genre: 'POP',
      level: 'L1',
      description: 'Major scale melodies and chord progressions',
    },
    { genre: 'ROCK', level: 'L1', description: 'Major key rock songwriting' },
    { genre: 'FOLK', level: 'L1', description: 'Traditional folk melodies' },
  ],
  dorian: [
    { genre: 'JAZZ', level: 'L1', description: 'ii chord soloing and comping' },
    {
      genre: 'FUNK',
      level: 'L2',
      description: 'Dorian groove with blues inflections',
    },
    { genre: 'NEO SOUL', level: 'L1', description: 'Dorian Rhodes voicings' },
  ],
  mixolydian: [
    {
      genre: 'BLUES',
      level: 'L1',
      description: 'Dominant 7th blues progressions',
    },
    { genre: 'JAZZ', level: 'L2', description: 'V chord approach patterns' },
    { genre: 'FUNK', level: 'L1', description: 'Dominant funk grooves' },
    { genre: 'JAM BAND', level: 'L1', description: 'Extended mixolydian jams' },
  ],
  aeolian: [
    { genre: 'ROCK', level: 'L2', description: 'Minor key rock and metal' },
    { genre: 'POP', level: 'L2', description: 'Minor pop ballads' },
    {
      genre: 'ELECTRONIC',
      level: 'L1',
      description: 'Dark electronic atmospheres',
    },
  ],
  phrygian: [
    {
      genre: 'LATIN',
      level: 'L2',
      description: 'Flamenco-influenced progressions',
    },
    { genre: 'JAZZ', level: 'L3', description: 'Modal jazz exploration' },
  ],
  lydian: [
    { genre: 'JAZZ', level: 'L3', description: 'Lydian chromatic concept' },
    { genre: 'POP', level: 'L3', description: 'Bright, floating chord colors' },
  ],
  pentatonicMajor: [
    { genre: 'POP', level: 'L1', description: 'Simple pop melodies' },
    { genre: 'FOLK', level: 'L1', description: 'Folk melody traditions' },
    {
      genre: 'AFRICAN',
      level: 'L1',
      description: 'West African melodic patterns',
    },
  ],
  pentatonicMinor: [
    { genre: 'ROCK', level: 'L1', description: 'Rock and blues riffs' },
    { genre: 'BLUES', level: 'L1', description: 'Blues soloing foundation' },
    { genre: 'HIP-HOP', level: 'L1', description: 'Hip-hop melodic motifs' },
  ],
  blues: [
    { genre: 'BLUES', level: 'L1', description: 'Core blues expression' },
    { genre: 'ROCK', level: 'L2', description: 'Blues-rock lead playing' },
    { genre: 'FUNK', level: 'L2', description: 'Funky blues inflections' },
  ],
  harmonicMinor: [
    { genre: 'JAZZ', level: 'L3', description: 'V7b9 and diminished patterns' },
    {
      genre: 'LATIN',
      level: 'L3',
      description: 'Spanish/Sephardic influences',
    },
  ],
};

// ---------------------------------------------------------------------------
// Genre → Mode mappings
// ---------------------------------------------------------------------------

const GENRE_TO_MODES: Record<string, ModeForGenre[]> = {
  'POP:L1': [
    { mode: 'ionian', usage: 'Major key melodies' },
    { mode: 'pentatonicMajor', usage: 'Simple vocal melodies' },
  ],
  'POP:L2': [
    { mode: 'aeolian', usage: 'Minor pop songs' },
    { mode: 'mixolydian', usage: 'IV-I cadence feel' },
  ],
  'ROCK:L1': [
    { mode: 'pentatonicMinor', usage: 'Rock riffs and solos' },
    { mode: 'ionian', usage: 'Major rock songwriting' },
  ],
  'ROCK:L2': [
    { mode: 'aeolian', usage: 'Minor key rock' },
    { mode: 'blues', usage: 'Blues-rock leads' },
  ],
  'JAZZ:L1': [
    { mode: 'dorian', usage: 'ii chord soloing' },
    { mode: 'mixolydian', usage: 'V chord patterns' },
  ],
  'JAZZ:L2': [
    { mode: 'dorian', usage: 'Extended ii-V-I lines' },
    { mode: 'mixolydian', usage: 'Dominant approach' },
    { mode: 'lydian', usage: 'maj7#11 color' },
  ],
  'JAZZ:L3': [
    { mode: 'lydian', usage: 'Lydian chromatic concept' },
    { mode: 'phrygian', usage: 'Modal interchange' },
    { mode: 'harmonicMinor', usage: 'V7b9 diminished patterns' },
  ],
  'BLUES:L1': [
    { mode: 'blues', usage: 'Blues scale soloing' },
    { mode: 'mixolydian', usage: 'Dominant chord voicings' },
    { mode: 'pentatonicMinor', usage: 'Foundation pentatonic' },
  ],
  'FUNK:L1': [
    { mode: 'mixolydian', usage: 'Dominant funk grooves' },
    { mode: 'dorian', usage: 'Minor funk progressions' },
  ],
  'FUNK:L2': [
    { mode: 'dorian', usage: 'Dorian clavinet patterns' },
    { mode: 'blues', usage: 'Funky blues licks' },
  ],
  'NEO SOUL:L1': [{ mode: 'dorian', usage: 'Rhodes voicings' }],
  'REGGAE:L1': [
    { mode: 'ionian', usage: 'Major reggae progressions' },
    { mode: 'mixolydian', usage: 'One-drop grooves' },
  ],
  'LATIN:L1': [{ mode: 'ionian', usage: 'Salsa and bossa nova' }],
  'LATIN:L2': [{ mode: 'phrygian', usage: 'Flamenco influences' }],
  'AFRICAN:L1': [
    { mode: 'pentatonicMajor', usage: 'West African melodic patterns' },
  ],
  'ELECTRONIC:L1': [
    { mode: 'aeolian', usage: 'Dark synth atmospheres' },
    { mode: 'dorian', usage: 'Uplifting house progressions' },
  ],
  'HIP-HOP:L1': [
    { mode: 'pentatonicMinor', usage: 'Melodic motifs and hooks' },
    { mode: 'aeolian', usage: 'Minor key beats' },
  ],
  'FOLK:L1': [
    { mode: 'ionian', usage: 'Traditional folk songs' },
    { mode: 'pentatonicMajor', usage: 'Simple folk melodies' },
    { mode: 'mixolydian', usage: 'Modal folk tunes' },
  ],
  'JAM BAND:L1': [
    { mode: 'mixolydian', usage: 'Extended jamming' },
    { mode: 'dorian', usage: 'Minor groove explorations' },
  ],
  'R&B:L1': [
    { mode: 'dorian', usage: 'Smooth R&B progressions' },
    { mode: 'aeolian', usage: 'Slow jam minor keys' },
  ],
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get genres that use a specific mode/scale.
 */
export function getGenresForMode(mode: string): GenreForMode[] {
  return MODE_TO_GENRES[mode] ?? [];
}

/**
 * Get modes/scales used in a specific genre/level combination.
 */
export function getModesForGenreLevel(
  genre: CurriculumGenreId,
  level: CurriculumLevelId,
): ModeForGenre[] {
  const key = `${genre}:${level}`;
  return GENRE_TO_MODES[key] ?? [];
}

/**
 * Get all modes that have genre associations.
 */
export function getAllLinkedModes(): string[] {
  return Object.keys(MODE_TO_GENRES);
}
