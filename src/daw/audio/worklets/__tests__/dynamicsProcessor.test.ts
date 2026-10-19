import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// ── The dynamics worklet's DSP (worklets/dynamics-processor.js) ─────────────
// The processor runs here outside a browser: its module is evaluated with a
// stand-in AudioWorkletProcessor (a port that records what it posts), and
// blocks of 128 frames are pushed through process() by hand.

const SOURCE = readFileSync(
  new URL('../dynamics-processor.js', import.meta.url),
  'utf8',
);

interface Port {
  posted: unknown[];
  onmessage: ((e: { data: unknown }) => void) | null;
  postMessage(msg: unknown): void;
}

interface Processor {
  port: Port;
  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>,
  ): boolean;
}

type ProcessorClass = (new (options: unknown) => Processor) & {
  parameterDescriptors: Array<{ name: string; defaultValue: number }>;
};

function loadProcessor(rate: number): ProcessorClass {
  class FakeProcessor {
    port: Port = {
      posted: [],
      onmessage: null,
      postMessage(msg) {
        this.posted.push(msg);
      },
    };
  }
  let registered: ProcessorClass | null = null;
  new Function(
    'AudioWorkletProcessor',
    'registerProcessor',
    'sampleRate',
    SOURCE,
  )(
    FakeProcessor,
    (name: string, cls: ProcessorClass) => {
      expect(name).toBe('ma-dynamics');
      registered = cls;
    },
    rate,
  );
  return registered!;
}

const BLOCK = 128;

function make(
  mode: 'gate' | 'ducker' | 'follower',
  rate = 48000,
  params: Record<string, number> = {},
) {
  const Cls = loadProcessor(rate);
  const proc = new Cls({ processorOptions: { mode } });
  const values: Record<string, Float32Array> = {};
  for (const d of Cls.parameterDescriptors) {
    values[d.name] = new Float32Array([params[d.name] ?? d.defaultValue]);
  }
  /** Runs `blocks` blocks of a constant input (and key); returns the outputs. */
  const run = (blocks: number, level: number, key = 0) => {
    const out: number[] = [];
    for (let b = 0; b < blocks; b++) {
      const input = [new Float32Array(BLOCK).fill(level)];
      const keyIn = [new Float32Array(BLOCK).fill(key)];
      const output =
        mode === 'follower'
          ? [new Float32Array(BLOCK)]
          : [new Float32Array(BLOCK), new Float32Array(BLOCK)];
      const alive = proc.process(
        mode === 'ducker' ? [input, keyIn] : [input],
        [output],
        values,
      );
      if (!alive) return null;
      out.push(...output[0]);
    }
    return out;
  };
  return { proc, run, values };
}

const db = (g: number) => 20 * Math.log10(g);

describe('dynamics worklet: gate', () => {
  it('passes a signal over the threshold and closes to -range under it', () => {
    const { run } = make('gate', 48000, {
      threshold: -40,
      range: 40,
      hold: 0.01,
      release: 0.1,
    });
    // 0.5 is -6 dB: the gate stays open at unity.
    const open = run(20, 0.5)!;
    expect(open[open.length - 1]).toBeCloseTo(0.5, 5);
    // 0.001 is -60 dB: after the hold it closes to 40 dB down.
    const closed = run(400, 0.001)!;
    expect(db(closed[closed.length - 1] / 0.001)).toBeCloseTo(-40, 1);
  });

  it('holds before it closes', () => {
    const { run } = make('gate', 48000, { hold: 0.05, release: 0.01 });
    run(10, 0.5);
    // 40 ms in (inside window + hold) the quiet signal is still at unity.
    const quiet = run(15, 0.001)!;
    expect(quiet[quiet.length - 1]).toBeCloseTo(0.001, 6);
  });

  it('reports its gain reduction about 30 times a second', () => {
    const { proc, run } = make('gate');
    run(10, 0.5);
    run(400, 0.001);
    const reports = proc.port.posted as Array<{ type: string; db: number }>;
    expect(reports.length).toBeGreaterThan(0);
    expect(reports.every((r) => r.type === 'gr')).toBe(true);
    expect(reports[reports.length - 1].db).toBeLessThan(-30);
  });
});

describe('dynamics worklet: ducker', () => {
  it('ducks the signal by `amount` while the key is over the threshold', () => {
    const { run } = make('ducker', 48000, {
      threshold: -30,
      amount: 0.5,
      attack: 0.005,
      release: 0.05,
    });
    const free = run(10, 0.5, 0)!;
    expect(free[free.length - 1]).toBeCloseTo(0.5, 6);
    const ducked = run(40, 0.5, 0.5)!;
    expect(ducked[ducked.length - 1]).toBeCloseTo(0.25, 3);
    const back = run(200, 0.5, 0)!;
    expect(back[back.length - 1]).toBeCloseTo(0.5, 3);
  });

  it('a key under the threshold does nothing', () => {
    const { run } = make('ducker', 48000, { threshold: -30, amount: 1 });
    const out = run(40, 0.5, 0.01)!; // -40 dB
    expect(out[out.length - 1]).toBeCloseTo(0.5, 6);
  });
});

describe('dynamics worklet: follower (the wah)', () => {
  /** Seconds until the envelope reaches 63% of a step's target. */
  function riseTime(rate: number): number {
    const { run } = make('follower', rate, {
      sensitivity: 1,
      attack: 0.05,
      release: 0.5,
    });
    // RMS 0.05 × sensitivity 1 × 10 = target 0.5.
    const out = run(Math.ceil((rate * 0.5) / BLOCK), 0.05)!;
    const i = out.findIndex((v) => v >= 0.5 * 0.632);
    return i / rate;
  }

  it('follows the input level up to its target', () => {
    const { run } = make('follower', 48000, { sensitivity: 1, attack: 0.01 });
    const out = run(200, 0.05)!;
    expect(out[out.length - 1]).toBeCloseTo(0.5, 2);
  });

  it('times its attack in seconds, at any sample rate', () => {
    const at44 = riseTime(44100);
    const at96 = riseTime(96000);
    // The 256-sample detection window adds a few ms at low rates.
    expect(at44).toBeGreaterThan(0.045);
    expect(at44).toBeLessThan(0.06);
    expect(Math.abs(at96 - at44)).toBeLessThan(0.004);
  });

  it('rests at 0 while nothing is connected (the pedal is bypassed)', () => {
    const { proc, run, values } = make('follower', 48000, { attack: 0.001 });
    run(50, 0.2);
    const output = [new Float32Array(BLOCK)];
    expect(proc.process([[]], [output], values)).toBe(true);
    expect(Array.from(output[0]).every((v) => v === 0)).toBe(true);
  });
});

describe('dynamics worklet: dispose', () => {
  it("a 'dispose' message makes process() return false", () => {
    const { proc, run } = make('gate');
    expect(run(1, 0.5)).not.toBeNull();
    proc.port.onmessage?.({ data: { type: 'dispose' } });
    expect(run(1, 0.5)).toBeNull();
  });
});
