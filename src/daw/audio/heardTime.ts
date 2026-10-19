import * as Tone from 'tone';

// ── What the student was hearing (milestone 1.11 d) ─────────────────────────
// A note played, or a sound sung, belongs where the student heard the beat,
// not where the audio clock had got to. The clock runs ahead of the speakers
// by the output latency (the device's buffer and the browser's own), and Tone
// schedules a lookAhead further ahead still. So for a moment in performance
// time (an input event's timeStamp, or now) we ask which context time was
// leaving the speakers then:
//
//   - getOutputTimestamp() pairs a context time with the performance time it
//     reaches the speakers, so that time plus the moment's distance from the
//     pair is the answer. It already counts the output latency.
//   - Where it isn't there (or the context hasn't started), the clock now,
//     less baseLatency + outputLatency, less how long ago the moment was.
//
// The tick is the transport's tick at that time. Before the transport's start
// (a joint play+record start books it a little ahead) Tone would answer with
// the tick it had before the start, so the caller passes the start time and
// the answer holds at the start's tick.

interface OutputClock {
  currentTime: number;
  baseLatency?: number;
  outputLatency?: number;
  getOutputTimestamp?: () => AudioTimestamp;
}

/** The browser's own context under Tone's wrappers. */
export function nativeContextOf(ctx: unknown): AudioContext {
  const raw =
    (ctx as { rawContext?: unknown } | null)?.rawContext ?? (ctx as unknown);
  return ((raw as { _nativeContext?: AudioContext } | null)?._nativeContext ??
    raw) as AudioContext;
}

function sharedClock(): OutputClock | null {
  try {
    const native = nativeContextOf(Tone.getContext()) as unknown as
      | OutputClock
      | undefined;
    return native && typeof native.currentTime === 'number' ? native : null;
  } catch {
    return null;
  }
}

function perfNow(): number {
  return globalThis.performance?.now() ?? Date.now();
}

/**
 * The context time whose sound reached the speakers at performance time
 * `perfTime` (milliseconds, default now) on `clock` (default the shared
 * context). Null when there is no clock to read.
 */
export function contextTimeHeardAt(
  perfTime: number = perfNow(),
  clock: OutputClock | null = sharedClock(),
): number | null {
  if (!clock) return null;
  try {
    const stamp = clock.getOutputTimestamp?.();
    // A context that hasn't started answers with zeros.
    if (
      stamp &&
      typeof stamp.contextTime === 'number' &&
      typeof stamp.performanceTime === 'number' &&
      stamp.performanceTime > 0
    ) {
      return stamp.contextTime + (perfTime - stamp.performanceTime) / 1000;
    }
  } catch {
    // Fall through to the latency sum.
  }
  const delay = (perfNow() - perfTime) / 1000;
  return (
    clock.currentTime -
    (clock.baseLatency || 0) -
    (clock.outputLatency || 0) -
    delay
  );
}

/** The transport's tick at context time `time`, held at `transportStart`'s
 *  tick before it (see above). */
export function ticksAtContextTime(
  time: number,
  transportStart: number | null = null,
): number {
  const transport = Tone.getTransport();
  const at =
    transportStart !== null && time < transportStart ? transportStart : time;
  return Math.max(0, transport.getTicksAtTime(at));
}

/**
 * The transport's tick the student was hearing at performance time
 * `perfTime` (default now). Without a clock or a getTicksAtTime (a test's
 * fake transport), the transport's tick less Tone's lookAhead and the time
 * since the event.
 */
export function ticksHeardAt(
  perfTime?: number,
  transportStart: number | null = null,
): number {
  const transport = Tone.getTransport() as ReturnType<
    typeof Tone.getTransport
  > & { getTicksAtTime?: (time: number) => number };
  const heard = contextTimeHeardAt(perfTime);
  if (heard !== null && typeof transport.getTicksAtTime === 'function') {
    return ticksAtContextTime(heard, transportStart);
  }
  let lookAhead = 0;
  try {
    lookAhead = Tone.getContext().lookAhead || 0;
  } catch {
    lookAhead = 0;
  }
  const delay =
    perfTime === undefined ? 0 : Math.max(0, (perfNow() - perfTime) / 1000);
  const ticksPerSecond = (transport.bpm.value * transport.PPQ) / 60;
  return Math.max(0, transport.ticks - (lookAhead + delay) * ticksPerSecond);
}
