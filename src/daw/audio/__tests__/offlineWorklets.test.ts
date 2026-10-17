import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeAudioGraph } from './fakeAudioGraph';
import { GuitarPedalChain } from '../GuitarPedalChain';
import { NamWorkletNode } from '../nam/NamWorkletNode';
import { PitchCorrectionNode } from '../pitch-correction/PitchCorrectionNode';

// ── Amp and vocal worklets on a bounce's offline context ───────────────────
// A bounce builds a Guitar/Vocal track's pedals on its OfflineAudioContext.
// That context is suspended until it renders and can't be resumed before
// then, and its AudioWorklet is a scope of its own: the pitch-correction
// processor registered on the live context isn't there.

const worklets = vi.hoisted(() => ({ made: [] as string[] }));

/** A context: offline (startRendering) or live, with a worklet scope. */
function context(offline: boolean) {
  const graph = fakeAudioGraph();
  return Object.assign(graph.ctx, {
    state: 'suspended',
    resume: vi.fn(() => Promise.resolve()),
    audioWorklet: { addModule: vi.fn(() => Promise.resolve()) },
    ...(offline ? { startRendering: () => Promise.resolve() } : {}),
  }) as AudioContext & {
    resume: ReturnType<typeof vi.fn>;
    audioWorklet: { addModule: ReturnType<typeof vi.fn> };
  };
}

beforeEach(() => {
  worklets.made.length = 0;
  vi.stubGlobal(
    'AudioWorkletNode',
    class {
      port = { postMessage: vi.fn(), onmessage: null };
      connect = vi.fn();
      disconnect = vi.fn();
      constructor(_ctx: unknown, name: string) {
        worklets.made.push(name);
      }
      addEventListener() {}
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('worklets on an offline context', () => {
  it("doesn't try to resume an offline context, and does a suspended live one", async () => {
    const offline = context(true);
    await new NamWorkletNode(offline).init();
    await new PitchCorrectionNode(offline).init();
    expect(offline.resume).not.toHaveBeenCalled();
    expect(worklets.made).toEqual([
      'nam-processor',
      'pitch-correction-processor',
    ]);

    const live = context(false);
    await new NamWorkletNode(live).init();
    expect(live.resume).toHaveBeenCalled();
  });

  it('registers the pitch-correction processor on each context it runs on', async () => {
    const live = context(false);
    const offline = context(true);
    await new PitchCorrectionNode(live).init();
    await new PitchCorrectionNode(live).init();
    await new PitchCorrectionNode(offline).init();
    expect(live.audioWorklet.addModule).toHaveBeenCalledTimes(1);
    expect(offline.audioWorklet.addModule).toHaveBeenCalledTimes(1);
  });

  it('lets a bounce wait for a pitch-correction pedal to be wired in', async () => {
    const offline = context(true);
    const chain = new GuitarPedalChain(offline);
    chain.syncChain([
      { type: 'pitch-correction', enabled: true, params: { mix: 100 } },
    ]);
    expect(worklets.made).toEqual([]);
    await chain.whenReady();
    expect(worklets.made).toEqual(['pitch-correction-processor']);
  });
});
