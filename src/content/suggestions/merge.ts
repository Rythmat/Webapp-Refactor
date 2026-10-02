import { isImported } from './status';
import type { Suggestion, SuggestionTier } from './types';

/**
 * Two offers of one fact as one suggestion.
 *
 * An id is the target, the path and the value, never the source (`keys.ts`),
 * so the app's planners and the importer offering the same place as an
 * act's City share one: "two agreeing sources are one suggestion"
 * (`types.ts`). Every source and every reason is kept, with the surer tier,
 * its wording and the higher confidence, and the records either needs.
 *
 * The importer's `batch` and `dependsOn` win, whichever offer is read first.
 * The batch is what the importer's calibration is measured by, and the
 * dependency is the identity a field rests on: taken from the app's copy of
 * the same fact, a row the importer's sources vouch for would carry the
 * app's batch — never calibrated, so never accepted in bulk — or lose the
 * gate that keeps it out of a bulk accept until its identity is accepted.
 *
 * The one merge for the planners (`content/linking`) and the mock's
 * catalog; pure.
 */

const TIER_RANK: Record<SuggestionTier, number> = {
  sure: 2,
  likely: 1,
  ambiguous: 0,
};

const unique = <T>(items: readonly T[], keyOf: (item: T) => string): T[] => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = keyOf(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

/** One suggestion from two offers of it (the same id). */
export function mergeInto(a: Suggestion, b: Suggestion): Suggestion {
  const sources = unique(
    [...a.sources, ...b.sources],
    (s) =>
      `${s.provider}|${s.url ?? ''}|${s.label ?? ''}|${s.externalId ?? ''}`,
  );
  const requires = unique(
    [...(a.requires ?? []), ...(b.requires ?? [])],
    (r) => `${r.kind}\u0000${r.slug}`,
  );
  const surer = TIER_RANK[b.tier] > TIER_RANK[a.tier] ? b : a;
  // The importer's offer speaks for the batch and the identity it rests on.
  const lead = !isImported(a) && isImported(b) ? b : a;
  const other = lead === a ? b : a;
  const dependsOn = lead.dependsOn ?? other.dependsOn;
  const anchor = a.anchor ?? b.anchor;
  const merged: Suggestion = {
    ...a,
    display: surer.display,
    sources,
    evidence: unique([...a.evidence, ...b.evidence], (e) => e),
    confidence: Math.max(a.confidence, b.confidence),
    tier: surer.tier,
    batch: lead.batch,
  };
  delete merged.requires;
  delete merged.dependsOn;
  delete merged.anchor;
  return {
    ...merged,
    ...(anchor ? { anchor } : {}),
    ...(requires.length ? { requires } : {}),
    ...(dependsOn ? { dependsOn } : {}),
  };
}

/**
 * Several lists of suggestions — the app's and the importer's — as one,
 * each id once, in the order each id was first seen.
 */
export function mergeSuggestions(
  ...lists: readonly (readonly Suggestion[])[]
): Suggestion[] {
  const byId = new Map<string, Suggestion>();
  for (const list of lists)
    for (const suggestion of list) {
      const known = byId.get(suggestion.id);
      byId.set(
        suggestion.id,
        known ? mergeInto(known, suggestion) : suggestion,
      );
    }
  return [...byId.values()];
}
