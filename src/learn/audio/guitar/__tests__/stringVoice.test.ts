import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { shapePositions } from '@/lib/guitar/fretboard';
import type { GuitarStringNumber } from '@/lib/guitar/types';
import { createStringVoice } from '../stringVoice';

// ── Main thread: a fake AudioWorkletNode records what it is told ────────────

type Message = Record<string, unknown> & { type: string };

class FakeWorkletNode {
  static made: FakeWorkletNode[] = [];
  readonly messages: Message[] = [];
  readonly port = { postMessage: (m: Message) => this.messages.push(m) };
  readonly connect = vi.fn();
  readonly disconnect = vi.fn();
  constructor(
    readonly context: unknown,
    readonly name: string,
    readonly options: AudioWorkletNodeOptions,
  ) {
    FakeWorkletNode.made.push(this);
  }
}

/** Blobs handed to URL.createObjectURL: the worklet's source. */
let blobs: Blob[] = [];

function fakeContext(currentTime = 0) {
  return {
    currentTime,
    audioWorklet: { addModule: vi.fn(async () => {}) },
  };
}

beforeEach(() => {
  FakeWorkletNode.made = [];
  blobs = [];
  vi.stubGlobal('AudioWorkletNode', FakeWorkletNode);
  vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
    blobs.push(blob as Blob);
    return 'blob:strings';
  });
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function makeVoice(currentTime = 0) {
  const context = fakeContext(currentTime);
  const destination = { name: 'amp input' } as unknown as AudioNode;
  const voice = await createStringVoice(
    context as unknown as AudioContext,
    destination,
  );
  const node = FakeWorkletNode.made.at(-1)!;
  const ons = () => node.messages.filter((m) => m.type === 'on');
  const offs = () => node.messages.filter((m) => m.type === 'off');
  const lastString = () => ons().at(-1)?.string;
  return { context, destination, voice, node, ons, offs, lastString };
}

describe('createStringVoice', () => {
  it('loads its worklet once per context and plays into the destination', async () => {
    const context = fakeContext();
    const destination = {} as AudioNode;
    await createStringVoice(context as unknown as AudioContext, destination);
    await createStringVoice(context as unknown as AudioContext, destination);

    expect(context.audioWorklet.addModule).toHaveBeenCalledTimes(1);
    expect(context.audioWorklet.addModule).toHaveBeenCalledWith('blob:strings');
    const [node] = FakeWorkletNode.made;
    expect(node.name).toBe('learn-guitar-strings');
    // A source: no inputs, one mono output (a DI guitar).
    expect(node.options).toMatchObject({
      numberOfInputs: 0,
      outputChannelCount: [1],
    });
    expect(node.connect).toHaveBeenCalledWith(destination);
  });
});

describe('choosing a string', () => {
  it('plays a note on the string it is given, at the time given', async () => {
    const { voice, ons } = await makeVoice();
    const strike = voice.noteOn(60, 0.8, { string: 3, time: 1.5 });
    expect(ons()).toEqual([
      { type: 'on', strike, string: 3, midi: 60, velocity: 0.8, time: 1.5 },
    ]);
  });

  it('plays now when no time is given', async () => {
    const { voice, ons } = await makeVoice(7.25);
    voice.noteOn(60, 1);
    expect(ons()[0].time).toBe(7.25);
  });

  it("ignores a string that can't play the note", async () => {
    const { voice, lastString } = await makeVoice();
    voice.noteOn(40, 1, { string: 1 });
    expect(lastString()).toBe(6);
  });

  it('otherwise picks the position nearest the hand', async () => {
    const { voice, lastString } = await makeVoice();
    voice.noteOn(55, 1, { string: 6 }); // G3 at fret 15
    voice.noteOff(55);
    voice.noteOn(64, 1); // E4: fret 14 on the D string is nearest
    expect(lastString()).toBe(4);
  });

  it('re-plucks a note on the string already ringing it', async () => {
    const { voice, lastString } = await makeVoice();
    voice.noteOn(60, 1, { string: 4 }); // C4 at fret 10
    voice.noteOn(62, 1, { string: 2 }); // hand moves to fret 3
    voice.noteOn(60, 1);
    expect(lastString()).toBe(4);
  });

  it('spares a string that is still ringing, until it is damped', async () => {
    const ringing = await makeVoice();
    ringing.voice.noteOn(57, 1, { string: 3 }); // A3 at fret 2, still ringing
    ringing.voice.noteOn(55, 1, { time: 0.1 }); // open G would cut it
    expect(ringing.lastString()).toBe(4);

    const damped = await makeVoice();
    damped.voice.noteOn(57, 1, { string: 3 });
    damped.voice.noteOff(57, 0.3);
    damped.voice.noteOn(55, 1, { time: 0.4 });
    expect(damped.lastString()).toBe(3);
  });

  it('reaches E6 at the 24th fret of the high E, and plays notes off the neck on an end string', async () => {
    const { voice, lastString } = await makeVoice();
    voice.noteOn(88, 1);
    expect(lastString()).toBe(1);
    voice.noteOn(95, 1);
    expect(lastString()).toBe(1);
    voice.noteOn(36, 1);
    expect(lastString()).toBe(6);
  });
});

