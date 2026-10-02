import { samePlace } from '@/content/linking/samePlace';
import {
  applySuggestions,
  checkSuggestion,
  fromOutside,
  importNote,
  musicBrainzIdOf,
  replayDecision,
  revisionNote,
  withoutProvenance,
  type AcceptInput,
  type NameOf,
} from '@/content/suggestions/apply';
import { sameJson, withoutRefMeta } from '@/content/suggestions/keys';
import {
  canReopen,
  decisionState,
  decisionsBySuggestion,
  dependencyStands,
  identityTaken,
  isExternalIdPath,
  makeDecision,
  recordsNamedBy,
  suggestionStatus,
  whyNotBulk,
  whyNotImported,
} from '@/content/suggestions/status';
import type {
  DecisionMethod,
  DecisionOp,
  RequiredRecord,
  Suggestion,
  SuggestionDecision,
  SuggestionTarget,
} from '@/content/suggestions/types';
import type { ContentEditState } from '@/hooks/data/admin/useAdminContent';
import { suggestionDecisionSchema } from '@/scripts/apiContract/suggestionSchema';
import type { MockResponse, MockViewer } from './contentMockServer';
import { ALL_KINDS, type Body, type MockKind } from './mockKinds';

/**
 * The owner's decisions about suggestions, in the offline mock: the log it
 * keeps, the committed file it downloads and reads back, what
 * `POST /suggestions/decisions` does with a decision, and the replay that
 * writes the owner's accepts again after the seed has changed under them
 * (design §5.3, C11).
 *
 * Why a log at all: the mock stores each changed item as a patch against its
 * seed body, and a patch whose seed body has since moved is dropped on load
 * (persist.ts). Nothing the owner accepted may go with it. So every decision
 * is kept, downloaded as `src/scripts/enrichment/suggestions/decisions.json`,
 * committed, and replayed onto whatever the seed is now — where the value is
 * missing, never over something newer. The same file is the backend's
 * import payload.
 *
 * An accept is an ordinary save, made through the server's own
 * `PUT /items` (`DecisionHost.put`): validated, revisioned, a proposal for an
 * editor and a direct save for an admin. An editor's accept is only a
 * proposal until an admin approves it, so it is logged with `proposedIn` and
 * is neither downloaded nor replayed until then. A withdrawn proposal takes
 * its accepts out of the log, since they never happened; so does saving the
 * proposal again without one of them, and approving it confirms only what
 * its body still holds.
 *
 * Pure apart from the host it is handed: no fetch, no storage, no clock.
 */

// ── The log ─────────────────────────────────────────────────────────────────

/** A decision as the mock keeps it. */
export interface StoredDecision extends SuggestionDecision {
  /**
   * For an editor's accept: the id of the item whose proposal holds it. Not
   * confirmed — not downloaded, not replayed — until that proposal is
   * approved, when this goes.
   */
  proposedIn?: string;
}

/** The committed file, in the folder the importer's artifacts are in. */
export const DECISIONS_FILE = 'decisions.json';

/** How every save a replay makes is noted: its own, and a record's it made. */
export const REPLAY_NOTE = `Replayed from ${DECISIONS_FILE}`;

/**
 * Whether a revision is a replay's (`REPLAY_NOTE`): it writes back what
 * the owner decided, and is no later save by a person.
 */
export const isReplayNote = (note: string | null | undefined): boolean =>
  !!note && note.startsWith(REPLAY_NOTE);

/** The shape of `decisions.json`; moves only if that shape changes. */
export const DECISIONS_ARTIFACTS_VERSION = 1;

/** What `GET /suggestions/decisions` answers, and `decisions.json` holds. */
export interface DecisionsFile {
  artifactsVersion: number;
  /** Oldest first. */
  decisions: SuggestionDecision[];
}

/**
 * One decision, however many times it is read: the store's copy and the
 * committed file's are the same decision.
 */
export const decisionKey = (decision: SuggestionDecision): string =>
  [decision.suggestionId, decision.op, decision.at, decision.by].join('|');

/** Oldest first; decisions made together keep the order they were made in. */
const byTime = (a: SuggestionDecision, b: SuggestionDecision) =>
  a.at < b.at ? -1 : a.at > b.at ? 1 : 0;

/** The contract's row (`suggestionSchema.ts`), without the mock's own field. */
const contractRow = (decision: StoredDecision): SuggestionDecision => {
  if (decision.proposedIn === undefined) return decision;
  const row = { ...decision };
  delete row.proposedIn;
  return row;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

/**
 * The log from a saved mock state (persist.ts). What cannot be read fails the
 * whole load, through `bad`, as every other part of a saved state does.
 */
export function decodeStoredDecisions(
  raw: unknown,
  bad: (what: string) => never,
): StoredDecision[] {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) return bad('a decisions log that is not a list');
  return raw.map((entry: unknown, index): StoredDecision => {
    if (!isObject(entry)) return bad(`decision ${index} that is not an object`);
    const { proposedIn, ...row } = entry;
    if (proposedIn !== undefined && typeof proposedIn !== 'string')
      return bad(`a bad proposal on decision ${index}`);
    const parsed = suggestionDecisionSchema.safeParse(row);
    if (!parsed.success || Number.isNaN(Date.parse(parsed.data.at)))
      return bad(`a bad decision ${index}`);
    const decision = row as unknown as SuggestionDecision;
    return proposedIn ? { ...decision, proposedIn } : decision;
  });
}

export interface ParsedDecisionsFile {
  decisions: SuggestionDecision[];
  /**
   * Rows the contract does not describe, by position: a hand-merged file
   * can carry one. Left out and reported, never fatal.
   */
  refused: string[];
  /** Why the file as a whole could not be read; null when it could. */
  error: string | null;
}

/** Read a committed `decisions.json`. Never throws. */
export function parseDecisionsFile(text: string): ParsedDecisionsFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (caught) {
    return {
      decisions: [],
      refused: [],
      error: caught instanceof Error ? caught.message : String(caught),
    };
  }
  if (!isObject(parsed) || !Array.isArray(parsed.decisions))
    return { decisions: [], refused: [], error: 'it has no decisions list' };
  const decisions: SuggestionDecision[] = [];
  const refused: string[] = [];
  parsed.decisions.forEach((row, index) => {
    const checked = suggestionDecisionSchema.safeParse(row);
    if (checked.success && !Number.isNaN(Date.parse(checked.data.at)))
      decisions.push(row as SuggestionDecision);
    else refused.push(`row ${index}`);
  });
  return { decisions, refused, error: null };
}

/**
 * The file's text as the repo commits it: one decision per line, oldest
 * first, so each review session reads as the lines it added. Any JSON with
 * the same shape reads back the same (`parseDecisionsFile`).
 */
export function decisionsFileText(file: DecisionsFile): string {
  const rows = file.decisions.map((row) => `    ${JSON.stringify(row)}`);
  return `{\n  "artifactsVersion": ${file.artifactsVersion},\n  "decisions": [${
    rows.length ? `\n${rows.join(',\n')}\n  ` : ''
  }]\n}\n`;
}

