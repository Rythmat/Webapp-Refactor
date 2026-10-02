import ts from 'typescript';

/**
 * Reading the repo's TypeScript data files as data.
 *
 * Repo mode keeps songs, globe events, cities, the artist registry and the
 * chord progression library where they already live: in `.ts` files the app
 * imports. To edit them, the store has to know what each file holds without
 * running it, and it has to know which piece of text holds which value, so
 * that a save can change exactly that text and nothing else (`tsWrite.ts`).
 *
 * So this evaluates the declaration's initializer the way JSON would see it.
 * It accepts what a data file is made of: objects, arrays, strings, numbers
 * (and a minus sign in front of one), `true`, `false`, `null`, templates with
 * no substitutions, and the `as`, `satisfies` and parentheses TypeScript lets
 * a literal wear, which it looks through. Anything that would need the
 * program to run to know its value is refused, naming the file and line: a
 * spread, a shorthand property, an identifier, a call. A refused file cannot
 * be edited from the console; it has to be edited by hand.
 *
 * `undefined` is the one identifier it understands, and only as a property's
 * value. Such a property is dropped, as the mock's `plain()` drops it when it
 * round-trips the modules through JSON, so the values here equal what the app
 * sees. Its node is remembered, because 71 songs say `year: undefined`, and a
 * save that sets the year must write it in that place rather than add a
 * second `year`.
 *
 * Pure: text in, values out. No file system, nothing from Vite, so the repo
 * store and the bulk import (`npx tsx`) share it.
 */

/** A JSON value: what a data file holds, and what a content body is. */
export type Json = null | boolean | number | string | Json[] | JsonObject;
export interface JsonObject {
  [key: string]: Json;
}

/** Keys and indexes from the declaration's value down to one value inside it. */
export type JsonPath = (string | number)[];

/**
 * A file the store cannot read or write as data, with where and why.
 *
 * The HTTP layer answers it as a 422 `REPO_UNWRITABLE`, so an edit that would
 * need a person (a comment in the way, a spread, a reordering) reaches the
 * console as a refusal naming the line to go and edit by hand.
 */
export class RepoUnwritableError extends Error {
  readonly code = 'REPO_UNWRITABLE';
  readonly status = 422;
  constructor(
    /** The file as the caller named it, repo-relative where it can be. */
    readonly file: string,
    /** 1-based. */
    readonly line: number,
    /** 1-based. */
    readonly column: number,
    /** What is wrong, in a sentence a person can act on. */
    readonly reason: string,
  ) {
    super(`${file}:${line}:${column}: ${reason}`);
    this.name = 'RepoUnwritableError';
  }
}

/** Where a node starts, 1-based, as an editor shows it. */
export function positionOf(
  sourceFile: ts.SourceFile,
  pos: number,
): { line: number; column: number } {
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(pos);
  return { line: line + 1, column: character + 1 };
}

/** A refusal pointing at `node`. */
export function refuse(
  sourceFile: ts.SourceFile,
  node: ts.Node | number,
  reason: string,
): RepoUnwritableError {
  const pos = typeof node === 'number' ? node : node.getStart(sourceFile);
  const { line, column } = positionOf(sourceFile, pos);
  return new RepoUnwritableError(sourceFile.fileName, line, column, reason);
}

/**
 * Parses a data file, refusing one with a syntax error.
 *
 * `createSourceFile` never throws: it recovers, inventing the missing comma
 * or brace, and an evaluator walking the recovered tree would read values
 * the file does not hold. The parser keeps what it recovered from in
 * `parseDiagnostics`, which is not in the public typings but has been on
 * every source file since TypeScript 1.x.
 */
