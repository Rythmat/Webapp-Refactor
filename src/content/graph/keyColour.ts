import { engineModeName, keyColourOf } from '@/daw/prism-engine/data/keyColour';
import type { Graph } from './deriveGraph';
import type { EntityId } from './types';

/**
 * Which Cortex dots wear a colour (owner, 2026-11-04): only what has a key,
 * in the key's own colour, as the rest of the app gives it. A key node is the
 * tonic alone (`key:c`, Key of C, red). A song, progression or part reaches
 * its key and mode through `in_key` and `in_mode`, and takes the key centre's
 * colour (24k Magic, F minor, A♭'s indigo). Everything else is white. Pure.
 */

const LETTER_PC: Readonly<Record<string, number>> = {
  c: 0,
  d: 2,
  e: 4,
  f: 5,
  g: 7,
  a: 9,
  b: 11,
};

/** A key slug's tonic as a pitch class (`d-flat` → 1), or null. */
export function tonicPitchClass(slug: string): number | null {
  const match = /^([a-g])(?:-(flat|sharp))?$/.exec(slug.trim().toLowerCase());
  if (!match) return null;
  const shift = match[2] === 'flat' ? -1 : match[2] === 'sharp' ? 1 : 0;
  return (LETTER_PC[match[1]] + shift + 12) % 12;
}

/**
 * A key's colour from its tonic slug and, when known, its mode (`minor`,
 * `dorian`, `harmonic-minor`); null when the tonic names no key. A tonic with
 * no mode, or with one the engine doesn't know, wears its own colour.
 */
export function keyColourOfSlugs(
  tonic: string,
  mode?: string | null,
): string | null {
  const pc = tonicPitchClass(tonic);
  if (pc === null) return null;
  return keyColourOf(pc, (mode && engineModeName(mode)) || 'ionian');
}

const slugOf = (id: string) => id.slice(id.indexOf(':') + 1);

/** A graph node's key colour, or null for one with no key. */
export function graphKeyColour(graph: Graph, id: EntityId): string | null {
  if (id.startsWith('key:')) return keyColourOfSlugs(slugOf(id));
  let tonic: string | null = null;
  let mode: string | null = null;
  for (const edge of graph.adjacency.get(id) ?? []) {
    if (edge.from !== id) continue;
    if (edge.kind === 'in_key') tonic ??= slugOf(edge.to);
    else if (edge.kind === 'in_mode') mode ??= slugOf(edge.to);
  }
  return tonic ? keyColourOfSlugs(tonic, mode) : null;
}
