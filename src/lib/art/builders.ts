// ── The four kinds of cover ────────────────────────────────────────────────
// Each builder draws lines in a W × H frame (y down), from a seeded random:
//   strands   a field of wavy lines across the frame (Muzaic's player)
//   rings     ripples round a drifting centre, or interlocking orbits
//   contours  nested wobbled loops round two or three peaks (a map)
//   helix     strands twisted round an axis, crossing like a rope
//   chladni   a vibrating plate's nodal lines (GRM's Atelier figures)
// Strands and helix repeat every W across, so a looping cover can be drawn
// two frames wide and slid one frame along, seamlessly.
//
// `band` (0 faint … 3 bright) is a line's depth: the scene strokes each band
// at its own opacity.

import type { ArtLine, Point } from './path';
import {
  between,
  type ArtRandom,
  type ChladniMode,
  type RingsVariant,
} from './seed';

export type ArtDensity = 'thumb' | 'tile' | 'hero';

export interface BuildInput {
  rng: ArtRandom;
  width: number;
  height: number;
  density: ArtDensity;
  /** Draw across two frames (strands and helix), for a looping drift. */
  loop: boolean;
}

const TAU = Math.PI * 2;

const bandOf = (t: number) => Math.min(3, Math.max(0, Math.floor(t * 4)));

/** Integer cycles per frame, so a wave repeats exactly every W. */
const cycles = (rng: ArtRandom, lo: number, hi: number) =>
  Math.floor(between(rng, lo, hi + 1));

// ── Strands ────────────────────────────────────────────────────────────────

const STRAND_LINES: Record<ArtDensity, number> = {
  thumb: 8,
  tile: 12,
  hero: 18,
};
const STRAND_SAMPLES: Record<ArtDensity, number> = {
  thumb: 14,
  tile: 18,
  hero: 26,
};

/**
 * Calm strands, as the reference's Share card draws them: a dozen lines
 * stacked in one band, all one gentle swell, fanning a little apart and back
 * along their length. One cycle per frame, so they repeat every W.
 */
export function strands({
  rng,
  width: W,
  height: H,
  density,
  loop,
}: BuildInput): ArtLine[] {
  const lines = STRAND_LINES[density];
  const frames = loop ? 2 : 1;
  const samples = STRAND_SAMPLES[density] * frames;
  // The band the strands lie in, and how far apart they fan.
  const centre = H * between(rng, 0.34, 0.56);
  const band = H * between(rng, 0.42, 0.62);
  const fan = { a: between(rng, 0.25, 0.5), phase: between(rng, 0, TAU) };
  // One long swell, and a faint second wave that slides across the lines.
  const swell = { a: H * between(rng, 0.1, 0.16), phase: between(rng, 0, TAU) };
  const ripple = {
    a: H * between(rng, 0.015, 0.035),
    phase: between(rng, 0, TAU),
    step: between(rng, -0.35, 0.35),
  };
  const out: ArtLine[] = [];
  for (let i = 0; i < lines; i++) {
    const t = i / (lines - 1);
    const points: Point[] = [];
    for (let s = 0; s <= samples; s++) {
      const x = (s / samples) * W * frames;
      const u = (TAU * x) / W;
      const spread = 1 + fan.a * Math.sin(u + fan.phase);
      const y =
        centre +
        (t - 0.5) * band * spread +
        swell.a * Math.sin(u + swell.phase) +
        ripple.a * Math.sin(2 * u + ripple.phase + i * ripple.step);
      points.push({ x, y });
    }
    // The middle of the band brightest, its edges falling away.
    out.push({
      points,
      closed: false,
      band: bandOf(1 - Math.abs(t - 0.5) * 1.5),
    });
  }
  return out;
}

// ── Rings ──────────────────────────────────────────────────────────────────

const RING_COUNT: Record<ArtDensity, number> = {
  thumb: 8,
  tile: 11,
  hero: 16,
};

