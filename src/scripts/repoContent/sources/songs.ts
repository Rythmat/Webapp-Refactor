import type { Options } from 'prettier';
import ts from 'typescript';
import {
  type DeclarationLocator,
  isBindingName,
  locateDeclaration,
  parseTs,
  propertyKey,
  readDeclaration,
  refuse,
  RepoUnwritableError,
  SONG_DECLARATION,
} from '../literal';
import {
  applySplices,
  formatEdit,
  newDeclarationFile,
  SONG_KEY_ORDER,
  songIdentifier,
  type Splice,
  TS_FILE_KINDS,
  writeTsDeclaration,
} from '../tsWrite';
import {
  badChange,
  byCodeUnit,
  checkIdentity,
  declarationValue,
  type FilePlan,
  type ItemChange,
  itemFrom,
  itemKey,
  loadFailed,
  mapLimit,
  oneChangePerItem,
  type PlanContext,
  type PlanOptions,
  planFor,
  type RepoItem,
  type RepoReader,
  type RepoSource,
  slugPattern,
  unwritable,
} from './common';

/**
 * Songs: one TypeScript file per song, and their registration in
 * `bundled.ts`.
 *
 * `src/curriculum/data/songs/<id>.ts` holds `export const <ident>: Song =
 * {…}`, where `<ident>` is the id, or `_<id>` when the id starts with a
 * digit or is a reserved word (`songIdentifier`; one file,
 * `dont_stop_believin.ts`, says `dontStopBelievin`). The body is that
 * literal, read as data. Files whose name starts with `_` are the importer's
 * own (`_generated_index.ts` is one, and it is never read), and `bundled.ts`
 * and `index.ts` are modules, not songs; no song can take one of those
 * names, so a save never writes over them.
 *
 * `bundled.ts` is what students get: it imports each song it lists and maps
 * the id to it in `BUNDLED_SONGS`. A song file it does not register is a
 * draft (`thank_you` and `this_must_be_the_place` are drafts today). So a
 * song's status is its registration (design B):
 *
 *  - a new song is written as its file only, and stays a draft;
 *  - `published` adds its import, sorted by specifier as eslint's
 *    `import/order` wants, and appends its entry to the map;
 *  - `draft` takes both out again;
 *  - a published song is never deleted: code refers to published songs,
 *    so it is refused until the song is made a draft first.
 *
 * Edits to a song's body are surgical (`tsWrite.ts`): only the values that
 * changed are touched, and the file is read back before the plan is made.
 */

export const SONGS_DIR = 'src/curriculum/data/songs';
export const BUNDLED_SONGS_FILE = `${SONGS_DIR}/bundled.ts`;

/** The first line of every song file. */
export const SONG_FILE_HEADER =
  "import type { Song } from '@/curriculum/types/songLibrary';";

export const songFileOf = (id: string): string => `${SONGS_DIR}/${id}.ts`;

/** Whether a file in the songs folder is a song (not a module, not the importer's own). */
export const isSongFileName = (name: string): boolean =>
  name.endsWith('.ts') &&
  !name.endsWith('.d.ts') &&
  !name.startsWith('_') &&
  name !== 'bundled.ts' &&
  name !== 'index.ts';

/* ── bundled.ts ────────────────────────────────────────────────────── */

const BUNDLED_SONGS_DECLARATION: DeclarationLocator = {
  label: 'the bundled songs',
  name: 'BUNDLED_SONGS',
  shape: 'object',
};

/** One entry of `BUNDLED_SONGS`: the id, and the imported name it maps to. */
export interface SongRegistration {
  id: string;
  identifier: string;
  /** Where that name is imported from (`./africa`), or null when nothing imports it. */
  specifier: string | null;
}

interface ReadBundled {
  sourceFile: ts.SourceFile;
  object: ts.ObjectLiteralExpression;
  /** By id, in map order. */
  entries: Map<
    string,
    { identifier: string; property: ts.ObjectLiteralElementLike }
  >;
  /** By local name: where each value import (not `import type`) comes from. */
  imports: Map<
    string,
    { specifier: string; declaration: ts.ImportDeclaration }
  >;
  /** Every import declaration with a relative specifier, in file order. */
  siblings: { specifier: string; declaration: ts.ImportDeclaration }[];
  /** The last import declaration of the file. */
  lastImport: ts.ImportDeclaration | undefined;
}

