import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { format, resolveConfig, type Options } from 'prettier';
import ts from 'typescript';
import {
  ARTIST_REGISTRY_DECLARATION,
  CITIES_DECLARATION,
  EVENTS_DECLARATION,
  firstDifference,
  formatPath,
  type DeclarationLocator,
  isBindingName,
  type Json,
  type JsonObject,
  type JsonPath,
  NotJsonError,
  PROGRESSION_LIBRARY_DECLARATION,
  propertyKey,
  RESERVED_BINDING_NAMES,
  type ReadDeclaration,
  readDeclaration,
  refuse,
  RepoUnwritableError,
  SONG_DECLARATION,
  strictJson,
  unwrapExpression,
} from './literal';

/**
 * Writing an edited value back into a TypeScript data file, surgically.
 *
 * A save in repo mode changes one song, one event, one city. The file it
 * lands in is hand-written, reviewed in git and read by other sessions'
 * scripts, so the write has to look like a person made exactly that edit:
 * the changed values replaced where they stand, everything else byte for
 * byte as it was, comments included. Reprinting the whole literal would be
 * simpler and would turn every save into a diff of the whole file.
 *
 * So the writer compares the value the file holds with the value it should
 * hold and plans splices, walking both together:
 *
 *  - equal values are skipped, however large;
 *  - two objects are compared key by key. A new key goes in after the
 *    nearest key before it in the kind's key order that the file has, so a
 *    song's new `session` lands after `techniques` as the pilot songs have
 *    it. A removed key has its `key: value,` cut out. A key the file spells
 *    `year: undefined` has that `undefined` replaced where it stands;
 *  - two arrays keep their common start and end, pair the elements in
 *    between one to one (so equal lengths go element by element), and cut
 *    or add the rest. Additions go after the last element they follow, so
 *    an array that only grew at the end is appended to. Arrays of records
 *    (the events, the cities, the registry, the library) are matched by
 *    their identity field instead of by position;
 *  - anything else has its node's text replaced by the new value.
 *
 * Comments are never lost. A replaced or removed span with a comment in it
 * is refused, naming the file and line (422 `REPO_UNWRITABLE`); so is
 * removing a member with a comment after it on its line, or a property with
 * a comment above it, which is about that property. An array element is
 * different: the comment above one is a section heading (the events files
 * are full of them), so deleting the element starts at the element and the
 * heading stays with the elements after it.
 *
 * New text copies the style of what it replaces or joins: an object is
 * broken over lines where its neighbour's is, a blank line separates
 * records where the array's records are separated so, and a string that
 * replaces one spelt with `\u` escapes is spelt with them too.
 *
 * The splices are applied from the end, and the whole file is then run
 * through prettier with the repo's `.prettierrc`. The data files are
 * prettier-clean (`npm run lint` checks), so everything the splices did not
 * touch comes out byte-identical, and a file found not to be clean is
 * reported. Last, the new text is parsed and evaluated again and must equal
 * the intended value exactly (`verifyRoundTrip`, the store's step 4), or
 * nothing is written. The intended value is taken as it stands
 * (`strictJson`): a NaN, a Date or an undefined array element is refused,
 * not written as the null or string a JSON round trip would make of it,
 * which the check would then have agreed with.
 *
 * Pure apart from prettier's config lookup: text in, text out. No file
 * system writes, nothing from Vite, so the repo store and the bulk import
 * (`npx tsx`) share it.
 */

/* ── Key orders ────────────────────────────────────────────────────── */

/**
 * Where a song's keys go. Surveyed over the 640 song files on 30 Sep 2026:
 * six distinct orders, 631 files in the one this follows. The pilot songs
 * put `session`, `credits` and `relatedRecordings` after `techniques`, and
 * `aint_nobody` and `sweet_thing` put `origin` after `year`, which is where
 * this puts them. `subgenreIds`, `releases` and `contentRefs` are where the
 * `Song` interface declares them relative to their neighbours.
 */
export const SONG_KEY_ORDER = [
  'id',
  'title',
  'artist',
  'composer',
  'year',
  'origin',
  'historicalDescription',
  'key',
  'keyRoot',
  'mode',
  'tempo',
  'timeSignature',
  'difficulty',
  'genreTags',
  'subgenreIds',
  'techniques',
  'session',
  'credits',
  'relatedRecordings',
  'releases',
  'contentRefs',
  'sections',
  'audioSources',
  'artistImageSource',
  'artistImageRef',
  'popularity',
] as const;

/**
 * A globe event's keys: the order all 1,723 events use, then the v2 fields
 * in the order `GlobeEventRecord` (and its zod schema) declares them.
 */
export const EVENT_KEY_ORDER = [
  'id',
  'year',
  'location',
  'genre',
  'title',
  'description',
  'tags',
  'videoId',
  'artistIds',
  'songIds',
  'placeId',
  'releaseIds',
  'studioIds',
  'labelIds',
  'unverified',
  'source',
  'label',
  'studio',
  'recordedYear',
  'credits',
] as const;

