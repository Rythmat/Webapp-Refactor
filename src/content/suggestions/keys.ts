import { artistSlug } from '../graph/slugs';
import type { SuggestionOp, SuggestionTarget } from './types';

/**
 * Identity for suggestions and their values.
 *
 * A suggestion's id must come out the same every time the importer runs, or
 * a rejection would not stick; and it must change when the value does, or a
 * corrected birth year would inherit the rejection of the wrong one. So the
 * id hashes what the suggestion says (the item, the path, the value), never
 * who said it or when. The importer (a Node script) and the console both
 * compute these, so this file reads nothing but a slug helper that has no
 * imports of its own.
 */

/**
 * Keys that say how sure a value is and where it came from (RefMeta), not
 * what it is: a credit is the same credit whoever vouches for it.
 */
export const REF_META_KEYS: readonly string[] = ['unverified', 'source'];

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

/** The value without its own `unverified`/`source`; anything else as it is. */
export function withoutRefMeta(value: unknown): unknown {
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(
    Object.entries(value).filter(([key]) => !REF_META_KEYS.includes(key)),
  );
}

/**
 * JSON with every object's keys sorted, so two bodies that say the same
 * thing in a different key order hash alike. Follows JSON.stringify
 * otherwise: an undefined field is left out, an undefined element is null.
 */
export function stableJson(value: unknown): string {
  if (value === undefined) return 'undefined';
  const walk = (node: unknown): string => {
    if (Array.isArray(node))
      return `[${node.map((item) => (item === undefined ? 'null' : walk(item))).join(',')}]`;
    if (isPlainObject(node)) {
      const fields = Object.keys(node)
        .filter((key) => node[key] !== undefined)
        .sort()
        .map((key) => `${JSON.stringify(key)}:${walk(node[key])}`);
      return `{${fields.join(',')}}`;
    }
    return JSON.stringify(node) ?? 'null';
  };
  return walk(value);
}

/** Two JSON values say the same thing. */
export const sameJson = (a: unknown, b: unknown): boolean =>
  stableJson(a) === stableJson(b);

/** 32-bit FNV-1a of a string, as 8 hex digits (the mock's patch hash). */
const fnv = (text: string, seed = 0x811c9dc5): string => {
  let hash = seed >>> 0;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
};

/**
 * 16 hex digits: two FNV passes with different seeds. Not cryptographic; it
 * only has to tell some ten thousand suggestions apart, and it has to come
 * out the same in Node and in the browser.
 */
export const hashText = (text: string): string =>
  fnv(text) + fnv(text, 0x5bd1e995);

/** The hash a decision keeps of the value the owner decided on. */
export const valueHash = (value: unknown): string =>
  hashText(stableJson(withoutRefMeta(value)));

/** The array field a path adds to or reaches into: `credits[]` → credits. */
const arrayField = (path: string): string =>
  path
    .replace(/\[\d*\]$/, '')
    .split('.')
    .pop()!
    .replace(/\[\d*\]/g, '');

const text = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

/**
 * How to tell one element of a list from another, per list. Each answers
 * every key the element can be known by, so a credit written with a record
 * id and the same credit written as a bare name still meet: an artist slug
 * and `artistSlug(name)` are the same kind of string. The steadiest key
 * comes first, because the first is the one ids and anchors are made from
 * (`elementAnchor`).
 */
const ELEMENT_KEYS: Record<
  string,
  (element: Record<string, unknown>) => string[]
> = {
  // One person can hold two credits on a song (bass, and double bass), so a
  // performer is told apart by their instrument too. The name comes before
  // the record id: every credit has a name from the start, while the id may
  // arrive later or change (a namesake renamed `bill-evans-2`).
  credits: (credit) => {
    const role =
      credit.role === 'performer'
        ? `performer:${text(credit.instrument)}`
        : text(credit.role);
    return [
      text(credit.name) && artistSlug(text(credit.name)),
      text(credit.artistGlobeId),
    ]
      .filter(Boolean)
      .map((who) => `${role}|${who}`);
  },
  releases: (release) => [text(release.releaseId)].filter(Boolean),
  members: (member) => [text(member.artistId)].filter(Boolean),
  influencedBy: (influence) => [text(influence.artistId)].filter(Boolean),
  // A recording charted here is its song, and only that: two samples of one
  // artist are two recordings. Otherwise the relation, the artist and the
  // year, which is all a recording says about itself — so two samples of one
  // artist from the same year still meet, and a person tells them apart.
  relatedRecordings: (recording) => {
    const songId = text(recording.songId);
    if (songId) return [`song:${songId}`];
    const relation = text(recording.relation);
    const year = typeof recording.year === 'number' ? recording.year : '';
    return [
      text(recording.artist) && artistSlug(text(recording.artist)),
      text(recording.artistGlobeId),
    ]
      .filter(Boolean)
      .map((who) => `${relation}|${who}|${year}`);
  },
};

/**
 * Every key one element of the list at `path` is known by. A bare id is its
 * own key; an object is keyed by the list's identity rule, or, for a list
 * with none, by everything it says.
 */
export function elementKeys(path: string, element: unknown): string[] {
  if (!isPlainObject(element)) return [stableJson(element)];
  const field = arrayField(path);
  const rule = Object.prototype.hasOwnProperty.call(ELEMENT_KEYS, field)
    ? ELEMENT_KEYS[field]
    : undefined;
  const keys = rule?.(element) ?? [];
  return keys.length ? keys : [stableJson(withoutRefMeta(element))];
}

/** Two elements of the list at `path` are the same thing (a key in common). */
export function sameElement(path: string, a: unknown, b: unknown): boolean {
  const keys = new Set(elementKeys(path, a));
  return elementKeys(path, b).some((key) => keys.has(key));
}

/**
 * The key an element is known by for good: a suggestion's `anchor`, and
 * the part of an added element its suggestion id is made from. The list's
 * steadiest key, so a credit keeps it when it gains a record id or its
 * details are corrected.
 */
export const elementAnchor = (path: string, element: unknown): string =>
  elementKeys(path, element)[0];

/**
 * The part of a value its suggestion is known by: for an element, its
 * anchor (so a credit that gains its record id keeps its id, and its
 * decision's `valueHash` notices the change — though a performer's
 * instrument is part of who the credit is, so a corrected instrument is a
 * new suggestion); for anything else, all of it.
 */
export const valueKey = (op: SuggestionOp, path: string, value: unknown) =>
  op === 'add' ? elementAnchor(path, value) : stableJson(withoutRefMeta(value));

/**
 * The path as an id reads it: an index names a position, which changes when
 * the list is edited, so where there is an anchor it stands in for the
 * index — `credits[=producer|quincy-jones].artistGlobeId`.
 */
const idPath = (path: string, anchor: string | undefined) =>
  anchor ? path.replace(/\[\d+\]/, `[=${anchor}]`) : path;

/** A suggestion's stable id (see the file comment). */
export const suggestionId = (suggestion: {
  target: SuggestionTarget;
  path: string;
  anchor?: string;
  op: SuggestionOp;
  value: unknown;
}): string =>
  hashText(
    [
      suggestion.target.kind,
      suggestion.target.slug,
      idPath(suggestion.path, suggestion.anchor),
      valueKey(suggestion.op, suggestion.path, suggestion.value),
    ].join('|'),
  );