function readBundled(text: string, fileName: string): ReadBundled {
  const sourceFile = parseTs(text, fileName);
  const { literal } = locateDeclaration(sourceFile, BUNDLED_SONGS_DECLARATION);
  const object = literal as ts.ObjectLiteralExpression;

  const imports: ReadBundled['imports'] = new Map();
  const siblings: ReadBundled['siblings'] = [];
  let lastImport: ts.ImportDeclaration | undefined;
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    lastImport = statement;
    const specifier = (statement.moduleSpecifier as ts.StringLiteral).text;
    if (specifier.startsWith('./')) {
      siblings.push({ specifier, declaration: statement });
    }
    const bindings = statement.importClause?.namedBindings;
    if (
      statement.importClause?.isTypeOnly ||
      statement.importClause?.name ||
      !bindings ||
      !ts.isNamedImports(bindings)
    ) {
      continue;
    }
    for (const element of bindings.elements) {
      if (!isBindingName(element.name.text)) {
        throw refuse(
          sourceFile,
          element,
          `\`${element.name.text}\` is a reserved word and cannot be imported by that name`,
        );
      }
      imports.set(element.name.text, { specifier, declaration: statement });
    }
  }

  const entries: ReadBundled['entries'] = new Map();
  for (const property of object.properties) {
    let id: string;
    let identifier: string;
    if (ts.isShorthandPropertyAssignment(property)) {
      id = property.name.text;
      identifier = property.name.text;
    } else if (
      ts.isPropertyAssignment(property) &&
      ts.isIdentifier(property.initializer)
    ) {
      id = propertyKey(property.name, sourceFile);
      identifier = property.initializer.text;
    } else {
      throw refuse(
        sourceFile,
        property,
        'a BUNDLED_SONGS entry should map an id to an imported song',
      );
    }
    if (!isBindingName(identifier)) {
      throw refuse(
        sourceFile,
        property,
        `'${id}' is mapped to \`${identifier}\`, a reserved word no module can declare`,
      );
    }
    if (entries.has(id)) {
      throw refuse(sourceFile, property, `'${id}' is registered twice`);
    }
    entries.set(id, { identifier, property });
  }
  return { sourceFile, object, entries, imports, siblings, lastImport };
}

/** The songs `bundled.ts` registers, in map order. */
export function readSongRegistrations(
  text: string,
  fileName = BUNDLED_SONGS_FILE,
): SongRegistration[] {
  const read = readBundled(text, fileName);
  return [...read.entries].map(([id, { identifier }]) => ({
    id,
    identifier,
    specifier: read.imports.get(identifier)?.specifier ?? null,
  }));
}

/**
 * eslint-plugin-import's `alphabetize` order (2.29, case-sensitive): the
 * specifiers compared segment by segment at each `/`, by code unit, and a
 * shorter one first when one is a prefix of the other.
 */
export function compareSpecifiers(a: string, b: string): number {
  if (!a.includes('/') && !b.includes('/')) return byCodeUnit(a, b);
  const as = a.split('/');
  const bs = b.split('/');
  for (let i = 0; i < Math.min(as.length, bs.length); i++) {
    const result = byCodeUnit(as[i], bs[i]);
    if (result) return result;
  }
  return as.length === bs.length ? 0 : as.length < bs.length ? -1 : 1;
}

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;
const printKey = (key: string) =>
  IDENTIFIER.test(key) ? key : `'${key.replace(/['\\]/g, '\\$&')}'`;

/** Where the line holding `pos` starts. */
const lineStart = (text: string, pos: number) =>
  text.lastIndexOf('\n', pos - 1) + 1;

/** Throws if `text[start, end)` holds a comment. */
function refuseComments(
  sourceFile: ts.SourceFile,
  start: number,
  end: number,
  doing: string,
): void {
  const scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    false,
    ts.LanguageVariant.Standard,
    sourceFile.text,
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
        sourceFile,
        scanner.getTokenStart(),
        `${doing} would delete this comment; edit bundled.ts by hand`,
      );
    }
  }
}

/** The end of the comma after `node`, or null when the list closes after it. */
function commaAfter(sourceFile: ts.SourceFile, node: ts.Node): number | null {
  const scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    true,
    ts.LanguageVariant.Standard,
    sourceFile.text,
    undefined,
    node.end,
  );
  return scanner.scan() === ts.SyntaxKind.CommaToken
    ? scanner.getTokenEnd()
    : null;
}

