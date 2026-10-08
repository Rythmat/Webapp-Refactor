import {
  GENRE_MAP,
  GENRE_STRUM,
  GENRE_SWING,
  type StrumMode,
} from '@prism/engine';
import type { PrismSlice } from './prismSlice';

// ── A genre's Prism settings ─────────────────────────────────────────────
// What choosing a genre sets in Prism: its swing, its strum, and a rhythm
// drawn from the genre's own. Picking a genre in Prism (selectGenre) and
// opening a project template (which names a genre) both take them from here.
// No store import, so the slices can share it.

/** Map STUDIO_GENRES to GENRE_MAP genre names for rhythm lookup */
const GENRE_RHYTHM_ALIAS: Record<string, string[]> = {
  Rock: ['Rock'],
  Folk: ['Folk'],
  EDM: ['Electronic', 'Pop'],
  'R&B': ['R&B', 'Neo Soul'],
  'Hip Hop': ['Hip Hop'],
  Reggae: ['Reggae'],
  Indie: ['Pop', 'Rock'],
  Latin: ['Salsa', 'Bossa', 'Samba'],
};

/** Extra weight for certain rhythms (added N extra times to the pool) */
const RHYTHM_WEIGHT: Record<string, number> = {
  'Whole Notes': 4,
};

function findRandomRhythmForGenre(genre: string): string | undefined {
  // Collect all rhythms matching this genre or its aliases
  const targets = GENRE_RHYTHM_ALIAS[genre] ?? [genre];
  const pool: string[] = [];
  for (const [rhythm, g] of Object.entries(GENRE_MAP)) {
    if (targets.includes(g)) pool.push(rhythm);
  }
  if (pool.length === 0) return undefined;
  // Always include Whole Notes as a weighted option for any genre
  const extra = RHYTHM_WEIGHT['Whole Notes'] ?? 0;
  for (let i = 0; i < extra; i++) pool.push('Whole Notes');
  return pool[Math.floor(Math.random() * pool.length)];
}

/** What choosing `genre` writes to the store. */
export type GenreSettings = Pick<
  PrismSlice,
  'genre' | 'swing' | 'strumMode' | 'strumAmount'
> &
  Partial<Pick<PrismSlice, 'rhythmName'>>;

/**
 * How `genre` strums, as choosing it writes the strum: the part of
 * genreSettings that draws nothing at random, for a reader that only asks
 * whether a project still strums as its genre does.
 */
export function genreStrum(
  genre: string,
): Pick<GenreSettings, 'strumMode' | 'strumAmount'> {
  const strum = GENRE_STRUM[genre] ?? { mode: 0, amount: 0 };
  return {
    // GENRE_STRUM numbers its modes from 0 (Synchronized, Down, Up, Human)
    // and StrumMode from 1, so this writes the mode one below the table's:
    // Reggae's Up is written as Down, and the Human genres (Jazz, R&B,
    // Indie) as Up. It is written as it was before 1.3, which changes no
    // sound: fixing the numbering changes what Prism Create writes after a
    // genre pick or a template opens, so it waits for 1.16.
    strumMode: strum.mode as StrumMode,
    strumAmount: strum.amount,
  };
}

/**
 * The Prism settings of `genre`: its swing and strum, and a rhythm picked at
 * random from the genre's (Whole Notes weighted in). A genre with no rhythms
 * of its own leaves the rhythm as it is, so `rhythmName` is then absent.
 */
export function genreSettings(genre: string): GenreSettings {
  const rhythm = findRandomRhythmForGenre(genre);
  const swing = GENRE_SWING[genre as keyof typeof GENRE_SWING] ?? 0;
  return {
    genre,
    swing,
    ...genreStrum(genre),
    ...(rhythm ? { rhythmName: rhythm } : {}),
  };
}
