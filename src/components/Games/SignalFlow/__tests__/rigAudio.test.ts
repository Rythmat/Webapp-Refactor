import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { recordingContext } from '@/daw/audio/graph/__tests__/recordingContext';
import { OUTPUT_CEILING, RigAudio } from '../audio/rigAudio';
import { startMission } from '../rig/missionReducer';
import { missionById } from '../rig/missions';
import type { Cable, RigState } from '../rig/rigTypes';
import { traceSignal } from '../rig/traceSignal';

// The real graph, wired into a context that keeps its live edge list.

function setup() {
  const rec = recordingContext(8000);
  const ctx = rec.ctx as unknown as Record<string, unknown>;
  // What the recording context doesn't make: sources, as plain nodes.
  const source = (kind: string) => () => {
    const node = rec.ctx.createGain() as unknown as Record<string, unknown>;
    node.kind = kind;
    node.start = vi.fn();
    node.stop = vi.fn();
    node.playbackRate = { value: 1 };
    return node;
  };
  ctx.createBufferSource = source('bufferSource');
  ctx.createOscillator = source('oscillator');
  const destination = rec.ctx.createGain();
  const outputs = new Map<string, GainNode>();
  const audio = new RigAudio(rec.ctx, destination, {
    output: (name) => {
      let out = outputs.get(name);
      if (!out) {
        out = rec.ctx.createGain();
        outputs.set(name, out);
      }
      return out;
    },
  });

  const kinds = () => rec.edges.length;
  /** Is there a path from `from` to `to`, along live edges? */
  const connected = (from: unknown, to: unknown) => {
    const seen = new Set<unknown>();
    const stack = [from];
    while (stack.length) {
      const at = stack.pop();
      if (at === to) return true;
      if (seen.has(at)) continue;
      seen.add(at);
      for (const next of rec.from(at)) stack.push(next);
    }
    return false;
  };
  return { rec, audio, destination, outputs, kinds, connected };
}

const rigOf = (id: string): RigState => {
  const mission = missionById(id);
  if (!mission) throw new Error(id);
  return startMission(mission).rig;
};

const sync = (audio: RigAudio, rig: RigState) =>
  audio.sync(rig, traceSignal(rig));

const without = (rig: RigState, cable: string): RigState => ({
  ...rig,
  cables: rig.cables.filter((c) => c.id !== cable),
});

const withCable = (rig: RigState, cable: Cable): RigState => ({
  ...rig,
  cables: [...rig.cables, cable],
});