export interface DecisionCounts {
  /** Every decision the mock holds. */
  total: number;
  /** Confirmed, and not in the committed file yet: the download banner. */
  notDownloaded: number;
  /** Editors' accepts waiting in proposals. */
  proposed: number;
}

export function createDecisionLog(
  initiallyCommitted: readonly SuggestionDecision[],
) {
  /** What `decisions.json` holds: as read at the start, or as last written. */
  let committed: readonly SuggestionDecision[] = initiallyCommitted;
  let committedKeys = new Set(committed.map(decisionKey));
  let log: StoredDecision[] = [];
  let grouped: Map<string, SuggestionDecision[]> | null = null;

  /**
   * The log with the committed file laid in: each decision once, oldest
   * first, and decisions made together in the order they were made.
   */
  const withCommitted = (entries: readonly StoredDecision[]) => {
    const seen = new Set(entries.map(decisionKey));
    return [
      ...entries,
      ...committed.filter((decision) => !seen.has(decisionKey(decision))),
    ].sort(byTime);
  };

  log = withCommitted([]);

  const changed = () => {
    grouped = null;
  };

  return {
    all: (): readonly StoredDecision[] => log,
    append(decision: StoredDecision) {
      log = [...log, decision];
      changed();
    },
    /** A saved log (persist.ts), with the committed file laid in again. */
    restore(entries: readonly StoredDecision[]) {
      log = withCommitted(entries);
      changed();
    },
    /**
     * The approved proposal on `itemId`: the accepts its body still holds
     * are confirmed; the rest never happened — the editor took the value
     * out again before it was approved — and go.
     */
    confirm(itemId: string, holds: (decision: StoredDecision) => boolean) {
      if (!log.some((decision) => decision.proposedIn === itemId)) return;
      log = log.flatMap((decision) =>
        decision.proposedIn !== itemId
          ? [decision]
          : holds(decision)
            ? [contractRow(decision)]
            : [],
      );
      changed();
    },
    /**
     * The proposal on `itemId` saved again: accepts in it that its new body
     * no longer holds never happened.
     */
    prune(itemId: string, holds: (decision: StoredDecision) => boolean) {
      const kept = log.filter(
        (decision) => decision.proposedIn !== itemId || holds(decision),
      );
      if (kept.length === log.length) return;
      log = kept;
      changed();
    },
    /** The withdrawn proposal on `itemId`: its accepts never happened. */
    withdraw(itemId: string) {
      const kept = log.filter((decision) => decision.proposedIn !== itemId);
      if (kept.length === log.length) return;
      log = kept;
      changed();
    },
    /** By suggestion, for status (proposed accepts included). */
    bySuggestion(): Map<string, SuggestionDecision[]> {
      grouped ??= decisionsBySuggestion(log);
      return grouped;
    },
    /** What `decisions.json` should hold now: every confirmed decision. */
    file(): DecisionsFile {
      return {
        artifactsVersion: DECISIONS_ARTIFACTS_VERSION,
        decisions: log
          .filter((decision) => !decision.proposedIn)
          .map(contractRow),
      };
    },
    /**
     * `decisions.json` now holds what `file()` gives: the repo store has
     * just written it (repo mode, design A.4, flush step 7). From here on
     * that is the committed file, as if it had been read at the start, so
     * nothing counts as not downloaded until the next decision.
     */
    markCommitted() {
      committed = this.file().decisions;
      committedKeys = new Set(committed.map(decisionKey));
    },
    counts(): DecisionCounts {
      let proposed = 0;
      let notDownloaded = 0;
      for (const decision of log) {
        if (decision.proposedIn) proposed += 1;
        else if (!committedKeys.has(decisionKey(decision))) notDownloaded += 1;
      }
      return { total: log.length, notDownloaded, proposed };
    },
  };
}

export type DecisionLog = ReturnType<typeof createDecisionLog>;

/**
 * Whether a body holds what an accept or a replace wrote: its value at its
 * path (a path ending in `[]` holds it as one element). Anything else holds
 * nothing to check, and counts as held.
 */
export function decisionHolds(
  body: Body | null,
  decision: SuggestionDecision,
): boolean {
  if (!writes(decision.op) || decision.value === undefined) return true;
  if (!body) return false;
  return (
    checkSuggestion(body, {
      target: decision.target,
      path: decision.path,
      anchor: decision.anchor,
      op: decision.path.endsWith('[]') ? 'add' : 'set',
      value: decision.value,
    }).state === 'applied'
  );
}

// ── The server's side of a decision ─────────────────────────────────────────

/** An item as a decision needs it; the mock's store answers. */
export interface HostItem {
  id: string;
  body: Body | null;
  pendingBody: Body | null;
  editState: ContentEditState;
  pendingById: string | null;
  /** Who proposed, by name, for the 409. */
  pendingByName: string | null;
  /**
   * When a person last saved the live body; null while it is still the
   * seed's. A seed body was saved before any decision, whatever date the
   * seed gives it — so moving the seed's date on never makes a replay think
   * the owner took a value out since. A replay's own saves (their note
   * starts `Replayed from`, `isReplayNote`) write back what was decided and
   * decide nothing, so they never count: a later, fuller `decisions.json`
   * still writes what the first replay could not.
   */
  savedAt: Date | null;
}

/** What the server lends the decision code. */
export interface DecisionHost {
  /** The item under (kind, slug), deleted ones aside; null when none. */
  item(kind: string, slug: string): HostItem | null;
  /** `PUT /items` as `viewer`: the path every save takes. */
  put(input: Record<string, unknown>, viewer: MockViewer): MockResponse;
  /**
   * The checks `PUT /items` makes, without saving: `status` 200 when the
   * body would be taken, the save's own error otherwise. So nothing is
   * made for a save that would then be refused.
   */
  validate(kind: string, slug: string, body: Body): MockResponse;
  /**
   * The place already in the store, under any slug, that is the one this
   * body describes (C33, `linking/samePlace.ts`); null when none is.
   */
  findPlace(body: Body): string | null;
  /** A suggestion the server serves, by id. */
  suggestion(id: string): Suggestion | undefined;
  /**
   * Whether an import run's sure tier has been measured (its manifest's
   * `calibrated`); an unknown batch has not.
   */
  isCalibrated(batch: string): boolean;
  /** The level of a kind's body schema (whether `source` may be written). */
  schemaLevel(kind: string): number;
  now(): Date;
  log: DecisionLog;
}

/** One decision, as `POST /suggestions/decisions` takes it. */
export interface DecisionRequest {
  suggestionId: string;
  op: DecisionOp;
  /** Default `single`. */
  method?: DecisionMethod;
  /** For an accept: the value to write, when the owner changed it first. */
  value?: unknown;
  /**
   * For a replace: what the owner saw at the path and chose to write over —
   * the check's `current`. The write happens only while the path holds it.
   */
  seen?: unknown;
}

export const DECISION_OPS: readonly DecisionOp[] = [
  'accept',
  'replace',
  'reject',
  'drop',
  'review',
  'reopen',
];

