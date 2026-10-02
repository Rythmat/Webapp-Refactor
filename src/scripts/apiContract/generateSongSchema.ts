import ts from 'typescript';

/**
 * The song body's Zod schema, derived from the TypeScript type rather than
 * remembered alongside it.
 *
 * The content API validates a song body with a strict Zod schema of its own,
 * kept by hand in another repo. On 27 September 2026 that schema rejected 341
 * of 625 charts on the first import — it had never heard of `instrumental`, a
 * repeat barline, an ending, a coda, a cue or a key change, all of which had
 * been in `songLibrary.ts` for months. Two hand-maintained copies of one
 * shape drift; that is what they do.
 *
 * So this reads the interfaces out of `songLibrary.ts` and emits the schema.
 * A test regenerates it and fails if the committed output has moved, which
 * means the next field added to `ChordBar` breaks the build here rather than
 * three hundred songs there.
 *
 * It handles what the type files use and nothing more: interfaces (and an
 * interface extending one other known interface), string and numeric literal
 * unions, arrays, tuples, optional members, `unknown`, and references between
 * them, plus a `@pattern <regex>` JSDoc tag on a string member, which becomes
 * `z.string().regex()` (a date written 'YYYY[-MM[-DD]]' is a string no
 * TypeScript type can pin down). It is not a general TypeScript-to-Zod
 * compiler and should not grow into one — if a type file starts using a
 * construct this does not know, it says so and stops.
 *
 * The same machinery emits the record kinds' schemas (`recordBodySchemas.ts`,
 * from src/content/records/types.ts) through `generateBodySchema`.
 */

/** Everything the API needs to validate a song, in dependency order. */
const WANTED = [
  'SongMode',
  'DifficultyLevel',
  'AudioProvider',
  'ArtistImageSource',
  'ContentRefType',
  'CreditRole',
  'RoadmapJump',
  'ChordHit',
  'ChordBar',
  'SongSection',
  'GlobeOrigin',
  'ContentRef',
  'AudioSource',
  'Credit',
  'RecordingSession',
  'RelatedRecording',
  'SongRelease',
  'Song',
] as const;

const schemaName = (typeName: string) =>
  `${typeName[0].toLowerCase()}${typeName.slice(1)}Schema`;

export class UnsupportedType extends Error {
  constructor(where: string, text: string) {
    super(`${where}: this generator does not handle \`${text}\``);
  }
}

function zodFor(node: ts.TypeNode, where: string, known: Set<string>): string {
  if (ts.isUnionTypeNode(node))
    return `z.union([${node.types.map((t) => zodFor(t, where, known)).join(', ')}])`;

  if (ts.isArrayTypeNode(node))
    return `z.array(${zodFor(node.elementType, where, known)})`;

  if (ts.isTupleTypeNode(node))
    return `z.tuple([${node.elements.map((t) => zodFor(t, where, known)).join(', ')}])`;

  if (ts.isLiteralTypeNode(node)) {
    const { literal } = node;
    if (ts.isStringLiteral(literal)) return `z.literal('${literal.text}')`;
    if (ts.isNumericLiteral(literal)) return `z.literal(${literal.text})`;
    throw new UnsupportedType(where, literal.getText());
  }

  if (ts.isTypeReferenceNode(node)) {
    const name = node.typeName.getText();
    if (known.has(name)) return schemaName(name);
    throw new UnsupportedType(where, name);
  }

  switch (node.kind) {
    case ts.SyntaxKind.StringKeyword:
      return 'z.string()';
    case ts.SyntaxKind.NumberKeyword:
      return 'z.number()';
    case ts.SyntaxKind.BooleanKeyword:
      return 'z.boolean()';
    case ts.SyntaxKind.UnknownKeyword:
      return 'z.unknown()';
    default:
      throw new UnsupportedType(where, node.getText());
  }
}

