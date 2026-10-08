import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import {
  dirname,
  join,
  relative,
  resolve as resolvePath,
  sep,
} from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { FX_CATALOG } from '@/daw/data/libraryItems';
import { defaultReturns } from '@/daw/store/returnsSlice';
import { TUTORIALS } from '../tutorials';

/**
 * Anchor inventory for the Studio lessons (milestone 1.0 baseline). Every id
 * a lesson step spotlights (`target` in tutorials.ts) must be rendered by the
 * editor as a `data-tutorial-id`, so a renamed or removed anchor fails here,
 * without a browser, before a student meets a lesson that points at nothing.
 *
 * The test reads every source file under src/daw that is not a test, parses
 * it with the TypeScript parser and collects each `data-tutorial-id` JSX
 * attribute:
 *
 * - a string literal, or a string in either branch of a conditional
 *   (`a ? 'add-track-synth' : …`), is an exact id;
 * - a template literal (`chanstrip-tab-${tab.id}`) is rendered for every
 *   value of the data that feeds it, which TEMPLATE_SOURCES names (the dock's
 *   tab list, the FX catalog, the return buses, …), so `chanstrip-tab-prism`
 *   passes and a typo such as `chanstrip-tab-prsim` does not.
 *
 * A file that renders an id must also be reachable from the editor: the
 * test follows the imports (static and dynamic) from src/daw/DawApp.tsx, so
 * an anchor left only in a component nothing mounts fails too. Whether a
 * reachable component is on screen at that step is for the browser
 * walkthrough (scripts/studio-perf/lessons.mjs) to say.
 *
 * Run: npx vitest run src/daw/components/Tutorial/__tests__/tutorialAnchors.test.ts
 *
 * When a real id goes missing because of a known product bug, keep the case
 * and add it to KNOWN_MISSING with the audit finding that explains it, so it
 * runs as `it.fails` and starts failing (as a reminder) once it is fixed.
 */

const DAW = join(__dirname, '..', '..', '..');
const SRC = join(DAW, '..');
const ROOT = join(SRC, '..');

/** The editor's root component: what /studio/editor mounts. */
const EDITOR_ENTRY = join(DAW, 'DawApp.tsx');

/**
 * Step target ids missing from the editor today, as
 * `'<lesson id>/<step id>/<target id>': '<audit finding id>: why'`.
 * Empty: every id the lessons use is rendered.
 */
const KNOWN_MISSING: Readonly<Record<string, string>> = {};

const SKIPPED_DIRS = new Set(['node_modules', '__tests__', '__mocks__']);

const isTestFile = (name: string) => /\.(test|spec)\.[cm]?[jt]sx?$/.test(name);

function listSources(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIPPED_DIRS.has(entry.name)) listSources(path, out);
    } else if (/\.tsx?$/.test(entry.name) && !isTestFile(entry.name)) {
      out.push(path);
    }
  }
  return out;
}

const repoPath = (path: string) => relative(ROOT, path).split(sep).join('/');

