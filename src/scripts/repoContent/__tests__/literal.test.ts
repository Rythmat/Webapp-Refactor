import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import {
  ARTIST_REGISTRY_DECLARATION,
  CITIES_DECLARATION,
  EVENTS_DECLARATION,
  evaluateLiteral,
  firstDifference,
  formatPath,
  isBindingName,
  jsonEqual,
  locateDeclaration,
  NotJsonError,
  parseTs,
  PROGRESSION_LIBRARY_DECLARATION,
  readDeclaration,
  RepoUnwritableError,
  RESERVED_BINDING_NAMES,
  SONG_DECLARATION,
  strictJson,
  toJson,
  type DeclarationLocator,
} from '../literal';
import { moduleErrors } from './moduleErrors';

/**
 * The evaluator on fixtures: every kind of node a data file is made of, and
 * every kind it refuses, with the file and line the refusal names. The real
 * files are read in `tsCorpus.test.ts`.
 */

const FILE = 'fixtures/data.ts';

/** Evaluates `const x = <source>;`. */
const value = (source: string) =>
  readDeclaration(`const x = ${source};\n`, FILE, {
    label: 'x',
    name: 'x',
    shape: source.trim().startsWith('[') ? 'array' : 'object',
  }).value;

/** Evaluates an expression on its own, as the writer's recursion does. */
const expression = (source: string) => {
  const sf = parseTs(`const x = ${source};\n`, FILE);
  const statement = sf.statements[0];
  if (!('declarationList' in statement)) throw new Error('fixture');
  const initializer = (
    statement as { declarationList: { declarations: { initializer: never }[] } }
  ).declarationList.declarations[0].initializer;
  return evaluateLiteral(initializer, sf);
};

/** The refusal an evaluation throws. */
const refusal = (fn: () => unknown): RepoUnwritableError => {
  try {
    fn();
  } catch (error) {
    if (error instanceof RepoUnwritableError) return error;
    throw error;
  }
  throw new Error('expected a refusal');
};

describe('evaluateLiteral: what a data file is made of', () => {
  it('reads strings in every quote, and templates without substitutions', () => {
    expect(
      value(
        `{ a: 'single', b: "double", c: \`tick\`, d: '', e: 'it\\'s', f: "\\u00e9\\n" }`,
      ),
    ).toEqual({
      a: 'single',
      b: 'double',
      c: 'tick',
      d: '',
      e: "it's",
      f: 'é\n',
    });
  });

  it('reads numbers in every spelling, and a minus sign in front of one', () => {
    expect(
      value(
        `[1, 1.5, .5, 0x10, 0b11, 0o7, 1_000, 1e3, 2.5e-3, -4, -0.25, -(3)]`,
      ),
    ).toEqual([1, 1.5, 0.5, 16, 3, 7, 1000, 1000, 0.0025, -4, -0.25, -3]);
  });

  it('reads -0 as 0, as JSON does', () => {
    const [zero] = value('[-0]') as number[];
    expect(Object.is(zero, 0)).toBe(true);
  });

  it('reads true, false and null', () => {
    expect(value('[true, false, null]')).toEqual([true, false, null]);
  });

  it('reads nested objects and arrays, and empty ones', () => {
    expect(value(`{ a: { b: [1, { c: [] }], d: {} }, e: [[], [[]]] }`)).toEqual(
      { a: { b: [1, { c: [] }], d: {} }, e: [[], [[]]] },
    );
  });

  it('reads quoted and numeric keys as JS names them', () => {
    expect(value(`{ 'b-c': 1, "d": 2, 3: 'x', 1.50: 'y', 0x10: 'z' }`)).toEqual(
      {
        'b-c': 1,
        d: 2,
        3: 'x',
        '1.5': 'y',
        16: 'z',
      },
    );
  });

  it('looks through as, satisfies, <T>, as const and parentheses', () => {
    expect(
      value(
        `({ a: ('x' as string), b: [1, 2] as const, c: { d: 1 } satisfies object, e: (<number>(5)), f: ((((null)))) }) as unknown as object`,
      ),
    ).toEqual({ a: 'x', b: [1, 2], c: { d: 1 }, e: 5, f: null });
  });

  it('drops a key: undefined and remembers where it was', () => {
    const read = readDeclaration(
      [
        'export const song: Song = {',
        "  id: 'x',",
        '  year: undefined,',
        '  origin: { region: undefined, country: "US" },',
        '  sections: [{ label: undefined, bars: [] }],',
        '};',
      ].join('\n'),
      FILE,
      SONG_DECLARATION,
    );
    expect(read.value).toEqual({
      id: 'x',
      origin: { country: 'US' },
      sections: [{ bars: [] }],
    });
    expect('year' in (read.value as object)).toBe(false);
    expect(
      read.undefinedProperties.map((u) => [u.path, u.line, u.node.getText()]),
    ).toEqual([
      [['year'], 3, 'year: undefined'],
      [['origin', 'region'], 4, 'region: undefined'],
      [['sections', 0, 'label'], 5, 'label: undefined'],
    ]);
  });

  it('reports remembered paths from where the node sits', () => {
    const sf = parseTs('const x = { a: undefined };', FILE);
    const statement = sf.statements[0] as unknown as {
      declarationList: { declarations: { initializer: never }[] };
    };
    const read = evaluateLiteral(
      statement.declarationList.declarations[0].initializer,
      sf,
      ['events', 3],
    );
    expect(read.undefinedProperties[0].path).toEqual(['events', 3, 'a']);
  });
});