describe('the rig as sound', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('ends every path at the safety ceiling, and nothing passes it', () => {
    const { rec, destination } = setup();
    const into = rec.edges.filter(([, to]) => to === (destination as unknown));
    expect(into).toHaveLength(1);
    const tap = into[0][0];
    expect(tap.kind).toBe('analyser');
    const shaper = rec.edges.find(([, to]) => to === tap)?.[0];
    expect(shaper?.kind).toBe('waveshaper');
    const curve = shaper?.curve as Float32Array;
    expect(Math.max(...curve.map(Math.abs))).toBeLessThanOrEqual(
      OUTPUT_CEILING,
    );
    const limiter = rec.edges.find(([, to]) => to === shaper)?.[0];
    expect(limiter?.kind).toBe('compressor');
  });

  it('has sound reach the output only when the cable is in', () => {
    const { audio, outputs, destination, connected } = setup();
    const patched = rigOf('voice-dial');
    sync(audio, without(patched, 'mic-cable'));
    const vox = outputs.get('vox');
    expect(vox).toBeDefined();
    expect(connected(vox, destination)).toBe(false);

    sync(audio, patched);
    expect(connected(vox, destination)).toBe(true);
  });

  it('cuts the sound when a cable is pulled', () => {
    const { audio, outputs, destination, connected } = setup();
    const patched = rigOf('voice-dial');
    sync(audio, patched);
    const vox = outputs.get('vox');
    expect(connected(vox, destination)).toBe(true);

    sync(audio, without(patched, 'mic-cable'));
    vi.runAllTimers();
    expect(connected(vox, destination)).toBe(false);
  });

  it('connects nothing along a cable with two outputs', () => {
    const { audio, outputs, destination, connected } = setup();
    sync(audio, rigOf('guitar-fix'));
    expect(connected(outputs.get('guitar'), destination)).toBe(false);
  });

  it('runs no sound down a MIDI cable', () => {
    const { rec, audio } = setup();
    sync(audio, rigOf('studio-probe'));
    // The keyboard's cable has a meter, and nothing feeding it. The interface's
    // USB cable, for comparison, is carrying the laptop's sound.
    const fed = (cable: string) => {
      const tap = audio.cableTap(cable);
      expect(tap).not.toBeNull();
      const fade = rec.edges.find(([, to]) => to === (tap as unknown))?.[0];
      return rec.edges.filter(([, to]) => to === fade).length;
    };
    expect(fed('key-cable')).toBe(0);
    expect(fed('iface-cable')).toBeGreaterThan(0);
  });

  it('runs the same signal through a balanced run on both wires', () => {
    const { rec, audio } = setup();
    sync(audio, rigOf('stage-balance'));
    // Two flips: one sends the cold wire upside down, one brings it back.
    const flips = rec.nodes.filter(
      (node) =>
        node.kind === 'gain' && (node.gain as { value: number }).value === -1,
    );
    expect(flips.length).toBeGreaterThanOrEqual(2);
    expect(flips.length % 2).toBe(0);
  });

  it('uses a low-pass on a long unbalanced run, for the highs it loses', () => {
    const { rec, audio } = setup();
    const before = rec.nodes.filter((node) => node.kind === 'biquad').length;
    sync(audio, rigOf('stage-balance'));
    const lows = rec.nodes
      .slice(before)
      .filter(
        (node) =>
          node.kind === 'biquad' &&
          node.type === 'lowpass' &&
          (node.frequency as { value: number }).value === 3200,
      );
    expect(lows).toHaveLength(1);
  });

  it('routes headphones on a cable, in place of the rig', () => {
    const { rec, audio } = setup();
    sync(audio, rigOf('voice-dial'));
    const tap = audio.cableTap('mic-cable');
    const before = rec.from(tap).length;
    audio.setProbe('mic-cable');
    expect(rec.from(tap).length).toBe(before + 1);
    audio.setProbe(null);
    expect(rec.from(tap).length).toBe(before);
  });

  it('forgets the probe when its cable is pulled, without throwing', () => {
    const { audio } = setup();
    const rig = rigOf('voice-dial');
    sync(audio, rig);
    audio.setProbe('mic-cable');
    sync(audio, without(rig, 'mic-cable'));
    expect(() => vi.runAllTimers()).not.toThrow();
    expect(() => audio.setProbe(null)).not.toThrow();
  });

  it('survives re-patching a cable under a new name', () => {
    const { audio, outputs, destination, connected } = setup();
    const rig = rigOf('voice-dial');
    sync(audio, rig);
    const pulled = without(rig, 'mic-cable');
    sync(audio, pulled);
    vi.runAllTimers();
    sync(
      audio,
      withCable(pulled, {
        id: 'c9',
        kind: 'xlr',
        a: { gear: 'mic', port: 'out' },
        b: { gear: 'speaker', port: 'in' },
      }),
    );
    expect(connected(outputs.get('vox'), destination)).toBe(true);
  });

  it('leaves no connection behind when it is done', () => {
    const { rec, audio, outputs } = setup();
    for (const id of ['voice-dial', 'guitar-probe', 'band-mix', 'stage-fix']) {
      const rig = rigOf(id);
      sync(audio, rig);
      sync(audio, { ...rig, cables: [] });
      vi.runAllTimers();
    }
    audio.dispose();
    vi.runAllTimers();
    const fromSources = [...outputs.values()].flatMap((out) => rec.from(out));
    expect(fromSources).toHaveLength(0);
  });
});
