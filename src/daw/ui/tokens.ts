/**
 * The Studio editor's design tokens: the one place its chrome takes colours,
 * type sizes, z-indexes, radii, spacing and motion from (overhaul plan,
 * milestone 2.1).
 *
 * Every token becomes a `--daw-<name>` custom property on :root.
 * `dawTokensCss()` writes that stylesheet and `installDawTokens()` puts it on
 * the page, so an overlay portaled to <body> reads exactly what the editor
 * reads. A colour the app's look already has is an alias of its `--ui-*`
 * token (src/styles/appTheme.css), not a copy, so the editor follows any
 * re-skin of the app. Only this file spells colours out: the ESLint
 * guardrails for src/daw/ui and src/daw/shell hold every other file to it.
 *
 * Canvases cannot read var(), so `getDawPalette()` resolves the colours once
 * and caches them.
 *
 * tailwind.config.ts reads the DAW_TAILWIND_* maps from here, so this file
 * has no path aliases, no imports and no side effects when it loads.
 */

/** A colour token: what `--daw-<name>` is set to, and the colour that is. */
export interface ColorToken {
  /** The custom property's value: `hsl(var(--ui-*))` for an alias. */
  readonly css: string;
  /**
   * The colour itself, as appTheme.css resolves the alias. Canvases fall back
   * to it, and it is what the alias is checked against.
   */
  readonly value: string;
}

const alias = (ui: string, value: string): ColorToken => ({
  css: `hsl(var(--ui-${ui}))`,
  value,
});

const own = (value: string): ColorToken => ({ css: value, value });

// Keeps each key's literal type while checking every entry is a ColorToken.
const colors = <T extends Record<string, ColorToken>>(tokens: T): T => tokens;

/**
 * The palette. Neutral chrome (owner decision 3): the white pill is the
 * primary action and white/10 marks what is active or selected. Colour is
 * kept for meaning only: record and destructive red, amber warnings, meter
 * data, the playhead and selection.
 */
export const COLOR = colors({
  // Surfaces.
  bg: alias('background', '#101012'),
  'surface-1': alias('card', '#151518'),
  'surface-2': own('rgba(255, 255, 255, 0.04)'),
  popover: alias('popover', '#141416'),
  hover: alias('muted', '#1e1e20'),
  /** Active and selected: white/10. */
  selected: alias('secondary', '#28282a'),
  chip: own('rgba(255, 255, 255, 0.08)'),
  /** Behind a modal dialog. */
  scrim: own('rgba(0, 0, 0, 0.6)'),

  // Lines.
  hairline: alias('border', '#232325'),
  /** A control's outline: white/15. */
  outline: alias('input', '#343436'),
  focus: alias('ring', '#9f9fa0'),

  // Text, from most to least prominent. text-3 is the dimmest text allowed:
  // 5.9:1 on bg, where the old #6b6b80 failed at 3.6:1.
  text: alias('foreground', '#e8e8f0'),
  'text-2': own('rgba(255, 255, 255, 0.7)'),
  'text-3': own('#8e8ea3'),

  // The primary action: the white pill with near-black text.
  primary: alias('primary', '#ffffff'),
  'primary-hover': alias('brand-dark', '#e6e6e8'),
  'primary-active': alias('brand-darker', '#d1d1d3'),
  'on-primary': alias('primary-foreground', '#101012'),

  // Meaning. record is the red of the Record state and clip lights; danger is
  // the fill of destructive buttons, a shade deeper so white text on it
  // passes 4.5:1 (it is 4.8:1; on record it would be 3.8:1).
  record: own('#ef4444'),
  danger: own('#dc2626'),
  'danger-hover': own('#b91c1c'),
  'on-danger': own('#ffffff'),
  'danger-text': own('#f87171'),
  'danger-subtle': own('rgba(239, 68, 68, 0.16)'),
  warning: own('#f59e0b'),
  'warning-subtle': own('rgba(245, 158, 11, 0.16)'),
  success: own('#22c55e'),
  'success-subtle': own('rgba(34, 197, 94, 0.16)'),

  // Meters: the zones of a level, and the unlit track behind it.
  'meter-safe': own('#22c55e'),
  'meter-hot': own('#f59e0b'),
  'meter-clip': own('#ef4444'),
  'meter-track': own('rgba(255, 255, 255, 0.06)'),

  // The arrange canvas.
  playhead: alias('foreground', '#e8e8f0'),
  'range-fill': own('rgba(255, 255, 255, 0.12)'),
  'range-edge': own('rgba(255, 255, 255, 0.45)'),
  'ruler-text': own('rgba(255, 255, 255, 0.7)'),
  grid: own('rgba(255, 255, 255, 0.04)'),
  scrollbar: own('rgba(255, 255, 255, 0.08)'),

  // Interim, for the --color-* to --daw-* codemod (2.1): what was the accent
  // reads as text until each use moves to a primitive.
  accent: { css: 'var(--daw-text)', value: '#e8e8f0' },
});

