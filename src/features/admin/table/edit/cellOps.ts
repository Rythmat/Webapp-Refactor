import { getPath, parseRefPath } from '@/content/bodyPaths';
import {
  elementKeys,
  REF_META_KEYS,
  sameElement,
} from '@/content/suggestions/keys';
import { changedPaths, sameValue } from '../../content/itemEditor/rebase';
import {
  applyLink,
  applyUnlink,
  type Body,
  changedSince,
  type LinkChoice,
  type LinkId,
  LINKS,
  type LinkSpec,
  type UnlinkHow,
} from '../link/links';
import {
  clearCorrectedMark,
  confirmMarks,
  entryId,
  factsOf,
  MARKED_LISTS,
  MARKED_OBJECTS,
  markedObjectOf,
  markPath,
} from './unverified';

/**
 * ══════════════════════════════════════════════════════════════════════════
 *  Cell edits as data — what a cell commit writes, and what undoes it
 * ══════════════════════════════════════════════════════════════════════════
 *
 * A cell commit never sends the body the grid shows: export bodies are lean
 * (a song's chart is left out), so writing one back would wipe it. It sends
 * a few ops, which the write queue lays onto the item as the server has it,
 * re-read in full just before the write. Laid onto a newer body, each op
 * checks what it rests on first:
 *
 *  - `set` — a field, by dot path (`year`, `session.studioId`); `undefined`
 *    takes it away. It conflicts only when the stored value now differs
 *    from both what the author saw and what they are writing. A list set
 *    whole is merged instead (what they took out comes out, what they put
 *    in goes in, everyone else's entries stay), and conflicts only where
 *    both changed the same entry differently. An array read by position —
 *    a pin's `[lat, lng]` (`POSITIONAL_FIELDS`) — is one value, not a list:
 *    set whole, and a conflict when it moved since.
 *  - `add`, `remove` — one entry of a list, by id: set-like, so they
 *    commute with anyone else's and never raise a false conflict. A list of
 *    bare ids (`genreIds`) holds the id itself; a list of objects is matched
 *    by `key` (`members` by `artistId`) or by the list's identity rule — a
 *    credit by its role and who (`producer|quincy-jones`, the anchor
 *    `unverified.ts` `entryId` gives).
 *  - `link`, `unlink` — a connection written on the item that owns it
 *    (`links.ts`), refused when a path it rests on changed since `seen`.
 *  - `confirm` — an unconfirmed value checked: its mark goes, its `source`
 *    stays (`unverified.ts`).
 *
 * Correcting clears the flag: a `set` inside a marked object (`born.date`)
 * clears the object's `unverified`, and an `add` of an entry that is there
 * already, marked, confirms it when it says the same and replaces it — mark
 * and source gone — when it says something else.
 *
 * Undo is an ordinary write with a precondition: `invertOps` answers `set`s
 * that put back exactly what the ops changed, each resting on what they
 * wrote, so an undo over someone else's later change is refused ("Changed
 * since; not undone") — except in a list, where it takes out only what was
 * added and puts back only what was removed. `composeOps` folds a pending
 * batch and a new edit into one, for the queue's coalescing.
 *
 * Pure: no React, no store, no fetch (the purity test holds this).
 */

export type CellOp =
  | {
      op: 'set';
      path: string;
      /** What the field becomes; `undefined` takes it away. */
      value: unknown;
      /** What the author saw there (`undefined`: nothing). */
      seen: unknown;
    }
  | {
      op: 'add';
      /** The list, with or without its `[]`: `genreIds`, `credits[]`. */
      path: string;
      /** The id the entry is known by (see the file comment). */
      id: string;
      /** A list of objects: the entry written (its `key` set to `id`). */
      entry?: Readonly<Record<string, unknown>>;
      /** The field of each entry that holds the id: `artistId`. */
      key?: string;
    }
  | { op: 'remove'; path: string; id: string; key?: string }
  | { op: 'link'; spec: LinkId; choice: LinkChoice; seen: Body }
  | { op: 'unlink'; spec: LinkId; id: string; how?: UnlinkHow; seen: Body }
  | {
      op: 'confirm';
      /** '' for the record; a marked object, list or field (see `unverified.ts`). */
      path: string;
      /** One entry of a marked list; absent for all of them. */
      id?: string;
      /**
       * What the author confirmed, when it matters that it is still that:
       * the object or entry as they saw it. Its facts are compared, not its
       * mark.
       */
      seen?: unknown;
    };

