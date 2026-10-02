import {
  parseRefPath,
  type PathStep,
  readSteps,
  writeSteps,
} from '../bodyPaths';
import { artistSlug } from '../graph/slugs';
import {
  elementKeys,
  REF_META_KEYS,
  sameElement,
  sameJson,
  valueHash,
  withoutRefMeta,
} from './keys';
import type {
  Suggestion,
  SuggestionDecision,
  SuggestionProvider,
  SuggestionSource,
} from './types';

/**
 * Accepting a suggestion: the body it produces, and the note that says why.
 *
 * Pure — no store, no fetch. The caller hands in the body the save would be
 * built from (an editor's own proposal, else the live body; re-read just
 * before writing when it is a bulk run) and saves what comes back, as a
 * proposal for an editor or directly for an admin. That makes an accept an
 * ordinary save: validated, revisioned and reviewable like any other.
 *
 * The one rule that matters is the precondition. A suggestion is written
 * only where the path is still empty, or still holds exactly what the owner
 * saw beside the suggestion when they chose to replace it. Anything else is
 * a conflict: listed for a person, never forced — the body moved on since
 * the suggestion was looked at, and the newer value may be the owner's.
 */

/**
 * Where a body keeps `unverified` and `source` beside a value (RefMeta in
 * the design, §3.3). A value written at one of these gets `source` from the
 * suggestion; a value written inside one (`session.studioId`) adds its
 * source to the holder's. A song's `source` fields arrive with song schema
 * v2 — the v1 schema refuses them — so they wait for `schemaLevel` 2.
 */
export const REF_META_HOLDERS: readonly {
  kind: string;
  path: string;
  /** The body schema level that first accepts `source` here. */
  sourceFrom?: number;
}[] = [
  { kind: 'artist', path: 'born' },
  { kind: 'artist', path: 'members[]' },
  { kind: 'artist', path: 'influencedBy[]' },
  { kind: 'song', path: 'credits[]', sourceFrom: 2 },
  { kind: 'song', path: 'relatedRecordings[]', sourceFrom: 2 },
  { kind: 'song', path: 'releases[]', sourceFrom: 2 },
  { kind: 'song', path: 'session', sourceFrom: 2 },
];

/**
 * Lists where `[]` is a statement, not a blank: on a globe event, stored ids
 * win over what the graph infers from the tags, and `[]` says "exactly none"
 * (decision 5). Adding to one the owner emptied would undo their answer; and
 * adding one element to one that is not stored yet would turn "inferred"
 * into "exactly this one", and every other guess would leave the graph.
 */
const STATED_EMPTY: Record<string, readonly string[]> = {
  globe_event: ['artistIds', 'songIds', 'releaseIds', 'studioIds', 'labelIds'],
};

const statesEmpty = (kind: string, field: string): boolean =>
  Object.prototype.hasOwnProperty.call(STATED_EMPTY, kind) &&
  STATED_EMPTY[kind].includes(field);

/**
 * The name a provider goes by in a revision note, which the console's
 * history shows: the site names no outside catalogue (owner decision of 30
 * September 2026), so each of the importer's is "an outside source".
 */