export type DawColorName = keyof typeof COLOR;

/**
 * The selection colour as an `r, g, b` triplet, so a canvas can build
 * `rgba(r, g, b, alpha)` overlays at any opacity.
 */
export const SELECTION_RGB = '255, 255, 255';

/** The two inks `onColor()` chooses between for text on a colour. */
export const INK = { dark: '#101012', light: '#ffffff' } as const;

/** A step of the type scale, in px. Glacial ships 400 and 700 only. */
export interface TypeToken {
  readonly size: number;
  readonly line: number;
  readonly weight: 400 | 700;
  /** Only the micro step may be 11 px, and only in capitals. */
  readonly uppercase?: boolean;
  readonly tracking?: string;
}

const typeScale = <T extends Record<string, TypeToken>>(scale: T): T => scale;

/**
 * One comfortable sizing (owner decision 2): nothing under the 12 px label
 * floor except uppercase micro labels, such as ruler and section labels, at
 * 11 px.
 */
export const TYPE = typeScale({
  micro: {
    size: 11,
    line: 14,
    weight: 700,
    uppercase: true,
    tracking: '0.08em',
  },
  label: { size: 12, line: 16, weight: 400 },
  body: { size: 13, line: 18, weight: 400 },
  title: { size: 14, line: 20, weight: 700 },
  coach: { size: 15, line: 22, weight: 400 },
  heading: { size: 16, line: 22, weight: 700 },
});

export type DawTypeName = keyof typeof TYPE;

/** The smallest text allowed, other than uppercase micro labels. */
export const LABEL_FLOOR_PX = 12;

/**
 * Control sizes in px: 28 px controls by default, never a target under
 * 24×24. These match Tailwind's 4 px steps (h-6, h-7, h-8, h-9), which is
 * what the primitives use.
 */
export const SIZE = {
  control: 28,
  'control-sm': 24,
  'control-lg': 32,
  play: 36,
  'hit-min': 24,
  icon: 16,
  'icon-sm': 14,
} as const;

/** Spacing steps in px, on Tailwind's scale (gap-0.5 is 2 px, gap-1 is 4 px…). */
export const SPACE = {
  '2xs': 2,
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
  '3xl': 32,
} as const;

/** Corner radii in px: controls, popovers and menus, dialogs, pills. */
export const RADIUS = { sm: 4, md: 8, lg: 12, pill: 9999 } as const;

/**
 * The stacking order, lowest first. A popover or select opened from a
 * dialog sits above it, tooltips above both, the lesson overlay above all the
 * chrome and toasts on top. Nothing in src/daw/ui or src/daw/shell writes a
 * z-index of its own.
 */
export const Z = {
  sticky: 10,
  dock: 20,
  panel: 30,
  modal: 50,
  popover: 60,
  tooltip: 70,
  tutorial: 80,
  toast: 90,
} as const;

