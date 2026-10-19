import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DrumMachineEngine } from '../DrumMachineEngine';

// ── A stop or loop chokes ringing one-shots (instruments-18) ──────────────
// allNotesOff and panic used to do nothing on drums, so a crash or open hat
// rang on through a stop and over the top of a loop's first beat. They now
// fade every pad out from the time given and stop it at the end of the fade.

const { log } = vi.hoisted(() => ({
  log: [] as Array<[event: string, pad: string, time: number, value?: number]>,
}));

vi.mock('tone', () => {
  class Node {
    connect() {
      return this;
    }
    dispose() {}
  }
  let gainId = 0;
  class Gain extends Node {
    id = `g${gainId++}`;
    gain = {
      value: 1,
      setValueAtTime: (v: number, t: number) =>
        log.push(['set', this.id, t, v]),
      cancelAndHoldAtTime: (t: number) => log.push(['hold', this.id, t]),
      linearRampToValueAtTime: (v: number, t: number) =>
        log.push(['ramp', this.id, t, v]),
      cancelScheduledValues: (t: number) => log.push(['cancel', this.id, t]),
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

const events = (name: string) => log.filter(([event]) => event === name);

beforeEach(() => {
  log.length = 0;
});

describe('DrumMachineEngine choke', () => {
  it('allNotesOff fades every pad out from the time given', async () => {
    const engine = await loadedEngine();
    engine.allNotesOff(20);
    const stops = events('stop');
    expect(stops.length).toBeGreaterThan(0);
    for (const [, , t] of stops) {
      // A short fade: no click, but over within 10 ms.
      expect(t).toBeGreaterThan(20);
      expect(t).toBeLessThanOrEqual(20.01);
    }
    expect(events('hold').every(([, , t]) => t === 20)).toBe(true);
    expect(events('ramp').every(([, , , v]) => v === 0)).toBe(true);
    expect(events('ramp').length).toBe(stops.length);
  });

  it('panic chokes too, at now when no time is given', async () => {
    const engine = await loadedEngine();
    engine.panic();
    expect(events('stop').length).toBeGreaterThan(0);
    expect(events('hold').every(([, , t]) => t === 5)).toBe(true);
  });

  it('noteOff stays a no-op for one-shots', async () => {
    const engine = await loadedEngine();
    engine.noteOn(36, 100, 1);
    log.length = 0;
    engine.noteOff(36, 1.5);
    expect(log).toEqual([]);
  });

  it('a hit on the loop boundary takes its gain back from the fade', async () => {
    const engine = await loadedEngine();
    engine.allNotesOff(20);
    log.length = 0;
    engine.noteOn(36, 127, 20);
    // The fade's ramp is cancelled before the hit's velocity is set, so
    // the downbeat isn't faded out with the old hit.
    const cancel = log.findIndex(([event]) => event === 'cancel');
    const set = log.findIndex(([event]) => event === 'set');
    expect(cancel).toBeGreaterThanOrEqual(0);
    expect(log[cancel][2]).toBe(20);
    expect(cancel).toBeLessThan(set);
    expect(events('start')).toEqual([expect.arrayContaining(['start', 20])]);
  });

  it('a hit after the fade leaves the gain timeline alone', async () => {
    const engine = await loadedEngine();
    engine.allNotesOff(20);
    log.length = 0;
    engine.noteOn(36, 127, 21);
    expect(events('cancel')).toEqual([]);
  });
});
