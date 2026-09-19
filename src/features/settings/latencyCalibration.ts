/**
 * Output-latency calibration. The student taps along to clicks; the median gap
 * between each click and its tap, less the latency the browser already
 * reports, is the extra delay their output adds. Bluetooth headphones add
 * 150–300 ms that browsers under-report. Lessons shift the in-time playhead and
 * scoring by it (Settings ▸ Audio ▸ Output Latency).
 */

export const MAX_OUTPUT_LATENCY_MS = 500;
export const CALIBRATION_BPM = 75;
/** Clicks before tapping counts. */
export const COUNT_IN_CLICKS = 4;
/** Clicks the student taps along to. */
export const SCORED_CLICKS = 8;
const MIN_TAPS = 5;
/** A tap can land this far ahead of its click; later taps count up to the next click's window. */
const EARLY_TAP_SEC = 0.2;

export const beatSeconds = (bpm = CALIBRATION_BPM) => 60 / bpm;

/** The latency a context reports, in seconds. */
export const reportedOutputLatency = (context: AudioContext) =>
  (context.outputLatency ?? 0) + (context.baseLatency ?? 0);

/** An event's time on the audio context's clock. */
export const eventContextTime = (context: AudioContext, timeStamp: number) =>
  context.currentTime - Math.max(0, performance.now() - timeStamp) / 1000;

export interface LatencyMeasurement {
  latencyMs: number;
  taps: number;
}

/**
 * Extra output latency from click and tap times (audio-context seconds): the
 * median tap-after-click gap less the reported latency, rounded to 5 ms and
 * clamped to 0–MAX_OUTPUT_LATENCY_MS. Null with too few taps to trust.
 */
export function measureOutputLatency(
  clickTimes: readonly number[],
  tapTimes: readonly number[],
  reportedLatency: number,
  beat = beatSeconds(),
): LatencyMeasurement | null {
  const gaps: number[] = [];
  for (const click of clickTimes) {
    const tap = tapTimes.find(
      (t) => t - click >= -EARLY_TAP_SEC && t - click < beat - EARLY_TAP_SEC,
    );
    if (tap !== undefined) gaps.push(tap - click);
  }
  if (gaps.length < MIN_TAPS) return null;

  gaps.sort((a, b) => a - b);
  const mid = Math.floor(gaps.length / 2);
  const median = gaps.length % 2 ? gaps[mid] : (gaps[mid - 1] + gaps[mid]) / 2;
  const ms = Math.round(((median - reportedLatency) * 1000) / 5) * 5;
  return {
    latencyMs: Math.min(MAX_OUTPUT_LATENCY_MS, Math.max(0, ms)),
    taps: gaps.length,
  };
}

/** Schedule `count` short clicks from `start`; the count-in clicks are higher. */
export function scheduleClicks(
  context: AudioContext,
  start: number,
  count: number,
  beat = beatSeconds(),
): { times: number[]; stop: () => void } {
  const times: number[] = [];
  const oscillators: OscillatorNode[] = [];
  for (let i = 0; i < count; i++) {
    const time = start + i * beat;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = i < COUNT_IN_CLICKS ? 1500 : 1000;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.5, time + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(time);
    oscillator.stop(time + 0.06);
    times.push(time);
    oscillators.push(oscillator);
  }
  return {
    times,
    stop: () =>
      oscillators.forEach((oscillator) => {
        try {
          oscillator.stop();
        } catch {
          /* already stopped */
        }
      }),
  };
}
