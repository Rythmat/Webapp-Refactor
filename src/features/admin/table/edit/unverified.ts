import {
  elementAnchor,
  REF_META_KEYS,
  withoutRefMeta,
} from '@/content/suggestions/keys';

/**
 * ══════════════════════════════════════════════════════════════════════════
 *  Unconfirmed values — where a body says a value is not checked yet
 * ══════════════════════════════════════════════════════════════════════════
 *
 * An imported value (the bulk import, a bulk accept) is shown unconfirmed
 * until someone confirms it or corrects it. This module is the one place
 * that knows where that is written down, so the grid, the panel and the
 * write queue never read the representation themselves. There are two
 * places, and a cell shows both:
 *
 *  - **The body.** A record can be marked as a whole (`unverified: true`,
 *    with its `source`), and so can the objects that hold a few facts
 *    together — an artist's `born`, a song's `session` — and each entry of
 *    the lists whose entries carry their own `unverified`/`source`: a
 *    group's `members[]`, an artist's `influencedBy[]`, a song's
 *    `credits[]`, `releases[]` and `relatedRecordings[]`.
 *  - **The decision log.** A plain value — `activeFrom`, `genreIds`,
 *    `session.studioId`, an event's ids — has nowhere to carry a mark. The
 *    import logs it as a decision (`method: 'import'`), which counts as
 *    unreviewed until a single accept or a review. Those marks come from an
 *    `UnreviewedMarks` provider, injected: the decisions-backed one is wired
 *    in a later phase, and until then there is none.
 *
 * Confirming keeps a value's `source` (owner, 30 Sep 2026): it says the
 * value was checked, not that it came from somewhere else. Correcting a
 * value is different — what the person typed did not come from the source —
 * and `cellOps.ts` drops the mark there (see `clearCorrectedMark`).
 *
 * Pure: no React, no store (the purity test holds this).
 */

export type Body = Readonly<Record<string, unknown>>;

/**
 * The objects whose `unverified`/`source` cover every fact they hold: an
 * artist's `born` (date and birthplace), a song's `session` (its studio,
 * label, city and their ids).
 */
export const MARKED_OBJECTS: readonly string[] = ['born', 'session'];

/** The lists whose entries each carry their own `unverified`/`source`. */
export const MARKED_LISTS: readonly string[] = [
  'members',
  'influencedBy',
  'credits',
  'releases',
  'relatedRecordings',
];

/**
 * Where a mark is written:
 *
 *  - `record` — the record's own `unverified` (shown on the row's title);
 *  - `object` — a marked object's (`born`, `session`);
 *  - `entry` — one entry of a marked list, told apart by `id`;
 *  - `decision` — an unreviewed decision, for a value with nowhere in the
 *    body to say so.
 */
export type MarkPlace = 'record' | 'object' | 'entry' | 'decision';

/** One unconfirmed value. */
export interface Mark {
  place: MarkPlace;
  /**
   * What it covers, as a dot path without `[]`: '' for the record, 'born'
   * for an object, 'credits' for a list's entry, 'activeFrom' or
   * 'genreIds' for a decision.
   */
  path: string;
  /**
   * The entry of a list: a bare id as it is ('rock'), an object entry by
   * its anchor (`entryId`). Absent for a whole value.
   */
  id?: string;
  /** Where the value came from, as the body or the log says it: 'musicbrainz'. */
  source?: string;
  /**
   * The decisions that stand for it, which confirming it marks reviewed:
   * a decision's own, and any the body mark covers (an imported credit is
   * both marked in the body and logged).
   */
  suggestionIds?: readonly string[];
}

/**
 * An unreviewed decision's value: imported, or accepted in bulk, and not
 * confirmed since. `path` is the decision's (`genreIds[]`, `born.date`,
 * `credits[]`); `id` the element on a list path, as `Mark.id` spells it.
 */
export interface UnreviewedMark {
  path: string;
  id?: string;
  source: string;
  suggestionId: string;
}

/**
 * Where the unreviewed decisions come from. Handed an item and its body
 * as the Table has it, it answers the marks that still hold for that body —
 * a decision whose value has since been corrected is not one of them.
 */
export type UnreviewedMarks = (item: {
  kind: string;
  slug: string;
  body: Body;
}) => readonly UnreviewedMark[];