export type DawLayer = keyof typeof Z;

/** Durations in ms. All three become 0 ms under prefers-reduced-motion. */
export const MOTION = { fast: 120, base: 180, slow: 240 } as const;

export const EASE = 'cubic-bezier(0.2, 0.8, 0.2, 1)';

export const SHADOW = {
  pop: '0 8px 24px rgba(0, 0, 0, 0.45)',
  modal: '0 16px 48px rgba(0, 0, 0, 0.55)',
} as const;

const px = (n: number) => `${n}px`;

/** Every custom property the stylesheet declares on :root, in order. */
export function dawTokenDeclarations(): ReadonlyArray<
  readonly [name: string, value: string]
> {
  const out: Array<readonly [string, string]> = [];
  for (const [name, token] of Object.entries(COLOR)) {
    out.push([`--daw-${name}`, token.css]);
  }
  out.push(['--daw-selection-rgb', SELECTION_RGB]);
  for (const [name, step] of Object.entries(TYPE) as Array<
    [string, TypeToken]
  >) {
    out.push([`--daw-font-${name}`, px(step.size)]);
    out.push([`--daw-leading-${name}`, px(step.line)]);
    if (step.tracking) out.push([`--daw-tracking-${name}`, step.tracking]);
  }
  for (const [name, value] of Object.entries(SIZE)) {
    out.push([`--daw-size-${name}`, px(value)]);
  }
  for (const [name, value] of Object.entries(SPACE)) {
    out.push([`--daw-space-${name}`, px(value)]);
  }
  for (const [name, value] of Object.entries(RADIUS)) {
    out.push([`--daw-radius-${name}`, px(value)]);
  }
  for (const [name, value] of Object.entries(Z)) {
    out.push([`--daw-z-${name}`, String(value)]);
  }
  for (const [name, value] of Object.entries(MOTION)) {
    out.push([`--daw-motion-${name}`, `${value}ms`]);
  }
  out.push(['--daw-ease', EASE]);
  for (const [name, value] of Object.entries(SHADOW)) {
    out.push([`--daw-shadow-${name}`, value]);
  }
  return out;
}

/** The token stylesheet: every token on :root, and motion off on request. */
export function dawTokensCss(): string {
  const declarations = dawTokenDeclarations()
    .map(([name, value]) => `  ${name}: ${value};`)
    .join('\n');
  const still = Object.keys(MOTION)
    .map((name) => `    --daw-motion-${name}: 0ms;`)
    .join('\n');
  return (
    `:root {\n${declarations}\n}\n\n` +
    `@media (prefers-reduced-motion: reduce) {\n  :root {\n${still}\n  }\n}\n`
  );
}

/** The id of the <style> element that holds the tokens. */
export const DAW_TOKENS_STYLE_ID = 'daw-tokens';

/**
 * Puts the token stylesheet in <head>, once. Safe to call any number of times
 * and without a DOM (it does nothing there). On a hot reload it rewrites the
 * existing element, so edited tokens show without a refresh.
 */
export function installDawTokens(
  doc: Document | undefined = typeof document === 'undefined'
    ? undefined
    : document,
): void {
  if (!doc?.head) return;
  let style = doc.getElementById(DAW_TOKENS_STYLE_ID);
  if (!style) {
    style = doc.createElement('style');
    style.id = DAW_TOKENS_STYLE_ID;
    doc.head.appendChild(style);
  }
  const css = dawTokensCss();
  if (style.textContent !== css) style.textContent = css;
}

/** `var(--daw-<name>)`, for an inline style or an SVG attribute. */
export const dawVar = (name: DawColorName): string => `var(--daw-${name})`;

/**
 * The colours as Tailwind theme entries: `bg-daw-surface-1`,
 * `text-daw-text-3`, `border-daw-hairline` and so on (tailwind.config.ts
 * adds this as colors.daw). They are plain var()s, so Tailwind's
 * opacity modifiers (`/50`) do not apply to them; a translucent step is a
 * token of its own instead.
 */
