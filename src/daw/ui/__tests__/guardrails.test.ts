import { readdirSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// ── Design guardrails for the new UI (plan 2.1) ─────────────────────────────
// The neutral look holds by construction: nothing in src/daw/ui carries the
// old teal accent or brand yellow, and the ESLint override for src/daw/ui
// and src/daw/shell rejects colour literals outside tokens.ts, text under
// 11 px and literal z-indexes.

const UI = join(dirname(fileURLToPath(import.meta.url)), '..');
const REPO = join(UI, '../../..');

/** The part of ESLint 8's Node API used here (the package ships no types). */
interface LintResult {
  messages: Array<{ ruleId: string | null; line: number }>;
}
const { ESLint } = createRequire(import.meta.url)('eslint') as {
  ESLint: new (options: { cwd: string }) => {
    lintText(
      code: string,
      options: { filePath: string },
    ): Promise<LintResult[]>;
  };
};

/** Every source file under src/daw/ui, tests aside (they quote the patterns). */
function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      return name === '__tests__' ? [] : sources(path);
    }
    return /\.(tsx?|css)$/.test(name) ? [path] : [];
  });
}

describe('no accent colour in src/daw/ui', () => {
  const files = sources(UI);

  it('scans the primitives, the tokens and the gallery', () => {
    const names = files.map((f) => relative(UI, f));
    expect(names).toContain('tokens.ts');
    expect(names).toContain('Button.tsx');
    expect(names).toContain(join('__gallery__', 'DawUiGallery.tsx'));
  });

  it.each([
    ['the teal accent, by name', /teal/i],
    ['the teal accent, as hex', /7ecfcf/i],
    ['the teal accent, as rgb', /126\s*,\s*207\s*,\s*207/],
    ['brand yellow #facc15', /facc15/i],
    ['the retired brand yellows', /#(FFCC33|FFB219|F2920C|FFE873|FFF9B2)\b/i],
    ["Tailwind's yellow classes (yellow-400 is #facc15)", /\byellow-\d{2,3}\b/],
  ])('carries no %s', (_, pattern) => {
    const hits = files.filter((file) =>
      pattern.test(readFileSync(file, 'utf8')),
    );
    expect(hits.map((f) => relative(REPO, f))).toEqual([]);
  });
});

describe('the ESLint guardrails for src/daw/ui and src/daw/shell', () => {
  const eslint = new ESLint({ cwd: REPO });

  /** The guardrail messages for `code` as if it lived at `path`. */
  async function guardrails(path: string, code: string) {
    const [result] = await eslint.lintText(code, {
      filePath: join(REPO, path),
    });
    return result.messages
      .filter((m) => m.ruleId === 'no-restricted-syntax')
      .map((m) => m.line);
  }

  it('rejects colour literals, small text and literal z-indexes', async () => {
    const code = [
      "export const a = '#7ecfcf';",
      "export const b = 'bg-[#facc15] text-white';",
      'export const c = (x: string) => `border-[#abc] ${x}`;',
      "export const d = 'rgba(255, 255, 255, 0.1)';",
      "export const e = 'text-[10px] font-bold';",
      "export const f = 'text-[0.6rem]';",
      'export const g = { fontSize: 9 };',
      "export const h = { fontSize: '10px' };",
      'export const i = { zIndex: 50 };',
      'export const j = { zIndex: -1 };',
      "export const k = 'absolute z-50 inset-0';",
      "export const l = 'hover:z-[60]';",
      "export const m = (ctx: CanvasRenderingContext2D) => { ctx.font = '10px sans-serif'; };",
      'export const n = () => <text fontSize={9}>x</text>;',
    ].join('\n');
    for (const path of ['src/daw/ui/Probe.tsx', 'src/daw/shell/Probe.tsx']) {
      expect(await guardrails(path, code), path).toEqual([
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14,
      ]);
    }
  }, 60_000);

  it('accepts the token way of saying the same things', async () => {
    const code = [
      "export const a = 'z-[var(--daw-z-modal)] text-[length:var(--daw-font-label)]';",
      "export const b = { zIndex: 'var(--daw-z-modal)', fontSize: 12 };",
      "export const c = 'text-[11px] uppercase text-[12px] bg-daw-surface-1';",
      'export const d = (rgb: string) => `rgba(${rgb}, 0.2)`;',
      "export const e = 'size-12 gap-1 z-auto';",
      "export const f = '#add-track';",
      'export const g = () => <text fontSize={12}>x</text>;',
    ].join('\n');
    expect(await guardrails('src/daw/ui/Probe.tsx', code)).toEqual([]);
  }, 60_000);

  it('lets tokens.ts spell colours, and leaves legacy src/daw alone', async () => {
    const code =
      "export const a = '#ef4444';\nexport const b = { zIndex: 50 };";
    expect(await guardrails('src/daw/ui/tokens.ts', code)).toEqual([]);
    expect(
      await guardrails('src/daw/components/Legacy/Probe.tsx', code),
    ).toEqual([]);
  }, 60_000);
});