const PROVIDER_NAME: Record<SuggestionProvider, string> = {
  app: 'the app',
  musicbrainz: 'an outside source',
  wikidata: 'an outside source',
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

/** Nothing stated: absent, blank text, an empty list, an object saying nothing. */
const isBlank = (value: unknown): boolean =>
  value === undefined ||
  value === null ||
  (typeof value === 'string' && !value.trim()) ||
  (Array.isArray(value) && value.length === 0) ||
  (isPlainObject(value) &&
    Object.values(withoutRefMeta(value) as object).every(
      (field) => field === undefined,
    ));

/** Whether a suggestion's current value is the one it offers. */
const saysTheSame = (current: unknown, value: unknown) =>
  sameJson(withoutRefMeta(current), withoutRefMeta(value));

const unique = <T>(items: readonly T[]) => [...new Set(items)];

/**
 * Whether any of a suggestion's providers is outside the app (the importer's
 * catalogues). Such a suggestion is written bare, naming none of them
 * (`ApplyOptions.cite`). A replayed decision may come with no sources.
 */
export const fromOutside = (suggestion: {
  sources?: readonly Pick<SuggestionSource, 'provider'>[];
}): boolean =>
  (suggestion.sources ?? []).some((source) => source.provider !== 'app');

/** The providers behind a suggestion, as a body's `source` spells them. */
export const sourceOf = (suggestion: Pick<Suggestion, 'sources'>): string =>
  unique(suggestion.sources.map((s) => s.provider)).join(', ');

/**
 * The keys that say where a value came from rather than what it says:
 * RefMeta (`unverified`, `source`) and a record's `externalIds`, the ids
 * other catalogues give it.
 */
export const PROVENANCE_KEYS: readonly string[] = [
  ...REF_META_KEYS,
  'externalIds',
];

/**
 * A value, or a record's body, as a person would type it: every
 * `PROVENANCE_KEYS` field dropped, at any depth. This is how the bulk
 * import writes (owner decisions of 30 September 2026: no outside
 * catalogue is named in data the site reads, and an imported value is plain
 * data, not a value waiting to be confirmed). What it came from stays in
 * the decision log and the importer's artifacts. Returns the value itself
 * when there is nothing to drop.
 */
export function withoutProvenance<T>(value: T): T {
  const walk = (node: unknown): unknown => {
    if (Array.isArray(node)) {
      const items = node.map(walk);
      return items.some((item, at) => item !== node[at]) ? items : node;
    }
    if (!isPlainObject(node)) return node;
    let changed = false;
    const out: Record<string, unknown> = {};
    for (const [key, field] of Object.entries(node)) {
      if (PROVENANCE_KEYS.includes(key)) {
        changed = true;
        continue;
      }
      const walked = walk(field);
      if (walked !== field) changed = true;
      out[key] = walked;
    }
    return changed ? out : node;
  };
  return walk(value) as T;
}

/** Where each provider's pages are: a `source` that links there names it. */
const PROVIDER_SITE: Partial<Record<SuggestionProvider, RegExp>> = {
  musicbrainz: /^https?:\/\/(?:[\w-]+\.)*musicbrainz\.org\//i,
  wikidata: /^https?:\/\/(?:[\w-]+\.)*wikidata\.org\//i,
};

/** Whether one entry of a `source` names a provider: by name, or by linking to it. */
const saysProvider = (entry: string, provider: string): boolean =>
  entry.toLowerCase() === provider ||
  !!PROVIDER_SITE[provider as SuggestionProvider]?.test(entry);

/**
 * Whether a value's `source`, at any depth, names an outside provider by
 * name or by link: an accept logged before outside suggestions went in
 * bare still carries one.
 */
const citesOutside = (value: unknown): boolean => {
  if (Array.isArray(value)) return value.some(citesOutside);
  if (!isPlainObject(value)) return false;
  return Object.entries(value).some(([key, field]) =>
    key === 'source' && typeof field === 'string'
      ? field
          .split(',')
          .some((entry) =>
            Object.keys(PROVIDER_SITE).some((provider) =>
              saysProvider(entry.trim(), provider),
            ),
          )
      : citesOutside(field),
  );
};

/**
 * Add providers to a `source` already there, each once. What was there
 * stays as it was: a credit's `https://musicbrainz.org/artist/<mbid>` is
 * the only place its MusicBrainz id is kept (C30), and it already names
 * MusicBrainz, so "musicbrainz" is not added beside it.
 */
const mergeSource = (existing: unknown, added: string): string => {
  const entries = (typeof existing === 'string' ? existing : '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const merged = unique(entries);
  for (const provider of added.split(',').map((s) => s.trim()))
    if (provider && !merged.some((entry) => saysProvider(entry, provider)))
      merged.push(provider);
  return merged.join(', ');
};

/**
 * The MusicBrainz page a record is on, by its kind: a studio is a place
 * there, and a release is its release group.
 */
const MUSICBRAINZ_ENTITY: Record<string, string> = {
  artist: 'artist',
  release: 'release-group',
  label: 'label',
  studio: 'place',
};

const MBID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A link to a MusicBrainz page: its entity type and its id. */
const MUSICBRAINZ_LINK =
  /^https?:\/\/(?:[\w-]+\.)*musicbrainz\.org\/([a-z-]+)\/([0-9a-f-]{36})(?:[/?#]|$)/i;

/**
 * A record's MusicBrainz id: its `externalIds.mbid` where its kind has one
 * (artists, releases), else the id in its `source` link — a label's or a
 * studio's body has nowhere else to keep it, so the importer writes
 * `https://musicbrainz.org/label/<mbid>` there. Null when it has neither.
 * The same record twice (C33) is the same id, whatever else was edited.
 */
export function musicBrainzIdOf(kind: string, body: unknown): string | null {
  if (!isPlainObject(body)) return null;
  const ids = body.externalIds;
  if (isPlainObject(ids) && typeof ids.mbid === 'string' && MBID.test(ids.mbid))
    return ids.mbid.toLowerCase();
  const entity = Object.prototype.hasOwnProperty.call(MUSICBRAINZ_ENTITY, kind)
    ? MUSICBRAINZ_ENTITY[kind]
    : null;
  if (!entity || typeof body.source !== 'string') return null;
  for (const entry of body.source.split(',')) {
    const link = MUSICBRAINZ_LINK.exec(entry.trim());
    if (link && link[1].toLowerCase() === entity && MBID.test(link[2]))
      return link[2].toLowerCase();
  }
  return null;
}

/**
 * Ids a body shows beside them as text, with the record kind whose `name`
 * that text is: `session.studio` is the studio `session.studioId` names.
 * The text stays what students read (SongCredits), so an accept fills it
 * from the record — only where it is empty, or still the name of the record
 * it replaces; text someone typed is never written over (C20).
 */
const DISPLAY_TEXT: readonly {
  kind: string;
  path: string;
  text: string;
  of: string;
}[] = [
  {
    kind: 'song',
    path: 'session.studioId',
    text: 'session.studio',
    of: 'studio',
  },
  {
    kind: 'song',
    path: 'session.labelId',
    text: 'session.label',
    of: 'label',
  },
];

/** The credit roles a billed act plays in: the ones SongCredits bills. */
const PERFORMING = new Set(['performer', 'vocals']);

const textOf = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

/**
 * A song's lead act, as the globe pins it: its `origin`, then its first
 * primary credit, then its artist line.
 */
function leadActOf(song: Record<string, unknown>): string | undefined {
  const origin = isPlainObject(song.origin) ? song.origin : {};
  const primary = (Array.isArray(song.credits) ? song.credits : []).find(
    (credit): credit is Record<string, unknown> =>
      isPlainObject(credit) &&
      credit.primary === true &&
      !!textOf(credit.artistGlobeId),
  );
  const line = textOf(song.artist);
  return (
    textOf(origin.artistGlobeId) ??
    textOf(primary?.artistGlobeId) ??
    (line ? artistSlug(line) : undefined)
  );
}

/**
 * A suggestion's value as it is written into this body. A performing
 * credit for the song's own act — "Clavinet: Stevie Wonder" on a Stevie
 * Wonder song — is the act's billing: MusicBrainz bills a solo act on the
 * recording rather than crediting them, so the importer marks a credit
 * primary only where two or more acts are billed, and one left unmarked
 * reads as a sideman on their own song (SongCredits lists the primary
 * credits as the Artists and the other players as Sidemen).
 */
function asWritten(
  body: Record<string, unknown>,
  suggestion: CheckInput,
): unknown {
  const { value } = suggestion;
  if (
    suggestion.target.kind !== 'song' ||
    suggestion.path !== 'credits[]' ||
    !isPlainObject(value) ||
    value.primary === true ||
    !PERFORMING.has(String(value.role)) ||
    !textOf(value.artistGlobeId)
  )
    return value;
  return textOf(value.artistGlobeId) === leadActOf(body)
    ? { ...value, primary: true }
    : value;
}

/** A record's name, by kind and slug; undefined when there is none to read. */
export type NameOf = (kind: string, slug: string) => string | undefined;

/** What checking a suggestion needs of it. */
export type CheckInput = Pick<
  Suggestion,
  'target' | 'path' | 'anchor' | 'op' | 'value'
>;

/**
 * What writing one needs: the check's part and its sources. A logged
 * decision replayed without its suggestion is one of these too.
 */
export type SuggestionInput = CheckInput & Pick<Suggestion, 'sources'>;

/**
 * What the path holds, and what that means for this suggestion. `current`
 * is what a replace would write over, which is what the owner is shown and
 * hands back as `seen`: the value at the path — or, for an `add`, the
 * element with the same identity, and the list itself where there is none.
 */
export type SuggestionCheck =
  /** Nothing there: it can be written. */
  | { state: 'empty'; current: unknown }
  /** The value the owner saw beside it: it can be written over (a replace). */
  | { state: 'seen'; current: unknown }
  /** The body already says this. */
  | { state: 'applied'; current: unknown }
  /** Something else is there. */
  | { state: 'conflict'; current: unknown; reason: string }
  /**
   * It cannot be written as asked: the path is malformed, its element is
   * gone, or it adds one element to a list only a whole list may start.
   */
  | { state: 'unreachable'; current: undefined; reason: string };

const unreachable = (reason: string): SuggestionCheck => ({
  state: 'unreachable',
  current: undefined,
  reason,
});

/**
 * The path's steps with its index pointing at the element the suggestion is
 * for, or why there is none.
 *
 * An index says where an element was when the suggestion was made, and a
 * list is edited and reordered while suggestions wait: taken on trust,
 * `credits[2].artistGlobeId` would link whoever is third now. So an index
 * needs an `anchor` — the element's key — and the element is found by it:
 * at the index if it is still there, else wherever it moved to. Only one
 * index per path; nothing suggests deeper, and a second would be trusted.
 */
function resolveSteps(
  body: unknown,
  suggestion: CheckInput,
): { steps: PathStep[] } | { reason: string } {
  const { path, anchor } = suggestion;
  const parts = parseRefPath(path);
  if (!parts) return { reason: `"${path}" is not a path` };
  if (parts.each !== (suggestion.op === 'add'))
    return {
      reason: parts.each
        ? `"${path}" names a list: add to it, not set it`
        : `"${path}" names one value: set it, not add to it`,
    };
  const indexes = parts.steps.flatMap((step, at) =>
    typeof step === 'number' ? [at] : [],
  );
  if (indexes.length === 0) return { steps: parts.steps };
  if (indexes.length > 1)
    return { reason: `"${path}" reaches into more than one list by position` };
  if (!anchor)
    return {
      reason: `"${path}" names an element only by where it was; it needs an anchor`,
    };

  const at = indexes[0];
  const listSteps = parts.steps.slice(0, at);
  const list = readSteps(body, listSteps);
  if (!Array.isArray(list))
    return { reason: `the element at "${path}" is gone` };
  const listPath = `${String(listSteps[listSteps.length - 1])}[]`;
  const matches = list.flatMap((element, index) =>
    elementKeys(listPath, element).includes(anchor) ? [index] : [],
  );
  const stated = parts.steps[at] as number;
  const found = matches.includes(stated)
    ? stated
    : matches.length === 1
      ? matches[0]
      : -1;
  if (found === -1)
    return {
      reason: matches.length
        ? `more than one element of "${listPath}" is ${anchor}; a person picks which`
        : `the element at "${path}" is gone`,
    };
  const steps = [...parts.steps];
  steps[at] = found;
  return { steps };
}

/** A check, with where the value would land. */
interface Examined {
  check: SuggestionCheck;
  /** The resolved steps; null when the check is `unreachable`. */
  steps: PathStep[] | null;
  /** For an `add`: the list as it is (empty where there is none). */
  list: unknown[];
  /** For an `add`: the element with the same identity, or −1. */
  at: number;
}

function examine(
  body: Record<string, unknown>,
  suggestion: CheckInput,
  seen: unknown,
): Examined {
  const resolved = resolveSteps(body, suggestion);
  if ('reason' in resolved)
    return {
      check: unreachable(resolved.reason),
      steps: null,
      list: [],
      at: -1,
    };
  const { steps } = resolved;
  const done = (check: SuggestionCheck, list: unknown[] = [], at = -1) => ({
    check,
    steps: check.state === 'unreachable' ? null : steps,
    list,
    at,
  });
  const current = readSteps(body, steps);
  const field = String(steps[steps.length - 1]);
  const stated = statesEmpty(suggestion.target.kind, field);
  const sawNone = Array.isArray(seen) && seen.length === 0;
  // What would be written, or the value as offered: either is this one.
  const written = asWritten(body, suggestion);
  const says = (held: unknown) =>
    saysTheSame(held, written) ||
    (written !== suggestion.value && saysTheSame(held, suggestion.value));

  if (suggestion.op === 'set') {
    const none = stated && Array.isArray(current) && current.length === 0;
    if (says(current)) return done({ state: 'applied', current });
    if (isBlank(current) && !none) return done({ state: 'empty', current });
    if (seen !== undefined && sameJson(current, seen))
      return done({ state: 'seen', current });
    return done({
      state: 'conflict',
      current,
      reason: none ? 'it was set to none' : 'it holds something else',
    });
  }

  if (current !== undefined && current !== null && !Array.isArray(current))
    return done(unreachable(`"${suggestion.path}" is not a list`));
  if ((current === undefined || current === null) && stated)
    return done(
      unreachable(
        `"${field}" is inferred until it is stored: accept the whole list, not one element`,
      ),
    );
  const list = (current ?? []) as unknown[];
  const at = list.findIndex((element) =>
    sameElement(suggestion.path, element, suggestion.value),
  );
  if (at !== -1) {
    const same = list[at];
    if (says(same)) return done({ state: 'applied', current: same }, list, at);
    // A replace names the element it saw, not the whole list, so other
    // accepts into the same list in the same save leave it standing.
    if (seen !== undefined && sameJson(same, seen))
      return done({ state: 'seen', current: same }, list, at);
    return done(
      {
        state: 'conflict',
        current: same,
        reason: 'the list has a different version of it',
      },
      list,
      at,
    );
  }
  // The owner said "none"; only an owner who saw that may add anyway, and
  // then it is a replace: it writes over their answer.
  if (stated && list.length === 0)
    return sawNone
      ? done({ state: 'seen', current: list }, list)
      : done(
          { state: 'conflict', current: list, reason: 'it was set to none' },
          list,
        );
  return done({ state: 'empty', current }, list);
}

/**
 * Check a suggestion against a body.
 *
 * `seen` is what the owner saw beside it — the `current` of an earlier
 * check; undefined means the path was empty. Only a replace passes a value:
 * then the path may still hold exactly that, and it is written over.
 */
export function checkSuggestion(
  body: Record<string, unknown>,
  suggestion: CheckInput,
  seen?: unknown,
): SuggestionCheck {
  return examine(body, suggestion, seen).check;
}

/** A RefMeta holder's pattern for a kind: `credits[]` → credits, any index. */
const holdersFor = (kind: string) =>
  REF_META_HOLDERS.filter((holder) => holder.kind === kind).map((holder) => {
    const parts = parseRefPath(holder.path)!;
    return {
      ...holder,
      pattern: parts.each ? [...parts.steps, -1] : parts.steps,
    };
  });

/** `pattern` (−1 = any element) matches the start of `steps`. */
const matchesFrom = (
  pattern: readonly PathStep[],
  steps: readonly PathStep[],
) =>
  pattern.length <= steps.length &&
  pattern.every((step, at) =>
    step === -1 ? typeof steps[at] === 'number' : step === steps[at],
  );

export interface ApplyOptions {
  /**
   * What the owner saw beside the suggestion (see `checkSuggestion`).
   * Undefined for an accept: the path was empty.
   */
  seen?: unknown;
  /**
   * The level of the target kind's body schema on this server (a song's is 1
   * until song schema v2). Decides whether `source` may be written. Default 1.
   */
  schemaLevel?: number;
  /**
   * The name of a record by kind and slug, for the text shown beside an id
   * (`session.studio` beside `session.studioId`, C20). Left out, the text is
   * left as it is.
   */
  nameOf?: NameOf;
  /**
   * Whether the accept confirms the value (C9). True, the default: someone
   * vouches for it — a person accepting it, or the bulk import, whose values
   * are plain data (owner decision of 30 September 2026). A value that
   * carries RefMeta is written without `unverified`, and one already there
   * loses its `unverified`. False: the value goes in marked
   * `unverified: true`, and so does a holder it lands inside (`born`,
   * `session`), for a person to confirm later; one already there is left as
   * it is. A plain field has nowhere to say either way.
   */
  confirm?: boolean;
  /**
   * Whether the value says where it came from. True: its `source` names
   * the suggestion's providers, beside whatever its own `source` said, and
   * a holder it lands inside adds them too. False: the value goes in bare
   * (`withoutProvenance`), as a hand-typed value would, and no holder is
   * touched. Left out, a suggestion from the app's own planners cites and
   * one with any outside provider does not, whoever accepts it and however
   * (one at a time, in bulk, a replace, the bulk import): no outside
   * catalogue may be named in data the site reads (owner decision of 30
   * September 2026). The decision log keeps the trail.
   */
  cite?: boolean;
}

export type ApplyResult =
  | {
      ok: true;
      body: Record<string, unknown>;
      /** False when the body already said this: nothing to save for it. */
      changed: boolean;
      /** A different value was written over: log it as `replace`. */
      replaced: boolean;
    }
  | {
      ok: false;
      state: 'conflict' | 'unreachable';
      current: unknown;
      reason: string;
    };

/**
 * The body with one suggestion accepted, or why it cannot be.
 *
 * Accepted means confirmed (C9): a value that carries RefMeta loses any
 * `unverified` it came with and, for a suggestion of the app's own, gets
 * `source` naming the suggestion's providers — and so does one already
 * there, which the accept vouches for. A suggestion with an outside
 * provider goes in bare instead, as typed by hand (`fromOutside`). Plain
 * fields have nowhere to say so; the decision log and the revision note
 * carry their trace. `confirm: false` writes the value unconfirmed instead,
 * and `cite` says whether it names a source (see `ApplyOptions`).
 */
export function applySuggestion(
  body: Record<string, unknown>,
  suggestion: SuggestionInput,
  options: ApplyOptions = {},
): ApplyResult {
  const { check, steps, list, at } = examine(body, suggestion, options.seen);
  if (check.state === 'conflict' || check.state === 'unreachable')
    return {
      ok: false,
      state: check.state,
      current: check.current,
      reason: check.reason,
    };

  const confirm = options.confirm ?? true;
  const cite = options.cite ?? !fromOutside(suggestion);
  const level = options.schemaLevel ?? 1;
  // Where the value lands: for an add, the element it replaces or a new one
  // at the end.
  const landing =
    suggestion.op === 'add'
      ? [...steps!, at === -1 ? list.length : at]
      : [...steps!];
  const holders = holdersFor(suggestion.target.kind);
  // A replayed decision may come without its sources: then it says none.
  const source = sourceOf(suggestion);
  const own = holders.find(
    (holder) =>
      holder.pattern.length === landing.length &&
      matchesFrom(holder.pattern, landing),
  );
  // Whether the schema has a `source` where the value lands.
  const sourced = !!own && level >= (own.sourceFrom ?? 1);
  const stamps = cite && sourced && !!source;

  if (check.state === 'applied') {
    // Already there, and perhaps still marked unverified: the accept is the
    // confirmation it was waiting for. An accept that does not confirm
    // leaves it as it is.
    const held = check.current;
    if (!confirm || !own || !isPlainObject(held) || held.unverified !== true)
      return { ok: true, body, changed: false, replaced: false };
    const rest = Object.fromEntries(
      Object.entries(held).filter(([key]) => key !== 'unverified'),
    );
    const confirmed = writeSteps(
      body,
      landing,
      stamps ? { ...rest, source: mergeSource(held.source, source) } : rest,
    );
    return confirmed
      ? { ok: true, body: confirmed, changed: true, replaced: false }
      : { ok: true, body, changed: false, replaced: false };
  }

  // The value itself carries RefMeta: it says where it came from, and that
  // it is confirmed. What its own `source` said is kept, with the providers
  // added — a credit's MusicBrainz id is in it (C30). Where the schema has
  // no `source` yet, it says neither. A credit for the song's own act is
  // written as its billing (`asWritten`). Not cited, it goes in bare; not
  // confirmed, it is marked unverified.
  let value = asWritten(body, suggestion);
  if (!cite) value = withoutProvenance(value);
  if (own && isPlainObject(value)) {
    const rest = withoutRefMeta(value) as Record<string, unknown>;
    const said = cite && sourced ? mergeSource(value.source, source) : '';
    value = {
      ...rest,
      ...(said ? { source: said } : {}),
      ...(confirm ? {} : { unverified: true }),
    };
  } else if (isPlainObject(value)) {
    // A value with no place for RefMeta keeps none it was handed: the
    // schemas are strict, and a stray `source` would fail the save.
    value = withoutRefMeta(value);
  }

  let next =
    suggestion.op === 'add' && at === -1
      ? writeSteps(body, steps!, [...list, value])
      : writeSteps(body, landing, value);
  if (!next)
    return {
      ok: false,
      state: 'unreachable',
      current: check.current,
      reason: `"${suggestion.path}" cannot be written`,
    };

  // Written inside a holder (`session.studioId`, `born.placeId`): the holder
  // now also rests on this source. Its `unverified` is about the facts that
  // were already there, which nobody has just confirmed, so it stays — and
  // an accept that does not confirm marks it, since it now holds a fact
  // nobody has confirmed. Not cited, the holder names no source for it.
  for (const holder of holders) {
    if (
      holder.pattern.length >= landing.length ||
      !matchesFrom(holder.pattern, landing)
    )
      continue;
    const citing = cite && !!source && level >= (holder.sourceFrom ?? 1);
    if (!citing && confirm) continue;
    const holderSteps = landing.slice(0, holder.pattern.length);
    const held = readSteps(next, holderSteps);
    if (!isPlainObject(held)) continue;
    next =
      writeSteps(next, holderSteps, {
        ...held,
        ...(citing ? { source: mergeSource(held.source, source) } : {}),
        ...(confirm ? {} : { unverified: true }),
      }) ?? next;
  }

  if (options.nameOf)
    next = withDisplayText(next, suggestion, check.current, options.nameOf);

  return {
    ok: true,
    body: next,
    changed: true,
    replaced: check.state === 'seen',
  };
}

/**
 * The body with the text beside an id just written filled from its
 * record's name (C20): where the text is empty, or is still the name of the
 * record written over. Anything else there was typed, and stays.
 */
function withDisplayText(
  body: Record<string, unknown>,
  suggestion: SuggestionInput,
  previous: unknown,
  nameOf: NameOf,
): Record<string, unknown> {
  const shown = DISPLAY_TEXT.find(
    (entry) =>
      entry.kind === suggestion.target.kind && entry.path === suggestion.path,
  );
  if (!shown || typeof suggestion.value !== 'string') return body;
  const name = nameOf(shown.of, suggestion.value)?.trim();
  const steps = parseRefPath(shown.text)?.steps;
  if (!name || !steps) return body;
  const text = readSteps(body, steps);
  const stale =
    typeof previous === 'string' &&
    !!previous &&
    typeof text === 'string' &&
    text.trim() === nameOf(shown.of, previous)?.trim();
  if (!isBlank(text) && !stale) return body;
  return writeSteps(body, steps, name) ?? body;
}

export interface AcceptInput {
  suggestion: Suggestion;
  /** What the owner saw beside it (a check's `current`); undefined when empty. */
  seen?: unknown;
}

export interface AppliedSuggestions {
  body: Record<string, unknown>;
  /** Written where the path was empty. */
  accepted: Suggestion[];
  /** Written over the value the owner saw beside them. */
  replaced: Suggestion[];
  /** The body already said so; nothing written. */
  already: Suggestion[];
  /** Not written, and why: listed for a person. */
  refused: {
    suggestion: Suggestion;
    state: 'conflict' | 'unreachable';
    current: unknown;
    reason: string;
  }[];
}

/**
 * Several suggestions for one item, into one save. Each is checked against
 * the body as the ones before it left it, so two sources offering different
 * values for the same field cannot both land: the second is a conflict. A
 * replace in a list rests on its own element only, so accepts into one list
 * (two credits linked, a credit added beside them) go in together.
 */
export function applySuggestions(
  body: Record<string, unknown>,
  accepts: readonly AcceptInput[],
  options: Omit<ApplyOptions, 'seen'> = {},
): AppliedSuggestions {
  const out: AppliedSuggestions = {
    body,
    accepted: [],
    replaced: [],
    already: [],
    refused: [],
  };
  for (const { suggestion, seen } of accepts) {
    const result = applySuggestion(out.body, suggestion, { ...options, seen });
    if (!result.ok) {
      out.refused.push({
        suggestion,
        state: result.state,
        current: result.current,
        reason: result.reason,
      });
      continue;
    }
    out.body = result.body;
    if (!result.changed) out.already.push(suggestion);
    else if (result.replaced) out.replaced.push(suggestion);
    else out.accepted.push(suggestion);
  }
  return out;
}

export interface ReplayOptions {
  /**
   * The suggestion's sources, from the committed artifacts, for the `source`
   * an accept stamps. Without them the value goes in saying only what its
   * own `source` said.
   */
  sources?: readonly SuggestionSource[];
  /** As for `applySuggestion`. */
  schemaLevel?: number;
  /** As for `applySuggestion`. */
  nameOf?: NameOf;
}

/**
 * A logged accept or replace, written again: the mock's store was reset to
 * a new seed, or the backend imports the log (§5.3). Null for a decision
 * that writes nothing (a reject, a drop, a review).
 *
 * The value goes in where the path is empty. A replace may also write over
 * what is there, but only while that still hashes to what the owner
 * replaced (`seenHash`) — the reset put the old value back — and never over
 * anything newer: that is a conflict, listed and never forced.
 *
 * A decision the bulk import made (`method: 'import'`) is written again as
 * the import wrote it: bare, naming no source, and with no display text
 * filled in beside an id, whatever `sources` and `nameOf` offer. A person's
 * accept of an outside suggestion is written bare as well, with the text
 * filled in.
 */
export function replayDecision(
  body: Record<string, unknown>,
  decision: SuggestionDecision,
  options: ReplayOptions = {},
): ApplyResult | null {
  if (decision.op !== 'accept' && decision.op !== 'replace') return null;
  if (decision.value === undefined) return null;
  const suggestion: SuggestionInput = {
    target: decision.target,
    path: decision.path,
    anchor: decision.anchor,
    // The log keeps no op: a path that names a list is added to (types.ts).
    op: decision.path.endsWith('[]') ? 'add' : 'set',
    value: decision.value,
    sources: [...(options.sources ?? [])],
  };
  const { check } = examine(body, suggestion, undefined);
  const seen =
    decision.seenHash !== undefined &&
    check.state === 'conflict' &&
    valueHash(check.current) === decision.seenHash
      ? check.current
      : undefined;
  const imported = decision.method === 'import';
  // A person's accept of an outside suggestion goes in bare too: known by
  // its sources, or, replayed without them, by a value that cites one.
  const bare =
    imported || fromOutside(suggestion) || citesOutside(decision.value);
  return applySuggestion(body, suggestion, {
    seen,
    schemaLevel: options.schemaLevel,
    nameOf: imported ? undefined : options.nameOf,
    ...(bare ? { cite: false } : {}),
  });
}

/** 'the app', 'an outside source', 'the app and an outside source': each name once. */
const namesOf = (providers: readonly SuggestionProvider[]) => {
  const names = unique(providers.map((p) => PROVIDER_NAME[p]));
  return names.length < 2
    ? (names[0] ?? '')
    : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
};

/**
 * The revision note for a save that accepts suggestions: which ones, from
 * whom, from which run — the trail back from a body to the evidence
 * (decision 10). "Accepted suggestion 1f0c… from the app and an outside
 * source (batch mb-2026-10-02)".
 */
export function revisionNote(
  written: readonly Suggestion[],
  replaced: readonly Suggestion[] = [],
): string {
  const all = [...written, ...replaced];
  if (all.length === 0) return '';
  const from = namesOf(all.flatMap((s) => s.sources.map((x) => x.provider)));
  const batches = unique(all.map((s) => s.batch));
  const run = `(${batches.length === 1 ? 'batch' : 'batches'} ${batches.join(', ')})`;
  const over = replaced.length
    ? `; ${replaced.length === all.length ? 'it replaced' : `${replaced.map((s) => s.id).join(', ')} replaced`} what was there`
    : '';
  if (all.length === 1)
    return `Accepted suggestion ${all[0].id} from ${from} ${run}${over}`;
  return `Accepted ${all.length} suggestions from ${from} ${run}: ${all
    .map((s) => s.id)
    .join(', ')}${over}`;
}

/**
 * The revision note for a save the bulk import makes: which suggestions, by
 * id, and nothing about where they came from. A revision note is shown in
 * the console's history, and the site names no outside catalogue (owner
 * decision of 30 September 2026); the ids lead back to the importer's
 * artifacts, which do.
 */
export function importNote(written: readonly Pick<Suggestion, 'id'>[]): string {
  if (written.length === 0) return '';
  if (written.length === 1) return `Imported suggestion ${written[0].id}`;
  return `Imported ${written.length} suggestions: ${written
    .map((s) => s.id)
    .join(', ')}`;
}