export interface RegistrationWrite {
  /** `bundled.ts` as read. */
  text: string;
  fileName?: string;
  /** Songs to register: the id, and the name its file exports it as. */
  add?: readonly { id: string; identifier: string }[];
  /** Ids to take out. */
  remove?: readonly string[];
  prettier?: Options;
  /** Format and read back even when nothing changes. */
  force?: boolean;
  /** Told when bundled.ts was not prettier-clean before the write (`formatEdit`). */
  onUnclean?: (fileName: string) => void;
}

/**
 * Registers songs in `bundled.ts` and takes them out, surgically: an added
 * song's import goes where eslint's `import/order` puts it among the
 * sibling imports and its entry is appended to `BUNDLED_SONGS`; a removed
 * song loses both. Registering a song already registered, or removing one
 * that is not, changes nothing. The result is formatted with prettier and
 * read back: the registrations it holds must be exactly the old ones with
 * these changes, each importing `./<id>`, or it is refused.
 */
export async function writeSongRegistrations(
  request: RegistrationWrite,
): Promise<{ text: string; changed: boolean }> {
  const fileName = request.fileName ?? BUNDLED_SONGS_FILE;
  const { text } = request;
  const read = readBundled(text, fileName);
  const sf = read.sourceFile;
  const removing = new Set(
    (request.remove ?? []).filter((id) => read.entries.has(id)),
  );
  const adding = (request.add ?? []).filter(
    (song) => !read.entries.has(song.id),
  );
  const unbindable = adding.find((song) => !isBindingName(song.identifier));
  if (unbindable) {
    throw new RepoUnwritableError(
      fileName,
      1,
      1,
      `'${unbindable.id}' cannot be imported as \`${unbindable.identifier}\`: it is a reserved word or not an identifier`,
    );
  }
  const both = adding.find((song) => request.remove?.includes(song.id));
  if (both) {
    throw new RepoUnwritableError(
      fileName,
      1,
      1,
      `'${both.id}' is both registered and taken out in one write`,
    );
  }

  const splices: Splice[] = [];

  for (const id of removing) {
    const { identifier, property } = read.entries.get(id)!;
    const start = property.getStart(sf);
    let end = commaAfter(sf, property) ?? property.end;
    if (ts.getTrailingCommentRanges(sf.text, end)?.length) {
      throw refuse(
        sf,
        end,
        `removing '${id}' would orphan the comment after it; edit bundled.ts by hand`,
      );
    }
    refuseComments(sf, start, end, `removing '${id}'`);
    while (end < text.length && /[ \t\r\n]/.test(text[end])) end++;
    splices.push({ start, end, text: '' });

    const imported = read.imports.get(identifier);
    if (!imported) continue;
    const bindings = imported.declaration.importClause?.namedBindings;
    if (
      !bindings ||
      !ts.isNamedImports(bindings) ||
      bindings.elements.length !== 1
    ) {
      throw refuse(
        sf,
        imported.declaration,
        `the import of ${identifier} brings in other names too; edit bundled.ts by hand`,
      );
    }
    const importStart = imported.declaration.getStart(sf);
    let importEnd = imported.declaration.end;
    refuseComments(
      sf,
      importStart,
      importEnd,
      `removing the import of '${id}'`,
    );
    if (text[importEnd] === '\r') importEnd++;
    if (text[importEnd] === '\n') importEnd++;
    splices.push({ start: importStart, end: importEnd, text: '' });
  }

  // Imports: grouped by the position they go in, each group sorted, so two
  // songs added next to each other come out in order.
  const importsAt = new Map<number, string[]>();
  const sorted = [...adding].sort((a, b) =>
    compareSpecifiers(`./${a.id}`, `./${b.id}`),
  );
  for (const song of sorted) {
    const clash = read.imports.get(song.identifier);
    if (clash) {
      throw refuse(
        sf,
        clash.declaration,
        `bundled.ts already imports a ${song.identifier} (from '${clash.specifier}'); '${song.id}' needs another name`,
      );
    }
    const specifier = `./${song.id}`;
    const next = read.siblings.find(
      (s) => compareSpecifiers(s.specifier, specifier) > 0,
    );
    const line = `import { ${song.identifier} } from '${specifier}';`;
    let at: number;
    let piece: string;
    if (next) {
      const leading = ts.getLeadingCommentRanges(text, next.declaration.pos);
      at = lineStart(text, leading?.[0]?.pos ?? next.declaration.getStart(sf));
      piece = `${line}\n`;
    } else {
      const last = read.siblings[read.siblings.length - 1]?.declaration;
      const after = last ?? read.lastImport;
      at = after ? after.end : 0;
      piece = after ? `\n${line}` : `${line}\n`;
    }
    importsAt.set(at, [...(importsAt.get(at) ?? []), piece]);
  }
  for (const [at, pieces] of importsAt) {
    splices.push({ start: at, end: at, text: pieces.join('') });
  }

  // Map entries: appended after the last entry.
  if (adding.length) {
    const entries = adding.map(
      (song) => `${printKey(song.id)}: ${song.identifier}`,
    );
    const properties = read.object.properties;
    const last = properties[properties.length - 1];
    if (!last) {
      const at = read.object.getStart(sf) + 1;
      splices.push({
        start: at,
        end: at,
        text: entries.map((e) => `\n  ${e},`).join(''),
      });
    } else {
      const comma = commaAfter(sf, last);
      const trailing =
        comma === null ? undefined : ts.getTrailingCommentRanges(text, comma);
      const at = trailing?.length
        ? trailing[trailing.length - 1].end
        : (comma ?? last.end);
      const lead = comma === null ? ',' : '';
      splices.push({
        start: at,
        end: at,
        text: lead + entries.map((e) => `\n  ${e},`).join(''),
      });
    }
  }

  if (!splices.length && !request.force) return { text, changed: false };
  const { text: formatted } = await formatEdit({
    before: text,
    edited: applySplices(text, splices),
    fileName,
    prettier: request.prettier,
    onUnclean: request.onUnclean,
  });

  // Read back: the old registrations, less the removed, plus the added.
  const expected = new Map(
    [...read.entries]
      .filter(([id]) => !removing.has(id))
      .map(([id, { identifier }]) => [
        id,
        {
          identifier,
          specifier: read.imports.get(identifier)?.specifier ?? null,
        },
      ]),
  );
  for (const song of adding) {
    expected.set(song.id, {
      identifier: song.identifier,
      specifier: `./${song.id}`,
    });
  }
  const actual = readSongRegistrations(formatted, fileName);
  const problems: string[] = [];
  if (actual.length !== expected.size) {
    problems.push(
      `${expected.size} registrations intended, ${actual.length} read back`,
    );
  }
  for (const registration of actual) {
    const want = expected.get(registration.id);
    if (
      !want ||
      want.identifier !== registration.identifier ||
      want.specifier !== registration.specifier
    ) {
      problems.push(`'${registration.id}' reads back wrong`);
    }
  }
  if (problems.length) {
    throw new RepoUnwritableError(
      fileName,
      1,
      1,
      `the written bundled.ts does not read back as intended (${problems.slice(0, 3).join('; ')}); nothing was written`,
    );
  }
  return { text: formatted, changed: formatted !== text };
}