/** A city's keys: the order all 299 use, then `PlaceRecord`'s own. */
export const CITY_KEY_ORDER = [
  'id',
  'name',
  'country',
  'subdivision',
  'region',
  'coordinates',
  'genres',
  'description',
  'activeDecades',
  'aliases',
  'pin',
] as const;

/** A registry entry's keys, as `RegisteredArtist` declares them. */
export const ARTIST_REGISTRY_KEY_ORDER = ['slug', 'name', 'aliases'] as const;

/** A progression's keys, as `ChordProgressionEntry` declares them. */
export const PROGRESSION_KEY_ORDER = [
  'id',
  'progression',
  'chords',
  'chordCount',
  'startingChord',
  'startingDegree',
  'complexity',
  'vibes',
  'styles',
  'artist',
  'song',
  'songIds',
] as const;

/* ── Rules per kind of file ────────────────────────────────────────── */

/** What the writer needs to know about a file beyond its text. */
export interface WriteRules {
  /**
   * The key order of the object at `path`, which places a new key. Without
   * one, the new value's own key order is used.
   */
  keyOrder?: (path: JsonPath) => readonly string[] | undefined;
  /**
   * The field that identifies the elements of the array at `path`, when
   * they are records. Such an array is matched by it instead of by position,
   * and reordering its elements is refused.
   */
  identity?: (path: JsonPath) => string | undefined;
}

/** A song file: one object, its top-level keys in `SONG_KEY_ORDER`. */
export const SONG_RULES: WriteRules = {
  keyOrder: (path) => (path.length === 0 ? SONG_KEY_ORDER : undefined),
};

/** An array of records identified by `identity`, their keys in `keyOrder`. */
export const recordArrayRules = (
  identity: string,
  keyOrder: readonly string[],
): WriteRules => ({
  identity: (path) => (path.length === 0 ? identity : undefined),
  keyOrder: (path) => (path.length === 1 ? keyOrder : undefined),
});

/** A kind of TypeScript data file: where its value is and how to edit it. */
export interface TsFileKind {
  locator: DeclarationLocator;
  rules: WriteRules;
  /** The identity field of a record array's elements. */
  identity?: string;
}

/** The five kinds of TypeScript data file repo mode edits. */
export const TS_FILE_KINDS = {
  song: { locator: SONG_DECLARATION, rules: SONG_RULES },
  events: {
    locator: EVENTS_DECLARATION,
    rules: recordArrayRules('id', EVENT_KEY_ORDER),
    identity: 'id',
  },
  cities: {
    locator: CITIES_DECLARATION,
    rules: recordArrayRules('id', CITY_KEY_ORDER),
    identity: 'id',
  },
  artistRegistry: {
    locator: ARTIST_REGISTRY_DECLARATION,
    rules: recordArrayRules('slug', ARTIST_REGISTRY_KEY_ORDER),
    identity: 'slug',
  },
  progressions: {
    locator: PROGRESSION_LIBRARY_DECLARATION,
    rules: recordArrayRules('id', PROGRESSION_KEY_ORDER),
    identity: 'id',
  },
} as const satisfies Record<string, TsFileKind>;

/* ── Printing new values ───────────────────────────────────────────── */

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

const printKey = (key: string): string =>
  IDENTIFIER.test(key) ? key : JSON.stringify(key);

