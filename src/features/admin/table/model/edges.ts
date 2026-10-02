import type { EdgeKind } from '@/content/graph/types';

/**
 * The groups of edge kinds the Table's columns walk together.
 *
 * Every name goes through `satisfies EdgeKind`, so renaming an edge kind in
 * the graph fails to compile here rather than leaving a column that silently
 * counts nothing.
 */

/**
 * A song (or a record) and the people who made it: billed, playing on it,
 * writing, producing, engineering, arranging. What "the artists of a song"
 * means in every rollup.
 */
export const PEOPLE = [
  'performed_by',
  'features',
  'written_by',
  'produced_by',
  'engineered_by',
  'arranged_by',
] as const satisfies readonly EdgeKind[];

/**
 * How an artist's chip on a song reads when the artist did not perform it:
 * "wrote", "produced". Billed and featured artists need no word.
 */
export const PEOPLE_TAGS: Readonly<Partial<Record<EdgeKind, string>>> = {
  written_by: 'wrote',
  produced_by: 'produced',
  engineered_by: 'engineered',
  arranged_by: 'arranged',
};

/** An artist's own year: a person's birth, a group's forming. */
export const BORN_YEARS = [
  'born_year',
  'formed_year',
] as const satisfies readonly EdgeKind[];
