import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ── The gate and the ducker on the dynamics worklet (milestone 1.11, c3) ────
// Off, neither has a node in the path; switched on, the worklet module loads
// once and its node goes in, and the ducker's key tap is its second input.
// No main-thread timer is left anywhere in the chain or the engines.

vi.mock('../../reverbIR', () => ({
  getProcessedIr: () => null,
  ensureProcessedIr: () => Promise.resolve(null),
}));

import { DEFAULT_EFFECTS, EffectChain } from '../../EffectChain';
import { DuckerModule } from '../effects/ducker';
import { GateModule } from '../effects/gate';
import type { EffectUpdateOptions } from '../effects/types';
import { recordingContext, type RecNode } from './recordingContext';

const OPTS: EffectUpdateOptions = {
  glide: false,
  heard: false,
  deferIr: false,
};

interface WorkletRec extends RecNode {
  options: AudioWorkletNodeOptions;
  parameters: Map<string, { value: number }>;
  port: {
    postMessage: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
    onmessage: ((e: { data: unknown }) => void) | null;
  };
  /** Edges into this node's inputs: [from, input index]. */
  inputs: Array<[RecNode, number]>;
}

let rec: ReturnType<typeof recordingContext>;
let ctx: BaseAudioContext;
let worklets: WorkletRec[];
let addModule: ReturnType<typeof vi.fn>;

