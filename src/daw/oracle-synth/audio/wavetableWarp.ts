/**
 * Oscillator warp DSP. Two families (see OscWarpMode in types.ts):
 *
 *  - Distortion warps are memoryless transfer functions y = f(x) realised as
 *    a WaveShaperNode curve (like fx/DriveEffect). They run live and follow
 *    `warpAmount` in real time. buildWarpCurve() returns the curve, or null
 *    for a pass-through (mode 'none', a phase mode, or amount ≈ 0).
 *
 *  - Phase warps are phase-domain remaps θ→g(θ) that can't be done on a
 *    native OscillatorNode (no phase access), so they are pre-baked into the
 *    wavetable's time-domain frames before the FFT→PeriodicWave build.
 *    warpFrames() returns the transformed frames; WavetableBank caches the
 *    result per (table, mode, quantized amount). Static per bake — a UI/preset
 *    change rebuilds frames rather than sweeping smoothly at audio rate.
 *
 * Math adapted from Vital's open-source oscillator (mtytel/vital,
 * src/synthesis/producers/synth_oscillator.cpp adjustPhase / wavefold) and
 * classic waveshaper transfer functions.
 */

import type { OscWarpMode } from './types';

const DISTORTION_WARPS = new Set<OscWarpMode>([
  'hardclip',
  'softclip',
  'tube',
  'tapesat',
  'rectify',
  'sineshaper',
  'diode',
  'fold',
  'crush',
]);

const PHASE_WARPS = new Set<OscWarpMode>([
  'sync',
  'pwm',
  'bend',
  'squeeze',
  'quantize',
  'flip',
]);

export function isDistortionWarp(mode: OscWarpMode): boolean {
  return DISTORTION_WARPS.has(mode);
}

export function isPhaseWarp(mode: OscWarpMode): boolean {
  return PHASE_WARPS.has(mode);
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

// ── Distortion family: memoryless transfer functions ─────────────────────

/**
 * Builds a WaveShaper curve for a distortion warp, or null when the stage
 * should be a pass-through (non-distortion mode or amount ≈ 0 — at zero every
 * curve here is the identity anyway, so null keeps the node truly transparent).
 */
export function buildWarpCurve(
  mode: OscWarpMode,
  amount: number,
  samples = 1024,
): Float32Array | null {
  const a = clamp01(amount);
  if (!DISTORTION_WARPS.has(mode) || a <= 0.001) return null;

  const shape = distortionShaper(mode, a);
  const curve = new Float32Array(samples);
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / (samples - 1) - 1; // −1..1
    curve[i] = Math.max(-1, Math.min(1, shape(x)));
  }
  return curve;
}

function distortionShaper(mode: OscWarpMode, a: number): (x: number) => number {
  switch (mode) {
    case 'hardclip': {
      const drive = 1 + a * 9;
      return (x) => Math.max(-1, Math.min(1, x * drive));
    }
    case 'softclip': {
      const k = a * 20;
      return (x) => ((1 + k) * x) / (1 + k * Math.abs(x));
    }
    case 'tapesat': {
      const k = 1 + a * 3;
      const norm = Math.tanh(k);
      return (x) => Math.tanh(x * k) / norm;
    }
    case 'tube': {
      // Asymmetric soft clip → even harmonics (tube-like)
      const kp = 1 + a * 6;
      const kn = 1 + a * 2;
      return (x) => (x >= 0 ? Math.tanh(x * kp) : Math.tanh(x * kn));
    }
    case 'rectify': {
      // Blend toward full-wave rectification (adds an octave-up character)
      return (x) => (1 - a) * x + a * (Math.abs(x) * 2 - 1);
    }
    case 'sineshaper': {
      const k = 1 + a * 3;
      return (x) => Math.sin(x * (Math.PI / 2) * k);
    }
    case 'diode': {
      const k = 1 + a * 6;
      const norm = 1 - Math.exp(-k);
      return (x) => (Math.sign(x) * (1 - Math.exp(-Math.abs(x) * k))) / norm;
    }
    case 'fold': {
      // Triangle wavefolder: drive up then fold back into [−1,1]
      const drive = 1 + a * 4;
      return (x) => {
        const z = x * drive + 1; // shift into [0, …] space
        const m = ((z % 4) + 4) % 4; // period 4
        return Math.abs(m - 2) - 1;
      };
    }
    case 'crush': {
      // Amplitude quantisation (bit-crush flavour; a static stand-in for
      // Serum's downsample — true rate reduction needs an AudioWorklet)
      const levels = Math.max(2, Math.round((1 - a) * 30) + 2);
      return (x) => Math.round(x * levels) / levels;
    }
    default:
      return (x) => x;
  }
}

