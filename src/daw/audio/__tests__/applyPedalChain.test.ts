import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  applyPedalChain,
  applyStoredPedalChain,
  loadPedalChainModel,
  pedalBlocksOf,
} from '../applyPedalChain';
import { GuitarFxAdapter } from '@/daw/instruments/GuitarFxAdapter';
import { VocalFxAdapter } from '@/daw/instruments/VocalFxAdapter';

// ── A track's stored chain, applied to the adapter that plays it ───────────
// The engine applies it when a track's adapter is built and whenever the
// stored chain changes; the view applies its own edits; a bounce applies it
// offline. All three go through applyPedalChain, which applies a chain once,
// takes the parameter fast path for knob moves, and loads the amp's NAM
// model once per adapter and model, the last one asked for winning.

const nam = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock('../nam/NamModelStore', () => ({
  BUNDLED_MODELS: [
    { id: 'plexi', name: 'Sunstone', url: '/plexi.nam', gainCompensation: 0.7 },
    { id: 'twin', name: 'Quartz', url: '/twin.nam', gainCompensation: 1 },
    { id: 'user-model', name: 'Mine' },
  ],
  fetchBundledModel: nam.fetch,
}));

/**
 * Like the real chain: the parameter fast path holds while the block types
 * stay in order, a sync rebuilds, and the amp keeps its model while it stays
 * in its slot (a sync reuses it), losing it when it moves.
 */
function fakeChain<T extends GuitarFxAdapter | VocalFxAdapter>(adapter: T) {
  const log: unknown[][] = [];
  let types: string[] = [];
  let ampSlot = -1;
  let model: unknown = null;
  // The vocal adapter's chain methods are the guitar adapter's.
  const chain = adapter as GuitarFxAdapter;
  vi.spyOn(chain, 'updateChainParams').mockImplementation((blocks) => {
    const same =
      blocks.length === types.length &&
      blocks.every((b, i) => b.type === types[i]);
    if (same) log.push(['params', blocks]);
    return same;
  });
  vi.spyOn(chain, 'syncChain').mockImplementation((blocks) => {
    log.push(['sync', blocks]);
    types = blocks.map((b) => b.type);
    const slot = types.indexOf('nam-amp');
    if (slot !== ampSlot) model = null;
    ampSlot = slot;
  });
  if (adapter instanceof GuitarFxAdapter) {
    vi.spyOn(chain, 'loadNamModel').mockImplementation(async (m, gain) => {
      log.push(['load', m, gain]);
      if (ampSlot >= 0) model = m;
    });
    vi.spyOn(chain, 'isNamLoaded').mockImplementation(() => model !== null);
    vi.spyOn(chain, 'setAmpSimMode').mockImplementation((mode) => {
      log.push(['mode', mode]);
    });
  }
  return { adapter, log, model: () => model };
}

const amp = (namModelId: string | null, volume = 0.7) => ({
  type: 'nam-amp',
  enabled: true,
  params: { volume },
  namModelId,
});
const drive = (amount = 0.5) => ({
  type: 'overdrive',
  enabled: true,
  params: { drive: amount },
});

/** A model download that finishes when the test says so. */
function deferredModel() {
  let resolve: (m: unknown) => void = () => {};
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

const settle = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  nam.fetch.mockReset();
  nam.fetch.mockImplementation(async (url: string) => ({ url }));
});

describe('pedalBlocksOf', () => {
  it('hands the phaser the project tempo, as the views do', () => {
    const phaser = { type: 'phaser', enabled: true, params: { rate: 0.5 } };
    expect(pedalBlocksOf([phaser, amp('plexi')], 96)).toEqual([
      { ...phaser, params: { rate: 0.5, bpm: 96 }, namModelId: undefined },
      amp('plexi'),
    ]);
  });
});

