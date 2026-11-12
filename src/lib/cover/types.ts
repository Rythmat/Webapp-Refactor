// ── Course covers: what's drawn on a Learn card ────────────────────────────
// A cover is built from a spec (the course's music, its key colours and a
// seed) into a scene: filled SVG shapes in a 100×100 box, or, for the mesh
// family, layered CSS gradients. Pure data, so it can be tested and cached.

export type CoverFamily =
  | 'truchet'
  | 'mesh'
  | 'motif'
  | 'rings'
  | 'noodles'
  | 'subdivide';

/** How a Truchet cover arranges its winged tiles (Carlson's patterns): each
 *  a symmetry of the square (owner, 2026-11-05: "more symmetry"). */
export type TruchetLayout =
  | 'mirror'
  | 'mirror-dots'
  | 'kaleido'
  | 'diagonal'
  | 'pinwheel'
  | 'pinwheel-lines';

/** What a Truchet cover's steps draw: arcs (W one diagonal, H the
 *  other), lines (W down, H across), mixed (W arcs, H lines), or dots (H a
 *  cell of dots). */
export type TruchetTiles = 'arcs' | 'lines' | 'mixed' | 'dots';

/** Suno's collection motifs. */
export type CoverMotif = 'burst' | 'sun' | 'rays' | 'tunnel';

interface CoverBase {
  /** The course's id: the same seed, the same cover. */
  seed: string;
  /** The key's colour and its neighbour's round the fifths. */
  colors: readonly [string, string];
  /** A course (several lessons): drawn as a little stack of cards. */
  stacked: boolean;
}

export type CoverSpec =
  | (CoverBase & {
      family: 'truchet';
      layout: TruchetLayout;
      /** The scale's steps round the octave: W, H, 1½, 2. */
      steps: readonly string[];
      /** The scale's pitch classes above its tonic. */
      pcs: readonly number[];
      /** Tiles across on a card (3–5); by the scale's size if left out. */
      grid?: number;
      /** Which motifs the steps draw (owner, 2026-11-05: more variety). */
      tiles?: TruchetTiles;
      /** Ink and paper swapped: the gradient fills the tiles, the motifs
       *  cut out of it. */
      invert?: boolean;
      /** Which orbit splits into half-size tiles: the centre, the ring
       *  round it, or none; a note of the scale's if left out. */
      split?: 'centre' | 'ring' | 'none';
    })
  | (CoverBase & {
      family: 'mesh';
      /** The genre's groove: its hits place the colour. */
      groove: { steps: number; hits: readonly number[] };
      /** Set large inside the tile, as Suno's genre tiles are. */
      title: string;
    })
  | (CoverBase & {
      family: 'motif';
      motif: CoverMotif;
      ratio: readonly [number, number];
    })
  | (CoverBase & {
      family: 'rings';
      ratio: readonly [number, number];
      /** Where the second set's centre sits: four placements. */
      variant: number;
    })
  | (CoverBase & {
      family: 'noodles';
      ratio: readonly [number, number];
    })
  | (CoverBase & {
      family: 'subdivide';
      ratios: readonly (readonly [number, number])[];
      depth: number;
    });

/** A card, or the Continue hero's larger, richer picture. */
export type CoverDetail = 'card' | 'hero';

export interface CoverGradient {
  /** Local id; a fill of `@<id>` paints with it. */
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stops: readonly (readonly [offset: number, color: string])[];
}

export interface CoverShape {
  d: string;
  /** A colour, or `@<gradient id>`. */
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  /** Light overlapping light, as two inks would. */
  blend?: 'screen';
}

export type CoverScene =
  | {
      kind: 'svg';
      /** A colour or `@<gradient id>` under everything. */
      background: string;
      gradients: readonly CoverGradient[];
      shapes: readonly CoverShape[];
      bytes: number;
    }
  | {
      kind: 'mesh';
      /** The field's own colour, under its blobs. */
      base: string;
      /** CSS radial-gradient layers, top first. */
      layers: readonly string[];
      bytes: number;
    };

/** What tells two covers apart, as a person would see it. */
export const coverSignature = (spec: CoverSpec): string => {
  switch (spec.family) {
    case 'truchet':
      return `truchet:${spec.layout}:${spec.grid ?? spec.pcs.length}:${spec.tiles ?? 'arcs'}:${spec.invert ? 'inverted' : ''}:${spec.split ?? ''}:${spec.colors[0]}`;
    case 'mesh':
      return `mesh:${spec.colors.join('/')}:${spec.groove.hits.join('.')}`;
    case 'motif':
      return `motif:${spec.motif}:${spec.ratio.join(':')}:${spec.colors[0]}`;
    case 'rings':
      return `rings:${spec.ratio.join(':')}:${spec.variant}:${spec.colors[0]}`;
    case 'noodles':
      return `noodles:${spec.seed}`;
    case 'subdivide':
      return `subdivide:${spec.ratios.map((r) => r.join(':')).join(',')}:${spec.colors[0]}`;
  }
};