/** One op that could not be laid onto the body as it is now. */
export interface OpConflict {
  /** The op's place in the batch. */
  index: number;
  /** The field it rests on. */
  path: string;
  /** What the author saw there, what is there now, and what they wrote. */
  seen: unknown;
  now: unknown;
  mine: unknown;
  /**
   * Set when the op cannot be written at all, whoever wins — the path is
   * not a list, an unlink only the dialog can make — rather than over
   * someone else's change. "Use mine" does not apply.
   */
  refused?: string;
}

export type ApplyResult =
  | {
      ok: true;
      body: Record<string, unknown>;
      /** Something was written: when false, there is nothing to save. */
      changed: boolean;
      /** The ops that changed something, in order: the toast's lines. */
      applied: readonly CellOp[];
    }
  | { ok: false; conflicts: readonly OpConflict[] };

/* ── Paths and values ────────────────────────────────────────────────── */

/** A body, or an object in one, as written. */
type Fields = Record<string, unknown>;

const isPlainObject = (value: unknown): value is Fields =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const own = (record: Readonly<Fields>, key: string): unknown =>
  Object.prototype.hasOwnProperty.call(record, key) ? record[key] : undefined;

const text = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

/**
 * A field's steps from its dot path; a trailing `[]` (`genreIds[]`, as the
 * registry spells a list) names the list itself. A path no single write
 * can address (an element, `[]` in the middle, a name that is no plain
 * field) is the caller's mistake, not the data's, so it throws.
 */
function fieldOf(path: string): string[] {
  const parsed = parseRefPath(path);
  if (!parsed || !parsed.steps.every((step) => typeof step === 'string'))
    throw new Error(`Not a field path a cell can write: "${path}"`);
  return parsed.steps as string[];
}

function readField(body: Readonly<Fields>, keys: readonly string[]): unknown {
  let node: unknown = body;
  for (const key of keys) {
    if (!isPlainObject(node)) return undefined;
    node = own(node, key);
  }
  return node;
}

/** An object that says nothing: no fields, or only how sure it is. */
const saysNothing = (value: Readonly<Fields>): boolean =>
  Object.keys(value).every((key) => REF_META_KEYS.includes(key));

/**
 * `node` with `value` at `keys`, as a copy; `undefined` takes the field
 * away, and an object that then says nothing goes too (a session that held
 * only its studio). Null where a step on the way is not an object.
 */
function writeField(
  node: Readonly<Fields>,
  keys: readonly string[],
  value: unknown,
): Fields | null {
  const [key, ...rest] = keys;
  const copy: Fields = { ...node };
  if (rest.length === 0) {
    if (value === undefined) delete copy[key];
    else copy[key] = value;
    return copy;
  }
  const child = own(node, key);
  if (child !== undefined && !isPlainObject(child)) return null;
  const next = writeField(child ?? {}, rest, value);
  if (!next) return null;
  if (value === undefined && saysNothing(next)) delete copy[key];
  else copy[key] = next;
  return copy;
}

/* ── One op ──────────────────────────────────────────────────────────── */

type Step = { body: Fields } | { conflicts: OpConflict[] };

const conflict = (
  index: number,
  path: string,
  seen: unknown,
  now: unknown,
  mine: unknown,
  refused?: string,
): Step => ({
  conflicts: [
    { index, path, seen, now, mine, ...(refused ? { refused } : {}) },
  ],
});