/** What a request says about all its decisions at once. */
export interface DecideOptions {
  /**
   * The lowest confidence a bulk accept takes: the owner's, from the bulk
   * dialog. Left out, 0.85; never below 0.7, whatever is sent
   * (`status.ts` `whyNotBulk`).
   */
  threshold?: number;
  /**
   * Whose rules the decisions follow.
   *
   * `owner`, the default: a person's, at the console, through
   * `POST /suggestions/decisions`. Decisions are `single` or `bulk` (a bulk
   * accept goes only as far as `whyNotBulk` lets it), and every value
   * written is confirmed and names its sources.
   *
   * `import`: the bulk import's (design E.1,
   * `src/scripts/repoContent/importAll.ts`), which never comes over HTTP.
   * Every request is an admin's accept with `method: 'import'`, taken as
   * offered, and only what `whyNotImported` allows goes in: open, sure or
   * likely, never an external id, resting on a suggestion that stands. An
   * identity row the import takes without writing it counts as standing
   * (`identityTaken`), since every other row about an artist rests on one.
   * What it writes is plain data (owner decisions of 30 September 2026):
   * each value, and each record made for one, without `unverified`,
   * `source` or `externalIds` (`withoutProvenance`), and no display text
   * filled in beside an id. Each save's note names only the suggestion
   * ids (`importNote`). The decision log keeps the trail back to the
   * importer's artifacts. A record already under a slug is used when it
   * says the same once both are bare (`sameRecord`), because a bare record
   * keeps no outside id to match it by.
   */
  policy?: 'owner' | 'import';
}

const writes = (op: DecisionOp) => op === 'accept' || op === 'replace';

/** What became of one decision. */
export type DecisionResult =
  | {
      suggestionId: string;
      /**
       * `saved`: written directly (an admin); `proposed`: written into the
       * editor's proposal; `already`: the item said it already, and the
       * accept is logged; `recorded`: a reject, drop, review or reopen,
       * logged.
       */
      outcome: 'saved' | 'proposed' | 'already' | 'recorded';
      decision: SuggestionDecision;
      /** The item written, for a save or a proposal. */
      itemId?: string;
    }
  | {
      suggestionId: string;
      outcome: 'refused';
      /** The HTTP status this refusal would have on its own. */
      status: number;
      code: string;
      error: string;
      /** For a conflict: what the path holds now. */
      current?: unknown;
    };

type Refusal = Extract<DecisionResult, { outcome: 'refused' }>;

const refuse = (
  suggestionId: string,
  status: number,
  code: string,
  error: string,
  extra: { current?: unknown } = {},
): Refusal => ({
  suggestionId,
  outcome: 'refused',
  status,
  code,
  error,
  ...extra,
});

const targetKey = (target: SuggestionTarget) =>
  `${target.kind}\u0000${target.slug}`;

const kindName = (kind: string) => kind.replace(/_/g, ' ');

/** An error body from the server, as a refusal of `suggestionId`. */
const refusedBy = (suggestionId: string, response: MockResponse): Refusal => {
  const body = isObject(response.body) ? response.body : {};
  return refuse(
    suggestionId,
    response.status,
    typeof body.code === 'string' ? body.code : 'FAILED',
    typeof body.error === 'string' ? body.error : 'The save failed.',
  );
};

// ── Required records (C33) ──

const coordinatesOf = (body: Body): [number, number] | null => {
  const at = body.coordinates;
  return Array.isArray(at) &&
    typeof at[0] === 'number' &&
    typeof at[1] === 'number'
    ? [at[0], at[1]]
    : null;
};

/** A place body as the same-place rule reads it; null when it cannot. */
export const placeSpotOf = (body: Body) => {
  const coordinates = coordinatesOf(body);
  return typeof body.name === 'string' && coordinates
    ? {
        name: body.name,
        country: typeof body.country === 'string' ? body.country : null,
        coordinates,
      }
    : null;
};

/**
 * Whether a record already under the slug is the one a suggestion needs
 * (C33): a place with the same name within 5 km, or within 25 km in the
 * same country (`linking/samePlace.ts`, the planners' and the importer's
 * rule); an artist with the same MusicBrainz id, and nothing less —
 * namesakes are the commonest wrong match; a release, label or studio with
 * the same MusicBrainz id, whatever has been edited on it since (a label's
 * and a studio's id is in its `source` link, `apply.ts`
 * `musicBrainzIdOf`); anything else, the same body.
 *
 * `bare`: the bulk import's rule. Its records carry no outside id
 * (`withoutProvenance`), so anything but a place is the same record when the
 * two bodies say the same once both are bare. A namesake with other fields
 * is not, and the rows needing it are refused for a person to look at.
 */
export function sameRecord(
  kind: string,
  existing: Body,
  wanted: Body,
  options: { bare?: boolean } = {},
) {
  if (kind === 'globe_city') {
    const here = placeSpotOf(existing);
    const there = placeSpotOf(wanted);
    return !!here && !!there && samePlace(here, there);
  }
  if (options.bare)
    return sameJson(withoutProvenance(existing), withoutProvenance(wanted));
  const mbid = musicBrainzIdOf(kind, wanted);
  const held = musicBrainzIdOf(kind, existing);
  if (kind === 'artist') return !!mbid && mbid === held;
  if (mbid && held) return mbid === held;
  return sameJson(withoutRefMeta(existing), withoutRefMeta(wanted));
}

const kindRank = (kind: string) => {
  const at = ALL_KINDS.indexOf(kind as MockKind);
  return at === -1 ? ALL_KINDS.length : at;
};

const recordKey = (record: Pick<RequiredRecord, 'kind' | 'slug'>) =>
  `${record.kind}\u0000${record.slug}`;

/**
 * A record's name, for the text an accept fills in beside an id (C20,
 * `apply.ts`): the store's record, else the body of one about to be made
 * for it.
 */
function namesFrom(
  host: Pick<DecisionHost, 'item'>,
  records: Iterable<RequiredRecord>,
): NameOf {
  const bodies = new Map<string, unknown>();
  for (const record of records) bodies.set(recordKey(record), record.body);
  return (kind, slug) => {
    const held = host.item(kind, slug);
    const body = held
      ? (held.body ?? held.pendingBody)
      : bodies.get(recordKey({ kind, slug }));
    return isObject(body) && typeof body.name === 'string'
      ? body.name
      : undefined;
  };
}

/**
 * The records a suggestion needs made, less its own item: a Label row
 * carries the release it labels, which an Album row made (it is written
 * only once that release exists), and whatever is under the slug it
 * targets is what it writes into — never a record to make or match.
 */
const toMake = (
  requires: readonly RequiredRecord[],
  target: SuggestionTarget,
): RequiredRecord[] =>
  requires.filter((record) => recordKey(record) !== targetKey(target));

/**
 * Every string equal to a renamed slug, as the slug it is now; the value
 * itself when it names none of them.
 */
function renamedIn(value: unknown, renamed: ReadonlyMap<string, string>) {
  if (!renamed.size) return value;
  let changed = false;
  const walk = (node: unknown): unknown => {
    if (typeof node === 'string') {
      const now = renamed.get(node);
      if (now === undefined) return node;
      changed = true;
      return now;
    }
    if (Array.isArray(node)) return node.map(walk);
    if (isObject(node))
      return Object.fromEntries(
        Object.entries(node).map(([key, field]) => [key, walk(field)]),
      );
    return node;
  };
  const walked = walk(value);
  return changed ? walked : value;
}

