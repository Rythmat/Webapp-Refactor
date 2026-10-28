// ── Generative cover art ───────────────────────────────────────────────────
// Line-art covers in multi-hue gradients (owner, 2026-10-28: the Muzaic
// look), drawn from each item's id. Pure: the React side is
// components/art/ArtCover.

export type { ArtDensity } from './builders';
export {
  ART_PALETTE_NAMES,
  ART_PALETTES,
  cyclicStops,
  DEFAULT_ART_PALETTE,
  isArtPaletteName,
  paletteAccent,
  paletteAt,
  samplePalette,
  SPECTRUM,
  type ArtPaletteName,
} from './palettes';
export {
  ALTERNATE_PALETTES,
  ART_KINDS,
  kindFor,
  paletteFor,
  type ArtKind,
  type ChladniMode,
  type RingsVariant,
} from './seed';
export {
  BAND_OPACITY,
  buildArtScene,
  clearArtSceneCache,
  FRAME_WIDTH,
  GLOW,
  isFlowKind,
  type ArtGradient,
  type ArtLayer,
  type ArtScene,
  type ArtSpec,
  type ArtTone,
} from './scene';
export { CHLADNI_LEVELS } from './builders';
export {
  allocateFigures,
  CHLADNI_POOL,
  chladniGradient,
  chladniValue,
  CYMATIC_TIMING,
  cymaticSequence,
  morphAt,
  type FigureSlot,
} from './cymatics';