const isObject = (value: Json): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Own keys only: a body may well have a key called `constructor`. */
const has = (object: JsonObject, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(object, key);

/**
 * Whether a list's source breaks the line between its bracket and its first
 * member. Prettier keeps an object literal broken over lines when it does,
 * and collapses it otherwise.
 */
const isBroken = (
  list: ts.ObjectLiteralExpression | ts.ArrayLiteralExpression,
  sourceFile: ts.SourceFile,
): boolean => {
  const first = ts.isObjectLiteralExpression(list)
    ? list.properties[0]
    : list.elements[0];
  if (!first) return false;
  return sourceFile.text
    .slice(list.getStart(sourceFile), first.getStart(sourceFile))
    .includes('\n');
};

const propertyNode = (
  node: ts.ObjectLiteralExpression,
  key: string,
  sourceFile: ts.SourceFile,
): ts.PropertyAssignment | undefined =>
  node.properties.find(
    (p): p is ts.PropertyAssignment =>
      ts.isPropertyAssignment(p) && propertyKey(p.name, sourceFile) === key,
  );

/**
 * A string as JSON spells it, with every character past ASCII written as
 * `\uXXXX` when the string it replaces was written that way. Some files
 * spell accents and dashes as escapes (`world.ts`, `cities.ts`); an edited
 * string keeps its file's spelling, and an edit undone gives the original
 * bytes back.
 */
const printString = (value: string, replaced: string): string => {
  const printed = JSON.stringify(value);
  const sample = /\\u([0-9a-fA-F]{4})/.exec(replaced)?.[1];
  if (!sample) return printed;
  const upper = sample !== sample.toLowerCase();
  return printed.replace(/[\u007f-\uffff]/g, (c) => {
    const hex = c.charCodeAt(0).toString(16).padStart(4, '0');
    return `\\u${upper ? hex.toUpperCase() : hex}`;
  });
};

/**
 * A value as TypeScript source, for prettier to lay out. Strings come out
 * double-quoted, as JSON has them; prettier turns them to single quotes
 * wherever that needs no more escapes, as the repo's files have them.
 *
 * `template` is the node the value replaces, or a sibling of the node it is
 * added next to, and the value is printed in its style. An object is broken
 * over lines where the template's matching object is, so a new event's
 * `location` looks like its neighbours' instead of collapsing onto one
 * line, and a string replacing one spelt with `\u` escapes is spelt so too.
 */
export function printValue(
  value: Json,
  template?: ts.Expression,
  sourceFile?: ts.SourceFile,
): string {
  const shape = template && sourceFile ? unwrapExpression(template) : undefined;
  if (typeof value === 'string') {
    return shape && ts.isStringLiteral(shape)
      ? printString(value, shape.getText(sourceFile))
      : JSON.stringify(value);
  }
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    const elements =
      shape && ts.isArrayLiteralExpression(shape) ? shape.elements : undefined;
    const printed = value.map((element, i) =>
      printValue(
        element,
        elements?.[Math.min(i, elements.length - 1)],
        sourceFile,
      ),
    );
    return `[${printed.join(', ')}]`;
  }
  const object =
    shape && sourceFile && ts.isObjectLiteralExpression(shape)
      ? shape
      : undefined;
  const entries = Object.entries(value).map(
    ([key, v]) =>
      `${printKey(key)}: ${printValue(
        v,
        object && sourceFile
          ? propertyNode(object, key, sourceFile)?.initializer
          : undefined,
        sourceFile,
      )}`,
  );
  if (entries.length === 0) return '{}';
  return object && sourceFile && isBroken(object, sourceFile)
    ? `{\n${entries.join(',\n')},\n}`
    : `{ ${entries.join(', ')} }`;
}

/* ── Splices ───────────────────────────────────────────────────────── */

/** Replace `text[start, end)` with `text`. An insertion has `start === end`. */
export interface Splice {
  start: number;
  end: number;
  text: string;
}

/** Applies splices from the end of the text back, refusing overlaps. */
export function applySplices(text: string, splices: readonly Splice[]): string {
  const sorted = [...splices].sort(
    (a, b) => b.start - a.start || b.end - a.end,
  );
  let out = text;
  let floor = Infinity;
  for (const splice of sorted) {
    if (splice.end > floor || splice.start > splice.end) {
      throw new Error(
        `overlapping splices at ${splice.start}-${splice.end} (internal error)`,
      );
    }
    out = out.slice(0, splice.start) + splice.text + out.slice(splice.end);
    floor = splice.start;
  }
  return out;
}

const WHITESPACE = /[ \t\r\n]/;

/**
 * Plans the splices that turn what a literal holds into a new value.
 *
 * One planner per write; `diff` may be called for several nodes of the same
 * file before the splices are applied together.
 */
export class SplicePlanner {
  readonly splices: Splice[] = [];
  private readonly text: string;

  constructor(
    private readonly sourceFile: ts.SourceFile,
    private readonly rules: WriteRules = {},
  ) {
    this.text = sourceFile.text;
  }

  /**
   * Plans `node` (which holds `before`, as evaluated) to hold `after`.
   * `path` is where the node sits in its declaration's value.
   */
  diff(node: ts.Expression, before: Json, after: Json, path: JsonPath): void {
    if (firstDifference(before, after) === null) return;
    const literal = unwrapExpression(node);
    if (
      ts.isObjectLiteralExpression(literal) &&
      isObject(before) &&
      isObject(after)
    ) {
      this.diffObject(literal, before, after, path);
      return;
    }
    if (
      ts.isArrayLiteralExpression(literal) &&
      Array.isArray(before) &&
      Array.isArray(after)
    ) {
      const identity = this.rules.identity?.(path);
      if (identity) this.diffRecords(literal, before, after, path, identity);
      else this.diffArray(literal, before, after, path);
      return;
    }
    this.replace(literal, after, path);
  }

  /* ── Objects ── */

