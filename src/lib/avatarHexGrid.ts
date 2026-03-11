/**
 * Avatar hex grid generation engine.
 *
 * Ported from flytaly/hexagon-grid — extracts the core noise + hex layout +
 * color-fill logic into a self-contained module for procedural avatar generation.
 *
 * Dependencies: simplex-noise, alea, honeycomb-grid@3, nice-color-palettes
 */

import Alea from 'alea';
import * as Honeycomb from 'honeycomb-grid';
import palettes from 'nice-color-palettes/200';
import { createNoise2D } from 'simplex-noise';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AvatarConfig {
  seed: number;
  noiseType: NoiseType;
  paletteIndex: number;
  cellSize: number;
  zoom: number;
  isGradient: boolean;
  orientation: 'pointy' | 'flat';
  hueShift: number;
  saturationShift: number;
  lightnessShift: number;
}

export type NoiseType = 'simplex' | 'diagonal' | 'circle' | 'sinCos' | 'line';

export const NOISE_TYPES: NoiseType[] = [
  'simplex',
  'diagonal',
  'circle',
  'sinCos',
  'line',
];

export const NOISE_LABELS: Record<NoiseType, string> = {
  simplex: 'Organic',
  diagonal: 'Gradient',
  circle: 'Radial',
  sinCos: 'Wave',
  line: 'Stripe',
};

export interface AvatarPolygon {
  points: string; // "x1,y1 x2,y2 ..." for SVG polygon
  fill: string; // hex color string
  opacity: number;
}

export interface AvatarPolygonData {
  polygons: AvatarPolygon[];
  width: number;
  height: number;
}

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------

interface RGB {
  r: number;
  g: number;
  b: number;
  a?: number;
}

function hexToRgb(hex: string): RGB {
  const shorthand = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  const full = hex.replace(shorthand, (_, r, g, b) => r + r + g + g + b + b);
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(full);
  if (!m) return { r: 128, g: 128, b: 128 };
  return {
    r: parseInt(m[1], 16),
    g: parseInt(m[2], 16),
    b: parseInt(m[3], 16),
  };
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return [Math.floor(h * 360), Math.floor(s * 100), Math.floor(l * 100)];
}

function hslToRgbHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const hNorm = h / 360;
    r = hue2rgb(p, q, hNorm + 1 / 3);
    g = hue2rgb(p, q, hNorm);
    b = hue2rgb(p, q, hNorm - 1 / 3);
  }

  const toHex = (v: number) =>
    Math.round(v * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// ---------------------------------------------------------------------------
// Math helpers
// ---------------------------------------------------------------------------

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

function lerp(x: number, y: number, a: number): number {
  return (1 - a) * x + a * y;
}

// ---------------------------------------------------------------------------
// Noise functions
// ---------------------------------------------------------------------------

type NoiseFn = (x: number, y: number, w?: number, h?: number) => number;

function getNoises(seed: string): {
  fns: Record<NoiseType, NoiseFn>;
  rnd: (strength: number) => number;
} {
  const noise2D = createNoise2D(Alea(seed));
  const prng = Alea(seed);
  const n1D = (v: number) => noise2D(v, 0);

  const fns: Record<NoiseType, NoiseFn> = {
    line: (x) => n1D(x),
    diagonal: (x, y) =>
      clamp(x * Math.cos(Math.PI / 4) + y * Math.sin(Math.PI / 4), -1, 1),
    simplex: (x, y) => noise2D(x, y),
    circle: (x, y, w = 1, h = 1) =>
      Math.sqrt((x / w) ** 2 + (y / h) ** 2) - 0.5,
    sinCos: (x, y) => Math.cos(x) * Math.sin(y),
  };

  const rnd = (strength: number) => lerp(-strength, strength, prng());

  return { fns, rnd };
}

// ---------------------------------------------------------------------------
// Color picking
// ---------------------------------------------------------------------------

function getColorPicker(
  paletteHexColors: string[],
  isGradient: boolean,
): (n: number) => RGB {
  const rgbs = paletteHexColors.map(hexToRgb);

  if (!isGradient) {
    return (n: number) => {
      const idx = clamp(
        Math.floor(n * 0.999999 * rgbs.length),
        0,
        rgbs.length - 1,
      );
      return rgbs[idx];
    };
  }

  // Linear gradient interpolation between palette colors
  return (n: number) => {
    const t = clamp(n, 0, 1) * (rgbs.length - 1);
    const lo = Math.floor(t);
    const hi = Math.min(lo + 1, rgbs.length - 1);
    const frac = t - lo;
    return {
      r: Math.round(lerp(rgbs[lo].r, rgbs[hi].r, frac)),
      g: Math.round(lerp(rgbs[lo].g, rgbs[hi].g, frac)),
      b: Math.round(lerp(rgbs[lo].b, rgbs[hi].b, frac)),
    };
  };
}

// ---------------------------------------------------------------------------
// Default config from username
// ---------------------------------------------------------------------------

function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function defaultAvatarConfig(username: string): AvatarConfig {
  const h = hashString(username || 'USER');
  return {
    seed: h,
    noiseType: NOISE_TYPES[h % NOISE_TYPES.length],
    paletteIndex: (h >>> 3) % palettes.length,
    cellSize: 3 + (h % 4), // 3–6
    zoom: 8 + (h % 8), // 8–15
    isGradient: (h & 1) === 0,
    orientation: (h & 2) === 0 ? 'pointy' : 'flat',
    hueShift: (h % 61) - 30, // -30 to 30
    saturationShift: (h % 41) - 20, // -20 to 20
    lightnessShift: (h % 21) - 10, // -10 to 10
  };
}

export function randomizeConfig(): AvatarConfig {
  const seed = Math.round(Math.random() * 10_000_000);
  return defaultAvatarConfig(String(seed));
}

// ---------------------------------------------------------------------------
// Palette access
// ---------------------------------------------------------------------------

export const PALETTE_COUNT = palettes.length;

export function getPaletteColors(index: number): string[] {
  return palettes[clamp(index, 0, palettes.length - 1)];
}

// ---------------------------------------------------------------------------
// Main generation
// ---------------------------------------------------------------------------

export function generateAvatarPolygons(
  config: AvatarConfig,
  width: number,
  height: number,
): AvatarPolygonData {
  const {
    seed,
    noiseType,
    paletteIndex,
    cellSize,
    zoom,
    isGradient,
    orientation,
    hueShift,
    saturationShift,
    lightnessShift,
  } = config;

  const paletteHex = getPaletteColors(paletteIndex);
  const { fns, rnd } = getNoises(String(seed));
  const noiseFn = fns[noiseType];
  const getColor = getColorPicker(paletteHex, isGradient);

  // Calculate hex size from cell percentage
  const aspect = width / height;
  const hexSize =
    aspect < 1
      ? (cellSize * height * aspect) / 100
      : (cellSize * width) / aspect / 100;

  const widthStep =
    orientation === 'pointy' ? hexSize * Math.sqrt(3) : hexSize * 1.5;
  const heightStep =
    orientation === 'pointy' ? hexSize * 1.5 : hexSize * Math.sqrt(3);

  const cellsNumW = Math.ceil(width / widthStep) + 1;
  const cellsNumH = Math.ceil(height / heightStep) + 1;
  const normalW = aspect < 1 ? cellsNumW / 10 : cellsNumW / 10 / aspect;
  const normalH = aspect < 1 ? (cellsNumH * aspect) / 10 : cellsNumH / 10;

  // Create hex grid
  const Hex = Honeycomb.extendHex({ size: hexSize, orientation });
  const Grid = Honeycomb.defineGrid(Hex);
  const grid = Grid.rectangle({
    width: cellsNumW,
    height: cellsNumH,
    start: [-1, -1],
  });

  const noise2Strength = 0.2;
  const polygons: AvatarPolygon[] = [];

  grid.forEach((hexagon) => {
    // Calculate noise value
    const cx = (hexagon.x - cellsNumW / 2 + 1) / zoom;
    const cy = (hexagon.y - cellsNumH / 2 + 1) / zoom;

    const noiseVal = clamp(
      noiseFn(cx, cy, normalW, normalH) + rnd(noise2Strength),
      -1,
      1,
    );

    // Map noise to color
    const colorId = clamp((noiseVal + 1) / 2, 0, 1);
    const color = getColor(colorId);
    const [h, s, l] = rgbToHsl(color.r, color.g, color.b);

    const finalH = Math.round(h + hueShift * noiseVal);
    const finalS = Math.round(clamp(s + saturationShift * noiseVal, 0, 100));
    const finalL = Math.round(clamp(l + lightnessShift * noiseVal, 0, 100));
    const fill = hslToRgbHex(finalH, finalS, finalL);

    // Get polygon vertices
    const point = hexagon.toPoint();
    const corners = hexagon.corners();
    const pts = corners
      .map((corner) => {
        const { x, y } = corner.add(point);
        return `${Math.round(x)},${Math.round(y)}`;
      })
      .join(' ');

    polygons.push({ points: pts, fill, opacity: 1 });
  });

  return { polygons, width, height };
}
