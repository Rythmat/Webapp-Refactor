/**
 * Phases 7-8 — Lazy loaders with caching.
 *
 * Large curriculum datasets are loaded on demand via dynamic import()
 * to keep the initial bundle small.  Each loader caches its result
 * so repeated calls return the same promise.
 */

import type { ChordProgressionEntry } from './chordProgressionLibrary';
import type { HKBModeRoot } from './harmonyKB';
import type { MasterRhythmEntry } from './masterRhythmLibrary';
import type { MelodyContourEntry } from './melodyContourLibrary';
import type { PhraseRhythmEntry } from './melodyPhraseRhythmLibrary';

// ---------------------------------------------------------------------------
// Cache slots
// ---------------------------------------------------------------------------
let contourCache: MelodyContourEntry[] | null = null;
let progressionCache: ChordProgressionEntry[] | null = null;
let phraseRhythmCache: PhraseRhythmEntry[] | null = null;
let masterRhythmCache: MasterRhythmEntry[] | null = null;
let harmonyKBCache: Record<string, HKBModeRoot> | null = null;

// ---------------------------------------------------------------------------
// Loaders
// ---------------------------------------------------------------------------

/** Load 690 melody contours (lazy). */
export async function loadMelodyContours(): Promise<MelodyContourEntry[]> {
  if (!contourCache) {
    const mod = await import('./melodyContourLibrary');
    contourCache = mod.default;
  }
  return contourCache;
}

/** Load 589 chord progressions (lazy). */
export async function loadChordProgressions(): Promise<
  ChordProgressionEntry[]
> {
  if (!progressionCache) {
    const mod = await import('./chordProgressionLibrary');
    progressionCache = mod.default;
  }
  return progressionCache;
}

/** Load 146 phrase rhythms (lazy). */
export async function loadPhraseRhythms(): Promise<PhraseRhythmEntry[]> {
  if (!phraseRhythmCache) {
    const mod = await import('./melodyPhraseRhythmLibrary');
    phraseRhythmCache = mod.default;
  }
  return phraseRhythmCache;
}

/** Load 83 master rhythm patterns (lazy). */
export async function loadMasterRhythms(): Promise<MasterRhythmEntry[]> {
  if (!masterRhythmCache) {
    const mod = await import('./masterRhythmLibrary');
    masterRhythmCache = mod.default;
  }
  return masterRhythmCache;
}

/** Load 392 harmony KB entries (lazy). */
export async function loadHarmonyKB(): Promise<Record<string, HKBModeRoot>> {
  if (!harmonyKBCache) {
    const mod = await import('./harmonyKB');
    harmonyKBCache = mod.default;
  }
  return harmonyKBCache;
}
