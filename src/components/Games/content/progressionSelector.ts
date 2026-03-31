/**
 * Selects chord progressions from Prism data for game use.
 *
 * Progressions are string[] of progression keys (e.g., "I-IV-V-I", "vi-IV-I-V").
 */

/** Parse a progression key into individual chord symbols */
export function parseProgression(key: string): string[] {
  return key.split('-').map((s) => s.trim()).filter(Boolean);
}

/** Filter progressions by chord count */
export function filterByChordCount(
  keys: string[],
  minChords: number,
  maxChords: number,
): string[] {
  return keys.filter((key) => {
    const count = parseProgression(key).length;
    return count >= minChords && count <= maxChords;
  });
}

/** Pick a random progression key */
export function pickRandomProgression(keys: string[]): string | null {
  if (keys.length === 0) return null;
  return keys[Math.floor(Math.random() * keys.length)];
}

/** Pick N random progressions without replacement */
export function pickRandomProgressions(
  keys: string[],
  count: number,
): string[] {
  const shuffled = [...keys].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
