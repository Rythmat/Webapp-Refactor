/**
 * Reading and writing a content body by path, with no imports.
 *
 * Two spellings of a path, for two jobs:
 *
 *  - Dot paths (`location.city`) address a form field. `getPath`/`setPath`
 *    are the console's typed forms' helpers, moved here from the kind specs
 *    so code that only wants to read a body — the suggestions, the Table's
 *    row panel — need not load every kind's editor to do it.
 *  - Reference paths add elements, as REF_PATHS and the legacy linker spell
 *    them: `credits[3].artistGlobeId` names one element, and a trailing `[]`
 *    (`artistIds[]`) names the array a new element goes into. `[]` in the
 *    middle (`credits[].name`) means "every element", which no single write
 *    can address, so it is refused here rather than guessed at.
 */

// ── Dot paths, for the typed form's FieldSpec.path ───────────────────────────

export const getPath = (body: unknown, path: string): unknown =>
  path
    .split('.')
    .reduce<unknown>(
      (value, key) =>
        value && typeof value === 'object'
          ? (value as Record<string, unknown>)[key]
          : undefined,
      body,
    );

/** Immutably set a dot path, creating intermediate objects as needed. */
export const setPath = <T extends Record<string, unknown>>(
  body: T,
  path: string,
  value: unknown,
): T => {
  const [head, ...rest] = path.split('.');
  if (rest.length === 0) return { ...body, [head]: value };

  const child = (body[head] ?? {}) as Record<string, unknown>;
  return { ...body, [head]: setPath(child, rest.join('.'), value) };
};

/** The part of the body the typed form does NOT own, for the JSON editor. */
export const jsonRemainder = (
  body: Record<string, unknown>,
  formKeys: string[],
): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(body).filter(([key]) => !formKeys.includes(key)),
  );

// ── Reference paths, for writing one fact ────────────────────────────────────

/** A field name, or an element's index. */
export type PathStep = string | number;

export interface RefPathParts {
  /** From the body down to the value (or to the array, for `each`). */
  steps: PathStep[];
  /** The path ended in `[]`: it names an array, and a write adds to it. */
  each: boolean;
}

const STEP = /^([A-Za-z_$][\w$]*)((?:\[\d*\])*)$/;

/**
 * Names no body field can have: a write there would set an object's
 * prototype rather than a field of it.
 */
const NOT_FIELDS: readonly string[] = ['__proto__', 'constructor', 'prototype'];

/**
 * `credits[3].artistGlobeId` → steps `credits, 3, artistGlobeId`;
 * `artistIds[]` → steps `artistIds`, each. Null for anything else: an empty
 * segment, `[]` before the end, a name that is not a plain field name.
 */
export function parseRefPath(path: string): RefPathParts | null {
  const segments = path.split('.');
  const steps: PathStep[] = [];
  let each = false;
  for (const [at, segment] of segments.entries()) {
    const match = STEP.exec(segment);
    if (!match || each || NOT_FIELDS.includes(match[1])) return null;
    steps.push(match[1]);
    for (const bracket of match[2].match(/\[\d*\]/g) ?? []) {
      if (each) return null;
      if (bracket === '[]') {
        // Only as the very last thing: an array to add to.
        each = true;
        continue;
      }
      steps.push(Number(bracket.slice(1, -1)));
    }
    if (each && at !== segments.length - 1) return null;
  }
  return { steps, each };
}

/**
 * A field the object itself holds: never one it inherits (`toString`,
 * `constructor`), which no body states however the path is spelled.
 */
const ownField = (record: object, key: string): unknown =>
  Object.prototype.hasOwnProperty.call(record, key)
    ? (record as Record<string, unknown>)[key]
    : undefined;

/** The value at `steps`, or undefined where the body has nothing there. */
export function readSteps(body: unknown, steps: readonly PathStep[]): unknown {
  let node = body;
  for (const step of steps) {
    if (typeof step === 'number') {
      node = Array.isArray(node) ? node[step] : undefined;
    } else {
      node =
        node && typeof node === 'object' && !Array.isArray(node)
          ? ownField(node, step)
          : undefined;
    }
    if (node === undefined) return undefined;
  }
  return node;
}

/** Where a write could not go: distinct from any value, `null` included. */
const NOWHERE: unique symbol = Symbol('nowhere');

/**
 * The body with `value` at `steps`, as a copy — setPath's rules, plus
 * elements. A missing object on the way is created (a song with no
 * `session` gets one), but an array is never grown and never made up: an
 * index past the end means the element is gone and the body moved on since
 * it was read, so the answer is null and nothing is written.
 */
export function writeSteps<T extends Record<string, unknown>>(
  body: T,
  steps: readonly PathStep[],
  value: unknown,
): T | null {
  const write = (node: unknown, at: number): unknown => {
    if (at === steps.length) return value;
    const step = steps[at];
    if (typeof step === 'number') {
      if (!Array.isArray(node) || step >= node.length) return NOWHERE;
      const child = write(node[step], at + 1);
      if (child === NOWHERE) return NOWHERE;
      const copy = [...node];
      copy[step] = child;
      return copy;
    }
    // A field of something that is not an object: a string, a number, a list.
    if (node !== undefined && (!node || typeof node !== 'object'))
      return NOWHERE;
    if (Array.isArray(node)) return NOWHERE;
    const record = (node ?? {}) as Record<string, unknown>;
    const held = ownField(record, step);
    // The next step is an index: only an array that is already there will do.
    if (typeof steps[at + 1] === 'number' && !Array.isArray(held))
      return NOWHERE;
    const child = write(held, at + 1);
    if (child === NOWHERE) return NOWHERE;
    return { ...record, [step]: child };
  };
  const next = write(body, 0);
  return next === NOWHERE ? null : (next as T);
}