export function rings(
  { rng, width: W, height: H, density }: BuildInput,
  variant: RingsVariant = 'ripple',
): ArtLine[] {
  const D = Math.hypot(W, H);
  const out: ArtLine[] = [];
  if (variant === 'ripple') {
    const count = RING_COUNT[density];
    // A centre somewhere in the middle, drifting a little ring by ring, so
    // the ripples bunch on one side (Muzaic's offset rings).
    const cx = W * between(rng, 0.3, 0.7);
    const cy = H * between(rng, 0.32, 0.68);
    const angle = between(rng, 0, TAU);
    const drift = D * between(rng, 0.004, 0.012);
    const r0 = D * between(rng, 0.015, 0.035);
    const gap = (D * 0.62 - r0) / count;
    for (let k = 0; k < count; k++) {
      const t = k / (count - 1);
      out.push({
        circle: {
          cx: cx + Math.cos(angle) * drift * k,
          cy: cy + Math.sin(angle) * drift * k,
          r: r0 + gap * k,
        },
        band: bandOf(1 - t * 0.85),
      });
    }
    return out;
  }
  // Orbits: two or three sets of rings that overlap like a Venn.
  const sets = cycles(rng, 2, 3);
  const perSet = Math.max(4, Math.round(RING_COUNT[density] / sets));
  for (let s = 0; s < sets; s++) {
    const a = (s / sets) * TAU + between(rng, -0.4, 0.4);
    const reach = Math.min(W, H) * between(rng, 0.16, 0.26);
    const cx = W / 2 + Math.cos(a) * reach;
    const cy = H / 2 + Math.sin(a) * reach;
    const outer = Math.min(W, H) * between(rng, 0.38, 0.5);
    for (let k = 0; k < perSet; k++) {
      const t = (k + 1) / perSet;
      out.push({
        circle: { cx, cy, r: outer * t },
        band: bandOf(0.25 + 0.75 * t),
      });
    }
  }
  return out;
}

// ── Contours ───────────────────────────────────────────────────────────────
// A map's contour lines: a smooth height field (a few hills and hollows, a
// gentle tilt) cut at even heights by marching squares, so the lines nest
// and never cross, as on a real map.

const CONTOUR_LEVELS: Record<ArtDensity, number> = {
  thumb: 8,
  tile: 12,
  hero: 18,
};
const CONTOUR_GRID: Record<ArtDensity, number> = {
  thumb: 30,
  tile: 44,
  hero: 72,
};