/**
 * Fields whose array is one value read by position, not a list of entries:
 * a pin's `[lat, lng]`, a song's `[beats, unit]` — the tuples of the body
 * schemas (`recordBodySchemas.ts`, `songBodySchema.ts`; a test holds this
 * to them). A `set` of one is never merged entry by entry: merged, a pin
 * someone moved since would come out as one nobody set (their latitude,
 * the author's longitude), or as three numbers.
 */
export const POSITIONAL_FIELDS: ReadonlySet<string> = new Set([
  'coordinates',
  'timeSignature',
]);

const positional = (keys: readonly string[]): boolean =>
  POSITIONAL_FIELDS.has(keys[keys.length - 1]);

/** Neither a list nor nothing: a list merge cannot read it. */
const CLASH = Symbol('clash');

const asList = (value: unknown): readonly unknown[] | null =>
  value === undefined ? [] : Array.isArray(value) ? value : null;

const holds = (items: readonly unknown[], value: unknown) =>
  items.some((item) => sameValue(item, value));

/**
 * `now` with the author's change from `seen` to `value` laid on it, entry
 * by entry: what they took out comes out, what they put in goes in, an
 * entry they changed is changed in place, and everything else is left as
 * it is now. CLASH when that cannot be told apart from overwriting someone
 * else's change: an entry the author took out or changed that has since
 * changed, or one they put in that is there in another version.
 */
function mergeList(
  list: string,
  seen: unknown,
  value: unknown,
  now: unknown,
): unknown[] | undefined | typeof CLASH {
  const was = asList(seen);
  const mine = asList(value);
  const there = asList(now);
  if (!was || !mine || !there) return CLASH;
  if (seen === undefined && value === undefined && now === undefined)
    return CLASH;
  const removed = was.filter((entry) => !holds(mine, entry));
  const added = mine.filter((entry) => !holds(was, entry));
  // An entry changed in place: one taken out and one put in that are the
  // same entry by the list's identity rule.
  const changed: [unknown, unknown][] = [];
  const alone = new Set(removed);
  const addedAlone: unknown[] = [];
  for (const entry of added) {
    const before = removed.find(
      (old) => alone.has(old) && sameElement(list, old, entry),
    );
    if (before === undefined) {
      addedAlone.push(entry);
      continue;
    }
    alone.delete(before);
    changed.push([before, entry]);
  }
  const result = [...there];
  for (const [before, after] of changed) {
    const at = result.findIndex((entry) => sameValue(entry, before));
    if (at >= 0) {
      result[at] = after;
      continue;
    }
    if (!holds(result, after)) return CLASH;
  }
  for (const entry of alone) {
    const at = result.findIndex((item) => sameValue(item, entry));
    if (at >= 0) {
      result.splice(at, 1);
      continue;
    }
    // Gone already is fine; there in another version is theirs to keep.
    if (result.some((item) => sameElement(list, item, entry))) return CLASH;
  }
  for (const entry of addedAlone) {
    if (holds(result, entry)) continue;
    if (result.some((item) => sameElement(list, item, entry))) return CLASH;
    result.push(entry);
  }
  return value === undefined && result.length === 0 ? undefined : result;
}

function applySet(
  body: Fields,
  op: Extract<CellOp, { op: 'set' }>,
  index: number,
): Step {
  const keys = fieldOf(op.path);
  const now = readField(body, keys);
  if (sameValue(now, op.value)) return { body };
  let value = op.value;
  if (!sameValue(now, op.seen)) {
    // A value read by position changed since: theirs, or the author's whole.
    if (positional(keys))
      return conflict(index, op.path, op.seen, now, op.value);
    const merged = mergeList(keys.join('.'), op.seen, op.value, now);
    if (merged === CLASH) return conflict(index, op.path, op.seen, now, value);
    if (sameValue(now, merged)) return { body };
    value = merged;
  }
  const written = writeField(body, keys, value);
  if (!written)
    return conflict(
      index,
      op.path,
      op.seen,
      now,
      value,
      `"${op.path}" cannot be written: a field on the way holds a value, not an object.`,
    );
  return { body: clearCorrectedMark(written, op.path) };
}

