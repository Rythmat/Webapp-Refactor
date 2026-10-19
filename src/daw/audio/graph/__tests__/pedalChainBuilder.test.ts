import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeAudioGraph } from '../../__tests__/fakeAudioGraph';
import { GuitarPedalChain } from '../../GuitarPedalChain';
import type {
  PedalBlockDescriptor,
  PedalProcessor,
} from '../../pedals/PedalProcessor';
import {
  buildPedalChain,
  type NamModelCache,
  type StoredPedalBlock,
} from '../pedalChainBuilder';

// ── Pedal chains offline (milestone 1.11, audio-analysis-06) ───────────────
// An export builds a guitar, bass or vocal track's chain from the store: the
// same pedals in the same order as the panel's syncChain, the amp's NAM model
// loaded before it resolves, and a model that can't load leaves its amp
// passing the signal through.

vi.mock('../../reverbIR', () => ({
  getProcessedIr: vi.fn(() => null),
  ensureProcessedIr: vi.fn(() => Promise.resolve(null)),
}));

const nam = vi.hoisted(() => ({
  fetches: [] as string[],
  fetch: vi.fn(),
  loads: 0,
}));
vi.mock('../../nam/NamModelStore', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../nam/NamModelStore')>()),
  fetchBundledModel: (url: string) => {
    nam.fetches.push(url);
    return nam.fetch(url);
  },
}));
// The worklet behind the amp: it loads whatever model it is handed.
vi.mock('../../nam/NamWorkletNode', () => ({
  NamWorkletNode: class {
    private loaded = false;
    private node = { connect: vi.fn(), disconnect: vi.fn() };
    init() {
      return Promise.resolve();
    }
    loadModel() {
      nam.loads++;
      this.loaded = true;
      return Promise.resolve();
    }
    isLoaded() {
      return this.loaded;
    }
    getNode() {
      return this.node;
    }
    getModelName() {
      return 'model';
    }
    setInputLevel() {}
    setOutputLevel() {}
    dispose() {}
  },
}));

const MODEL = { architecture: 'WaveNet', weights: [] };

/** The pedals' node factories the fake graph lacks. */
function graphForPedals() {
  const graph = fakeAudioGraph();
  const ctx = graph.ctx as unknown as Record<string, unknown>;
  ctx.createWaveShaper = () => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    curve: null,
    oversample: 'none',
  });
  ctx.createOscillator = () => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    frequency: { value: 1 },
    type: 'sine',
    start: vi.fn(),
    stop: vi.fn(),
  });
  return graph;
}

/** The GuitarPedalChain a build made, and the blocks it was synced with. */
function built(): { chain: GuitarPedalChain; blocks: PedalBlockDescriptor[] } {
  const sync = vi.mocked(GuitarPedalChain.prototype.syncChain);
  const at = sync.mock.calls.length - 1;
  return {
    chain: sync.mock.contexts[at] as GuitarPedalChain,
    blocks: sync.mock.calls[at][0],
  };
}

function processorsOf(chain: GuitarPedalChain): PedalProcessor[] {
  return (chain as unknown as { processors: PedalProcessor[] }).processors;
}

const ampEnabled = (proc: PedalProcessor) =>
  (proc as unknown as { enabled: boolean }).enabled;

const block = (
  type: string,
  extra: Partial<StoredPedalBlock> = {},
): StoredPedalBlock => ({ type, enabled: true, params: {}, ...extra });

let cache: NamModelCache;

beforeEach(() => {
  vi.spyOn(GuitarPedalChain.prototype, 'syncChain');
  nam.fetches.length = 0;
  nam.loads = 0;
  nam.fetch.mockReset();
  nam.fetch.mockResolvedValue(MODEL);
  cache = new Map();
});