/** What a set of accepts needs made first, worked out before anything is. */
interface RequiredPlan {
  /** To create, in the contract's publish order, each with who needs it. */
  create: { record: RequiredRecord; by: string[] }[];
  /**
   * A place asked for under a slug that is free, when the store already
   * has that place under another (C33): the other is used, and the value
   * names it instead. Slug asked for → slug used.
   */
  renamed: Map<string, string>;
  /** Accepts that cannot go ahead, and why. */
  refused: Map<string, Refusal>;
}

/**
 * Plan the records these accepts need (`needs`: each accept's id and its
 * records): used when already there and the same one (`sameRecord`), or a
 * place already here under another slug; created otherwise; refused when
 * the slug holds something else, or the record would not be taken
 * (`validate`) — all before anything is written. `reuseAny` takes whatever
 * is under the slug (a replay, whose records were checked when accepted);
 * `bare` matches as the bulk import does (`sameRecord`).
 */
function planRequired(
  needs: readonly {
    id: string;
    requires: readonly RequiredRecord[];
    /** Its records are made bare: they match as `bare` does. */
    bare?: boolean;
  }[],
  host: Pick<DecisionHost, 'item' | 'findPlace' | 'validate'>,
  options: { reuseAny: boolean; bare?: boolean },
): RequiredPlan {
  const wanted = new Map<
    string,
    { record: RequiredRecord; by: string[]; bare: boolean }
  >();
  for (const { id, requires, bare } of needs)
    for (const record of requires) {
      const entry = wanted.get(recordKey(record)) ?? {
        record,
        by: [],
        bare: false,
      };
      if (!entry.by.includes(id)) entry.by.push(id);
      if (bare) entry.bare = true;
      wanted.set(recordKey(record), entry);
    }
  const plan: RequiredPlan = {
    create: [],
    renamed: new Map(),
    refused: new Map(),
  };
  const ordered = [...wanted.values()].sort(
    (a, b) => kindRank(a.record.kind) - kindRank(b.record.kind),
  );
  for (const entry of ordered) {
    const { record, by } = entry;
    const stop = (refusal: (id: string) => Refusal) => {
      for (const id of by)
        if (!plan.refused.has(id)) plan.refused.set(id, refusal(id));
    };
    const body = isObject(record.body) ? record.body : null;
    if (!body) {
      stop((id) =>
        refuse(
          id,
          422,
          'REQUIRED_RECORD_INVALID',
          `The ${kindName(record.kind)} "${record.slug}" it needs has no body to create it from.`,
        ),
      );
      continue;
    }
    const existing = host.item(record.kind, record.slug);
    if (existing) {
      const held = existing.body ?? existing.pendingBody;
      if (
        options.reuseAny ||
        (held &&
          sameRecord(record.kind, held, body, {
            bare: options.bare === true || entry.bare,
          }))
      )
        continue;
      stop((id) =>
        refuse(
          id,
          409,
          'REQUIRED_RECORD_TAKEN',
          `A different ${kindName(record.kind)} already has the slug "${record.slug}", so the one this suggestion needs cannot be made under it: a person decides which is meant.`,
        ),
      );
      continue;
    }
    const other = record.kind === 'globe_city' ? host.findPlace(body) : null;
    if (other) {
      plan.renamed.set(record.slug, other);
      continue;
    }
    plan.create.push(entry);
  }
  // A record made for another names the place it is in as the store does.
  plan.create = plan.create.map(({ record, by }) => ({
    record: { ...record, body: renamedIn(record.body, plan.renamed) },
    by,
  }));
  for (const { record, by } of plan.create) {
    const checked = host.validate(
      record.kind,
      record.slug,
      record.body as Body,
    );
    if (checked.status === 200) continue;
    const why = refusedBy('', checked).error;
    for (const id of by)
      if (!plan.refused.has(id))
        plan.refused.set(
          id,
          refuse(
            id,
            422,
            'REQUIRED_RECORD_INVALID',
            `The ${kindName(record.kind)} "${record.slug}" it needs would not be taken: ${why}`,
          ),
        );
  }
  return plan;
}

/**
 * Make the planned records, create-only and in publish order, for the
 * accepts in `going` — the ones whose own save has passed its checks, so
 * nothing is made for an accept that is then refused. An admin's record
 * joins its kind's next publish, as the item that names it will; an
 * editor's is a proposal like the rest. Returns why each accept whose
 * record could not be made cannot go ahead, and what was made.
 */
function makeRequired(
  plan: RequiredPlan,
  going: ReadonlySet<string>,
  viewer: MockViewer,
  host: Pick<DecisionHost, 'put'>,
  options: { replay?: boolean } = {},
): { refused: Map<string, Refusal>; created: RequiredRecord[] } {
  const refused = new Map<string, Refusal>();
  const created: RequiredRecord[] = [];
  for (const { record, by } of plan.create) {
    const users = by.filter((id) => going.has(id) && !refused.has(id));
    if (!users.length) continue;
    const made = `for suggestion${users.length === 1 ? '' : 's'} ${users.join(', ')}`;
    const response = host.put(
      {
        kind: record.kind,
        slug: record.slug,
        body: record.body,
        create: true,
        ...(viewer.role === 'admin' ? { status: 'published' } : {}),
        note: options.replay
          ? `${REPLAY_NOTE}: created ${made}`
          : `Created ${made}`,
      },
      viewer,
    );
    if (response.status === 200) created.push(record);
    else for (const id of users) refused.set(id, refusedBy(id, response));
  }
  return { refused, created };
}

// ── POST /suggestions/decisions ──

/**
 * The body an accept by `viewer` builds on, or why there is none: an
 * editor's own proposal, else the live body. Someone else's proposal on the
 * item stops it, waiting or sent back — an admin's save would slide under
 * it, to be overwritten when it is approved, and an editor's would replace
 * another person's work.
 */
function baseFor(
  item: HostItem,
  viewer: MockViewer,
):
  | { body: Body; ownProposal: boolean }
  | { status: number; code: string; error: string } {
  const own = !!item.pendingBody && item.pendingById === viewer.userId;
  if (viewer.role === 'editor' && own)
    return { body: item.pendingBody!, ownProposal: true };
  if (item.pendingBody) {
    const who = item.pendingByName ?? item.pendingById ?? 'an editor';
    const sentBack = item.editState !== 'pending';
    return {
      status: 409,
      code: 'PENDING_PROPOSAL',
      error: `${
        sentBack
          ? `This item has a proposal that was sent back to ${who}. They resubmit or withdraw it, or an admin discards it, first`
          : `This item has a proposal waiting from ${who}. Approve it or send it back first`
      }: ${
        viewer.role === 'admin'
          ? 'a direct save now would be overwritten when it is approved'
          : 'saving now would replace their proposal'
      }.`,
    };
  }
  if (!item.body)
    return {
      status: 404,
      code: 'NOT_FOUND',
      error: 'The item exists only as someone else’s proposal.',
    };
  return { body: item.body, ownProposal: false };
}

