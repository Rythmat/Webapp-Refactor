// @vitest-environment jsdom
import { colord } from 'colord';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { TYPE_CLASS } from '../styles';
import {
  COLOR,
  DAW_PALETTE_EVENT,
  DAW_TOKENS_STYLE_ID,
  dawTokenDeclarations,
  dawTokensCss,
  getDawPalette,
  installDawTokens,
  invalidateDawPalette,
  LABEL_FLOOR_PX,
  MOTION,
  SIZE,
  TYPE,
  Z,
} from '../tokens';

// ── The token layer (plan 2.1, built in its final home with 2.2) ────────────
// tokens.ts is the one source: it writes the --daw-* stylesheet on :root,
// aliases the app's --ui-* tokens where the look already has the colour,
// and resolves the palette for canvases.

/** The app theme the aliases point at, read as the browser gets it. */
const APP_THEME = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../../../styles/appTheme.css'),
  'utf8',
);

/** The --ui-* tokens appTheme.css declares, as HSL triplets. */
const uiTokens = new Map(
  [...APP_THEME.matchAll(/--ui-([\w-]+):\s*([^;]+);/g)].map((m) => [
    m[1],
    m[2].trim(),
  ]),
);

const declared = new Map(dawTokenDeclarations());

let added: HTMLStyleElement[] = [];
const addCss = (css: string) => {
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
  added.push(style);
};

afterEach(() => {
  added.forEach((style) => style.remove());
  added = [];
  invalidateDawPalette();
});

describe('the stylesheet', () => {
  it('declares every colour on :root as --daw-<name>', () => {
    const css = dawTokensCss();
    expect(css.startsWith(':root {')).toBe(true);
    for (const [name, token] of Object.entries(COLOR)) {
      expect(css).toContain(`  --daw-${name}: ${token.css};\n`);
    }
  });

  it('sets the dimmest text to #8e8ea3', () => {
    expect(declared.get('--daw-text-3')).toBe('#8e8ea3');
  });

  it("aliases the app's --ui-* tokens for every shared role", () => {
    const shared = {
      bg: 'background',
      'surface-1': 'card',
      popover: 'popover',
      hover: 'muted',
      selected: 'secondary',
      hairline: 'border',
      outline: 'input',
      focus: 'ring',
      text: 'foreground',
      primary: 'primary',
      'on-primary': 'primary-foreground',
    } as const;
    for (const [name, ui] of Object.entries(shared)) {
      expect(declared.get(`--daw-${name}`), name).toBe(`hsl(var(--ui-${ui}))`);
    }
  });

  it('points every alias at a --ui-* token appTheme.css has, and knows its colour', () => {
    const aliases = Object.entries(COLOR).filter(([, t]) =>
      t.css.startsWith('hsl(var(--ui-'),
    );
    expect(aliases.length).toBeGreaterThanOrEqual(11);
    for (const [name, token] of aliases) {
      const ui = /--ui-([\w-]+)/.exec(token.css)![1];
      const triplet = uiTokens.get(ui);
      expect(triplet, `--ui-${ui} (for ${name})`).toBeDefined();
      const [h, s, l] = triplet!.split(/\s+/).map((part) => parseFloat(part));
      // The fallback is what the alias resolves to, so a canvas falling back
      // paints the same colour the chrome shows.
      expect(colord({ h, s, l }).toHex(), name).toBe(token.value.toLowerCase());
    }
  });

  it('declares type, size, spacing, radius, layer, motion and shadow steps', () => {
    for (const name of Object.keys(TYPE)) {
      expect(declared.has(`--daw-font-${name}`), name).toBe(true);
      expect(declared.has(`--daw-leading-${name}`), name).toBe(true);
    }
    expect(declared.get('--daw-size-control')).toBe('28px');
    expect(declared.get('--daw-size-hit-min')).toBe('24px');
    expect(declared.get('--daw-radius-pill')).toBe('9999px');
    expect(declared.get('--daw-z-modal')).toBe('50');
    expect(declared.get('--daw-motion-fast')).toBe('120ms');
    expect(declared.has('--daw-shadow-pop')).toBe(true);
    expect(declared.get('--daw-selection-rgb')).toBe('255, 255, 255');
  });

  it('stops all motion under prefers-reduced-motion', () => {
    const css = dawTokensCss();
    const reduced = css.slice(
      css.indexOf('@media (prefers-reduced-motion: reduce)'),
    );
    for (const name of Object.keys(MOTION)) {
      expect(reduced).toContain(`--daw-motion-${name}: 0ms;`);
    }
  });

  it('carries no accent colour: no teal, no brand yellow', () => {
    const css = dawTokensCss().toLowerCase();
    expect(css).not.toMatch(/7ecfcf|126,\s*207,\s*207|facc15|ffcc33/);
  });
});

