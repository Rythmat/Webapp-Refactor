import { DEFAULT_NODE_COLOR } from '../model/colorGroups';

/**
 * Cortex's colours, type and hover timing, in one place so the look can be
 * tuned without touching the renderer.
 *
 * The scheme is Obsidian's dark graph on the app's own background, with the
 * app's own colours for the dots and white for the highlight:
 *
 * - The background is the rest of the app's, the `--ui-background` token
 *   (src/styles/appTheme.css), so the graph always matches the console
 *   around it. The owner chose it over a navy on 1 October 2026: "the same
 *   background colour as the rest of the app". The WebGL canvas clears to
 *   transparent and the stage behind it paints the token, so nothing here
 *   holds the colour itself. Where code needs it as a value (a canvas
 *   colour, a contrast check), `readGraphBackground` reads the token from
 *   the page.
 * - The dots take the colour groups' colours, the owner's palette B
 *   (`model/cortexPalette.ts`, through `model/colorGroups.ts`), and a dot
 *   no group claims is a mid neutral grey. No dot is ever white.
 * - Lines are a thin, translucent lavender grey, so thousands of them read
 *   as a haze rather than a tangle.
 * - Labels are Obsidian's light grey, set in Glacial Indifference like the
 *   rest of the app.
 * - The highlight is white, as the owner asked on 1 October 2026 ("use
 *   white as the highlight connections color instead of purple").
 *   Hovering a dot draws its connections white and rings it in white,
 *   while the dot itself keeps its own colour; its neighbours stay at full
 *   strength and everything else fades to a fifth of its strength over 150
 *   milliseconds. The keyboard's current dot, the open row's dot and the
 *   local graph's focus wear the same white ring, each in its own colour.
 * - Missing items (Obsidian's "unresolved") are a dim grey at half
 *   strength, whatever the colour groups say.
 *
 * The graph's own colours here keep away from yellow; the one yellow in
 * Cortex is the key palette's, which the Year group wears.
 *
 * The module is pure: plain values and small helpers. Only
 * `readGraphBackground` looks at the page, and only when it is called.
 */

/** The app's background token, as `src/styles/appTheme.css` names it. */
export const GRAPH_BACKGROUND_VAR = '--ui-background';

/**
 * The app's background as a CSS colour: what the graph's stage paints
 * behind the transparent canvas. The token holds an HSL triplet.
 */
export const GRAPH_BACKGROUND = `hsl(var(${GRAPH_BACKGROUND_VAR}))`;

/**
 * The Tailwind class that paints the graph's stage in the app's background.
 * Written out in full, because Tailwind finds its classes by reading the
 * source as text.
 */
export const GRAPH_STAGE_CLASS = 'bg-[hsl(var(--ui-background))]';

export const GRAPH_THEME = Object.freeze({
  /**
   * What shows behind the graph: the app's own background token. The canvas
   * itself is transparent; read the token (`readGraphBackground`) where a
   * colour value is needed.
   */
  background: GRAPH_BACKGROUND,
  /** Every line not lit by a hover. */
  line: 'rgba(148,153,196,0.30)',
  /** Labels. */
  text: '#dadada',
  /**
   * The highlight: the hovered dot's connections, and the ring round the
   * hovered dot, the keyboard's current dot, the open row's dot and the
   * local graph's focus. White, never a dot's fill.
   */
  highlight: '#ffffff',
  /** Missing items, drawn at `missingAlpha`. */
  missing: '#666666',
  missingAlpha: 0.5,
  /** A dot no colour group claims: the groups' neutral grey. */
  defaultNode: DEFAULT_NODE_COLOR,
  /** How strong everything not next to the hovered dot stays. */
  dimAlpha: 0.2,
  /** How long the hover fade takes, in milliseconds (none under reduced motion). */
  hoverFadeMs: 150,
});

/**
 * An HSL triplet as the app's tokens write them (`240 5.88% 6.67%`, commas
 * allowed) → `#rrggbb`, or null when it cannot be read.
 */
export function hslTripletToHex(triplet: string): string | null {
  const match = /^\s*(-?[\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%\s*$/.exec(
    triplet,
  );
  if (!match) return null;
  const h = ((Number(match[1]) % 360) + 360) % 360;
  const s = Math.min(1, Number(match[2]) / 100);
  const l = Math.min(1, Number(match[3]) / 100);
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const x = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - chroma / 2;
  const [r, g, b] =
    h < 60
      ? [chroma, x, 0]
      : h < 120
        ? [x, chroma, 0]
        : h < 180
          ? [0, chroma, x]
          : h < 240
            ? [0, x, chroma]
            : h < 300
              ? [x, 0, chroma]
              : [chroma, 0, x];
  const hex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

/**
 * The app's background as `#rrggbb`, read from the token on the page (the
 * root element unless another is given). Null where there is no page or the
 * token is unset, so a caller never draws with a colour of its own making.
 */
export function readGraphBackground(element?: Element | null): string | null {
  if (typeof document === 'undefined' || typeof getComputedStyle !== 'function')
    return null;
  const target = element ?? document.documentElement;
  const value = getComputedStyle(target)
    .getPropertyValue(GRAPH_BACKGROUND_VAR)
    .trim();
  return value ? hslTripletToHex(value) : null;
}

/** Red, green, blue and alpha, each 0 to 255: what the renderer uploads. */
export type RgbaBytes = readonly [number, number, number, number];

/**
 * A theme colour (`#rgb`, `#rrggbb`, `#rrggbbaa` or `rgba(r,g,b,a)`) → its
 * bytes. `alpha` (0 to 1) multiplies whatever alpha the colour has. Null
 * when the colour cannot be read.
 */
export function rgbaBytes(color: string, alpha = 1): RgbaBytes | null {
  const text = color.trim().toLowerCase();
  let rgba: [number, number, number, number] | null = null;
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(text);
  if (hex) {
    let digits = hex[1];
    if (digits.length === 3) digits = [...digits].map((d) => d + d).join('');
    const byte = (at: number) => parseInt(digits.slice(at, at + 2), 16);
    rgba = [byte(0), byte(2), byte(4), digits.length === 8 ? byte(6) : 255];
  } else {
    const fn =
      /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(
        text,
      );
    if (fn) {
      const a = fn[4] === undefined ? 1 : Number(fn[4]);
      rgba = [Number(fn[1]), Number(fn[2]), Number(fn[3]), Math.round(a * 255)];
    }
  }
  if (!rgba || rgba.slice(0, 3).some((c) => c > 255) || !(rgba[3] <= 255)) {
    return null;
  }
  const scaled = Math.round(rgba[3] * Math.min(1, Math.max(0, alpha)));
  return [rgba[0], rgba[1], rgba[2], scaled];
}

/** The type the graph's labels are set in, leading with Glacial Indifference. */
export const GRAPH_FONT_FAMILY =
  '"Glacial Indifference", system-ui, sans-serif';

/** A canvas `font` for labels of `px` CSS pixels. */
export const graphFont = (px: number): string =>
  `${Math.round(px * 100) / 100}px ${GRAPH_FONT_FAMILY}`;