describe('noteOff', () => {
  it('damps the newest strike of a note, or only the one named', async () => {
    const { voice, offs } = await makeVoice();
    const first = voice.noteOn(64, 1, { string: 1 });
    const second = voice.noteOn(64, 1, { string: 1 });
    voice.noteOff(64, 2, first);
    voice.noteOff(64, 3);
    expect(offs()).toEqual([
      { type: 'off', strike: first, time: 2 },
      { type: 'off', strike: second, time: 3 },
    ]);
    // Nothing left to damp.
    voice.noteOff(64);
    expect(offs()).toHaveLength(2);
  });
});

describe('strum', () => {
  it('voices bare notes one per string, low to high, staggered, damped together', async () => {
    const { voice, ons, offs } = await makeVoice();
    voice.strum([64, 48, 60, 55, 52], 1, 0.9, 2);

    expect(ons().map((m) => [m.midi, m.string])).toEqual([
      [48, 5],
      [52, 4],
      [55, 3],
      [60, 2],
      [64, 1],
    ]);
    const times = ons().map((m) => m.time as number);
    times.forEach((t, i) => expect(t).toBeCloseTo(2 + i * 0.012, 9));
    expect(ons().every((m) => m.velocity === 0.9)).toBe(true);
    expect(offs().map((m) => m.time)).toEqual([3, 3, 3, 3, 3]);
    expect(offs().map((m) => m.strike)).toEqual(ons().map((m) => m.strike));
  });

  it('gives a six-note chord all six strings', async () => {
    const { voice, ons } = await makeVoice();
    voice.strum([43, 47, 50, 55, 59, 67], 1, 1); // open G
    expect(ons().map((m) => m.string)).toEqual([6, 5, 4, 3, 2, 1]);
  });

  it('plays positions on their own strings, low string first', async () => {
    const { voice, ons } = await makeVoice();
    const openC = shapePositions('X-3-2-0-1-0').reverse();
    voice.strum(openC, 1, 1, 0, 20);
    expect(ons().map((m) => [m.string, m.midi])).toEqual([
      [5, 48],
      [4, 52],
      [3, 55],
      [2, 60],
      [1, 64],
    ]);
    expect(ons()[4].time).toBeCloseTo(0.08, 9);
  });

  it('ignores a zero-length strum', async () => {
    const { voice, node } = await makeVoice();
    voice.strum([48, 52], 0, 1);
    expect(node.messages).toEqual([]);
  });
});

describe('bad values', () => {
  it('play nothing for a note or velocity that is not a number, or a position off the strings', async () => {
    const { voice, node } = await makeVoice();
    expect(voice.noteOn(Number.NaN, 1)).toBe(0);
    expect(voice.noteOn(60, Number.NaN)).toBe(0);
    voice.noteOff(60, 1, 0);
    voice.strum(
      [
        { string: 7 as GuitarStringNumber, fret: 0 },
        { string: 1, fret: 0 },
      ],
      1,
      1,
    );
    expect(node.messages.map((m) => [m.type, m.midi])).toEqual([
      ['on', 64],
      ['off', undefined],
    ]);
  });

  it('play now for a time that is not a number', async () => {
    const { voice, ons, offs } = await makeVoice(2);
    const strike = voice.noteOn(60, 1, { time: Number.NaN });
    voice.noteOff(60, Number.NaN, strike);
    expect(ons()[0].time).toBe(2);
    expect(offs()[0].time).toBe(2);
    voice.strum([48, 52], Number.NaN, 1);
    expect(ons()).toHaveLength(1);
  });
});