/**
 * Take decisions about suggestions, as `viewer`. Rejects, drops, reviews
 * and reopens are logged (admins only: they are not proposals anyone
 * reviews); a reject or a drop only of a value the item (or a proposal on
 * it) does not say, and a reopen only of a suggestion rejected or dropped.
 * Accepts and replaces are written — the records they need, then one save
 * per item with every accept for it, noted with the suggestion ids and
 * sources — and logged once the save has gone through. A bulk accept is an
 * admin's, and only of what `whyNotBulk` allows: never a City read from
 * song pins nor a song's year; open, sure, at or above the request's
 * threshold, calibrated, and resting on a suggestion that stands (its
 * item's live body says it). The bulk import's decisions follow rules of
 * their own (`DecideOptions.policy`). One result per request, in order.
 */
export function decide(
  requests: readonly DecisionRequest[],
  viewer: MockViewer,
  host: DecisionHost,
  options: DecideOptions = {},
): DecisionResult[] {
  const at = host.now().toISOString();
  const results = new Map<number, DecisionResult>();
  const found = new Map<number, Suggestion>();
  const importing = options.policy === 'import';
  // Read before anything is written, so the catalog is planned once.
  const decided = host.log.bySuggestion();
  // What a bulk accept rests on stands when its item's live body says it:
  // an accept still in a proposal, or taken out by hand since, does not.
  // An identity row (another catalogue's id for the item) is never written
  // and the console does not show it, so for the import and a bulk accept
  // alike it stands when the import would take it (`identityTaken`).
  // Everything here is read before anything is written, so it is kept.
  const standing = new Map<string, boolean>();
  const isAccepted = (id: string): boolean => {
    const known = standing.get(id);
    if (known !== undefined) return known;
    // A suggestion resting on itself, however far round, rests on nothing.
    standing.set(id, false);
    const dependency = host.suggestion(id);
    const item = dependency
      ? host.item(dependency.target.kind, dependency.target.slug)
      : null;
    let stands = !!dependency && dependencyStands(dependency, item?.body);
    if (
      dependency &&
      !stands &&
      (importing || isExternalIdPath(dependency.path))
    )
      stands =
        identityTaken(
          dependency,
          suggestionStatus(dependency, item?.body, decided, {
            savedAt: item?.savedAt,
          }),
        ) &&
        (!dependency.dependsOn || isAccepted(dependency.dependsOn));
    standing.set(id, stands);
    return stands;
  };
  /** Why each request a bulk accept or the import leaves out is left out. */
  const blocked = new Map<number, Refusal>();

  requests.forEach((request, index) => {
    const suggestion = host.suggestion(request.suggestionId);
    if (!suggestion) {
      results.set(
        index,
        refuse(
          request.suggestionId,
          404,
          'NO_SUCH_SUGGESTION',
          `No suggestion "${request.suggestionId}" is served here.`,
        ),
      );
      return;
    }
    if ((request.method === 'import') !== importing) {
      results.set(
        index,
        refuse(
          request.suggestionId,
          422,
          'NOT_IMPORT',
          importing
            ? 'The bulk import decides with method import, and only that.'
            : 'Method import is the bulk import’s own: a person decides single or bulk.',
        ),
      );
      return;
    }
    if (importing) {
      if (viewer.role !== 'admin') {
        results.set(
          index,
          refuse(
            request.suggestionId,
            403,
            'FORBIDDEN',
            'Only an admin runs the bulk import.',
          ),
        );
        return;
      }
      if (
        request.op !== 'accept' ||
        request.value !== undefined ||
        request.seen !== undefined
      ) {
        results.set(
          index,
          refuse(
            request.suggestionId,
            422,
            'NOT_IMPORT',
            'The bulk import accepts each suggestion as offered: nothing else, and no changed value.',
          ),
        );
        return;
      }
      // Whether it is still open is read against its item below.
      const why = whyNotImported(suggestion, 'open', { stands: isAccepted });
      if (why)
        blocked.set(
          index,
          refuse(suggestion.id, 422, 'NOT_IMPORTED', `Not imported: ${why}.`),
        );
      found.set(index, suggestion);
      return;
    }
    if (!writes(request.op) && viewer.role !== 'admin') {
      results.set(
        index,
        refuse(
          request.suggestionId,
          403,
          'FORBIDDEN',
          'Only an admin can reject, drop or mark reviewed: no one reviews those afterwards.',
        ),
      );
      return;
    }
    if (request.method === 'bulk' && writes(request.op)) {
      if (viewer.role !== 'admin') {
        results.set(
          index,
          refuse(
            request.suggestionId,
            403,
            'FORBIDDEN',
            'Only an admin accepts in bulk: an editor accepts one at a time, for review.',
          ),
        );
        return;
      }
      if (request.op === 'replace' || request.value !== undefined) {
        results.set(
          index,
          refuse(
            request.suggestionId,
            422,
            'NOT_BULK',
            'A bulk accept takes each suggestion as offered: a replace, or a changed value, is made one at a time.',
          ),
        );
        return;
      }
      // Whether it is still open is read against its item below.
      const why = whyNotBulk(suggestion, 'open', {
        threshold: options.threshold,
        isAccepted,
        isCalibrated: (batch) => host.isCalibrated(batch),
      });
      if (why)
        blocked.set(
          index,
          refuse(
            suggestion.id,
            422,
            'NOT_BULK',
            `Not accepted in bulk: ${why}.`,
          ),
        );
    }
    found.set(index, suggestion);
  });
  for (const [index, refusal] of blocked) {
    found.delete(index);
    results.set(index, refusal);
  }

  // Rejects, drops, reviews and reopens: nothing to write. Each is read
  // against the log as the ones before it in the request left it, so a
  // reject and its undo can go together.
  for (const [index, suggestion] of found) {
    const request = requests[index];
    if (writes(request.op)) continue;
    if (request.op === 'reject' || request.op === 'drop') {
      // A reject leaves the item as it is, and a replay would then leave
      // the value out: it is taken out by editing the item first.
      const item = host.item(suggestion.target.kind, suggestion.target.slug);
      const says = (body: Body | null | undefined) =>
        !!body && checkSuggestion(body, suggestion).state === 'applied';
      const live = says(item?.body);
      if (live || says(item?.pendingBody)) {
        results.set(
          index,
          refuse(
            suggestion.id,
            409,
            'SUGGESTION_APPLIED',
            `The ${kindName(suggestion.target.kind)} says this already${
              live ? '' : ', in the proposal waiting on it'
            }: take the value out by editing it first, then ${request.op} it.`,
          ),
        );
        continue;
      }
    }
    if (request.op === 'reopen') {
      const { state } = decisionState(suggestion, host.log.bySuggestion());
      if (!canReopen(state)) {
        results.set(
          index,
          refuse(
            suggestion.id,
            409,
            'NOT_REOPENABLE',
            state === 'open'
              ? 'This suggestion is open already: there is nothing to reopen.'
              : 'Only a rejected or dropped suggestion is reopened: an accepted one is taken back by editing its item.',
          ),
        );
        continue;
      }
    }
    const decision = makeDecision(suggestion, request.op, {
      by: viewer.userId,
      at,
      method: request.method ?? 'single',
    });
    host.log.append(decision);
    results.set(index, {
      suggestionId: suggestion.id,
      outcome: 'recorded',
      decision,
    });
  }

  // Accepts and replaces, item by item.
  const byItem = new Map<string, number[]>();
  const taken = new Set<string>();
  for (const [index, suggestion] of found) {
    if (!writes(requests[index].op)) continue;
    if (taken.has(suggestion.id)) {
      results.set(
        index,
        refuse(
          suggestion.id,
          400,
          'BAD_REQUEST',
          'This suggestion is accepted twice in one request.',
        ),
      );
      continue;
    }
    taken.add(suggestion.id);
    const key = targetKey(suggestion.target);
    byItem.set(key, [...(byItem.get(key) ?? []), index]);
  }

  /**
   * Whether what an accept writes goes in bare (`withoutProvenance`): every
   * accept the import makes, and any of a suggestion with an outside
   * provider, by whatever method. The site's data names no outside
   * catalogue and carries none of its ids (owner decision of 30 September
   * 2026); the decision log under `src/scripts/` keeps the trail.
   */
  const bare = (suggestion: Suggestion) => importing || fromOutside(suggestion);
  /**
   * The records a suggestion needs made first, as they would be made: as
   * it carries them, or bare (`bare`).
   */
  const requiredBy = (suggestion: Suggestion): RequiredRecord[] =>
    (suggestion.requires ?? []).map((record) =>
      bare(suggestion)
        ? { ...record, body: withoutProvenance(record.body) }
        : record,
    );

  /** The value an accept writes: the owner's own, when they changed it. */
  const valueOf = (index: number, renamed?: ReadonlyMap<string, string>) => {
    const request = requests[index];
    const value =
      request.value === undefined ? found.get(index)!.value : request.value;
    return renamed ? renamedIn(value, renamed) : value;
  };
  /** A record's name, from the store or the records these accepts make. */
  const nameOf = namesFrom(
    host,
    [...found.values()].flatMap((suggestion) => suggestion.requires ?? []),
  );
  /** What an accept writes, with any place renamed to the one the store has. */
  const acceptOf =
    (renamed?: ReadonlyMap<string, string>) =>
    (index: number): AcceptInput => {
      const suggestion = found.get(index)!;
      const value = valueOf(index, renamed);
      return {
        suggestion:
          value === suggestion.value ? suggestion : { ...suggestion, value },
        seen: requests[index].seen,
      };
    };

  // First, for each item: what it is built on, and which accepts would be
  // written. Refusals are known before anything is created.
  interface ItemPlan {
    item: HostItem;
    target: SuggestionTarget;
    /** The body the save builds on, and whether it is the editor's own proposal. */
    base: Body;
    own: boolean;
    /** The accepts that pass their check. */
    indexes: number[];
  }
  const plans: ItemPlan[] = [];
  const refuseAt = (index: number, refusal: Refusal) =>
    results.set(index, refusal);
  // The import writes bare, and fills in no display text beside an id: the
  // text is what students read, and the import writes no more of that than
  // the fields its rules name (design E.2, rule 4). A person's accept of an
  // outside suggestion is written bare too, by `applySuggestion` itself
  // (`fromOutside`), with the display text filled in.
  const applyTo = (
    plan: Pick<ItemPlan, 'base' | 'target'>,
    indexes: number[],
    renamed?: ReadonlyMap<string, string>,
  ) =>
    applySuggestions(plan.base, indexes.map(acceptOf(renamed)), {
      schemaLevel: host.schemaLevel(plan.target.kind),
      ...(importing ? { cite: false } : { nameOf }),
    });
  for (const indexes of byItem.values()) {
    const { target } = found.get(indexes[0])!;
    const refuseAll = (status: number, code: string, error: string) => {
      for (const index of indexes)
        refuseAt(index, refuse(found.get(index)!.id, status, code, error));
    };
    const item = host.item(target.kind, target.slug);
    if (!item) {
      // A Label row's release is made by an Album row, which it rests on.
      const madeFirst = indexes.some((index) =>
        found
          .get(index)!
          .requires?.some((record) => recordKey(record) === targetKey(target)),
      );
      refuseAll(
        404,
        'NOT_FOUND',
        madeFirst
          ? `There is no ${kindName(target.kind)} "${target.slug}" yet: it is made when a suggestion that needs it is accepted (the one this rests on), so accept that first.`
          : `There is no ${kindName(target.kind)} "${target.slug}" to write it into.`,
      );
      continue;
    }
    const base = baseFor(item, viewer);
    if ('status' in base) {
      refuseAll(base.status, base.code, base.error);
      continue;
    }
    // A bulk accept, and the import, write onto an empty path, and never
    // take what was decided before — accepted, rejected, dropped, or
    // accepted and taken out by hand since — nor log what the item already
    // says. What the body has changed under (a conflict, an element gone)
    // is found by the write below, and answered as a conflict, with what
    // is there now.
    const open = indexes.filter((index) => {
      const { method } = requests[index];
      if (method !== 'bulk' && method !== 'import') return true;
      const suggestion = found.get(index)!;
      const status = suggestionStatus(suggestion, base.body, decided, {
        savedAt: item.savedAt,
      });
      const changedUnder = status === 'conflict' || status === 'unreachable';
      const seen = changedUnder ? 'open' : status;
      const why =
        method === 'import'
          ? whyNotImported(suggestion, seen, { stands: isAccepted })
          : whyNotBulk(suggestion, seen, {
              threshold: options.threshold,
              isAccepted,
              isCalibrated: (batch) => host.isCalibrated(batch),
            });
      if (why)
        refuseAt(
          index,
          method === 'import'
            ? refuse(
                suggestion.id,
                422,
                'NOT_IMPORTED',
                `Not imported: ${why}.`,
              )
            : refuse(
                suggestion.id,
                422,
                'NOT_BULK',
                `Not accepted in bulk: ${why}.`,
              ),
        );
      return !why;
    });
    const dry = applyTo({ base: base.body, target }, open);
    const refusedIds = new Set<string>();
    for (const { suggestion, state, current, reason } of dry.refused) {
      refusedIds.add(suggestion.id);
      const index = open.find((i) => found.get(i)!.id === suggestion.id)!;
      refuseAt(
        index,
        refuse(
          suggestion.id,
          409,
          state === 'conflict'
            ? 'SUGGESTION_CONFLICT'
            : 'SUGGESTION_UNREACHABLE',
          state === 'conflict'
            ? `${suggestion.path} ${reason}; replace it, having seen what it holds, to write over it.`
            : reason,
          { current },
        ),
      );
    }
    plans.push({
      item,
      target,
      base: base.body,
      own: base.ownProposal,
      indexes: open.filter((i) => !refusedIds.has(found.get(i)!.id)),
    });
  }

  // Then the records the written accepts need — only those their value
  // names, when the owner changed it — planned before any is made.
  const indexById = new Map(
    [...found].map(([index, suggestion]) => [suggestion.id, index]),
  );
  const needs = plans.flatMap((plan) => {
    const dry = applyTo(plan, plan.indexes);
    return [...dry.accepted, ...dry.replaced].map((written) => {
      const index = indexById.get(written.id)!;
      const { target } = found.get(index)!;
      const requires = requiredBy(found.get(index)!);
      return {
        id: written.id,
        bare: bare(found.get(index)!),
        requires: toMake(
          requests[index].value === undefined
            ? requires
            : recordsNamedBy(requires, valueOf(index)),
          target,
        ),
      };
    });
  });
  const required = planRequired(needs, host, {
    reuseAny: false,
    bare: importing,
  });

  // Each item's save, with the places renamed, checked before anything is
  // made for it: a save that would be refused makes nothing.
  interface Ready {
    plan: ItemPlan;
    indexes: number[];
  }
  const ready: Ready[] = [];
  for (const plan of plans) {
    const indexes = plan.indexes.filter((index) => {
      const stopped = required.refused.get(found.get(index)!.id);
      if (stopped) refuseAt(index, stopped);
      return !stopped;
    });
    if (!indexes.length) continue;
    const applied = applyTo(plan, indexes, required.renamed);
    if (applied.accepted.length + applied.replaced.length) {
      const checked = host.validate(
        plan.target.kind,
        plan.target.slug,
        applied.body,
      );
      if (checked.status !== 200) {
        for (const index of indexes)
          refuseAt(index, refusedBy(found.get(index)!.id, checked));
        continue;
      }
    }
    ready.push({ plan, indexes });
  }
  const { refused: unmade } = makeRequired(
    required,
    new Set(
      ready.flatMap(({ indexes }) =>
        indexes.map((index) => found.get(index)!.id),
      ),
    ),
    viewer,
    host,
  );

  for (const { plan, indexes: going } of ready) {
    const { item, target } = plan;
    const indexes = going.filter((index) => {
      const stopped = unmade.get(found.get(index)!.id);
      if (stopped) refuseAt(index, stopped);
      return !stopped;
    });
    if (!indexes.length) continue;
    const applied = applyTo(plan, indexes, required.renamed);
    const indexOf = new Map(
      indexes.map((index) => [found.get(index)!.id, index]),
    );
    const written = [...applied.accepted, ...applied.replaced];
    let outcome: 'saved' | 'proposed' | null = null;
    if (written.length) {
      const response = host.put(
        {
          kind: target.kind,
          slug: target.slug,
          body: applied.body,
          note: importing
            ? importNote(written)
            : revisionNote(applied.accepted, applied.replaced),
        },
        viewer,
      );
      if (response.status !== 200) {
        // Nothing was saved, so what the item already said is not logged
        // either: the owner accepts again once the save can go through.
        for (const suggestion of [...written, ...applied.already])
          refuseAt(
            indexOf.get(suggestion.id)!,
            refusedBy(suggestion.id, response),
          );
        continue;
      }
      outcome = viewer.role === 'admin' ? 'saved' : 'proposed';
    }

    const replaced = new Set(applied.replaced.map((s) => s.id));
    for (const suggestion of [...written, ...applied.already]) {
      const index = indexOf.get(suggestion.id)!;
      const request = requests[index];
      const original = found.get(index)!;
      const op: DecisionOp = replaced.has(suggestion.id) ? 'replace' : 'accept';
      const already = !written.includes(suggestion);
      // An editor's accept lives in their proposal until it is approved:
      // one just written there, or one their proposal already held.
      const proposed = viewer.role !== 'admin' && (!already || plan.own);
      // The value as written: the owner's, with a place the store already
      // had under another slug named as the store names it — and bare, as
      // it went in, for the import. So are the records it made, which a
      // replay makes again from the decision alone.
      const named = valueOf(index, required.renamed);
      const value = bare(original) ? withoutProvenance(named) : named;
      const asMade =
        required.renamed.size || bare(original)
          ? {
              ...original,
              ...(original.requires
                ? {
                    requires: requiredBy(original).map((record) => ({
                      ...record,
                      body: renamedIn(record.body, required.renamed),
                    })),
                  }
                : {}),
            }
          : original;
      const decision: StoredDecision = {
        ...makeDecision(asMade, op, {
          by: viewer.userId,
          at,
          method: request.method ?? 'single',
          value:
            request.value === undefined && value === original.value
              ? undefined
              : value,
          seen: request.seen,
        }),
        ...(proposed ? { proposedIn: item.id } : {}),
      };
      host.log.append(decision);
      results.set(index, {
        suggestionId: original.id,
        outcome: already ? 'already' : outcome!,
        decision: contractRow(decision),
        ...(already ? {} : { itemId: item.id }),
      });
    }
  }

  return requests.map((_, index) => results.get(index)!);
}

