// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { THEMES } from '@/daw/constants/themes';
import { DAW_BODY_CLASS } from '@/daw/hooks/useDawBodyTokens';
import { installDawCss } from './dawTokens';

// ── body.daw-active: the DAW palette for portaled overlays ──────────────────
// Dialogs and popovers portal to <body>, outside .daw-root. While the editor
// or one of those overlays is mounted, useDawBodyTokens sets body.daw-active,
// and daw.css declares the --color-* tokens there too. Only those: the rest of
// the app keeps its own fonts, text colour and glass tokens while the editor
// is open.

// The selector daw.css must use for the class the hook sets.
const ON_BODY = `body.${DAW_BODY_CLASS}`;

let removeCss: () => void;
beforeAll(() => {
  removeCss = installDawCss();
});
afterAll(() => removeCss());
afterEach(() => document.body.classList.remove(DAW_BODY_CLASS));

/** Every style rule in daw.css (the only sheet here), with its selectors split. */
function styleRules(): { selectors: string[]; style: CSSStyleDeclaration }[] {
  const sheets = [...document.styleSheets];
  expect(sheets).toHaveLength(1);
  return [...sheets[0].cssRules]
    .filter((r): r is CSSStyleRule => r instanceof CSSStyleRule)
    .map((r) => ({
      selectors: r.selectorText.split(',').map((s) => s.trim()),
      style: r.style,
    }));
}

/** The properties a rule declares, by name. */
function declared(style: CSSStyleDeclaration): Map<string, string> {
  const out = new Map<string, string>();
  for (let i = 0; i < style.length; i++) {
    const name = style[i];
    out.set(name, style.getPropertyValue(name).trim());
  }
  return out;
}

function declarationsFor(selector: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const rule of styleRules()) {
    if (!rule.selectors.includes(selector)) continue;
    for (const [name, value] of declared(rule.style)) out.set(name, value);
  }
  return out;
}

describe('daw.css token scope', () => {
  it('declares every --color-* token on body.daw-active, and nothing else', () => {
    const onBody = declarationsFor(ON_BODY);
    const onRoot = declarationsFor('.daw-root');
    const colorTokens = [...onRoot.keys()].filter((n) =>
      n.startsWith('--color-'),
    );

    expect(colorTokens.length).toBeGreaterThan(10);
    expect([...onBody.keys()].sort()).toEqual(colorTokens.sort());
    for (const name of colorTokens) {
      expect(onBody.get(name), name).toBe(onRoot.get(name));
    }
  });

  it('keeps the glass tokens, font and text colour on .daw-root only', () => {
    const onBody = declarationsFor(ON_BODY);
    const onRoot = declarationsFor('.daw-root');
    for (const name of ['--glass-border', 'font-family', 'color']) {
      expect(onRoot.has(name), name).toBe(true);
      expect(onBody.has(name), name).toBe(false);
    }
  });

  it('gives <body> the palette only while the class is set', () => {
    const body = () => getComputedStyle(document.body);
    expect(body().getPropertyValue('--color-surface-2').trim()).toBe('');

    document.body.classList.add(DAW_BODY_CLASS);
    expect(body().getPropertyValue('--color-surface-2').trim()).toBe('#1e1e1e');
    expect(body().getPropertyValue('--color-accent').trim()).toBe('#7ecfcf');
    expect(body().getPropertyValue('--glass-border').trim()).toBe('');
  });

  // useTheme writes THEMES.dark inline on .daw-root, over daw.css. A portal
  // reads daw.css's values from <body>, so the two copies must agree or an
  // overlay would not match the editor behind it (until 2.1 removes THEMES).
  it('matches the runtime copy useTheme writes on .daw-root', () => {
    const onBody = declarationsFor(ON_BODY);
    const runtime = Object.entries(THEMES.dark).filter(([name]) =>
      name.startsWith('--color-'),
    );
    expect(runtime.length).toBeGreaterThan(0);
    for (const [name, value] of runtime) {
      expect(onBody.get(name), name).toBe(value);
    }
  });
});
