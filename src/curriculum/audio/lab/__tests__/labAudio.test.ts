import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { recordingContext } from '@/daw/audio/graph/__tests__/recordingContext';
import {
  AUTO_FADE_MS,
  earTrim,
  LabAudio,
  MAX_HZ,
  OUTPUT_CEILING,
  VOICE_CAP,
  voiceGain,
} from '../labAudio';

/** The graph recorder, plus the oscillators the labs need. */
function rig() {
  const rec = recordingContext();
  const gainNode = (rec.ctx as unknown as { createGain: () => object })
    .createGain;
  const analyserNode = (rec.ctx as unknown as { createAnalyser: () => object })
    .createAnalyser;
  const started: Array<Record<string, unknown>> = [];
  Object.assign(rec.ctx, {
    createOscillator: () => {
      const node = gainNode() as Record<string, unknown>;
      node.kind = 'oscillator';
      node.start = vi.fn();
      node.stop = vi.fn();
      node.setPeriodicWave = vi.fn();
      started.push(node);
      return node;
    },
    createAnalyser: () => {
      const node = analyserNode() as Record<string, unknown>;
      node.frequencyBinCount = 4;
      node.getFloatFrequencyData = vi.fn();
      return node;
    },
    createDelay: () => {
      const node = gainNode() as Record<string, unknown>;
      node.kind = 'delay';
      node.delayTime = { value: 0, setTargetAtTime: vi.fn() };
      return node;
    },
    createPeriodicWave: vi.fn((real: Float32Array, imag: Float32Array) => ({
      real,
      imag,
    })),
  });
  const output = gainNode();
  return { ...rec, output, started };
}

const make = (r: ReturnType<typeof rig>, onFaded?: (id: string) => void) =>
  new LabAudio({
    context: r.ctx,
    output: r.output as unknown as AudioNode,
    onFaded,
  });

const kinds = (r: ReturnType<typeof rig>, start: unknown) => {
  const path: string[] = [];
  let node = start;
  while (node) {
    const [next] = r.from(node);
    if (!next) break;
    path.push(next.kind);
    node = next;
  }
  return path;
};