  private diffObject(
    node: ts.ObjectLiteralExpression,
    before: JsonObject,
    after: JsonObject,
    path: JsonPath,
  ): void {
    const sf = this.sourceFile;
    // Every property is a plain `key: value` here: the evaluator refused
    // anything else before the writer ever saw the file.
    const properties = new Map<string, ts.PropertyAssignment>();
    for (const property of node.properties) {
      if (ts.isPropertyAssignment(property)) {
        properties.set(propertyKey(property.name, sf), property);
      }
    }

    const removed = new Set<string>();
    for (const key of Object.keys(before)) {
      if (!has(after, key)) removed.add(key);
    }
    for (const key of removed) {
      this.removeProperty(properties.get(key)!, [...path, key]);
    }

    const added: string[] = [];
    for (const [key, value] of Object.entries(after)) {
      const property = properties.get(key);
      if (has(before, key)) {
        this.diff(property!.initializer, before[key], value, [...path, key]);
      } else if (property) {
        // `key: undefined` in the file: the value goes where it stands.
        this.replace(property.initializer, value, [...path, key]);
      } else {
        added.push(key);
      }
    }
    if (added.length === 0) return;

    // A key the file keeps can anchor an insertion: anything not being
    // removed, including a `key: undefined` still standing.
    const kept = (key: string) => properties.has(key) && !removed.has(key);
    const explicit = this.rules.keyOrder?.(path);
    const own = Object.keys(after);
    const anchorOf = (key: string): string | null => {
      const known = !explicit || explicit.includes(key);
      const order = explicit && known ? explicit : own;
      for (let i = order.indexOf(key) - 1; i >= 0; i--) {
        if (kept(order[i])) return order[i];
      }
      // First in its order: the start of the object. A key the kind's order
      // does not know, with nothing before it, goes after the last key kept.
      if (known) return null;
      return [...properties.keys()].filter(kept).pop() ?? null;
    };

    const groups = new Map<string | null, string[]>();
    for (const key of added) {
      const anchor = anchorOf(key);
      groups.set(anchor, [...(groups.get(anchor) ?? []), key]);
    }
    const rank = (key: string) => {
      const i = explicit?.indexOf(key) ?? -1;
      return i >= 0
        ? i
        : explicit
          ? explicit.length + own.indexOf(key)
          : own.indexOf(key);
    };
    for (const [anchor, keys] of groups) {
      keys.sort((a, b) => rank(a) - rank(b));
      const entries = keys.map(
        (key) => `${printKey(key)}: ${printValue(after[key])}`,
      );
      this.insertAfter(
        node,
        anchor === null ? null : properties.get(anchor)!,
        entries,
        false,
      );
    }
  }

  private removeProperty(
    property: ts.PropertyAssignment,
    path: JsonPath,
  ): void {
    const sf = this.sourceFile;
    const leading = ts.getLeadingCommentRanges(this.text, property.pos);
    if (leading?.length) {
      throw refuse(
        sf,
        leading[0].pos,
        `removing \`${formatPath(path)}\` would orphan the comment above it; remove it by hand`,
      );
    }
    this.cut(property, path, 'property');
  }

  /* ── Arrays ── */

  private diffArray(
    node: ts.ArrayLiteralExpression,
    before: Json[],
    after: Json[],
    path: JsonPath,
  ): void {
    const elements = node.elements;
    const n = before.length;
    const m = after.length;
    let head = 0;
    while (
      head < n &&
      head < m &&
      firstDifference(before[head], after[head]) === null
    ) {
      head++;
    }
    let tail = 0;
    while (
      tail < n - head &&
      tail < m - head &&
      firstDifference(before[n - 1 - tail], after[m - 1 - tail]) === null
    ) {
      tail++;
    }
    const oldCount = n - head - tail;
    const newCount = m - head - tail;
    const paired = Math.min(oldCount, newCount);
    for (let t = 0; t < paired; t++) {
      this.diff(elements[head + t], before[head + t], after[head + t], [
        ...path,
        head + t,
      ]);
    }
    for (let t = paired; t < oldCount; t++) {
      this.cut(elements[head + t], [...path, head + t], 'element');
    }
    if (newCount > paired) {
      const anchorIndex = head + paired - 1;
      const fresh = after.slice(head + paired, head + newCount);
      this.insertElements(node, anchorIndex, fresh);
    }
  }

  private diffRecords(
    node: ts.ArrayLiteralExpression,
    before: Json[],
    after: Json[],
    path: JsonPath,
    identity: string,
  ): void {
    const sf = this.sourceFile;
    const idOf = (value: Json, where: ts.Node, side: string): string => {
      const id = isObject(value) ? value[identity] : undefined;
      if (typeof id !== 'string' && typeof id !== 'number') {
        throw refuse(
          sf,
          where,
          `${side} element of \`${formatPath(path)}\` has no \`${identity}\``,
        );
      }
      return JSON.stringify(id);
    };
    const beforeIndex = new Map<string, number>();
    before.forEach((value, i) => {
      const id = idOf(value, node.elements[i], 'an existing');
      if (beforeIndex.has(id)) {
        throw refuse(
          sf,
          node.elements[i],
          `\`${identity}\` ${id} appears twice in ${formatPath(path)}`,
        );
      }
      beforeIndex.set(id, i);
    });

    const seen = new Set<string>();
    const matched = new Set<number>();
    // Additions grouped by the existing element they follow (-1: the start).
    const additions = new Map<number, Json[]>();
    let anchor = -1;
    after.forEach((value, j) => {
      const id = idOf(value, node, 'a new');
      if (seen.has(id)) {
        throw refuse(
          sf,
          node,
          `\`${identity}\` ${id} would appear twice in ${formatPath(path)}`,
        );
      }
      seen.add(id);
      const i = beforeIndex.get(id);
      if (i === undefined) {
        additions.set(anchor, [...(additions.get(anchor) ?? []), value]);
        return;
      }
      if (i < anchor) {
        throw refuse(
          sf,
          node.elements[i],
          `${formatPath(path)} was reordered (${identity} ${id} moved); reorder it by hand`,
        );
      }
      matched.add(i);
      anchor = i;
      this.diff(node.elements[i], before[i], value, [...path, j]);
    });
    before.forEach((_, i) => {
      if (!matched.has(i)) this.cut(node.elements[i], [...path, i], 'element');
    });
    for (const [anchorIndex, values] of additions) {
      this.insertElements(node, anchorIndex, values);
    }
  }

