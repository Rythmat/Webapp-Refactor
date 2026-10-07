import { describe, expect, it, vi } from 'vitest';
import { DrumMachineEngine } from '../DrumMachineEngine';

// ── Live drum hits sound at once (instruments-03) ──────────────────────────
// A pad tap or MIDI drum hit passes no time. Tone.now() is the context clock
// plus its ~100 ms lookAhead, so the hit (and its choke and velocity) must
// land on Tone.immediate(), the raw clock, like every other adapter's.

const { log } = vi.hoisted(() => ({
  log: [] as Array<[event: string, note: string, time: number]>,
}));

vi.mock('tone', () => {
  class Node {
    connect() {
      return this;
    }
    dispose() {}
  }
  class Gain extends Node {
    gain = {
      value: 1,
      setValueAtTime: (_v: number, t: number) => log.push(['velocity', '', t]),
    };
  }
  class Panner extends Node {
    pan = { value: 0 };
  }
  class Player extends Node {
    loaded = true;
    constructor(readonly url: string) {
      super();
    }
    start(t: number) {
      log.push(['start', this.url, t]);
    }
    stop(t: number) {
      log.push(['stop', this.url, t]);
    }
  }
  return {
    Gain,
    Panner,
    Player,
    loaded: () => Promise.resolve(),
    now: () => 5.1,
    immediate: () => 5,
  };
});

async function loadedEngine(): Promise<DrumMachineEngine> {
  const engine = new DrumMachineEngine('808');
  await engine.init({} as AudioContext, {} as AudioNode);
  log.length = 0;
  return engine;
}

describe('DrumMachineEngine live hits', () => {
  it('play on the raw clock, without the lookAhead', async () => {
    const engine = await loadedEngine();
    engine.noteOn(36, 100);
    const times = log.map(([, , t]) => t);
    expect(times.length).toBeGreaterThan(0);
    expect(new Set(times)).toEqual(new Set([5]));
  });

  it('choke the open hat at the same moment', async () => {
    const engine = await loadedEngine();
    engine.noteOn(42, 100);
    const chokes = log.filter(([event]) => event === 'stop');
    expect(chokes.length).toBeGreaterThan(0);
    expect(chokes.every(([, , t]) => t === 5)).toBe(true);
  });

  it('keep the time a scheduled note is given', async () => {
    const engine = await loadedEngine();
    engine.noteOn(38, 100, 7.25);
    expect(log.every(([, , t]) => t === 7.25)).toBe(true);
  });
});
