import { PROGRESSION_GRAPH } from '../data/progressionGraph';

/**
 * Returns the available next chords given the current sequence string and
 * a percent filter (0-1 or >1 for all).
 *
 * The sequence is trimmed before lookup. If the sequence is not found in
 * the graph, returns an empty array.
 */
export function getOptions(percent: number, sequence: string): string[] {
  const trimmed = sequence.trim();
  const chords = PROGRESSION_GRAPH[trimmed];
  if (!chords) {
    return [];
  }
  if (percent > 1) {
    return [...chords];
  }
  return chords.slice(0, Math.floor(percent * chords.length));
}

/**
 * Returns all starting chords from the progression graph.
 * These are graph keys that do NOT contain a "|" separator.
 */
export function getFirstChords(): string[] {
  const result: string[] = [];
  for (const key of Object.keys(PROGRESSION_GRAPH)) {
    if (!key.includes('|')) {
      result.push(key);
    }
  }
  return result;
}

/**
 * Returns the number of continuation options for a given sequence.
 */
export function numOptions(sequence: string): number {
  const chords = PROGRESSION_GRAPH[sequence];
  return chords ? chords.length : 0;
}

/**
 * Joins an array of chord names with "|" to form a graph key.
 */
export function graphToken(chordNames: string[]): string {
  return chordNames.join('|');
}