describe('the scales', () => {
  it('keeps text at the 12 px floor, with 11 px only for uppercase micro labels', () => {
    expect(LABEL_FLOOR_PX).toBe(12);
    for (const [name, step] of Object.entries(TYPE)) {
      if (step.size < LABEL_FLOOR_PX) {
        expect(name).toBe('micro');
        expect(step.size).toBe(11);
        expect('uppercase' in step && step.uppercase).toBe(true);
      }
      expect([400, 700]).toContain(step.weight);
    }
  });

  it('makes 28 px the control height and nothing smaller than 24 px', () => {
    expect(SIZE.control).toBe(28);
    for (const name of [
      'control',
      'control-sm',
      'control-lg',
      'play',
      'hit-min',
    ] as const) {
      expect(SIZE[name], name).toBeGreaterThanOrEqual(24);
    }
  });

  it('stacks the layers in order: popovers over dialogs, the lesson over the chrome', () => {
    const order = [
      'sticky',
      'dock',
      'panel',
      'modal',
      'popover',
      'tooltip',
      'tutorial',
      'toast',
    ] as const;
    expect(Object.keys(Z)).toEqual([...order]);
    for (let i = 1; i < order.length; i++) {
      expect(Z[order[i]]).toBeGreaterThan(Z[order[i - 1]]);
    }
  });

  it('gives the type classes the same steps as the tokens', () => {
    for (const name of Object.keys(TYPE) as Array<keyof typeof TYPE>) {
      expect(TYPE_CLASS[name]).toContain(`var(--daw-font-${name})`);
      expect(TYPE_CLASS[name]).toContain(`var(--daw-leading-${name})`);
      expect(TYPE_CLASS[name].includes('font-bold'), name).toBe(
        TYPE[name].weight === 700,
      );
    }
    expect(TYPE_CLASS.micro).toContain('uppercase');
  });
});

describe('installDawTokens', () => {
  it('puts the stylesheet in <head> once, however often it is called', () => {
    document.getElementById(DAW_TOKENS_STYLE_ID)?.remove();
    installDawTokens();
    installDawTokens();
    const styles = document.querySelectorAll(`#${DAW_TOKENS_STYLE_ID}`);
    expect(styles).toHaveLength(1);
    expect(styles[0].parentElement).toBe(document.head);
    expect(styles[0].textContent).toBe(dawTokensCss());
  });

  it('puts the tokens on :root, where a portaled overlay inherits them', () => {
    installDawTokens();
    const root = getComputedStyle(document.documentElement);
    expect(root.getPropertyValue('--daw-text-3').trim()).toBe('#8e8ea3');
    expect(root.getPropertyValue('--daw-z-popover').trim()).toBe('60');
  });

  it('is already done by importing any primitive (styles.ts)', () => {
    // styles.ts ran its install when this file imported it.
    expect(document.getElementById(DAW_TOKENS_STYLE_ID)).not.toBeNull();
  });
});

describe('getDawPalette', () => {
  it("resolves the aliases through the app's theme", () => {
    addCss(APP_THEME);
    const palette = getDawPalette();
    expect(palette.surface1).toBe('hsl(240 6.67% 8.82%)');
    expect(palette.text).toBe('hsl(240 21.05% 92.55%)');
    expect(palette.text3).toBe('#8e8ea3');
    expect(palette.meterClip).toBe('#ef4444');
    expect(palette.selectionRgb).toBe('255, 255, 255');
  });

  it("falls back to each token's own colour when an alias cannot resolve", () => {
    // No appTheme.css here, so var(--ui-card) resolves to nothing.
    const palette = getDawPalette();
    expect(palette.surface1).toBe(COLOR['surface-1'].value);
    expect(palette.onPrimary).toBe('#101012');
  });

  it('has a colour for every token, under its camelCase name', () => {
    const palette = getDawPalette() as unknown as Record<string, string>;
    for (const name of Object.keys(COLOR)) {
      const key = name.replace(/-(\w)/g, (_, c: string) => c.toUpperCase());
      expect(palette[key], name).toBeTruthy();
    }
  });

  it(`caches until '${DAW_PALETTE_EVENT}' says the tokens changed`, () => {
    const first = getDawPalette();
    expect(getDawPalette()).toBe(first);
    window.dispatchEvent(new Event(DAW_PALETTE_EVENT));
    const second = getDawPalette();
    expect(second).not.toBe(first);
    expect(second).toEqual(first);
  });
});
