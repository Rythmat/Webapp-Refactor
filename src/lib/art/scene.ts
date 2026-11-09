// ── A cover's scene ────────────────────────────────────────────────────────
// What a cover draws, from its spec: the lines (merged into at most four
// paths, one per depth band, so a tile is four DOM nodes, not forty), the
// gradient they share, and whether it loops. Pure, and cached: twenty tiles
// with the same seeds build once.

import {
  chladni,
  contours,
  helix,
  lissajous,
  mesh,
  moire,
  petals,
  rays,
  rings,
  spiral,
  standing,
  strands,
  waveform,
  type ArtDensity,
  type BuildInput,
} from './builders';
import {
  cyclicStops,
  DEFAULT_ART_PALETTE,
  type ArtPaletteName,
} from './palettes';
import { linePath, type ArtLine } from './path';
import {
  artRandom,
  between,
  kindFor,
  type ArtKind,
  type ChladniMode,
  type RingsVariant,
} from './seed';

export interface ArtSpec {
  /** The item's id: the same seed, the same cover. */
  seed: string;
  /** Left out, the seed picks. */
  kind?: ArtKind;
  /** Rings only. */
  variant?: RingsVariant;
  /** Chladni only: the plate's mode (left out, the seed picks). */
  mode?: ChladniMode;
  /** Left out, the seed picks. */
  palette?: ArtPaletteName;
  density: ArtDensity;
  /** Width ÷ height of the box the cover fills. */
  aspect: number;
  /**
   * Draw two frames wide, to slide one frame along forever (strands and
   * helix; ignored for the rest, which sway in place).
   */
  loop?: boolean;
}

export interface ArtLayer {
  d: string;
  opacity: number;
  /** Stroke width, as a multiple of the scene's. */
  widthScale: number;
  /** The soft light behind the brightest lines (drawn first, wide and faint). */
  glow?: boolean;
  /**
   * A toned scene's stroke instead of the gradient: the cover's hue (bold),
   * a tint of it, or white (GRM's three strokes).
   */
  tone?: ArtTone;
}

export type ArtTone = 'accent' | 'tint' | 'white';

