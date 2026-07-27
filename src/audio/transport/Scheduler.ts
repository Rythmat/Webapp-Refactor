// ── Scheduler ────────────────────────────────────────────────────────────────
// Sample-accurate scheduling on the shared audio clock.
//
// The problem it solves: `setInterval` runs on the main thread, so it drifts
// and stalls under load — fine for UI, useless for a metronome. The fix is the
// standard two-clock pattern: a coarse timer wakes us periodically, and each
// wake-up schedules every event falling inside a short lookahead window at its
// *exact* AudioContext time. The audio hardware, not JavaScript, decides when
// a sound actually fires.
//
// Every schedule returns a handle that owns its own cancellation. There is
// deliberately no global `cancelAll()` on the public API: the app's existing
// pain is fourteen files sharing one transport where any of them can call
// `Transport.cancel()` and silently wipe another feature's events. Owning a
// handle makes it impossible to cancel work you didn't schedule.
//
// Idle cost is zero: the timer only runs while something is scheduled.

import { audioContextOwner } from '../core/AudioContextOwner';

/** How far ahead of the clock events are scheduled. */
const LOOKAHEAD_S = 0.1;
/** How often the coarse timer wakes to look ahead. */
const TICK_MS = 25;

export interface ScheduledHandle {
  cancel(): void;
  readonly active: boolean;
}

export interface RepeatHandle extends ScheduledHandle {
  /** Change the repeat interval — a tempo change, without restarting. */
  setInterval(seconds: number): void;
}

interface RepeatEvent {
  intervalS: number;
  nextTime: number;
  index: number;
  cancelled: boolean;
  callback: (time: number, index: number) => void;
}

interface OnceEvent {
  time: number;
  cancelled: boolean;
  callback: (time: number) => void;
}

class Scheduler {
  private repeats = new Set<RepeatEvent>();
  private onces = new Set<OnceEvent>();
  private timer: ReturnType<typeof setInterval> | null = null;

  /**
   * Repeat a callback every `intervalS` seconds. The callback receives the
   * precise context time to schedule its sound at — it must not play "now",
   * it must play *at that time*, which is what makes the result drift-free.
   */
  every(
    intervalS: number,
    callback: (time: number, index: number) => void,
    opts?: { startTime?: number },
  ): RepeatHandle {
    if (!(intervalS > 0)) {
      throw new Error(`[Scheduler] interval must be > 0, got ${intervalS}`);
    }
    const ctx = audioContextOwner.get();
    const event: RepeatEvent = {
      intervalS,
      nextTime: opts?.startTime ?? ctx.currentTime,
      index: 0,
      cancelled: false,
      callback,
    };
    this.repeats.add(event);
    this.ensureRunning();

    return {
      get active() {
        return !event.cancelled;
      },
      cancel: () => {
        event.cancelled = true;
        this.repeats.delete(event);
        this.stopIfIdle();
      },
      setInterval: (seconds: number) => {
        if (!(seconds > 0)) return;
        // Re-anchor the next beat so a tempo change takes effect from the next
        // event rather than retro-shifting one already inside the lookahead.
        const now = audioContextOwner.get().currentTime;
        event.intervalS = seconds;
        if (event.nextTime < now) event.nextTime = now;
      },
    };
  }

  /** Run a callback once, at a specific context time. */
  at(time: number, callback: (time: number) => void): ScheduledHandle {
    const event: OnceEvent = { time, cancelled: false, callback };
    this.onces.add(event);
    this.ensureRunning();
    return {
      get active() {
        return !event.cancelled;
      },
      cancel: () => {
        event.cancelled = true;
        this.onces.delete(event);
        this.stopIfIdle();
      },
    };
  }

  /** Seconds per beat at a tempo — the conversion every caller needs. */
  static beatSeconds(bpm: number): number {
    return 60 / Math.max(1, bpm);
  }

  private ensureRunning(): void {
    if (this.timer !== null) return;
    this.timer = setInterval(() => this.tick(), TICK_MS);
    this.tick(); // don't wait a full tick for the first event
  }

  private stopIfIdle(): void {
    if (
      this.timer !== null &&
      this.repeats.size === 0 &&
      this.onces.size === 0
    ) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private tick(): void {
    const ctx = audioContextOwner.peek();
    if (!ctx) return;
    const horizon = ctx.currentTime + LOOKAHEAD_S;

    for (const event of this.repeats) {
      if (event.cancelled) continue;
      // A suspended or long-stalled context can leave nextTime far in the
      // past; skip forward rather than firing a burst of catch-up events.
      if (event.nextTime < ctx.currentTime - LOOKAHEAD_S) {
        event.nextTime = ctx.currentTime;
      }
      while (!event.cancelled && event.nextTime < horizon) {
        const time = event.nextTime;
        const index = event.index++;
        event.nextTime += event.intervalS;
        try {
          event.callback(time, index);
        } catch (err) {
          // One bad callback must not kill the clock for everything else.
          console.error('[Scheduler] repeat callback failed', err);
        }
      }
    }

    for (const event of this.onces) {
      if (event.cancelled || event.time >= horizon) continue;
      this.onces.delete(event);
      try {
        event.callback(event.time);
      } catch (err) {
        console.error('[Scheduler] one-shot callback failed', err);
      }
    }

    this.stopIfIdle();
  }
}

export const scheduler = new Scheduler();
export { Scheduler };
