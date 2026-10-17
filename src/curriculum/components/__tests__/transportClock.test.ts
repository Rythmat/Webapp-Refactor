import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The transport and the audio clock, faked: 80 bpm, Tone's 192 PPQ, the
// transport's zero at audio second 10.
const audio = vi.hoisted(() => ({
  currentTime: 10,
  outputLatency: 0.02,
  baseLatency: 0.01,
  toneNow: 9.9,
  state: 'stopped' as 'started' | 'stopped',
  started: [] as number[],
}));
vi.mock('tone', () => {
  const PPQ = 192;
  const transport = {
    PPQ,
    get state() {
      return audio.state;
    },
    start: (at: number) => {
      audio.started.push(at);
      audio.state = 'started';
    },
    stop: () => {
      audio.state = 'stopped';
    },
    // 80 quarters a minute from audio second 10.
    getTicksAtTime: (time: number) => ((time - 10) * 80 * PPQ) / 60,
  };
  return {
    getTransport: () => transport,
    getContext: () => ({ rawContext: audio }),
    now: () => audio.toneNow,
  };
});

const { createTransportClock, deviceLatencySec, heardLatencySec } =
  await import('../transportClock');
const { useSettingsStore } = await import(
  '@/features/settings/useSettingsStore'
);

describe('the lesson clock over the transport', () => {
  beforeEach(() => {
    audio.state = 'stopped';
    audio.started = [];
    audio.toneNow = 9.9;
    audio.currentTime = 10;
    useSettingsStore.setState({ outputLatencyMs: 0 });
  });
  afterEach(() => vi.restoreAllMocks());

  it('starts a little ahead and remembers when', () => {
    const clock = createTransportClock();
    expect(clock.start()).toBeCloseTo(10);
    expect(audio.started).toEqual([clock.noteStart(0.1)]);
  });

  it('reads 480-per-quarter ticks, and null before the start or once stopped', () => {
    const clock = createTransportClock();
    expect(clock.ticksAt(11)).toBeNull(); // not started
    clock.start();
    expect(clock.ticksAt(9.95)).toBeNull(); // before its zero
    expect(clock.ticksAt(10.75)).toBeCloseTo(480); // a beat at 80
    expect(clock.ticksAt(22)).toBeCloseTo(7680); // the answer's bar
    clock.stop();
    expect(clock.ticksAt(22)).toBeNull();
  });

  it('stamps a note where it sounds, at the event’s own time', () => {
    const clock = createTransportClock();
    clock.start();
    audio.currentTime = 22;
    expect(clock.soundingTicks()).toBeCloseTo(7680);
    vi.spyOn(performance, 'now').mockReturnValue(5000);
    // Pressed 75ms before the handler ran: a tenth of a beat earlier.
    expect(clock.soundingTicks(4925)).toBeCloseTo(7680 - 48);
  });

  it('draws the playhead where the student hears the music', () => {
    const clock = createTransportClock();
    clock.start();
    audio.currentTime = 22;
    expect(deviceLatencySec()).toBeCloseTo(0.03);
    expect(clock.playbackTicks()).toBeCloseTo(7680 - 0.03 * 640);
    useSettingsStore.setState({ outputLatencyMs: 150 });
    expect(heardLatencySec()).toBeCloseTo(0.18);
    expect(clock.playbackTicks()).toBeCloseTo(7680 - 0.18 * 640);
  });

  it('caps a device latency no real device has', () => {
    audio.outputLatency = 3;
    expect(deviceLatencySec()).toBe(0.5);
    audio.outputLatency = 0.02;
  });
});