/** Drop points a line hardly bends at (Ramer–Douglas–Peucker). */
export function simplify(points: readonly Point[], tolerance: number): Point[] {
  if (points.length < 3) return [...points];
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    const pa = points[a];
    const pb = points[b];
    const dx = pb.x - pa.x;
    const dy = pb.y - pa.y;
    const len = Math.hypot(dx, dy) || 1;
    let far = -1;
    let farDist = tolerance;
    for (let i = a + 1; i < b; i++) {
      const p = points[i];
      const dist = Math.abs(dy * (p.x - pa.x) - dx * (p.y - pa.y)) / len;
      if (dist > farDist) {
        far = i;
        farDist = dist;
      }
    }
    if (far >= 0) {
      keep[far] = 1;
      stack.push([a, far], [far, b]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

/**
 * The lines where a sampled field crosses `iso` (marching squares, saddles
 * split by the cell's mean), walked into polylines and simplified: open
 * ones from the frame's edge, then the closed loops.
 */
export function isoLines(
  field: readonly number[],
  cols: number,
  rows: number,
  dx: number,
  dy: number,
  iso: number,
  tolerance: number,
): { points: Point[]; closed: boolean }[] {
  const at = (r: number, c: number) => field[r * cols + c];
  // Where the iso line crosses each cell edge, by the edge's key.
  const cross = new Map<string, Point>();
  const edgePoint = (
    key: string,
    ax: number,
    ay: number,
    av: number,
    bx: number,
    by: number,
    bv: number,
  ) => {
    let p = cross.get(key);
    if (!p) {
      const f = (iso - av) / (bv - av || 1e-9);
      p = { x: ax + (bx - ax) * f, y: ay + (by - ay) * f };
      cross.set(key, p);
    }
    return key;
  };
  const links = new Map<string, string[]>();
  const link = (a: string, b: string) => {
    (links.get(a) ?? links.set(a, []).get(a)!).push(b);
    (links.get(b) ?? links.set(b, []).get(b)!).push(a);
  };
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols - 1; c++) {
      const tl = at(r, c);
      const tr = at(r, c + 1);
      const br = at(r + 1, c + 1);
      const bl = at(r + 1, c);
      const code =
        (tl > iso ? 8 : 0) |
        (tr > iso ? 4 : 0) |
        (br > iso ? 2 : 0) |
        (bl > iso ? 1 : 0);
      if (code === 0 || code === 15) continue;
      const x0 = c * dx;
      const y0 = r * dy;
      const x1 = x0 + dx;
      const y1 = y0 + dy;
      const top = () => edgePoint(`h${r}:${c}`, x0, y0, tl, x1, y0, tr);
      const right = () => edgePoint(`v${r}:${c + 1}`, x1, y0, tr, x1, y1, br);
      const bottom = () => edgePoint(`h${r + 1}:${c}`, x0, y1, bl, x1, y1, br);
      const left = () => edgePoint(`v${r}:${c}`, x0, y0, tl, x0, y1, bl);
      const centreHigh = (tl + tr + br + bl) / 4 > iso;
      switch (code) {
        case 1:
        case 14:
          link(left(), bottom());
          break;
        case 2:
        case 13:
          link(bottom(), right());
          break;
        case 3:
        case 12:
          link(left(), right());
          break;
        case 4:
        case 11:
          link(top(), right());
          break;
        case 6:
        case 9:
          link(top(), bottom());
          break;
        case 7:
        case 8:
          link(left(), top());
          break;
        case 5:
          if (centreHigh) {
            link(left(), top());
            link(bottom(), right());
          } else {
            link(left(), bottom());
            link(top(), right());
          }
          break;
        case 10:
          if (centreHigh) {
            link(left(), bottom());
            link(top(), right());
          } else {
            link(left(), top());
            link(bottom(), right());
          }
          break;
      }
    }
  }
  // Walk the links into lines: from an end (an edge of the frame) first,
  // then round whatever loops are left.
  const seen = new Set<string>();
  const walk = (start: string) => {
    const keys = [start];
    seen.add(start);
    let prev = '';
    let cur = start;
    for (;;) {
      const next = (links.get(cur) ?? []).find(
        (k) => k !== prev && !seen.has(k),
      );
      if (!next) break;
      keys.push(next);
      seen.add(next);
      prev = cur;
      cur = next;
    }
    return keys;
  };
  const lines: { keys: string[]; closed: boolean }[] = [];
  for (const [key, ns] of links) {
    if (ns.length === 1 && !seen.has(key))
      lines.push({ keys: walk(key), closed: false });
  }
  for (const key of links.keys()) {
    if (!seen.has(key)) lines.push({ keys: walk(key), closed: true });
  }
  const out: { points: Point[]; closed: boolean }[] = [];
  for (const line of lines) {
    if (line.keys.length < 4) continue;
    const points = simplify(
      line.keys.map((k) => cross.get(k)!),
      tolerance,
    );
    if (points.length < 3) continue;
    out.push({ points, closed: line.closed });
  }
  return out;
}

export function contours({
  rng,
  width: W,
  height: H,
  density,
}: BuildInput): ArtLine[] {
  // The hills' scale: the frame's area, not its short side, so a long thin
  // strip (a game's header) still crosses many lines.
  const S = Math.sqrt(W * H);
  // Hills (and the odd hollow), some partly off the frame.
  const hills = Array.from({ length: cycles(rng, 2, 4) }, (_, k) => ({
    x: W * between(rng, -0.05, 1.05),
    y: H * between(rng, -0.05, 1.05),
    sigma: S * between(rng, 0.22, 0.48),
    amp: (k === 0 ? 1 : between(rng, 0.45, 0.95)) * (rng() < 0.18 ? -1 : 1),
  }));
  const tilt = { x: between(rng, -0.25, 0.25), y: between(rng, -0.25, 0.25) };
  const height = (x: number, y: number) => {
    let v = tilt.x * (x / W) + tilt.y * (y / H);
    for (const h of hills) {
      const d2 = (x - h.x) ** 2 + (y - h.y) ** 2;
      v += h.amp * Math.exp(-d2 / (2 * h.sigma * h.sigma));
    }
    return v;
  };

  const cols = CONTOUR_GRID[density];
  const rows = Math.max(8, Math.round((cols * H) / W));
  const dx = W / (cols - 1);
  const dy = H / (rows - 1);
  const field: number[] = new Array(cols * rows);
  let lo = Infinity;
  let hi = -Infinity;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = height(c * dx, r * dy);
      field[r * cols + c] = v;
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    }
  }
  const levels = CONTOUR_LEVELS[density];
  const out: ArtLine[] = [];
  for (let l = 0; l < levels; l++) {
    const t = (l + 0.5) / levels;
    const iso = lo + (hi - lo) * t;
    for (const line of isoLines(field, cols, rows, dx, dy, iso, S * 0.0035)) {
      // The high ground brightest, as light catches a ridge.
      out.push({ ...line, band: bandOf(0.15 + t * 0.85) });
    }
  }
  return out;
}

