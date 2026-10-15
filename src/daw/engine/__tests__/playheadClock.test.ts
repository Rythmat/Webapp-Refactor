import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useStore } from '@/daw/store';
import { frameTaskNames } from '../engineClock';
import {
  endPlayheadRun,
  getPlayheadTick,
  isPlayheadRunning,
  notePlayheadSeek,
  setPlayheadSourceForTests,
  startPlayheadRun,
  subscribePlayhead,
  type PlayheadSource,
} from '../playheadClock';

// ── The playhead clock (milestone 1.7) ─────────────────────────────────────
// While playing, the playhead is read from the transport at the moment the
// student hears it, not from the store, which holds the parked playhead and
// is written on pause, stop and seek only.

/** 120 bpm at 480 ticks a quarter. */
const TICKS_PER_SECOND = 960;
const LOOK_AHEAD = 0.1;

/** A transport that started at audio time 0 from tick `from`. */
function fakeTransport() {
  const t = { now: 0, latency: 0, from: 0, startedAt: 0 };
  const source: PlayheadSource = {
    currentTime: () => t.now,
    outputLatency: () => t.latency,
    ticksAtTime: (time) => t.from + (time - t.startedAt) * TICKS_PER_SECOND,
    scheduleTime: () => t.now + LOOK_AHEAD,
  };
  return { t, source };
}

/** rAF, driven by hand. */
let frames: FrameRequestCallback[] = [];
function runFrame(at = 16) {
  const due = frames;
  frames = [];
  for (const cb of due) cb(at);
}

let fake = fakeTransport();

beforeEach(() => {
  frames = [];
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    frames.push(cb);
    return frames.length;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {
    frames = [];
  });
  fake = fakeTransport();
  setPlayheadSourceForTests(fake.source);
  useStore.setState({ isPlaying: false, position: 0, lastSeekPosition: 0 });
});

afterEach(() => {
  endPlayheadRun();
  setPlayheadSourceForTests();
  vi.unstubAllGlobals();
});

describe('the heard playhead', () => {
  it('is the transport at the audio time now, less the output latency', () => {
    fake.t.latency = 0.05;
    startPlayheadRun(0, 0);
    fake.t.now = 1;
    expect(getPlayheadTick()).toBeCloseTo(0.95 * TICKS_PER_SECOND);
    expect(isPlayheadRunning()).toBe(true);
  });

  it('holds at the start tick until the start is heard', () => {
    fake.t.from = 1920;
    fake.t.latency = 0.05;
    useStore.setState({ position: 1920 });
    startPlayheadRun(1920, 0.1);
    fake.t.startedAt = 0.1;
    // 0.12 - 0.05 is before the start: Tone would answer the old place.
    fake.t.now = 0.12;
    expect(getPlayheadTick()).toBe(1920);
    fake.t.now = 0.25;
    expect(getPlayheadTick()).toBeCloseTo(1920 + 0.1 * TICKS_PER_SECOND);
  });

  it('after a seek while playing, holds at the new tick until it is heard', () => {
    startPlayheadRun(0, 0);
    fake.t.now = 2;
    expect(getPlayheadTick()).toBeCloseTo(2 * TICKS_PER_SECOND);

    // The transport jumps to 480 at the next scheduled time (now + lookAhead).
    notePlayheadSeek(480);
    fake.t.from = 480;
    fake.t.startedAt = 2 + LOOK_AHEAD;
    fake.t.now = 2.05;
    expect(getPlayheadTick()).toBe(480);
    fake.t.now = 2.2;
    expect(getPlayheadTick()).toBeCloseTo(480 + 0.1 * TICKS_PER_SECOND);
  });

  it('reads the store when the transport is not running', () => {
    useStore.setState({ position: 3840 });
    expect(isPlayheadRunning()).toBe(false);
    expect(getPlayheadTick()).toBe(3840);
  });
});

describe('pause and stop', () => {
  it('pause parks the store where the student heard it', () => {
    useStore.setState({ isPlaying: true });
    startPlayheadRun(0, 0);
    fake.t.now = 1.5;
    useStore.getState().pause();
    endPlayheadRun();
    expect(useStore.getState().position).toBe(1440);
    expect(getPlayheadTick()).toBe(1440);
  });

  it('stop parks the store at the last seek', () => {
    useStore.setState({
      isPlaying: true,
      position: 960,
      lastSeekPosition: 960,
    });
    startPlayheadRun(960, 0);
    fake.t.from = 960;
    fake.t.now = 3;
    useStore.getState().stop();
    endPlayheadRun();
    expect(useStore.getState().position).toBe(960);
    expect(getPlayheadTick()).toBe(960);
  });

  it('does not write the store while playing', () => {
    let writes = 0;
    const off = useStore.subscribe(() => (writes += 1));
    const ticks: number[] = [];
    const unsubscribe = subscribePlayhead((tick) => ticks.push(tick));
    startPlayheadRun(0, 0);
    for (let i = 1; i <= 10; i++) {
      fake.t.now = i / 30;
      runFrame(i * 33);
    }
    expect(ticks).toHaveLength(10);
    expect(ticks[9]).toBeCloseTo(TICKS_PER_SECOND / 3);
    expect(writes).toBe(0);
    unsubscribe();
    off();
  });
});

describe('the frame task', () => {
  it('runs only while the transport runs and someone listens', () => {
    expect(frameTaskNames()).not.toContain('playhead');

    // Listening while parked: no frame loop.
    const unsubscribe = subscribePlayhead(() => {});
    expect(frameTaskNames()).not.toContain('playhead');

    startPlayheadRun(0, 0);
    expect(frameTaskNames()).toContain('playhead');

    unsubscribe();
    expect(frameTaskNames()).not.toContain('playhead');

    // Running with nobody listening: still none.
    const again = subscribePlayhead(() => {});
    expect(frameTaskNames()).toContain('playhead');
    endPlayheadRun();
    expect(frameTaskNames()).not.toContain('playhead');
    again();
  });

  it('tells listeners about a parked seek, and where pause parked', () => {
    const ticks: number[] = [];
    const unsubscribe = subscribePlayhead((tick) => ticks.push(tick));
    useStore.getState().setPosition(480);
    expect(ticks).toEqual([480]);

    useStore.setState({ isPlaying: true });
    startPlayheadRun(480, 0);
    fake.t.from = 480;
    fake.t.now = 1;
    useStore.getState().pause();
    endPlayheadRun();
    expect(ticks.at(-1)).toBe(480 + TICKS_PER_SECOND);
    unsubscribe();
  });
});
