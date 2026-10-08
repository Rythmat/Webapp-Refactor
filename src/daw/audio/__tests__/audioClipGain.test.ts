import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TrackEngine } from '../TrackEngine';
import {
  AudioClipScheduler,
  clipGainOf,
  type ScheduledClip,
} from '../AudioClipScheduler';

// ── Clip gain, and the context a clip's source is built on ─────────────────
// Every start (Play, a loop lap, the bounce) reads the clip's gain from the
// clip itself (audio-core-03), and builds its nodes on the destination's own
// context: a bounce's transport callbacks fire after Tone.Offline has handed
// Tone's global context back to the live one.

type Ramp = [kind: string, value: number, time: number];

/** A fake native context that logs the gain nodes and sources it makes. */
function fakeContext(name: string) {
  const gains: Array<{ value: number; ramps: Ramp[] }> = [];
  const starts: Array<{ when: number; offset: number; duration?: number }> = [];
  const ctx = {
    name,
    currentTime: 10,
    createGain: () => {
      const gain = {
        value: 1,
        ramps: [] as Ramp[],
        setValueAtTime(v: number, t: number) {
          gain.ramps.push(['set', v, t]);
        },
        linearRampToValueAtTime(v: number, t: number) {
          gain.ramps.push(['ramp', v, t]);
        },
      };
      gains.push(gain);
      return { gain, connect() {}, disconnect() {} };
    },
    createBufferSource: () => ({
      buffer: null,
      connect() {},
      disconnect() {},
      start: (when: number, offset: number, duration?: number) =>
        starts.push({ when, offset, duration }),
      stop() {},
      onended: null,
    }),
  };
  return { ctx, gains, starts };
}

const { toneContext, transportJobs } = vi.hoisted(() => ({
  toneContext: { current: null as unknown },
  transportJobs: [] as Array<(time: number) => void>,
}));

vi.mock('tone', () => ({
  getContext: () => ({ rawContext: toneContext.current }),
  getTransport: () => ({
    schedule: (job: (time: number) => void) => transportJobs.push(job),
    clear() {},
  }),
}));

const BPM = 120;
const SEC = 960; // ticks per second at 120 bpm
// Stereo, so the only gain node is the clip's own (mono adds an upmix gain).
const buffer = { duration: 10, numberOfChannels: 2 } as AudioBuffer;

/** The wrapped track input's context: logs the hold sources it makes. */
function wrapperContext() {
  const holds: Array<{ started: boolean; stopped: boolean; to: unknown }> = [];
  const ctx = {
    createConstantSource: () => {
      const hold = { started: false, stopped: false, to: null as unknown };
      holds.push(hold);
      return {
        offset: { value: 1 },
        connect: (node: unknown) => {
          hold.to = node;
        },
        disconnect() {},
        start: () => {
          hold.started = true;
        },
        stop: () => {
          hold.stopped = true;
        },
      };
    },
  };
  return { ctx, holds };
}

function engineOn(ctx: object, wrapper = wrapperContext()): TrackEngine {
  const input = { context: wrapper.ctx };
  return {
    getNativeInputNode: () => ({ context: ctx }),
    getInputNode: () => input,
  } as unknown as TrackEngine;
}

function schedule(
  clip: ScheduledClip,
  fromTick: number,
  ctx: object,
  scheduler = new AudioClipScheduler(),
  trackEngine = engineOn(ctx),
  pedalInput?: AudioNode,
) {
  scheduler.scheduleClip({
    buffer,
    clip,
    trackEngine,
    fromTick,
    bpm: BPM,
    pedalInput,
  });
  for (const job of transportJobs.splice(0)) job(20);
}

beforeEach(() => {
  transportJobs.length = 0;
  toneContext.current = fakeContext('tone-global').ctx;
});