export interface ArtGradient {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** 'repeat': the lap repeats past its end (a sliding cover's colours). */
  spread: 'pad' | 'repeat';
  stops: readonly { offset: number; color: string }[];
}

export interface ArtScene {
  kind: ArtKind;
  variant?: RingsVariant;
  palette: ArtPaletteName;
  /** One frame: what the box shows. */
  width: number;
  height: number;
  /** The drawing's width: two frames when it loops. */
  viewWidth: number;
  loop: boolean;
  layers: readonly ArtLayer[];
  /**
   * 'gradient': every line in the gradient, its band an opacity, with a
   * glow. 'tones': flat strokes, its band a tone and a weight (Chladni).
   */
  style: 'gradient' | 'tones';
  gradient: ArtGradient;
  /** Hairline width in CSS pixels (strokes don't scale with the box). */
  strokeWidth: number;
  /** Path data, all layers: the budget a tile must keep under. */
  bytes: number;
  /**
   * Which way the lines fade out (CSS degrees: 180 fades toward the bottom),
   * as the reference's strands die away toward a corner. The box applies it
   * as a mask, so it stays put while the drawing slides.
   */
  fadeAngle: number;
}

/** Faint to bright: the depth bands' stroke opacities. */
export const BAND_OPACITY = [0.26, 0.44, 0.68, 0.95] as const;

/** A frame is this wide; its height follows the box's aspect. */
export const FRAME_WIDTH = 400;

/** Flowing kinds loop by sliding; the rest sway. */
export const isFlowKind = (kind: ArtKind): boolean =>
  kind === 'strands' || kind === 'helix';

const STROKE: Record<ArtDensity, number> = {
  thumb: 1.4,
  tile: 1.75,
  hero: 2,
};

/** A toned scene's bands (1 white, 2 tint, 3 the hue): tone and weight. */
const TONE_BANDS: Record<
  ArtDensity,
  readonly (readonly [band: number, tone: ArtTone, widthScale: number])[]
> = {
  thumb: [
    [1, 'white', 0.75],
    [2, 'tint', 1],
    [3, 'accent', 1.5],
  ],
  tile: [
    [1, 'white', 0.8],
    [2, 'tint', 1.15],
    [3, 'accent', 1.75],
  ],
  hero: [
    [1, 'white', 1.1],
    [2, 'tint', 1.75],
    [3, 'accent', 2.75],
  ],
};

/** The glow: the brightest lines again, this much wider, this faint. */
export const GLOW = { widthScale: 3.5, opacity: 0.14 } as const;

function buildLines(
  kind: ArtKind,
  input: BuildInput,
  variant: RingsVariant,
  mode: ChladniMode | undefined,
): ArtLine[] {
  switch (kind) {
    case 'strands':
      return strands(input);
    case 'rings':
      return rings(input, variant);
    case 'contours':
      return contours(input);
    case 'helix':
      return helix(input);
    case 'spiral':
      return spiral(input);
    case 'lissajous':
      return lissajous(input);
    case 'rays':
      return rays(input);
    case 'petals':
      return petals(input);
    case 'mesh':
      return mesh(input);
    case 'waveform':
      return waveform(input);
    case 'standing':
      return standing(input);
    case 'moire':
      return moire(input);
    case 'chladni':
      return chladni(input, mode);
  }
}

/**
 * The gradient's run: one lap of the palette (cyclicStops) across a frame.
 * A sliding cover's runs along x and repeats every frame, so the colours
 * travel with the lines and the loop has no seam; a still one runs on a
 * seeded diagonal.
 */
function gradientOf(
  palette: ArtPaletteName,
  rng: () => number,
  width: number,
  height: number,
  flow: boolean,
): ArtGradient {
  const lap = cyclicStops(palette);
  const stops = lap.map((color, i) => ({
    offset: i / (lap.length - 1),
    color,
  }));
  if (flow) {
    return { x1: 0, y1: 0, x2: width, y2: 0, spread: 'repeat', stops };
  }
  const corner = Math.floor(between(rng, 0, 4));
  const fromLeft = corner === 0 || corner === 3;
  const fromTop = corner < 2;
  return {
    x1: fromLeft ? 0 : width,
    y1: fromTop ? 0 : height,
    x2: fromLeft ? width : 0,
    y2: fromTop ? height : 0,
    spread: 'pad',
    stops,
  };
}

const CACHE_SIZE = 200;
const cache = new Map<string, ArtScene>();

const keyOf = (spec: ArtSpec): string =>
  [
    spec.seed,
    spec.kind ?? '',
    spec.variant ?? '',
    spec.mode ? `${spec.mode.n},${spec.mode.m},${spec.mode.sign}` : '',
    spec.palette ?? '',
    spec.density,
    // Boxes of nearly the same shape share a scene.
    Math.round(spec.aspect * 20) / 20,
    spec.loop ? 'loop' : '',
  ].join('|');

/** The cover a spec draws. The same spec gives the same scene object. */
export function buildArtScene(spec: ArtSpec): ArtScene {
  const key = keyOf(spec);
  const hit = cache.get(key);
  if (hit) {
    // Most recently used goes last.
    cache.delete(key);
    cache.set(key, hit);
    return hit;
  }

  const kind = spec.kind ?? kindFor(spec.seed);
  const palette = spec.palette ?? DEFAULT_ART_PALETTE;
  const variant: RingsVariant | undefined =
    kind === 'rings' ? (spec.variant ?? 'ripple') : undefined;
  const loop = !!spec.loop && isFlowKind(kind);
  const aspect = Math.min(12, Math.max(0.25, spec.aspect || 1));
  const width = FRAME_WIDTH;
  const height = Math.round(width / (Math.round(aspect * 20) / 20));
  const rng = artRandom(`${spec.seed}|${kind}|${variant ?? ''}`);

  const lines = buildLines(
    kind,
    { rng, width, height, density: spec.density, loop },
    variant ?? 'ripple',
    kind === 'chladni' ? spec.mode : undefined,
  );
  const bands: string[][] = [[], [], [], []];
  for (const line of lines) bands[line.band].push(linePath(line));
  const toned = kind === 'chladni';
  // Toned: white under the tint under the hue, flat, no glow.
  const tonedLayers: ArtLayer[] = TONE_BANDS[spec.density]
    .map(([band, tone, widthScale]) => ({
      d: bands[band].join(''),
      opacity: 1,
      widthScale,
      tone,
    }))
    .filter((layer) => layer.d.length > 0);
  const lineLayers: ArtLayer[] = bands
    .map((paths, band) => ({
      d: paths.join(''),
      opacity: BAND_OPACITY[band],
      widthScale: 1,
    }))
    .filter((layer) => layer.d.length > 0);
  // The soft light: the brightest band again, wide and faint, behind.
  const brightest = lineLayers[lineLayers.length - 1];
  const layers: ArtLayer[] = toned
    ? tonedLayers
    : brightest
      ? [
          {
            d: brightest.d,
            opacity: GLOW.opacity,
            widthScale: GLOW.widthScale,
            glow: true,
          },
          ...lineLayers,
        ]
      : lineLayers;

  const scene: ArtScene = {
    kind,
    variant,
    palette,
    width,
    height,
    viewWidth: loop ? width * 2 : width,
    loop,
    layers,
    style: toned ? 'tones' : 'gradient',
    gradient: gradientOf(palette, rng, width, height, isFlowKind(kind)),
    strokeWidth: STROKE[spec.density],
    bytes: layers.reduce((sum, layer) => sum + layer.d.length, 0),
    // Mostly downward (where a card's words sit), a little either way.
    fadeAngle: Math.round(between(rng, 150, 210)),
  };
  cache.set(key, scene);
  if (cache.size > CACHE_SIZE) {
    cache.delete(cache.keys().next().value as string);
  }
  return scene;
}

/** Tests: forget every scene. */
export const clearArtSceneCache = (): void => cache.clear();
