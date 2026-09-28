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
 * It handles what that file uses and nothing more: interfaces, string and
 * numeric literal unions, arrays, the one tuple, optional members, and
 * references between them. It is not a general TypeScript-to-Zod compiler and
 * should not grow into one — if the type file starts using a construct this
 * does not know, it says so and stops.
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

/** The generated file, as text. */
export function generateSongSchema(typeFileSource: string): string {
  const file = ts.createSourceFile(
    'songLibrary.ts',
    typeFileSource,
    ts.ScriptTarget.Latest,
    true,
  );

  const declarations = new Map<
    string,
    ts.InterfaceDeclaration | ts.TypeAliasDeclaration
  >();
  for (const statement of file.statements)
    if (
      ts.isInterfaceDeclaration(statement) ||
      ts.isTypeAliasDeclaration(statement)
    )
      declarations.set(statement.name.text, statement);

  const known = new Set<string>(WANTED);
  const blocks: string[] = [];

  for (const name of WANTED) {
    const declaration = declarations.get(name);
    if (!declaration)
      throw new Error(`songLibrary.ts no longer declares ${name}`);

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
      const zod = zodFor(member.type, where, known);
      const memberDoc = commentFor(member, typeFileSource);
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

    blocks.push(
      `${doc}export const ${schemaName(name)} = z\n  .object({\n${fields
        .map((f) => `  ${f}`)
        .join('\n')}\n  })\n  .strict();`,
    );
  }

  return `${header()}\n\n${blocks.join('\n\n')}\n\n${footer()}\n`;
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