/** No decision log yet: only the body's marks. */
export const NO_UNREVIEWED_MARKS: UnreviewedMarks = () => [];

/* ── Reading ─────────────────────────────────────────────────────────── */

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const own = (record: Body, key: string): unknown =>
  Object.prototype.hasOwnProperty.call(record, key) ? record[key] : undefined;

const sourceOf = (value: Body): string | undefined =>
  typeof value.source === 'string' && value.source.trim()
    ? value.source.trim()
    : undefined;

/** A path as a mark spells it: `genreIds[]` → `genreIds`. */
export const markPath = (path: string): string => path.replace(/\[\]$/, '');

/** The last step of a dot path says how sure a value is, not what it is. */
export const isMetaPath = (path: string): boolean =>
  REF_META_KEYS.includes(path.slice(path.lastIndexOf('.') + 1));

/**
 * How a list's entry is told apart: a bare id as it is, an object by the
 * list's identity rule (`suggestions/keys.ts`) — a credit by its role and
 * who (`producer|quincy-jones`, `performer:bass|james-jamerson`), a member
 * or influence by `artistId`, a release by `releaseId`. The same anchor a
 * suggestion for that entry is known by, so the log's marks meet the
 * body's.
 */
export function entryId(list: string, element: unknown): string | undefined {
  if (typeof element === 'string') return element;
  if (typeof element === 'number') return String(element);
  if (!isPlainObject(element)) return undefined;
  return elementAnchor(markPath(list), element);
}

/** A credit's role from its anchor: `performer:bass|x` → `performer`. */
export const creditRoleOf = (id: string): string =>
  id.split('|')[0].split(':')[0];

/** The marked object a dot path lies inside (`born.date` → `born`), if any. */
export function markedObjectOf(path: string): string | undefined {
  const head = path.split('.')[0];
  return path.includes('.') && MARKED_OBJECTS.includes(head) ? head : undefined;
}

/** The marks the body itself carries, record first. */
export function bodyMarks(body: Body): Mark[] {
  const marks: Mark[] = [];
  const said = (place: MarkPlace, path: string, value: Body, id?: string) => {
    const source = sourceOf(value);
    marks.push({
      place,
      path,
      ...(id !== undefined ? { id } : {}),
      ...(source ? { source } : {}),
    });
  };
  if (body.unverified === true) said('record', '', body);
  for (const path of MARKED_OBJECTS) {
    const value = own(body, path);
    if (isPlainObject(value) && value.unverified === true)
      said('object', path, value);
  }
  for (const list of MARKED_LISTS) {
    const value = own(body, list);
    if (!Array.isArray(value)) continue;
    for (const element of value) {
      if (!isPlainObject(element) || element.unverified !== true) continue;
      said('entry', list, element, entryId(list, element));
    }
  }
  return marks;
}

/** Whether a body mark stands for a decision: the same entry, or the object it is inside. */
const covers = (mark: Mark, path: string, id: string | undefined): boolean =>
  (mark.place === 'object' &&
    (path === mark.path || path.startsWith(`${mark.path}.`))) ||
  (mark.place === 'entry' && path === mark.path && id === mark.id);

/**
 * Every unconfirmed value of an item: the body's marks, and the log's for
 * values the body cannot mark. A decision the body already marks (an
 * imported credit, a value inside a marked `born`) is not counted twice:
 * its id joins that mark's `suggestionIds`, so confirming the one reviews
 * the other.
 */
export function marksOf(
  body: Body,
  item?: { kind: string; slug: string },
  unreviewed: UnreviewedMarks = NO_UNREVIEWED_MARKS,
): Mark[] {
  const marks = bodyMarks(body);
  if (!item) return marks;
  for (const decision of unreviewed({ ...item, body })) {
    const path = markPath(decision.path);
    const holder = marks.find((mark) => covers(mark, path, decision.id));
    if (holder) {
      holder.suggestionIds = [
        ...(holder.suggestionIds ?? []),
        decision.suggestionId,
      ];
      continue;
    }
    marks.push({
      place: 'decision',
      path,
      ...(decision.id !== undefined ? { id: decision.id } : {}),
      source: decision.source,
      suggestionIds: [decision.suggestionId],
    });
  }
  return marks;
}

