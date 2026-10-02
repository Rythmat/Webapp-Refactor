/**
 * Reading what someone typed into a year, a span of years or a pair of
 * coordinates: the rules the record editors check their inputs by, apart
 * from the editors themselves so the Table's cells can read a typed value
 * the same way without loading a single form (`shared.tsx` re-exports
 * them for the editors).
 *
 * Pure: no React, no imports.
 */

/** A year typed into a number input: blank (or not a number) is absent. */
export const optionalYear = (raw: string): number | undefined => {
  if (!raw.trim()) return undefined;
  const year = Number(raw);
  return Number.isFinite(year) ? Math.trunc(year) : undefined;
};

/** A span that ends before it starts: closed before it opened. */
export const yearsBackwards = (from?: number, to?: number): boolean =>
  from !== undefined && to !== undefined && to < from;

/**
 * `[lat, lng]` from its two halves as typed, or undefined until both read
 * as coordinates: a latitude from −90 to 90 and a longitude from −180 to
 * 180. A half left blank is no pair at all.
 */
export const parseCoordinates = ([lat, lng]: readonly [string, string]):
  | [number, number]
  | undefined => {
  if (!lat.trim() || !lng.trim()) return undefined;
  const a = Number(lat);
  const b = Number(lng);
  return Number.isFinite(a) &&
    Number.isFinite(b) &&
    Math.abs(a) <= 90 &&
    Math.abs(b) <= 180
    ? [a, b]
    : undefined;
};