  /** Adds elements after `elements[anchorIndex]`, or at the start for -1. */
  private insertElements(
    node: ts.ArrayLiteralExpression,
    anchorIndex: number,
    values: Json[],
  ): void {
    const elements = node.elements;
    const anchor = anchorIndex >= 0 ? elements[anchorIndex] : null;
    // Style is copied from the neighbours: the element it follows (or the
    // first) is the template, and elements are separated by a blank line
    // when the array's are (the progression library's are).
    const sibling = anchor ?? elements[0];
    const entries = values.map((value) =>
      printValue(value, sibling, this.sourceFile),
    );
    this.insertAfter(node, anchor, entries, this.blankLineStyle(elements));
  }

  /**
   * Whether most gaps between elements hold a blank line. Gaps with a
   * comment are left out of the count: the blank line before a section
   * heading says nothing about how the elements are spaced.
   */
  private blankLineStyle(elements: ts.NodeArray<ts.Expression>): boolean {
    let blank = 0;
    let tight = 0;
    for (let i = 1; i < elements.length; i++) {
      const gap = this.text.slice(
        elements[i - 1].end,
        elements[i].getStart(this.sourceFile),
      );
      if (gap.includes('//') || gap.includes('/*')) continue;
      if (/\n[ \t]*\r?\n/.test(gap)) blank++;
      else tight++;
    }
    return blank > tight;
  }

  /* ── Splicing ── */

  /**
   * Inserts list members after `anchor`, or at the start of the list when
   * there is none. After a member followed by a comma (every multi-line
   * list, as prettier prints them), each goes on its own line after the
   * comma and any comment trailing it; after a last member without one,
   * each is joined with `, `.
   */
  private insertAfter(
    list: ts.ObjectLiteralExpression | ts.ArrayLiteralExpression,
    anchor: ts.Node | null,
    entries: string[],
    blank: boolean,
  ): void {
    // A list on one line stays on one line: prettier keeps an object broken
    // over lines if its source has a line break after the `{`, so a newline
    // inserted there would unfold `origin: { … }` for good.
    const inline = !isBroken(list, this.sourceFile);
    const gap = inline ? ' ' : blank ? '\n\n' : '\n';
    if (!anchor) {
      // At the start, a blank-line separator goes after each new member,
      // between it and the member that used to be first.
      const at = list.getStart(this.sourceFile) + 1;
      const text = entries
        .map((e) => (inline ? ` ${e},` : `\n${e},${blank ? '\n' : ''}`))
        .join('');
      this.splices.push({ start: at, end: at, text });
      return;
    }
    const comma = this.commaAfter(anchor);
    if (comma === null) {
      const text = entries.map((e) => `, ${e}`).join('');
      this.splices.push({ start: anchor.end, end: anchor.end, text });
      return;
    }
    const trailing = ts.getTrailingCommentRanges(this.text, comma);
    const last = trailing?.[trailing.length - 1];
    const at = last ? last.end : comma;
    // After a `//` comment only a new line ends it.
    const after =
      last?.kind === ts.SyntaxKind.SingleLineCommentTrivia && inline
        ? '\n'
        : gap;
    const text = entries.map((e) => `${after}${e},`).join('');
    this.splices.push({ start: at, end: at, text });
  }

  /** Where the comma after a list member ends, or null if the list closes. */
  private commaAfter(member: ts.Node): number | null {
    const scanner = ts.createScanner(
      ts.ScriptTarget.Latest,
      true,
      ts.LanguageVariant.Standard,
      this.text,
      undefined,
      member.end,
    );
    return scanner.scan() === ts.SyntaxKind.CommaToken
      ? scanner.getTokenEnd()
      : null;
  }

