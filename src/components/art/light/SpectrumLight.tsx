// ── Spectrum light ─────────────────────────────────────────────────────────
// Googlebook's black and rainbow (owner, 2026-10-28): on the dark canvas,
// colour comes only as light, in the app's one rainbow (the 12 key colours
// round the circle of fifths, KEY_RAINBOW_COLORS: the landing's horizon,
// the prompt bar's write-in and comet).
//   SpectrumRim    a card's rim lit, round or along its bottom edge
//   SpectrumBar    the glowing working line
//   HorizonFlare   a spectral horizon with a sun on it, behind a page's top
// Decoration only (aria-hidden), except the bar, which says it is working.

import type { CSSProperties } from 'react';
import { cn } from '@/components/utilities';
import { KEY_RAINBOW_COLORS } from '@/features/landing/rainbow';
import './light.css';

const spread = (colors: readonly string[], from = 0, to = 100) =>
  colors
    .map((c, i) => `${c} ${from + (i / (colors.length - 1)) * (to - from)}%`)
    .join(', ');

/** The spectrum round a circle (closing on C), as conic-gradient stops. */
const RIM = [...KEY_RAINBOW_COLORS, KEY_RAINBOW_COLORS[0]].join(', ');

/** The comet's tail: the spectrum over the trailing 150°. */
const COMET = KEY_RAINBOW_COLORS.map(
  (c, i) => `${c} ${210 + (i / (KEY_RAINBOW_COLORS.length - 1)) * 150}deg`,
).join(', ');

/** One seamless lap along a line (the bar's shimmer slides it). */
const LAP = spread([...KEY_RAINBOW_COLORS, KEY_RAINBOW_COLORS[0]]);

/**
 * The spectrum along a line, end to end and still: a strip that is the app's
 * rainbow (the Globe's timeline, under its era names).
 */
export const SPECTRUM_LINE = `linear-gradient(90deg, ${spread(KEY_RAINBOW_COLORS)})`;

/** The spectrum fading in and out at the ends (a horizon). */
const FADE = `transparent 0%, ${spread(KEY_RAINBOW_COLORS, 12, 88)}, transparent 100%`;

/** The CSS variables the light reads. */
export const SPECTRUM_VARS = {
  '--spectrum': RIM,
  '--spectrum-comet': COMET,
  '--spectrum-lap': LAP,
  '--spectrum-fade': FADE,
} as CSSProperties;

export type RimState = 'off' | 'hover' | 'on' | 'run';

/**
 * A rim of spectrum light on its parent (which must be positioned; the rim
 * takes its corners). `hover` lights while its `.art-host` is hovered or
 * focused; `on` stays lit; `run` sends a comet round once (re-key it to run
 * again). `edge="bottom"` lights only the bottom, fading upward: the light
 * leaking from under a card.
 */
export function SpectrumRim({
  state = 'hover',
  edge = 'all',
  colors,
  className,
}: {
  state?: RimState;
  edge?: 'all' | 'bottom';
  /** The rim's own colours instead of the spectrum (var()s allowed): the
   *  Arcade's featured card lit in the page's glow colours. */
  colors?: readonly string[];
  className?: string;
}) {
  if (state === 'off') return null;
  const style = colors?.length
    ? ({
        ...SPECTRUM_VARS,
        '--spectrum': [...colors, colors[0]].join(', '),
      } as CSSProperties)
    : SPECTRUM_VARS;
  return (
    <span
      aria-hidden
      data-spectrum-rim={state}
      data-state={state}
      data-edge={edge}
      className={cn('spectrum-rim', className)}
      style={style}
    >
      <span className="spectrum-rim__bloom" />
      <span className="spectrum-rim__ring" />
    </span>
  );
}

/** The glowing working line: something is loading or being made. */
export function SpectrumBar({
  label = 'Loading',
  className,
}: {
  /** What is happening, for assistive tech. */
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-label={label}
      data-spectrum-bar
      className={cn('spectrum-bar w-48', className)}
      style={SPECTRUM_VARS}
    >
      <span aria-hidden className="spectrum-bar__bloom" />
      <span aria-hidden className="spectrum-bar__line" />
    </div>
  );
}

/**
 * A spectral horizon behind a page's top or a hero: a hairline of the
 * spectrum with its light rising off it and a white sun at `core`.
 */
export function HorizonFlare({
  horizon = '38%',
  core = '50%',
  className,
}: {
  /** The horizon's height from the bottom of the box. */
  horizon?: string;
  /** Where the sun sits along it. */
  core?: string;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      data-horizon-flare
      className={cn('horizon-flare', className)}
      style={
        {
          ...SPECTRUM_VARS,
          '--horizon': horizon,
          '--core': core,
        } as CSSProperties
      }
    >
      <span className="horizon-flare__glow" />
      <span className="horizon-flare__line" />
      <span className="horizon-flare__core" />
    </div>
  );
}