export function parseTs(text: string, fileName: string): ts.SourceFile {
  const sourceFile = ts.createSourceFile(
    fileName,
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const diagnostics = (
    sourceFile as unknown as { parseDiagnostics?: readonly ts.Diagnostic[] }
  ).parseDiagnostics;
  const first = diagnostics?.[0];
  if (first) {
    throw refuse(
      sourceFile,
      first.start ?? 0,
      `syntax error: ${ts.flattenDiagnosticMessageText(first.messageText, ' ')}`,
    );
  }
  return sourceFile;
}

/**
 * The names a module cannot declare: ECMAScript's reserved words, the ones
 * strict mode adds (every module is strict), `await` (reserved at the top of
 * a module), and `eval` and `arguments`, which strict code cannot bind.
 *
 * TypeScript's parser accepts some of these as a `const`'s name (`export
 * const static: Song`) and leaves the complaint to its binder, which
 * `parseTs` never runs; prettier formats them happily. So a check that
 * only parsed would pass a song file that `tsc` and Vite then refuse. The
 * other keywords TypeScript knows (`type`, `of`, `get`, `from`…) are
 * contextual and make good names, and are not here.
 */
export const RESERVED_BINDING_NAMES: ReadonlySet<string> = new Set([
  // Reserved everywhere.
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'debugger',
  'default',
  'delete',
  'do',
  'else',
  'enum',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'function',
  'if',
  'import',
  'in',
  'instanceof',
  'new',
  'null',
  'return',
  'super',
  'switch',
  'this',
  'throw',
  'true',
  'try',
  'typeof',
  'var',
  'void',
  'while',
  'with',
  // Reserved in strict code, which a module is.
  'implements',
  'interface',
  'let',
  'package',
  'private',
  'protected',
  'public',
  'static',
  'yield',
  // Reserved at the top of a module.
  'await',
  // Not reserved, but strict code cannot bind them.
  'eval',
  'arguments',
]);

/** Whether `name` can name a `const`, or an import, in a module. */
export function isBindingName(name: string): boolean {
  if (name === '' || RESERVED_BINDING_NAMES.has(name)) return false;
  let first = true;
  for (const char of name) {
    const code = char.codePointAt(0)!;
    const ok = first
      ? ts.isIdentifierStart(code, ts.ScriptTarget.Latest)
      : ts.isIdentifierPart(code, ts.ScriptTarget.Latest);
    if (!ok) return false;
    first = false;
  }
  return true;
}

/**
 * The expression under any `as`, `satisfies`, `<T>` or parentheses. A value
 * is read, and written, through them: the cast stays where it was.
 */
export function unwrapExpression(node: ts.Expression): ts.Expression {
  let current = node;
  while (
    ts.isParenthesizedExpression(current) ||
    ts.isAsExpression(current) ||
    ts.isSatisfiesExpression(current) ||
    ts.isTypeAssertionExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

/** A property that says `key: undefined`: absent from the value, remembered here. */
export interface UndefinedProperty {
  /** The property's path from the declaration's value. */
  path: JsonPath;
  node: ts.PropertyAssignment;
  /** 1-based. */
  line: number;
}

/** A literal read as data. */
export interface Evaluated {
  value: Json;
  /** Every `key: undefined` inside it, in source order. */
  undefinedProperties: UndefinedProperty[];
}

/** The key a property name spells; a name that is not data is refused. */
export function propertyKey(
  name: ts.PropertyName,
  sourceFile: ts.SourceFile,
): string {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name)) return name.text;
  if (ts.isNoSubstitutionTemplateLiteral(name)) return name.text;
  // `{ 1: … }` and `{ 1.0: … }` both name the property "1", as in JS.
  if (ts.isNumericLiteral(name)) return String(Number(name.text));
  if (ts.isComputedPropertyName(name)) {
    throw refuse(
      sourceFile,
      name,
      'a computed property name ([…]) is not data; write the key out',
    );
  }
  throw refuse(sourceFile, name, 'this property name is not data');
}

/** A short excerpt of a node's text for a refusal message. */
const excerpt = (node: ts.Node, sourceFile: ts.SourceFile): string => {
  const text = node.getText(sourceFile).replace(/\s+/g, ' ');
  return text.length > 40 ? `${text.slice(0, 37)}…` : text;
};

const UNDEFINED = Symbol('undefined');

/**
 * Evaluates a literal to JSON.
 *
 * `path` is where `node` sits inside its declaration's value; the remembered
 * `undefined` properties are reported with it.
 */
export function evaluateLiteral(
  node: ts.Expression,
  sourceFile: ts.SourceFile,
  path: JsonPath = [],
): Evaluated {
  const undefinedProperties: UndefinedProperty[] = [];

  const visit = (raw: ts.Expression, at: JsonPath): Json | typeof UNDEFINED => {
    const expr = unwrapExpression(raw);
    switch (expr.kind) {
      case ts.SyntaxKind.StringLiteral:
      case ts.SyntaxKind.NoSubstitutionTemplateLiteral:
        return (expr as ts.StringLiteral).text;
      case ts.SyntaxKind.NumericLiteral:
        return numberOf(expr as ts.NumericLiteral, false);
      case ts.SyntaxKind.TrueKeyword:
        return true;
      case ts.SyntaxKind.FalseKeyword:
        return false;
      case ts.SyntaxKind.NullKeyword:
        return null;
      case ts.SyntaxKind.PrefixUnaryExpression: {
        const unary = expr as ts.PrefixUnaryExpression;
        const operand = unwrapExpression(unary.operand);
        if (
          unary.operator === ts.SyntaxKind.MinusToken &&
          ts.isNumericLiteral(operand)
        ) {
          return numberOf(operand, true);
        }
        throw refuse(
          sourceFile,
          expr,
          `\`${excerpt(expr, sourceFile)}\` is not data; only a minus sign in front of a number is`,
        );
      }
      case ts.SyntaxKind.Identifier:
        if ((expr as ts.Identifier).text === 'undefined') return UNDEFINED;
        throw refuse(
          sourceFile,
          expr,
          `the identifier \`${(expr as ts.Identifier).text}\` is not data; write its value out`,
        );
      case ts.SyntaxKind.ArrayLiteralExpression:
        return (expr as ts.ArrayLiteralExpression).elements.map(
          (element, i) => {
            if (ts.isSpreadElement(element)) {
              throw refuse(
                sourceFile,
                element,
                `a spread (\`${excerpt(element, sourceFile)}\`) is not data; write the elements out`,
              );
            }
            if (ts.isOmittedExpression(element)) {
              throw refuse(
                sourceFile,
                element.pos,
                'an array hole (, ,) is not data',
              );
            }
            const value = visit(element, [...at, i]);
            if (value === UNDEFINED) {
              throw refuse(
                sourceFile,
                element,
                '`undefined` in an array is not data (JSON would read it as null)',
              );
            }
            return value;
          },
        );
      case ts.SyntaxKind.ObjectLiteralExpression:
        return visitObject(expr as ts.ObjectLiteralExpression, at);
      case ts.SyntaxKind.CallExpression:
      case ts.SyntaxKind.NewExpression:
      case ts.SyntaxKind.TaggedTemplateExpression:
        throw refuse(
          sourceFile,
          expr,
          `a call (\`${excerpt(expr, sourceFile)}\`) is not data; write its value out`,
        );
      case ts.SyntaxKind.TemplateExpression:
        throw refuse(
          sourceFile,
          expr,
          'a template with ${…} substitutions is not data; write the string out',
        );
      default:
        throw refuse(
          sourceFile,
          expr,
          `\`${excerpt(expr, sourceFile)}\` (${ts.SyntaxKind[expr.kind]}) is not data`,
        );
    }
  };

  const numberOf = (literal: ts.NumericLiteral, negative: boolean): number => {
    // The scanner has already normalised 0x10, 1_000 and 1e3 to decimal text.
    const value = Number(literal.text);
    if (!Number.isFinite(value)) {
      throw refuse(
        sourceFile,
        literal,
        `${literal.getText(sourceFile)} is not a JSON number`,
      );
    }
    // JSON has no -0; `plain()` would read it as 0.
    return negative ? 0 - value : value;
  };

  const visitObject = (
    object: ts.ObjectLiteralExpression,
    at: JsonPath,
  ): JsonObject => {
    const out: JsonObject = {};
    const seen = new Set<string>();
    for (const property of object.properties) {
      if (ts.isSpreadAssignment(property)) {
        throw refuse(
          sourceFile,
          property,
          `a spread (\`${excerpt(property, sourceFile)}\`) is not data; write the properties out`,
        );
      }
      if (ts.isShorthandPropertyAssignment(property)) {
        throw refuse(
          sourceFile,
          property,
          `a shorthand property (\`${property.name.text}\`) is not data; write \`${property.name.text}: <value>\``,
        );
      }
      if (!ts.isPropertyAssignment(property)) {
        throw refuse(
          sourceFile,
          property,
          `a method or accessor (\`${excerpt(property, sourceFile)}\`) is not data`,
        );
      }
      const key = propertyKey(property.name, sourceFile);
      if (key === '__proto__') {
        throw refuse(
          sourceFile,
          property.name,
          'a `__proto__` key is not data (a literal sets the prototype with it)',
        );
      }
      if (seen.has(key)) {
        throw refuse(
          sourceFile,
          property.name,
          `the key \`${key}\` appears twice in this object`,
        );
      }
      seen.add(key);
      const value = visit(property.initializer, [...at, key]);
      if (value === UNDEFINED) {
        undefinedProperties.push({
          path: [...at, key],
          node: property,
          line: positionOf(sourceFile, property.getStart(sourceFile)).line,
        });
        continue;
      }
      out[key] = value;
    }
    return out;
  };

  const value = visit(node, path);
  if (value === UNDEFINED) {
    throw refuse(sourceFile, node, '`undefined` on its own is not data');
  }
  return { value, undefinedProperties };
}

/* ── Declarations ──────────────────────────────────────────────────── */

/**
 * Which top-level `const` holds a file's data.
 *
 * The locators below are the five shapes the repo's data files have. Each
 * file holds exactly one match; none, or two, is refused, so a file that
 * grows a second song or loses its array fails loudly instead of editing the
 * wrong thing.
 */
export interface DeclarationLocator {
  /** What it is, for messages: 'a song', 'the cities'. */
  label: string;
  /** The declared name, or a pattern it matches. */
  name: string | RegExp;
  /** The annotation's text, when it has to match (a song file's `: Song`). */
  type?: string;
  /** What the value must be. */
  shape: 'object' | 'array';
}

/**
 * `export const <ident>: Song = {…}` in `src/curriculum/data/songs/<id>.ts`.
 * The identifier is the id, or `_<id>` when the id starts with a digit or is
 * a reserved word, with one historical exception (`dontStopBelievin`), so it
 * is matched by the annotation, not the name.
 */
export const SONG_DECLARATION: DeclarationLocator = {
  label: 'a song',
  name: /^[A-Za-z_$][\w$]*$/,
  type: 'Song',
  shape: 'object',
};

/** `export const <GENRE>_EVENTS: HistoricalEvent[] = [...]`, one per events file. */
export const EVENTS_DECLARATION: DeclarationLocator = {
  label: 'the events',
  name: /^[A-Z][A-Z0-9_]*_EVENTS$/,
  shape: 'array',
};

/** `export const CITIES: City[] = [...]` in `atlas/data/cities.ts`. */
export const CITIES_DECLARATION: DeclarationLocator = {
  label: 'the cities',
  name: 'CITIES',
  shape: 'array',
};

/** `export const ARTIST_REGISTRY: readonly RegisteredArtist[] = [...]`. */
export const ARTIST_REGISTRY_DECLARATION: DeclarationLocator = {
  label: 'the artist registry',
  name: 'ARTIST_REGISTRY',
  shape: 'array',
};

/**
 * `const CHORD_PROGRESSION_LIBRARY: ChordProgressionEntry[] = [...]`, which
 * the file exports as its default rather than by name.
 */
export const PROGRESSION_LIBRARY_DECLARATION: DeclarationLocator = {
  label: 'the chord progression library',
  name: 'CHORD_PROGRESSION_LIBRARY',
  shape: 'array',
};

/** A declaration found by its locator. */
export interface LocatedDeclaration {
  name: string;
  exported: boolean;
  statement: ts.VariableStatement;
  declaration: ts.VariableDeclaration;
  /** The initializer with any cast peeled off: the node the value is read from. */
  literal: ts.ObjectLiteralExpression | ts.ArrayLiteralExpression;
}

const nameMatches = (name: string, want: string | RegExp): boolean =>
  typeof want === 'string' ? name === want : want.test(name);

/** Finds the one top-level `const` the locator describes. */
export function locateDeclaration(
  sourceFile: ts.SourceFile,
  locator: DeclarationLocator,
): LocatedDeclaration {
  const found: LocatedDeclaration[] = [];
  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    if (!(statement.declarationList.flags & ts.NodeFlags.Const)) continue;
    const exported = !!statement.modifiers?.some(
      (m) => m.kind === ts.SyntaxKind.ExportKeyword,
    );
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name)) continue;
      const name = declaration.name.text;
      if (!nameMatches(name, locator.name)) continue;
      if (
        locator.type !== undefined &&
        declaration.type?.getText(sourceFile) !== locator.type
      ) {
        continue;
      }
      if (!isBindingName(name)) {
        throw refuse(
          sourceFile,
          declaration.name,
          `\`${name}\` is a reserved word and cannot name a declaration in a module; rename it by hand`,
        );
      }
      if (!declaration.initializer) {
        throw refuse(sourceFile, declaration, `\`${name}\` has no value`);
      }
      const literal = unwrapExpression(declaration.initializer);
      const isObject = ts.isObjectLiteralExpression(literal);
      const isArray = ts.isArrayLiteralExpression(literal);
      if (!(locator.shape === 'object' ? isObject : isArray)) {
        throw refuse(
          sourceFile,
          declaration.initializer,
          `\`${name}\` should be ${locator.shape === 'object' ? 'an object' : 'an array'} literal`,
        );
      }
      found.push({
        name,
        exported,
        statement,
        declaration,
        literal: literal as
          | ts.ObjectLiteralExpression
          | ts.ArrayLiteralExpression,
      });
    }
  }
  if (found.length === 1) return found[0];
  if (found.length === 0) {
    throw refuse(
      sourceFile,
      0,
      `no declaration of ${locator.label} (${String(locator.name)}${locator.type ? `: ${locator.type}` : ''}) was found`,
    );
  }
  throw refuse(
    sourceFile,
    found[1].declaration,
    `${found.length} declarations match ${locator.label}: ${found.map((f) => f.name).join(', ')}`,
  );
}

