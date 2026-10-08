import type { EntityKind, NodeStatus } from '@/content/graph/types';
import type { NodeFacets } from './facets';
import { normalizeText, textKey } from './text';

/**
 * The graph's query language: what a colour group or the "Search items…"
 * box is written in. It follows Obsidian's search, so it reads the way the
 * owner already writes it there.
 *
 * - Words side by side must all match: `kind:song genre:rock`.
 * - `OR` (in capitals) matches either side: `kind:artist OR kind:event`.
 *   `AND` in capitals is accepted too, and means the same as a space.
 * - A leading `-` leaves things out: `kind:song -genre:rock`.
 * - Quotes keep words together: `"rolling stones"`, `genre:"hip hop"`.
 * - Parentheses group: `kind:song (genre:soul OR genre:funk)`.
 *
 * Fields:
 * - `kind:` takes a kind's id, its name or the plural (`kind:song`,
 *   `kind:songs`, `kind:"globe event"`); `kind:records` is the release kind.
 * - `genre:` matches what is filed under a genre or one of its subgenres,
 *   and the genre itself.
 * - `place:` matches a place and what is based, born, recorded or took place
 *   in it; a region matches its cities and what is in them.
 * - `year:1982`, or a range `year:1960..1969` (either end may be left open).
 *   Years are written in full; `year:82` is an error that suggests 1982.
 * - `decade:1980s` (or `80s`: 00s and 10s are this century, 20s to 90s the
 *   last), `era:postwar`, `status:draft`.
 * - `id:artist:toto` matches one id exactly; a trailing `*` matches the
 *   start (`id:place:region-*`). An id typed on its own (`artist:toto`) does
 *   the same.
 * - `name:` (or `label:`) matches part of the name only.
 * - `is:tag`, `is:missing`, `is:orphan`, `is:curriculum`.
 *
 * Any other text matches part of the name or the id, ignoring accents and
 * case. A field the language does not know is searched as text and comes
 * back with a hint saying so. A mistake that stops the query from being
 * read (a quote never closed, an `OR` with nothing after it) comes back as
 * an error with its position, so the box can mark the spot.
 *
 * Matching runs over the precomputed facets (`facets.ts`). Whether a node is
 * an orphan depends on the map's filters, so the caller passes it in.
 *
 * The module is pure: no React, no DOM, no content store.
 */

/** What `is:` can ask. */
export type IsWhat = 'tag' | 'missing' | 'orphan' | 'curriculum';

/** A parsed query. Values are already normalised for matching. */
export type QueryNode =
  | { readonly type: 'and'; readonly items: readonly QueryNode[] }
  | { readonly type: 'or'; readonly items: readonly QueryNode[] }
  | { readonly type: 'not'; readonly item: QueryNode }
  /** Part of the name or the id. */
  | { readonly type: 'text'; readonly value: string }
  /** Part of the name. */
  | { readonly type: 'name'; readonly value: string }
  /** The whole id, or its start when `prefix`; or the whole slug. */
  | { readonly type: 'id'; readonly value: string; readonly prefix: boolean }
  | { readonly type: 'kind'; readonly kind: EntityKind }
  | { readonly type: 'genre'; readonly key: string }
  | { readonly type: 'place'; readonly key: string }
  | { readonly type: 'era'; readonly key: string }
  /** Both ends included; an open end is infinite. */
  | { readonly type: 'year'; readonly from: number; readonly to: number }
  /** The decade's first year: 1980 for the 1980s. */
  | { readonly type: 'decade'; readonly decade: number }
  | { readonly type: 'status'; readonly status: NodeStatus }
  | { readonly type: 'is'; readonly what: IsWhat };

/** An error or a hint, with the characters it is about (end exclusive). */
export interface QueryProblem {
  readonly message: string;
  readonly start: number;
  readonly end: number;
}

/** The result of reading a query: the tree, or the first error. */
export type ParsedQuery =
  | {
      readonly ok: true;
      /** Null when the query is blank. */
      readonly query: QueryNode | null;
      readonly hints: readonly QueryProblem[];
    }
  | {
      readonly ok: false;
      readonly error: QueryProblem;
      readonly hints: readonly QueryProblem[];
    };

/** Whether a node matches, given its facets and whether it is an orphan. */
export type NodePredicate = (facets: NodeFacets, orphan: boolean) => boolean;

