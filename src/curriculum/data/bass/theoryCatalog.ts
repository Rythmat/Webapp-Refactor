// ── Bass Theory: the catalog ──────────────────────────────────────────────
// Every Learn → Theory tile bass can teach: guitar's catalog (the same
// slugs, families, engine keys and titles, since a bass center is a guitar
// center played on bass) with bass's own progress ids. Names only, no lesson
// data, so the Learn hub can import it cheaply.
//
// A family goes live by joining LIVE_BASS_FAMILIES; until then its tiles
// read "Coming soon for bass" and its URLs go back to Theory.

import {
  GUITAR_THEORY_CATALOG,
  type GuitarTheoryEntry,
} from '@/curriculum/data/guitar/theoryCatalog';
import type { GuitarScaleFamily } from '@/curriculum/data/guitar/types';

export type BassTheoryEntry = GuitarTheoryEntry;

/** Every Theory tile bass can teach, family by family. */
export const BASS_THEORY_CATALOG: readonly BassTheoryEntry[] =
  GUITAR_THEORY_CATALOG.map((entry) => ({
    ...entry,
    // Saved progress lives under these; never rename one.
    genre:
      entry.family === 'pentatonic-blues'
        ? `bass-scale-${entry.key}`
        : `bass-mode-${entry.key}`,
  }));

/** The families with bass lessons today: all of Theory, as on guitar. */
export const LIVE_BASS_FAMILIES: ReadonlySet<GuitarScaleFamily> = new Set([
  'diatonic',
  'pentatonic-blues',
  'harmonic-minor',
  'melodic-minor',
  'harmonic-major',
  'double-harmonic',
]);

const BY_SLUG = new Map(BASS_THEORY_CATALOG.map((e) => [e.slug, e]));
const BY_KEY = new Map<string, BassTheoryEntry>(
  BASS_THEORY_CATALOG.map((e) => [e.key, e]),
);

/** A live tile's entry by its slug ('ionian#5'), or undefined. */
export function bassTheoryEntry(
  slug: string | undefined,
): BassTheoryEntry | undefined {
  const entry = BY_SLUG.get(slug ?? '');
  return entry && LIVE_BASS_FAMILIES.has(entry.family) ? entry : undefined;
}

/** Whether a Theory slug has bass lessons today. */
export function isBassTheorySlug(slug: string | undefined): boolean {
  return bassTheoryEntry(slug) !== undefined;
}

/** Any scale's bass entry by its engine key, live or not. */
export function bassScaleEntry(key: string): BassTheoryEntry {
  const entry = BY_KEY.get(key);
  if (!entry) throw new Error(`Unknown bass scale "${key}"`);
  return entry;
}
