// ── How air carries a wave ─────────────────────────────────────────────────
// Pure. Sound is longitudinal: each particle swings back and forth along the
// direction the wave travels, around a place of its own it always returns to.
// Positions are 0..1 across the stage.

/** The same "random" field on every visit, so a lesson looks as it did. */
export function seededField(
  count: number,
  seed = 1,
): readonly { x: number; y: number }[] {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return Array.from({ length: count }, () => ({ x: next(), y: next() }));
}

// ── A pulse through a medium ───────────────────────────────────────────────

export interface Medium {
  id: 'air' | 'water' | 'steel' | 'vacuum';
  name: string;
  /** Metres per second; 0 for nothing to travel through. */
  speed: number;
  /** How many particles a row draws: closer together in a denser medium. */
  particles: number;
}

export const MEDIA: readonly Medium[] = [
  { id: 'air', name: 'Air', speed: 343, particles: 22 },
  { id: 'water', name: 'Water', speed: 1480, particles: 42 },
  { id: 'steel', name: 'Steel', speed: 5000, particles: 66 },
  { id: 'vacuum', name: 'Vacuum', speed: 0, particles: 0 },
];

export const medium = (id: Medium['id']) =>
  MEDIA.find((m) => m.id === id) as Medium;

/** How long steel takes to cross the stage, slowed down to be seen at all. */
const STEEL_CROSSING_SECONDS = 0.45;

/**
 * Seconds a pulse takes across the stage: all slowed by the same amount, so the
 * race between them is to scale. Infinity where there's nothing to carry it.
 */
export const crossingSeconds = (speed: number) =>
  speed > 0
    ? (STEEL_CROSSING_SECONDS * medium('steel').speed) / speed
    : Infinity;

/** The pulse's half width across the stage. */
export const PULSE_WIDTH = 0.06;

/** How far the pulse has pushed the particle resting at `x`, with its front at
 *  `front`: out and back again, so it ends where it began. */
export const pulseDisplacement = (x: number, front: number, reach: number) =>
  reach * Math.exp(-(((x - front) / PULSE_WIDTH) ** 2));

// ── A steady tone through air ──────────────────────────────────────────────

/** How far one particle is pushed, for a wave `waves` wavelengths across the
 *  stage. Sized so the air squeezes equally at any pitch: squeeze 1 is just
 *  short of particles overtaking one another. */
export const toneReach = (waves: number, squeeze: number) =>
  (squeeze * 0.8) / (2 * Math.PI * waves);

/** Where the particle resting at `x` is, `phase` cycles in. */
export const toneParticleX = (
  x: number,
  phase: number,
  waves: number,
  squeeze: number,
) =>
  x + toneReach(waves, squeeze) * Math.sin(2 * Math.PI * (phase - waves * x));

/** Air pressure at `x`, −1..1 at full squeeze: high where particles bunch. It
 *  is the slope of the displacement above, turned over. */
export const tonePressure = (
  x: number,
  phase: number,
  waves: number,
  squeeze = 1,
) => squeeze * Math.cos(2 * Math.PI * (phase - waves * x));

/** The width of air on stage, in metres: three wavelengths of A4. */
export const STAGE_METRES = 2.34;

/** How many wavelengths of a tone fit across the stage. */
export const wavesAcross = (hz: number, speed = 343) =>
  (STAGE_METRES * hz) / speed;

/** The 0..1 positions of the compressions on stage, at this moment. */
export function compressionsAt(phase: number, waves: number): number[] {
  const found: number[] = [];
  const first = (((phase % 1) + 1) % 1) / waves;
  for (let x = first; x <= 1; x += 1 / waves) found.push(x);
  return found;
}

export type Squeeze = 'compression' | 'rarefaction' | 'between';

/** What the air is doing at `x`: near enough a peak or a trough, or neither. */
export function squeezeAt(x: number, phase: number, waves: number): Squeeze {
  const pressure = tonePressure(x, phase, waves);
  if (pressure > 0.55) return 'compression';
  if (pressure < -0.55) return 'rarefaction';
  return 'between';
}