/** The fields, in the order hints list them. `label` is another name for `name`. */
export const QUERY_FIELDS = [
  'kind',
  'genre',
  'place',
  'year',
  'decade',
  'era',
  'status',
  'id',
  'name',
  'label',
  'is',
] as const;

type Field = (typeof QUERY_FIELDS)[number];

const FIELD_SET: ReadonlySet<string> = new Set<string>(QUERY_FIELDS);

const FIELD_LIST =
  'kind:, genre:, place:, year:, decade:, era:, status:, id:, name: or is:';

/**
 * What each kind may be called in `kind:`, besides its id and the id with
 * an "s". The names are the console's (a release is a "Record"). The Record
 * type makes a new kind fail to compile until it is named here.
 */
const KIND_NAMES: Record<EntityKind, readonly string[]> = {
  song: ['Song', 'Songs'],
  artist: ['Artist', 'Artists'],
  progression: ['Progression', 'Progressions'],
  genre: ['Genre', 'Genres'],
  subgenre: ['Subgenre', 'Subgenres'],
  vibe: ['Vibe', 'Vibes'],
  instrument: ['Instrument', 'Instruments'],
  label: ['Label', 'Labels'],
  studio: ['Studio', 'Studios'],
  place: ['Place', 'Places'],
  era: ['Era', 'Eras'],
  scene: ['Scene', 'Scenes'],
  event: ['Globe event', 'Globe events', 'Event', 'Events'],
  key: ['Key', 'Keys'],
  mode: ['Mode', 'Modes'],
  release: ['Record', 'Records', 'Release', 'Releases'],
  teach_day: ['Teach day', 'Teach days'],
  pathway: ['Pathway', 'Pathways'],
  year: ['Year', 'Years'],
  decade: ['Decade', 'Decades'],
  groove: ['Groove', 'Grooves', 'Drum groove', 'Drum grooves'],
  part: ['Part', 'Parts'],
  feel: ['Feel', 'Feels'],
  patch: ['Synth patch', 'Synth patches', 'Patch', 'Patches'],
  kit: ['Drum kit', 'Drum kits', 'Kit', 'Kits'],
  lesson: ['Lesson', 'Lessons'],
};

const hasOwn = (o: object, key: string) =>
  Object.prototype.hasOwnProperty.call(o, key);

const KIND_BY_KEY: ReadonlyMap<string, EntityKind> = (() => {
  const byKey = new Map<string, EntityKind>();
  for (const kind of Object.keys(KIND_NAMES) as EntityKind[]) {
    for (const name of [kind, `${kind}s`, ...KIND_NAMES[kind]]) {
      byKey.set(textKey(name), kind);
    }
  }
  return byKey;
})();

const STATUSES: ReadonlyMap<string, NodeStatus> = new Map<string, NodeStatus>([
  ['published', 'published'],
  ['draft', 'draft'],
  ['pending', 'pending'],
  ['code', 'code'],
  ['missing', 'missing'],
]);

const IS_VALUES: ReadonlyMap<string, IsWhat> = new Map<string, IsWhat>([
  ['tag', 'tag'],
  ['tags', 'tag'],
  ['missing', 'missing'],
  // Obsidian's word for a link to a note that does not exist.
  ['unresolved', 'missing'],
  ['orphan', 'orphan'],
  ['orphans', 'orphan'],
  ['curriculum', 'curriculum'],
]);

/* ── Reading ─────────────────────────────────────────────────────────── */

type Token =
  | {
      readonly t: '(' | ')' | 'OR' | 'AND' | '-';
      readonly start: number;
      readonly end: number;
    }
  | {
      readonly t: 'term';
      /** Lower case; null for plain text. */
      readonly field: string | null;
      readonly value: string;
      readonly quoted: boolean;
      readonly start: number;
      readonly end: number;
      /** Where the value starts, after the field's colon. */
      readonly valueStart: number;
    };

type TermToken = Extract<Token, { t: 'term' }>;

/** Thrown inside the reader and turned into `{ ok: false }` at the top. */
class QueryError extends Error {
  constructor(readonly problem: QueryProblem) {
    super(problem.message);
  }
}

function fail(message: string, start: number, end: number): never {
  throw new QueryError({ message, start, end });
}

const isSpace = (c: string) => /\s/.test(c);

/** Characters that end a bare word. */
const WORD_BREAKS: ReadonlySet<string> = new Set(['(', ')', '"']);

