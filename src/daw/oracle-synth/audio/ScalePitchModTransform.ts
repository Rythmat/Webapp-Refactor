import type { TransformProvider } from './ModulationMatrix';
import { quantizePitch } from './ScaleQuantizer';

/**
 * Scale-quantized pitch modulation — the Part-A plug-in for the modulation
 * matrix's transform seam.
 *
 * Contract (see ModulationMatrix): a route with `transform` set gets a
 * per-voice WaveShaper whose curve maps the raw source value directly to the
 * target's NATIVE units (the standard curve/amount scaling is bypassed).
 *
 * For a pitch/detune target this curve maps source value → semitone offset
 * from the played note, snapped into the active Key/Scale, in cents. The
 * result: an LFO or macro on pitch steps through scale degrees instead of
 * sliding chromatically — melodic sequences from a single modulation route.
 *
 * The curve is built at note-on (connectVoice) from the voice's note and the
 * quantizer's current mask, so notes and pitch-mod always share one scale.
 */

/** Modulation span at |amount| = 1, in semitones (one octave). */
export const SCALE_PITCH_SPAN_SEMITONES = 12;

const CURVE_LENGTH = 1025;

export function makeScalePitchTransform(
  getMask: () => number,
): TransformProvider {
  return (voice, route) => {
    const note = voice.currentNote;
    if (note < 0) return null;

    const mask = getMask();
    const amount = route.amount;
    const curve = new Float32Array(CURVE_LENGTH);

    for (let i = 0; i < CURVE_LENGTH; i++) {
      const x = -1 + (2 * i) / (CURVE_LENGTH - 1); // raw source value
      const rawSemis = Math.round(x * amount * SCALE_PITCH_SPAN_SEMITONES);
      const targetNote = Math.max(0, Math.min(127, note + rawSemis));
      const quantized = quantizePitch(targetNote, mask, 'nearest');
      curve[i] = (quantized - note) * 100; // cents
    }
    return curve;
  };
}

export const SCALE_PITCH_TRANSFORM_ID = 'scale-quantize';