  /**
   * Cuts a property or element out with its comma and the whitespace after
   * it, starting at the member itself so a comment above stays. Refused if
   * the span holds a comment, or one trails the member on its line.
   */
  private cut(member: ts.Node, path: JsonPath, what: string): void {
    const sf = this.sourceFile;
    const start = member.getStart(sf);
    const comma = this.commaAfter(member);
    let end = comma ?? member.end;
    const trailing = ts.getTrailingCommentRanges(this.text, end);
    if (trailing?.length) {
      throw refuse(
        sf,
        trailing[0].pos,
        `removing the ${what} \`${formatPath(path)}\` would orphan the comment after it; remove it by hand`,
      );
    }
    this.refuseComments(
      start,
      end,
      `removing the ${what} \`${formatPath(path)}\``,
    );
    while (end < this.text.length && WHITESPACE.test(this.text[end])) end++;
    this.splices.push({ start, end, text: '' });
  }

  /** Replaces a node's text with a value's. */
  private replace(node: ts.Expression, value: Json, path: JsonPath): void {
    const start = node.getStart(this.sourceFile);
    this.refuseComments(start, node.end, `replacing \`${formatPath(path)}\``);
    this.splices.push({
      start,
      end: node.end,
      text: printValue(value, node, this.sourceFile),
    });
  }

  /** Throws if `text[start, end)` holds a comment. */
  private refuseComments(start: number, end: number, doing: string): void {
    const scanner = ts.createScanner(
      ts.ScriptTarget.Latest,
      false,
      ts.LanguageVariant.Standard,
      this.text,
      undefined,
      start,
      end - start,
    );
    for (
      let token = scanner.scan();
      token !== ts.SyntaxKind.EndOfFileToken;
      token = scanner.scan()
    ) {
      if (
        token === ts.SyntaxKind.SingleLineCommentTrivia ||
        token === ts.SyntaxKind.MultiLineCommentTrivia
      ) {
        throw refuse(
          this.sourceFile,
          scanner.getTokenStart(),
          `${doing} would delete the comment on this line; edit it by hand`,
        );
      }
    }
  }
}

/* ── Formatting ────────────────────────────────────────────────────── */

let repoOptions: Promise<Options> | undefined;

/**
 * The repo's prettier options (`.prettierrc`: single quotes, two spaces),
 * looked up from this module's own place in the repo. Not from the file
 * being written: a scratch copy of the data (`REPO_CONTENT_ROOT`) has no
 * `.prettierrc` above it, and prettier's defaults would requote every line.
 */
export function repoPrettierOptions(): Promise<Options> {
  repoOptions ??= resolveConfig(fileURLToPath(import.meta.url), {
    editorconfig: true,
  }).then((config) => ({ ...config, parser: 'typescript' }));
  return repoOptions;
}

const hashOf = (text: string) =>
  createHash('sha256').update(text).digest('hex');

/** Texts known to be prettier's own output, by hash, so each is checked once. */
const knownClean = new Set<string>();

/** Whether prettier would leave `text` as it is. */
export async function isPrettierClean(
  text: string,
  options?: Options,
  fileName = '(text)',
): Promise<boolean> {
  const hash = hashOf(text);
  if (knownClean.has(hash)) return true;
  const formatted = await formatTs(text, fileName, options);
  const clean = formatted === text;
  if (clean) remember(hash);
  return clean;
}

const remember = (hash: string) => {
  if (knownClean.size > 5000) knownClean.clear();
  knownClean.add(hash);
};

/**
 * Formats an edited file, having first checked the file as it was: design
 * C.3's "the writer checks that first and logs if a file was not clean".
 * A file that was not prettier-clean is reformatted everywhere by the write,
 * lines the edit never touched included, so whoever reads the diff is told
 * why it is bigger than the edit: `onUnclean` when given, a warning in the
 * log otherwise. Every writer of an existing TypeScript file formats through
 * this, `bundled.ts` included.
 */
export async function formatEdit(request: {
  /** The file as read. */
  before: string;
  /** The file with the edit's splices applied. */
  edited: string;
  fileName: string;
  prettier?: Options;
  onUnclean?: (fileName: string) => void;
}): Promise<{ text: string; wasClean: boolean }> {
  const { fileName } = request;
  const options = request.prettier ?? (await repoPrettierOptions());
  const wasClean = await isPrettierClean(request.before, options, fileName);
  if (!wasClean) {
    if (request.onUnclean) request.onUnclean(fileName);
    else {
      console.warn(
        `[repo-content] ${fileName} was not prettier-clean; this write reformats it`,
      );
    }
  }
  const text = await formatTs(request.edited, fileName, options);
  remember(hashOf(text));
  return { text, wasClean };
}

/** Formats TypeScript with the repo's prettier options. */
export async function formatTs(
  text: string,
  fileName: string,
  options?: Options,
): Promise<string> {
  const resolved = options ?? (await repoPrettierOptions());
  try {
    return await format(text, { ...resolved, parser: 'typescript' });
  } catch (error) {
    const loc = (
      error as { loc?: { start?: { line?: number; column?: number } } }
    ).loc?.start;
    throw new RepoUnwritableError(
      fileName,
      loc?.line ?? 1,
      loc?.column ?? 1,
      `prettier could not format the edited file: ${(error as Error).message.split('\n')[0]}`,
    );
  }
}