describe('buildPedalChain', () => {
  it('builds the stored pedals in their order, as the panel syncs them', async () => {
    const graph = graphForPedals();
    const blocks = [
      block('overdrive', { enabled: false, params: { drive: 0.7 } }),
      block('nam-amp', { namModelId: null }),
      block('phaser', { params: { rate: 0.5 } }),
      block('delay', { params: { time: 0.25 } }),
    ];

    const pedals = buildPedalChain(graph.ctx, blocks, {
      bpm: 96,
      modelCache: cache,
    });
    const { chain, blocks: synced } = built();

    expect(synced).toEqual([
      { type: 'overdrive', enabled: false, params: { drive: 0.7 } },
      { type: 'nam-amp', enabled: true, params: {}, namModelId: null },
      // The phaser's synced rate follows the song, as live.
      { type: 'phaser', enabled: true, params: { rate: 0.5, bpm: 96 } },
      { type: 'delay', enabled: true, params: { time: 0.25 } },
    ]);
    const procs = processorsOf(chain);
    expect(procs.map((p) => p.type)).toEqual([
      'overdrive',
      'nam-amp',
      'phaser',
      'delay',
    ]);
    // input → overdrive → … → delay → output.
    expect(pedals.input).toBe(chain.getInputNode());
    expect(pedals.output).toBe(chain.getOutputNode());
    expect(pedals.input.connect).toHaveBeenLastCalledWith(
      procs[0].getInputNode(),
    );
    expect(procs[3].getOutputNode().connect).toHaveBeenCalledWith(
      pedals.output,
    );
    expect(graph.ofKind('delay')[0].delayTime.value).toBe(0.25);
    // An amp with no model plays its classic shaper; nothing is fetched.
    await expect(pedals.ready).resolves.toEqual({ failedModels: [] });
    expect(nam.fetches).toEqual([]);
  });

  it("loads the amp's model before it is ready, once per model", async () => {
    const blocks = [block('nam-amp', { namModelId: 'nam-crunch-plexi' })];

    const first = buildPedalChain(graphForPedals().ctx, blocks, {
      bpm: 120,
      modelCache: cache,
    });
    await expect(first.ready).resolves.toEqual({ failedModels: [] });
    expect(built().chain.isNamLoaded()).toBe(true);

    const second = buildPedalChain(graphForPedals().ctx, blocks, {
      bpm: 120,
      modelCache: cache,
    });
    await second.ready;
    expect(nam.fetches).toEqual(['/daw-assets/nam-models/crunch-plexi.nam']);
    expect(nam.loads).toBe(2);
  });

  it('lets a model that fails to load pass the signal through, and names it', async () => {
    nam.fetch.mockRejectedValue(new Error('Failed to fetch model: 404'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const blocks = [
      block('overdrive'),
      block('nam-amp', { namModelId: 'nam-high-gain' }),
    ];

    const pedals = buildPedalChain(graphForPedals().ctx, blocks, {
      bpm: 120,
      modelCache: cache,
    });
    const report = await pedals.ready;

    expect(report.failedModels).toEqual([
      {
        blockIndex: 1,
        modelId: 'nam-high-gain',
        modelName: "Tiger's Eye",
        reason: 'Failed to fetch model: 404',
      },
    ]);
    const [overdrive, amp] = processorsOf(built().chain);
    expect(ampEnabled(amp)).toBe(false);
    // The other pedals still play.
    expect(ampEnabled(overdrive)).toBe(true);
    // A failed fetch is forgotten, so the next export tries again.
    expect(cache.size).toBe(0);
    warn.mockRestore();
  });

  it('leaves out a model this build does not bundle, without fetching', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const pedals = buildPedalChain(
      graphForPedals().ctx,
      [block('nam-amp', { namModelId: 'from-a-newer-client' })],
      { bpm: 120, modelCache: cache },
    );

    const report = await pedals.ready;
    expect(report.failedModels.map((f) => f.modelId)).toEqual([
      'from-a-newer-client',
    ]);
    expect(nam.fetches).toEqual([]);
    expect(ampEnabled(processorsOf(built().chain)[0])).toBe(false);
    warn.mockRestore();
  });

  it('loads no model for a bypassed amp', async () => {
    const pedals = buildPedalChain(
      graphForPedals().ctx,
      [block('nam-amp', { enabled: false, namModelId: 'nam-high-gain' })],
      { bpm: 120, modelCache: cache },
    );
    await expect(pedals.ready).resolves.toEqual({ failedModels: [] });
    expect(nam.fetches).toEqual([]);
  });

  it('disposes its pedals', () => {
    const pedals = buildPedalChain(graphForPedals().ctx, [block('delay')], {
      bpm: 120,
      modelCache: cache,
    });
    const { chain } = built();
    const dispose = vi.spyOn(chain, 'dispose');
    pedals.dispose();
    expect(dispose).toHaveBeenCalled();
  });
});