/**
 * The marks a value at `path` shows: '' is the record itself. A field shows
 * its own marks, the marks of what lies inside it, and the mark of the
 * object it lies inside (a song's Studio shows its session's); a list shows
 * its entries' marks, or one entry's when `id` names it.
 */
export function marksAt(
  marks: readonly Mark[],
  path: string,
  id?: string,
): Mark[] {
  if (path === '') return marks.filter((mark) => mark.place === 'record');
  const at = markPath(path);
  return marks.filter((mark) => {
    if (mark.place === 'record') return false;
    if (mark.path === at) return id === undefined || mark.id === id;
    if (id !== undefined) return false;
    return (
      mark.path.startsWith(`${at}.`) ||
      (mark.place === 'object' && at.startsWith(`${mark.path}.`))
    );
  });
}

/**
 * The marks a column's cell shows: its field's, and those of the fields it
 * edits with it (a range's end, the text beside an id), each once. A column
 * that edits one role's credits shows only those credits' marks.
 */
export function marksForColumn(
  marks: readonly Mark[],
  edit: {
    path: string;
    also?: readonly string[];
    roles?: readonly string[];
  },
): Mark[] {
  const found = new Set<Mark>();
  for (const path of [edit.path, ...(edit.also ?? [])])
    for (const mark of marksAt(marks, path)) found.add(mark);
  const shown = [...found];
  const { roles } = edit;
  if (!roles) return shown;
  return shown.filter(
    (mark) =>
      mark.path !== 'credits' ||
      (mark.id !== undefined && roles.includes(creditRoleOf(mark.id))),
  );
}

/** The decisions confirming these marks reviews, each once. */
export const reviewedBy = (marks: readonly Mark[]): string[] => [
  ...new Set(marks.flatMap((mark) => mark.suggestionIds ?? [])),
];

/* ── Writing ─────────────────────────────────────────────────────────── */

/** An object without its `unverified`, its `source` kept. */
const confirmed = (value: Record<string, unknown>): Record<string, unknown> => {
  const next = { ...value };
  delete next.unverified;
  return next;
};

/** An object's facts, what it says leaving how sure it is aside. */
export const factsOf = (value: unknown): unknown => withoutRefMeta(value);

/**
 * The body with the value at `path` confirmed: its `unverified` gone, its
 * `source` kept. '' confirms the record; a marked object, or a field inside
 * one, confirms the object; a marked list confirms the entry `id` names, or
 * every entry. A value the body cannot mark (a plain field: the log's) is
 * confirmed by reviewing its decision, and the body comes back as it was —
 * the same object, so the caller can tell nothing was written.
 */
export function confirmMarks(
  body: Body,
  path: string,
  id?: string,
): Record<string, unknown> {
  const same = body as Record<string, unknown>;
  if (path === '') return body.unverified === true ? confirmed(same) : same;
  const at = markPath(path);
  const object = MARKED_OBJECTS.includes(at) ? at : markedObjectOf(at);
  if (object) {
    const value = own(body, object);
    return isPlainObject(value) && value.unverified === true
      ? { ...same, [object]: confirmed(value) }
      : same;
  }
  if (!MARKED_LISTS.includes(at)) return same;
  const list = own(body, at);
  if (!Array.isArray(list)) return same;
  let changed = false;
  const next = list.map((element) => {
    if (!isPlainObject(element) || element.unverified !== true) return element;
    if (id !== undefined && entryId(at, element) !== id) return element;
    changed = true;
    return confirmed(element);
  });
  return changed ? { ...same, [at]: next } : same;
}

/**
 * The body after a correction at `path`: a field inside a marked object
 * (`born.date`, `session.studioId`) was just set by a person, so the object
 * is no longer unconfirmed as a whole. Its `unverified` goes; its `source`
 * stays, because the object's other facts still rest on it. (A value
 * replaced whole — an object set at once, an entry added — carries only
 * the meta it is written with, so there is nothing to clear.) Anything
 * else comes back as it was, the same object.
 */
export function clearCorrectedMark(
  body: Body,
  path: string,
): Record<string, unknown> {
  const same = body as Record<string, unknown>;
  if (isMetaPath(path)) return same;
  const object = markedObjectOf(path);
  if (!object) return same;
  const value = own(body, object);
  return isPlainObject(value) && value.unverified === true
    ? { ...same, [object]: confirmed(value) }
    : same;
}
