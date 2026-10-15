import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MetronomeEngine,
  beatInBarAt,
  clickPitch,
  ticksPerBeat,
} from '../MetronomeEngine';

// ── The metronome clicks on the transport's beat grid (audio-core-05) ──────
// The repeat is anchored at tick 0, not at the play position, and each click
// takes its accent from where it falls in the bar. Before, a resume from a
// mid-beat pause clicked between beats and accented whatever beat came first.

const { transport, clicks } = vi.hoisted(() => {
  const clicks: Array<{ pitch: string; time: number }> = [];
  const transport = {
    PPQ: 480,
    state: 'started',
    repeats: [] as Array<{
      cb: (time: number) => void;
      interval: string;
      start: unknown;
    }>,
    scheduleRepeat(
      cb: (time: number) => void,
      interval: string,
      start: unknown,
    ) {
      transport.repeats.push({ cb, interval, start });
      return transport.repeats.length;
    },
    clear() {},
    // The fake clock: a callback's `time` is the tick it fires on.
    getTicksAtTime: (time: number) => time,
  };
  return { transport, clicks };
});

vi.mock('tone', () => ({
  getTransport: () => transport,
  MembraneSynth: class {
    volume = { value: 0 };
    connect() {}
    dispose() {}
    triggerAttackRelease(pitch: string, _duration: string, time: number) {
      clicks.push({ pitch, time });
    }
  },
}));

/** A started metronome in num/den; returns its repeat's callback. */
function startMetronome(num: number, den: number) {
  const metro = new MetronomeEngine();
  metro.init({} as AudioNode);
  metro.setEnabled(true);
  metro.setTimeSignature(num, den);
  metro.start();
  return transport.repeats[transport.repeats.length - 1];
}

/** The pitch clicked when the transport reaches each of `ticks`. */
function clicksAt(cb: (time: number) => void, ticks: number[]): string[] {
  clicks.length = 0;
  for (const tick of ticks) cb(tick);
  return clicks.map((c) => c.pitch);
}

beforeEach(() => {
  transport.repeats.length = 0;
  clicks.length = 0;
});

describe('MetronomeEngine', () => {
  it('anchors the repeat at tick 0, one beat apart', () => {
    const repeat = startMetronome(4, 4);
    expect(repeat.start).toBe(0);
    expect(repeat.interval).toBe('480i');
  });

  it('accents the bar line, not the first click after a mid-beat resume', () => {
    // Paused at tick 2600 (bar 2, beat 2 and a bit), resumed: Tone's repeat
    // fires next on beat 3 of bar 2, then beat 4, then bar 3's downbeat.
    const { cb } = startMetronome(4, 4);
    expect(clicksAt(cb, [2880, 3360, 3840])).toEqual(['C4', 'C4', 'C5']);
  });

  it('accents every downbeat on loop laps', () => {
    const { cb } = startMetronome(4, 4);
    expect(clicksAt(cb, [0, 480, 960, 1440, 0, 480])).toEqual([
      'C5',
      'C4',
      'C4',
      'C4',
      'C5',
      'C4',
    ]);
  });

  it('clicks eighths in 6/8 with the compound accent on beat 4', () => {
    const repeat = startMetronome(6, 8);
    expect(repeat.interval).toBe('240i');
    expect(clicksAt(repeat.cb, [0, 240, 480, 720, 960, 1200, 1440])).toEqual([
      'C5',
      'C4',
      'C4',
      'C5',
      'C4',
      'C4',
      'C5',
    ]);
  });

  it('clicks the beat the count-in clicks in x/2 and x/16', () => {
    expect(startMetronome(2, 2).interval).toBe('960i');
    expect(startMetronome(7, 16).interval).toBe('120i');
  });

  it('passes each click its own transport time', () => {
    const { cb } = startMetronome(4, 4);
    cb(1920);
    expect(clicks).toEqual([{ pitch: 'C5', time: 1920 }]);
  });
});

describe('metre helpers', () => {
  it('ticksPerBeat is the note value the denominator names', () => {
    expect(ticksPerBeat(4, 480)).toBe(480);
    expect(ticksPerBeat(8, 480)).toBe(240);
    expect(ticksPerBeat(2, 480)).toBe(960);
  });

  it('beatInBarAt tolerates a clock a hair off the grid', () => {
    expect(beatInBarAt(1919.9999, 4, 480)).toBe(0);
    expect(beatInBarAt(2400.0001, 4, 480)).toBe(1);
  });

  it('clickPitch matches the count-in accents', () => {
    // 9/8: beats 1, 4 and 7 accented.
    expect(
      Array.from({ length: 9 }, (_, i) => clickPitch(i, 9, 8)).join(' '),
    ).toBe('C5 C4 C4 C5 C4 C4 C5 C4 C4');
    // 6/4 is simple time: only beat 1.
    expect(clickPitch(3, 6, 4)).toBe('C4');
  });
});
