import { afterEach, describe, expect, it, vi } from 'vitest';

// ── The worklet registry: one module load per context and url ──────────────

const toneNodes: Array<{ ctx: unknown; name: string }> = [];
vi.mock('tone', () => {
  class Context {
    rawContext: unknown;
    createAudioWorkletNode(this: { rawContext: unknown }, name: string) {
      toneNodes.push({ ctx: this.rawContext, name });
      return { wrapped: true, name };
    }
  }
  return { Context };
});

import {
  createWorkletNode,
  disposeWorkletNode,
  ensureWorklet,
  isWorkletReady,
} from '../workletRegistry';

function fakeContext(addModule = vi.fn(() => Promise.resolve())) {
  return {
    ctx: { audioWorklet: { addModule } } as unknown as BaseAudioContext,
    addModule,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  toneNodes.length = 0;
});

describe('ensureWorklet', () => {
  it('adds a module to a context once, and to each context of its own', async () => {
    const a = fakeContext();
    const b = fakeContext();
    const first = ensureWorklet(a.ctx, '/x.js');
    expect(ensureWorklet(a.ctx, '/x.js')).toBe(first);
    await first;
    await ensureWorklet(a.ctx, '/x.js');
    expect(a.addModule).toHaveBeenCalledTimes(1);
    expect(isWorkletReady(a.ctx, '/x.js')).toBe(true);

    // Another context (an export's offline one) loads it again.
    expect(isWorkletReady(b.ctx, '/x.js')).toBe(false);
    await ensureWorklet(b.ctx, '/x.js');
    expect(b.addModule).toHaveBeenCalledTimes(1);

    // Another url on the same context is its own load.
    await ensureWorklet(a.ctx, '/y.js');
    expect(a.addModule).toHaveBeenCalledTimes(2);
  });

  it('a failed load rejects once, and the next call loads again', async () => {
    const addModule = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue(undefined);
    const { ctx } = fakeContext(addModule);
    const failed = ensureWorklet(ctx, '/x.js');
    await expect(failed).rejects.toThrow('offline');
    expect(isWorkletReady(ctx, '/x.js')).toBe(false);

    const retry = ensureWorklet(ctx, '/x.js');
    expect(retry).not.toBe(failed);
    await retry;
    expect(addModule).toHaveBeenCalledTimes(2);
    expect(isWorkletReady(ctx, '/x.js')).toBe(true);
  });

  it('rejects where there is no AudioWorklet', async () => {
    const ctx = {} as BaseAudioContext;
    await expect(ensureWorklet(ctx, '/x.js')).rejects.toThrow(/AudioWorklet/);
  });
});

describe('createWorkletNode', () => {
  it("makes a wrapped context's node through Tone, for that context", async () => {
    const { ctx } = fakeContext();
    Object.assign(ctx, { _nativeContext: {} });
    await ensureWorklet(ctx, '/x.js');
    const node = createWorkletNode(ctx, 'ma-dynamics', {});
    expect(node).toMatchObject({ wrapped: true, name: 'ma-dynamics' });
    expect(toneNodes).toEqual([{ ctx, name: 'ma-dynamics' }]);
  });

  it("makes a native context's node with the native constructor", () => {
    const made: unknown[] = [];
    vi.stubGlobal(
      'AudioWorkletNode',
      class {
        constructor(...args: unknown[]) {
          made.push(args);
        }
      },
    );
    const { ctx } = fakeContext();
    createWorkletNode(ctx, 'nam-processor', { numberOfInputs: 1 });
    expect(made).toEqual([[ctx, 'nam-processor', { numberOfInputs: 1 }]]);
    expect(toneNodes).toEqual([]);
  });
});

describe('disposeWorkletNode', () => {
  it('tells the processor to stop, closes the port and disconnects', () => {
    const node = {
      port: { postMessage: vi.fn(), close: vi.fn(), onmessage: () => {} },
      disconnect: vi.fn(),
    };
    disposeWorkletNode(node as unknown as AudioWorkletNode);
    expect(node.port.postMessage).toHaveBeenCalledWith({ type: 'dispose' });
    expect(node.port.close).toHaveBeenCalled();
    expect(node.port.onmessage).toBeNull();
    expect(node.disconnect).toHaveBeenCalled();
  });
});
