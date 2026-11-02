import {
  circle,
  compileDrawing,
  lathe,
  polyFace,
  project,
  roundedRect,
  type CompiledDrawing,
  type Solid,
  type V2,
  type V3,
} from '@/curriculum/anatomy/iso';

// ── Building blocks for gear ───────────────────────────────────────────────
// In the same space as the Anatomy models: the viewer is at −u, +v, +z, so a
// box shows its top, its −u face (lower left on the page) and its +v face
// (lower right). Jacks and controls go on those three faces.

export const box = (
  u0: number,
  u1: number,
  v0: number,
  v1: number,
  z0: number,
  z1: number,
  radius = 0.2,
  hatchGap = 0.5,
): Solid => ({
  outer: roundedRect(
    (u0 + u1) / 2,
    (v0 + v1) / 2,
    (u1 - u0) / 2,
    (v1 - v0) / 2,
    radius,
  ),
  z0,
  z1,
  hatchGap,
});

/** A flat rectangle lying on a −u face. */
export const frontFace = (
  u: number,
  v0: number,
  v1: number,
  z0: number,
  z1: number,
): Solid =>
  polyFace([
    [u, v0, z0],
    [u, v1, z0],
    [u, v1, z1],
    [u, v0, z1],
  ]);

/** A flat rectangle lying on a +v face. */
export const sideFace = (
  v: number,
  u0: number,
  u1: number,
  z0: number,
  z1: number,
): Solid =>
  polyFace([
    [u0, v, z0],
    [u1, v, z0],
    [u1, v, z1],
    [u0, v, z1],
  ]);

/** A closed loop on a −u face. */
export const frontRing = (
  u: number,
  v: number,
  z: number,
  r: number,
  points = 24,
): V3[] => {
  const ring = circle(v, z, r, points);
  return [...ring, ring[0]].map(([a, b]): V3 => [u, a, b]);
};

/** A closed loop on a +v face. */
export const sideRing = (
  v: number,
  u: number,
  z: number,
  r: number,
  points = 24,
): V3[] => {
  const ring = circle(u, z, r, points);
  return [...ring, ring[0]].map(([a, b]): V3 => [a, v, b]);
};

/** A closed loop on a top face. */
export const topRing = (
  u: number,
  v: number,
  z: number,
  r: number,
  points = 24,
): V3[] => {
  const ring = circle(u, v, r, points);
  return [...ring, ring[0]].map(([a, b]): V3 => [a, b, z]);
};

/** A knob on a top face, its pointer turned toward `angle`. */
export const topKnob = (
  u: number,
  v: number,
  z: number,
  r: number,
  height = r * 1.1,
): Solid =>
  lathe({
    origin: [u, v, z],
    axis: [0, 0, 1],
    profile: [
      [0, r * 1.14],
      [height * 0.22, r * 1.14, 'seam'],
      [height * 0.3, r],
      [height, r * 0.86],
    ],
    texture: 'helix',
    strands: 20,
    from: height * 0.3,
    to: height,
  });

/** A knob on a −u face. */
export const frontKnob = (
  u: number,
  v: number,
  z: number,
  r: number,
  depth = r * 1.05,
): Solid =>
  lathe({
    origin: [u, v, z],
    axis: [-1, 0, 0],
    profile: [
      [0, r * 1.12],
      [depth * 0.24, r * 1.12, 'seam'],
      [depth * 0.3, r],
      [depth, r * 0.84],
    ],
    texture: 'helix',
    strands: 18,
    from: depth * 0.3,
    to: depth,
  });

/** A round socket's visible parts: the collar, and a dark hole. */
export const jackCollar = (origin: V3, axis: V3, r: number): Solid =>
  lathe({
    origin,
    axis,
    profile: [
      [0, r * 1.5],
      [r * 0.28, r * 1.5, 'seam'],
      [r * 0.34, r],
      [r * 0.6, r],
    ],
  });

// ── Compiled gear ──────────────────────────────────────────────────────────

export interface GearPart {
  id: string;
  /** Overlapping solids, each painted over the one before. */
  layers: readonly CompiledDrawing[];
  tone?: 'light';
  lineWeight?: number;
  /** Its faces are clear: a grille over a cone. */
  open?: boolean;
}

export interface PortSpot {
  /** On the page, in the gear's own units. */
  at: V2;
  /** Which way a plug's cable leaves it, in 3D. */
  axis: V3;
}

/** How a part moves with what the gear is doing. */
export type GearMover =
  | { type: 'pump'; part: string; axis: V3; reach: number }
  | {
      type: 'fader';
      part: string;
      control: string;
      min: number;
      max: number;
      travel: V3;
    };

export interface GearVisual {
  parts: readonly GearPart[];
  ports: Readonly<Record<string, PortSpot>>;
  /** Its reach on the page. */
  box: { x0: number; y0: number; x1: number; y1: number };
  movers?: readonly GearMover[];
  /** Scale to draw it at on the bench when nothing says otherwise. */
  scale: number;
  /** Extra room above its name, where a plug hangs below the drawing. */
  nameGap?: number;
}

export interface PartSpec {
  id: string;
  solids: readonly Solid[];
  marks?: readonly (readonly V3[])[];
  tone?: 'light';
  lineWeight?: number;
  open?: boolean;
  /** Paint each solid over the one before. */
  stacked?: boolean;
}

export const spot = (at: V3, axis: V3): PortSpot => ({
  at: project(at[0], at[1], at[2]),
  axis,
});

export function boxOfDrawings(
  layers: readonly CompiledDrawing[],
): GearVisual['box'] {
  const points = layers.flatMap((layer) => layer.points);
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  return {
    x0: Math.min(...xs),
    y0: Math.min(...ys),
    x1: Math.max(...xs),
    y1: Math.max(...ys),
  };
}

export function compileParts(specs: readonly PartSpec[]): GearPart[] {
  return specs.map((spec) => ({
    id: spec.id,
    layers: spec.stacked
      ? spec.solids.map((solid, i) =>
          compileDrawing(
            [solid],
            i === spec.solids.length - 1 ? spec.marks : [],
          ),
        )
      : [compileDrawing(spec.solids, spec.marks)],
    tone: spec.tone,
    lineWeight: spec.lineWeight,
    open: spec.open,
  }));
}

export function visual(
  specs: readonly PartSpec[],
  ports: GearVisual['ports'],
  options: { scale?: number; movers?: readonly GearMover[] } = {},
): GearVisual {
  const parts = compileParts(specs);
  return {
    parts,
    ports,
    box: boxOfDrawings(parts.flatMap((part) => part.layers)),
    movers: options.movers,
    scale: options.scale ?? 1,
  };
}
