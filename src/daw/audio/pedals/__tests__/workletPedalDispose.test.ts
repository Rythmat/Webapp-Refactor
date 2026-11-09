import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeAudioGraph } from '@/daw/audio/__tests__/fakeAudioGraph';
import { NamWorkletNode } from '@/daw/audio/nam/NamWorkletNode';
import { NamAmpPedal } from '@/daw/audio/pedals/NamAmpPedal';
import { PitchCorrectionPedal } from '@/daw/audio/pedals/PitchCorrectionPedal';
import { PitchCorrectionNode } from '@/daw/audio/pitch-correction/PitchCorrectionNode';

// The NAM and pitch-correction worklets load through the registry (once per
// context), tell their processor to stop when disposed, and a node whose
// module arrives after dispose is never made or wired.

let graph: ReturnType<typeof fakeAudioGraph>;
let made: Array<{
  name: string;
  connect: ReturnType<typeof vi.fn>;
  port: { postMessage: ReturnType<typeof vi.fn> };
}>;
let addModule: ReturnType<typeof vi.fn>;
let ctxCount = 0;

function context(): AudioContext {
  graph = fakeAudioGraph();
  // A fresh context per test, so the registry's per-context cache is fresh.
  ctxCount++;
  return Object.assign(graph.ctx, {
    id: ctxCount,
    state: 'running',
    currentTime: 0,
    audioWorklet: { addModule },
    createWaveShaper: () => ({ connect: vi.fn(), disconnect: vi.fn() }),
  });
}

beforeEach(() => {
  made = [];
  addModule = vi.fn(() => Promise.resolve());
  vi.stubGlobal(
    'AudioWorkletNode',
    function FakeWorkletNode(_ctx: unknown, name: string) {
      const node = {
        name,
        connect: vi.fn(),
        disconnect: vi.fn(),
        addEventListener: vi.fn(),
        port: { postMessage: vi.fn(), close: vi.fn(), onmessage: null },
      };
      made.push(node);
      return node;
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('worklet nodes register per context and dispose', () => {
  it('loads each module once per context', async () => {
    const ctx = context();
    await new PitchCorrectionNode(ctx).init();
    await new PitchCorrectionNode(ctx).init();
    await new NamWorkletNode(ctx).init();
    await new NamWorkletNode(ctx).init();
    expect(addModule.mock.calls.map((c) => c[0])).toEqual([
      '/daw-assets/pitch-correction-processor.js',
      '/daw-assets/nam-processor.js',
    ]);
    // A second context loads them again (the old global flag skipped it).
    await new PitchCorrectionNode(context()).init();
    expect(addModule).toHaveBeenCalledTimes(3);
  });

  it('dispose() tells the processor to stop', async () => {
    const ctx = context();
    const pitch = new PitchCorrectionNode(ctx);
    const nam = new NamWorkletNode(ctx);
    await pitch.init();
    await nam.init();
    pitch.dispose();
    nam.dispose();
    for (const node of made) {
      expect(node.port.postMessage).toHaveBeenCalledWith({ type: 'dispose' });
    }
  });

  it('a node disposed during init is never made', async () => {
    const ctx = context();
    const nam = new NamWorkletNode(ctx);
    const loading = nam.init();
    nam.dispose();
    await expect(loading).rejects.toThrow(/disposed/);
    expect(made).toHaveLength(0);
  });

  it('PitchCorrectionPedal drops a worklet that arrives after dispose', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const pedal = new PitchCorrectionPedal(context());
    pedal.setEnabled(true);
    pedal.dispose();
    await new Promise((r) => setTimeout(r, 0));
    expect(made).toHaveLength(0);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('NamAmpPedal drops a NAM node that arrives after dispose', async () => {
    const pedal = new NamAmpPedal(context());
    const loading = pedal.loadNamModel({
      architecture: 'Linear',
      config: {},
      weights: [],
    } as never);
    pedal.dispose();
    await loading;
    // Made by init before the pedal's flag was seen, then let go at once.
    for (const node of made) {
      expect(node.port.postMessage).toHaveBeenCalledWith({ type: 'dispose' });
      expect(node.port.postMessage).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'load-model' }),
      );
    }
  });

  it('removing a NAM pedal mid-init does not reject to the caller', async () => {
    // The context goes away under the load (the track was deleted).
    addModule = vi.fn(() => Promise.reject(new Error('context closed')));
    const pedal = new NamAmpPedal(context());
    const loading = pedal.loadNamModel({
      architecture: 'Linear',
      config: {},
      weights: [],
    } as never);
    pedal.dispose();
    await expect(loading).resolves.toBeUndefined();
    expect(made).toHaveLength(0);
  });
});