describe('clip gain', () => {
  it('plays a future clip at its gain', () => {
    const { ctx, gains, starts } = fakeContext('track');
    schedule({ startTick: 2 * SEC, duration: SEC, gain: 0.5 }, 0, ctx);
    expect(starts).toHaveLength(1);
    expect(gains.map((g) => g.value)).toEqual([0.5]);
  });

  it('plays a clip the playhead is inside at its gain (Play, loop lap)', () => {
    const { ctx, gains, starts } = fakeContext('track');
    schedule(
      { startTick: 0, duration: 4 * SEC, gain: 0.25, offsetSeconds: 1 },
      2 * SEC,
      ctx,
    );
    // Trim offset plus the 2 s already played.
    expect(starts[0].offset).toBeCloseTo(3);
    expect(gains.map((g) => g.value)).toEqual([0.25]);
  });

  it('fades between silence and the clip gain, not unity', () => {
    const { ctx, gains } = fakeContext('track');
    schedule(
      {
        startTick: SEC,
        duration: 2 * SEC,
        gain: 0.5,
        fadeInTicks: SEC / 2,
        fadeOutTicks: SEC / 2,
      },
      0,
      ctx,
    );
    const levels = gains[0].ramps.map(([, v]) => v);
    expect(Math.max(...levels)).toBe(0.5);
    expect(gains[0].ramps).toEqual([
      ['set', 0, 20],
      ['ramp', 0.5, 20.5],
      ['set', 0.5, 21.5],
      ['ramp', 0, 22],
    ]);
  });

  it('starts mid fade-in at that point of the ramp to the clip gain', () => {
    const { ctx, gains } = fakeContext('track');
    schedule(
      { startTick: 0, duration: 4 * SEC, gain: 0.5, fadeInTicks: SEC },
      SEC / 2,
      ctx,
    );
    expect(gains[0].ramps[0]).toEqual(['set', 0.25, 10]);
    expect(gains[0].ramps[1]).toEqual(['ramp', 0.5, 10.5]);
  });

  it('adds no gain node for a unity clip without fades', () => {
    const { ctx, gains, starts } = fakeContext('track');
    schedule({ startTick: SEC, duration: SEC }, 0, ctx);
    expect(starts).toHaveLength(1);
    expect(gains).toHaveLength(0);
  });

  it('clamps stray values: unset or invalid is unity, at most +12 dB', () => {
    expect(clipGainOf(undefined)).toBe(1);
    expect(clipGainOf(Number.NaN)).toBe(1);
    expect(clipGainOf(-1)).toBe(0);
    expect(clipGainOf(0.5)).toBe(0.5);
    expect(clipGainOf(100)).toBe(4);
  });
});

describe('the context a clip plays on', () => {
  it("builds a transport-scheduled clip on its track's context, not Tone's", () => {
    // The bounce: the offline track input, while Tone's global context is
    // already the live one again when the transport callback fires.
    const offline = fakeContext('offline');
    const live = fakeContext('live');
    toneContext.current = live.ctx;
    schedule({ startTick: SEC, duration: SEC }, 0, offline.ctx);
    expect(offline.starts).toHaveLength(1);
    expect(live.starts).toHaveLength(0);
  });

  it("starts a mid-clip source on its track's context clock", () => {
    const track = fakeContext('track');
    track.ctx.currentTime = 42;
    schedule({ startTick: 0, duration: 2 * SEC }, SEC, track.ctx);
    expect(track.starts[0].when).toBe(42);
  });
});

describe('the track input while clips play', () => {
  it('is held active by one silent source per track, through the wrapper', () => {
    // Clip sources are native; the wrapped track input stays passive (its
    // native outputs unwired) until an active wrapper node feeds it, so a
    // track with no instrument (a dropped library sample) was silent.
    const { ctx } = fakeContext('track');
    const wrapper = wrapperContext();
    const trackEngine = engineOn(ctx, wrapper);
    const scheduler = new AudioClipScheduler();
    schedule({ startTick: 0, duration: SEC }, 0, ctx, scheduler, trackEngine);
    schedule({ startTick: SEC, duration: SEC }, 0, ctx, scheduler, trackEngine);
    expect(wrapper.holds).toHaveLength(1);
    expect(wrapper.holds[0].started).toBe(true);
    expect(wrapper.holds[0].to).toBe(trackEngine.getInputNode());

    scheduler.cancelAll();
    expect(wrapper.holds[0].stopped).toBe(true);
  });

  it('is left to the adapter when clips play through its pedal chain', () => {
    const { ctx } = fakeContext('track');
    const wrapper = wrapperContext();
    const pedal = { context: ctx } as unknown as AudioNode;
    schedule(
      { startTick: 0, duration: SEC },
      0,
      ctx,
      new AudioClipScheduler(),
      engineOn(ctx, wrapper),
      pedal,
    );
    expect(wrapper.holds).toHaveLength(0);
  });
});