/** A field name: letters and underscores (`teach_day` is an id's kind). */
const FIELD_NAME = /^[a-z_]+$/i;

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  const n = text.length;
  const readQuoted = (open: number) => {
    const close = text.indexOf('"', open + 1);
    if (close < 0) fail('This quote is never closed.', open, n);
    return { value: text.slice(open + 1, close), end: close + 1 };
  };
  let i = 0;
  while (i < n) {
    const c = text[i];
    if (isSpace(c)) {
      i++;
    } else if (c === '(' || c === ')') {
      tokens.push({ t: c, start: i, end: i + 1 });
      i++;
    } else if (c === '-') {
      const next = text[i + 1];
      if (next === undefined || isSpace(next) || next === ')') {
        fail('Put what to leave out right after "-".', i, i + 1);
      }
      tokens.push({ t: '-', start: i, end: i + 1 });
      i++;
    } else if (c === '"') {
      const { value, end } = readQuoted(i);
      tokens.push({
        t: 'term',
        field: null,
        value,
        quoted: true,
        start: i,
        end,
        valueStart: i,
      });
      i = end;
    } else {
      let j = i;
      while (j < n && !isSpace(text[j]) && !WORD_BREAKS.has(text[j])) j++;
      const word = text.slice(i, j);
      const colon = word.indexOf(':');
      const field = colon > 0 ? word.slice(0, colon) : '';
      if (word === 'OR' || word === 'AND') {
        tokens.push({ t: word, start: i, end: j });
      } else if (field && FIELD_NAME.test(field)) {
        // `genre:"hip hop"`: the value is the quoted text right after.
        const quoted = colon === word.length - 1 && text[j] === '"';
        const { value, end } = quoted
          ? readQuoted(j)
          : { value: word.slice(colon + 1), end: j };
        tokens.push({
          t: 'term',
          field: field.toLowerCase(),
          value,
          quoted,
          start: i,
          end,
          valueStart: i + colon + 1,
        });
        j = end;
      } else {
        tokens.push({
          t: 'term',
          field: null,
          value: word,
          quoted: false,
          start: i,
          end: j,
          valueStart: i,
        });
      }
      i = j;
    }
  }
  return tokens;
}

/** Nothing usable comes next: the end, a closing parenthesis or a keyword. */
const endsOperand = (tok: Token | undefined) =>
  !tok || tok.t === ')' || tok.t === 'OR' || tok.t === 'AND';

/**
 * `1982` → [1982, 1982]; `1960..1969`, `1990..` and `..1950` are ranges.
 * Years are written in full (three or four digits: the Atlas starts in 590),
 * so `year:82` is not read as the year 82; `shortYearHint` suggests 1982.
 */
function yearRange(value: string): [number, number] | null {
  const v = value.trim();
  if (/^\d{3,4}$/.test(v)) return [Number(v), Number(v)];
  const range = /^(\d{3,4})?\.\.(\d{3,4})?$/.exec(v);
  if (!range || (!range[1] && !range[2])) return null;
  const from = range[1] ? Number(range[1]) : Number.NEGATIVE_INFINITY;
  const to = range[2] ? Number(range[2]) : Number.POSITIVE_INFINITY;
  return from <= to ? [from, to] : [to, from];
}

/**
 * A year written short → in full: 00 to 19 are this century and 20 to 99
 * the last, so `82` is 1982, `20` is 1920 and `05` is 2005.
 */
const fullYear = (short: number): number => (short < 20 ? 2000 : 1900) + short;

/**
 * What a `year:` value with a year written short (`82`, `60..69`) most
 * likely meant (`1982`, `1960..1969`), or null when it is not that.
 */
function shortYearHint(value: string): string | null {
  const parts = /^(\d{1,4})?(\.\.)?(\d{1,4})?$/.exec(value.trim());
  if (!parts || (!parts[1] && !parts[3])) return null;
  const ends = [parts[1], parts[3]];
  if (!ends.some((end) => end !== undefined && end.length <= 2)) return null;
  const [from, to] = ends.map((end) =>
    end === undefined
      ? ''
      : end.length <= 2
        ? String(fullYear(Number(end)))
        : end,
  );
  return parts[2] ? `${from}..${to}` : from;
}

/** A recursive-descent reader over the tokens. */
class Reader {
  private pos = 0;
  readonly hints: QueryProblem[] = [];

  constructor(private readonly tokens: readonly Token[]) {}

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  read(): QueryNode | null {
    if (!this.tokens.length) return null;
    const node = this.or();
    const left = this.peek();
    if (left) fail('This ")" has no "(" to close.', left.start, left.end);
    return node;
  }

