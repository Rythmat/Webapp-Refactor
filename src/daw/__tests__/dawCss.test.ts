// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DAW_CSS, alphaOf, installDawCss, resolveVars } from './dawTokens';

// ── One palette, on :root (plan 2.1) ────────────────────────────────────────
// The editor's tokens are the --daw-* properties daw-tokens.css declares on
// :root, which src/main.tsx loads on every page. Dialogs, popovers and the
// lesson overlay portal to <body>, outside .daw-root, and read the same
// values from there, so nothing has to copy a palette onto them (the old
// body.daw-active class, the THEMES inline copy and the per-portal copies are
// gone). daw.css keeps only the editor's base styles.

const SRC = join(dirname(fileURLToPath(import.meta.url)), '../..');

let removeCss: () => void;
beforeAll(() => {
  removeCss = installDawCss();
});
afterAll(() => removeCss());

describe('the DAW tokens', () => {
  it('are loaded by src/main.tsx, after the app theme they alias', () => {
    const main = readFileSync(join(SRC, 'main.tsx'), 'utf8');
    const theme = main.indexOf("import './styles/appTheme.css';");
    const tokens = main.indexOf("import './daw/ui/daw-tokens.css';");
    expect(theme).toBeGreaterThan(-1);
    expect(tokens).toBeGreaterThan(theme);
  });

  it('reach an overlay portaled to <body>, outside .daw-root', () => {
    const card = document.createElement('div');
    card.style.background = 'var(--daw-popover)';
    card.style.color = 'var(--daw-text)';
    document.body.appendChild(card);
    expect(card.closest('.daw-root')).toBeNull();
    const background = resolveVars(card, card.style.background);
    expect(background).toBe('#141416');
    expect(alphaOf(background)).toBe(1);
    expect(resolveVars(card, card.style.color)).toBe('#e8e8f0');
    card.remove();
  });
});

describe('daw.css', () => {
  it('declares no tokens of its own, and no legacy --color-* or glass ones', () => {
    expect(DAW_CSS).not.toMatch(/--(?:daw|color|glass|grain)-[\w-]+\s*:/);
    expect(DAW_CSS).not.toMatch(/var\(--(?:color|glass|grain)-/);
    expect(DAW_CSS).not.toContain('glass-panel');
    expect(DAW_CSS).not.toContain('daw-active');
  });

  it('keeps the editor font and text colour on .daw-root', () => {
    const root = document.createElement('div');
    root.className = 'daw-root';
    document.body.appendChild(root);
    const style = getComputedStyle(root);
    expect(style.fontFamily).toContain('Glacial Indifference');
    expect(resolveVars(root, style.color || 'var(--daw-text)')).toMatch(
      /#e8e8f0|rgb\(232, 232, 240\)/,
    );
    root.remove();
  });
});
