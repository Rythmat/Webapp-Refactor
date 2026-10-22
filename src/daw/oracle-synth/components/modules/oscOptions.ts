import type { OscWarpMode } from '../../audio/types';

// The oscillator's choices: its module and the dock's synth card offer the
// same ones.

/** The built-in wavetables (the dock's synth card offers them too). */
export const BUILT_IN_TABLES = [
  { value: 'SINE WAVE', label: 'SINE WAVE' },
  { value: 'SAWTOOTH', label: 'SAWTOOTH' },
  { value: 'TRIANGLE', label: 'TRIANGLE' },
  { value: 'SQUARE', label: 'SQUARE' },
  { value: 'PWM', label: 'PWM' },
  { value: 'SUPER SAW', label: 'SUPER SAW' },
  { value: 'FORMANT', label: 'FORMANT' },
  { value: 'HARMONIC', label: 'HARMONIC' },
];

// Warp modes. Distortion family (live waveshapers) then phase family
// (pre-baked into the wavetable frames). See audio/wavetableWarp.ts.
export const WARP_OPTIONS: { value: OscWarpMode; label: string }[] = [
  { value: 'none', label: 'NO WARP' },
  { value: 'hardclip', label: 'HARD CLIP' },
  { value: 'softclip', label: 'SOFT CLIP' },
  { value: 'tube', label: 'TUBE' },
  { value: 'tapesat', label: 'TAPE SAT' },
  { value: 'rectify', label: 'RECTIFY' },
  { value: 'sineshaper', label: 'SINE SHAPE' },
  { value: 'diode', label: 'DIODE' },
  { value: 'fold', label: 'FOLD' },
  { value: 'crush', label: 'CRUSH' },
  { value: 'sync', label: 'SYNC' },
  { value: 'pwm', label: 'PWM WARP' },
  { value: 'bend', label: 'BEND' },
  { value: 'squeeze', label: 'SQUEEZE' },
  { value: 'quantize', label: 'QUANTIZE' },
  { value: 'flip', label: 'FLIP' },
];

// Serum's Default Shapes left the pack on 2026-10-22: each of its nine
// frames is its own one-frame table (tools/serum-convert/src/mapping/
// defaultShapes.ts). A patch saved on it moves to the nearest shape.
const DEFAULT_SHAPES = [
  'Saw',
  'Sine',
  'Triangle',
  'Square saw',
  'Square',
  'Pulse 25%',
  'Pulse 12%',
  'Pulse 6%',
  'Pulse 3%',
];

/** A patch's table and position with Default Shapes split into shapes. */
export function migrateDefaultShapes(
  wavetable: string,
  wtPosition: number,
): { wavetable: string; wtPosition: number } {
  if (wavetable !== 'S2/Default Shapes') return { wavetable, wtPosition };
  const last = DEFAULT_SHAPES.length - 1;
  const frame = Math.max(0, Math.min(last, Math.round(wtPosition * last)));
  return { wavetable: `S2/Shape ${DEFAULT_SHAPES[frame]}`, wtPosition: 0 };
}
