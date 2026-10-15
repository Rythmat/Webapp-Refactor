// ── Peak levels ─────────────────────────────────────────────────────────────
// The min/max summaries a waveform is drawn from, at several resolutions. This
// module is pure (no DOM, no AudioBuffer), so the page and the peaks worker
// build them with the same code.

/** Samples per bucket at each level, finest first; each is 4× the last. */
export const PEAK_BUCKET_SIZES = [256, 1024, 4096, 16384] as const;

/** One resolution of a buffer's peaks. */
export interface PeakLevel {
  /** Samples each bucket summarises. The last bucket may hold fewer. */
  bucketSize: number;
  /** Per channel, the lowest sample in each bucket. */
  min: Float32Array[];
  /** Per channel, the highest sample in each bucket. */
  max: Float32Array[];
}

/**
 * Every level for the first `length` samples of each channel. The finest
 * level reads the samples once; each coarser level folds four buckets of the
 * level below it, so the whole pyramid costs about one pass over the audio.
 */
export function buildPeakLevels(
  channels: readonly Float32Array[],
  length: number,
): PeakLevel[] {
  const fine = PEAK_BUCKET_SIZES[0];
  const count = Math.ceil(length / fine);
  const first: PeakLevel = { bucketSize: fine, min: [], max: [] };
  for (const data of channels) {
    const min = new Float32Array(count);
    const max = new Float32Array(count);
    const end = Math.min(length, data.length);
    for (let b = 0; b < count; b++) {
      const from = b * fine;
      const to = Math.min(from + fine, end);
      // Two plain comparisons skip a NaN sample instead of letting it poison
      // the bucket; a bucket with nothing readable stays silent.
      let lo = Infinity;
      let hi = -Infinity;
      for (let i = from; i < to; i++) {
        const v = data[i];
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
      min[b] = lo <= hi ? lo : 0;
      max[b] = lo <= hi ? hi : 0;
    }
    first.min.push(min);
    first.max.push(max);
  }

  const levels = [first];
  for (let l = 1; l < PEAK_BUCKET_SIZES.length; l++) {
    const below = levels[l - 1];
    const bucketSize = PEAK_BUCKET_SIZES[l];
    const ratio = bucketSize / below.bucketSize;
    const n = Math.ceil(length / bucketSize);
    const level: PeakLevel = { bucketSize, min: [], max: [] };
    for (let c = 0; c < below.min.length; c++) {
      const lows = below.min[c];
      const highs = below.max[c];
      const min = new Float32Array(n);
      const max = new Float32Array(n);
      for (let b = 0; b < n; b++) {
        const from = b * ratio;
        const to = Math.min(from + ratio, lows.length);
        let lo = lows[from];
        let hi = highs[from];
        for (let i = from + 1; i < to; i++) {
          if (lows[i] < lo) lo = lows[i];
          if (highs[i] > hi) hi = highs[i];
        }
        min[b] = lo;
        max[b] = hi;
      }
      level.min.push(min);
      level.max.push(max);
    }
    levels.push(level);
  }
  return levels;
}