type ListOp = Extract<CellOp, { op: 'add' | 'remove' }>;

/** Whether a list's element is the one an add or remove names. */
function names(list: string, element: unknown, op: ListOp): boolean {
  if (!isPlainObject(element)) return element === op.id;
  if (op.key) return text(own(element, op.key)) === op.id;
  if (op.op === 'add' && op.entry && sameElement(list, element, op.entry))
    return true;
  return elementKeys(list, element).includes(op.id);
}

/** The `unverified`/`source` an entry is written with, if it says any. */
const metaOf = (entry: Readonly<Fields> | undefined): Fields =>
  Object.fromEntries(
    Object.entries(entry ?? {}).filter(([key]) => REF_META_KEYS.includes(key)),
  );

function applyListOp(body: Fields, op: ListOp, index: number): Step {
  const keys = fieldOf(op.path);
  const list = keys.join('.');
  const held = readField(body, keys);
  if (held !== undefined && !Array.isArray(held))
    return conflict(
      index,
      op.path,
      undefined,
      held,
      op.id,
      `"${list}" is not a list here.`,
    );
  const items: readonly unknown[] = held ?? [];
  const write = (next: unknown[]): Step => {
    const written = writeField(body, keys, next);
    return written
      ? { body: written }
      : conflict(
          index,
          op.path,
          undefined,
          held,
          op.id,
          `"${list}" cannot be written: a field on the way holds a value, not an object.`,
        );
  };

  if (op.op === 'remove') {
    const kept = items.filter((element) => !names(list, element, op));
    return kept.length === items.length ? { body } : write(kept);
  }

  const at = items.findIndex((element) => names(list, element, op));
  if (at < 0) {
    const entry = op.entry
      ? { ...op.entry, ...(op.key ? { [op.key]: op.id } : {}) }
      : op.key
        ? { [op.key]: op.id }
        : op.id;
    return write([...items, entry]);
  }
  const element = items[at];
  // A bare id is there already: nothing to say about it.
  if (!isPlainObject(element)) return { body };
  const facts = factsOf(element) as Fields;
  const merged = { ...facts, ...(factsOf(op.entry ?? {}) as Fields) };
  let next: Fields;
  if (sameValue(merged, facts)) {
    // Stated again as it is: a confirmation, so the source stays.
    if (element.unverified !== true) return { body };
    next = { ...element };
    delete next.unverified;
  } else {
    // Stated otherwise: a correction, and what was imported goes with it.
    next = { ...merged, ...metaOf(op.entry) };
  }
  const copy = [...items];
  copy[at] = next;
  return write(copy);
}

/** A confirmed value's facts as they are now, to hold against what was seen. */
function confirmedValue(body: Fields, path: string, id?: string): unknown {
  const at = markPath(path);
  const object = MARKED_OBJECTS.includes(at) ? at : markedObjectOf(at);
  if (object) return factsOf(own(body, object));
  const list = own(body, at);
  if (!MARKED_LISTS.includes(at) || !Array.isArray(list))
    return getPath(body, at);
  if (id === undefined) return list.map(factsOf);
  return factsOf(list.find((element) => entryId(at, element) === id));
}

function applyConfirm(
  body: Fields,
  op: Extract<CellOp, { op: 'confirm' }>,
  index: number,
): Step {
  const next = confirmMarks(body, op.path, op.id);
  if (next === body) return { body };
  if (op.seen !== undefined && op.path !== '') {
    const now = confirmedValue(body, op.path, op.id);
    const seen = Array.isArray(op.seen)
      ? op.seen.map(factsOf)
      : factsOf(op.seen);
    if (!sameValue(now, seen))
      return conflict(index, op.path, op.seen, now, undefined);
  }
  return { body: next };
}

