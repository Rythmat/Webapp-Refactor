// ── Two takes of one hit ───────────────────────────────────────────────────
// Pure, and worked out as MixEngine does it, so that the picture of two mics and
// their sum is the one that's being heard.

export interface FarTake {
  /** How long after the close take it lands; negative for ahead of it. */
  delayMs: number;
  gainDb: number;
  invert?: boolean;
  lowpassHz?: number;
}

/** Where a recording's first hit starts, in samples. */
export function firstHit(samples: Float32Array): number {
  let peak = 0;
  for (const v of samples) peak = Math.max(peak, Math.abs(v));
  const threshold = peak * 0.25;
  const at = samples.findIndex((v) => Math.abs(v) >= threshold);
  return Math.max(0, at);
}

/** A low-pass the way a browser's BiquadFilter makes one, at its default Q. */
export function lowpassed(
  samples: Float32Array,
  sampleRate: number,
  hz: number,
): Float32Array {
  const w = (2 * Math.PI * hz) / sampleRate;
  // The Web Audio spec takes a low-pass's Q in decibels, and its default is 1.
  const alpha = Math.sin(w) / (2 * 10 ** (1 / 20));
  const cos = Math.cos(w);
  const a0 = 1 + alpha;
  const b0 = (1 - cos) / 2 / a0;
  const b1 = (1 - cos) / a0;
  const a1 = (-2 * cos) / a0;
  const a2 = (1 - alpha) / a0;
  const out = new Float32Array(samples.length);
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < samples.length; i++) {
    const x = samples[i];
    const y = b0 * x + b1 * x1 + b0 * x2 - a1 * y1 - a2 * y2;
    out[i] = y;
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = y;
  }
  return out;
}

/** The far take on the close take's clock, gain and polarity applied. */
export function farTake(
  source: Float32Array,
  sampleRate: number,
  { delayMs, gainDb, invert }: FarTake,
): (index: number) => number {
  const shift = Math.round((delayMs / 1000) * sampleRate);
  const gain = (invert ? -1 : 1) * 10 ** (gainDb / 20);
  return (index) => (source[index - shift] ?? 0) * gain;
}