/* ── The adapter ───────────────────────────────────────────────────── */

const SONG_ID = slugPattern('song');

async function songFileNames(reader: RepoReader): Promise<string[]> {
  return (await reader.list(SONGS_DIR)).filter(isSongFileName);
}

async function load(reader: RepoReader) {
  const [names, bundled] = await Promise.all([
    songFileNames(reader),
    reader.read(BUNDLED_SONGS_FILE),
  ]);
  if (!bundled) {
    throw loadFailed(BUNDLED_SONGS_FILE, new Error('the file is missing'));
  }
  let registered: Set<string>;
  const problems: string[] = [];
  try {
    const registrations = readSongRegistrations(bundled.text);
    registered = new Set(registrations.map((r) => r.id));
    for (const r of registrations) {
      if (r.specifier !== `./${r.id}`) {
        problems.push(
          `bundled.ts maps '${r.id}' to ${r.identifier}, imported from ${r.specifier ?? 'nowhere'} rather than './${r.id}'`,
        );
      }
    }
  } catch (error) {
    throw loadFailed(BUNDLED_SONGS_FILE, error);
  }

  const files = await mapLimit(names, 32, async (name) => {
    const path = `${SONGS_DIR}/${name}`;
    const file = await reader.read(path);
    if (!file)
      throw loadFailed(path, new Error('the file vanished while loading'));
    return file;
  });

  const items: RepoItem[] = [];
  const ids = new Set<string>();
  for (const file of files) {
    let body: Record<string, unknown>;
    try {
      body = declarationValue(file, SONG_DECLARATION) as Record<
        string,
        unknown
      >;
    } catch (error) {
      throw loadFailed(file.path, error);
    }
    const id = file.path.slice(SONGS_DIR.length + 1, -'.ts'.length);
    if (body.id !== id) {
      problems.push(
        `${file.path} holds the song ${JSON.stringify(body.id)}; a song's file is named by its id`,
      );
      continue;
    }
    ids.add(id);
    items.push(
      itemFrom(
        'song',
        id,
        body,
        file,
        registered.has(id) ? 'published' : 'draft',
      ),
    );
  }
  for (const id of registered) {
    if (!ids.has(id)) {
      problems.push(`bundled.ts registers '${id}', which has no song file`);
    }
  }
  if (problems.length) {
    throw loadFailed(SONGS_DIR, new Error(problems.join('; ')));
  }
  return { items, files: [bundled, ...files], missing: [], warnings: [] };
}