describe('applyPedalChain', () => {
  it('builds the chain, then loads the amp model into it and switches the amp to it', async () => {
    const { adapter, log } = fakeChain(new GuitarFxAdapter());
    await applyPedalChain(adapter, [drive(), amp('plexi')]);
    expect(nam.fetch).toHaveBeenCalledWith('/plexi.nam');
    expect(log).toEqual([
      ['sync', [drive(), amp('plexi')]],
      ['load', { url: '/plexi.nam' }, 0.7],
      ['mode', 'nam'],
    ]);
  });

  it('applies the same chain once: the view opening on what the engine applied', async () => {
    const { adapter, log } = fakeChain(new GuitarFxAdapter());
    await applyPedalChain(adapter, [drive(), amp('plexi')]);
    log.length = 0;

    // Equal blocks, made afresh (the view builds its own from its state).
    await applyPedalChain(adapter, [drive(), amp('plexi')]);
    await applyPedalChain(
      adapter,
      JSON.parse(JSON.stringify([drive(), amp('plexi')])),
    );

    expect(log).toEqual([]);
    expect(nam.fetch).toHaveBeenCalledTimes(1);
  });

  it('updates the pedals in place for a knob move, keeping the model', async () => {
    const { adapter, log } = fakeChain(new GuitarFxAdapter());
    await applyPedalChain(adapter, [drive(0.5), amp('plexi')]);
    log.length = 0;

    await applyPedalChain(adapter, [drive(0.9), amp('plexi', 0.4)]);

    expect(log).toEqual([['params', [drive(0.9), amp('plexi', 0.4)]]]);
    expect(nam.fetch).toHaveBeenCalledTimes(1);
  });

  it('starts one download while the model is still on its way', async () => {
    const download = deferredModel();
    nam.fetch.mockReturnValue(download.promise);
    const { adapter, log } = fakeChain(new GuitarFxAdapter());

    const first = applyPedalChain(adapter, [amp('plexi')]);
    void applyPedalChain(adapter, [amp('plexi', 0.5)]);
    void applyPedalChain(adapter, [amp('plexi', 0.6)]);
    download.resolve({ url: '/plexi.nam' });
    await first;

    expect(nam.fetch).toHaveBeenCalledTimes(1);
    expect(log.filter(([step]) => step === 'load')).toHaveLength(1);
  });

  it('loads the model again into an amp a moved pedal rebuilt', async () => {
    const { adapter, log, model } = fakeChain(new GuitarFxAdapter());
    await applyPedalChain(adapter, [amp('plexi')]);
    log.length = 0;

    // A pedal put before the amp: the amp moves, a fresh one has no model.
    await applyPedalChain(adapter, [drive(), amp('plexi')]);

    expect(log.map(([step]) => step)).toEqual(['sync', 'load', 'mode']);
    expect(model()).toEqual({ url: '/plexi.nam' });
  });

  it('switches to another model, and the last one asked for wins', async () => {
    const plexi = deferredModel();
    nam.fetch.mockImplementation((url: string) =>
      url === '/plexi.nam' ? plexi.promise : Promise.resolve({ url }),
    );
    const { adapter, log, model } = fakeChain(new GuitarFxAdapter());

    void applyPedalChain(adapter, [amp('plexi')]);
    // The chain names another model while the first one downloads (an undo,
    // a collaborator).
    const twin = applyPedalChain(adapter, [amp('twin')]);
    plexi.resolve({ url: '/plexi.nam' });
    await twin;

    expect(model()).toEqual({ url: '/twin.nam' });
    expect(log.filter(([step]) => step === 'load')).toEqual([
      ['load', { url: '/twin.nam' }, 1],
    ]);
  });

  it("doesn't let a stalled download hold up the next model", async () => {
    nam.fetch.mockImplementation((url: string) =>
      url === '/plexi.nam' ? new Promise(() => {}) : Promise.resolve({ url }),
    );
    const { adapter, model } = fakeChain(new GuitarFxAdapter());

    void applyPedalChain(adapter, [amp('plexi')]);
    await applyPedalChain(adapter, [amp('twin')]);

    expect(model()).toEqual({ url: '/twin.nam' });
  });

  it('downloads a model the view asks for while the chain already loads it once', async () => {
    const plexi = deferredModel();
    nam.fetch.mockReturnValue(plexi.promise);
    const { adapter } = fakeChain(new GuitarFxAdapter());

    void applyPedalChain(adapter, [amp('plexi')]);
    const picked = loadPedalChainModel(adapter, 'plexi');
    plexi.resolve({ url: '/plexi.nam' });

    await expect(picked).resolves.toBe(true);
    expect(nam.fetch).toHaveBeenCalledTimes(1);
  });

  it('puts the amp on its classic model when the chain stops naming one', async () => {
    const { adapter, log } = fakeChain(new GuitarFxAdapter());
    await applyPedalChain(adapter, [amp('plexi')]);
    log.length = 0;

    await applyPedalChain(adapter, [amp(null)]);
    expect(log).toEqual([
      ['params', [amp(null)]],
      ['mode', 'classic'],
    ]);

    // Named again: the model it holds plays at once, without a download.
    log.length = 0;
    await applyPedalChain(adapter, [amp('plexi')]);
    expect(log).toEqual([
      ['params', [amp('plexi')]],
      ['mode', 'nam'],
    ]);
    expect(nam.fetch).toHaveBeenCalledTimes(1);
  });

  it('plays the classic amp for an amp with no model, or one not bundled', async () => {
    for (const id of [null, 'user-model']) {
      const { adapter, log } = fakeChain(new GuitarFxAdapter());
      await applyPedalChain(adapter, [amp(id)]);
      expect(log.map(([step]) => step)).toEqual(['sync']);
    }
    expect(nam.fetch).not.toHaveBeenCalled();
  });

  it('keeps the classic amp when the model fails, and tries again only when asked', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    nam.fetch.mockRejectedValueOnce(new Error('offline'));
    const { adapter, log } = fakeChain(new GuitarFxAdapter());

    await applyPedalChain(adapter, [amp('plexi')]);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(log.map(([step]) => step)).toEqual(['sync']);

    // Knob moves don't download it again.
    await applyPedalChain(adapter, [amp('plexi', 0.3)]);
    expect(nam.fetch).toHaveBeenCalledTimes(1);

    // Picking it again in the view does.
    await expect(loadPedalChainModel(adapter, 'plexi')).resolves.toBe(true);
    expect(nam.fetch).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });

  it("doesn't call off a model the view loads ahead of the chain naming it", async () => {
    const twin = deferredModel();
    nam.fetch.mockReturnValue(twin.promise);
    const { adapter, model } = fakeChain(new GuitarFxAdapter());

    // A new track: the view applies its default amp and loads its first model.
    const loading = loadPedalChainModel(adapter, 'twin');
    void applyPedalChain(adapter, [amp(null)]);
    void applyPedalChain(adapter, [amp(null, 0.5)]);
    twin.resolve({ url: '/twin.nam' });

    await expect(loading).resolves.toBe(true);
    expect(model()).toEqual({ url: '/twin.nam' });
  });

  it("applies a vocal chain's pedals, with no amp model to load", async () => {
    const { adapter, log } = fakeChain(new VocalFxAdapter());
    const pitch = {
      type: 'pitch-correction',
      enabled: true,
      params: { mix: 100 },
    };
    await applyPedalChain(adapter, [pitch]);
    await applyPedalChain(adapter, [pitch]);
    expect(log).toEqual([['sync', [pitch]]]);
    expect(nam.fetch).not.toHaveBeenCalled();
  });

  it('keeps each adapter to itself: a rebuilt adapter gets the chain and model again', async () => {
    const first = fakeChain(new GuitarFxAdapter());
    const rebuilt = fakeChain(new GuitarFxAdapter());
    await applyPedalChain(first.adapter, [amp('plexi')]);
    await applyPedalChain(rebuilt.adapter, [amp('plexi')]);
    expect(rebuilt.log.map(([step]) => step)).toEqual(['sync', 'load', 'mode']);
  });
});

describe('applyStoredPedalChain', () => {
  it("applies a guitar track's guitar chain and a vocal track's vocal chain", async () => {
    const guitar = fakeChain(new GuitarFxAdapter());
    const vocal = fakeChain(new VocalFxAdapter());
    const reverb = { type: 'reverb', enabled: true, params: { mix: 0.3 } };
    const track = { guitarChain: [amp('plexi')], vocalChain: [reverb] };

    await applyStoredPedalChain(guitar.adapter, track, 120);
    await applyStoredPedalChain(vocal.adapter, track, 120);

    expect(guitar.log[0]).toEqual(['sync', [amp('plexi')]]);
    expect(vocal.log).toEqual([
      ['sync', [{ ...reverb, namModelId: undefined }]],
    ]);
  });

  it('leaves the adapter as it is for a track that stores no chain', async () => {
    const { adapter, log } = fakeChain(new GuitarFxAdapter());
    await applyPedalChain(adapter, [amp('plexi')]);
    log.length = 0;

    await applyStoredPedalChain(adapter, { guitarChain: undefined }, 120);
    await settle();

    expect(log).toEqual([]);
  });
});