// ── Phase family: phase-domain frame transforms ──────────────────────────

/**
 * Applies a phase warp to a set of time-domain wavetable frames, returning
 * new frames of the same length. `amount` is 0..1.
 */
export function warpFrames(
  frames: Float32Array[],
  mode: OscWarpMode,
  amount: number,
): Float32Array[] {
  const a = clamp01(amount);
  if (!PHASE_WARPS.has(mode) || a <= 0.001) {
    return frames.map((f) => Float32Array.from(f));
  }
  return frames.map((f) => warpFrame(f, mode, a));
}

function warpFrame(
  frame: Float32Array,
  mode: OscWarpMode,
  a: number,
): Float32Array {
  const n = frame.length;
  const out = new Float32Array(n);

  // Modes expressible as a phase map p→g(p) go through the generic resampler.
  const phaseMap = phaseMapFor(mode, a);
  if (phaseMap) {
    for (let i = 0; i < n; i++) {
      const p = i / n;
      const g = phaseMap(p);
      out[i] = sampleFrac(frame, (g - Math.floor(g)) * n);
    }
    return out;
  }

  // Special cases that aren't a pure read-position remap.
  if (mode === 'pwm') {
    // Pulse-width: difference of the frame with a phase-shifted copy. For a
    // saw this yields a variable-width pulse; general for any waveform.
    const shift = Math.round((0.05 + a * 0.45) * n);
    for (let i = 0; i < n; i++) {
      out[i] = frame[i] - frame[(i + shift) % n];
    }
    return out;
  }
  if (mode === 'flip') {
    // Blend the frame with its time-reversed self.
    for (let i = 0; i < n; i++) {
      out[i] = (1 - a) * frame[i] + a * frame[n - 1 - i];
    }
    return out;
  }

  return Float32Array.from(frame);
}

function phaseMapFor(
  mode: OscWarpMode,
  a: number,
): ((p: number) => number) | null {
  switch (mode) {
    case 'sync': {
      // Hard sync: read the cycle faster and wrap early.
      const mult = 1 + a * 7; // up to 8× → strong sync harmonics
      return (p) => p * mult;
    }
    case 'bend': {
      // Cubic S-curve warp (Vital "bend"): slows one region, speeds another.
      const d = 0.5 + a * 0.49;
      const off = 2 * d * (1 - d);
      return (p) => {
        const p2 = p * p;
        const p3 = p2 * p;
        return (
          p3 + (3 * d + off) * (p2 - p3) + (3 * d - off) * (p - 2 * p2 + p3)
        );
      };
    }
    case 'squeeze': {
      // Compress the read near the centre, expand at the edges.
      const d = 0.5 - a * 0.4; // 0.5 → 0.1
      return (p) => {
        if (p < 0.5) return (p / 0.5) * d;
        return d + ((p - 0.5) / 0.5) * (1 - d);
      };
    }
    case 'quantize': {
      // Stair-step the read position (stepped/aliased timbre).
      const steps = Math.max(2, Math.round(2 + (1 - a) * 62));
      return (p) => Math.floor(p * steps) / steps;
    }
    default:
      return null;
  }
}

/** Linear-interpolated read of a frame at a fractional (wrapped) index. */
function sampleFrac(frame: Float32Array, pos: number): number {
  const n = frame.length;
  const i0 = Math.floor(pos) % n;
  const i1 = (i0 + 1) % n;
  const frac = pos - Math.floor(pos);
  return frame[i0] * (1 - frac) + frame[i1] * frac;
}
