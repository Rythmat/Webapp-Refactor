/**
 * The synth audit's engine fixes (2026-10-21):
 * - a pack table asked for before the pack registered waits for it, and a
 *   view hears when frames land;
 * - the built-in PWM table is a pulse (a square at 50 %);
 * - imported tables are levelled without DC, and a procedural table's
 *   phase-warped copy keeps each frame at full scale.
 *
 * Run: npx vitest run src/daw/oracle-synth/audio/__tests__/auditFixes.test.ts
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WavetableBank } from '../WavetableBank';
import {
  ensureFramesLoaded,
  getCachedFrames,
  getFramesVersion,
  registerPackTables,
  setTableRegistrar,
  subscribeFramesLoaded,
} from '../wavetableImport';
import type { ModRoute } from '../types';
import { fakeOracleContext, param } from './fakeOracleContext';

/** A mono 16-bit WAV of `frames` × 2048 samples from `sample(i)`. */
function wav(frames: number, sample: (i: number) => number): ArrayBuffer {
  const n = frames * 2048;
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const str = (o: number, s: string) =>
    [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF');
  v.setUint32(4, 36 + n * 2, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, 44100, true);
  v.setUint32(28, 88200, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, 'data');
  v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) {
    v.setInt16(44 + i * 2, Math.round(sample(i) * 32767), true);
  }
  return buf;
}

afterEach(() => {
  vi.unstubAllGlobals();
  setTableRegistrar(async () => {});
});

describe('pack tables asked for before the pack registered', () => {
  it('wait for the registrar, load, and tell a view the frames landed', async () => {
    const name = 'S2/Audit Late';
    const fetchMock = vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () =>
        wav(2, (i) => Math.sin((i / 2048) * 2 * Math.PI)),
    }));
    vi.stubGlobal('fetch', fetchMock);
    // The pack registers its tables only when asked (its manifest arriving).
    setTableRegistrar(async () => {
      registerPackTables([{ name, url: '/late.wav' }]);
    });
    const heard = vi.fn();
    const off = subscribeFramesLoaded(heard);
    const before = getFramesVersion();

    await ensureFramesLoaded([name]);

    expect(fetchMock).toHaveBeenCalledWith('/late.wav');
    expect(getCachedFrames(name)).toHaveLength(2);
    expect(getFramesVersion()).toBe(before + 1);
    expect(heard).toHaveBeenCalled();
    off();
  });
});

describe('WavetableBank', () => {
  const bank = () =>
    new WavetableBank(fakeOracleContext().ctx as unknown as AudioContext);

  it('builds PWM as a pulse: at 50 % it is the square', () => {
    const b = bank();
    const pwm = b.getDisplayFrames('PWM')!;
    const square = b.getDisplayFrames('SQUARE')![0];
    // The 50 % frame of the 16-frame sweep is at index ~8.
    const half = pwm[Math.round(0.5 * (pwm.length - 1))];
    const sign = (v: number) => (v > 0.05 ? 1 : v < -0.05 ? -1 : 0);
    let agree = 0;
    let counted = 0;
    for (let i = 64; i < 2048; i += 128) {
      if (sign(square[i]) === 0) continue;
      counted++;
      if (sign(half[i] - mean(half)) === sign(square[i])) agree++;
    }
    expect(agree / counted).toBeGreaterThan(0.9);
  });

  it('levels an imported table without its DC, and a phase-warped procedural copy per frame', () => {
    const b = bank();
    // One frame: a ±0.25 square sitting on −0.7 of DC. Its DC-free peak is
    // 0.25; measured with DC it was 0.95, which played it at ~0.26.
    const frame = new Float32Array(2048).map(
      (_, i) => (i < 1024 ? 0.25 : -0.25) - 0.7,
    );
    b.loadWavetableFromFrames('dc', [frame]);
    expect(b.getDisplayScaling('dc')).toBe('table');
    // A procedural table and its warped copy play each frame at full scale.
    expect(b.getDisplayScaling('HARMONIC')).toBe('frame');
    const warped = b.resolveWarpedTable('HARMONIC', 'bend', 0.5);
    expect(warped).not.toBe('HARMONIC');
    expect(b.getDisplayScaling(warped)).toBe('frame');
  });
});

