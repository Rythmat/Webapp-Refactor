import {
  compileDrawing,
  lathe,
  project,
  type CompiledDrawing,
  type V2,
  type V3,
} from '@/curriculum/anatomy/iso';
import type { CableKind } from '../rig/rigTypes';

// ── Cables and their plugs ─────────────────────────────────────────────────
// A cable leaves each plug along the jack's own direction, then hangs between
// them. Plugs are real little round parts, one shape per connector, so the eye
// can learn an XLR from a jack from a USB.

/** A jack's own direction, on the page, unit length. */
export function pageDirection(axis: V3): V2 {
  const [x, y] = project(axis[0], axis[1], axis[2]);
  const length = Math.hypot(x, y) || 1;
  return [x / length, y / length];
}

const round = (n: number) => Math.round(n * 100) / 100;

/** The hanging line between two ends, leaving each along its direction. */
export function cablePath(
  a: V2,
  directionA: V2,
  b: V2,
  directionB: V2,
): string {
  const span = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const reach = Math.max(3, Math.min(span * 0.28, 20));
  const hang = Math.min(span * 0.1, 7);
  const c1: V2 = [
    a[0] + directionA[0] * reach,
    a[1] + directionA[1] * reach + hang,
  ];
  const c2: V2 = [
    b[0] + directionB[0] * reach,
    b[1] + directionB[1] * reach + hang,
  ];
  return `M${round(a[0])} ${round(a[1])}C${round(c1[0])} ${round(c1[1])} ${round(c2[0])} ${round(c2[1])} ${round(b[0])} ${round(b[1])}`;
}

/** Each connector's profile along its axis, from the jack outward. */
const PLUG_PROFILES: Readonly<
  Record<CableKind, readonly (readonly [number, number, 'seam'?])[]>
> = {
  xlr: [
    [0, 0.82],
    [1.5, 0.82, 'seam'],
    [1.7, 0.74],
    [3.1, 0.62, 'seam'],
    [3.9, 0.3],
  ],
  ts: [
    [-0.5, 0.22],
    [0, 0.26],
    [0.2, 0.55, 'seam'],
    [2.5, 0.55, 'seam'],
    [3.3, 0.3],
  ],
  trs: [
    [-0.5, 0.2],
    [-0.28, 0.24, 'seam'],
    [0, 0.24, 'seam'],
    [0.2, 0.52, 'seam'],
    [2.4, 0.52, 'seam'],
    [3.1, 0.28],
  ],
  usb: [
    [0, 0.48],
    [0.8, 0.48, 'seam'],
    [0.9, 0.7],
    [2.5, 0.62, 'seam'],
    [3.1, 0.26],
  ],
  midi: [
    [0, 0.72],
    [1.1, 0.72, 'seam'],
    [1.2, 0.78],
    [2.8, 0.6, 'seam'],
    [3.4, 0.28],
  ],
  speakon: [
    [0, 1.05],
    [0.9, 1.05, 'seam'],
    [1.1, 0.9],
    [2.7, 0.76, 'seam'],
    [3.6, 0.36],
  ],
  iec: [
    [0, 0.9],
    [1.6, 0.9, 'seam'],
    [2.6, 0.54],
    [3.1, 0.3],
  ],
  multicore: [
    [0, 1.25],
    [1.6, 1.25, 'seam'],
    [1.9, 1.05],
    [4, 0.86, 'seam'],
    [5, 0.55],
  ],
};

const plugCache = new Map<string, CompiledDrawing>();

/** The plug's drawing around the jack, on the page. */
export function plugDrawing(kind: CableKind, axis: V3): CompiledDrawing {
  const key = `${kind}:${axis.join(',')}`;
  let drawing = plugCache.get(key);
  if (!drawing) {
    const length = Math.hypot(axis[0], axis[1], axis[2]) || 1;
    const unit: V3 = [axis[0] / length, axis[1] / length, axis[2] / length];
    drawing = compileDrawing([
      lathe({ origin: [0, 0, 0], axis: unit, profile: PLUG_PROFILES[kind] }),
    ]);
    plugCache.set(key, drawing);
  }
  return drawing;
}

/** Where the plug's boot ends, and the cable begins. */
export function plugTail(kind: CableKind, axis: V3): V2 {
  const profile = PLUG_PROFILES[kind];
  const reach = profile[profile.length - 1][0];
  const length = Math.hypot(axis[0], axis[1], axis[2]) || 1;
  return project(
    (axis[0] / length) * reach,
    (axis[1] / length) * reach,
    (axis[2] / length) * reach,
  );
}

/** A heavier line for the cables that carry more. */
export const CABLE_WIDTH: Readonly<Record<CableKind, number>> = {
  xlr: 1.7,
  ts: 1.5,
  trs: 1.5,
  usb: 1.4,
  midi: 1.5,
  speakon: 2.2,
  iec: 1.9,
  multicore: 3.2,
};