describe('allOff and dispose', () => {
  it('tell the worklet to stop, and dispose disconnects', async () => {
    const { voice, node } = await makeVoice();
    voice.noteOn(60, 1);
    voice.allOff();
    expect(node.messages.at(-1)).toEqual({ type: 'allOff' });
    // The next note has no ringing strings to avoid.
    voice.noteOn(60, 1);
    voice.dispose();
    expect(node.messages.slice(-2)).toEqual([
      { type: 'allOff' },
      { type: 'dispose' },
    ]);
    expect(node.disconnect).toHaveBeenCalled();
  });
});

// ── The worklet itself, run in a fake AudioWorkletGlobalScope ─────────────

const BLOCK = 128;

interface Processor {
  port: { onmessage: ((event: { data: unknown }) => void) | null };
  process(inputs: unknown[], outputs: Float32Array[][]): boolean;
}

/** A seeded PRNG, so the pick noise is the same every run. */
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

async function loadProcessor(sampleRate: number) {
  await createStringVoice(
    fakeContext() as unknown as AudioContext,
    {
      connect() {},
    } as unknown as AudioNode,
  );
  const source = await blobs[0].text();
  let Registered: (new () => Processor) | null = null;
  vi.stubGlobal('sampleRate', sampleRate);
  vi.stubGlobal('currentFrame', 0);
  vi.stubGlobal(
    'AudioWorkletProcessor',
    class {
      port = { onmessage: null, postMessage() {} };
    },
  );
  vi.stubGlobal(
    'registerProcessor',
    (name: string, ctor: typeof Registered) => {
      expect(name).toBe('learn-guitar-strings');
      Registered = ctor;
    },
  );
  vi.spyOn(Math, 'random').mockImplementation(seededRandom(7));
  new Function(source)();
  const processor = new Registered!();
  let frame = 0;
  const block = new Float32Array(BLOCK);
  /** One render quantum; returns whether the processor stays alive. */
  const step = () => {
    vi.stubGlobal('currentFrame', frame);
    const alive = processor.process([], [[block]]);
    frame += BLOCK;
    return alive;
  };
  return {
    send: (data: Record<string, unknown>) =>
      processor.port.onmessage!({ data }),
    step,
    /** Render `seconds` more audio. */
    render(seconds: number): Float32Array {
      const out = new Float32Array(
        Math.ceil((seconds * sampleRate) / BLOCK) * BLOCK,
      );
      for (let at = 0; at < out.length; at += BLOCK) {
        step();
        out.set(block, at);
      }
      return out;
    },
  };
}

const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

/** Pitch by normalised autocorrelation, refined between lags. */
function pitchOf(signal: Float32Array, sampleRate: number, near: number) {
  const corr = (lag: number) => {
    let sum = 0;
    for (let i = 0; i + lag < signal.length; i++)
      sum += signal[i] * signal[i + lag];
    return sum / (signal.length - lag);
  };
  const guess = sampleRate / near;
  let best = Math.floor(guess * 0.8);
  for (let lag = best; lag <= Math.ceil(guess * 1.25); lag++) {
    if (corr(lag) > corr(best)) best = lag;
  }
  const [a, b, c] = [corr(best - 1), corr(best), corr(best + 1)];
  return sampleRate / (best + (0.5 * (a - c)) / (a - 2 * b + c));
}

const cents = (measured: number, expected: number) =>
  1200 * Math.log2(measured / expected);

/** Magnitude of one frequency in a Hann-windowed signal (Goertzel). */
function magnitudeAt(signal: Float32Array, sampleRate: number, freq: number) {
  const w = (2 * Math.PI * freq) / sampleRate;
  let s1 = 0;
  let s2 = 0;
  signal.forEach((x, i) => {
    const hann = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (signal.length - 1));
    const s0 = x * hann + 2 * Math.cos(w) * s1 - s2;
    s2 = s1;
    s1 = s0;
  });
  return Math.sqrt(s1 * s1 + s2 * s2 - 2 * Math.cos(w) * s1 * s2);
}