const parse = (path: string) =>
  ts.createSourceFile(
    path,
    readFileSync(path, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

interface Anchors {
  /** Exact ids, each with the files (absolute paths) that render it. */
  exact: Map<string, Set<string>>;
  /** Template-literal heads (the text before `${`), with their files. */
  templates: Map<string, Set<string>>;
}

const add = (map: Map<string, Set<string>>, key: string, file: string) => {
  const files = map.get(key) ?? new Set<string>();
  files.add(file);
  map.set(key, files);
};

/** Collects what one `data-tutorial-id` value can evaluate to. */
function collectValue(node: ts.Expression, file: string, anchors: Anchors) {
  if (ts.isParenthesizedExpression(node)) {
    collectValue(node.expression, file, anchors);
  } else if (ts.isStringLiteralLike(node)) {
    add(anchors.exact, node.text, file);
  } else if (ts.isTemplateExpression(node)) {
    add(anchors.templates, node.head.text, file);
  } else if (ts.isConditionalExpression(node)) {
    collectValue(node.whenTrue, file, anchors);
    collectValue(node.whenFalse, file, anchors);
  }
  // Anything else (an identifier, `undefined`, a call) names no id here.
}

function collectAnchors(files: string[]): Anchors {
  const anchors: Anchors = { exact: new Map(), templates: new Map() };
  for (const path of files) {
    if (!readFileSync(path, 'utf8').includes('data-tutorial-id')) continue;
    const source = parse(path);
    const visit = (node: ts.Node) => {
      if (
        ts.isJsxAttribute(node) &&
        node.name.getText(source) === 'data-tutorial-id' &&
        node.initializer
      ) {
        const value = node.initializer;
        if (ts.isStringLiteral(value)) add(anchors.exact, value.text, path);
        else if (ts.isJsxExpression(value) && value.expression) {
          collectValue(value.expression, path, anchors);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return anchors;
}

const ANCHORS = collectAnchors(listSources(DAW));

// ── What each template's `${…}` can be ───────────────────────────────────

const unwrap = (node: ts.Expression): ts.Expression =>
  ts.isAsExpression(node) ||
  ts.isSatisfiesExpression(node) ||
  ts.isTypeAssertionExpression(node) ||
  ts.isParenthesizedExpression(node)
    ? unwrap(node.expression)
    : node;

/**
 * The string values of `prop` in `const name = [{ … }, …]` (or a single
 * `const name = { … }`) in `file` under src/daw: the lists a component keeps
 * to itself (its tabs, views, cards) are read from its source.
 */
function constValues(file: string, name: string, prop: string): string[] {
  const source = parse(join(DAW, file));
  const values: string[] = [];
  const fromObject = (node: ts.Expression) => {
    const object = unwrap(node);
    if (!ts.isObjectLiteralExpression(object)) return;
    for (const p of object.properties) {
      if (!ts.isPropertyAssignment(p) || p.name.getText(source) !== prop) {
        continue;
      }
      const value = unwrap(p.initializer);
      if (ts.isStringLiteralLike(value)) values.push(value.text);
    }
  };
  const visit = (node: ts.Node) => {
    if (
      ts.isVariableDeclaration(node) &&
      node.name.getText(source) === name &&
      node.initializer
    ) {
      const init = unwrap(node.initializer);
      if (ts.isArrayLiteralExpression(init)) init.elements.forEach(fromObject);
      else fromObject(init);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return values;
}

/** Effects the FX browser offers, and so the slots the effect rack can show. */
const AUDIO_EFFECTS = FX_CATALOG.flatMap((item) =>
  item.dragPayload.kind === 'audio-effect' ? [item.dragPayload.effectType] : [],
);

const RETURN_IDS = defaultReturns().map((bus) => bus.id);

interface TemplateSource {
  /** The file under src/daw whose template renders these ids. */
  file: string;
  /** Every value its `${…}` can take: the data that feeds the template. */
  suffixes: () => string[];
}

/** The template anchors the lessons can use, by the text before `${`. */
const TEMPLATE_SOURCES: Readonly<Record<string, TemplateSource>> = {
  'add-track-': {
    file: 'components/Mixer/AddTrackMenu.tsx',
    // One card per template; the Synth card renders the exact id
    // 'add-track-synth' instead (the ternary around the template).
    suffixes: () =>
      constValues(
        'components/Mixer/AddTrackMenu.tsx',
        'TRACK_TEMPLATES',
        'instrument',
      ).filter((instrument) => instrument !== 'oracle-synth'),
  },
  'chanstrip-tab-': {
    file: 'components/ChannelStrip/ChannelStrip.tsx',
    suffixes: () =>
      constValues('components/ChannelStrip/ChannelStrip.tsx', 'TABS', 'id'),
  },
  'view-switch-': {
    file: 'components/Transport/TransportBar.tsx',
    suffixes: () => [
      ...constValues('components/Transport/TransportBar.tsx', 'VIEWS', 'id'),
      ...constValues(
        'components/Transport/TransportBar.tsx',
        'PRACTICE_VIEW',
        'id',
      ),
    ],
  },
  'fx-add-': {
    file: 'components/Effects/FxBrowser.tsx',
    suffixes: () => AUDIO_EFFECTS,
  },
  'fx-slot-': {
    file: 'components/Effects/EffectsPanel.tsx',
    suffixes: () => AUDIO_EFFECTS,
  },
  'mixer-sends-': {
    file: 'components/Studio/StudioView.tsx',
    suffixes: () => RETURN_IDS,
  },
  'return-strip-': {
    file: 'components/Studio/StudioView.tsx',
    suffixes: () => RETURN_IDS,
  },
  'return-fx-': {
    file: 'components/Studio/StudioView.tsx',
    suffixes: () => RETURN_IDS,
  },
  'sampler-mode-': {
    file: 'components/Controls/SamplerChopsView.tsx',
    suffixes: () =>
      constValues(
        'components/Controls/SamplerChopsView.tsx',
        'PLAYBACK_MODES',
        'id',
      ),
  },
};

// ── What the editor can mount ─────────────────────────────────────────────

const EXTENSIONS = ['', '.ts', '.tsx', '/index.ts', '/index.tsx'];

/** A module specifier as Vite resolves it (aliases from vite.config.ts). */
function resolveImport(specifier: string, from: string): string | null {
  const bare = specifier.split('?')[0];
  let base: string;
  if (bare === '@prism/engine') base = join(DAW, 'prism-engine/index.ts');
  else if (bare.startsWith('@/')) base = join(SRC, bare.slice(2));
  else if (bare.startsWith('.')) base = resolvePath(dirname(from), bare);
  else return null; // a package
  for (const extension of EXTENSIONS) {
    const path = base + extension;
    if (/\.tsx?$/.test(path) && existsSync(path) && statSync(path).isFile()) {
      return path;
    }
  }
  return null;
}

/**
 * Every source file the editor's module graph reaches from `entry`, through
 * static imports, re-exports and dynamic `import()` (lazy views and dialogs).
 */
function reachableFrom(entry: string): Set<string> {
  const seen = new Set<string>();
  const stack = [entry];
  while (stack.length) {
    const file = stack.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    const { importedFiles } = ts.preProcessFile(
      readFileSync(file, 'utf8'),
      true,
      true,
    );
    for (const { fileName } of importedFiles) {
      const next = resolveImport(fileName, file);
      if (next && !seen.has(next)) stack.push(next);
    }
  }
  return seen;
}

const REACHABLE = reachableFrom(EDITOR_ENTRY);

// ── Resolving a step's id ─────────────────────────────────────────────────

/**
 * The files that render `id`, or why none does: an exact id, or a template
 * whose data includes the rest of the id.
 */
function rendererOf(id: string): { files: string[] } | { error: string } {
  const exact = ANCHORS.exact.get(id);
  if (exact) return { files: [...exact] };
  // The longest head first (`fx-add-` before a `fx-`), and an id fails only
  // when no template that could render it does.
  const heads = [...ANCHORS.templates.keys()]
    .filter((head) => id.startsWith(head))
    .sort((a, b) => b.length - a.length);
  const errors: string[] = [];
  for (const head of heads) {
    const files = [...(ANCHORS.templates.get(head) ?? [])];
    const source = TEMPLATE_SOURCES[head];
    if (!source) {
      errors.push(
        `${id} would come from the template \`${head}\${…}\` in ${files.map(repoPath).join(', ')}; add its data to TEMPLATE_SOURCES`,
      );
      continue;
    }
    const values = source.suffixes();
    if (values.includes(id.slice(head.length))) return { files };
    errors.push(
      `the template \`${head}\${…}\` renders ${values.map((v) => head + v).join(', ')}, not ${id}`,
    );
  }
  return {
    error: errors.length
      ? errors.join('; ')
      : `no data-tutorial-id="${id}" under src/daw`,
  };
}

const targetsOf = (target: string | string[] | undefined) =>
  !target ? [] : Array.isArray(target) ? target : [target];

describe('tutorial anchor inventory', () => {
  it('finds the anchors the editor renders', () => {
    // A guard on the parser: if this drops, the test is reading nothing.
    expect(ANCHORS.exact.size).toBeGreaterThan(20);
    expect(ANCHORS.exact.get('add-track-button')).toBeDefined();
  });

  it('follows the editor’s imports', () => {
    // A guard on the import walk: the lesson layer is mounted by DawApp.
    expect(REACHABLE.size).toBeGreaterThan(100);
    expect(
      REACHABLE.has(join(DAW, 'components/Tutorial/TutorialLayer.tsx')),
    ).toBe(true);
  });

  describe.each(Object.entries(TEMPLATE_SOURCES))(
    'the template %s${…}',
    (head, source) => {
      it(`is still rendered in ${source.file}`, () => {
        const files = [...(ANCHORS.templates.get(head) ?? [])].map(repoPath);
        expect(files).toContain(repoPath(join(DAW, source.file)));
      });

      it('has data for its ${…}', () => {
        // Empty means the list it reads (a renamed const, a moved prop) is
        // gone, and every id from this template would fail below.
        expect(source.suffixes().length).toBeGreaterThan(0);
      });
    },
  );

  for (const lesson of TUTORIALS) {
    describe(lesson.id, () => {
      for (const step of lesson.steps) {
        for (const id of targetsOf(step.target)) {
          const key = `${lesson.id}/${step.id}/${id}`;
          const finding = KNOWN_MISSING[key];
          const test = finding ? it.fails : it;
          test(`${step.id} → ${id}${finding ? ` (${finding})` : ''}`, () => {
            const found = rendererOf(id);
            if ('error' in found) expect.fail(found.error);
            const mounted = found.files.filter((file) => REACHABLE.has(file));
            expect(
              mounted,
              `${id} is rendered only in ${found.files.map(repoPath).join(', ')}, which src/daw/DawApp.tsx never imports`,
            ).not.toHaveLength(0);
          });
        }
      }
    });
  }
});
