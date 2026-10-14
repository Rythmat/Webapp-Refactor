// ── Meter taps ──────────────────────────────────────────────────────────
// The analysers the meter bus (engine/meterBus.ts) reads. 2048 samples is
// 43 ms at 48 kHz, longer than the 33 ms between meter frames (30 fps), so
// a transient between two reads still lands in the window; a 256-sample
// tap (5 ms) missed most drum hits. Meter taps feed nothing else: the
// ducker's key (TrackEngine.getAnalyserNode) and the gate keep their own
// short analysers, so their timing and sound are unchanged.

export const METER_FFT_SIZE = 2048;

/** A dead-end analyser for metering, sized for the meter bus. */
export function createMeterTap(ctx: BaseAudioContext): AnalyserNode {
  const analyser = ctx.createAnalyser();
  analyser.fftSize = METER_FFT_SIZE;
  analyser.smoothingTimeConstant = 0;
  return analyser;
}
