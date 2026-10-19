// ── Multiband (OTT) band structure ──────────────────────────────────────────
// Web Audio ships only a downward DynamicsCompressorNode, so we approximate
// OTT's up+down multiband behavior with aggressive per-band downward
// compression plus makeup gain: heavy dynamic-range reduction lifts the
// now-dense band, which is what gives OTT its "everything loud" character.
// `depth` is a global dry/wet crossfade (matching Ableton's OTT "Depth"), so
// depth 0 is an exact null regardless of band-split quality.

export const MULTIBAND_LR_Q = 0.7071; // Butterworth Q; two cascaded = Linkwitz-Riley 4th order
export const MULTIBAND_MAKEUP_DB = 6; // per-band lift (the "upward" character on quiet parts)
// Compensation on the summed wet path. The 3-band Linkwitz-Riley recombination
// boosts peaks ~+3 dB above the input and the per-band makeup lifts the whole
// band, so without this the wet signal is ~+12 dB hotter than dry and clips
// (there is no limiter after the chain). This trim keeps `depth` a dynamics/
// tone morph rather than a loudness jump, and keeps peaks below full-scale.
export const MULTIBAND_OUT_DB = -9;

export interface MultibandBand {
  // Cascaded crossover filters that isolate this band from the input.
  filters: BiquadFilterNode[];
  comp: DynamicsCompressorNode; // downward compression
  makeup: GainNode; // fixed lift (approximates upward compression)
  userGain: GainNode; // per-band dB trim
}

/** Two cascaded identical biquads = a 24 dB/oct Linkwitz-Riley crossover leg. */
export function createLrPair(
  ctx: AudioContext,
  type: 'lowpass' | 'highpass',
  freq: number,
): BiquadFilterNode[] {
  return [0, 1].map(() => {
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = MULTIBAND_LR_Q;
    return f;
  });
}

/**
 * Build one OTT band: crossover filters (in series) → downward compressor →
 * makeup → per-band user gain. Nodes are created but NOT connected to the
 * band-sum here; the multiband module owns those connections.
 */
export function createMultibandBand(
  ctx: AudioContext,
  filters: BiquadFilterNode[],
): MultibandBand {
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -24;
  comp.ratio.value = 6;
  comp.knee.value = 6;
  comp.attack.value = 0.005;
  comp.release.value = 0.12;
  const makeup = ctx.createGain();
  makeup.gain.value = Math.pow(10, MULTIBAND_MAKEUP_DB / 20);
  const userGain = ctx.createGain();
  userGain.gain.value = 1;
  // Wire the internal series: filter[0] → … → filter[n] → comp → makeup → userGain
  for (let i = 0; i < filters.length - 1; i++) {
    filters[i].connect(filters[i + 1]);
  }
  filters[filters.length - 1].connect(comp);
  comp.connect(makeup);
  makeup.connect(userGain);
  return { filters, comp, makeup, userGain };
}