  /** orExpr := andExpr ( OR andExpr )* */
  private or(): QueryNode {
    const items = [this.and()];
    for (let tok = this.peek(); tok?.t === 'OR'; tok = this.peek()) {
      this.pos++;
      if (endsOperand(this.peek())) {
        fail('"OR" needs something after it.', tok.start, tok.end);
      }
      items.push(this.and());
    }
    return items.length === 1 ? items[0] : { type: 'or', items };
  }

  /** andExpr := unary ( AND? unary )* */
  private and(): QueryNode {
    const items: QueryNode[] = [];
    for (let tok = this.peek(); !endsOperand(tok) || tok?.t === 'AND'; ) {
      if (tok?.t === 'AND') {
        this.pos++;
        if (!items.length) {
          fail('"AND" needs something before it.', tok.start, tok.end);
        }
        if (endsOperand(this.peek())) {
          fail('"AND" needs something after it.', tok.start, tok.end);
        }
      } else {
        items.push(this.unary());
      }
      tok = this.peek();
    }
    if (!items.length) {
      const tok = this.peek();
      if (tok?.t === 'OR') {
        fail('"OR" needs something before it.', tok.start, tok.end);
      }
      // Only a ")" at the very start can get here: a group or an operator
      // has already checked that something follows it.
      if (tok) fail('This ")" has no "(" to close.', tok.start, tok.end);
      fail('There is nothing to search for.', 0, 0);
    }
    return items.length === 1 ? items[0] : { type: 'and', items };
  }

  /** unary := "-" unary | primary */
  private unary(): QueryNode {
    const tok = this.tokens[this.pos++];
    if (tok.t === '-') {
      if (endsOperand(this.peek())) {
        fail('Put what to leave out right after "-".', tok.start, tok.end);
      }
      return { type: 'not', item: this.unary() };
    }
    if (tok.t === '(') {
      const first = this.peek();
      if (!first) fail('This "(" is never closed.', tok.start, tok.end);
      if (first.t === ')') {
        fail('These parentheses are empty.', tok.start, first.end);
      }
      const node = this.or();
      if (this.peek()?.t !== ')') {
        fail('This "(" is never closed.', tok.start, tok.end);
      }
      this.pos++;
      return node;
    }
    if (tok.t === 'term') return this.term(tok);
    // `and` and `or` stop before these, so this is a reader bug.
    return fail(`"${tok.t}" is out of place here.`, tok.start, tok.end);
  }

  private term(tok: TermToken): QueryNode {
    const { field, value } = tok;
    if (field === null) {
      const text = normalizeText(value);
      if (!text && tok.quoted) {
        fail('These quotes are empty.', tok.start, tok.end);
      }
      return { type: 'text', value: text };
    }
    if (FIELD_SET.has(field)) return this.field(field as Field, tok);
    if (hasOwn(KIND_NAMES, field)) {
      // An id typed whole: `artist:toto`, `subgenre:art-rock`.
      return idNode(`${field}:${value}`);
    }
    this.hints.push({
      message: `There is no "${field}:" field, so this is searched as text. The fields are ${FIELD_LIST}.`,
      start: tok.start,
      end: tok.valueStart,
    });
    return { type: 'text', value: normalizeText(`${field}:${value}`) };
  }

  private field(field: Field, tok: TermToken): QueryNode {
    const { value, valueStart, end } = tok;
    if (!value.trim()) {
      fail(`"${field}:" needs a value after it.`, tok.start, end);
    }
    const bad = (message: string): never => fail(message, valueStart, end);
    switch (field) {
      case 'kind': {
        const kind = KIND_BY_KEY.get(textKey(value));
        return kind
          ? { type: 'kind', kind }
          : bad(
              `There is no kind "${value}". Try song, artist, event, place, record, label, studio or progression.`,
            );
      }
      case 'genre':
      case 'place':
      case 'era': {
        const key = textKey(value);
        return key
          ? { type: field, key }
          : bad(`"${field}:" needs a name with letters or digits.`);
      }
      case 'year': {
        const range = yearRange(value);
        if (range) return { type: 'year', from: range[0], to: range[1] };
        const meant = shortYearHint(value);
        return bad(
          meant
            ? `"year:" takes the year in full. Did you mean year:${meant}?`
            : '"year:" takes a year such as 1982, or a range such as 1960..1969.',
        );
      }
      case 'decade': {
        // 1980s, 1980 or 1985; and the short forms 80s, '80s and 80.
        const match = /^['\u2019]?(\d{2,4})s?$/.exec(
          value.trim().toLowerCase(),
        );
        if (!match) return bad('"decade:" takes a decade such as 1980s.');
        const digits = match[1];
        const year = Number(digits);
        const decade = year - (year % 10);
        return {
          type: 'decade',
          decade: digits.length === 2 ? fullYear(decade) : decade,
        };
      }
      case 'status': {
        const status = STATUSES.get(value.trim().toLowerCase());
        return status
          ? { type: 'status', status }
          : bad(
              '"status:" is one of published, draft, pending, code or missing.',
            );
      }
      case 'id':
        return idNode(value);
      case 'name':
      case 'label':
        return { type: 'name', value: normalizeText(value) };
      case 'is': {
        const what = IS_VALUES.get(value.trim().toLowerCase());
        return what
          ? { type: 'is', what }
          : bad('"is:" is one of tag, missing, orphan or curriculum.');
      }
    }
  }
}