describe('evaluateLiteral: what it refuses, with file and line', () => {
  const cases: [string, string, number, RegExp][] = [
    ['a spread in an object', '{\n  a: 1,\n  ...rest,\n}', 3, /spread/],
    ['a spread in an array', '[\n  1,\n  ...more,\n]', 3, /spread/],
    ['a shorthand property', '{\n  id,\n}', 2, /shorthand property \(`id`\)/],
    [
      'an identifier',
      '{\n  a:\n    SOME_CONSTANT,\n}',
      3,
      /identifier `SOME_CONSTANT`/,
    ],
    ['a call', '{\n  a: 1,\n  b: make(2),\n}', 3, /a call \(`make\(2\)`\)/],
    ['a method call', "{ a: 'x'.toUpperCase() }", 1, /a call/],
    ['a new', '{ a: new Date(0) }', 1, /a call/],
    ['a tagged template', '{ a: tag`x` }', 1, /a call/],
    ['a template with a substitution', '{ a: `x${1}` }', 1, /substitutions/],
    ['a method', '{\n  a() {\n    return 1;\n  },\n}', 2, /method or accessor/],
    ['a getter', '{ get a() { return 1; } }', 1, /method or accessor/],
    ['a computed key', "{ ['a']: 1 }", 1, /computed property name/],
    ['a duplicate key', '{\n  a: 1,\n  a: 2,\n}', 3, /`a` appears twice/],
    ['a __proto__ key', '{ __proto__: null }', 1, /__proto__/],
    ['undefined in an array', '[1,\n  undefined]', 2, /undefined` in an array/],
    ['a hole in an array', '[1, , 2]', 1, /hole/],
    ['a unary plus', '{ a: +1 }', 1, /minus sign/],
    ['a negated identifier', '{ a: -x }', 1, /minus sign/],
    ['a not', '{ a: !0 }', 1, /minus sign/],
    ['a bigint', '{ a: 10n }', 1, /BigIntLiteral/],
    ['a regex', '{ a: /x/ }', 1, /RegularExpressionLiteral/],
    ['an arrow function', '{ a: () => 1 }', 1, /ArrowFunction/],
    ['an addition', '{ a: 1 + 2 }', 1, /BinaryExpression/],
    ['a property access', '{ a: Foo.bar }', 1, /PropertyAccessExpression/],
    ['Infinity', '{ a: Infinity }', 1, /identifier `Infinity`/],
    ['a number too large for JSON', '{ a: 1e999 }', 1, /not a JSON number/],
  ];

  it.each(cases)('refuses %s', (_, source, line, message) => {
    const error = refusal(() => value(source));
    expect(error.file).toBe(FILE);
    expect(error.line).toBe(line);
    expect(error.reason).toMatch(message);
    expect(error.message).toMatch(new RegExp(`^${FILE}:${line}:\\d+: `));
  });

  it('refuses undefined on its own', () => {
    expect(refusal(() => expression('undefined')).reason).toMatch(/on its own/);
  });

  it('answers as a 422 REPO_UNWRITABLE, with a 1-based line and column', () => {
    const error = refusal(() => value('{\n  a: 1,\n    b: fn(),\n}'));
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('RepoUnwritableError');
    expect(error.code).toBe('REPO_UNWRITABLE');
    expect(error.status).toBe(422);
    expect([error.line, error.column]).toEqual([3, 8]);
  });

  it('refuses a file with a syntax error instead of reading the recovered tree', () => {
    const error = refusal(() =>
      readDeclaration(
        "export const CITIES = [\n  { id: 'a' }\n  { id: 'b' },\n];\n",
        FILE,
        CITIES_DECLARATION,
      ),
    );
    expect(error.line).toBe(3);
    expect(error.reason).toMatch(/syntax error: ',' expected/);
  });
});

describe('locateDeclaration', () => {
  const locate = (text: string, locator: DeclarationLocator) =>
    locateDeclaration(parseTs(text, FILE), locator);

  it("finds a song file's `export const <ident>: Song = {…}` by its annotation", () => {
    for (const name of ['_1999', 'a_go_go', 'dontStopBelievin']) {
      const found = locate(
        `import type { Song } from '@/curriculum/types/songLibrary';\n\n/** Doc. */\nexport const ${name}: Song = { id: 'x' };\n`,
        SONG_DECLARATION,
      );
      expect(found.name).toBe(name);
      expect(found.exported).toBe(true);
      expect(ts.isObjectLiteralExpression(found.literal)).toBe(true);
    }
  });

  it('ignores a const of another type, and a let', () => {
    const text = [
      'export const BUNDLED_SONGS: Record<string, Song> = { a: 1 };',
      'export let loose: Song = { id: "no" };',
      'const helper = { a: 1 };',
      "export const real: Song = { id: 'yes' };",
    ].join('\n');
    expect(readDeclaration(text, FILE, SONG_DECLARATION).value).toEqual({
      id: 'yes',
    });
  });

  it('refuses a file with no song, or two', () => {
    expect(
      refusal(() => locate('export const x = 1;', SONG_DECLARATION)).reason,
    ).toMatch(/no declaration of a song/);
    const two = refusal(() =>
      locate(
        "export const a: Song = { id: 'a' };\nexport const b: Song = { id: 'b' };",
        SONG_DECLARATION,
      ),
    );
    expect(two.line).toBe(2);
    expect(two.reason).toMatch(/2 declarations match a song: a, b/);
  });

  it('refuses a declaration of the wrong shape', () => {
    const error = refusal(() =>
      locate('export const CITIES: City[] = {};', CITIES_DECLARATION),
    );
    expect(error.reason).toMatch(/should be an array literal/);
  });

  it('finds each events file by its *_EVENTS name', () => {
    for (const name of [
      'JAZZ_EVENTS',
      'SONG_LIBRARY_EVENTS',
      'RNBSOULFUNK_EVENTS',
    ]) {
      const found = locate(
        `import type { HistoricalEvent } from '@/components/atlas/types';\n\nexport const ${name}: HistoricalEvent[] = [\n  { id: 'evt-a' },\n];\n`,
        EVENTS_DECLARATION,
      );
      expect(found.name).toBe(name);
    }
    expect(
      refusal(() =>
        locate('export const EVENTS: X[] = [];', EVENTS_DECLARATION),
      ).reason,
    ).toMatch(/no declaration of the events/);
  });

  it('finds CITIES, ARTIST_REGISTRY and the unexported progression library', () => {
    expect(
      locate("export const CITIES: City[] = [{ id: 'x' }];", CITIES_DECLARATION)
        .name,
    ).toBe('CITIES');
    expect(
      locate(
        'export const ARTIST_REGISTRY: readonly RegisteredArtist[] = [];\nconst BY_SLUG = new Map(ARTIST_REGISTRY.map((a) => [a.slug, a]));',
        ARTIST_REGISTRY_DECLARATION,
      ).name,
    ).toBe('ARTIST_REGISTRY');
    const library = locate(
      'const CHORD_PROGRESSION_LIBRARY: ChordProgressionEntry[] = [];\n\nexport default CHORD_PROGRESSION_LIBRARY;\n\nexport function f() { return CHORD_PROGRESSION_LIBRARY.filter(() => true); }',
      PROGRESSION_LIBRARY_DECLARATION,
    );
    expect([library.name, library.exported]).toEqual([
      'CHORD_PROGRESSION_LIBRARY',
      false,
    ]);
  });

  it('reads through a cast on the declaration', () => {
    expect(
      readDeclaration(
        'export const CITIES = [{ id: "a" }] as const satisfies readonly object[];',
        FILE,
        CITIES_DECLARATION,
      ).value,
    ).toEqual([{ id: 'a' }]);
  });
});

describe('comparing', () => {
  it('ignores key order, not array order', () => {
    expect(jsonEqual({ a: 1, b: [1, 2] }, { b: [1, 2], a: 1 })).toBe(true);
    expect(jsonEqual([1, 2], [2, 1])).toBe(false);
  });

  it('names the first difference', () => {
    expect(firstDifference({ a: { b: [1, 2] } }, { a: { b: [1, 3] } })).toEqual(
      ['a', 'b', 1],
    );
    expect(firstDifference({ a: 1 }, { a: 1, c: 2 })).toEqual(['c']);
    expect(firstDifference({ a: 1, d: 2 }, { a: 1, c: 2 })).toEqual(['d']);
    expect(firstDifference([1], [1, 2])).toEqual([]);
    expect(firstDifference({ a: [] }, { a: {} })).toEqual(['a']);
    expect(firstDifference(null, 0)).toEqual([]);
    expect(firstDifference({ a: null }, { a: null })).toBeNull();
  });

  it('toJson drops undefined and reads -0 as 0, as plain() does', () => {
    const json = toJson({ a: undefined, b: -0, c: [1] });
    expect(json).toEqual({ b: 0, c: [1] });
    expect(Object.is((json as { b: number }).b, 0)).toBe(true);
  });

  it('formats paths for messages', () => {
    expect(formatPath([])).toBe('(the whole value)');
    expect(formatPath(['sections', 2, 'bars', 0])).toBe('sections[2].bars[0]');
    expect(formatPath([3, 'id'])).toBe('[3].id');
  });
});

describe('strictJson: a value to write, taken as it stands', () => {
  /** The path and reason `strictJson` refuses `input` with. */
  const notJson = (input: unknown) => {
    try {
      strictJson(input);
    } catch (error) {
      if (error instanceof NotJsonError) {
        return { path: error.path, message: error.message };
      }
      throw error;
    }
    throw new Error('expected a refusal');
  };

  it('keeps plain JSON, drops undefined fields and reads -0 as 0, as toJson does', () => {
    const input = {
      id: 'x',
      n: 1.5,
      zero: -0,
      gone: undefined,
      list: [1, 'a', null, true, { deep: [[]] }],
      constructor: 'a key like any other',
    };
    const json = strictJson(input);
    expect(json).toEqual(toJson(input));
    expect(Object.is((json as { zero: number }).zero, 0)).toBe(true);
    expect(json).not.toBe(input);
    const bare = Object.assign(Object.create(null) as object, { a: 1 });
    expect(strictJson(bare)).toEqual({ a: 1 });
  });

  it('refuses what a JSON round trip would quietly change, naming the path', () => {
    const sparse: string[] = [];
    sparse[1] = 'b';
    class Credit {
      name = 'x';
    }
    const cyclic: Record<string, unknown> = { a: 1 };
    cyclic.self = cyclic;
    const cases: [unknown, (string | number)[], RegExp][] = [
      [{ tempo: NaN }, ['tempo'], /is NaN, which JSON would write as null/],
      [{ tempo: Infinity }, ['tempo'], /is Infinity/],
      [{ tempo: -Infinity }, ['tempo'], /is -Infinity/],
      [{ tags: ['a', undefined] }, ['tags', 1], /missing or undefined/],
      [{ tags: sparse }, ['tags', 0], /missing or undefined/],
      [{ year: new Date(0) }, ['year'], /is a Date, not a plain object/],
      [{ m: new Map() }, ['m'], /is a Map/],
      [{ c: [new Credit()] }, ['c', 0], /is a Credit/],
      [{ f: () => 1 }, ['f'], /is a function, which JSON cannot hold/],
      [{ s: Symbol('s') }, ['s'], /is a symbol/],
      [{ b: 1n }, ['b'], /is a bigint/],
      [cyclic, ['self'], /contains itself/],
      [JSON.parse('{"__proto__": {}}'), ['__proto__'], /prototype/],
      [undefined, [], /is undefined/],
    ];
    for (const [input, path, reason] of cases) {
      const refused = notJson(input);
      expect(refused.path).toEqual(path);
      expect(refused.message).toMatch(reason);
      expect(refused.message.startsWith(`\`${formatPath(path)}\``)).toBe(true);
    }
  });

  it('allows a value shared by two fields, which is not a cycle', () => {
    const shared = { a: 1 };
    expect(strictJson({ x: shared, y: [shared] })).toEqual({
      x: { a: 1 },
      y: [{ a: 1 }],
    });
  });
});

