// ── What frequencies a stem has ────────────────────────────────────────────
// A stem's long-term spectrum, in sixth-of-an-octave bands from 20 Hz to 20 kHz,
// and the same banding for a live reading, so that the two lie on one picture.

const FFT_SIZE = 8192;
const LOW_HZ = 20;
const HIGH_HZ = 20000;
const BANDS_PER_OCTAVE = 6;

export const BAND_COUNT = Math.round(
  Math.log2(HIGH_HZ / LOW_HZ) * BANDS_PER_OCTAVE,
);

/** Where a frequency sits on the picture, 0 to 1. */
export const hzToX = (hz: number) =>
  Math.log(hz / LOW_HZ) / Math.log(HIGH_HZ / LOW_HZ);
export const xToHz = (x: number) => LOW_HZ * (HIGH_HZ / LOW_HZ) ** x;

/** The middle of a band. */
export const bandHz = (band: number) =>
  LOW_HZ * 2 ** ((band + 0.5) / BANDS_PER_OCTAVE);

/** An in-place fast Fourier transform. */
export function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const angle = (-2 * Math.PI) / len;
    const wRe = Math.cos(angle);
    const wIm = Math.sin(angle);
    for (let i = 0; i < n; i += len) {
      let cRe = 1;
      let cIm = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k;
        const b = a + len / 2;
        const tRe = re[b] * cRe - im[b] * cIm;
        const tIm = re[b] * cIm + im[b] * cRe;
        re[b] = re[a] - tRe;
        im[b] = im[a] - tIm;
        re[a] += tRe;
        im[a] += tIm;
        const next = cRe * wRe - cIm * wIm;
        cIm = cRe * wIm + cIm * wRe;
        cRe = next;
      }
    }
  }
}

/** Which bins fall in each band; a band too narrow for one takes the nearest. */
function binsOfBands(binHz: number, bins: number) {
  return Array.from({ length: BAND_COUNT }, (_, band) => {
    const low = LOW_HZ * 2 ** (band / BANDS_PER_OCTAVE);
    const high = LOW_HZ * 2 ** ((band + 1) / BANDS_PER_OCTAVE);
    const from = Math.ceil(low / binHz);
    const to = Math.floor((high - 1e-9) / binHz);
    if (to < from) {
      const nearest = Math.round((low + high) / 2 / binHz);
      const bin = Math.max(1, Math.min(bins - 1, nearest));
      // Its share of that bin, so that narrow bands don't read as tall ones.
      return { from: bin, to: bin, share: Math.min(1, (high - low) / binHz) };
    }
    return { from, to: Math.min(to, bins - 1), share: 1 };
  });
}

/** Long-term level per band, in decibels. */
export function fingerprint(
  samples: Float32Array,
  sampleRate: number,
): Float32Array {
  const window = Float64Array.from(
    { length: FFT_SIZE },
    (_, i) => Math.sin((Math.PI * i) / FFT_SIZE) ** 2,
  );
  const re = new Float64Array(FFT_SIZE);
  const im = new Float64Array(FFT_SIZE);
  const power = new Float64Array(FFT_SIZE / 2);
  let frames = 0;
  for (let at = 0; at + FFT_SIZE <= samples.length; at += FFT_SIZE) {
    for (let i = 0; i < FFT_SIZE; i++) {
      re[i] = samples[at + i] * window[i];
      im[i] = 0;
    }
    fft(re, im);
    for (let bin = 1; bin < FFT_SIZE / 2; bin++) {
      power[bin] += (re[bin] ** 2 + im[bin] ** 2) / (FFT_SIZE / 2) ** 2;
    }
    frames++;
  }
  const bands = binsOfBands(sampleRate / FFT_SIZE, FFT_SIZE / 2);
  return Float32Array.from(bands, ({ from, to, share }) => {
    let sum = 0;
    for (let bin = from; bin <= to; bin++) sum += power[bin];
    return (
      10 * Math.log10(Math.max((sum * share) / Math.max(1, frames), 1e-14))
    );
  });
}

/** An analyser's reading in decibels, gathered into the same bands. */
export function bandsOf(
  data: Float32Array,
  sampleRate: number,
  out: Float32Array,
): void {
  const bands = binsOfBands(sampleRate / 2 / data.length, data.length);
  bands.forEach(({ from, to, share }, band) => {
    let sum = 0;
    for (let bin = from; bin <= to; bin++) sum += 10 ** (data[bin] / 10);
    out[band] = 10 * Math.log10(Math.max(sum * share, 1e-14));
  });
}