beforeEach(() => {
  rec = recordingContext();
  worklets = [];
  addModule = vi.fn(() => Promise.resolve());
  ctx = Object.assign(rec.ctx, { audioWorklet: { addModule } });
  vi.stubGlobal(
    'AudioWorkletNode',
    function FakeWorkletNode(
      _ctx: BaseAudioContext,
      _name: string,
      options: AudioWorkletNodeOptions,
    ) {
      const node = rec.ctx.createGain() as unknown as WorkletRec;
      node.kind = 'worklet';
      node.options = options;
      node.parameters = new Map(
        Object.entries(options.parameterData ?? {}).map(([k, v]) => [
          k,
          { value: v, setValueAtTime: vi.fn() },
        ]),
      );
      node.port = { postMessage: vi.fn(), close: vi.fn(), onmessage: null };
      node.inputs = [];
      worklets.push(node);
      return node;
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const flush = () => new Promise((r) => setTimeout(r, 0));

function gate(enabled: boolean) {
  return { ...DEFAULT_EFFECTS.gate, enabled };
}
function ducker(enabled: boolean, keyTrackId: string | null = 'kick') {
  return { ...DEFAULT_EFFECTS.ducker, enabled, keyTrackId };
}

describe('GateModule', () => {
  it('is out of the path while off, and loads nothing', async () => {
    const g = new GateModule(ctx, gate(false));
    const src = rec.ctx.createGain() as unknown as RecNode;
    g.wire(src as unknown as AudioNode);
    g.update(gate(false), OPTS);
    await flush();
    expect(rec.from(src)).toEqual([g.output]);
    expect(addModule).not.toHaveBeenCalled();
    expect(worklets).toHaveLength(0);
  });

  it('passes the sound unchanged until the worklet is in, then gates it', async () => {
    const g = new GateModule(ctx, gate(false));
    const src = rec.ctx.createGain() as unknown as RecNode;
    g.wire(src as unknown as AudioNode);
    g.update({ ...gate(true), threshold: -50 }, OPTS);
    expect(rec.from(src)).toEqual([g.output]);
    await g.whenReady();
    expect(worklets).toHaveLength(1);
    const node = worklets[0];
    expect(node.options.processorOptions).toEqual({ mode: 'gate' });
    expect(node.options.parameterData).toMatchObject({ threshold: -50 });
    expect(rec.from(src)).toEqual([node]);
    expect(rec.from(node)).toEqual([g.output]);
  });

  it('switched off, takes its node out and disposes it', async () => {
    const g = new GateModule(ctx, gate(false));
    const src = rec.ctx.createGain() as unknown as RecNode;
    g.wire(src as unknown as AudioNode);
    g.update(gate(true), OPTS);
    await g.whenReady();
    const node = worklets[0];
    node.port.onmessage?.({ data: { type: 'gr', db: -12 } });
    expect(g.getReduction()).toBe(-12);

    g.update(gate(false), OPTS);
    expect(rec.from(src)).toEqual([g.output]);
    expect(rec.from(node)).toEqual([]);
    expect(node.port.postMessage).toHaveBeenCalledWith({ type: 'dispose' });
    expect(g.getReduction()).toBe(0);

    // On again: the module is loaded, so the node goes in at once.
    g.update(gate(true), OPTS);
    expect(worklets).toHaveLength(2);
    expect(rec.from(src)).toEqual([worklets[1]]);
    expect(addModule).toHaveBeenCalledTimes(1);
  });

  it('a gate disposed while its worklet loads never makes a node', async () => {
    const g = new GateModule(ctx, gate(false));
    g.wire(rec.ctx.createGain() as unknown as AudioNode);
    g.update(gate(true), OPTS);
    g.dispose();
    await flush();
    expect(worklets).toHaveLength(0);
  });
});

describe('DuckerModule', () => {
  function build() {
    const d = new DuckerModule(ctx, ducker(false));
    const dest = rec.ctx.createGain() as unknown as RecNode;
    d.wire(
      rec.ctx.createGain() as unknown as AudioNode,
      dest as unknown as AudioNode,
    );
    const kick = rec.ctx.createAnalyser() as unknown as RecNode;
    const resolve = vi.fn((id: string) =>
      id === 'kick' ? (kick as unknown as AnalyserNode) : null,
    );
    d.setKeySourceResolver(resolve);
    return { d, dest, kick, resolve };
  }

  it('is out of the path while off', () => {
    const { d, dest, kick } = build();
    d.update(ducker(false), OPTS);
    expect(rec.from(d.input)).toEqual([dest]);
    expect(rec.from(kick)).toEqual([]);
    expect(worklets).toHaveLength(0);
  });

  it("takes the key track's tap as its second input once on", async () => {
    const { d, dest, kick } = build();
    const connect = vi.spyOn(kick as unknown as AudioNode, 'connect');
    d.update(ducker(true), OPTS);
    await d.whenReady();
    const node = worklets[0];
    expect(node.options).toMatchObject({
      numberOfInputs: 2,
      processorOptions: { mode: 'ducker' },
    });
    expect(rec.from(d.input)).toEqual([node]);
    expect(rec.from(node)).toEqual([dest]);
    expect(rec.from(kick)).toEqual([node]);
    expect(connect).toHaveBeenCalledWith(node, 0, 1);

    node.port.onmessage?.({ data: { type: 'gr', db: -6 } });
    expect(d.getReduction()).toBe(-6);
  });

  it('follows a new key tap, and drops a missing key', async () => {
    const { d, kick, resolve } = build();
    d.update(ducker(true), OPTS);
    await d.whenReady();
    const node = worklets[0];

    // The key track's engine is made again: a new tap.
    const kick2 = rec.ctx.createAnalyser() as unknown as RecNode;
    resolve.mockImplementation((id: string) =>
      id === 'kick' ? (kick2 as unknown as AnalyserNode) : null,
    );
    d.refreshKey();
    expect(rec.from(kick)).toEqual([]);
    expect(rec.from(kick2)).toEqual([node]);

    d.update(ducker(true, 'gone'), OPTS);
    expect(rec.from(kick2)).toEqual([]);
  });

  it('switched off, unkeys, takes its node out and disposes it', async () => {
    const { d, dest, kick } = build();
    d.update(ducker(true), OPTS);
    await d.whenReady();
    const node = worklets[0];
    d.update(ducker(false), OPTS);
    expect(rec.from(kick)).toEqual([]);
    expect(rec.from(d.input)).toEqual([dest]);
    expect(node.port.postMessage).toHaveBeenCalledWith({ type: 'dispose' });
    expect(d.getReduction()).toBe(0);
  });
});

describe('EffectChain with the dynamics worklet', () => {
  it('a fresh chain has no worklet in it, and loads none', async () => {
    const chain = new EffectChain(ctx as AudioContext);
    chain.update(structuredClone(DEFAULT_EFFECTS));
    await chain.whenDynamicsReady();
    expect(worklets).toHaveLength(0);
    expect(addModule).not.toHaveBeenCalled();
  });

  it('whenDynamicsReady resolves with the gate and ducker in the path', async () => {
    const chain = new EffectChain(ctx as AudioContext);
    const kick = rec.ctx.createAnalyser() as unknown as AnalyserNode;
    chain.setKeySourceResolver(() => kick);
    const state = structuredClone(DEFAULT_EFFECTS);
    state.gate.enabled = true;
    state.ducker = ducker(true);
    chain.update(state);
    await chain.whenDynamicsReady();
    expect(worklets.map((w) => w.options.processorOptions)).toEqual([
      { mode: 'gate' },
      { mode: 'ducker' },
    ]);
    expect(rec.from(kick)).toEqual([worklets[1]]);
    expect(addModule).toHaveBeenCalledTimes(1);
  });
});

describe('no main-thread timers in the audio graph', () => {
  const files = [
    '../../EffectChain.ts',
    '../../TrackEngine.ts',
    '../../AudioEngine.ts',
    '../effects/gate.ts',
    '../effects/ducker.ts',
    '../../pedals/WahPedal.ts',
  ];
  it.each(files)('%s has no setInterval', (file) => {
    const source = readFileSync(new URL(file, import.meta.url), 'utf8');
    expect(source).not.toMatch(/setInterval/);
  });
});
