import { applySuggestions } from '@/content/suggestions/apply';
import {
  BULK_FLOOR,
  BULK_THRESHOLD,
  isImported,
  whyNotBulk,
} from '@/content/suggestions/status';
import type { RequiredRecord, Suggestion } from '@/content/suggestions/types';
import type {
  DecisionInput,
  DecisionResult,
  SuggestionBatch,
  SuggestionRow,
} from '@/hooks/data/admin/useSuggestions';

/**
 * Bulk accept, planned (design §5.1, C29, C33): which of a table's
 * suggestions may be accepted many at a time, what that would write, and
 * what becomes of each once the server has answered.
 *
 * The rules, in the order they are asked:
 *  - `whyNotBulk`: never a City read from song pins (the owner's decision:
 *    song pins are where the songs are shown, not the scene) nor a song's
 *    year (C15); still open against the item, sure, confident enough (the
 *    owner's threshold, 0.85 unless set otherwise and never below 0.7: the
 *    request carries it, and the server holds to it), for the importer's
 *    from a run whose sure tier is calibrated, and resting on a suggestion
 *    that stands — the act's identity, a song's Album row — as the server
 *    reports it beside the row (it is often another item's);
 *  - every record it needs made first has a body to make it from;
 *  - its item is in the content API, with no proposal on it, waiting or
 *    sent back (an admin's save would slide under the proposal, to be
 *    undone by its approval).
 *
 * The run itself is the server's: each accept goes to
 * `POST /suggestions/decisions` with `method: 'bulk'`, and the server
 * re-reads the item, checks the suggestion still fits it, makes the records
 * it needs (places before artists, reusing only the same one, C33), saves
 * the item once and logs the decision. What it refuses is listed, never
 * forced. The dry run here is the same accepts laid over the bodies the
 * table read, for the owner to check before anything is sent.
 *
 * Pure.
 */

/** An item of the table, as a bulk accept needs it. */
export interface BulkItem {
  /** The API item's id; absent when only the repo has the row. */
  itemId?: string;
  /** The row's name, for the lists. */
  label: string;
  /** The body the table read: what the dry run lays the accepts over. */
  body?: Readonly<Record<string, unknown>>;
  /** A proposal waits on it, or was sent back. */
  pending: boolean;
  /** The proposal on it was sent back to its editor, rather than waiting. */
  sentBack?: boolean;
}

export interface BulkContext {
  /** The table's item for a target slug. */
  itemOf(slug: string): BulkItem | undefined;
  /** Each run's calibration, as `GET /suggestions` reports it. */
  batches: readonly SuggestionBatch[];
  /** The owner's threshold, 0.7 to 1. */
  threshold?: number;
  /**
   * The suggestions that stand (an identity a field rests on), from rows the
   * page has read; a row's own `dependency`, where the server sends it,
   * speaks for it first.
   */
  standing: ReadonlySet<string>;
}

/** A suggestion left out, and why, in the owner's words. */
export interface Skipped {
  suggestion: Suggestion;
  /** The row it is for. */
  label: string;
  reason: string;
}

/** One item a bulk accept writes, as the dry run shows it. */
export interface PlannedItem {
  slug: string;
  label: string;
  itemId: string;
  suggestions: Suggestion[];
  before: Record<string, unknown>;
  after: Record<string, unknown>;
}

export interface BulkPlan {
  items: PlannedItem[];
  /** Suggestions accepted, over all items. */
  count: number;
  /** The records to make first, each once, places before artists. */
  records: RequiredRecord[];
  skipped: Skipped[];
}

/** The threshold as the owner may set it: never below the floor. */
export const clampThreshold = (threshold = BULK_THRESHOLD) =>
  Math.min(1, Math.max(BULK_FLOOR, threshold));

export const CALIBRATION_REASON =
  "the importer's sure tier is not calibrated yet";
export const PENDING_REASON = 'a proposal waits for review on its item';
export const SENT_BACK_REASON =
  'a proposal on its item was sent back to its editor, and is still open';

/** Why a suggestion cannot go in a bulk accept, or null when it can. */
export function bulkBlocker(
  row: SuggestionRow,
  context: BulkContext,
): string | null {
  const { suggestion, dependency } = row;
  const calibrated = new Map(
    context.batches.map((batch) => [batch.batch, batch.calibrated === true]),
  );
  const why = whyNotBulk(suggestion, row.status, {
    threshold: clampThreshold(context.threshold),
    isAccepted: (id) =>
      dependency?.id === id ? dependency.stands : context.standing.has(id),
    isCalibrated: (batch) => calibrated.get(batch) === true,
  });
  if (why) return why;
  if (
    recordsToMake(suggestion).some(
      (record) =>
        !record.body ||
        typeof record.body !== 'object' ||
        Array.isArray(record.body),
    )
  )
    return 'a record it needs has no body to make it from';
  const item = context.itemOf(suggestion.target.slug);
  if (!item?.itemId) return 'its item is not in the content API yet';
  if (item.pending) return item.sentBack ? SENT_BACK_REASON : PENDING_REASON;
  return null;
}

/**
 * The suggestions that stand, from rows: each row's dependency as the
 * server reports it, and the rows the body says (`applied`) — accepted and
 * still there, or typed by hand. An accept waiting in a proposal, or taken
 * out by hand since, does not stand.
 */
export function standingIds(rows: readonly SuggestionRow[]): Set<string> {
  const out = new Set<string>();
  for (const row of rows) {
    if (row.status === 'applied') out.add(row.suggestion.id);
    if (row.dependency?.stands) out.add(row.dependency.id);
  }
  return out;
}

/**
 * The records a suggestion needs made first, less its own item: a Label
 * row carries the release it labels, which its Album row makes.
 */
