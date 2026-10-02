import { matchSnapshotEvents } from '../graph/deriveGraph';
import type { EventMatch } from '../graph/eventMatches';
import { checkSuggestion } from '../suggestions/apply';
import { suggestionId } from '../suggestions/keys';
import { mergeInto } from '../suggestions/merge';
import type {
  RequiredRecord,
  Suggestion,
  SuggestionSource,
} from '../suggestions/types';
import {
  APP_BATCH,
  type LinkingInput,
  type PlannedSuggestion,
  type PlanOptions,
  type Precondition,
} from './types';

/**
 * What every planner does the same way: make a suggestion with its stable
 * id, and note what the item held at its path when the plan was made.
 */

/** A suggestion's parts; the id comes from them, the batch from the options. */
export type SuggestionParts = Omit<Suggestion, 'id' | 'batch' | 'requires'> & {
  requires?: readonly RequiredRecord[];
};

/** The repo's own data as a source: the item and the field a planner read. */
export const appSource = (label: string): SuggestionSource => ({
  provider: 'app',
  label,
});

export function makeSuggestion(
  parts: SuggestionParts,
  options: PlanOptions = {},
): Suggestion {
  const { requires, ...rest } = parts;
  return {
    id: suggestionId(parts),
    ...rest,
    ...(requires?.length ? { requires: [...requires] } : {}),
    batch: options.batch ?? APP_BATCH,
  };
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

/**
 * The suggestion, with what its item says at the path now: the
 * precondition a write re-checks against the item it re-reads. `body` is
 * the item as the plan read it; absent, the item has nothing there yet.
 * When the suggestion cannot be written where it points at all — a
 * planner's mistake — the answer says why, for the caller to report rather
 * than offer.
 */
export function withPrecondition(
  suggestion: Suggestion,
  body: unknown,
): PlannedSuggestion | { suggestion: Suggestion; unreachable: string } {
  const check = checkSuggestion(isPlainObject(body) ? body : {}, suggestion);
  let precondition: Precondition;
  switch (check.state) {
    // 'seen' needs a `seen` handed in, which a plan never does.
    case 'seen':
    case 'empty':
      precondition = { state: 'empty' };
      break;
    case 'applied':
      precondition = { state: 'applied' };
      break;
    case 'conflict':
      precondition = {
        state: 'conflict',
        seen: check.current,
        reason: check.reason,
      };
      break;
    case 'unreachable':
      return { suggestion, unreachable: check.reason };
  }
  return { suggestion, precondition };
}

/**
 * Collects a planner's suggestions. The same suggestion offered twice (two
 * song pins spelled differently for one act, both in the same city) is kept
 * once, with both sources and every reason (`suggestions/merge.ts`); what
 * cannot be written is set aside with why.
 */
export function createCollector() {
  const planned: PlannedSuggestion[] = [];
  const byId = new Map<string, PlannedSuggestion>();
  const unreachable: { id: string; reason: string }[] = [];
  return {
    add(suggestion: Suggestion, body: unknown): void {
      const known = byId.get(suggestion.id);
      if (known) {
        known.suggestion = mergeInto(known.suggestion, suggestion);
        return;
      }
      const result = withPrecondition(suggestion, body);
      if ('unreachable' in result) {
        unreachable.push({ id: suggestion.id, reason: result.unreachable });
        return;
      }
      planned.push(result);
      byId.set(suggestion.id, result);
    },
    planned,
    unreachable,
  };
}

/** Each item once, the first of an id winning, as the graph reads them. */
export function firstOfEach<T>(
  items: readonly T[] | undefined,
  idOf: (item: T) => unknown,
): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items ?? []) {
    const id = idOf(item);
    if (typeof id !== 'string' || !id || seen.has(id)) continue;
    seen.add(id);
    out.push(item);
  }
  return out;
}

/** 'A', 'A and B', 'A, B and C'. */
export const listed = (names: readonly string[]): string =>
  names.length < 2
    ? (names[0] ?? '')
    : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;

/**
 * Who and what each event is about: the caller's, as the graph has them, or
 * else the graph's own matcher over the same lists.
 */
export const eventMatchesOf = (
  input: LinkingInput,
): ReadonlyMap<string, EventMatch> =>
  input.eventMatches ?? matchSnapshotEvents(input);

/** A hand-authored event: the only kind whose links are planned. */
export const isHandAuthored = (id: string): boolean => id.startsWith('evt-');