// ── Replay (§5.3) ───────────────────────────────────────────────────────────

/** A committed accept the replay did not write, and why. */
export interface ReplayConflict {
  suggestionId: string;
  target: SuggestionTarget;
  path: string;
  reason: string;
}

export interface ReplayReport {
  /** Committed accepts and replaces that still stand. */
  considered: number;
  /** Written again: the store had lost them. */
  applied: number;
  /** The store already said them. */
  already: number;
  /**
   * Missing from an item saved since the decision: someone took the value
   * out by hand, and that later save stands. Left alone, and counted.
   */
  removedSince: number;
  /** Records a replayed value needed, created. */
  created: number;
  /** Not written, each with why: for a person, never forced. */
  conflicts: ReplayConflict[];
  /** Rows of the committed file the contract does not describe. */
  refused: string[];
  /** Why the committed file could not be read at all; null when it could. */
  error: string | null;
}

/**
 * The committed accepts and replaces that still stand, oldest first: the
 * latest decision about each suggestion, reviews and reopens aside, when
 * that is an accept or a replace. A later reject or drop has taken it back,
 * and reopening that reject puts the suggestion back on offer, not its
 * value back in the item.
 */
export function standingAccepts(
  decisions: readonly SuggestionDecision[],
): SuggestionDecision[] {
  const standing: SuggestionDecision[] = [];
  for (const list of decisionsBySuggestion(decisions).values()) {
    const last = [...list]
      .reverse()
      .find((decision) => decision.op !== 'review' && decision.op !== 'reopen');
    if (last && writes(last.op)) standing.push(last);
  }
  return standing.sort(byTime);
}

