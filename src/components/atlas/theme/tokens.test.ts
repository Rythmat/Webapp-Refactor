import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ATLAS_LAYER, ATLAS_Z } from '@/components/atlas/theme/layers';
import {
  ATLAS_COLOR,
  ATLAS_TAILWIND_COLORS,
  atlasTokensCss,
} from '@/components/atlas/theme/tokens';

// Read from disk: the test run stubs out imported CSS.
const css = readFileSync(new URL('../index.css', import.meta.url), 'utf8');

/** Every source file of the page, as text, keyed by path. */
const SOURCES = import.meta.glob<string>('../**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
});

/** `#rrggbb` or `rgba(r, g, b, a)` as straight channels and alpha. */
const parse = (color: string): [number, number, number, number] => {
  const hex = /^#([0-9a-f]{6})$/i.exec(color);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1];
  }
  const rgba = /^rgba\((\d+), (\d+), (\d+), ([\d.]+)\)$/.exec(color);
  if (!rgba) throw new Error(`unparsed colour ${color}`);
  return [+rgba[1], +rgba[2], +rgba[3], +rgba[4]];
};

const over = (
  top: string | [number, number, number, number],
  under: [number, number, number],
): [number, number, number] => {
  const [r, g, b, a] = typeof top === 'string' ? parse(top) : top;
  return [r, g, b].map((c, i) => c * a + under[i] * (1 - a)) as [
    number,
    number,
    number,
  ];
};

const luminance = (rgb: [number, number, number]): number => {
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a: [number, number, number], b: [number, number, number]) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const panelAt95 = (behind: [number, number, number]) => {
  const [r, g, b] = parse(ATLAS_COLOR.panel.value);
  return over([r, g, b, 0.95], behind);
};

describe('atlas tokens', () => {
  it('index.css declares exactly the tokens tokens.ts lists', () => {
    for (const line of atlasTokensCss().split('\n')) {
      expect(css).toContain(line);
    }
    const declared = [...css.matchAll(/(--atlas-[\w-]+):/g)].map((m) => m[1]);
    expect(new Set(declared)).toEqual(
      new Set(Object.keys(ATLAS_COLOR).map((name) => `--atlas-${name}`)),
    );
  });

  it('gives Tailwind every token, with an opacity slot where it can take one', () => {
    expect(ATLAS_TAILWIND_COLORS.panel).toBe(
      'hsl(var(--atlas-panel) / <alpha-value>)',
    );
    expect(ATLAS_TAILWIND_COLORS.accent).toBe(
      'rgb(var(--atlas-accent) / <alpha-value>)',
    );
    expect(ATLAS_TAILWIND_COLORS['text-2']).toBe('var(--atlas-text-2)');
  });

  // The panel is 95% opaque, so the worst case is the brightest globe behind
  // it: white (the ice caps, a highlighted city).
  it.each([
    ['text', 'text'],
    ['text-2', 'secondary text'],
    ['accent', 'links'],
  ] as const)(
    '%s (%s) reads at 4.5:1 on a panel over anything',
    (name, _use) => {
      for (const behind of [
        [0, 0, 0],
        [255, 255, 255],
      ] as [number, number, number][]) {
        const panel = panelAt95(behind);
        expect(
          contrast(over(ATLAS_COLOR[name].value, panel), panel),
        ).toBeGreaterThanOrEqual(4.5);
      }
    },
  );

  it('eyebrows (text-3) read at 4.5:1 on the panel itself', () => {
    const panel = over(ATLAS_COLOR.panel.value, [0, 0, 0]);
    expect(
      contrast(over(ATLAS_COLOR['text-3'].value, panel), panel),
    ).toBeGreaterThanOrEqual(4.5);
  });
});

describe("the Globe's overlays keep to the tokens", () => {
  const files = Object.entries(SOURCES).filter(
    ([path]) =>
      !path.includes('/data/') &&
      !path.endsWith('.test.ts') &&
      !path.endsWith('.test.tsx') &&
      !path.endsWith('/tokens.ts'),
  );

  it('reads the page sources', () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it('sets nothing in italic: Glacial Indifference has no italic face', () => {
    for (const [path, text] of files) {
      const code = text.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
      expect(code, path).not.toMatch(
        /\bitalic\b|font-style:\s*(italic|oblique)/,
      );
    }
  });

  it('puts no backdrop blur over the WebGL globe', () => {
    for (const [path, text] of files) {
      expect(text, path).not.toMatch(/backdrop-blur|backdrop-filter/);
    }
  });

  it('sets no text under 12 px', () => {
    for (const [path, text] of files) {
      expect(text, path).not.toMatch(/text-\[(?:[0-9]|1[01])px\]/);
    }
  });

  it('stacks every overlay on a named layer, never an arbitrary z-index', () => {
    for (const [path, text] of files) {
      if (path.endsWith('/layers.ts')) continue;
      const code = text.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
      expect(code, path).not.toMatch(/\bz-\[/);
    }
  });

  it('spells each layer class as its number', () => {
    for (const [name, z] of Object.entries(ATLAS_LAYER)) {
      expect(ATLAS_Z[name as keyof typeof ATLAS_Z]).toBe(`z-${z}`);
    }
  });

  it('spells no colour in hex outside the tokens (country colours aside)', () => {
    for (const [path, text] of files) {
      // globeVisuals colours the ice caps as their country colour.
      const code = path.endsWith('globeVisuals.ts')
        ? text.replace(/ICE_COUNTRIES\.has\(iso\)\s*\?\s*'#[0-9a-f]+'/g, '')
        : text;
      // Comments may name a colour; code may not.
      const stripped = code.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
      expect(stripped, path).not.toMatch(/['"`(\s[]#[0-9a-fA-F]{3,8}\b/);
    }
  });
});