/** A data file's declaration, parsed, found and evaluated. */
export interface ReadDeclaration extends LocatedDeclaration, Evaluated {
  sourceFile: ts.SourceFile;
}

/** Parses `text`, finds the declaration and evaluates it. */
export function readDeclaration(
  text: string,
  fileName: string,
  locator: DeclarationLocator,
): ReadDeclaration {
  const sourceFile = parseTs(text, fileName);
  const located = locateDeclaration(sourceFile, locator);
  return {
    sourceFile,
    ...located,
    ...evaluateLiteral(located.literal, sourceFile),
  };
}

/* ── Comparing ─────────────────────────────────────────────────────── */

const isObject = (value: Json): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const hasOwn = (object: object, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(object, key);

/**
 * The first place two values differ, or null when they are equal. Key order
 * does not count; array order does.
 */
export function firstDifference(
  a: Json,
  b: Json,
  path: JsonPath = [],
): JsonPath | null {
  if (a === b) return null;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return path;
    for (let i = 0; i < a.length; i++) {
      const found = firstDifference(a[i], b[i], [...path, i]);
      if (found) return found;
    }
    return null;
  }
  if (isObject(a) && isObject(b)) {
    const keys = Object.keys(a);
    if (keys.length !== Object.keys(b).length) {
      const extra =
        keys.find((k) => !hasOwn(b, k)) ??
        Object.keys(b).find((k) => !hasOwn(a, k));
      return extra === undefined ? path : [...path, extra];
    }
    for (const key of keys) {
      if (!hasOwn(b, key)) return [...path, key];
      const found = firstDifference(a[key], b[key], [...path, key]);
      if (found) return found;
    }
    return null;
  }
  return path;
}

