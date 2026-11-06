import type { StepRef } from './types';

// ── Which steps a guided lesson has done ───────────────────────────────────
// By step, in a key. The lesson's own record goes by tag, across all its keys, and
// Pop's four chord loops share a single tag, so that can't say which rungs are done.
// It's kept beside that record and never replaces it: what's written there still
// drives totals, the path's discs and resuming in the old layouts.

const storageKey = (scope: string) => `guided_steps_${scope}`;

export function readGuidedSteps(scope: string): ReadonlySet<StepRef> {
  try {
    const stored = localStorage.getItem(storageKey(scope));
    return new Set(stored ? (JSON.parse(stored) as StepRef[]) : []);
  } catch {
    return new Set();
  }
}

export function markGuidedSteps(scope: string, steps: readonly StepRef[]) {
  const all = new Set([...readGuidedSteps(scope), ...steps]);
  try {
    localStorage.setItem(storageKey(scope), JSON.stringify([...all]));
  } catch {
    // Storage full or blocked: the lesson's own record still has them.
  }
}
