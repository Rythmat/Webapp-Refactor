import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import { renderToStaticMarkup } from 'react-dom/server';
import tailwindcss from 'tailwindcss';
import loadConfig from 'tailwindcss/loadConfig';
import { describe, expect, it } from 'vitest';
import { contrastRatio } from '../color';
import { PremiumBadge } from '../PremiumBadge';
import {
  COLOR,
  dawTokenDeclarations,
  LABEL_FLOOR_PX,
  type DawColorName,
} from '../tokens';

// ── The Premium badge reads at the floor, wherever it sits ──────────────────
// Restyled onto Chip in 2.2 (white/70 text on a white/8 fill, 20 px tall), it
// marks the Prism lessons on the Studio dashboard and the locked Prism item
// in the Timeline's menu. Its own classes, compiled through the real Tailwind
// config, must set 12 px text (the label floor, owner decision 2) and ink that
// passes WCAG AA (4.5:1) on each of those surfaces.

const CONFIG = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../tailwind.config.ts',
);

/** What the badge's own element gets from its classes, property by property. */
async function badgeStyle(locked: boolean): Promise<Map<string, string[]>> {
  const html = renderToStaticMarkup(<PremiumBadge locked={locked} />);
  const classes = /^<span[^>]*\bclass="([^"]+)"/
    .exec(html)?.[1]
    .replace(/&amp;/g, '&');
  expect(classes, html).toBeTruthy();
  const config = loadConfig(CONFIG);
  const { root } = await postcss([
    tailwindcss({
      ...config,
      content: [{ raw: `<i class="${classes}"></i>` }],
    }),
  ]).process('@tailwind utilities;', { from: undefined });
  const style = new Map<string, string[]>();
  root.walkRules((rule) => {
    // Only rules on the badge itself: `[&_svg]:size-3.5` sizes the lock.
    if (/\s/.test(rule.selector)) return;
    rule.walkDecls(({ prop, value }) => {
      style.set(prop, [...(style.get(prop) ?? []), value]);
    });
  });
  return style;
}

const tokens = new Map(dawTokenDeclarations());

/** A `var(--daw-*)` read, as the token stylesheet declares it. */
function token(value: string): string {
  const name = /^var\((--daw-[\w-]+)\)$/.exec(value)?.[1];
  expect(name, value).toBeDefined();
  const declared = tokens.get(name!);
  expect(declared, name).toBeDefined();
  return declared!;
}

/** The colour a `var(--daw-<colour>)` read paints, aliases resolved. */
function colorOf(value: string): string {
  const name = /^var\(--daw-([\w-]+)\)$/.exec(value)?.[1];
  expect(name !== undefined && name in COLOR, value).toBe(true);
  return COLOR[name as DawColorName].value;
}

/** `#rrggbb`, `rgb()` or `rgba()` as red, green, blue and alpha. */
function rgba(color: string): [number, number, number, number] {
  const hex = /^#([0-9a-f]{6})$/i.exec(color)?.[1];
  if (hex) {
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
    return [r, g, b, 1];
  }
  const [r, g, b, a = 1] = (/^rgba?\(([^)]+)\)$/.exec(color)?.[1] ?? '')
    .split(',')
    .map(Number);
  expect([r, g, b].every(Number.isFinite), color).toBe(true);
  return [r, g, b, a];
}

/** `top` painted over the opaque `under`, as the browser blends them. */
function over(top: string, under: string): string {
  const [r, g, b, a] = rgba(top);
  const [R, G, B] = rgba(under);
  const mix = (x: number, y: number) => Math.round(x * a + y * (1 - a));
  return `rgb(${mix(r, R)}, ${mix(g, G)}, ${mix(b, B)})`;
}

/** The DAW's --color-surface-2 (src/daw/daw.css): the Timeline menu's fill. */
const MENU = '#1e1e1e';

/** Every surface the badge sits on today, at rest and hovered. */
const HOSTS: Record<string, string> = {
  'a lesson tile on the Studio dashboard': over(
    'rgba(255, 255, 255, 0.04)',
    COLOR.bg.value,
  ),
  'a hovered lesson tile': over('rgba(255, 255, 255, 0.07)', COLOR.bg.value),
  "the Timeline's menu": MENU,
  'a hovered menu item': over('rgba(255, 255, 255, 0.05)', MENU),
};

describe('PremiumBadge', () => {
  it.each([false, true])(
    'sets its text at the 12 px label floor (locked: %s)',
    async (locked) => {
      const style = await badgeStyle(locked);
      // One size, from the type scale (today the label step's 12 px).
      expect(style.get('font-size')).toHaveLength(1);
      const size = parseFloat(token(style.get('font-size')![0]));
      expect(size).toBeGreaterThanOrEqual(LABEL_FLOOR_PX);
      // Its line fits the 20 px chip (h-5).
      expect(style.get('height')).toEqual(['1.25rem']);
      const line = parseFloat(token(style.get('line-height')![0]));
      expect(line).toBeGreaterThanOrEqual(size);
      expect(line).toBeLessThanOrEqual(20);
    },
    30_000,
  );

  it('keeps its text at AA contrast on every surface it sits on', async () => {
    const style = await badgeStyle(true);
    // One text colour and one fill, both from the tokens (today white/70 on
    // white/8, at 6.5:1 or more on these surfaces).
    expect(style.get('color')).toHaveLength(1);
    expect(style.get('background-color')).toHaveLength(1);
    const ink = colorOf(style.get('color')![0]);
    const fill = colorOf(style.get('background-color')![0]);

    for (const [where, host] of Object.entries(HOSTS)) {
      const background = over(fill, host);
      const text = over(ink, background);
      expect(contrastRatio(text, background), where).toBeGreaterThanOrEqual(
        4.5,
      );
    }
  }, 30_000);
});
