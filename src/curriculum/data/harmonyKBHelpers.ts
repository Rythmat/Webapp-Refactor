/**
 * Phase 8 — HKB query helpers.
 */

import type { HKBModeRoot, HKBChordEntry } from './harmonyKB';

let cache: Record<string, HKBModeRoot> | null = null;

async function getKB(): Promise<Record<string, HKBModeRoot>> {
  if (!cache) {
    const mod = await import('./harmonyKB');
    cache = mod.default;
  }
  return cache;
}

function makeKey(mode: string, root: string): string {
  return `${mode}|${root}`;
}

/** Get full HKB entry for a mode + root. */
export async function lookupModeRoot(
  mode: string,
  root: string,
): Promise<HKBModeRoot | undefined> {
  const kb = await getKB();
  return kb[makeKey(mode, root)];
}

/** Get the chord for a specific degree within a mode/root. */
export async function lookupChord(
  mode: string,
  root: string,
  degree: string,
  type: 'triad' | '7th',
): Promise<HKBChordEntry | undefined> {
  const entry = await lookupModeRoot(mode, root);
  if (!entry) return undefined;
  const chords = type === 'triad' ? entry.triads : entry.sevenths;
  return chords.find((c) => c.degree === degree);
}

/** Get all chords for a degree across all modes for a given root. */
export async function getChordsForDegree(
  root: string,
  degree: string,
  type: 'triad' | '7th',
): Promise<Array<{ mode: string } & HKBChordEntry>> {
  const kb = await getKB();
  const results: Array<{ mode: string } & HKBChordEntry> = [];
  for (const entry of Object.values(kb)) {
    if (entry.root !== root) continue;
    const chords = type === 'triad' ? entry.triads : entry.sevenths;
    const chord = chords.find((c) => c.degree === degree);
    if (chord) results.push({ mode: entry.mode, ...chord });
  }
  return results;
}

/** Get all available modes in the KB. */
export async function getAvailableModes(): Promise<string[]> {
  const kb = await getKB();
  return [...new Set(Object.values(kb).map((e) => e.mode))];
}

/** Get all available roots for a mode. */
export async function getAvailableRoots(mode: string): Promise<string[]> {
  const kb = await getKB();
  return Object.values(kb)
    .filter((e) => e.mode === mode)
    .map((e) => e.root);
}
