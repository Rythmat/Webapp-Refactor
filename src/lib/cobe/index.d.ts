export interface Marker {
  location: [number, number];
  size: number;
  color?: [number, number, number];
  id?: string;
}

export interface Arc {
  from: [number, number];
  to: [number, number];
  color?: [number, number, number];
  id?: string;
}

export interface COBEOptions {
  width: number;
  height: number;
  phi: number;
  theta: number;
  mapSamples: number;
  mapBrightness: number;
  mapBaseBrightness?: number;
  baseColor: [number, number, number];
  markerColor: [number, number, number];
  glowColor: [number, number, number];
  markers?: Marker[];
  diffuse: number;
  devicePixelRatio: number;
  dark: number;
  opacity?: number;
  offset?: [number, number];
  scale?: number;
  context?: WebGLContextAttributes;

  // New in v2
  arcs?: Arc[];
  arcColor?: [number, number, number];
  arcWidth?: number;
  arcHeight?: number;
  markerElevation?: number;

  // Local patch: colored land texture. When provided, land dots take their
  // colour from this texture's RGB (and land mask from its alpha) instead of
  // the single `baseColor`. See src/lib/cobe/index.js.
  mapTexture?: TexImageSource;
  /**
   * Local patch: fill the land solid from `mapTexture` instead of as dots
   * (`baseColor` is then the ocean). See src/lib/cobe/index.js.
   */
  mapSolid?: boolean;

  // Local patch: arc draw-on with a rainbow head (see index.js). How far
  // along each arc is drawn (0–1; past 1 the head has arrived; default: all).
  arcProgress?: number;
  /** Up to 12 RGB colours (0–1) run behind the head. */
  arcRainbow?: [number, number, number][];
  /** How much of the progress the rainbow trails the head by (0 = none). */
  arcRainbowTail?: number;
}

export interface Globe {
  update: (state: Partial<COBEOptions>) => void;
  destroy: () => void;
}

export default function createGlobe(
  canvas: HTMLCanvasElement,
  opts: COBEOptions,
): Globe;