/* ── The round trip ────────────────────────────────────────────────── */

/**
 * The deepest node of a literal along `path`, for pointing a message at
 * the line a value is on.
 */
export function nodeAtPath(
  literal: ts.Expression,
  path: JsonPath,
  sourceFile: ts.SourceFile,
): ts.Node {
  let node: ts.Expression = unwrapExpression(literal);
  for (const part of path) {
    if (ts.isArrayLiteralExpression(node) && typeof part === 'number') {
      const element = node.elements[part];
      if (!element) break;
      node = unwrapExpression(element);
    } else if (ts.isObjectLiteralExpression(node)) {
      const property = propertyNode(node, String(part), sourceFile);
      if (!property) break;
      node = unwrapExpression(property.initializer);
    } else {
      break;
    }
  }
  return node;
}

/**
 * The store's last check before a write (design A.4, step 4): parse the
 * new text, find the declaration, evaluate it, and require it to equal the
 * intended value exactly. Throws `REPO_UNWRITABLE` naming the first value
 * that came out different, and the line it is on; returns the read-back
 * declaration otherwise.
 */
export function verifyRoundTrip(
  text: string,
  fileName: string,
  locator: DeclarationLocator,
  expected: unknown,
): ReadDeclaration {
  const read = readDeclaration(text, fileName, locator);
  const want = newJson(expected, fileName, read);
  const differs = firstDifference(read.value, want);
  if (differs !== null) {
    const node = nodeAtPath(read.literal, differs, read.sourceFile);
    throw refuse(
      read.sourceFile,
      node,
      `the written file does not read back as intended at \`${formatPath(differs)}\`; nothing was written`,
    );
  }
  return read;
}

/**
 * A value about to be written, as JSON (`strictJson`), or a refusal saying
 * what in it JSON cannot hold. The refusal points at the line of `read`
 * that holds that part of the value now, or at the declaration when the
 * file does not have it yet; with no file, at the top. `what` says whose
 * value it is, for a record among many.
 */
function newJson(
  value: unknown,
  fileName: string,
  read?: ReadDeclaration,
  what?: string,
): Json {
  try {
    return strictJson(value);
  } catch (error) {
    if (!(error instanceof NotJsonError)) throw error;
    const reason = `the new value cannot be written: ${what ? `${what}: ` : ''}${error.message}`;
    if (!read) throw new RepoUnwritableError(fileName, 1, 1, reason);
    const node = what
      ? read.literal
      : nodeAtPath(read.literal, error.path, read.sourceFile);
    throw refuse(read.sourceFile, node, reason);
  }
}

/* ── Writing ───────────────────────────────────────────────────────── */

/** A new value for a file's whole declaration. */
export interface TsDeclarationWrite {
  /** The file's text as read (and hash-checked) by the store. */
  text: string;
  /** For messages; repo-relative where it can be. */
  fileName: string;
  locator: DeclarationLocator;
  rules?: WriteRules;
  /**
   * The declaration's new value. `undefined` properties are dropped, as JSON
   * drops them; anything else JSON would change is refused (`strictJson`).
   */
  next: unknown;
  /** Prettier options; the repo's `.prettierrc` by default. */
  prettier?: Options;
  /**
   * Format and round-trip even when nothing changed. The corpus test uses
   * it to prove a no-op write is byte-identical; the store has no need to.
   */
  force?: boolean;
  /** Told when the file was not prettier-clean before the edit. */
  onUnclean?: (fileName: string) => void;
}

export interface TsWriteResult {
  /** The new text; the same string when nothing changed. */
  text: string;
  changed: boolean;
  /** How many splices the edit took. */
  splices: number;
  /** Whether the file was prettier-clean before; null when nothing was formatted. */
  wasClean: boolean | null;
}

async function writeRead(
  read: ReadDeclaration,
  request: Omit<TsDeclarationWrite, 'next'>,
  next: Json,
): Promise<TsWriteResult> {
  const { text, fileName, locator } = request;
  const planner = new SplicePlanner(read.sourceFile, request.rules);
  planner.diff(read.literal, read.value, next, []);
  if (planner.splices.length === 0 && !request.force) {
    return { text, changed: false, splices: 0, wasClean: null };
  }
  const { text: formatted, wasClean } = await formatEdit({
    before: text,
    edited: applySplices(text, planner.splices),
    fileName,
    prettier: request.prettier,
    onUnclean: request.onUnclean,
  });
  verifyRoundTrip(formatted, fileName, locator, next);
  return {
    text: formatted,
    changed: formatted !== text,
    splices: planner.splices.length,
    wasClean,
  };
}

/**
 * Writes a new value for a file's whole declaration: a song, or a whole
 * record array. Returns the new text; the caller writes it to disk.
 */
