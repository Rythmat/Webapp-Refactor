import { checkSuggestion } from './apply';
import { valueHash } from './keys';
import type {
  DecisionMethod,
  DecisionOp,
  RequiredRecord,
  Suggestion,
  SuggestionDecision,
  SuggestionTarget,
} from './types';

/**
 * Where a suggestion stands: what the owner decided (the decisions log) and
 * what the body says now.
 *
 * The two can disagree, and both matter. An accept that was saved as an
 * editor's proposal is decided but not yet in the live body; a value typed
 * by hand that happens to equal the suggestion is in the body with no
 * decision at all. So the log answers "was this decided", the body answers
 * "is it there", and `suggestionStatus` puts them together for a cell.
 */

/** What the log says, ignoring the body. */
export type DecisionState = 'open' | 'accepted' | 'rejected' | 'dropped';

export interface DecisionSummary {
  state: DecisionState;
  /** The decision that set the state; absent while open. */
  decision?: SuggestionDecision;
  /**
   * Accepted in bulk and not looked at since: the Table's "Accepted in bulk,
   * not reviewed" filter, until someone marks it reviewed (C29). Only a
   * `bulk` accept is: one the bulk import made (`method: 'import'`) wrote
   * plain data, exactly as a person typing it would (owner decision of 30
   * September 2026), so it counts as reviewed, like a `single` one.
   */
  unreviewed: boolean;
}

/**
 * What a reopen can take back: a reject or a drop, read from the log or
 * from a row's status. An accept is undone by editing the item, never by
 * the log.
 */
export const canReopen = (state: DecisionState | SuggestionStatus): boolean =>
  state === 'rejected' || state === 'dropped';

/** Bulk accept starts here… */
export const BULK_THRESHOLD = 0.85;
/** …and is never allowed below this, whatever the owner sets. */
export const BULK_FLOOR = 0.7;

/**
 * The log grouped by suggestion, each group oldest first. Built once for a
 * page of rows rather than scanning the whole log per cell.
 */
export function decisionsBySuggestion(
  decisions: readonly SuggestionDecision[],
): Map<string, SuggestionDecision[]> {
  const out = new Map<string, SuggestionDecision[]>();
  // Sorted by time; the log's own order breaks ties (sort is stable).
  const ordered = [...decisions].sort((a, b) =>
    a.at < b.at ? -1 : a.at > b.at ? 1 : 0,
  );
  for (const decision of ordered) {
    const list = out.get(decision.suggestionId);
    if (list) list.push(decision);
    else out.set(decision.suggestionId, [decision]);
  }
  return out;
}

/**
 * What the owner last decided about a suggestion. The latest accept,
 * replace, reject or drop decides; a review only clears "unreviewed" on the
 * accept before it, and a reopen only takes back the reject or drop before
 * it — the suggestion is open again. A decision about another value — the
 * importer has since corrected it under the same id — decides nothing.
 */
export function decisionState(
  suggestion: Pick<Suggestion, 'id' | 'value'>,
  decisions: readonly SuggestionDecision[] | Map<string, SuggestionDecision[]>,
): DecisionSummary {
  const mine =
    decisions instanceof Map
      ? (decisions.get(suggestion.id) ?? [])
      : (decisionsBySuggestion(decisions).get(suggestion.id) ?? []);
  const hash = valueHash(suggestion.value);
  let out: DecisionSummary = { state: 'open', unreviewed: false };
  for (const decision of mine) {
    if (decision.valueHash !== hash) continue;
    switch (decision.op) {
      case 'accept':
      case 'replace':
        out = {
          state: 'accepted',
          decision,
          // `bulk` only: an import is plain data, as reviewed as a person's.
          unreviewed: decision.method === 'bulk',
        };
        break;
      case 'reject':
        out = { state: 'rejected', decision, unreviewed: false };
        break;
      case 'drop':
        out = { state: 'dropped', decision, unreviewed: false };
        break;
      case 'review':
        if (out.state === 'accepted') out = { ...out, unreviewed: false };
        break;
      case 'reopen':
        if (canReopen(out.state)) out = { state: 'open', unreviewed: false };
        break;
    }
  }
  return out;
}