// ── Helix ──────────────────────────────────────────────────────────────────

const HELIX_LINES: Record<ArtDensity, number> = {
  thumb: 9,
  tile: 13,
  hero: 18,
};
const HELIX_SAMPLES: Record<ArtDensity, number> = {
  thumb: 18,
  tile: 26,
  hero: 34,
};

export function helix({
  rng,
  width: W,
  height: H,
  density,
  loop,
}: BuildInput): ArtLine[] {
  const lines = HELIX_LINES[density];
  // Upright in a tall frame (a rope hanging), across in a wide one. A loop
  // always runs across: it slides along x.
  const upright = !loop && H > W * 1.1;
  const len = upright ? H : W;
  const cross = upright ? W : H;
  const frames = loop ? 2 : 1;
  const samples = HELIX_SAMPLES[density] * frames;
  const turns = cycles(rng, 1, 2);
  const phase = between(rng, 0, TAU);
  const amp = cross * between(rng, 0.3, 0.4);
  const centre = cross * between(rng, 0.45, 0.55);
  // A slower second twist, so the rope breathes along its length.
  const wobble = { f: turns + 1, a: cross * between(rng, 0.015, 0.04) };
  const out: ArtLine[] = [];
  for (let i = 0; i < lines; i++) {
    // A ribbon twisting: every strand crosses the axis at the same nodes and
    // spreads between them, the outermost furthest (Muzaic's helix). A
    // little slip apiece keeps the nodes from pinching to a point.
    const spread = Math.cos((Math.PI * i) / (lines - 1));
    const slip = between(rng, -0.12, 0.12);
    const points: Point[] = [];
    for (let s = 0; s <= samples; s++) {
      const u = (s / samples) * len * frames;
      const v =
        centre +
        amp * spread * Math.sin((TAU * turns * u) / len + phase + slip) +
        wobble.a * Math.sin((TAU * wobble.f * u) / len + i * 0.4);
      points.push(upright ? { x: v, y: u } : { x: u, y: v });
    }
    out.push({ points, closed: false, band: bandOf(Math.abs(spread)) });
  }
  return out;
}

// ── More kinds (owner, 2026-10-28: "different style of waves so each card
// looks different") ─────────────────────────────────────────────────────────

const pick = <T>(d: ArtDensity, thumb: T, tile: T, hero: T): T =>
  d === 'thumb' ? thumb : d === 'tile' ? tile : hero;

/** A record's groove: two arms winding out from the middle, gently wobbling. */
export function spiral({
  rng,
  width: W,
  height: H,
  density,
}: BuildInput): ArtLine[] {
  const turns = pick(density, 4, 6, 8);
  const perTurn = pick(density, 28, 36, 44);
  const cx = W * between(rng, 0.42, 0.58);
  const cy = H * between(rng, 0.42, 0.58);
  const R = Math.hypot(W, H) * 0.46;
  const wobble = { n: cycles(rng, 5, 9), a: between(rng, 0.01, 0.025) };
  const out: ArtLine[] = [];
  for (let arm = 0; arm < 2; arm++) {
    const offset = arm * Math.PI;
    // Split each arm in four lengths, inner brightest.
    for (let part = 0; part < 4; part++) {
      const points: Point[] = [];
      const from = (part / 4) * turns * perTurn;
      const to = ((part + 1) / 4) * turns * perTurn;
      for (let s = Math.floor(from); s <= to; s++) {
        const th = (s / perTurn) * TAU;
        const t = s / (turns * perTurn);
        const r = R * t * (1 + wobble.a * Math.sin(wobble.n * th));
        points.push({
          x: cx + Math.cos(th + offset) * r,
          y: cy + Math.sin(th + offset) * r,
        });
      }
      out.push({ points, closed: false, band: 3 - part });
    }
  }
  return out;
}