describe('names a module can declare', () => {
  it('refuses reserved words, strict-mode words, await, eval and arguments, and non-identifiers', () => {
    for (const name of [
      'static',
      'let',
      'yield',
      'await',
      'eval',
      'arguments',
      'if',
      'true',
      'default',
      'enum',
      '',
      '1999',
      'a-b',
    ]) {
      expect({ name, ok: isBindingName(name) }).toEqual({ name, ok: false });
    }
    for (const name of [
      'type',
      'of',
      'get',
      'from',
      'async',
      'undefined',
      'a_go_go',
      '_1999',
      'dontStopBelievin',
      '$x',
    ]) {
      expect({ name, ok: isBindingName(name) }).toEqual({ name, ok: true });
    }
  });

  it('agrees with TypeScript on every keyword it knows', () => {
    const names = new Set<string>(['eval', 'arguments']);
    for (
      let kind = ts.SyntaxKind.FirstKeyword;
      kind <= ts.SyntaxKind.LastKeyword;
      kind++
    ) {
      const text = ts.tokenToString(kind);
      if (text && /^[a-z]+$/.test(text)) names.add(text);
    }
    for (const name of RESERVED_BINDING_NAMES) expect(names).toContain(name);
    const files = Object.fromEntries(
      [...names].map((name) => [
        `/k/${name}.ts`,
        `export const ${name} = 1;\n`,
      ]),
    );
    const failing = new Set(
      moduleErrors(files).map((error) => /^\/k\/(\w+)\.ts:/.exec(error)![1]),
    );
    for (const name of names) {
      expect({ name, declarable: !failing.has(name) }).toEqual({
        name,
        declarable: isBindingName(name),
      });
    }
  });

  it('refuses a song declared under a word only the binder rejects, which parsing alone lets through', () => {
    for (const name of ['static', 'yield', 'eval', 'arguments', 'package']) {
      const text = `import type { Song } from '@/curriculum/types/songLibrary';\n\nexport const ${name}: Song = { id: 'x' };\n`;
      expect(() => parseTs(text, FILE)).not.toThrow();
      const error = refusal(() =>
        readDeclaration(text, FILE, SONG_DECLARATION),
      );
      expect(error.reason).toMatch(
        new RegExp(`^\`${name}\` is a reserved word`),
      );
      expect(error.line).toBe(3);
    }
  });
});