/**
 * A suggestion as a cell shows it:
 *  - `open`        — nothing there yet, nothing decided: the ghost chip;
 *  - `accepted`    — decided, not in this body yet (a proposal awaiting
 *    review);
 *  - `applied`     — the body says it (or what the owner accepted instead),
 *    however it got there;
 *  - `conflict`    — the body says something else: current and suggested
 *    side by side, with Replace; never accepted in bulk;
 *  - `unreachable` — it cannot be written where it points (the element it
 *    was for is gone, or it adds one to a list only a whole list may
 *    start): shown with its reason, with no Accept or Replace;
 *  - `removed`     — accepted once, and the body saved since without it:
 *    someone took it out by hand. A person may accept it again; a bulk
 *    accept never puts it back;
 *  - `rejected`, `dropped` — decided against; not offered again.
 */
export type SuggestionStatus =
  | 'open'
  | 'accepted'
  | 'applied'
  | 'conflict'
  | 'unreachable'
  | 'removed'
  | 'rejected'
  | 'dropped';

/** What a cell knows about the body beside the body itself. */
export interface StatusContext {
  /**
   * When the body was last saved: the item's `updatedAt`, or `pendingAt`
   * for an editor's own proposal. An accept older than that and missing
   * from the body was taken out since. Unknown, an accept stays `accepted`.
   */
  savedAt?: string | Date | null;
  /**
   * A proposal waits on the item and the body is not it (an admin looking
   * at the live body): an accept missing here may be in the proposal, so it
   * is never taken as removed.
   */
  pending?: boolean;
}

/** The body was saved after the decision, and not merely beside a proposal. */
const savedSince = (context: StatusContext, at: string): boolean => {
  if (context.pending || !context.savedAt) return false;
  const saved = new Date(context.savedAt).getTime();
  return Number.isFinite(saved) && saved > Date.parse(at);
};

/**
 * The status of a suggestion against the body a save would be built from
 * (an editor's own proposal, else the live body) and the decisions log.
 */
export function suggestionStatus(
  suggestion: Suggestion,
  body: Record<string, unknown> | null | undefined,
  decisions: readonly SuggestionDecision[] | Map<string, SuggestionDecision[]>,
  context: StatusContext = {},
): SuggestionStatus {
  const decided = decisionState(suggestion, decisions);
  if (decided.state === 'rejected' || decided.state === 'dropped')
    return decided.state;
  const here = body ?? {};
  const check = checkSuggestion(here, suggestion);
  if (check.state === 'applied') return 'applied';

  if (decided.state === 'accepted' && decided.decision) {
    const { decision } = decided;
    // The owner may have changed the value before accepting it: then the
    // body says theirs, and that is this suggestion applied.
    if (
      decision.value !== undefined &&
      checkSuggestion(here, { ...suggestion, value: decision.value }).state ===
        'applied'
    )
      return 'applied';
    // Decided and not here: on its way, in a proposal — unless this body was
    // saved after the decision without it, by someone who took it out or
    // wrote something else there.
    if (!savedSince(context, decision.at)) return 'accepted';
    if (check.state === 'empty') return 'removed';
    return check.state === 'unreachable' ? 'unreachable' : 'conflict';
  }

  if (check.state === 'unreachable') return 'unreachable';
  return check.state === 'empty' ? 'open' : 'conflict';
}

/** Why a status keeps a suggestion out of a bulk accept, as the owner reads it. */
const NOT_OPEN: Record<Exclude<SuggestionStatus, 'open'>, string> = {
  accepted: 'it is accepted already',
  applied: 'the item says it already',
  conflict: 'it conflicts with what the item says',
  unreachable: 'it cannot be written where it points',
  removed: 'it was accepted once and taken out by hand since',
  rejected: 'it was rejected',
  dropped: 'it was dropped',
};

/**
 * Offered by an outside catalogue — the importer's — rather than read from
 * the app's own data: any provider but `app`.
 */
export const isImported = (suggestion: Pick<Suggestion, 'sources'>): boolean =>
  suggestion.sources.some((s) => s.provider !== 'app');

/**
 * A City read from where the act's songs are pinned (`artist_location`),
 * alone or agreeing with the importer: song pins are where the songs are
 * shown, not the scene the owner means by City (C23), so a person checks
 * every one, with the pins it would move beside it.
 */
export const isSongPinCity = (
  suggestion: Pick<Suggestion, 'path' | 'sources'>,
): boolean =>
  suggestion.path === 'basedInPlaceId' &&
  suggestion.sources.some(
    (source) =>
      source.provider === 'app' &&
      (source.label ?? '').startsWith('artist_location'),
  );

export const SONG_PIN_REASON =
  'a City read from song pins is never accepted in bulk: a person checks it';

/**
 * A song's year: students read it on the song's page, and the sources
 * disagree often enough (a reissue, a live take) that a person checks each
 * one (C15) — however sure, and whoever offers it.
 */