const LISSAJOUS_RATIOS: readonly (readonly [number, number])[] = [
  [3, 2],
  [5, 4],
  [3, 4],
  [5, 6],
  [2, 5],
];

/** A Lissajous figure, nested: the same knot at several sizes. */
export function lissajous({
  rng,
  width: W,
  height: H,
  density,
}: BuildInput): ArtLine[] {
  const [a, b] =
    LISSAJOUS_RATIOS[Math.floor(between(rng, 0, LISSAJOUS_RATIOS.length))];
  const phase = between(rng, 0.2, 1.4);
  const copies = pick(density, 3, 4, 6);
  const samples = pick(density, 64, 84, 120);
  const out: ArtLine[] = [];
  for (let k = 0; k < copies; k++) {
    const s = 0.94 - (k / copies) * 0.62;
    const points: Point[] = [];
    for (let i = 0; i < samples; i++) {
      const t = (i / samples) * TAU;
      points.push({
        x: W / 2 + Math.sin(a * t + phase) * W * 0.46 * s,
        y: H / 2 + Math.sin(b * t) * H * 0.46 * s,
      });
    }
    out.push({ points, closed: true, band: bandOf(1 - k / copies) });
  }
  return out;
}

/** A sunburst of wavy rays, each wavering as it leaves the centre. */
export function rays({
  rng,
  width: W,
  height: H,
  density,
}: BuildInput): ArtLine[] {
  const count = pick(density, 14, 22, 36);
  const cx = W * between(rng, 0.35, 0.65);
  const cy = H * between(rng, 0.55, 0.8);
  const R = Math.hypot(W, H) * 0.7;
  const wave = {
    n: between(rng, 2, 4),
    a: between(rng, 0.04, 0.09),
    phase: between(rng, 0, TAU),
  };
  const out: ArtLine[] = [];
  for (let i = 0; i < count; i++) {
    const th = (i / count) * TAU;
    const points: Point[] = [];
    for (let s = 0; s <= 14; s++) {
      const t = 0.08 + (s / 14) * 0.92;
      const bend =
        wave.a * Math.sin(wave.n * TAU * t + wave.phase + i * 0.7) * t;
      points.push({
        x: cx + Math.cos(th + bend) * R * t,
        y: cy + Math.sin(th + bend) * R * t,
      });
    }
    out.push({ points, closed: false, band: i % 2 === 0 ? 3 : 1 });
  }
  return out;
}

/** A rose (r = cos nθ) drawn several times over, smaller each time. */
export function petals({
  rng,
  width: W,
  height: H,
  density,
}: BuildInput): ArtLine[] {
  const n = cycles(rng, 5, 8);
  const copies = pick(density, 3, 5, 7);
  const samples = pick(density, 60, 80, 110);
  const turn = between(rng, 0, TAU);
  const R = Math.min(W, H) * 0.47;
  const out: ArtLine[] = [];
  for (let k = 0; k < copies; k++) {
    const s = 1 - (k / copies) * 0.75;
    const spin = turn + (k * Math.PI) / (n * copies);
    const points: Point[] = [];
    for (let i = 0; i < samples; i++) {
      const th = (i / samples) * TAU;
      const r = R * s * (0.55 + 0.45 * Math.cos(n * th));
      points.push({
        x: W / 2 + Math.cos(th + spin) * r,
        y: H / 2 + Math.sin(th + spin) * r,
      });
    }
    out.push({ points, closed: true, band: bandOf(1 - k / copies) });
  }
  return out;
}