const specOf = (id: LinkId): LinkSpec => {
  const spec = LINKS.find((link) => link.id === id);
  if (!spec) throw new Error(`No link spec "${id}"`);
  return spec;
};

function applyConnection(
  body: Fields,
  op: Extract<CellOp, { op: 'link' | 'unlink' }>,
  index: number,
): Step {
  const spec = specOf(op.spec);
  const write = (from: Body): Fields =>
    op.op === 'link'
      ? applyLink(spec, from, op.choice)
      : applyUnlink(spec, from, op.id, op.how);
  let mine: Fields;
  try {
    mine = write(body);
  } catch (error) {
    // An unlink only the dialog can make (the owner stores no list yet).
    return conflict(
      index,
      spec.path,
      getPath(op.seen, spec.path),
      getPath(body, spec.path),
      undefined,
      error instanceof Error ? error.message : String(error),
    );
  }
  const moved = changedSince(spec, op.seen, body);
  if (moved.length)
    return {
      conflicts: moved.map((path) => ({
        index,
        path,
        seen: getPath(op.seen, path),
        now: getPath(body, path),
        mine: getPath(mine, path),
      })),
    };
  // A link that is there already, an unlink of what is not: nothing new.
  return changedSince(spec, body, mine).length ? { body: mine } : { body };
}

function applyOne(body: Fields, op: CellOp, index: number): Step {
  switch (op.op) {
    case 'set':
      return applySet(body, op, index);
    case 'add':
    case 'remove':
      return applyListOp(body, op, index);
    case 'confirm':
      return applyConfirm(body, op, index);
    case 'link':
    case 'unlink':
      return applyConnection(body, op, index);
  }
}

/* ── Batches ─────────────────────────────────────────────────────────── */

/**
 * `ops` laid onto `body` in order, each onto what the ones before it left:
 * the body to save, or every op that could not be laid on. Never mutates
 * `body`; an op that changes nothing (a value already there) is passed
 * over, and `changed` says whether any did something.
 */
export function applyOps(body: Body, ops: readonly CellOp[]): ApplyResult {
  let running = body as Fields;
  const applied: CellOp[] = [];
  const conflicts: OpConflict[] = [];
  ops.forEach((op, index) => {
    const step = applyOne(running, op, index);
    if ('conflicts' in step) {
      conflicts.push(...step.conflicts);
      return;
    }
    if (step.body === running) return;
    applied.push(op);
    running = step.body;
  });
  if (conflicts.length) return { ok: false, conflicts };
  return { ok: true, body: running, changed: applied.length > 0, applied };
}

/**
 * "Use mine" after a conflict: the same ops, each resting on what `body`
 * holds where it lands rather than on what the author saw, so they write
 * over the other change. Rebased in order, so a second op on a path rests
 * on what the first one wrote there. Adds and removes need no rebasing.
 */
export function useMine(body: Body, ops: readonly CellOp[]): CellOp[] {
  let running = body as Fields;
  return ops.map((op, index) => {
    let rebased: CellOp = op;
    switch (op.op) {
      case 'set':
        rebased = { ...op, seen: readField(running, fieldOf(op.path)) };
        break;
      case 'link':
      case 'unlink':
        rebased = { ...op, seen: running };
        break;
      case 'confirm':
        rebased = {
          op: 'confirm',
          path: op.path,
          ...(op.id !== undefined ? { id: op.id } : {}),
        };
        break;
      case 'add':
      case 'remove':
        break;
    }
    const step = applyOne(running, rebased, index);
    if (!('conflicts' in step)) running = step.body;
    return rebased;
  });
}

/**
 * The `set`s that put `before` back where `after` changed it, each resting
 * on what `after` holds there. A change inside a marked object is put back
 * as the whole object, so its mark and source come back with it (a set
 * inside one would clear its mark instead).
 */
