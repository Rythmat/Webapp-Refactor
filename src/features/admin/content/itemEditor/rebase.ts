/**
 * A draft laid onto a newer version of its item: what an editing session
 * does when the item moves on the server while it has unsaved changes — a
 * suggestion accepted in bulk, a Link… from another row, someone else's
 * save.
 *
 * Three bodies: `base`, what the draft was seeded from; `mine`, the draft;
 * `theirs`, the item as it is now. Every path the draft changed from `base`
 * is laid onto `theirs`; everything else is theirs. A path both changed, to
 * different values, is an overlap: laid on only when the author says so
 * (`mineWins`), having been told which.
 *
 * Paths go down through plain objects (`session.studioId` and
 * `session.labelId` are two paths); a list, like any other value, is one
 * path whole — `artistIds` is a single decision, never merged item by item.
 *
 * Pure.
 */

type Body = Record<string, unknown>;

const isPlainObject = (value: unknown): value is Body =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Structural equality over JSON-shaped values; key order does not matter. */
export function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length)
      return false;
    return a.every((item, index) => sameValue(item, b[index]));
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const key of keys) if (!sameValue(a[key], b[key])) return false;
    return true;
  }
  // Dates survive a revive as Dates: compare them by time.
  if (a instanceof Date && b instanceof Date)
    return a.getTime() === b.getTime();
  return false;
}

/** Where two bodies differ: each path down to the first value that is not an object on both sides. */
export function changedPaths(
  a: unknown,
  b: unknown,
  prefix: readonly string[] = [],
): string[][] {
  if (isPlainObject(a) && isPlainObject(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    return [...keys].flatMap((key) =>
      sameValue(a[key], b[key])
        ? []
        : changedPaths(a[key], b[key], [...prefix, key]),
    );
  }
  return sameValue(a, b) ? [] : [[...prefix]];
}

const read = (body: unknown, path: readonly string[]): unknown =>
  path.reduce<unknown>(
    (value, key) => (isPlainObject(value) ? value[key] : undefined),
    body,
  );

/** `body` with `path` set to `value` (removed when undefined), copied along the way. */
function write(body: Body, path: readonly string[], value: unknown): Body {
  const [key, ...rest] = path;
  if (key === undefined) return isPlainObject(value) ? value : body;
  const next: Body = { ...body };
  if (rest.length === 0) {
    if (value === undefined) delete next[key];
    else next[key] = value;
    return next;
  }
  const inner = isPlainObject(body[key]) ? (body[key] as Body) : {};
  next[key] = write(inner, rest, value);
  return next;
}

export interface Rebased {
  /** The draft on `theirs`: every path it changed, over theirs. */
  body: Body;
  /** The paths the other version changed, dotted: "placeId". */
  theirs: string[];
  /** The paths both changed, differently: laid on only with `mineWins`. */
  overlap: string[];
}

const dotted = (path: readonly string[]) => path.join('.');

/** One path is the other, or lies inside it. */
const nested = (a: readonly string[], b: readonly string[]) => {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i += 1) if (a[i] !== b[i]) return false;
  return true;
};

export function rebaseDraft(
  base: Body,
  mine: Body,
  theirs: Body,
  { mineWins = false }: { mineWins?: boolean } = {},
  prefix: readonly string[] = [],
): Rebased {
  const ours = changedPaths(base, mine);
  const their = changedPaths(base, theirs);
  let body = theirs;
  const overlap: string[] = [];
  for (const path of ours) {
    const value = read(mine, path);
    const there = read(theirs, path);
    const clash = their.some((other) => nested(path, other));
    if (clash && !sameValue(there, value)) {
      // Both made an object where there was none (a song's first
      // `session`): merge the two, field by field, from nothing.
      if (
        isPlainObject(value) &&
        isPlainObject(there) &&
        !isPlainObject(read(base, path))
      ) {
        const inner = rebaseDraft({}, value, there, { mineWins }, [
          ...prefix,
          ...path,
        ]);
        overlap.push(...inner.overlap);
        body = write(body, path, inner.body);
        continue;
      }
      // Both changed it, differently: the author's call, and until they
      // make it their version stands.
      overlap.push(dotted([...prefix, ...path]));
      if (!mineWins) continue;
    }
    body = write(body, path, value);
  }
  return {
    body,
    theirs: their.map((path) => dotted([...prefix, ...path])),
    overlap,
  };
}
