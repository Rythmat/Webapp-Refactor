import { allScopes, type ScopeDef } from './registry';

// ── The order scopes are listed in (milestones 1.6 and 2.15) ───────────────
//
// The '?' sheet and the command palette group commands by scope in this one
// order: where the student is most of the time first, then the regions with
// keys of their own, then the overlays. A scope missing here goes last, in
// the order it was declared.

export const SCOPE_ORDER: readonly string[] = [
  'global',
  'arrange',
  'tracks',
  'sections',
  'score',
  'leadsheet',
  'pianoRoll',
  'drums',
  'dock',
  'typing',
  'practice',
  'prism',
  'dockMax',
  'sectionDrag',
];

/** A scope's place in SCOPE_ORDER (past the end when it isn't listed). */
export function scopeRank(id: string): number {
  const i = SCOPE_ORDER.indexOf(id);
  return i === -1 ? SCOPE_ORDER.length : i;
}

/** Every scope, in the listing order. */
export function sortedScopes(): ScopeDef[] {
  return allScopes().sort((a, b) => scopeRank(a.id) - scopeRank(b.id));
}
