import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

/**
 * The site never names the outside catalogues the importer reads (owner
 * decision of 30 September 2026). No text the console or the student app
 * can show may say MusicBrainz, Wikidata, MetaBrainz or MBID: not a label,
 * a tooltip, an aria-label, a badge, a banner or an empty-state note, and
 * no data file the site reads may carry their names or links.
 *
 * This test reads every source file under src that is not a test and not
 * developer tooling (src/scripts holds the importer, which is where the
 * provenance is allowed to live). It parses each one with the TypeScript
 * parser and looks at every string literal, template literal and piece of
 * JSX text, because those are what can end up on screen. Comments, type
 * names, identifiers and string literal types are not on the site and are
 * not checked. A JSON file under src outside src/scripts is checked whole.
 *
 * A literal that is never shown, only used as data, can be allowed below,
 * each with its reason. Keep the list short.
 */

const SRC = join(__dirname, '..', '..', '..');
const ROOT = join(SRC, '..');

const NAMES = /musicbrainz|wikidata|metabrainz|mbid/i;

/**
 * Literals allowed in one file, each used only as data and never shown.
 * The key is the file's path from the repo root, with forward slashes.
 */
const ALLOWED: Readonly<Record<string, readonly string[]>> = {
  // The offline mock server checks the `provider` query parameter against
  // the provider ids a suggestion can carry. They are enum values that the
  // console sends and compares, and the console names a provider through
  // its own neutral words (suggestionText.ts), never through these.
  'src/features/admin/content/mock/contentMockServer.ts': [
    'musicbrainz',
    'wikidata',
  ],
};

/** Folders that are not part of the site, or are other agents' scratch. */
const SKIPPED_DIRS = new Set(['node_modules', '__tests__', '__mocks__']);

const isScratchDir = (name: string) => /^__.*tmp/i.test(name);

const isTestFile = (name: string) => /\.(test|spec)\.[cm]?[jt]sx?$/.test(name);

function listFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIPPED_DIRS.has(entry.name) || isScratchDir(entry.name)) continue;
      // Developer tooling: the importer and its artifacts.
      if (relative(SRC, path) === 'scripts') continue;
      listFiles(path, out);
    } else if (!isTestFile(entry.name)) {
      out.push(path);
    }
  }
  return out;
}

const repoPath = (path: string) => relative(ROOT, path).split(sep).join('/');

const FILES = listFiles(SRC);

/** Whether a string literal is a module path or a type, not a value. */
function isNotAValue(node: ts.Node): boolean {
  const parent = node.parent;
  if (!parent) return false;
  return (
    ts.isLiteralTypeNode(parent) ||
    ts.isExternalModuleReference(parent) ||
    ((ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent)) &&
      parent.moduleSpecifier === node)
  );
}

/** Every literal in a source file whose text names a catalogue. */
function namedLiterals(path: string): string[] {
  const text = readFileSync(path, 'utf8');
  if (!NAMES.test(text)) return [];
  const kind = path.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const source = ts.createSourceFile(
    path,
    text,
    ts.ScriptTarget.Latest,
    true,
    kind,
  );
  const found: string[] = [];
  const visit = (node: ts.Node) => {
    let value: string | null = null;
    if (ts.isStringLiteral(node) && !isNotAValue(node)) value = node.text;
    else if (ts.isNoSubstitutionTemplateLiteral(node)) value = node.text;
    else if (
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node)
    )
      value = node.text;
    else if (ts.isJsxText(node)) value = node.getText(source);
    if (value !== null && NAMES.test(value)) found.push(value);
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

describe('the site names no outside catalogue', () => {
  it('finds the source files it reads', () => {
    expect(FILES.length).toBeGreaterThan(500);
  });

  it('has no string, template or JSX text naming one', () => {
    const offending: string[] = [];
    for (const path of FILES) {
      if (!/\.(ts|tsx)$/.test(path)) continue;
      const allowed = ALLOWED[repoPath(path)] ?? [];
      for (const literal of namedLiterals(path))
        if (!allowed.includes(literal))
          offending.push(`${repoPath(path)}: ${JSON.stringify(literal)}`);
    }
    expect(offending).toEqual([]);
  });

  it('has no data file naming one or linking to one', () => {
    const offending = FILES.filter(
      (path) =>
        path.endsWith('.json') && NAMES.test(readFileSync(path, 'utf8')),
    ).map(repoPath);
    expect(offending).toEqual([]);
  });

  it('allows only literals that are still there', () => {
    for (const [file, literals] of Object.entries(ALLOWED)) {
      const found = namedLiterals(join(ROOT, file));
      for (const literal of literals) expect(found, file).toContain(literal);
    }
  });
});