/** The note on a replayed save: the suggestions, their sources, and the file. */
function replayNote(
  decisions: readonly SuggestionDecision[],
  suggestionOf: (id: string) => Suggestion | undefined,
): string {
  const known: Suggestion[] = [];
  const unknown: string[] = [];
  for (const decision of decisions) {
    const suggestion = suggestionOf(decision.suggestionId);
    if (suggestion) known.push(suggestion);
    else unknown.push(decision.suggestionId);
  }
  const parts = [
    known.length ? revisionNote(known) : '',
    unknown.length
      ? `Accepted suggestion${unknown.length === 1 ? '' : 's'} ${unknown.join(', ')} (sources not loaded)`
      : '',
  ].filter(Boolean);
  return `${REPLAY_NOTE}: ${parts.join('; ')}`;
}

/**
 * Write the committed accepts again where the store has lost them (§5.3):
 * after a Reset, or after a seed change dropped the patches that held them.
 *
 * Each goes through `apply.ts` `replayDecision`: onto an empty path, or —
 * for a replace — over the very value the owner replaced, never over
 * anything newer. What is already there is left alone, so replaying twice
 * writes nothing the second time. The records a value needs — as the
 * decision keeps them, else as its suggestion carries them — are created
 * create-only (one already under the slug is used, never written over; a
 * place the store has under another slug is used, and the value names it
 * so). Each item is one admin save, with a note naming the suggestions and
 * their sources. An item with someone's proposal on it, a value that no
 * longer fits, a save the schema refuses: each is listed, never forced.
 *
 * The suggestions are read once, before the first save: each save moves
 * the store on, and the app's are planned again from a store that has
 * moved — once per item, over a whole Stage-1 file, would take minutes.
 */