export const DAW_TAILWIND_COLORS = Object.fromEntries(
  Object.keys(COLOR).map((name) => [name, `var(--daw-${name})`]),
) as Readonly<Record<DawColorName, string>>;

/**
 * The motion steps as Tailwind keys: `duration-daw-fast`, `ease-daw`. Named
 * rather than `duration-[var(…)]`, which Tailwind skips as ambiguous because
 * tailwindcss-animate reads the same prefix; named, the class sets the
 * transition and the enter/exit animation together, and both go to 0 ms
 * under reduced motion.
 */
export const DAW_TAILWIND_DURATIONS = Object.fromEntries(
  Object.keys(MOTION).map((name) => [
    `daw-${name}`,
    `var(--daw-motion-${name})`,
  ]),
) as Readonly<Record<`daw-${keyof typeof MOTION}`, string>>;

export const DAW_TAILWIND_EASING = { daw: 'var(--daw-ease)' } as const;

type Camel<S extends string> = S extends `${infer Head}-${infer Tail}`
  ? `${Head}${Capitalize<Camel<Tail>>}`
  : S;

/**
 * The palette resolved to colours a canvas accepts: `surface1`, `text3`,
 * `meterClip` and so on, plus `selectionRgb` (a triplet, not a colour).
 */
export type DawPalette = {
  readonly [Name in DawColorName as Camel<Name>]: string;
} & { readonly selectionRgb: string };

const camel = (name: string) =>
  name.replace(/-(\w)/g, (_, letter: string) => letter.toUpperCase());

/**
 * Fired on window when the tokens change at run time; the next
 * `getDawPalette()` reads them again.
 */
export const DAW_PALETTE_EVENT = 'daw:palette';

let palette: DawPalette | null = null;
let listening = false;

/** Forgets the cached palette, so the next read resolves it afresh. */
export function invalidateDawPalette(): void {
  palette = null;
}

/**
 * A custom property's value with every var() in it replaced, or '' when one
 * of them is unset. A browser has already substituted them (so this only
 * trims); jsdom has not, which is the case the loop is for.
 */
function resolveProperty(
  style: CSSStyleDeclaration,
  name: string,
  depth = 0,
): string {
  const raw = style.getPropertyValue(name).trim();
  if (!raw.includes('var(')) return raw;
  if (depth > 4) return '';
  let missing = false;
  const resolved = raw.replace(/var\(\s*(--[\w-]+)\s*\)/g, (_, ref: string) => {
    const value = resolveProperty(style, ref, depth + 1);
    if (!value) missing = true;
    return value;
  });
  return missing ? '' : resolved;
}

/**
 * The DAW colours for canvas drawing, resolved once from :root and cached
 * until `DAW_PALETTE_EVENT`. A token that does not resolve (no DOM, or an
 * alias whose --ui-* token is missing) falls back to its own value, so a
 * canvas always gets a colour it can paint.
 */
export function getDawPalette(): DawPalette {
  if (palette) return palette;
  const hasDom = typeof document !== 'undefined' && !!document.documentElement;
  if (hasDom) installDawTokens(document);
  const style = hasDom ? getComputedStyle(document.documentElement) : null;
  const read = (name: string, fallback: string) =>
    (style && resolveProperty(style, name)) || fallback;

  const out: Record<string, string> = {};
  for (const [name, token] of Object.entries(COLOR)) {
    out[camel(name)] = read(`--daw-${name}`, token.value);
  }
  out.selectionRgb = read('--daw-selection-rgb', SELECTION_RGB);
  palette = Object.freeze(out) as DawPalette;

  if (!listening && typeof window !== 'undefined') {
    window.addEventListener(DAW_PALETTE_EVENT, invalidateDawPalette);
    listening = true;
  }
  return palette;
}
