// ── Ukulele Theory: the catalog ──────────────────────────────────────────────
// Every Learn → Theory tile ukulele can teach: guitar's catalog (the same
// slugs, families, engine keys and titles, since a ukulele center is a guitar
// center played on ukulele) with ukulele's own progress ids. Names only, no lesson
// data, so the Learn hub can import it cheaply.
//
// A family goes live by joining LIVE_UKULELE_FAMILIES; until then its tiles
// read "Coming soon for ukulele" and its URLs go back to Theory.

import {
  GUITAR_THEORY_CATALOG,
  type GuitarTheoryEntry,
} from '@/curriculum/data/guitar/theoryCatalog';
import type { GuitarScaleFamily } from '@/curriculum/data/guitar/types';

export type UkuleleTheoryEntry = GuitarTheoryEntry;

/** Every Theory tile ukulele can teach, family by family. */
export const UKULELE_THEORY_CATALOG: readonly UkuleleTheoryEntry[] =
  GUITAR_THEORY_CATALOG.map((entry) => ({
    ...entry,
    // Saved progress lives under these; never rename one.
    genre:
      entry.family === 'pentatonic-blues'
        ? `ukulele-scale-${entry.key}`
        : `ukulele-mode-${entry.key}`,
  }));

/** The families with ukulele lessons today: all of Theory, as on guitar. */
export const LIVE_UKULELE_FAMILIES: ReadonlySet<GuitarScaleFamily> = new Set([
  'diatonic',
  'pentatonic-blues',
  'harmonic-minor',
  'melodic-minor',
  'harmonic-major',
  'double-harmonic',
]);

const BY_SLUG = new Map(UKULELE_THEORY_CATALOG.map((e) => [e.slug, e]));
const BY_KEY = new Map<string, UkuleleTheoryEntry>(
  UKULELE_THEORY_CATALOG.map((e) => [e.key, e]),
);

/** A live tile's entry by its slug ('ionian#5'), or undefined. */
export function ukuleleTheoryEntry(
  slug: string | undefined,
): UkuleleTheoryEntry | undefined {
  const entry = BY_SLUG.get(slug ?? '');
  return entry && LIVE_UKULELE_FAMILIES.has(entry.family) ? entry : undefined;
}

/** Whether a Theory slug has ukulele lessons today. */
export function isUkuleleTheorySlug(slug: string | undefined): boolean {
  return ukuleleTheoryEntry(slug) !== undefined;
}

/** Any scale's ukulele entry by its engine key, live or not. */
export function ukuleleScaleEntry(key: string): UkuleleTheoryEntry {
  const entry = BY_KEY.get(key);
  if (!entry) throw new Error(`Unknown ukulele scale "${key}"`);
  return entry;
}
