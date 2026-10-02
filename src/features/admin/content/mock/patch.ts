/**
 * Structural patches between two JSON values, for the mock's persistence.
 *
 * The mock stores what changed about an item, not the item: a batch that links
 * every song to its artist touches one field in each of 638 bodies, and
 * storing whole bodies would blow through localStorage's quota long before
 * that. A patch is the list of places where `to` differs from `from`.
 *
 * Arrays of equal length are compared element by element, so fixing a chord in
 * bar 12 records bar 12. An array that changed length is replaced whole —
 * inserting a bar rewrites that one `bars` array, which stays small, and it
 * avoids an index-shifting diff that would be much harder to trust.
 *
 * Values are JSON: a key holding `undefined` counts as absent, as it would
 * after a round trip through JSON.
 */

export type PatchPath = (string | number)[];

export type PatchOp =
  | { path: PatchPath; op: 'set'; value: unknown }
  | { path: PatchPath; op: 'del' };

type JsonObject = Record<string, unknown>;

const isObject = (value: unknown): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const present = (object: JsonObject, key: string) =>
  Object.prototype.hasOwnProperty.call(object, key) &&
  object[key] !== undefined;

export function diffJson(
  from: unknown,
  to: unknown,
  path: PatchPath = [],
  out: PatchOp[] = [],
): PatchOp[] {
  if (Object.is(from, to)) return out;

  if (isObject(from) && isObject(to)) {
    for (const key of Object.keys(from)) {
      if (present(from, key) && !present(to, key))
        out.push({ path: [...path, key], op: 'del' });
    }
    for (const key of Object.keys(to)) {
      if (!present(to, key)) continue;
      if (!present(from, key))
        out.push({ path: [...path, key], op: 'set', value: to[key] });
      else diffJson(from[key], to[key], [...path, key], out);
    }
    return out;
  }

  if (Array.isArray(from) && Array.isArray(to) && from.length === to.length) {
    for (let index = 0; index < to.length; index += 1)
      diffJson(from[index], to[index], [...path, index], out);
    return out;
  }

  out.push({ path, op: 'set', value: to });
  return out;
}

/**
 * Apply a patch without touching `base`: only the containers along each
 * changed path are copied, and everything else is shared. That is safe because
 * the mock never mutates a body in place — every change replaces it.
 */
export function applyPatch<T = unknown>(base: unknown, ops: PatchOp[]): T {
  let root = base;
  for (const op of ops) root = applyOp(root, op, 0);
  return root as T;
}

function applyOp(node: unknown, op: PatchOp, depth: number): unknown {
  if (depth === op.path.length) {
    // Only reachable for 'set' at the root; a 'del' of the root is not a
    // patch diffJson can produce.
    return op.op === 'set' ? op.value : undefined;
  }

  const key = op.path[depth];
  const last = depth === op.path.length - 1;

  if (Array.isArray(node) && typeof key === 'number') {
    const copy = node.slice();
    if (last && op.op === 'del') copy.splice(key, 1);
    else copy[key] = applyOp(node[key], op, depth + 1);
    return copy;
  }

  const copy: JsonObject = isObject(node) ? { ...node } : {};
  if (last && op.op === 'del') {
    delete copy[String(key)];
    return copy;
  }
  const child = isObject(node) ? node[String(key)] : undefined;
  copy[String(key)] = applyOp(
    child ?? (typeof op.path[depth + 1] === 'number' ? [] : undefined),
    op,
    depth + 1,
  );
  return copy;
}

/** 32-bit FNV-1a of a string, as 8 hex digits. */
export const fnv = (text: string, seed = 0x811c9dc5) => {
  let hash = seed >>> 0;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
};

const hashes = new WeakMap<object, string>();

/**
 * A short fingerprint of a JSON value: two FNV passes with different seeds.
 * Not cryptographic; it only has to notice that a seed body changed under a
 * saved patch. Cached per object, since the mock never mutates a body.
 */
export function jsonHash(value: unknown): string {
  const cacheable = typeof value === 'object' && value !== null;
  if (cacheable) {
    const cached = hashes.get(value);
    if (cached) return cached;
  }
  const text = JSON.stringify(value) ?? 'undefined';
  const hash = fnv(text) + fnv(text, 0x5bd1e995);
  if (cacheable) hashes.set(value, hash);
  return hash;
}

/** Deep equality for JSON values, with the same `undefined` rule as the diff. */
export function jsonEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let index = 0; index < a.length; index += 1)
      if (!jsonEqual(a[index], b[index])) return false;
    return true;
  }
  if (isObject(a) && isObject(b)) {
    const keysA = Object.keys(a).filter((key) => present(a, key));
    const keysB = Object.keys(b).filter((key) => present(b, key));
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA)
      if (!present(b, key) || !jsonEqual(a[key], b[key])) return false;
    return true;
  }
  return false;
}
