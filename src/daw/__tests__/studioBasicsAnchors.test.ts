import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import {
  INSTRUMENT_FAMILIES,
  SIMPLE_INSTRUMENTS,
} from '@/daw/instruments/simpleInstruments';

/**
 * The Studio Basics anchors (docs/studio-tutorial-anchors.md), held to the
 * code: every id the document lists, and every template it writes with
 * `{…}`, must be rendered as a `data-tutorial-id` somewhere under src/daw,
 * and its instrument and family lists must be the picker's own. So a lesson
 * written from the document never points at a control that isn't there, and
 * the document can't fall behind a renamed anchor.
 *
 * The lessons' own targets are held to the editor by the anchor inventory
 * (components/Tutorial/__tests__/tutorialAnchors.test.ts), which also
 * checks that the file rendering an id is one the editor mounts.
 *
 * Run: npx vitest run src/daw/__tests__/studioBasicsAnchors.test.ts
 */

const DAW = join(__dirname, '..');
const DOC = join(DAW, '..', '..', 'docs', 'studio-tutorial-anchors.md');

function sources(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!['__tests__', '__mocks__', 'node_modules'].includes(entry.name)) {
        sources(path, out);
      }
    } else if (
      /\.tsx?$/.test(entry.name) &&
      !/\.test\.tsx?$/.test(entry.name)
    ) {
      out.push(path);
    }
  }
  return out;
}

/** Every `data-tutorial-id` value under src/daw: exact ids and template heads. */
function renderedAnchors(): { exact: Set<string>; heads: Set<string> } {
  const exact = new Set<string>();
  const heads = new Set<string>();
  const collect = (node: ts.Expression) => {
    if (ts.isParenthesizedExpression(node)) collect(node.expression);
    else if (ts.isStringLiteralLike(node)) exact.add(node.text);
    else if (ts.isTemplateExpression(node)) heads.add(node.head.text);
    else if (ts.isConditionalExpression(node)) {
      collect(node.whenTrue);
      collect(node.whenFalse);
    }
  };
  for (const path of sources(DAW)) {
    const text = readFileSync(path, 'utf8');
    if (!text.includes('data-tutorial-id')) continue;
    const source = ts.createSourceFile(
      path,
      text,
      ts.ScriptTarget.Latest,
      true,
      path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );
    const visit = (node: ts.Node) => {
      if (
        ts.isJsxAttribute(node) &&
        node.name.getText(source) === 'data-tutorial-id' &&
        node.initializer
      ) {
        const value = node.initializer;
        if (ts.isStringLiteral(value)) exact.add(value.text);
        else if (ts.isJsxExpression(value) && value.expression) {
          collect(value.expression);
        }
      }
      // An attribute handed on as an object ({ 'data-tutorial-id': … }), as
      // DawDialog's `data` takes it.
      if (
        ts.isPropertyAssignment(node) &&
        ts.isStringLiteral(node.name) &&
        node.name.text === 'data-tutorial-id'
      ) {
        collect(node.initializer);
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return { exact, heads };
}

const DOC_TEXT = readFileSync(DOC, 'utf8');

/** The ids the document's tables list, in their first column. */
const TABLE_IDS = [...DOC_TEXT.matchAll(/^\|\s*`([^`]+)`\s*\|/gm)].map(
  (m) => m[1],
);

/** The instrument ids the document lists, by family. */
const LISTED_INSTRUMENTS = new Map(
  [...DOC_TEXT.matchAll(/^- \*\*([a-z-]+)\*\*: (.+)$/gm)].map((m) => [
    m[1],
    [...m[2].matchAll(/`instrument-([a-z0-9-]+)`/g)].map((id) => id[1]),
  ]),
);

const ANCHORS = renderedAnchors();

/** Whether `id` is rendered: exactly, or by a template whose head starts it. */
function rendered(id: string): boolean {
  if (ANCHORS.exact.has(id)) return true;
  return [...ANCHORS.heads].some((head) => head && id.startsWith(head));
}

describe('the Studio Basics anchor document', () => {
  it('lists the anchors', () => {
    // A guard on the parsing: the document's tables were read.
    expect(TABLE_IDS.length).toBeGreaterThan(80);
    expect(ANCHORS.exact.size).toBeGreaterThan(80);
  });

  it.each(TABLE_IDS)('%s is rendered in src/daw', (id) => {
    const brace = id.indexOf('{');
    if (brace === -1) {
      expect(rendered(id), `no data-tutorial-id renders ${id}`).toBe(true);
    } else {
      const head = id.slice(0, brace);
      expect(
        ANCHORS.heads.has(head),
        `no data-tutorial-id template starts \`${head}\``,
      ).toBe(true);
    }
  });

  it('lists the picker’s families and every instrument in its family', () => {
    expect([...LISTED_INSTRUMENTS.keys()]).toEqual(
      INSTRUMENT_FAMILIES.map((f) => f.id),
    );
    for (const family of INSTRUMENT_FAMILIES) {
      expect(LISTED_INSTRUMENTS.get(family.id), family.id).toEqual(
        SIMPLE_INSTRUMENTS.filter((i) => i.family === family.id).map(
          (i) => i.id,
        ),
      );
    }
  });
});