export function replayDecisions(
  committed: ParsedDecisionsFile,
  host: Omit<DecisionHost, 'log' | 'now'>,
): ReplayReport {
  const report: ReplayReport = {
    considered: 0,
    applied: 0,
    already: 0,
    removedSince: 0,
    created: 0,
    conflicts: [],
    refused: committed.refused,
    error: committed.error,
  };
  const standing = standingAccepts(committed.decisions);
  report.considered = standing.length;
  const conflict = (decision: SuggestionDecision, reason: string) =>
    report.conflicts.push({
      suggestionId: decision.suggestionId,
      target: decision.target,
      path: decision.path,
      reason,
    });

  // Looked up only once something is to be written, so a load where
  // everything is in place plans nothing; then all at once, before any save.
  let frozen: Map<string, Suggestion | undefined> | null = null;
  const suggestionOf = (id: string) => {
    frozen ??= new Map(
      standing.map((decision) => [
        decision.suggestionId,
        host.suggestion(decision.suggestionId),
      ]),
    );
    return frozen.get(id);
  };

  // Item by item, in the order the owner first touched each.
  const byItem = new Map<string, SuggestionDecision[]>();
  for (const decision of standing) {
    const key = targetKey(decision.target);
    byItem.set(key, [...(byItem.get(key) ?? []), decision]);
  }
  /**
   * Records this replay made for an earlier item: a release an Album row
   * made, which its Label row then writes into. Made now, from the
   * decision's own copy, they were not saved by anyone since the decision.
   */
  const madeHere = new Set<string>();

  for (const decisions of byItem.values()) {
    const { target } = decisions[0];
    const viewer: MockViewer = { role: 'admin', userId: decisions[0].by };
    const item = host.item(target.kind, target.slug);
    const savedAt = madeHere.has(targetKey(target)) ? null : item?.savedAt;
    if (!item) {
      for (const decision of decisions)
        conflict(
          decision,
          `there is no ${kindName(target.kind)} "${target.slug}" now`,
        );
      continue;
    }
    if (item.pendingBody) {
      const reason =
        item.editState === 'pending'
          ? 'a proposal waits on it; review that first'
          : 'a proposal sent back is on it; it is resubmitted, withdrawn or discarded first';
      for (const decision of decisions) conflict(decision, reason);
      continue;
    }
    if (!item.body) {
      for (const decision of decisions)
        conflict(decision, 'it exists only as a proposal');
      continue;
    }

    const level = host.schemaLevel(target.kind);
    /** Which decisions write anything, onto what, and the body they make. */
    const walk = (
      renamed: ReadonlyMap<string, string>,
      nameOf: NameOf,
      tally?: ReplayReport,
    ) => {
      let body = item.body!;
      const toWrite: SuggestionDecision[] = [];
      for (const listed of decisions) {
        const decision = renamed.size
          ? { ...listed, value: renamedIn(listed.value, renamed) }
          : listed;
        const dry = replayDecision(body, decision, {
          schemaLevel: level,
          nameOf,
        });
        if (!dry) continue;
        if (!dry.ok) {
          if (tally) conflict(listed, dry.reason);
          continue;
        }
        if (!dry.changed) {
          if (tally) tally.already += 1;
          continue;
        }
        // Saved after the decision and without its value: taken out by hand
        // since. A seed change or a Reset puts the item back at its seed —
        // saved before any decision, whatever date the seed gives it — so
        // what they lost is still written.
        if (savedAt && savedAt.getTime() > Date.parse(listed.at)) {
          if (tally) tally.removedSince += 1;
          continue;
        }
        const result = replayDecision(body, decision, {
          sources: suggestionOf(listed.suggestionId)?.sources,
          schemaLevel: level,
          nameOf,
        });
        if (result?.ok && result.changed) {
          body = result.body;
          toWrite.push(listed);
        }
      }
      return { body, toWrite };
    };

    // What must be made first: the decision's own records, else its
    // suggestion's, only those its value names.
    const stored = namesFrom(host, []);
    const first = walk(new Map(), stored);
    if (!first.toWrite.length) {
      walk(new Map(), stored, report);
      continue;
    }
    const required = planRequired(
      first.toWrite.map((decision) => ({
        id: decision.suggestionId,
        requires: toMake(
          recordsNamedBy(
            decision.requires ??
              suggestionOf(decision.suggestionId)?.requires ??
              [],
            decision.value,
          ),
          target,
        ),
      })),
      host,
      { reuseAny: true },
    );
    const { body, toWrite } = walk(
      required.renamed,
      namesFrom(
        host,
        required.create.map(({ record }) => record),
      ),
      report,
    );
    if (!toWrite.length) continue;

    const stopped = toWrite.filter((decision) =>
      required.refused.has(decision.suggestionId),
    );
    if (stopped.length) {
      for (const decision of toWrite) {
        const refusal = required.refused.get(decision.suggestionId);
        conflict(
          decision,
          refusal
            ? `a record it needs could not be made: ${refusal.error}`
            : 'another accept for this item needs a record that could not be made',
        );
      }
      continue;
    }
    const checked = host.validate(target.kind, target.slug, body);
    if (checked.status !== 200) {
      const why = refusedBy('', checked).error;
      for (const decision of toWrite)
        conflict(decision, `the save was refused: ${why}`);
      continue;
    }
    const made = makeRequired(
      required,
      new Set(toWrite.map((decision) => decision.suggestionId)),
      viewer,
      host,
      { replay: true },
    );
    report.created += made.created.length;
    for (const record of made.created) madeHere.add(recordKey(record));
    if (made.refused.size) {
      for (const decision of toWrite) {
        const refusal = made.refused.get(decision.suggestionId);
        conflict(
          decision,
          refusal
            ? `a record it needs could not be made: ${refusal.error}`
            : 'another accept for this item needs a record that could not be made',
        );
      }
      continue;
    }

    const response = host.put(
      {
        kind: target.kind,
        slug: target.slug,
        body,
        note: replayNote(toWrite, suggestionOf),
      },
      viewer,
    );
    if (response.status !== 200) {
      const why = refusedBy('', response).error;
      for (const decision of toWrite)
        conflict(decision, `the save was refused: ${why}`);
      continue;
    }
    report.applied += toWrite.length;
  }
  return report;
}