export const recordsToMake = (
  suggestion: Pick<Suggestion, 'requires' | 'target'>,
): RequiredRecord[] =>
  (suggestion.requires ?? []).filter(
    (record) =>
      record.kind !== suggestion.target.kind ||
      record.slug !== suggestion.target.slug,
  );

const MAKE_ORDER = ['globe_city', 'label', 'studio', 'artist', 'release'];
const makeRank = (kind: string) => {
  const at = MAKE_ORDER.indexOf(kind);
  return at === -1 ? MAKE_ORDER.length : at;
};

/**
 * The dry run: the eligible suggestions among `rows` (those `include` keeps
 * — the fields the owner ticked), by item, each item's body before and
 * after, the records to make first, and everything left out with why.
 */
export function planBulkAccept(
  rows: readonly SuggestionRow[],
  context: BulkContext,
  include: (suggestion: Suggestion) => boolean = () => true,
): BulkPlan {
  const skipped: Skipped[] = [];
  const bySlug = new Map<string, Suggestion[]>();
  const labelOf = (slug: string) => context.itemOf(slug)?.label ?? slug;
  for (const row of rows) {
    const { suggestion } = row;
    if (!include(suggestion)) continue;
    const reason = bulkBlocker(row, context);
    if (reason) {
      skipped.push({
        suggestion,
        label: labelOf(suggestion.target.slug),
        reason,
      });
      continue;
    }
    const list = bySlug.get(suggestion.target.slug);
    if (list) list.push(suggestion);
    else bySlug.set(suggestion.target.slug, [suggestion]);
  }

  const items: PlannedItem[] = [];
  const records = new Map<string, RequiredRecord>();
  let count = 0;
  for (const [slug, suggestions] of bySlug) {
    const item = context.itemOf(slug)!;
    const before = { ...(item.body ?? {}) };
    // As the server will apply them: in order, each against the body the
    // ones before it left, so two values for one field cannot both land.
    const applied = applySuggestions(
      before,
      suggestions.map((suggestion) => ({ suggestion })),
    );
    for (const refused of applied.refused)
      skipped.push({
        suggestion: refused.suggestion,
        label: item.label,
        reason: `it conflicts with another suggestion for ${refused.suggestion.path}`,
      });
    const going = [...applied.accepted, ...applied.already];
    if (!going.length) continue;
    for (const suggestion of going)
      for (const record of recordsToMake(suggestion))
        records.set(`${record.kind}:${record.slug}`, record);
    count += going.length;
    items.push({
      slug,
      label: item.label,
      itemId: item.itemId!,
      suggestions: going,
      before,
      after: applied.body,
    });
  }

  return {
    items,
    count,
    records: [...records.values()].sort(
      (a, b) => makeRank(a.kind) - makeRank(b.kind),
    ),
    skipped,
  };
}

/** The skipped suggestions by reason, the commonest first. */
export function skippedByReason(
  skipped: readonly Skipped[],
): { reason: string; entries: Skipped[] }[] {
  const groups = new Map<string, Skipped[]>();
  for (const entry of skipped) {
    const list = groups.get(entry.reason);
    if (list) list.push(entry);
    else groups.set(entry.reason, [entry]);
  }
  return [...groups]
    .map(([reason, entries]) => ({ reason, entries }))
    .sort((a, b) => b.entries.length - a.entries.length);
}

/**
 * The importer's suggestions a bulk accept leaves out only because their
 * run is not calibrated: said once, above the rest, with the batches.
 */
export function waitingForCalibration(skipped: readonly Skipped[]): {
  count: number;
  batches: string[];
} {
  const waiting = skipped.filter(
    (entry) =>
      entry.reason === CALIBRATION_REASON && isImported(entry.suggestion),
  );
  return {
    count: waiting.length,
    batches: [...new Set(waiting.map((entry) => entry.suggestion.batch))],
  };
}

/** The items in runs of `size`, each run one request. */
export function chunksOf<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let at = 0; at < items.length; at += Math.max(1, size))
    out.push(items.slice(at, at + Math.max(1, size)));
  return out;
}

/** An item's accepts, as the request sends them: in bulk, as offered. */
export const bulkDecisions = (item: PlannedItem): DecisionInput[] =>
  item.suggestions.map((suggestion) => ({
    suggestionId: suggestion.id,
    op: 'accept',
    method: 'bulk',
  }));

/** What became of one item, from the server's answers for its accepts. */
export type ItemOutcome =
  | { state: 'written'; accepted: number; refused: string[] }
  | { state: 'skipped'; reason: string }
  | { state: 'conflict'; reasons: string[] }
  | { state: 'failed'; reason: string };

/**
 * One item's outcome from its results. Written when any accept went in (the
 * rest are listed beside it); skipped when a proposal stopped it; else a
 * conflict — the server's reason for each, never forced — or a failure.
 */
export function itemOutcome(results: readonly DecisionResult[]): ItemOutcome {
  const accepted = results.filter(
    (result) => result.outcome !== 'refused',
  ).length;
  const refusals = results.flatMap((result) =>
    result.outcome === 'refused' ? [result] : [],
  );
  const reasons = [...new Set(refusals.map((refusal) => refusal.error))];
  if (accepted) return { state: 'written', accepted, refused: reasons };
  const pending = refusals.find(
    (refusal) => refusal.code === 'PENDING_PROPOSAL',
  );
  if (pending) return { state: 'skipped', reason: pending.error };
  if (
    refusals.every((refusal) => refusal.status < 500 && refusal.status >= 400)
  )
    return { state: 'conflict', reasons };
  return { state: 'failed', reason: reasons.join('; ') };
}
