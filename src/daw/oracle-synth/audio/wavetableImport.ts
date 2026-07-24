/**
 * Wavetable import runtime: fetches pack wavetable .wav files (2048-sample
 * frames, Serum's `clm` convention), converts frames to Fourier
 * coefficients for PeriodicWave, and shares raw frame data across all
 * per-track engines through a module-level cache (PeriodicWaves are bound
 * to an AudioContext and cannot be shared; Float32Array frames can).
 */

export const FRAME_SIZE = 2048;
export const MAX_HARMONICS = 1024;

// ── FFT ──────────────────────────────────────────────────────────────────

/**
 * Radix-2 FFT of one 2048-sample frame → PeriodicWave coefficients.
 * PeriodicWave convention: real[k] = cosine (a_k), imag[k] = sine (b_k):
 *   a_k = 2·Re(X[k])/N, b_k = −2·Im(X[k])/N.
 * Phase is preserved — PWM-style tables depend on it. DC is zeroed.
 */
export function frameToPartials(frame: Float32Array): {
  real: Float32Array;
  imag: Float32Array;
} {
  const n = FRAME_SIZE;
  const re = new Float64Array(n);
  const im = new Float64Array(n);
  re.set(frame);

  // In-place iterative Cooley-Tukey (bit-reversal permutation first)
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = re[i];
      re[i] = re[j];
      re[j] = tr;
      const ti = im[i];
      im[i] = im[j];
      im[j] = ti;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wRe = Math.cos(ang);
    const wIm = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let curRe = 1;
      let curIm = 0;
      for (let k = 0; k < len / 2; k++) {
        const aRe = re[i + k];
        const aIm = im[i + k];
        const bRe = re[i + k + len / 2] * curRe - im[i + k + len / 2] * curIm;
        const bIm = re[i + k + len / 2] * curIm + im[i + k + len / 2] * curRe;
        re[i + k] = aRe + bRe;
        im[i + k] = aIm + bIm;
        re[i + k + len / 2] = aRe - bRe;
        im[i + k + len / 2] = aIm - bIm;
        const nextRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = nextRe;
      }
    }
  }

  // Trim trailing near-silent harmonics to keep PeriodicWave tables lean
  let top = MAX_HARMONICS;
  const threshold = 1e-6;
  while (
    top > 2 &&
    Math.hypot(re[top - 1], im[top - 1]) * (2 / n) < threshold
  ) {
    top--;
  }

  const real = new Float32Array(top);
  const imag = new Float32Array(top);
  for (let k = 1; k < top; k++) {
    const r = (2 * re[k]) / n;
    const i = (-2 * im[k]) / n;
    // Coerce non-finite partials to 0: createPeriodicWave throws on NaN/Inf,
    // and a NaN wave would poison the shared master to silence.
    real[k] = Number.isFinite(r) ? r : 0;
    imag[k] = Number.isFinite(i) ? i : 0;
  }
  return { real, imag };
}

// ── RIFF parsing (browser-side) ──────────────────────────────────────────

/**
 * Parses a pack wavetable .wav into 2048-sample frames. Manual RIFF walk —
 * decodeAudioData would resample 44.1k→context rate and destroy the frame
 * alignment the whole format depends on.
 */
export function parseWavetableWav(buf: ArrayBuffer): Float32Array[] {
  const view = new DataView(buf);
  const tag = (off: number) =>
    String.fromCharCode(
      view.getUint8(off),
      view.getUint8(off + 1),
      view.getUint8(off + 2),
      view.getUint8(off + 3),
    );
  if (tag(0) !== 'RIFF' || tag(8) !== 'WAVE') {
    throw new Error('not a RIFF/WAVE file');
  }

  let fmtOffset = -1;
  let dataOffset = -1;
  let dataSize = 0;
  let pos = 12;
  while (pos + 8 <= view.byteLength) {
    const id = tag(pos);
    const size = view.getUint32(pos + 4, true);
    if (id === 'fmt ') fmtOffset = pos + 8;
    if (id === 'data') {
      dataOffset = pos + 8;
      dataSize = size;
    }
    pos += 8 + size + (size % 2);
  }
  if (fmtOffset < 0 || dataOffset < 0) throw new Error('missing fmt/data');

  const format = view.getUint16(fmtOffset, true);
  const channels = view.getUint16(fmtOffset + 2, true);
  const bits = view.getUint16(fmtOffset + 14, true);
  if (channels !== 1) throw new Error(`expected mono, got ${channels}ch`);

  let samples: Float32Array;
  if (format === 3 && bits === 32) {
    samples = new Float32Array(buf.slice(dataOffset, dataOffset + dataSize));
  } else if (format === 1 && bits === 16) {
    const n = dataSize / 2;
    samples = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      samples[i] = view.getInt16(dataOffset + i * 2, true) / 32768;
    }
  } else {
    throw new Error(`unsupported wav format ${format}/${bits}bit`);
  }

  const frameCount = Math.floor(samples.length / FRAME_SIZE);
  if (frameCount < 1) throw new Error('shorter than one wavetable frame');
  const frames: Float32Array[] = [];
  for (let f = 0; f < frameCount; f++) {
    frames.push(samples.subarray(f * FRAME_SIZE, (f + 1) * FRAME_SIZE));
  }
  return frames;
}

// ── Shared frame cache + table registry ──────────────────────────────────

type Listener = () => void;

const tableUrls = new Map<string, string>();
const frameCache = new Map<string, Float32Array[]>();
const inFlight = new Map<string, Promise<void>>();
const listeners = new Set<Listener>();
let namesSnapshot: string[] = [];

function notify(): void {
  namesSnapshot = [...tableUrls.keys()];
  for (const l of listeners) l();
}

/** Registers pack tables (name → asset URL). Called by the pack loader. */
export function registerPackTables(
  entries: { name: string; url: string }[],
): void {
  for (const e of entries) tableUrls.set(e.name, e.url);
  notify();
}

export function getRegisteredTableNames(): string[] {
  return namesSnapshot;
}

/** Subscribe to registry changes (for useSyncExternalStore). */
export function subscribeTableRegistry(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Raw frames for a loaded table, or null when not (yet) fetched. */
export function getCachedFrames(name: string): Float32Array[] | null {
  return frameCache.get(name) ?? null;
}

/** Fetch + parse the given tables (deduped); resolves when all settle. */
export async function ensureFramesLoaded(names: string[]): Promise<void> {
  const jobs: Promise<void>[] = [];
  for (const name of names) {
    if (frameCache.has(name)) continue;
    const url = tableUrls.get(name);
    if (!url) continue; // unknown table — caller falls back to basic waveform
    let job = inFlight.get(name);
    if (!job) {
      job = fetch(url)
        .then((res) => {
          if (!res.ok) throw new Error(`${res.status}`);
          return res.arrayBuffer();
        })
        .then((buf) => {
          frameCache.set(name, parseWavetableWav(buf));
        })
        .catch((err) => {
          console.warn(`[oracle] wavetable "${name}" failed to load:`, err);
        })
        .finally(() => {
          inFlight.delete(name);
        });
      inFlight.set(name, job);
    }
    jobs.push(job);
  }
  await Promise.all(jobs);
}