export const isSongYear = (
  suggestion: Pick<Suggestion, 'target' | 'path'>,
): boolean => suggestion.target.kind === 'song' && suggestion.path === 'year';

export const SONG_YEAR_REASON =
  'a song’s year is accepted one at a time: a person checks it';

export const RESTS_ON_REASON = 'the suggestion it rests on is not accepted yet';

/**
 * Whether the suggestion another rests on (`dependsOn`) stands: the item it
 * is for says it — its own value, in the live body, however it got there.
 * An accept waiting in an editor's proposal does not stand yet; one taken
 * out by hand since, or changed before it was accepted (another MusicBrainz
 * artist), no longer names what the rows resting on it describe. Often
 * another item's: a song's rows rest on its lead act's identity, a Label
 * row on a song's Album row.
 */
export const dependencyStands = (
  dependency: Pick<Suggestion, 'target' | 'path' | 'anchor' | 'op' | 'value'>,
  live: Record<string, unknown> | null | undefined,
): boolean => !!live && checkSuggestion(live, dependency).state === 'applied';

/**
 * The suggestion a row rests on, as `GET /suggestions` serves it beside the
 * row: a list of one item's rows, or one kind's, never holds another
 * item's, so the server says how it stands.
 */
export interface SuggestionDependency {
  id: string;
  target: SuggestionTarget;
  path: string;
  display: string;
  /** Its own row's status, for the same viewer. */
  status: SuggestionStatus;
  /** Whether it stands (`dependencyStands`): what a bulk accept asks. */
  stands: boolean;
}

/**
 * Why a suggestion cannot go in a bulk accept, or null when it can: not a
 * City read from song pins nor a song's year, open, sure, confident enough,
 * resting on a suggestion that stands, and — for the importer's — from
 * artifacts whose sure tier the owner's labelled sample has measured
 * (`manifest.json` `calibrated`, by batch). Whether its required records can
 * be made, and whether its item has a proposal waiting, are for the run to
 * find out (they need the server).
 */
export function whyNotBulk(
  suggestion: Suggestion,
  status: SuggestionStatus,
  options: {
    /** The owner's threshold; clamped to the floor. */
    threshold?: number;
    /**
     * Whether the suggestion `dependsOn` names stands (`dependencyStands`):
     * the identity an act's fields rest on, the Album row a Label row does.
     */
    isAccepted?: (suggestionId: string) => boolean;
    /**
     * Whether the importer's artifacts for a batch are calibrated: their
     * manifest's `calibrated`. Left out, no imported suggestion is bulk
     * accepted — "sure" means nothing until it has been measured.
     */
    isCalibrated?: (batch: string) => boolean;
  } = {},
): string | null {
  const threshold = Math.max(options.threshold ?? BULK_THRESHOLD, BULK_FLOOR);
  if (isSongPinCity(suggestion)) return SONG_PIN_REASON;
  if (isSongYear(suggestion)) return SONG_YEAR_REASON;
  if (status !== 'open') return NOT_OPEN[status];
  if (suggestion.tier !== 'sure') return `it is ${suggestion.tier}, not sure`;
  if (suggestion.confidence < threshold)
    return `its confidence is below ${Math.round(threshold * 100)}%`;
  if (isImported(suggestion) && !options.isCalibrated?.(suggestion.batch))
    return "the importer's sure tier is not calibrated yet";
  if (suggestion.dependsOn && !options.isAccepted?.(suggestion.dependsOn))
    return RESTS_ON_REASON;
  return null;
}

/**
 * Whether a path holds another catalogue's id for the item
 * (`externalIds.mbid`, `externalIds.wikidata`). The bulk import never
 * writes one: the site keeps no outside catalogue's ids (owner decision of
 * 30 September 2026). Such a row is still the identity the item's other
 * rows rest on, which is what `identityTaken` is for.
 */
export const isExternalIdPath = (path: string): boolean =>
  path === 'externalIds' || path.startsWith('externalIds.');

export const EXTERNAL_ID_REASON =
  'an external id is never imported: the site keeps no outside catalogue’s ids';

export const AMBIGUOUS_REASON =
  'it is ambiguous: its sources point at more than one thing';

/**
 * Why the bulk import (design E.1: `decide` with `policy: 'import'`) leaves
 * a suggestion out, or null when it takes it: open, sure or likely, not an
 * external id, and resting on a suggestion that stands (`options.stands`,
 * which also counts an identity the import takes without writing it). Unlike
 * a bulk accept it takes song years and Cities read from song pins, at any
 * confidence, calibrated or not: the owner asked for everything at once.
 * Never writing over a stated value is the write's to find: a conflict is
 * refused there, with what the item holds.
 */
