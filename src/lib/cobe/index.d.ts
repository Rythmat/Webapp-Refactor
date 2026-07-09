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
}

export interface Globe {
  update: (state: Partial<COBEOptions>) => void;
  destroy: () => void;
}

export default function createGlobe(
  canvas: HTMLCanvasElement,
  opts: COBEOptions,
): Globe;