export async function writeTsDeclaration(
  request: TsDeclarationWrite,
): Promise<TsWriteResult> {
  const read = readDeclaration(request.text, request.fileName, request.locator);
  return writeRead(
    read,
    request,
    newJson(request.next, request.fileName, read),
  );
}

/** Changes to some records of a record array, by identity. */
export interface TsElementsWrite extends Omit<TsDeclarationWrite, 'next'> {
  /** The field that identifies an element: `id`, or `slug` for the registry. */
  identity: string;
  /** Records to write: replacing the element with the same identity, or appended. */
  upsert?: readonly unknown[];
  /** Identities of the elements to delete. */
  remove?: readonly (string | number)[];
}

/**
 * Writes some records of a record array (an events file, the cities, the
 * registry, the library), leaving the rest as they are. What the store's
 * flush does with the items a request touched.
 */
export async function writeTsElements(
  request: TsElementsWrite,
): Promise<TsWriteResult> {
  const { identity } = request;
  const read = readDeclaration(request.text, request.fileName, request.locator);
  if (!Array.isArray(read.value)) {
    throw refuse(
      read.sourceFile,
      read.literal,
      'the declaration is not an array',
    );
  }
  const idOf = (value: Json) =>
    isObject(value) ? JSON.stringify(value[identity] ?? null) : 'null';
  const next = [...read.value];
  for (const id of request.remove ?? []) {
    const i = next.findIndex((value) => idOf(value) === JSON.stringify(id));
    if (i < 0) {
      throw refuse(
        read.sourceFile,
        read.literal,
        `there is no element with ${identity} ${JSON.stringify(id)} to delete`,
      );
    }
    next.splice(i, 1);
  }
  for (const [n, record] of (request.upsert ?? []).entries()) {
    const value = newJson(
      record,
      request.fileName,
      read,
      `record ${n + 1} to write${
        isObject(record as Json) &&
        (record as JsonObject)[identity] !== undefined
          ? ` (${identity} ${JSON.stringify((record as JsonObject)[identity])})`
          : ''
      }`,
    );
    const i = next.findIndex((existing) => idOf(existing) === idOf(value));
    if (i >= 0) next[i] = value;
    else next.push(value);
  }
  const rules = request.rules ?? {};
  return writeRead(
    read,
    {
      ...request,
      rules: {
        ...rules,
        identity: (path) =>
          path.length === 0 ? identity : rules.identity?.(path),
      },
    },
    next,
  );
}

/* ── New files ─────────────────────────────────────────────────────── */

/**
 * The identifier a new song file exports its song as: the id, or `_<id>`
 * when the id starts with a digit (`_1999`, as the existing files do) or is
 * a name a module cannot declare (`RESERVED_BINDING_NAMES`: a song called
 * "Static" or "True" exports `_static` or `_true`). The file is still
 * `<id>.ts` and the `BUNDLED_SONGS` key still the id; only the imported name
 * changes. Song ids never start with `_` (those names are the importer's
 * files), so the prefixed name cannot be another song's.
 */
export function songIdentifier(id: string): string {
  const safe = id.replace(/[^\w$]/g, '_');
  return /^\d/.test(safe) || RESERVED_BINDING_NAMES.has(safe)
    ? `_${safe}`
    : safe;
}

/** Keys first in `order`, then the rest in their own order. */
export function orderKeys(value: Json, order: readonly string[]): Json {
  if (!isObject(value)) return value;
  const known = order.filter((key) => has(value, key));
  const rest = Object.keys(value).filter((key) => !order.includes(key));
  return Object.fromEntries(
    [...known, ...rest].map((key) => [key, value[key]]),
  ) as JsonObject;
}

/**
 * The text of a new data file holding one declaration, formatted and read
 * back: for a new song, the `import type { Song }` line as `header`, then
 * `export const <songIdentifier(id)>: Song = {…};` with its keys in
 * `SONG_KEY_ORDER`.
 */
export async function newDeclarationFile(request: {
  fileName: string;
  /** Lines before the declaration, such as the type import. */
  header: string;
  name: string;
  type: string;
  value: unknown;
  locator: DeclarationLocator;
  /** Top-level key order for an object value. */
  keyOrder?: readonly string[];
  prettier?: Options;
}): Promise<string> {
  if (!isBindingName(request.name)) {
    throw new RepoUnwritableError(
      request.fileName,
      1,
      1,
      `\`${request.name}\` cannot name a declaration in a module: it is a reserved word or not an identifier`,
    );
  }
  const value = newJson(request.value, request.fileName);
  const ordered = request.keyOrder ? orderKeys(value, request.keyOrder) : value;
  const source = `${request.header.trimEnd()}\n\nexport const ${request.name}: ${request.type} = ${printValue(ordered)};\n`;
  const formatted = await formatTs(source, request.fileName, request.prettier);
  verifyRoundTrip(formatted, request.fileName, request.locator, value);
  return formatted;
}
