// ── Seeds ──────────────────────────────────────────────────────────────────
// A cover is drawn from its item's id: the same id, the same picture, on
// every device and every render. The numbers come from Echo's seeded source
// (FNV-1a + mulberry32), the app's one deterministic random.

import {
  echoRandom,
  pickOne,
  type EchoRandom,
} from '@/curriculum/engine/echo/random';
import { ART_PALETTE_NAMES, type ArtPaletteName } from './palettes';

export type ArtRandom = EchoRandom;

export const ART_KINDS = [
  'strands',
  'rings',
  'contours',
  'helix',
  'spiral',
  'lissajous',
  'rays',
  'petals',
  'mesh',
  'waveform',
  'standing',
  'moire',
  'chladni',
] as const;
export type ArtKind = (typeof ART_KINDS)[number];

/** The kinds a seed picks from: Chladni figures are named, never drawn by
 *  chance (so adding them moved no one's cover). */
const SEEDED_KINDS = ART_KINDS.filter((kind) => kind !== 'chladni');

/**
 * A Chladni figure's mode: n and m nodal lines across the plate's two
 * ways, and the balance of its two terms, cos(nu)cos(mv) + sign ·
 * cos(mu)cos(nv): 1 or -1 the symmetric and antisymmetric figures, 0 the
 * plain n : m ratio, ±0.5 the figures between. (n, m) and (m, n) draw the
 * same figure, turned.
 */
export interface ChladniMode {
  n: number;
  m: number;
  sign: number;
}

/** Rings come as one set of ripples, or as several interlocking orbits. */
export type RingsVariant = 'ripple' | 'orbit';

export const artRandom = (seed: string): ArtRandom => echoRandom(`art:${seed}`);

/** The alternates: every colour palette but the default spectrum (white is
 *  chosen, never drawn by a seed). */
export const ALTERNATE_PALETTES = ART_PALETTE_NAMES.filter(
  (name) => name !== 'spectrum' && name !== 'white',
);

/**
 * An alternate palette chosen by a seed (the contact sheet's shuffles; an
 * item that asks for "any palette but the spectrum"). Covers are drawn in
 * the spectrum unless they name one.
 */
export const paletteFor = (seed: string): ArtPaletteName =>
  pickOne(echoRandom(`art-palette:${seed}`), ALTERNATE_PALETTES);

/** The kind a seed draws when the item names none. */
export const kindFor = (seed: string): ArtKind =>
  pickOne(echoRandom(`art-kind:${seed}`), SEEDED_KINDS);

/** A number in [lo, hi). */
export const between = (rng: ArtRandom, lo: number, hi: number): number =>
  lo + rng() * (hi - lo);