const rms = (signal: Float32Array) =>
  Math.sqrt(signal.reduce((sum, x) => sum + x * x, 0) / signal.length);

const on = (
  strike: number,
  string: number,
  midi: number,
  time = 0,
  velocity = 1,
) => ({
  type: 'on',
  strike,
  string,
  midi,
  velocity,
  time,
});

describe('the string worklet', () => {
  it.each([
    [44100, 40, 6],
    [48000, 40, 6],
    [48000, 64, 1],
    [44100, 76, 1],
    [44100, 88, 1],
    [48000, 88, 1],
  ])(
    'tunes MIDI %s at %i Hz to within 3 cents',
    async (sampleRate, midi, string) => {
      const worklet = await loadProcessor(sampleRate);
      worklet.send(on(1, string, midi));
      worklet.render(0.2);
      const measured = pitchOf(worklet.render(0.3), sampleRate, hz(midi));
      expect(Math.abs(cents(measured, hz(midi)))).toBeLessThan(3);
    },
  );

  it('starts a note on its exact sample', async () => {
    const worklet = await loadProcessor(48000);
    worklet.send(on(1, 3, 55, 0.1));
    const out = worklet.render(0.2);
    const first = out.findIndex((x) => x !== 0);
    expect(first).toBe(4800);
  });

  it('plays harder picks louder and brighter', async () => {
    const worklet = await loadProcessor(48000);
    const attack = (velocity: number) => {
      worklet.send({ type: 'allOff' });
      worklet.render(0.1);
      worklet.send(on(velocity * 10, 3, 55, 0, velocity));
      return worklet.render(0.05);
    };
    const brightness = (s: Float32Array) => {
      const diff = s.map((x, i) => (i ? x - s[i - 1] : 0));
      return rms(diff) / rms(s);
    };
    const soft = attack(0.3);
    const hard = attack(1);
    expect(rms(hard)).toBeGreaterThan(2 * rms(soft));
    expect(brightness(hard)).toBeGreaterThan(1.5 * brightness(soft));
  });

  it('cuts the old note when its string plays a new one, but not another string', async () => {
    const sampleRate = 48000;
    const ratio = async (secondString: number) => {
      const worklet = await loadProcessor(sampleRate);
      worklet.send(on(1, 1, 64)); // E4
      worklet.send(on(2, secondString, 67, 0.3)); // G4
      const tail = worklet.render(0.6).subarray(0.35 * sampleRate);
      return (
        magnitudeAt(tail, sampleRate, hz(64)) /
        magnitudeAt(tail, sampleRate, hz(67))
      );
    };
    expect(await ratio(1)).toBeLessThan(0.01);
    expect(await ratio(2)).toBeGreaterThan(0.1);
  });

  it('damps only the strike an off names', async () => {
    const worklet = await loadProcessor(48000);
    worklet.send(on(1, 3, 55));
    worklet.send(on(2, 3, 55, 0.1)); // re-plucked
    worklet.send({ type: 'off', strike: 1, time: 0.2 });
    worklet.send({ type: 'off', strike: 2, time: 0.5 });
    const out = worklet.render(0.8);
    const window = (from: number, to: number) =>
      rms(out.subarray(from * 48000, to * 48000));
    expect(window(0.3, 0.45)).toBeGreaterThan(0.2 * window(0.12, 0.2));
    expect(window(0.7, 0.8)).toBeLessThan(1e-3 * window(0.3, 0.45));
  });

  it('allOff drops queued notes and silences ringing ones', async () => {
    const worklet = await loadProcessor(48000);
    worklet.send(on(1, 6, 40));
    worklet.send(on(2, 1, 64, 0.5));
    const before = rms(worklet.render(0.2));
    worklet.send({ type: 'allOff' });
    worklet.render(0.1);
    expect(rms(worklet.render(0.5))).toBeLessThan(1e-4 * before);
  });

  it('keeps running until disposed', async () => {
    const worklet = await loadProcessor(48000);
    expect(worklet.step()).toBe(true);
    worklet.send({ type: 'dispose' });
    expect(worklet.step()).toBe(false);
  });
});