/**
 * A doc comment, kept.
 *
 * The comments are half the value of the type file — `keyChange` says degrees
 * count from the new tonic from here on, which no field name conveys — and a
 * schema someone is reading to understand the shape wants them.
 */
function commentFor(node: ts.Node, source: string): string[] {
  const ranges = ts.getLeadingCommentRanges(source, node.pos) ?? [];
  // Only the comment touching the declaration. Everything before it belongs
  // to the file or to the section divider above, and attaching those to the
  // first schema in the section says something untrue about it.
  return ranges
    .slice(-1)
    .map((r) => source.slice(r.pos, r.end))
    .filter((c) => c.startsWith('/**'))
    .join('\n')
    .replace(/\/\*\*?|\*\//g, '')
    .split('\n')
    .map((l) => l.replace(/^\s*\*? ?/, '').trimEnd())
    .filter((l) => l.length > 0);
}

const PATTERN_TAG = '@pattern';

/**
 * A member's `@pattern` tag, split off its doc comment: the regex the value
 * must match, and the comment without the tag (the schema shows the regex
 * itself). Only a plain `string` member may carry one, once, on a line of its
 * own: a tag inside a sentence (`/** Year. @pattern … *\/`) is refused
 * rather than left in the comment unenforced.
 */
function patternOf(
  member: ts.PropertySignature,
  doc: string[],
  where: string,
): { regex: string | null; doc: string[] } {
  const stray = doc.find(
    (line) => !line.startsWith(PATTERN_TAG) && line.includes(PATTERN_TAG),
  );
  if (stray) throw new UnsupportedType(where, stray);
  const tags = doc.filter((line) => line.startsWith(PATTERN_TAG));
  if (tags.length === 0) return { regex: null, doc };
  const source = tags[0].slice(PATTERN_TAG.length).trim();
  if (
    tags.length > 1 ||
    member.type?.kind !== ts.SyntaxKind.StringKeyword ||
    source === ''
  )
    throw new UnsupportedType(where, tags.join(' '));
  try {
    new RegExp(source);
  } catch {
    throw new UnsupportedType(where, tags[0]);
  }
  // As a regex literal: a slash inside ends it early unless escaped.
  const regex = `/${source.replace(/\\?\//g, '\\/')}/`;
  return {
    regex,
    doc: doc.filter((line) => !line.startsWith(PATTERN_TAG)),
  };
}

function emitLiteralUnion(
  alias: ts.TypeAliasDeclaration,
  where: string,
  known: Set<string>,
): string {
  const node = alias.type;
  // A union of plain string literals reads far better as z.enum.
  if (
    ts.isUnionTypeNode(node) &&
    node.types.every(
      (t) => ts.isLiteralTypeNode(t) && ts.isStringLiteral(t.literal),
    )
  ) {
    const values = node.types.map(
      (t) =>
        `'${((t as ts.LiteralTypeNode).literal as ts.StringLiteral).text}'`,
    );
    return `z.enum([${values.join(', ')}])`;
  }
  return zodFor(node, where, known);
}

/** One type file the generator reads. */
export interface TypeSource {
  /** For error messages: 'songLibrary.ts'. */
  name: string;
  text: string;
}

type Declaration = {
  node: ts.InterfaceDeclaration | ts.TypeAliasDeclaration;
  source: TypeSource;
};

/** The base interface this one extends, if any. */
function baseOf(node: ts.InterfaceDeclaration, known: Set<string>) {
  const heritage = node.heritageClauses ?? [];
  const bases = heritage.flatMap((h) => h.types);
  if (bases.length === 0) return null;
  const name = bases[0].expression.getText();
  if (bases.length > 1 || bases[0].typeArguments || !known.has(name))
    throw new UnsupportedType(node.name.text, `extends ${bases[0].getText()}`);
  return name;
}

/**
 * A schema file generated from type files: one schema per wanted type, in the
 * order given (which must list a type before anything that refers to it).
 */
export function generateBodySchema(options: {
  sources: TypeSource[];
  wanted: readonly string[];
  header: string;
  footer: string;
}): string {
  const declarations = new Map<string, Declaration>();
  for (const source of options.sources) {
    const file = ts.createSourceFile(
      source.name,
      source.text,
      ts.ScriptTarget.Latest,
      true,
    );
    for (const statement of file.statements)
      if (
        ts.isInterfaceDeclaration(statement) ||
        ts.isTypeAliasDeclaration(statement)
      )
        declarations.set(statement.name.text, { node: statement, source });
  }

  const known = new Set<string>(options.wanted);
  const blocks: string[] = [];

  for (const name of options.wanted) {
    const found = declarations.get(name);
    if (!found)
      throw new Error(
        `${options.sources.map((s) => s.name).join(' / ')} no longer declares ${name}`,
      );
    const { node: declaration, source } = found;
    const typeFileSource = source.text;

    const lead = commentFor(declaration, typeFileSource);
    const doc = lead.length
      ? `/**\n${lead.map((l) => ` * ${l}`.trimEnd()).join('\n')}\n */\n`
      : '';

    if (ts.isTypeAliasDeclaration(declaration)) {
      blocks.push(
        `${doc}export const ${schemaName(name)} = ${emitLiteralUnion(declaration, name, known)};`,
      );
      continue;
    }

    const fields: string[] = [];
    for (const member of declaration.members) {
      if (!ts.isPropertySignature(member) || !member.type)
        throw new UnsupportedType(name, member.getText());
      const key = member.name.getText();
      const where = `${name}.${key}`;
      const { regex, doc: memberDoc } = patternOf(
        member,
        commentFor(member, typeFileSource),
        where,
      );
      const zod = regex
        ? `z.string().regex(${regex})`
        : zodFor(member.type, where, known);
      // One line stays one line; several become a block, rather than a run
      // of one-line comments that reads as several separate remarks.
      if (memberDoc.length === 1) fields.push(`  /** ${memberDoc[0]} */`);
      else if (memberDoc.length > 1)
        fields.push(
          `  /**\n${memberDoc.map((l) => `   * ${l}`.trimEnd()).join('\n')}\n   */`,
        );
      fields.push(
        `  ${key}: ${zod}${member.questionToken ? '.optional()' : ''},`,
      );
    }

    const base = baseOf(declaration, known);
    const body = `{\n${fields.map((f) => `  ${f}`).join('\n')}\n  }`;
    blocks.push(
      base
        ? `${doc}export const ${schemaName(name)} = ${schemaName(base)}\n  .extend(${body})\n  .strict();`
        : `${doc}export const ${schemaName(name)} = z\n  .object(${body})\n  .strict();`,
    );
  }

  return `${options.header}\n\n${blocks.join('\n\n')}\n\n${options.footer}\n`;
}

/** The song body schema file, as text. */
export function generateSongSchema(typeFileSource: string): string {
  return generateBodySchema({
    sources: [{ name: 'songLibrary.ts', text: typeFileSource }],
    wanted: WANTED,
    header: header(),
    footer: footer(),
  });
}

const header =
  () => `// ─────────────────────────────────────────────────────────────────────────
//  GENERATED — do not edit.
//
//  \`npx vitest run src/scripts/apiContract/__tests__/songBodySchema.test.ts\`
//  regenerates this from src/curriculum/types/songLibrary.ts and fails if what
//  is committed here has drifted from it.
//
//  This is the shape the content API must accept on
//  \`PUT /api/admin/content/items\` for \`kind: 'song'\`. It is generated rather
//  than written because the last hand-kept copy fell 341 charts behind the
//  type it was supposed to mirror.
// ─────────────────────────────────────────────────────────────────────────
import { z } from 'zod';`;

const footer = () => `/** What a song body must satisfy. */
export const songBodySchema = songSchema;

export type SongBody = z.infer<typeof songBodySchema>;`;
