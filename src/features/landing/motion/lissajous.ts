/**
 * Maths for the hero's Lissajous mark (`LissajousMark.tsx`). Pure: no DOM.
 *
 * Conventions: a ratio is `[fx, fy]`, with x = sin(fx·t) and
 * y = sin(fy·t − turn). A curve is a ratio at a phase: the turn it rests at.
 * The Music Atlas logo is `[2, 3]` at phase 0. The curve is wound on a
 * horizontal cylinder, C(t) = (sin a·t, sin b·t, cos b·t), so turning it about
 * the x axis only shifts the vertical phase: every frame is still a true
 * Lissajous figure, and the depth shading shows which strands pass in front.
 * This is the footer GIF's motion (a 3:4 figure turning about the vertical
 * axis) turned 90°. The projection is orthographic into a 64-unit square, and
 * the logo's frame is its centre line.
 */

export type Ratio = readonly [fx: number, fy: number];

/** A Lissajous figure at rest: its ratio and its phase (turn, in radians). */
export type Curve = { ratio: Ratio; phase: number };

export type Pose = {
  from: Ratio;
  to: Ratio;
  /** Eased morph progress from `from` to `to` (0..1). */
  mix: number;
  /** Rotation about the horizontal (x) axis, in radians. */
  turn: number;
};

/** The Music Atlas logo: the perfect fifth, face-on. */
export const LOGO: Curve = { ratio: [2, 3], phase: 0 };

/**
 * A move morphs one curve into the next while it turns about the x axis, easing
 * in and out, so it starts and lands still. Then the live shading fades back
 * into the logo's solid line.
 */
export const MORPH_S = 1;
const WAKE_S = 0.6;
const SLEEP_S = 0.5;
/** Clock length of one move, fade included. */
export const END_S = MORPH_S + SLEEP_S;

/** 288 is a multiple of 4·f for every f ≤ 4, so each peak lands on a sample. */
export const SAMPLES = 288;
export const DEPTH_BINS = 16;
export const VIEW = 64;
/** Logo.tsx's centre line sits 61 units from centre in its 129-unit box. */
export const AMP = (VIEW * 61) / 129;

const MAX_F = 4;
const CENTER = VIEW / 2;
const TAU = 2 * Math.PI;

const table = (fn: (x: number) => number) =>
  Array.from({ length: MAX_F + 1 }, (_, f) => {
    const row = new Float64Array(SAMPLES);
    for (let i = 0; i < SAMPLES; i++) {
      row[i] = fn((2 * Math.PI * f * i) / SAMPLES);
    }
    return row;
  });

const SIN = table(Math.sin);
const COS = table(Math.cos);

const round2 = (v: number) => Math.round(v * 100) / 100;
const mod = (x: number, m: number) => ((x % m) + m) % m;

/** Clamped smootherstep: flat at both ends in value, slope and curvature. */
const smootherstep = (x: number) => {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  // Clamped again: rounding can push the polynomial a hair past 1 near x = 1.
  return Math.min(1, x * x * x * (x * (6 * x - 15) + 10));
};

/**
 * How far a move turns to land exactly on the next phase: the forward turn
 * that gets there, from a quarter turn up to (not including) 1¼ turns.
 */
export const turnBetween = (from: number, to: number) => {
  const d = mod(to - from, TAU);
  return d < Math.PI / 2 ? d + TAU : d;
};

/** Where a move from one curve to the next is, `time` seconds in. */
export const poseAt = (time: number, from: Curve, to: Curve): Pose => {
  const e = smootherstep(time / MORPH_S);
  return {
    from: from.ratio,
    to: to.ratio,
    mix: e,
    turn: from.phase + turnBetween(from.phase, to.phase) * e,
  };
};

/** Writes screen X, screen Y and depth (−1 back … 1 front) per sample. */
export const projectPose = (pose: Pose, out: Float64Array) => {
  const [a0, b0] = pose.from;
  const [a1, b1] = pose.to;
  const w = pose.mix;
  const v = 1 - w;
  const ct = Math.cos(pose.turn);
  const st = Math.sin(pose.turn);
  for (let i = 0; i < SAMPLES; i++) {
    const x = v * SIN[a0][i] + w * SIN[a1][i];
    const y = v * SIN[b0][i] + w * SIN[b1][i];
    const z = v * COS[b0][i] + w * COS[b1][i];
    // Rx(turn). For a pure ratio this is y = sin(b·t − turn).
    const j = i * 3;
    out[j] = CENTER + AMP * x;
    out[j + 1] = CENTER - AMP * (y * ct - z * st);
    out[j + 2] = y * st + z * ct;
  }
};

const binOf = (depth: number) =>
  Math.min(
    DEPTH_BINS - 1,
    Math.max(0, Math.floor(((depth + 1) / 2) * DEPTH_BINS)),
  );

/**
 * Splits the closed curve into one path per depth bin (0 = back). Each segment
 * goes to the bin of its mean depth, exactly once, and consecutive segments in
 * the same bin share a run.
 */
const toDepthPaths = (pts: Float64Array, out: string[]) => {
  out.fill('');
  let prev = -1;
  for (let i = 0; i < SAMPLES; i++) {
    const a = i * 3;
    const b = ((i + 1) % SAMPLES) * 3;
    const bin = binOf((pts[a + 2] + pts[b + 2]) / 2);
    if (bin !== prev) {
      out[bin] += `M${round2(pts[a])} ${round2(pts[a + 1])}`;
    }
    out[bin] += `L${round2(pts[b])} ${round2(pts[b + 1])}`;
    prev = bin;
  }
};

/**
 * A renderer with its own scratch buffers: `time` into a move from one curve to
 * the next → pose + depth-bin paths.
 */
export const createRenderer = () => {
  const pts = new Float64Array(SAMPLES * 3);
  const paths: string[] = new Array<string>(DEPTH_BINS).fill('');
  return (time: number, from: Curve, to: Curve) => {
    const pose = poseAt(time, from, to);
    projectPose(pose, pts);
    toDepthPaths(pts, paths);
    return { pose, paths };
  };
};

/** The logo at rest, for the first paint. */
export const REST_PATHS: readonly string[] = [
  ...createRenderer()(0, LOGO, LOGO).paths,
];

/** Sparse ratios read heavier and dense ones lighter: 1:1 ×1.2 … 3:4 ×0.9. */
const ratioWeight = ([fx, fy]: Ratio) => 1 - 0.1 * (Math.max(fx, fy) - 3);

export const weightScale = (pose: Pose) =>
  ratioWeight(pose.from) * (1 - pose.mix) + ratioWeight(pose.to) * pose.mix;

/** 0 at rest, easing to 1 as a move starts: the live shading comes in. */
export const wakeProgress = (time: number) => smootherstep(time / WAKE_S);

/** 0 during the morph, easing to 1 as the mark fades back into a solid line. */
export const sleepProgress = (time: number) =>
  smootherstep((time - MORPH_S) / SLEEP_S);