/** Deep equality of two JSON values, ignoring key order. */
export const jsonEqual = (a: Json, b: Json): boolean =>
  firstDifference(a, b) === null;

/**
 * A value as JSON would carry it: `undefined` properties dropped, `-0` read
 * as 0, and whatever else `JSON.stringify` does to it (NaN becomes null, a
 * Date its ISO string). Exactly what the mock's `plain()` does to a module's
 * export, so it is what values read from the app's modules are compared
 * through. A value about to be written goes through `strictJson` instead.
 */
export function toJson(value: unknown): Json {
  const text = JSON.stringify(value);
  if (text === undefined) throw new TypeError('the value is not JSON');
  return JSON.parse(text) as Json;
}

/** A value `strictJson` refused, with where in it the trouble is. */
export class NotJsonError extends TypeError {
  constructor(
    /** From the value down to the part refused; empty for the value itself. */
    readonly path: JsonPath,
    /** What is wrong with it. */
    readonly reason: string,
  ) {
    super(`\`${formatPath(path)}\` ${reason}`);
    this.name = 'NotJsonError';
  }
}

/**
 * A new value, checked to be JSON as it stands, as JSON: `undefined`
 * properties dropped and `-0` read as 0, as `toJson` does, but anything a
 * JSON round trip would quietly change is refused, naming the path.
 *
 * `toJson` would write NaN and the infinities as null, an undefined or
 * missing array element as null, and a Date as its ISO string, and the
 * round-trip check compares against that same changed value, so it would
 * pass. A body from HTTP cannot hold these, but one built in JavaScript (the
 * bulk import) can. So the writers, and the store's own check, take a new
 * value through this, as `jsonLines.ts` does for the JSON files. Refused:
 * a number that is not finite; an undefined element or a hole; a function,
 * symbol or bigint; an object that is not plain (a Date, a Map, a class
 * instance); a value that contains itself; and a `__proto__` key, which an
 * object literal would take as the prototype rather than a field.
 */