function mean(f: Float32Array): number {
  let m = 0;
  for (const v of f) m += v;
  return m / f.length;
}

describe('one-shot LFOs and series filters (the Serum pack, 2026-10-21)', () => {
  it('a one-shot LFO plays bar 1 from each note-on, then holds its end', async () => {
    const { SynthEngine } = await import('../SynthEngine');
    const fake = fakeOracleContext();
    const engine = new SynthEngine();
    await engine.init(fake.ctx as unknown as AudioContext, {
      disableMidi: true,
    });
    const before = fake.ofKind('bufferSource').length;
    engine.setLFOOnce(0, true);
    engine.noteOn(60, 1, 0.5);
    const started = fake
      .ofKind('bufferSource')
      .slice(before)
      .filter((n) => n.start.mock.calls.some((c) => c[0] === 0.5));
    // One non-looping source from the note, for one bar (2 s at 120 BPM).
    expect(started).toHaveLength(1);
    const [when, offset, duration] = started[0].start.mock.calls.at(-1)!;
    expect([when, offset]).toEqual([0.5, 0]);
    expect(duration).toBeCloseTo(2, 3);
    engine.releaseResources();
  });

  it('runs Filter 1 into Filter 2 when the routing says series', async () => {
    const { Voice } = await import('../Voice');
    const fake = fakeOracleContext();
    const bank = new WavetableBank(fake.ctx as unknown as AudioContext);
    const voice = new Voice(
      fake.ctx as unknown as AudioContext,
      0,
      bank,
      fake.ctx.createGain() as unknown as AudioNode,
    );
    const f1 = voice.getFilter1() as unknown as {
      setDestination: (n: AudioNode) => void;
    };
    const spy = vi.spyOn(f1, 'setDestination');
    voice.setRouting({
      filterRouting: {
        filter1Sources: ['osc1'],
        filter2Sources: [],
        serial: true,
      },
      envelopeRouting: { env1Sources: ['osc1'], env2Sources: [] },
    });
    const into = spy.mock.calls.at(-1)?.[0];
    expect(into).toBe(voice.getFilter2().getInputNode());
  });
});

describe('key tracking off (a Serum kick or tom)', () => {
  it('plays the oscillator from middle C whatever the key', async () => {
    const { SynthEngine } = await import('../SynthEngine');
    const { midiToFrequency } = await import('../constants');
    const fake = fakeOracleContext();
    const engine = new SynthEngine();
    await engine.init(fake.ctx as unknown as AudioContext, {
      disableMidi: true,
    });
    engine.setOscillatorParams(0, { keyTrack: false, octave: 0, semitone: 0 });
    const before = fake.ofKind('oscillator').length;
    engine.noteOn(36, 1, 0.25);
    const freqs = fake
      .ofKind('oscillator')
      .slice(before)
      .map((o) => param(o, 'frequency').valueAt(0.25));
    // Osc 1's voices at C4 for a C2 key; osc 2 (tracking) at C2.
    expect(freqs.some((f) => Math.abs(f - midiToFrequency(60)) < 0.5)).toBe(
      true,
    );
    engine.releaseResources();
  });
});

describe('the crossfade’s second bank (performance, 2026-10-21)', () => {
  const oscillatorsFor = async (wavetable: string) => {
    const { Oscillator } = await import('../Oscillator');
    const fake = fakeOracleContext();
    const bank = new WavetableBank(fake.ctx as unknown as AudioContext);
    const osc = new Oscillator(
      fake.ctx as unknown as AudioContext,
      bank,
      fake.ctx.createGain() as unknown as AudioNode,
    );
    osc.setParams({ wavetable, unisonVoices: 1 });
    const before = fake.ofKind('oscillator').length;
    osc.start(0);
    return fake.ofKind('oscillator').length - before;
  };

  it('sits out a note on a one-frame table, and runs on a multi-frame one', async () => {
    expect(await oscillatorsFor('SAWTOOTH')).toBe(1);
    expect(await oscillatorsFor('HARMONIC')).toBe(2);
  });
});

