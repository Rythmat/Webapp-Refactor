import type { GenreName } from '../types';

/**
 * Maps each comping pattern name (from CHORD_RHYTHMS) to a genre name
 * for drum/bass groove lookup. Derived from the STYLE column in the
 * Music Atlas CMS Chord Comping sheet.
 */
export const GENRE_MAP: Record<string, GenreName> = {
  // Basic patterns
  'Whole Notes': 'Ballad',
  'Half Notes': 'Ballad',
  Quarters: 'Pop',
  Eighths: 'Pop',
  'Staccato Eighths': 'Hip Hop',
  Sixteenths: 'Pop',

  // Syncopated
  '3-3-2 Quarters': 'Rock',
  '3-3-2 Eighths': 'Rock',
  '3-3-3-3-2-2': 'Rock',

  // Jam
  'Jam 1': 'Jam Band',
  'Jam 1a': 'Jam Band',
  'Jam 1b': 'Jam Band',
  'Jam 2': 'Jam Band',
  'Jam 3 (Latin)': 'Salsa',
  'Jam 3a (Latin)': 'Salsa',

  // Jazz
  'Jazz 1': 'Jazz',
  'Jazz 1a': 'Jazz',
  'Jazz 1b': 'Jazz',
  'Jazz 2': 'Jazz',
  'Jazz 2a': 'Jazz',
  'Jazz 2b': 'Jazz',
  'Jazz 3': 'Jazz',
  'Jazz 4': 'Jazz',
  'Jazz 5': 'Jazz',
  'Jazz 5a': 'Jazz',
  'Jazz 6': 'Jazz',
  'Jazz 6a': 'Jazz',
  'Jazz 6b': 'Jazz',
  'Jazz 7': 'Jazz',
  'Jazz 7a': 'Jazz',

  // Funk
  'Funk 1': 'Funk',
  'Funk 2': 'Funk',
  'Funk 2a': 'Funk',
  'Funk 3': 'Funk',
  'Funk 3a': 'Funk',
  'Funk 3b': 'Funk',
  'Funk 3c': 'Funk',
  'Funk 4': 'Funk',
  'Funk 5': 'Funk',

  // Latin
  Bossa: 'Bossa',
  Samba: 'Samba',
};

/**
 * Per-genre swing defaults from CMS annotations.
 * Swing amount in ticks (0-60 range).
 * None=0, Little=10, Some=15, Medium=25, Heavy=40
 */
export const GENRE_SWING: Record<GenreName, number> = {
  Pop: 0,
  Rock: 0,
  'Hip Hop': 0,
  'Jam Band': 15,
  Funk: 10,
  'Neo Soul': 40,
  Jazz: 40,
  'R&B': 25,
  Salsa: 0,
  Merengue: 0,
  Bossa: 10,
  Samba: 10,
  Ballad: 0,
};

/**
 * Per-genre strum defaults.
 * mode: 0=Synchronized, 1=Down, 2=Up, 3=Human
 * amount: strum offset in ticks (0-60)
 */
export const GENRE_STRUM: Record<string, { mode: number; amount: number }> = {
  Pop: { mode: 0, amount: 0 },
  Rock: { mode: 1, amount: 20 },
  'Hip Hop': { mode: 0, amount: 0 },
  'Jam Band': { mode: 3, amount: 20 },
  Funk: { mode: 1, amount: 15 },
  'Neo Soul': { mode: 3, amount: 25 },
  Jazz: { mode: 3, amount: 30 },
  'R&B': { mode: 3, amount: 20 },
  Salsa: { mode: 1, amount: 20 },
  Merengue: { mode: 1, amount: 15 },
  Bossa: { mode: 3, amount: 20 },
  Samba: { mode: 1, amount: 25 },
  Ballad: { mode: 0, amount: 0 },
  Folk: { mode: 1, amount: 25 },
  EDM: { mode: 0, amount: 0 },
  Reggae: { mode: 2, amount: 25 },
  Latin: { mode: 1, amount: 20 },
  Indie: { mode: 3, amount: 15 },
};
