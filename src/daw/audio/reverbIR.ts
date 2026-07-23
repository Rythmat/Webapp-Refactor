// ── Real convolution-reverb impulse responses ────────────────────────────────
// Loads the bundled IR pack (public/daw-assets/reverb-irs/) and turns it into
// per-type AudioBuffers for the reverb ConvolverNode in EffectChain.
//
// Design:
//  - Takes the decode `ctx` as a parameter (never imports audioEngine) so there
//    is no import cycle with EffectChain, and IRs decode on the same context the
//    convolver runs on — decodeAudioData resamples to that context's rate, so a
//    44.1k source auto-matches a 48k engine and never throws on assignment.
//  - `getProcessedIr` is synchronous: returns a ready buffer on a cache hit, or
//    null (kicking nothing off — the caller decides whether to await
//    `ensureProcessedIr`). The synthetic IR in EffectChain stays as the instant,
//    never-null fallback until a real one lands.
//  - A missing/404 pack resolves to an empty manifest, so reverb silently falls
//    back to the synthetic generator (mirrors oracle-synth/store/presets loader).

import type { ReverbType } from './EffectChain';

export interface ReverbIrEntry {
  id: string;
  type: ReverbType;
  name: string;
  file: string;
  decaySeconds: number;
  /** Runtime loudness-match multiplier, baked into the processed buffer. */
  gain: number;
  license: string;
  sourceName: string;
  attribution: string;
}

const IR_BASE = '/daw-assets/reverb-irs/';
const PROCESSED_CACHE_MAX = 32;

// ln(10^(60/20)) — an exp window with this rate hits -60 dB exactly at `decay`.
const DB60 = Math.log(1000);

/** Resolved manifest, keyed by reverb type (first entry per type wins). */
let manifestByType: Map<ReverbType, ReverbIrEntry> | null = null;
let manifestPromise: Promise<Map<ReverbType, ReverbIrEntry>> | null = null;

/** Decoded, trimmed native IR per type — shared across every EffectChain. */
const nativeCache = new Map<ReverbType, AudioBuffer>();
/** In-flight native loads, deduped so concurrent chains fetch each file once. */
const loadPromises = new Map<ReverbType, Promise<AudioBuffer | null>>();
/** Decay-shaped + gained buffers, keyed `${type}:${quantizedDecay}`. Bounded. */
const processedCache = new Map<string, AudioBuffer>();

/** Fetch the pack manifest once. 404 / malformed → empty map (synthetic fallback). */
export function getReverbManifest(): Promise<Map<ReverbType, ReverbIrEntry>> {
  if (!manifestPromise) {
    manifestPromise = fetch(`${IR_BASE}manifest.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<{ irs?: ReverbIrEntry[] }>;
      })
      .then((data) => {
        const map = new Map<ReverbType, ReverbIrEntry>();
        for (const ir of data.irs ?? []) {
          if (!map.has(ir.type)) map.set(ir.type, ir);
        }
        manifestByType = map;
        return map;
      })
      .catch(() => {
        const empty = new Map<ReverbType, ReverbIrEntry>();
        manifestByType = empty;
        return empty;
      });
  }
  return manifestPromise;
}

/** Synchronous manifest lookup — populated only after `getReverbManifest` resolves. */
export function getReverbIrMeta(type: ReverbType): ReverbIrEntry | undefined {
  return manifestByType?.get(type);
}

/** Fetch + decode the native IR for a type (cached, in-flight-deduped). */
function loadNativeIr(
  ctx: BaseAudioContext,
  meta: ReverbIrEntry,
): Promise<AudioBuffer | null> {
  const cached = nativeCache.get(meta.type);
  if (cached) return Promise.resolve(cached);
  const existing = loadPromises.get(meta.type);
  if (existing) return existing;

  const p = (async () => {
    try {
      const res = await fetch(`${IR_BASE}${meta.file}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const bytes = await res.arrayBuffer();
      const buf = await ctx.decodeAudioData(bytes);
      nativeCache.set(meta.type, buf);
      return buf;
    } catch (err) {
      console.error(`[reverb-ir] failed to load ${meta.file}`, err);
      return null;
    } finally {
      loadPromises.delete(meta.type);
    }
  })();
  loadPromises.set(meta.type, p);
  return p;
}

/**
 * Copy of `native` shaped to fall silent by `decay` seconds via a multiplicative
 * exp window, hard-truncated at that length with an 8 ms end ramp (no click), and
 * the per-IR loudness `gain` baked in. Shorten-only: `decay ≥ native duration` ⇒
 * full-length pass-through (still gained + end-faded). Truncation is also a
 * convolver CPU win — no work on the silent tail.
 */
function applyDecayEnvelope(
  ctx: BaseAudioContext,
  native: AudioBuffer,
  decay: number,
  gain: number,
): AudioBuffer {
  const sr = native.sampleRate;
  const nativeDur = native.length / sr;
  const shorten = decay < nativeDur;
  const len = shorten ? Math.max(1, Math.round(decay * sr)) : native.length;
  const k = shorten ? DB60 / decay : 0; // w(t) = exp(-k t); w(decay) = -60 dB
  const fade = Math.min(len, Math.max(1, Math.round(0.008 * sr))); // 8 ms end ramp
  const out = ctx.createBuffer(native.numberOfChannels, len, sr);
  for (let ch = 0; ch < native.numberOfChannels; ch++) {
    const src = native.getChannelData(ch);
    const dst = out.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      let w = k === 0 ? 1 : Math.exp(-k * (i / sr));
      const tail = len - i;
      if (tail < fade) w *= tail / fade;
      dst[i] = src[i] * w * gain;
    }
  }
  return out;
}

function cacheProcessed(key: string, buf: AudioBuffer): void {
  processedCache.set(key, buf);
  if (processedCache.size > PROCESSED_CACHE_MAX) {
    const oldest = processedCache.keys().next().value;
    if (oldest !== undefined) processedCache.delete(oldest);
  }
}

/**
 * Synchronous: the decay-shaped real IR for (type, decay) if its native buffer
 * is already decoded, else null. Never fetches — the caller keeps the synthetic
 * IR until it awaits `ensureProcessedIr`.
 */
export function getProcessedIr(
  ctx: BaseAudioContext,
  type: ReverbType,
  decay: number,
): AudioBuffer | null {
  const meta = manifestByType?.get(type);
  const native = nativeCache.get(type);
  if (!meta || !native) return null;
  const quant = Math.round(decay * 10) / 10;
  const key = `${type}:${quant}`;
  let buf = processedCache.get(key);
  if (!buf) {
    buf = applyDecayEnvelope(ctx, native, quant, meta.gain);
    cacheProcessed(key, buf);
  }
  return buf;
}

/**
 * Async: resolve the manifest, load+decode the native IR, and return the
 * decay-shaped buffer. Null when no real IR exists for the type (stay synthetic).
 * After it resolves, subsequent `getProcessedIr` calls for that type are sync hits.
 */
export async function ensureProcessedIr(
  ctx: BaseAudioContext,
  type: ReverbType,
  decay: number,
): Promise<AudioBuffer | null> {
  await getReverbManifest();
  const meta = manifestByType?.get(type);
  if (!meta) return null;
  const native = await loadNativeIr(ctx, meta);
  if (!native) return null;
  return getProcessedIr(ctx, type, decay);
}
