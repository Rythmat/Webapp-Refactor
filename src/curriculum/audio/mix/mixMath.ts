// ── The numbers behind a mix ───────────────────────────────────────────────
// Pure, so what a lesson teaches can be tested without any sound.

export const dbToGain = (db: number) => 10 ** (db / 20);
export const gainToDb = (gain: number) =>
  gain <= 0 ? -Infinity : 20 * Math.log10(gain);

/** What a channel passes once mute and solo are taken into account. */
export function effectiveOn(
  id: string,
  channels: Readonly<Record<string, { mute?: boolean; solo?: boolean }>>,
): boolean {
  const anySolo = Object.values(channels).some((c) => c.solo);
  const channel = channels[id];
  if (!channel) return false;
  return anySolo ? Boolean(channel.solo) : !channel.mute;
}

/** How far everything is turned down between the mix and the student's ears, so
 *  that even a fully clipped signal stays below the ceiling: dBFS on the meters
 *  is the lesson's own scale, and never what's reaching the speakers. */
export const MONITOR_TRIM_DB = -9;

/** Nothing reaches the output above this: −3 dBFS. Matches labAudio's. */
export const SAFETY_CEILING = 0.708;
/** Below here, the ceiling does nothing at all. */
export const SAFETY_KNEE = 0.6;

/**
 * The safety ceiling's curve: exactly straight up to the knee, so that it can't
 * colour a thing, then rounding off to the ceiling. Not a compressor, which adds
 * makeup gain to everything below its threshold.
 */
export function safetyCurve(size = 4097): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(size);
  const room = SAFETY_CEILING - SAFETY_KNEE;
  for (let i = 0; i < size; i++) {
    const x = (i / (size - 1)) * 2 - 1;
    const magnitude = Math.abs(x);
    const out =
      magnitude <= SAFETY_KNEE
        ? magnitude
        : SAFETY_KNEE +
          room * (1 - Math.exp(-(magnitude - SAFETY_KNEE) / room));
    curve[i] = Math.sign(x) * out;
  }
  return curve;
}

/** A converter's ceiling: straight up to full scale, and flat past it. A
 *  WaveShaper holds anything outside −1..1 at its curve's ends. */
export const fullScaleCurve = (): Float32Array<ArrayBuffer> =>
  new Float32Array([-1, 1]);

/** A level meter's next reading: up at once, then falling at a steady rate. */
export function nextMeter(previous: number, peak: number, seconds: number) {
  const FALL_DB_PER_SECOND = 24;
  const fallen = gainToDb(previous) - FALL_DB_PER_SECOND * seconds;
  return Math.max(peak, fallen < -90 ? 0 : dbToGain(fallen));
}

/** Min and max of a buffer's channel for each pixel, for drawing its waveform. */
export function envelopeOf(
  channel: Float32Array,
  pixels: number,
): readonly { min: number; max: number }[] {
  const out: { min: number; max: number }[] = [];
  const step = channel.length / pixels;
  // Enough samples a pixel to catch peaks, without reading them all.
  const stride = Math.max(1, Math.floor(step / 64));
  for (let p = 0; p < pixels; p++) {
    let min = 0;
    let max = 0;
    const end = Math.min(channel.length, Math.floor((p + 1) * step));
    for (let i = Math.floor(p * step); i < end; i += stride) {
      min = Math.min(min, channel[i]);
      max = Math.max(max, channel[i]);
    }
    out.push({ min, max });
  }
  return out;
}

/** A buffer's level after gain and full-scale clipping, in dB RMS. */
export function renderedRmsDb(
  channel: Float32Array,
  gainDb: number,
  clip = true,
): number {
  const gain = dbToGain(gainDb);
  let sum = 0;
  for (let i = 0; i < channel.length; i++) {
    const v = channel[i] * gain;
    const out = clip ? Math.max(-1, Math.min(1, v)) : v;
    sum += out * out;
  }
  return gainToDb(Math.sqrt(sum / channel.length));
}
