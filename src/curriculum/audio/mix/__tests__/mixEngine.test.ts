import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { recordingContext } from '@/daw/audio/graph/__tests__/recordingContext';
import { GROOVE_STATS } from '../grooveStats';
import { MixEngine } from '../mixEngine';
import {
  dbToGain,
  effectiveOn,
  envelopeOf,
  fullScaleCurve,
  gainToDb,
  MONITOR_TRIM_DB,
  nextMeter,
  renderedRmsDb,
  SAFETY_CEILING,
  SAFETY_KNEE,
  safetyCurve,
} from '../mixMath';
import { MIX_PEAK_DB, STEMS, type StemId } from '../stems';

function rig() {
  const rec = recordingContext();
  const ctx = rec.ctx as unknown as Record<string, (...a: never[]) => unknown>;
  const gainNode = ctx.createGain as () => Record<string, unknown>;
  const started: Array<Record<string, unknown>> = [];
  const param = () => ({
    value: 0,
    setTargetAtTime: vi.fn(),
    cancelScheduledValues: vi.fn(),
  });
  Object.assign(rec.ctx, {
    sampleRate: 48000,
    createBufferSource: () => {
      const node = gainNode();
      node.kind = 'buffer-source';
      node.start = vi.fn();
      node.stop = vi.fn();
      started.push(node);
      return node;
    },
    createDelay: () => {
      const node = gainNode();
      node.kind = 'delay';
      node.delayTime = param();
      return node;
    },
    createChannelSplitter: () => {
      const node = gainNode();
      node.kind = 'splitter';
      return node;
    },
    createStereoPanner: () => {
      const node = gainNode();
      node.kind = 'panner';
      node.pan = param();
      return node;
    },
    createBiquadFilter: () => {
      const node = gainNode();
      node.kind = 'biquad';
      node.frequency = param();
      node.Q = param();
      node.gain = param();
      return node;
    },
  });
  const output = gainNode();
  return { ...rec, output, started };
}

const buffers = (ids: readonly StemId[]) =>
  new Map(ids.map((id) => [id, { duration: 10 } as AudioBuffer]));

const make = (
  r: ReturnType<typeof rig>,
  ids: readonly StemId[] = ['kick', 'snare'],
) =>
  new MixEngine({
    context: r.ctx,
    output: r.output as unknown as AudioNode,
    buffers: buffers(ids),
  });

const pathKinds = (r: ReturnType<typeof rig>, start: unknown) => {
  const path: string[] = [];
  let node = start;
  for (let i = 0; i < 24 && node; i++) {
    const next = r.from(node).find((n) => n.kind !== 'splitter');
    if (!next) break;
    path.push(next.kind);
    node = next;
  }
  return path;
};

describe('the safety ceiling', () => {
  const curve = safetyCurve();
  const at = (x: number) =>
    curve[Math.round(((x + 1) / 2) * (curve.length - 1))];

  it('does nothing at all below its knee', () => {
    for (const x of [-0.6, -0.3, 0, 0.1, 0.355, 0.59]) {
      expect(at(x)).toBeCloseTo(x, 3);
    }
  });

  it('can never pass the ceiling', () => {
    expect(Math.max(...curve)).toBeLessThanOrEqual(SAFETY_CEILING);
    expect(Math.min(...curve)).toBeGreaterThanOrEqual(-SAFETY_CEILING);
  });

  it('leaves room: a fully clipped signal stays below the knee', () => {
    expect(dbToGain(MONITOR_TRIM_DB)).toBeLessThan(SAFETY_KNEE);
  });

  it('passes full scale straight, and holds anything over it', () => {
    expect([...fullScaleCurve()]).toEqual([-1, 1]);
  });
});