function idNode(raw: string): QueryNode {
  const value = raw.trim().toLowerCase();
  return value.endsWith('*')
    ? { type: 'id', value: value.slice(0, -1), prefix: true }
    : { type: 'id', value, prefix: false };
}

/** Read a query. A blank query reads as `{ ok: true, query: null }`. */
export function parseQuery(text: string): ParsedQuery {
  let reader: Reader | null = null;
  try {
    reader = new Reader(tokenize(text));
    return { ok: true, query: reader.read(), hints: reader.hints };
  } catch (e) {
    if (e instanceof QueryError) {
      return { ok: false, error: e.problem, hints: reader?.hints ?? [] };
    }
    throw e;
  }
}

/* ── Matching ────────────────────────────────────────────────────────── */

const IS_TESTS: Record<IsWhat, NodePredicate> = {
  tag: (f) => f.tag,
  missing: (f) => f.status === 'missing',
  orphan: (_f, orphan) => orphan,
  curriculum: (f) => f.curriculum,
};

/** Turn a parsed query into a test over facets. */
export function compileQuery(node: QueryNode): NodePredicate {
  switch (node.type) {
    case 'and': {
      const parts = node.items.map(compileQuery);
      return (f, orphan) => parts.every((part) => part(f, orphan));
    }
    case 'or': {
      const parts = node.items.map(compileQuery);
      return (f, orphan) => parts.some((part) => part(f, orphan));
    }
    case 'not': {
      const part = compileQuery(node.item);
      return (f, orphan) => !part(f, orphan);
    }
    case 'text': {
      const { value } = node;
      return (f) => f.name.includes(value) || f.idKey.includes(value);
    }
    case 'name': {
      const { value } = node;
      return (f) => f.name.includes(value);
    }
    case 'id': {
      const { value, prefix } = node;
      return prefix
        ? (f) => f.idKey.startsWith(value) || f.slugKey.startsWith(value)
        : (f) => f.idKey === value || f.slugKey === value;
    }
    case 'kind': {
      const { kind } = node;
      return (f) => f.kind === kind;
    }
    case 'genre': {
      const { key } = node;
      return (f) => f.genres.has(key);
    }
    case 'place': {
      const { key } = node;
      return (f) => f.places.has(key);
    }
    case 'era': {
      const { key } = node;
      return (f) => f.eras.has(key);
    }
    case 'year': {
      const { from, to } = node;
      return (f) => f.years.some((y) => y >= from && y <= to);
    }
    case 'decade': {
      const { decade } = node;
      return (f) => f.decades.has(decade);
    }
    case 'status': {
      const { status } = node;
      return (f) => f.status === status;
    }
    case 'is':
      return IS_TESTS[node.what];
  }
}

/** A query read and compiled in one go, for the colour groups and search. */
export interface CompiledQuery {
  /** The test, or null when the query is blank or has an error. */
  readonly match: NodePredicate | null;
  /** The query is blank. */
  readonly empty: boolean;
  readonly error: QueryProblem | null;
  readonly hints: readonly QueryProblem[];
}

export function compileQueryText(text: string): CompiledQuery {
  const parsed = parseQuery(text);
  if (!parsed.ok) {
    return {
      match: null,
      empty: false,
      error: parsed.error,
      hints: parsed.hints,
    };
  }
  return {
    match: parsed.query ? compileQuery(parsed.query) : null,
    empty: parsed.query === null,
    error: null,
    hints: parsed.hints,
  };
}
