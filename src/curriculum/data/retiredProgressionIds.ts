/**
 * Chord progression ids that have been retired, each mapped to the id that
 * took its place.
 *
 * A progression's id is never reused (see `progressionIdMark.ts`), but a
 * progression can be retired: when two entries turn out to be the same
 * progression, one keeps its id and the other is removed from the library.
 * Anything that stored the removed id before then still holds it. UNISON
 * keeps the ids of the progressions it matched in its analysis
 * (`ProgressionMatchResult.libraryId`), and a saved project or an exported
 * analysis can carry one for as long as the file exists; a console link,
 * bookmark or review note can name one too. Every lookup that might be
 * handed an old id reads it through `resolveProgressionId`, so it lands on
 * the progression that carries on, never on nothing, and never on whatever
 * a reused id would have pointed at.
 *
 * The entries here are permanent: a retired id stays retired, and the map
 * only grows. When a kept id is itself retired later, add its own line and
 * leave the older line as it is; `resolveProgressionId` follows the chain.
 *
 * The first eight came from the owner's decision of 1 October 2026 (Q8 of
 * the sheet import, Amendment 8): eight pairs of entries with the same
 * chords, each merged into its lower id, which kept the union of both
 * entries' vibes and styles. None of the eight retired ids had a song link.
 *
 * This file imports nothing, so the console's eager routes and UNISON can
 * read it without pulling in the library.
 */
export const RETIRED_PROGRESSION_IDS: Readonly<Record<number, number>> =
  Object.freeze({
    // 1 major7 - 3 minor7 - 4 minor6 - b2 major7
    152: 151,
    // 2 minor - 1 major - 5 major - 4 major
    481: 475,
    // 2 minor - 3 minor - 4 major - 4 minor
    494: 485,
    // 2 minor - 3 minor - 4 major - 2 minor
    495: 486,
    // 2 minor - 3 minor - 5 major - 1 major
    496: 487,
    // 2 minor - 3 minor - 5 major - 6 minor
    497: 488,
    // 2 minor - 3 minor - 6 minor - 5 major
    498: 489,
    // 2 minor - 5 major - 1 major - 6 major
    515: 510,
  });

/** Whether `id` names a progression that has been retired. */
export function isRetiredProgressionId(id: number): boolean {
  return Object.prototype.hasOwnProperty.call(RETIRED_PROGRESSION_IDS, id);
}

/**
 * The id a progression goes by now: `id` itself, or, for a retired id, the
 * id that took its place, following a chain of retirements to its end. A
 * chain that loops (which the map's own test rules out) stops where it
 * would repeat, so this always returns.
 */
export function resolveProgressionId(id: number): number {
  let current = id;
  const seen = new Set<number>();
  while (isRetiredProgressionId(current) && !seen.has(current)) {
    seen.add(current);
    current = RETIRED_PROGRESSION_IDS[current];
  }
  return current;
}

/**
 * A progression's id written as text (a URL segment, a table row key, a
 * repo slug), resolved as `resolveProgressionId` does. Anything that is not
 * a whole number comes back as it was.
 */
export function resolveProgressionSlug(slug: string): string {
  if (!/^\d+$/.test(slug)) return slug;
  const id = Number(slug);
  const resolved = resolveProgressionId(id);
  return resolved === id ? slug : String(resolved);
}

/**
 * The entry for `id` among `entries`, reading a retired id as the one that
 * took its place. For code holding a list it loaded itself (the library is
 * lazy-loaded, `loaders.ts`).
 */
export function findProgressionById<T extends { id: number }>(
  entries: readonly T[],
  id: number,
): T | undefined {
  const resolved = resolveProgressionId(id);
  return entries.find((entry) => entry.id === resolved);
}