describe('the desk', () => {
  describe('a channel’s copy', () => {
    /** The dry and copy paths, from where they split. */
    const paths = (r: ReturnType<typeof rig>) => {
      let node: unknown = r.started[0];
      for (let i = 0; i < 40 && node; i++) {
        const out = r.from(node);
        const delays = out.filter((n) => n.kind === 'delay');
        if (delays.length === 2) {
          const [dry, copy] = delays as unknown as {
            delayTime: { value: number };
          }[];
          const [tone] = r.from(copy) as unknown as {
            kind: string;
            frequency: { value: number };
          }[];
          const [gain] = r.from(tone) as unknown as {
            gain: { value: number };
          }[];
          return { dry, copy, tone, gain };
        }
        node = out.find((n) => n.kind !== 'splitter');
      }
      throw new Error('No split found');
    };

    it('is silent, and adds no delay, until it’s asked for', () => {
      const r = rig();
      const engine = make(r, ['kick']);
      engine.setChannels({ kick: {} });
      engine.start();
      const { dry, copy, gain } = paths(r);
      expect(gain.gain.value).toBe(0);
      expect(dry.delayTime.value).toBe(0);
      expect(copy.delayTime.value).toBe(0);
    });

    it('comes in late, at its own level, and upside down if asked', () => {
      const r = rig();
      const engine = make(r, ['kick']);
      engine.setChannels({
        kick: {
          copy: {
            delayMs: 10,
            gainDb: 20 * Math.log10(0.5),
            invert: true,
            lowpassHz: 2000,
          },
          dryDelayMs: 4,
        },
      });
      engine.start();
      const { dry, copy, tone, gain } = paths(r);
      expect(copy.delayTime.value).toBeCloseTo(0.01, 9);
      expect(dry.delayTime.value).toBeCloseTo(0.004, 9);
      expect(gain.gain.value).toBeCloseTo(-0.5, 9);
      expect(tone.kind).toBe('biquad');
      expect(tone.frequency.value).toBe(2000);
    });
  });

  it('sets levels outright before there’s sound, and glides once there is', () => {
    const r = rig();
    const engine = make(r, ['kick']);
    engine.setChannels({ kick: { faderDb: 20 * Math.log10(0.25) } });
    engine.start();
    // Follow the path to the fader: it's already at its level.
    let node: unknown = r.started[0];
    let fader: { gain: AudioParam } | null = null;
    for (let i = 0; i < 40 && node && !fader; i++) {
      const next = r.from(node).find((n) => n.kind !== 'splitter');
      const gain = (next as { gain?: AudioParam } | undefined)?.gain;
      if (gain && Math.abs(gain.value - 0.25) < 1e-9) {
        fader = next as unknown as { gain: AudioParam };
      }
      node = next;
    }
    expect(fader).not.toBeNull();
    const glide = vi.spyOn(fader!.gain, 'setTargetAtTime');
    engine.setChannels({ kick: { faderDb: 0 } });
    expect(glide).toHaveBeenCalled();
  });

  it('starts every stem on the same instant', () => {
    const r = rig();
    const engine = make(r);
    engine.start();
    const [a, b] = r.started.map(
      (s) => (s.start as ReturnType<typeof vi.fn>).mock.calls[0][0],
    );
    expect(a).toBe(b);
    expect(r.started[0].loop).toBe(true);
  });

  it('runs a stem through its converter, then the bus and the ceiling, with no compressor', () => {
    const r = rig();
    const engine = make(r);
    engine.start();
    const kinds = pathKinds(r, r.started[0]);
    expect(kinds).not.toContain('compressor');
    expect(kinds.filter((k) => k === 'waveshaper')).toHaveLength(3);
    expect(kinds.at(-2)).toBe('waveshaper');
  });

  it('adds filters and takes them away, leaving the path whole', () => {
    const r = rig();
    const engine = make(r);
    const biquads = () => r.nodes.filter((n) => n.kind === 'biquad');
    // Each channel's copy has its own, from the start.
    const tones = biquads().length;
    engine.setChannels({
      kick: { filters: [{ type: 'highpass', hz: 300 }] },
    });
    expect(biquads()).toHaveLength(tones + 1);
    engine.setChannels({ kick: { filters: [{ type: 'highpass', hz: 500 }] } });
    expect(biquads()).toHaveLength(tones + 1);
    engine.start();
    expect(pathKinds(r, r.started[0])).toContain('biquad');
    engine.setChannels({ kick: { filters: [] } });
    expect(pathKinds(r, r.started[0])).not.toContain('biquad');
  });

  it('stops without a click, and starts again with new sources', () => {
    const r = rig();
    const engine = make(r);
    engine.start();
    engine.stop();
    expect(engine.playing).toBe(false);
    expect(r.started[0].stop).toHaveBeenCalledTimes(1);
    engine.start();
    expect(r.started).toHaveLength(4);
  });

  it('reads nothing while it isn’t playing', () => {
    const r = rig();
    const engine = make(r);
    expect(engine.peak({ bus: 'pre' })).toBe(0);
    expect(engine.position()).toBeNull();
  });

  it('leaves nothing connected on closing', () => {
    const r = rig();
    const engine = make(r);
    engine.setChannels({ kick: { filters: [{ type: 'highpass', hz: 300 }] } });
    engine.setBus({ filters: [{ type: 'highpass', hz: 300 }] });
    engine.start();
    engine.close();
    expect(r.edges).toEqual([]);
  });
});