export function restoreOps(before: Body, after: Body): CellOp[] {
  const paths = new Map<string, string[]>();
  for (const keys of changedPaths(before, after)) {
    if (keys.length === 0) continue;
    const whole =
      keys.length > 1 && MARKED_OBJECTS.includes(keys[0]) ? [keys[0]] : keys;
    paths.set(whole.join('.'), whole);
  }
  const all = [...paths.keys()];
  return all
    .filter((path) => !all.some((other) => path.startsWith(`${other}.`)))
    .map((path) => {
      const keys = paths.get(path)!;
      return {
        op: 'set' as const,
        path,
        value: readField(before, keys),
        seen: readField(after, keys),
      };
    });
}

/**
 * What undoes `ops` written over `before` (the undo stack's entry): the
 * `restoreOps` between `before` and what the ops made of it. Empty when
 * they change nothing there, or cannot be laid on it.
 */
export function invertOps(before: Body, ops: readonly CellOp[]): CellOp[] {
  const result = applyOps(before, ops);
  return result.ok ? restoreOps(before, result.body) : [];
}

/* ── Coalescing ──────────────────────────────────────────────────────── */

/** The fields an op reads or writes; '*' for a link, which may reach several. */
const pathsOf = (op: CellOp): readonly string[] => {
  switch (op.op) {
    case 'set':
      return [op.path];
    case 'add':
    case 'remove':
    case 'confirm':
      return [markPath(op.path)];
    case 'link':
    case 'unlink':
      return ['*'];
  }
};

const nested = (a: string, b: string) =>
  a === '*' ||
  b === '*' ||
  a === b ||
  a === '' ||
  b === '' ||
  a.startsWith(`${b}.`) ||
  b.startsWith(`${a}.`);

const overlaps = (a: CellOp, b: CellOp) =>
  pathsOf(a).some((x) => pathsOf(b).some((y) => nested(x, y)));

const sameEntry = (a: ListOp, b: ListOp) =>
  markPath(a.path) === markPath(b.path) && a.id === b.id && a.key === b.key;

/**
 * One op for `first` then `then` on the same thing, when one says it all:
 * the same op twice is one; a value set twice is set once, from what was
 * first seen, and not at all when it comes back to that; an add then a
 * remove of one entry is the remove (so a list that was not there stays
 * not there, rather than becoming an empty one); and a remove then an add
 * of a bare id is the add. Undefined when the two must both be written.
 */
function join(first: CellOp, then: CellOp): CellOp[] | undefined {
  if (sameValue(first, then)) return [then];
  if (first.op === 'set' && then.op === 'set') {
    if (first.path !== then.path || !sameValue(then.seen, first.value))
      return undefined;
    return sameValue(then.value, first.seen)
      ? []
      : [{ op: 'set', path: then.path, value: then.value, seen: first.seen }];
  }
  if (first.op === 'add' && then.op === 'remove' && sameEntry(first, then))
    return [then];
  // Taken out and put back as an object entry is a new entry at the end,
  // which an add alone would not write: only a bare id folds.
  if (
    first.op === 'remove' &&
    then.op === 'add' &&
    !then.entry &&
    !then.key &&
    sameEntry(first, then)
  )
    return [then];
  return undefined;
}

/**
 * A pending batch and the edits made since, as one batch: what the write
 * queue sends when the write in flight is done. Each new op is folded into
 * the last earlier op on the same thing (`join`), as long as nothing
 * between them touches it; otherwise it is added in order. Laid onto a
 * body, the result writes what the two batches would one after the other,
 * except where `join` says otherwise.
 */
export function composeOps(
  first: readonly CellOp[],
  then: readonly CellOp[],
): CellOp[] {
  const out = [...first];
  for (const op of then) {
    let folded = false;
    for (let at = out.length - 1; at >= 0; at -= 1) {
      const joined = join(out[at], op);
      if (joined) {
        out.splice(at, 1, ...joined);
        folded = true;
        break;
      }
      if (overlaps(out[at], op)) break;
    }
    if (!folded) out.push(op);
  }
  return out;
}