describe('a mod amount drag (performance, 2026-10-21)', () => {
  it('retunes the sounding voice’s route in place; another edit rebuilds', async () => {
    const { SynthEngine } = await import('../SynthEngine');
    const fake = fakeOracleContext();
    const engine = new SynthEngine();
    await engine.init(fake.ctx as unknown as AudioContext, {
      disableMidi: true,
    });
    const cutoff = (
      amount: number,
      polarity: 'unipolar' | 'bipolar',
    ): ModRoute => ({
      id: 'r1',
      source: { type: 'envelope' as const, index: 1 },
      target: { source: 'flt1', param: 'cutoff' },
      amount,
      polarity,
      enabled: true,
    });
    engine.setModRoutes([cutoff(0.5, 'unipolar')]);
    engine.noteOn(60, 1, 0);
    const gains = () => fake.ofKind('gain').length;

    const before = gains();
    engine.setModRoutes([cutoff(0.25, 'unipolar')]);
    expect(gains()).toBe(before);
    // The route's scaler heads for 0.25 × the cutoff's 12,000 cents.
    const scaler = fake
      .ofKind('gain')
      .find((g) => param(g, 'gain').valueAt(1) === 3000);
    expect(scaler).toBeDefined();

    engine.setModRoutes([cutoff(0.25, 'bipolar')]);
    expect(gains()).toBeGreaterThan(before);
    engine.releaseResources();
  });
});

describe('Position on a one-frame table (owner, 2026-10-22)', () => {
  it('starts a basic shape that far into its cycle', () => {
    const fake = fakeOracleContext();
    const bank = new WavetableBank(fake.ctx as unknown as AudioContext);
    const made = vi.spyOn(fake.ctx, 'createPeriodicWave');
    // Half a cycle: every odd harmonic turns over, every even one stays.
    const wave = bank.getPhasedWave('SAWTOOTH', 0.5);
    const [real, imag] = made.mock.calls.at(-1)! as unknown as [
      Float32Array,
      Float32Array,
    ];
    const base = bank.getPhasedWave('SAWTOOTH', 0);
    expect(wave).not.toBe(base);
    const saw = (k: number) => (k % 2 === 1 ? -1 : 1);
    for (const k of [1, 2, 3, 4]) {
      // The saw is all sines: imag[k] carries it.
      expect(Math.sign(imag[k]) * saw(k)).toBe(
        Math.sign(
          (
            bank as unknown as {
              framePartials: Map<string, { imag: number[] }[]>;
            }
          ).framePartials.get('SAWTOOTH')![0].imag[k],
        ),
      );
      expect(Math.abs(real[k])).toBeLessThan(1e-9);
    }
    // Kept: the same phase builds nothing new; a multi-frame table has none.
    const calls = made.mock.calls.length;
    expect(bank.getPhasedWave('SAWTOOTH', 0.5)).toBe(wave);
    expect(made.mock.calls.length).toBe(calls);
    expect(bank.getPhasedWave('HARMONIC', 0.5)).toBeNull();
  });

  it('sets the phase as a note starts, and leaves a sounding note alone', async () => {
    const { Oscillator } = await import('../Oscillator');
    const fake = fakeOracleContext();
    const bank = new WavetableBank(fake.ctx as unknown as AudioContext);
    const osc = new Oscillator(
      fake.ctx as unknown as AudioContext,
      bank,
      fake.ctx.createGain() as unknown as AudioNode,
    );
    osc.setParams({ wavetable: 'SQUARE', wtPosition: 0.25, unisonVoices: 1 });
    const before = fake.ofKind('oscillator').length;
    osc.start(0);
    const node = fake.ofKind('oscillator')[before];
    const quarter = bank.getPhasedWave('SQUARE', 0.25);
    expect(node.setPeriodicWave).toHaveBeenLastCalledWith(quarter);
    const set = node.setPeriodicWave.mock.calls.length;
    osc.setParams({ wtPosition: 0.75 });
    expect(node.setPeriodicWave.mock.calls.length).toBe(set);
  });
});