/** A grid warped by a slow swell, like cloth over a wave: a net of connections. */
export function mesh({
  rng,
  width: W,
  height: H,
  density,
}: BuildInput): ArtLine[] {
  const n = pick(density, 7, 10, 14);
  const swell = Array.from({ length: 2 }, () => ({
    fx: between(rng, 0.6, 1.6),
    fy: between(rng, 0.6, 1.6),
    phase: between(rng, 0, TAU),
  }));
  const amp = Math.min(W, H) * between(rng, 0.06, 0.1);
  const warp = (x: number, y: number): Point => {
    let dx = 0;
    let dy = 0;
    for (const s of swell) {
      const v = Math.sin((TAU * s.fx * x) / W + (TAU * s.fy * y) / H + s.phase);
      dx += v * amp;
      dy += Math.cos((TAU * s.fy * x) / W - s.phase) * amp * 0.8;
    }
    return { x: x + dx, y: y + dy };
  };
  const out: ArtLine[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const across: Point[] = [];
    const down: Point[] = [];
    for (let s = 0; s <= 16; s++) {
      const u = s / 16;
      across.push(warp(-0.1 * W + u * 1.2 * W, -0.1 * H + t * 1.2 * H));
      down.push(warp(-0.1 * W + t * 1.2 * W, -0.1 * H + u * 1.2 * H));
    }
    out.push({ points: across, closed: false, band: 2 });
    out.push({ points: down, closed: false, band: 1 });
  }
  return out;
}

/** An oscilloscope: rows of traces, each a different shape of wave. */
export function waveform({
  rng,
  width: W,
  height: H,
  density,
}: BuildInput): ArtLine[] {
  const rows = pick(density, 6, 8, 11);
  const samples = pick(density, 32, 44, 64);
  const shapes = [
    (u: number) => Math.sin(u),
    (u: number) => (2 / Math.PI) * Math.asin(Math.sin(u)),
    (u: number) => Math.tanh(4 * Math.sin(u)),
    (u: number) => 1 - 2 * ((((u / TAU) % 1) + 1) % 1),
  ];
  const first = Math.floor(between(rng, 0, shapes.length));
  const cyclesPer = cycles(rng, 2, 4);
  const out: ArtLine[] = [];
  for (let r = 0; r < rows; r++) {
    const shape = shapes[(first + r) % shapes.length];
    const y0 = H * (0.08 + (r / (rows - 1)) * 0.84);
    const a = (H / rows) * 0.32;
    const phase = r * 0.6;
    const points: Point[] = [];
    for (let s = 0; s <= samples; s++) {
      const x = (s / samples) * W;
      points.push({ x, y: y0 + a * shape((TAU * cyclesPer * x) / W + phase) });
    }
    out.push({
      points,
      closed: false,
      band: bandOf(1 - Math.abs(r / (rows - 1) - 0.5)),
    });
  }
  return out;
}

/** A string's standing wave: its shape at many moments, nodes held still. */
export function standing({
  rng,
  width: W,
  height: H,
  density,
}: BuildInput): ArtLine[] {
  const harmonic = cycles(rng, 2, 4);
  const moments = pick(density, 7, 10, 15);
  const samples = pick(density, 26, 32, 48);
  const A = H * between(rng, 0.32, 0.4);
  const out: ArtLine[] = [];
  for (let j = 0; j < moments; j++) {
    const c = Math.cos((j / (moments - 1)) * Math.PI);
    const points: Point[] = [];
    for (let s = 0; s <= samples; s++) {
      const x = (s / samples) * W;
      points.push({
        x,
        y: H / 2 + A * c * Math.sin((harmonic * Math.PI * x) / W),
      });
    }
    out.push({ points, closed: false, band: bandOf(Math.abs(c)) });
  }
  return out;
}