describe('a mix’s numbers', () => {
  it('turns decibels into gain and back', () => {
    expect(dbToGain(-6)).toBeCloseTo(0.501, 3);
    expect(gainToDb(0.5)).toBeCloseTo(-6.02, 2);
    expect(gainToDb(0)).toBe(-Infinity);
  });

  it('lets solo win over mute', () => {
    const channels = { a: { solo: true }, b: {}, c: { mute: true } };
    expect(effectiveOn('a', channels)).toBe(true);
    expect(effectiveOn('b', channels)).toBe(false);
    expect(effectiveOn('b', { b: {}, c: { mute: true } })).toBe(true);
    expect(effectiveOn('c', { b: {}, c: { mute: true } })).toBe(false);
  });

  it('lets a meter jump up and fall steadily', () => {
    expect(nextMeter(0.1, 0.5, 0.016)).toBe(0.5);
    expect(nextMeter(0.5, 0, 1)).toBeCloseTo(dbToGain(gainToDb(0.5) - 24));
  });

  it('draws one bar a pixel, catching the peak', () => {
    const channel = new Float32Array(1000);
    channel[500] = 0.9;
    const envelope = envelopeOf(channel, 10);
    expect(envelope).toHaveLength(10);
    expect(envelope[5].max).toBeCloseTo(0.9);
    expect(envelope[0].max).toBe(0);
  });

  it('measures the loudness clipping adds', () => {
    const sine = Float32Array.from({ length: 4800 }, (_, i) =>
      Math.sin((2 * Math.PI * i) / 48),
    );
    expect(renderedRmsDb(sine, 0)).toBeCloseTo(-3, 0);
    // 12 dB over: clipped, it can't rise by 12.
    expect(renderedRmsDb(sine, 12)).toBeLessThan(0.1);
    expect(renderedRmsDb(sine, 12, false)).toBeCloseTo(9, 0);
  });
});

describe('the stems', () => {
  const dir = join(process.cwd(), 'public/audio-lab/groove-96-v1');

  it('stays within budget, and lets go of nothing it needs', () => {
    const total = STEMS.reduce(
      (sum, stem) =>
        sum + statSync(join(process.cwd(), 'public', stem.url)).size,
      0,
    );
    expect(total).toBeLessThan(2 * 1024 * 1024);
    expect(total).toBe(GROOVE_STATS.totalBytes);
  });

  it('credits what it uses, and has a credit for anything that needs one', () => {
    expect(readFileSync(join(dir, 'CREDITS.md'), 'utf8')).toMatch(/Karoryfer/);
    for (const stem of STEMS) {
      if (stem.license === 'cc-by') expect(stem.credit).toBeTruthy();
    }
  });

  it('keeps the whole mix under full scale at unity', () => {
    expect(MIX_PEAK_DB).toBeLessThan(0);
    expect(GROOVE_STATS.seconds).toBe(10);
  });
});