describe('the labs’ sound', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('sends every voice through the limiter and the ceiling, in that order', () => {
    const r = rig();
    const audio = make(r);
    audio.set('a', 440);
    audio.set('b', 880);
    for (const osc of r.started) {
      expect(kinds(r, osc)).toEqual([
        'gain', // the voice
        'gain', // the mix
        'compressor',
        'waveshaper',
        'analyser',
        'gain', // the output channel
      ]);
    }
  });

  it('can never pass the ceiling: the curve itself stops at it', () => {
    const r = rig();
    make(r);
    const shaper = r.nodes.find((n) => n.kind === 'waveshaper')!;
    const curve = shaper.curve as Float32Array;
    expect(Math.max(...curve)).toBeLessThanOrEqual(OUTPUT_CEILING);
    expect(Math.min(...curve)).toBeGreaterThanOrEqual(-OUTPUT_CEILING);
  });

  it('caps a voice, however much a lab asks for', () => {
    expect(voiceGain(1, 100)).toBeLessThanOrEqual(VOICE_CAP);
    expect(voiceGain(50, 100)).toBeLessThanOrEqual(VOICE_CAP);
    expect(voiceGain(-1, 100)).toBe(0);
  });

  it('turns the ear’s most sensitive range down', () => {
    expect(earTrim(2500)).toBeCloseTo(10 ** (-9 / 20));
    expect(earTrim(2500)).toBeLessThan(earTrim(440));
    expect(earTrim(55)).toBeGreaterThan(0.95);
  });

  it('clamps a frequency to the range a lab may sound in', () => {
    const r = rig();
    const audio = make(r);
    audio.set('a', 100_000);
    const frequency = r.started[0].frequency as { value: number };
    expect(frequency.value).toBe(MAX_HZ);
  });

  it('glides a voice already sounding, without a second oscillator', () => {
    const r = rig();
    const audio = make(r);
    for (const hz of [440, 880]) audio.set('a', hz);
    expect(r.started).toHaveLength(1);
  });

  it('stops a voice, and stopping one not sounding does nothing', () => {
    const r = rig();
    const audio = make(r);
    audio.set('a', 440);
    audio.stop('a');
    audio.stop('a');
    audio.stop('never');
    expect(r.started[0].stop).toHaveBeenCalledTimes(1);
    expect(audio.isSounding('a')).toBe(false);
  });

  it('fades a forgotten tone and says so', () => {
    const r = rig();
    const faded = vi.fn();
    const audio = make(r, faded);
    audio.set('a', 440);
    vi.advanceTimersByTime(AUTO_FADE_MS - 1);
    expect(faded).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(faded).toHaveBeenCalledWith('a');
    expect(audio.isSounding('a')).toBe(false);
  });

  it('counts a change as still being there: the fade starts over', () => {
    const r = rig();
    const faded = vi.fn();
    const audio = make(r, faded);
    audio.set('a', 440);
    vi.advanceTimersByTime(AUTO_FADE_MS - 1);
    audio.set('a', 500);
    vi.advanceTimersByTime(AUTO_FADE_MS - 1);
    expect(faded).not.toHaveBeenCalled();
  });

  it('builds a stack from sines, as the picture draws them', () => {
    const r = rig();
    const audio = make(r);
    audio.set('a', 220, 1, [1, 0, 0.5]);
    const wave = r.started[0].setPeriodicWave as ReturnType<typeof vi.fn>;
    const { real, imag } = wave.mock.calls[0][0] as {
      real: Float32Array;
      imag: Float32Array;
    };
    expect([...imag]).toEqual([0, 1, 0, 0.5]);
    expect([...real]).toEqual([0, 0, 0, 0]);
  });

  it('routes a stack and a shaped note through the limiter too', () => {
    const r = rig();
    const audio = make(r);
    audio.set('a', 220, 1, [1, 0.5]);
    audio.noteOn('b', 220, {
      attack: 0.1,
      decay: 0.1,
      sustain: 0.5,
      release: 0.1,
    });
    for (const osc of r.started) {
      expect(kinds(r, osc)).toEqual([
        'gain',
        'gain',
        'compressor',
        'waveshaper',
        'analyser',
        'gain',
      ]);
    }
  });

  it('changes a sounding voice’s harmonics without a second oscillator', () => {
    const r = rig();
    const audio = make(r);
    const first = [1, 0.5];
    audio.set('a', 220, 1, first);
    audio.set('a', 220, 1, first);
    audio.set('a', 220, 1, [1, 0, 0.3]);
    expect(r.started).toHaveLength(1);
    expect(r.started[0].setPeriodicWave).toHaveBeenCalledTimes(2);
  });

  it('lets a note go by its own release, and only once', () => {
    const r = rig();
    const audio = make(r);
    const env = { attack: 0.01, decay: 0, sustain: 1, release: 0.5 };
    audio.noteOn('a', 220, env);
    audio.noteOff('a');
    audio.noteOff('a');
    expect(r.started[0].stop).toHaveBeenCalledTimes(1);
    expect(audio.isSounding('a')).toBe(false);
  });

  it('restarts a note pressed again, leaving one sounding', () => {
    const r = rig();
    const audio = make(r);
    const env = { attack: 0.01, decay: 0, sustain: 1, release: 0.5 };
    audio.noteOn('a', 220, env);
    audio.noteOn('a', 220, env);
    expect(r.started).toHaveLength(2);
    expect(r.started[0].stop).toHaveBeenCalledTimes(1);
    expect(r.started[1].stop).not.toHaveBeenCalled();
  });

  it('fades a note held and forgotten', () => {
    const r = rig();
    const faded = vi.fn();
    const audio = make(r, faded);
    audio.noteOn('a', 220, {
      attack: 0.01,
      decay: 0,
      sustain: 1,
      release: 0.1,
    });
    vi.advanceTimersByTime(AUTO_FADE_MS);
    expect(faded).toHaveBeenCalledWith('a');
  });

  it('splits a pair through a real delay, half a level on each path', () => {
    const r = rig();
    const audio = make(r);
    audio.setPair('a', 200, 180);
    const delay = r.nodes.find((n) => n.kind === 'delay') as unknown as {
      delayTime: { value: number };
    };
    // Half a cycle at 200 Hz.
    expect(delay.delayTime.value).toBeCloseTo(0.0025);
    expect(r.from(r.started[0])).toHaveLength(2);
    audio.setPair('a', 200, 90);
    expect(r.started).toHaveLength(1);
  });

  it('routes a pair through the limiter, and leaves none of it on closing', () => {
    const r = rig();
    const audio = make(r);
    audio.setPair('a', 220, 90);
    expect(kinds(r, r.started[0])).toEqual([
      'gain', // its first path
      'gain', // the voice
      'gain', // the mix
      'compressor',
      'waveshaper',
      'analyser',
      'gain',
    ]);
    audio.close();
    expect(r.edges).toEqual([]);
  });

  it('reads its spectrum after the ceiling, without touching the path out', () => {
    const r = rig();
    const audio = make(r);
    const before = r.edges.length;
    const shaper = r.nodes.find((n) => n.kind === 'waveshaper')!;
    audio.spectrum();
    audio.spectrum();
    expect(r.edges).toHaveLength(before + 1);
    expect(r.from(shaper)).toHaveLength(2);
    audio.close();
    expect(r.edges).toEqual([]);
  });

  it('leaves nothing connected on closing, and no timer to fire', () => {
    const r = rig();
    const faded = vi.fn();
    const audio = make(r, faded);
    audio.set('a', 440);
    audio.set('b', 880);
    audio.close();
    expect(r.edges).toEqual([]);
    vi.advanceTimersByTime(AUTO_FADE_MS * 2);
    expect(faded).not.toHaveBeenCalled();
    // Closed for good: a late drag can't start a tone.
    audio.set('c', 220);
    expect(r.started).toHaveLength(2);
  });
});