export function whyNotImported(
  suggestion: Suggestion,
  status: SuggestionStatus,
  options: {
    /** Whether the suggestion `dependsOn` names stands, for the import. */
    stands?: (suggestionId: string) => boolean;
  } = {},
): string | null {
  if (isExternalIdPath(suggestion.path)) return EXTERNAL_ID_REASON;
  if (status !== 'open') return NOT_OPEN[status];
  if (suggestion.tier === 'ambiguous') return AMBIGUOUS_REASON;
  if (suggestion.dependsOn && !options.stands?.(suggestion.dependsOn))
    return RESTS_ON_REASON;
  return null;
}

/**
 * Whether the bulk import takes an identity row without writing it. An
 * item's external id is the row every other row about that item rests on
 * (`dependsOn`: which artist in the other catalogue this act is). The
 * import writes no external id, but it trusts the match as it trusts the
 * rest, so the rows resting on it can go in: an external-id row stands for
 * the import when it is sure or likely and still open, accepted, or already
 * in the item. One rejected, dropped, taken out by hand since, or in
 * conflict with the id the item holds, does not.
 */
export function identityTaken(
  suggestion: Pick<Suggestion, 'path' | 'tier'>,
  status: SuggestionStatus,
): boolean {
  return (
    isExternalIdPath(suggestion.path) &&
    suggestion.tier !== 'ambiguous' &&
    (status === 'open' || status === 'accepted' || status === 'applied')
  );
}

/** Whether a value holds this string anywhere: a slug, in a list, in an object. */
const mentions = (value: unknown, text: string): boolean =>
  value === text ||
  (Array.isArray(value) && value.some((item) => mentions(item, text))) ||
  (!!value &&
    typeof value === 'object' &&
    Object.values(value).some((field) => mentions(field, text)));

/**
 * Of the records a suggestion needs made first, those a value still needs:
 * the ones it names by slug, and the ones those name in turn (an artist to
 * make whose City is a place to make). The owner may change a value before
 * accepting it — a City pointed at another place — and a record the value
 * no longer names must not be made for nothing.
 */
export function recordsNamedBy(
  records: readonly RequiredRecord[],
  value: unknown,
): RequiredRecord[] {
  const kept = new Set<RequiredRecord>();
  let grew = true;
  while (grew) {
    grew = false;
    for (const record of records) {
      if (kept.has(record)) continue;
      if (
        mentions(value, record.slug) ||
        [...kept].some((other) => mentions(other.body, record.slug))
      ) {
        kept.add(record);
        grew = true;
      }
    }
  }
  return records.filter((record) => kept.has(record));
}

/**
 * The log entry for a decision. `value` is kept only for what writes
 * (accept, replace), and is the suggestion's own unless the owner changed it
 * before accepting. A replace also keeps the hash of what it wrote over, so
 * a replay after a reset can write over that again (`apply.ts`
 * `replayDecision`); and whatever writes keeps the records its value needs
 * made first, so a replay can make them without the suggestion — never its
 * own item, which a Label row carries (the release it labels) but which an
 * Album row made.
 */
export function makeDecision(
  suggestion: Suggestion,
  op: DecisionOp,
  who: {
    by: string;
    at: string;
    method: DecisionMethod;
    /** The value written, when the owner changed it before accepting. */
    value?: unknown;
    /**
     * For a replace: what it wrote over — the check's `current`, the `seen`
     * handed to `apply.ts`.
     */
    seen?: unknown;
  },
): SuggestionDecision {
  const writes = op === 'accept' || op === 'replace';
  const value = who.value ?? suggestion.value;
  const { target } = suggestion;
  const requires = (
    writes && suggestion.requires?.length
      ? who.value === undefined
        ? suggestion.requires
        : recordsNamedBy(suggestion.requires, value)
      : []
  ).filter(
    (record) => record.kind !== target.kind || record.slug !== target.slug,
  );
  return {
    suggestionId: suggestion.id,
    op,
    target: suggestion.target,
    path: suggestion.path,
    ...(suggestion.anchor ? { anchor: suggestion.anchor } : {}),
    ...(writes ? { value } : {}),
    valueHash: valueHash(suggestion.value),
    ...(op === 'replace' && who.seen !== undefined
      ? { seenHash: valueHash(who.seen) }
      : {}),
    ...(requires.length ? { requires: [...requires] } : {}),
    method: who.method,
    by: who.by,
    at: who.at,
  };
}