async function plan(
  changes: readonly ItemChange[],
  context: PlanContext,
  options: PlanOptions = {},
): Promise<FilePlan[]> {
  oneChangePerItem(changes);
  const plans: FilePlan[] = [];
  const add: { id: string; identifier: string }[] = [];
  const remove: string[] = [];
  const registrationItems: string[] = [];

  for (const change of changes) {
    checkIdentity(change, 'id', SONG_ID);
    const key = itemKey('song', change.slug);
    const path = songFileOf(change.slug);
    // `bundled`, `index` and `_…` name the folder's modules and the
    // importer's own files, which are not songs and are never read: a
    // "new song" by one of those names would write over that file.
    if (!isSongFileName(`${change.slug}.ts`)) {
      throw badChange(
        change,
        `${path} is not a song file: bundled.ts and index.ts are the folder's modules, and a name starting with '_' is the importer's`,
      );
    }
    const existing = context.item('song', change.slug);
    const file = existing ? context.file(existing.file) : null;
    if (!existing && context.file(path)) {
      throw badChange(
        change,
        `${path} exists but holds no song the store read; edit it by hand`,
      );
    }

    if (change.body === null) {
      if (!existing || !file) throw badChange(change, 'there is no such song');
      if (existing.status === 'published') {
        throw badChange(
          change,
          'a published song is registered in bundled.ts and referred to by code; make it a draft first',
        );
      }
      plans.push(planFor(path, file, null, [key])!);
      continue;
    }

    if (existing && file) {
      try {
        const written = await writeTsDeclaration({
          text: file.text,
          fileName: path,
          ...TS_FILE_KINDS.song,
          next: change.body,
          force: options.force,
        });
        const planned = planFor(path, file, written.text, [key], options.force);
        if (planned) plans.push(planned);
      } catch (error) {
        throw unwritable(path, error);
      }
    } else {
      try {
        const text = await newDeclarationFile({
          fileName: path,
          header: SONG_FILE_HEADER,
          name: songIdentifier(change.slug),
          type: 'Song',
          value: change.body,
          locator: SONG_DECLARATION,
          keyOrder: SONG_KEY_ORDER,
        });
        plans.push(planFor(path, null, text, [key])!);
      } catch (error) {
        throw unwritable(path, error);
      }
    }

    const was = existing?.status ?? 'draft';
    const next = change.status ?? was;
    if (next === was && !options.force) continue;
    registrationItems.push(key);
    if (next === 'published' && was !== 'published') {
      // A file that exists is registered under the name it exports.
      const identifier =
        existing && file
          ? readDeclaration(file.text, path, SONG_DECLARATION).name
          : songIdentifier(change.slug);
      add.push({ id: change.slug, identifier });
    }
    if (next === 'draft' && was === 'published') remove.push(change.slug);
  }

  if (
    add.length ||
    remove.length ||
    (options.force && registrationItems.length)
  ) {
    const bundled = context.file(BUNDLED_SONGS_FILE);
    if (!bundled) {
      throw loadFailed(BUNDLED_SONGS_FILE, new Error('the file is missing'));
    }
    try {
      const written = await writeSongRegistrations({
        text: bundled.text,
        add,
        remove,
        force: options.force,
      });
      const planned = planFor(
        BUNDLED_SONGS_FILE,
        bundled,
        written.text,
        registrationItems,
        options.force,
      );
      if (planned) plans.push(planned);
    } catch (error) {
      throw unwritable(BUNDLED_SONGS_FILE, error);
    }
  }
  return plans;
}

export const songsSource: RepoSource = {
  name: 'songs',
  kinds: ['song'],
  readOnly: false,
  async files(reader) {
    return [
      BUNDLED_SONGS_FILE,
      ...(await songFileNames(reader)).map((name) => `${SONGS_DIR}/${name}`),
    ];
  },
  load,
  plan,
};