/** Two fields of waves crossing at an angle: interference. */
export function moire({
  rng,
  width: W,
  height: H,
  density,
}: BuildInput): ArtLine[] {
  const lines = pick(density, 7, 9, 14);
  const samples = pick(density, 14, 18, 26);
  const angle = between(rng, 0.35, 0.6);
  const D = Math.hypot(W, H);
  const out: ArtLine[] = [];
  for (const [family, tilt] of [
    [0, -angle / 2],
    [1, angle / 2],
  ] as const) {
    const f = cycles(rng, 1, 3);
    const a = D * between(rng, 0.015, 0.03);
    for (let i = 0; i < lines; i++) {
      const off = -D / 2 + ((i + 0.5) / lines) * D;
      const points: Point[] = [];
      for (let s = 0; s <= samples; s++) {
        const u = -D / 2 + (s / samples) * D;
        const v = off + a * Math.sin((TAU * f * u) / D + i * 0.5);
        points.push({
          x: W / 2 + u * Math.cos(tilt) - v * Math.sin(tilt),
          y: H / 2 + u * Math.sin(tilt) + v * Math.cos(tilt),
        });
      }
      out.push({ points, closed: false, band: family === 0 ? 3 : 1 });
    }
  }
  return out;
}

// ── Chladni ────────────────────────────────────────────────────────────────
// The figures sand draws on a bowed square plate (owner, 2026-10-28: GRM
// Tools Atelier's art): where the plate stands still. A mode (n, m) of a
// free square plate is cos(nπu)cos(mπv) ± cos(mπu)cos(nπv), on u, v in
// [-1, 1] about the plate's centre, so every figure mirrors both ways and
// across its diagonals. Its nodal lines (zero) are the bold ones; two more
// level lines echo them, as GRM's tint and white strokes do: a tint just
// off each nodal line on one side, and white rings round the loudest of the
// antinodes (one sign only, so the figure keeps its black). A card holds the whole plate; a wide banner holds it enlarged and
// cropped, toward its right, its pattern running on past the plate (the
// cosines repeat), as GRM's banners do.

const CHLADNI_GRID: Record<ArtDensity, number> = {
  thumb: 60,
  tile: 104,
  hero: 190,
};

/**
 * The level lines drawn: the field's value, and the band it is stroked in
 * (3 the hue, bold; 2 its tint; 1 white, fine). The field runs -2 … 2. The
 * nodal lines are drawn a hair off zero: where two cross, they part into
 * two arcs that all but touch (GRM's kissing lines), not a tangled knot.
 */
export const CHLADNI_LEVELS: readonly { iso: number; band: 1 | 2 | 3 }[] = [
  { iso: 0.05, band: 3 },
  { iso: 0.5, band: 2 },
  { iso: 1.55, band: 1 },
];

/** A mode the seed picks, when the item names none: n 2–5, m 1 below it
 *  (no flat lattices, (n, 0); the denser ones overrun a tile's budget). */
const pickMode = (rng: ArtRandom): ChladniMode => {
  const n = Math.floor(between(rng, 2, 6));
  const m = Math.floor(between(rng, 1, n));
  return { n, m, sign: rng() < 0.5 ? 1 : -1 } satisfies ChladniMode;
};

export function chladni(
  { rng, width: W, height: H, density }: BuildInput,
  mode?: ChladniMode,
): ArtLine[] {
  const { n, m, sign } = mode ?? pickMode(rng);
  const wide = W / H > 1.6;
  // The plate's side and centre in the frame.
  // A card crops in on it a little (its figure runs off the edges, as
  // GRM's do); a banner enlarges it more.
  const side = wide ? W * 0.62 : Math.min(W, H) * 1.3;
  const cx = wide ? W * 0.66 : W / 2;
  const cy = H / 2;
  const k = Math.PI / (side / 2);
  const value = (x: number, y: number) => {
    const u = (x - cx) * k;
    const v = (y - cy) * k;
    return (
      Math.cos(n * u) * Math.cos(m * v) +
      sign * Math.cos(m * u) * Math.cos(n * v)
    );
  };

  const cols = CHLADNI_GRID[density];
  const rows = Math.max(8, Math.round((cols * H) / W));
  const dx = W / (cols - 1);
  const dy = H / (rows - 1);
  const field: number[] = new Array(cols * rows);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) field[r * cols + c] = value(c * dx, r * dy);
  }
  // Finer on a banner, whose budget is three times a tile's.
  const tolerance = Math.sqrt(W * H) * (density === 'hero' ? 0.0022 : 0.0045);
  const out: ArtLine[] = [];
  for (const { iso, band } of CHLADNI_LEVELS) {
    for (const line of isoLines(field, cols, rows, dx, dy, iso, tolerance)) {
      out.push({ ...line, band });
    }
  }
  return out;
}
