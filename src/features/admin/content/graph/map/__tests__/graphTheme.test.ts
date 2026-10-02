import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEFAULT_NODE_COLOR, MISSING_NODE_COLOR } from '../model/colorGroups';
import {
  GRAPH_BACKGROUND,
  GRAPH_BACKGROUND_VAR,
  GRAPH_FONT_FAMILY,
  GRAPH_STAGE_CLASS,
  GRAPH_THEME,
  graphFont,
  hslTripletToHex,
  readGraphBackground,
  rgbaBytes,
} from '../render/graphTheme';

/**
 * Cortex's look, as the plan sets it: the app's own background token,
 * translucent lavender lines, Obsidian's text grey and violet hover, the
 * missing grey at half strength, the pale default dot, Glacial labels, and
 * no yellow.
 */

/** The app theme's stylesheet, where the background token is set. */
const APP_THEME = readFileSync(
  resolve(process.cwd(), 'src/styles/appTheme.css'),
  'utf8',
);

/** The token's value and the hex its comment gives for it. */
const backgroundToken = () => {
  const match =
    /--ui-background:\s*([^;]+);\s*\/\*\s*(#[0-9a-f]{6})\s*\*\//i.exec(
      APP_THEME,
    );
  if (!match) throw new Error('--ui-background is not set in appTheme.css');
  return { value: match[1].trim(), hex: match[2].toLowerCase() };
};

describe('graph theme', () => {
  it('holds the plan’s colours', () => {
    expect(GRAPH_THEME).toMatchObject({
      background: 'hsl(var(--ui-background))',
      line: 'rgba(148,153,196,0.30)',
      text: '#dadada',
      // White is the highlight (owner, 1 Oct 2026): lit links and rings.
      highlight: '#ffffff',
      missing: '#666666',
      missingAlpha: 0.5,
      defaultNode: DEFAULT_NODE_COLOR,
      dimAlpha: 0.2,
      hoverFadeMs: 150,
    });
    expect(Object.isFrozen(GRAPH_THEME)).toBe(true);
  });

  it('agrees with the colour groups on the default and missing dots', () => {
    expect(GRAPH_THEME.defaultNode).toBe(DEFAULT_NODE_COLOR);
    const missing = rgbaBytes(GRAPH_THEME.missing, GRAPH_THEME.missingAlpha);
    expect(missing).toEqual(rgbaBytes(MISSING_NODE_COLOR));
  });

  it('turns every colour into the bytes the renderer uploads', () => {
    expect(rgbaBytes(GRAPH_THEME.line)).toEqual([148, 153, 196, 77]);
    expect(rgbaBytes(GRAPH_THEME.missing, GRAPH_THEME.missingAlpha)).toEqual([
      102, 102, 102, 128,
    ]);
    expect(rgbaBytes('#66666680')).toEqual([102, 102, 102, 128]);
    expect(rgbaBytes('#abc')).toEqual([0xaa, 0xbb, 0xcc, 255]);
    expect(rgbaBytes('rgb(1, 2, 3)')).toEqual([1, 2, 3, 255]);
    expect(rgbaBytes('#ffffff', 0.2)).toEqual([255, 255, 255, 51]);
  });

  it('reads nothing it cannot read', () => {
    for (const bad of [
      '',
      'blue',
      '#12345',
      'rgba(300,0,0,1)',
      'rgba(1,2,3,9)',
    ]) {
      expect(rgbaBytes(bad), bad).toBeNull();
    }
  });

  it("sits on the app's own background, the --ui-background token", () => {
    expect(GRAPH_BACKGROUND_VAR).toBe('--ui-background');
    expect(GRAPH_BACKGROUND).toBe('hsl(var(--ui-background))');
    expect(GRAPH_THEME.background).toBe(GRAPH_BACKGROUND);
    // The stage's class paints the same token, written out for Tailwind.
    expect(GRAPH_STAGE_CLASS).toBe('bg-[hsl(var(--ui-background))]');
    // The token is the app's near-black, and its comment agrees.
    const token = backgroundToken();
    expect(hslTripletToHex(token.value)).toBe(token.hex);
    expect(token.hex).toBe('#101012');
  });

  it('never paints the old navy', () => {
    // Built from parts, so this file itself never holds the colour.
    const navy = ['#15', '18', '24'].join('');
    const theme = JSON.stringify(GRAPH_THEME).toLowerCase();
    expect(theme).not.toContain(navy);
    expect(GRAPH_BACKGROUND).not.toContain(navy);
    expect(GRAPH_STAGE_CLASS).not.toContain(navy);
  });

  it('appears nowhere in Cortex’s code, nor any colour tinted toward it', () => {
    // The navy and the panel greys that were turned toward it (wave B),
    // each built from parts so this file never holds them.
    const tinted = [
      ['15', '18', '24'],
      ['1c', '20', '30'],
      ['32', '37', '4c'],
      ['2b', '2f', '41'],
      ['20', '24', '34'],
      ['1b', '1f', '2e'],
      ['8b', '90', 'a7'],
      ['47', '4d', '63'],
      ['58', '5d', '74'],
      ['a7', 'ac', 'bf'],
    ].map((parts) => `#${parts.join('')}`);
    const root = resolve(process.cwd(), 'src/features/admin/content/graph');
    const files = readdirSync(root, { recursive: true, encoding: 'utf8' })
      .filter((f) => /\.(ts|tsx|css)$/.test(f))
      .map((f) => join(root, f));
    expect(files.length).toBeGreaterThan(50);
    const hits = files.flatMap((file) => {
      const text = readFileSync(file, 'utf8').toLowerCase();
      return tinted.filter((c) => text.includes(c)).map((c) => `${file}: ${c}`);
    });
    expect(hits).toEqual([]);
  });

  it('reads the token off the page where a colour value is needed', () => {
    // Node has no page: nothing is made up in its place.
    expect(readGraphBackground()).toBeNull();
    expect(hslTripletToHex('240 5.88% 6.67%')).toBe('#101012');
    expect(hslTripletToHex('0, 0%, 100%')).toBe('#ffffff');
    expect(hslTripletToHex('240 21.05% 92.55%')).toBe('#e8e8f0');
    expect(hslTripletToHex('not a colour')).toBeNull();
  });

  it('draws no node in white, which is the highlight', () => {
    const bytes = rgbaBytes(GRAPH_THEME.defaultNode) ?? [255, 255, 255, 255];
    expect(bytes.slice(0, 3).every((v) => v > 0xe6)).toBe(false);
    expect(GRAPH_THEME.highlight).toBe('#ffffff');
  });

  it('sets labels in Glacial Indifference first', () => {
    expect(GRAPH_FONT_FAMILY.startsWith('"Glacial Indifference",')).toBe(true);
    expect(graphFont(14)).toBe(
      '14px "Glacial Indifference", system-ui, sans-serif',
    );
    expect(graphFont(16.123)).toBe(
      '16.12px "Glacial Indifference", system-ui, sans-serif',
    );
  });
});
