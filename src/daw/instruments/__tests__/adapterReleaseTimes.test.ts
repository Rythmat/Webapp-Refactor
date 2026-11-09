import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PianoSampler } from '../PianoSampler';
import { SamplerInstrument } from '../SamplerInstrument';
import { EightOhEightInstrument } from '../EightOhEightInstrument';

// ── Releases land on the time they are given (instruments-18) ─────────────
// A loop or stop releases notes at the boundary's audio time, and a clip's
// pedal-up releases its held notes on the beat. They used to happen at "now",
// ahead of the music that was still scheduled to sound.

const { log } = vi.hoisted(() => ({
  log: [] as Array<[event: string, ...args: unknown[]]>,
}));

vi.mock('tone', () => {
  class Node {
    connect() {
      return this;
    }
    dispose() {}
  }
  class Sampler extends Node {
    loaded = true;
    attack = 0;
    release = 0;
    constructor(options: { onload?: () => void }) {
      super();
      queueMicrotask(() => options.onload?.());
    }
    triggerAttack(note: string, time: number) {
      log.push(['attack', note, time]);
    }
    triggerRelease(note: string, time?: number) {
      log.push(['release', note, time]);
    }
    releaseAll(time?: number) {
      log.push(['releaseAll', time]);
    }
  }
  return {
    Gain: Node,
    Filter: Node,
    Sampler,
    Frequency: (note: number) => ({ toNote: () => `n${note}` }),
    immediate: () => 5,
  };
});

vi.mock('@/curriculum/engine/genreGeneration/eightOhEight', () => ({
  createEightOhEight: () => ({
    synth: {
      triggerAttack: (note: string, time: number) =>
        log.push(['attack', note, time]),
      triggerRelease: (time: number) => log.push(['release', '', time]),
    },
    dispose() {},
  }),
}));

beforeEach(() => {
  log.length = 0;
});

const samplers = {
  PianoSampler: async () => {
    const piano = new PianoSampler();
    await piano.init({} as AudioContext, {} as AudioNode);
    return piano;
  },
  SamplerInstrument: async () => {
    const sampler = new SamplerInstrument({
      name: 'Strings',
      baseUrl: '',
      sampleMap: { C4: 'C4.mp3' },
    });
    await sampler.init({} as AudioContext, {} as AudioNode);
    return sampler;
  },
};

describe.each(Object.entries(samplers))('%s', (_name, make) => {
  it('allNotesOff and panic release at the time given', async () => {
    const adapter = await make();
    log.length = 0;
    adapter.allNotesOff(12.5);
    adapter.panic(13);
    expect(log).toEqual([
      ['releaseAll', 12.5],
      ['releaseAll', 13],
    ]);
  });

  it('allNotesOff with no time still means now', async () => {
    const adapter = await make();
    log.length = 0;
    adapter.allNotesOff();
    expect(log).toEqual([['releaseAll', undefined]]);
  });

  it('a pedal-up releases the held notes on its beat', async () => {
    const adapter = await make();
    adapter.cc!(64, 127, 10);
    adapter.noteOff(60, 10.5);
    adapter.noteOff(64, 10.75);
    log.length = 0;
    adapter.cc!(64, 0, 11.25);
    expect(log).toEqual([
      ['release', 'n60', 11.25],
      ['release', 'n64', 11.25],
    ]);
  });
});

describe('EightOhEightInstrument', () => {
  it('allNotesOff and panic release at the time given', async () => {
    const bass = new EightOhEightInstrument();
    await bass.init({} as AudioContext, {} as AudioNode);
    bass.allNotesOff(9.5);
    bass.panic(10);
    expect(log).toEqual([
      ['release', '', 9.5],
      ['release', '', 10],
    ]);
  });

  it('with no time, releases on the raw clock', async () => {
    const bass = new EightOhEightInstrument();
    await bass.init({} as AudioContext, {} as AudioNode);
    bass.allNotesOff();
    expect(log).toEqual([['release', '', 5]]);
  });
});
