/**
 * serverClock — how far this device's clock is from the server's.
 *
 * Echo in the classroom starts each round on every device at once
 * (docs/echo-classroom.md, Timing): the teacher's computer sends the round
 * with a start time on the SERVER's clock, and each device turns it into
 * its own. This is the turning.
 *
 * THE CLOCK CHECK
 * The session socket's `ping {t}` comes back as `pong {t, at}`, `at` the
 * server's time. A sample is the ping's send time, the server's time and
 * when the pong arrived, all in epoch ms. Its offset is the server's time
 * less the moment halfway through the round trip: the server read its
 * clock about then. A device pings five times on joining and again every
 * 30 seconds; its offset is the median of its latest samples, so one slow
 * round trip doesn't move it.
 *
 *   server time = this device's Date.now() + offset
 *
 * With the local mock (a practice session) there is no server: the offset
 * is 0. Pure, no React; `useServerClock` runs the pings.
 */

/** One ping and its pong, in epoch ms. */
export interface ClockSample {
  /** When the ping left, on this device's clock. */
  sentAt: number;
  /** The server's time in the pong. */
  serverAt: number;
  /** When the pong arrived, on this device's clock. */
  receivedAt: number;
}

/** Pings on joining (or rejoining) the session. */
export const JOIN_PINGS = 5;
/** The gap between the joining pings (ms). */
export const JOIN_PING_GAP_MS = 250;
/** How often the check runs again (ms). */
export const CLOCK_RECHECK_MS = 30_000;
/** How many of the latest samples the median is taken over. */
export const CLOCK_SAMPLES_KEPT = 9;
/** A round trip slower than this tells nothing useful (ms). */
export const MAX_SAMPLE_RTT_MS = 5_000;

/** A sample's round trip (ms). */
export const sampleRtt = (s: ClockSample): number => s.receivedAt - s.sentAt;

/** A sample's offset: the server's time less the round trip's middle. */
export const sampleOffset = (s: ClockSample): number =>
  s.serverAt - (s.sentAt + s.receivedAt) / 2;

/** Whether a sample can be used: a real round trip, not too slow. */
export const usableSample = (s: ClockSample): boolean => {
  const rtt = sampleRtt(s);
  return (
    Number.isFinite(rtt) &&
    Number.isFinite(s.serverAt) &&
    rtt >= 0 &&
    rtt <= MAX_SAMPLE_RTT_MS
  );
};

/** The median of some numbers; null for none. */
export function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** The offset from these samples: the median of the usable ones; null for none. */
export function estimateClockOffset(
  samples: readonly ClockSample[],
): number | null {
  const offsets = samples.filter(usableSample).map(sampleOffset);
  const mid = median(offsets);
  return mid === null ? null : Math.round(mid);
}

/** A pong as a sample; null if its server time doesn't read. */
export function pongSample(pong: {
  t: number;
  at: string | number;
  receivedAt: number;
}): ClockSample | null {
  const serverAt =
    typeof pong.at === 'number' ? pong.at : Date.parse(String(pong.at));
  if (!Number.isFinite(serverAt) || !Number.isFinite(pong.t)) return null;
  return { sentAt: pong.t, serverAt, receivedAt: pong.receivedAt };
}

/** A running estimate: samples in, the offset out. */
export interface ServerClockEstimate {
  /** Add a sample; returns the offset now. */
  add(sample: ClockSample): number;
  /** The offset (ms): 0 until a usable sample has come. */
  offset(): number;
  /** Whether a usable sample has come. */
  synced(): boolean;
}

/** A fresh estimate, keeping the latest CLOCK_SAMPLES_KEPT samples. */
export function createServerClockEstimate(): ServerClockEstimate {
  let samples: ClockSample[] = [];
  let offset: number | null = null;
  return {
    add(sample) {
      if (usableSample(sample)) {
        samples = [...samples, sample].slice(-CLOCK_SAMPLES_KEPT);
        offset = estimateClockOffset(samples);
      }
      return offset ?? 0;
    },
    offset: () => offset ?? 0,
    synced: () => offset !== null,
  };
}

/** A server time (epoch ms) on this device's clock. */
export const toLocalTime = (serverMs: number, offsetMs: number): number =>
  serverMs - offsetMs;

/** This device's time (epoch ms) on the server's clock. */
export const toServerTime = (localMs: number, offsetMs: number): number =>
  localMs + offsetMs;