export function strictJson(value: unknown): Json {
  return strict(value, [], new Set());
}

function strict(value: unknown, path: JsonPath, open: Set<object>): Json {
  if (value === null || typeof value === 'string') return value;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new NotJsonError(
        path,
        `is ${value}, which JSON would write as null`,
      );
    }
    return value === 0 ? 0 : value;
  }
  if (typeof value !== 'object') {
    throw new NotJsonError(
      path,
      `is ${value === undefined ? 'undefined' : `a ${typeof value}`}, which JSON cannot hold`,
    );
  }
  if (open.has(value)) throw new NotJsonError(path, 'contains itself');
  open.add(value);
  try {
    if (Array.isArray(value)) {
      const out: Json[] = [];
      for (let i = 0; i < value.length; i++) {
        if (!(i in value) || value[i] === undefined) {
          throw new NotJsonError(
            [...path, i],
            'is missing or undefined, which JSON would write as null',
          );
        }
        out.push(strict(value[i], [...path, i], open));
      }
      return out;
    }
    // Plain: no prototype, or one whose own prototype is null, which is
    // Object.prototype in this realm or any other.
    const proto: unknown = Object.getPrototypeOf(value);
    if (proto !== null && Object.getPrototypeOf(proto) !== null) {
      const name = (value as { constructor?: { name?: unknown } }).constructor
        ?.name;
      throw new NotJsonError(
        path,
        `is ${typeof name === 'string' && name ? `a ${name}` : 'an object'}, not a plain object`,
      );
    }
    const out: JsonObject = {};
    for (const key of Object.keys(value)) {
      const field = (value as Record<string, unknown>)[key];
      if (field === undefined) continue;
      if (key === '__proto__') {
        throw new NotJsonError(
          [...path, key],
          'is a key an object literal would take as its prototype',
        );
      }
      out[key] = strict(field, [...path, key], open);
    }
    return out;
  } finally {
    open.delete(value);
  }
}

/** `a.b[3].c`, for messages. */
export const formatPath = (path: JsonPath): string =>
  path.length === 0
    ? '(the whole value)'
    : path
        .map((part, i) =>
          typeof part === 'number' ? `[${part}]` : i === 0 ? part : `.${part}`,
        )
        .join('');
