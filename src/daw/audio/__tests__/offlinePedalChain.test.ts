import { beforeEach, describe, expect, it, vi } from 'vitest';
import { applyOfflinePedalChain } from '../offlinePedalChain';
import { GuitarFxAdapter } from '@/daw/instruments/GuitarFxAdapter';
import { VocalFxAdapter } from '@/daw/instruments/VocalFxAdapter';

// ── A take's amp and pedals in the bounce ──────────────────────────────────
// Live, the engine applies a track's stored chain to its adapter and loads
// the amp's NAM model (applyPedalChain); a bounce applies the same chain the
// same way to the adapter it built offline, so recorded takes no longer
// bounce dry.

const nam = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock('../nam/NamModelStore', () => ({
  BUNDLED_MODELS: [
    {
      id: 'nam-plexi',
      url: '/daw-assets/nam-models/plexi.nam',
      gainCompensation: 0.7,
    },
    { id: 'user-model' },
  ],
  fetchBundledModel: nam.fetch,
}));

vi.mock('@/daw/instruments/GuitarFxAdapter', () => ({
  GuitarFxAdapter: class {
    log: unknown[][] = [];
    loaded = false;
    // A fresh chain has no pedals, so the parameter fast path fails.
    updateChainParams = vi.fn(() => false);
    syncChain = vi.fn((...a: unknown[]) => this.log.push(['sync', ...a]));
    loadNamModel = vi.fn(async (...a: unknown[]) => {
      this.log.push(['load', ...a]);
      this.loaded = true;
    });
    isNamLoaded = vi.fn(() => this.loaded);
    setAmpSimMode = vi.fn((...a: unknown[]) => this.log.push(['mode', ...a]));
    whenChainReady = vi.fn(async () => {
      this.log.push(['ready']);
    });
  },
}));
vi.mock('@/daw/instruments/VocalFxAdapter', () => ({
  VocalFxAdapter: class {
    updateChainParams = vi.fn(() => false);
    syncChain = vi.fn();
    whenChainReady = vi.fn(async () => {});
  },
}));

type GuitarLog = { log: unknown[][] } & Record<
  'syncChain' | 'loadNamModel' | 'setAmpSimMode' | 'whenChainReady',
  ReturnType<typeof vi.fn>
>;

const amp = (namModelId: string | null) => ({
  type: 'nam-amp',
  enabled: true,
  params: { volume: 0.7 },
  namModelId,
});
const phaser = { type: 'phaser', enabled: true, params: { rate: 0.5 } };

const guitarTrack = (guitarChain?: unknown[]) => ({
  guitarChain: guitarChain as never,
});

beforeEach(() => {
  nam.fetch.mockReset();
  nam.fetch.mockResolvedValue({ architecture: 'WaveNet' });
});

describe('applyOfflinePedalChain', () => {
  it("applies a guitar's stored chain, then its amp model, then waits for it", async () => {
    const adapter = new GuitarFxAdapter() as unknown as GuitarLog;
    await applyOfflinePedalChain(
      adapter as never,
      guitarTrack([phaser, amp('nam-plexi')]),
      120,
    );
    expect(nam.fetch).toHaveBeenCalledWith('/daw-assets/nam-models/plexi.nam');
    expect(adapter.log).toEqual([
      [
        'sync',
        [
          { ...phaser, params: { rate: 0.5, bpm: 120 }, namModelId: undefined },
          amp('nam-plexi'),
        ],
      ],
      ['load', { architecture: 'WaveNet' }, 0.7],
      ['mode', 'nam'],
      ['ready'],
    ]);
  });

  it('keeps the classic amp when the model fails to load', async () => {
    nam.fetch.mockRejectedValue(new Error('offline'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const adapter = new GuitarFxAdapter() as unknown as GuitarLog;
    await applyOfflinePedalChain(
      adapter as never,
      guitarTrack([amp('nam-plexi')]),
      120,
    );
    expect(adapter.setAmpSimMode).not.toHaveBeenCalled();
    expect(adapter.whenChainReady).toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('loads no model for an amp without one (or one not bundled)', async () => {
    for (const id of [null, 'user-model']) {
      const adapter = new GuitarFxAdapter() as unknown as GuitarLog;
      await applyOfflinePedalChain(
        adapter as never,
        guitarTrack([amp(id)]),
        120,
      );
      expect(adapter.syncChain).toHaveBeenCalled();
      expect(adapter.loadNamModel).not.toHaveBeenCalled();
    }
    expect(nam.fetch).not.toHaveBeenCalled();
  });

  it('leaves a track with no stored chain on the empty chain, as live', async () => {
    const adapter = new GuitarFxAdapter() as unknown as GuitarLog;
    await applyOfflinePedalChain(adapter as never, guitarTrack(undefined), 120);
    expect(adapter.syncChain).not.toHaveBeenCalled();
  });

  it("applies a vocal track's vocal chain", async () => {
    const adapter = new VocalFxAdapter() as unknown as GuitarLog;
    const pitch = {
      type: 'pitch-correction',
      enabled: true,
      params: { mix: 100 },
    };
    await applyOfflinePedalChain(
      adapter as never,
      { guitarChain: undefined, vocalChain: [pitch] },
      120,
    );
    expect(adapter.syncChain).toHaveBeenCalledWith([
      { ...pitch, namModelId: undefined },
    ]);
    expect(adapter.whenChainReady).toHaveBeenCalled();
    expect(nam.fetch).not.toHaveBeenCalled();
  });
});
