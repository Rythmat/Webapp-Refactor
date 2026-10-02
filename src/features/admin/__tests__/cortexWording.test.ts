import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

/**
 * The console calls its graph Cortex (owner, 1 Oct 2026: "Rename the Mind
 * Map to 'Cortex'"). No text the console can show may still call it the
 * mind map or the Atlas graph: not a heading, a pill, a link, a tooltip, an
 * aria-label, a toast, an empty state or a live announcement. "Open in mind
 * map" is "Open in Cortex" now, and so is the song editor's old "Open in
 * the graph".
 *
 * Like the catalogue-name guard beside it (noSourceNames.test.ts), this
 * reads every source file of the console that is not a test — everything
 * under src/features/admin, and the console's frame and sidebar under
 * src/layouts — parses it with the TypeScript parser, and looks at every
 * string literal, template literal and piece of JSX text, because those are
 * what can end up on screen. Comments, identifiers (`MindMapPage` may keep
 * its name), module paths and string literal types are not on screen and
 * are not checked.
 */

const SRC = join(__dirname, '..', '..', '..');
const ROOT = join(SRC, '..');

/** The console's own code: its pages, and the frame and sidebar around them. */
const SCANNED = [join(SRC, 'features', 'admin'), join(SRC, 'layouts')];

/**
 * The old names. Whole words only, so an identifier such as `MindMapPage`
 * written into a string (a lazy import's path) is not mistaken for one.
 */
const OLD_NAMES = /\bmind[\s-]*map\b|\batlas\s+graph\b|\bopen in the graph\b/i;

/** Folders that are not part of the console, or are other agents' scratch. */
const SKIPPED_DIRS = new Set(['node_modules', '__tests__', '__mocks__']);

const isScratchDir = (name: string) => /^__.*tmp/i.test(name);

const isTestFile = (name: string) => /\.(test|spec)\.[cm]?[jt]sx?$/.test(name);

function listFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIPPED_DIRS.has(entry.name) || isScratchDir(entry.name)) continue;
      listFiles(path, out);
    } else if (/\.(ts|tsx)$/.test(entry.name) && !isTestFile(entry.name)) {
      out.push(path);
    }
  }
  return out;
}

const repoPath = (path: string) => relative(ROOT, path).split(sep).join('/');

const FILES = SCANNED.flatMap((dir) => listFiles(dir));

/** Whether a string literal is a module path or a type, not a value. */
function isNotAValue(node: ts.Node): boolean {
  const parent = node.parent;
  if (!parent) return false;
  return (
    ts.isLiteralTypeNode(parent) ||
    ts.isExternalModuleReference(parent) ||
    ((ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent)) &&
      parent.moduleSpecifier === node) ||
    // A lazy page's `import('./content/graph/MindMapPage')`.
    (ts.isCallExpression(parent) &&
      parent.expression.kind === ts.SyntaxKind.ImportKeyword)
  );
}

/** Every literal in a file's source that still uses an old name. */
function oldNamesIn(fileName: string, text: string): string[] {
  if (!OLD_NAMES.test(text)) return [];
  const kind = fileName.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const source = ts.createSourceFile(
    fileName,
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
    if (value !== null && OLD_NAMES.test(value)) found.push(value.trim());
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

describe('the console calls its graph Cortex', () => {
  it('reads the console’s source files', () => {
    expect(FILES.length).toBeGreaterThan(250);
    expect(FILES.map(repoPath)).toContain(
      'src/layouts/DashboardLayout/Sidebar.tsx',
    );
    expect(FILES.map(repoPath)).toContain(
      'src/features/admin/content/graph/MindMapPage.tsx',
    );
  });

  it('shows no "mind map", "Atlas graph" or "Open in the graph" anywhere', () => {
    const offending: string[] = [];
    for (const path of FILES) {
      for (const literal of oldNamesIn(path, readFileSync(path, 'utf8')))
        offending.push(`${repoPath(path)}: ${JSON.stringify(literal)}`);
    }
    expect(offending).toEqual([]);
  });

  it('would notice an old name in any text that can be shown', () => {
    const page = `
      // The mind map's page: a comment is not on screen.
      import { MindMapPage } from './content/graph/MindMapPage';
      const Lazy = lazy(() => import('./content/graph/MindMapPage'));
      type Name = 'Mind map';
      const title = 'The Atlas graph';
      const label = \`Mind map of \${name}\`;
      export const Page = () => (
        <nav aria-label="Graph views">
          <a title="Open in the mind-map">Open in mind map</a>
          <a>Open in the graph</a>
          <h1>Cortex</h1>
        </nav>
      );
    `;
    expect(oldNamesIn('page.tsx', page)).toEqual([
      'The Atlas graph',
      'Mind map of',
      'Open in the mind-map',
      'Open in mind map',
      'Open in the graph',
    ]);
  });
});
