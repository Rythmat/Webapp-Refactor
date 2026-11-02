import type { Recipe } from './harmonics';

// ── A signal's journey, as numbers ─────────────────────────────────────────
// Levels, gain, clipping, converters, speakers and cables. Everything a lab
// plays from here is rendered from these functions, so what's heard is what's
// drawn. Levels are typical ones, and vary with the gear.

/** Typical peak voltages along the way. */
export const LEVELS = [
  { id: 'mic', name: 'Microphone', volts: 0.002 },
  { id: 'guitar', name: 'Electric guitar', volts: 0.1 },
  { id: 'line', name: 'Line level', volts: 1.23 },
  { id: 'speaker', name: 'Speaker level', volts: 28 },
] as const;

export const LINE_VOLTS = 1.23;
/** How far above line level this model's preamp can go before it clips. */
export const CLIP_VOLTS = LINE_VOLTS * 2;

export const dbOf = (ratio: number) => 20 * Math.log10(ratio);
export const ratioOf = (db: number) => 10 ** (db / 20);

/** The gain that brings a source up to line level. */
export const gainToLine = (volts: number) => dbOf(LINE_VOLTS / volts);

export const outputVolts = (volts: number, gainDb: number) =>
  volts * ratioOf(gainDb);

export const hardClip = (x: number, limit = 1) =>
  Math.max(-limit, Math.min(limit, x));

/** Rounds off as it nears the limit, the way a tube stage does, in outline. */
export const softClip = (x: number) => Math.tanh(x);

/** A sample held to so many bits, as a converter's quantizer does. */
export function quantize(x: number, bits: number): number {
  const step = 2 / 2 ** bits;
  return hardClip(Math.round(x / step) * step);
}

/** The frequency a tone comes out at after sampling with no protective filter. */
export function aliasOf(hz: number, rate: number): number {
  const folded = hz % rate;
  return Math.min(folded, rate - folded);
}

export const nyquist = (rate: number) => rate / 2;

/** Power in decibels: 10 times the power is 10 dB, about twice as loud. */
export const powerDb = (watts: number, reference: number) =>
  10 * Math.log10(watts / reference);

export const speakerVolts = (watts: number, ohms = 8) =>
  Math.sqrt(watts * ohms);

/**
 * A two-way speaker's split of a harmonic: a crossover hands each driver its
 * share, so that their powers always add back up to the whole.
 */
export function crossoverWeights(hz: number, crossover: number) {
  const r = (hz / crossover) ** 2;
  const low = 1 / Math.sqrt(1 + r * r);
  return { woofer: low, tweeter: r * low };
}

export type DriverId = 'woofer' | 'tweeter' | 'both';

/** A recipe through one driver, leaving each harmonic's share. */
export function throughDriver(
  recipe: Recipe,
  hz: number,
  crossover: number,
  driver: DriverId,
): number[] {
  return recipe.map((amount, i) => {
    if (driver === 'both') return amount;
    return amount * crossoverWeights(hz * (i + 1), crossover)[driver];
  });
}

/** One tick of a mains hum, buzzing at 60 Hz with its odd harmonics. */
const humAt = (seconds: number) =>
  Math.sin(2 * Math.PI * 60 * seconds) +
  0.5 * Math.sin(2 * Math.PI * 180 * seconds) +
  0.25 * Math.sin(2 * Math.PI * 300 * seconds);

/** Real receivers cancel nearly everything both wires pick up, not all of it. */
export const COMMON_MODE_LEAK = 0.02;

export type CableKind = 'unbalanced' | 'balanced';

/** How much hum a cable this long picks up, in this model. */
export const pickupAt = (metres: number) => Math.min(1, metres * 0.012);

/** The two wires and what the receiver makes of them, at a moment. */
export function cableAt(
  signal: number,
  seconds: number,
  metres: number,
  kind: CableKind,
) {
  const hum = humAt(seconds) * pickupAt(metres);
  if (kind === 'unbalanced') {
    return { hot: signal + hum, cold: 0, out: signal + hum };
  }
  const hot = signal + hum;
  const cold = -signal + hum * (1 - COMMON_MODE_LEAK);
  return { hot, cold, out: (hot - cold) / 2 };
}

export const CONNECTORS = [
  {
    id: 'xlr',
    name: 'XLR',
    balanced: true,
    carries: 'Microphones and balanced line level, over long runs',
  },
  {
    id: 'trs',
    name: 'TRS',
    balanced: true,
    carries:
      'Balanced line level. The same plug also carries stereo headphones',
  },
  {
    id: 'ts',
    name: 'TS',
    balanced: false,
    carries: 'Guitars and other instruments, over short runs',
  },
  {
    id: 'rca',
    name: 'RCA',
    balanced: false,
    carries: 'Home stereos and turntables, over short runs',
  },
  {
    id: 'speakon',
    name: 'Speakon',
    balanced: false,
    carries: 'Power amp to speaker: high power, locking and safe to touch',
  },
] as const;
export type ConnectorId = (typeof CONNECTORS)[number]['id'];

// ── Rendering a loop ───────────────────────────────────────────────────────

/** About a tenth of a second of a tone, as whole cycles so that it loops clean. */
export function renderTone(
  hz: number,
  sampleRate: number,
  shape: (sine: number) => number = (sine) => sine,
): Float32Array<ArrayBuffer> {
  const cycles = Math.max(1, Math.round(hz * 0.1));
  const length = Math.round((cycles * sampleRate) / hz);
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    out[i] = shape(Math.sin((2 * Math.PI * cycles * i) / length));
  }
  return out;
}

/** A stack of harmonics, scaled so that `peak` is the whole stack's peak of 1:
 *  a driver's share comes out as quiet as it really is. */
export function renderStack(
  hz: number,
  sampleRate: number,
  recipe: Recipe,
  peak: number,
): Float32Array<ArrayBuffer> {
  const cycles = Math.max(1, Math.round(hz * 0.1));
  const length = Math.round((cycles * sampleRate) / hz);
  const out = new Float32Array(length);
  recipe.forEach((amount, n) => {
    if (!amount) return;
    const step = (2 * Math.PI * cycles * (n + 1)) / length;
    for (let i = 0; i < length; i++) out[i] += amount * Math.sin(step * i);
  });
  for (let i = 0; i < length; i++) out[i] /= peak;
  return out;
}

/** A tone on a cable, half a second, which fits both its pitch and the hum. */
export function renderCable(
  hz: number,
  sampleRate: number,
  metres: number,
  kind: CableKind,
): Float32Array<ArrayBuffer> {
  const length = Math.round(sampleRate / 2);
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const seconds = (i / length) * 0.5;
    const signal = 0.5 * Math.sin(2 * Math.PI * hz * seconds);
    out[i] = hardClip(cableAt(signal, seconds, metres, kind).out);
  }
  return out;
}
