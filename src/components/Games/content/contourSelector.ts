/**
 * Selects melody contours from Prism data for game use.
 *
 * Contours are number[][] where each sub-array is a sequence of
 * scale-degree offsets (e.g., [0, 2, 4, 2, 0] = up a third, up a fifth, back down).
 */

/** Filter contours by note count range */
export function filterContoursByLength(
  contours: number[][],
  minNotes: number,
  maxNotes: number,
): number[][] {
  return contours.filter((c) => c.length >= minNotes && c.length <= maxNotes);
}

/** Pick a random contour from the filtered set */
export function pickRandomContour(contours: number[][]): number[] | null {
  if (contours.length === 0) return null;
  return contours[Math.floor(Math.random() * contours.length)];
}

/** Pick N random contours without replacement */
export function pickRandomContours(
  contours: number[][],
  count: number,
): number[][] {
  const shuffled = [...contours].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Map a contour (scale-degree offsets) onto actual MIDI notes
 * given a scale (sorted array of MIDI notes).
 */
export function contourToMidi(
  contour: number[],
  scale: number[],
  startIndex = 0,
): number[] {
  return contour.map((offset) => {
    const idx =
      (((startIndex + offset) % scale.length) + scale.length) % scale.length;
    return scale[idx];
  });
}

/**
 * Extract contours from the raw Prism API response (loosely typed as `object`).
 * Mirrors the extraction pattern used in ActivityFlow.tsx.
 */
export function extractContours(value: unknown): number[][] {
  if (!value) return [];
  const results: number[][] = [];

  const isNumberArray = (v: unknown): v is number[] =>
    Array.isArray(v) && v.length > 0 && v.every((x) => typeof x === 'number');

  const inspect = (collection: unknown) => {
    if (!Array.isArray(collection)) return;
    collection.forEach((item) => {
      if (isNumberArray(item)) {
        results.push(item);
      } else if (Array.isArray(item)) {
        inspect(item);
      }
    });
  };

  if (typeof value === 'object' && value !== null) {
    Object.values(value).forEach((v) => {
      if (isNumberArray(v)) results.push(v);
      else if (Array.isArray(v)) inspect(v);
      else if (typeof v === 'object' && v !== null) {
        Object.values(v).forEach((nested) => {
          if (isNumberArray(nested)) results.push(nested);
          else if (Array.isArray(nested)) inspect(nested);
        });
      }
    });
  }

  return results;
}
