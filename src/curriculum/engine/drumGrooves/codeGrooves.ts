/**
 * The grooves that exist as code (backingPatterns.ts, hipHop/hipHopPatterns.ts)
 * — what a step's `grooveId` could already name before the designer. Pickers
 * list them beside designed grooves; a designed groove with the same id
 * replaces one once published.
 */

import { HIPHOP_DRUMS } from '../genreGeneration/hipHop/hipHopPatterns';

export interface CodeGroove {
  id: string;
  label: string;
  genre: string;
}

export const CODE_GROOVES: readonly CodeGroove[] = [
  { id: 'groove_funk_01', label: 'Funk 01 — phrase engine', genre: 'funk' },
  { id: 'groove_funk_02', label: 'Funk 02 — AWB / Kool', genre: 'funk' },
  { id: 'groove_funk_03', label: 'Funk 03', genre: 'funk' },
  { id: 'groove_funk_04', label: 'Funk 04', genre: 'funk' },
  { id: 'groove_funk_05', label: 'Funk 05', genre: 'funk' },
  { id: 'groove_funk_06', label: 'Funk 06', genre: 'funk' },
  { id: 'groove_pop_01', label: 'Pop 01', genre: 'pop' },
  { id: 'groove_ballad_01', label: 'Pop ballad 01', genre: 'pop' },
  ...Object.values(HIPHOP_DRUMS).map((p) => ({
    id: p.id,
    label: `Hip Hop — ${p.name}`,
    genre: 'hip-hop',
  })),
];

/**
 * A designed groove with this id, once published, replaces the rock .mid every
 * Theory Practice Track plays — its hits, kit, swing and tempo.
 */
export const THEORY_PRACTICE_GROOVE_ID = 'theory_practice_track';
