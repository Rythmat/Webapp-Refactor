import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DrumMachineEngine } from '../DrumMachineEngine';
import { resolveCustomKit } from '../drumKits';

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

// ── A hit stops the pads it cuts (padStops) ───────────────────────────────
// The closed and pedal hats stop the open hat on every kit; a custom kit can
// name more of its own — a timbale roll that stops when the timbale is hit.

const ROLL = '/daw-assets/samples/drums/uploads/timbale-roll.mp3';
const HIT = '/daw-assets/samples/drums/uploads/timbale-hit.mp3';

async function timbaleKit(): Promise<DrumMachineEngine> {
  const engine = await loadedEngine();
  await engine.loadKitConfig(
    resolveCustomKit({
      id: 'timbales',
      label: 'Timbales',
      base: 'natural',
      samples: { 38: HIT, 40: ROLL },
      stoppedBy: { 40: 38 },
    }),
  );
  log.length = 0;
  return engine;
}

describe('DrumMachineEngine pad stops', () => {
  it('a closed hat stops the open hat on a stock kit', async () => {
    const engine = await loadedEngine();
    engine.noteOn(42, 100, 2);
    expect(events('stop')).toContainEqual([
      'stop',
      '/daw-assets/samples/drums/808/hihat-open.wav',
      2,
    ]);
  });

  it('a snare leaves a stock kit’s clap ringing', async () => {
    const engine = await loadedEngine();
    engine.noteOn(38, 100, 2);
    expect(events('stop').map(([, url]) => url)).toEqual([
      '/daw-assets/samples/drums/808/snare.wav',
    ]);
  });

  it('the timbale hit stops the roll, at the hit', async () => {
    const engine = await timbaleKit();
    engine.noteOn(38, 100, 3);
    expect(events('stop')).toContainEqual(['stop', ROLL, 3]);
    expect(events('start')).toEqual([['start', HIT, 3]]);
  });

  it('the roll leaves the hit ringing', async () => {
    const engine = await timbaleKit();
    engine.noteOn(40, 100, 3);
    expect(events('stop').map(([, url]) => url)).toEqual([ROLL]);
  });

  it('the kit’s own stops keep the hi-hat’s', async () => {
    const engine = await timbaleKit();
    engine.noteOn(44, 100, 4);
    expect(events('stop')).toContainEqual([
      'stop',
      '/daw-assets/samples/drums/natural/hihat-open.wav',
      4,
    ]);
  });
});
