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
