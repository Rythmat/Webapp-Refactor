import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ── Fakes: the Studio adapter, the shared context and the mixer ────────────

const fakes = vi.hoisted(() => {
  // The adapter's channel stage: what the rig trims.
  const pitchNode = { name: 'clean input', gain: { setTargetAtTime: vi.fn() } };
  const pedalInput = { name: 'pedal input' };
  const chordAnalyser = { name: 'chord analyser' };

  class FakeGuitarFxAdapter {
    static made: FakeGuitarFxAdapter[] = [];
    static initError: Error | null = null;
    hasInput = true;
    init = vi.fn(async () => {
      if (FakeGuitarFxAdapter.initError) throw FakeGuitarFxAdapter.initError;
    });
    setMonitoring = vi.fn();
    syncChain = vi.fn();
    loadNamModel = vi.fn(async () => {});
    setAmpSimMode = vi.fn();
    setDevice = vi.fn(async () => {});
    setChannelConfig = vi.fn();
    getChordAnalyserNode = vi.fn(() => chordAnalyser);
    getPitchDetectSourceNode = vi.fn(() => (this.hasInput ? pitchNode : null));
    getInputLevel = vi.fn(() => 0.25);
    getNativePedalInputNode = vi.fn(() => pedalInput);
    dispose = vi.fn();
    constructor() {
      FakeGuitarFxAdapter.made.push(this);
    }
  }

  const context = { currentTime: 4, close: vi.fn() };
  const channels: {
    gain: { value: number; setTargetAtTime: ReturnType<typeof vi.fn> };
    disconnect: ReturnType<typeof vi.fn>;
  }[] = [];
  const mixer = {
    channel: vi.fn((_bus: string, volume: number) => {
      const channel = {
        gain: { value: volume, setTargetAtTime: vi.fn() },
        disconnect: vi.fn(),
      };
      channels.push(channel);
      return channel;
    }),
  };
  return {
    FakeGuitarFxAdapter,
    context,
    channels,
    mixer,
    pitchNode,
    pedalInput,
    chordAnalyser,
    fetchBundledModel: vi.fn<(url: string) => Promise<{ url: string }>>(),
    getAudioInputs: vi.fn<() => Promise<{ id: string }[]>>(),
  };
});

vi.mock('@/daw/instruments/GuitarFxAdapter', () => ({
  GuitarFxAdapter: fakes.FakeGuitarFxAdapter,
}));
vi.mock('@/audio/core/AudioContextOwner', () => ({
  audioContextOwner: { get: () => fakes.context },
}));
vi.mock('@/audio/core/Mixer', () => ({ mixer: fakes.mixer }));
vi.mock('@/daw/audio/nam/NamModelStore', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/daw/audio/nam/NamModelStore')>()),
  fetchBundledModel: fakes.fetchBundledModel,
}));
vi.mock('@/daw/midi/AudioInputEnumerator', () => ({
  getAudioInputs: fakes.getAudioInputs,
}));
// The lesson volume store reaches the piano sampler.
vi.mock('@/audio/pianoSampler', () => ({ setPianoSamplerVolume: vi.fn() }));

type Rig = typeof import('../GuitarAmpRig');
type Prefs = typeof import('../guitarTonePrefs');
type Volume = typeof import('../../lessonVolumeStore');
let rigs: Rig;
let prefs: Prefs;
let volume: Volume;

const STUDIO_AMP = {
  inputLevel: 0.5,
  bass: 0.5,
  mid: 0.5,
  treble: 0.5,
  presence: 0.5,
  outputLevel: 0.5,
  volume: 0.7,
};
const QUARTZ_URL = '/daw-assets/nam-models/clean-twin.nam';

const adapter = () => fakes.FakeGuitarFxAdapter.made.at(-1)!;
const lastChain = () => adapter().syncChain.mock.calls.at(-1)?.[0];
/** Let queued model loads run. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();
  fakes.FakeGuitarFxAdapter.made = [];
  fakes.FakeGuitarFxAdapter.initError = null;
  fakes.channels.length = 0;
  fakes.fetchBundledModel
    .mockReset()
    .mockImplementation(async (url) => ({ url }));
  fakes.getAudioInputs.mockReset().mockResolvedValue([]);
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
  });
  rigs = await import('../GuitarAmpRig');
  prefs = await import('../guitarTonePrefs');
  volume = await import('../../lessonVolumeStore');
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('acquireGuitarAmpRig', () => {
  it('builds one rig on the shared context, into the lesson output at the lesson volume', async () => {
    volume.setLessonVolume(0.6);
    const [a, b] = await Promise.all([
      rigs.acquireGuitarAmpRig(),
      rigs.acquireGuitarAmpRig(),
    ]);
    expect(a).toBe(b);
    expect(a.context).toBe(fakes.context);
    expect(fakes.FakeGuitarFxAdapter.made).toHaveLength(1);
    expect(fakes.mixer.channel).toHaveBeenCalledWith('instruments', 0.6);
    expect(adapter().init).toHaveBeenCalledWith(
      fakes.context,
      fakes.channels[0],
    );
    // The lesson preloads it on mount: that must not ask for the microphone.
    expect(adapter().setDevice).not.toHaveBeenCalled();
    expect(fakes.getAudioInputs).not.toHaveBeenCalled();
  });

  it('starts with monitoring off and the Studio amp bypassed until Quartz loads', async () => {
    let finishFetch!: (model: { url: string }) => void;
    fakes.fetchBundledModel.mockReturnValueOnce(
      new Promise((resolve) => (finishFetch = resolve)),
    );
    await rigs.acquireGuitarAmpRig();

    expect(adapter().setMonitoring).toHaveBeenCalledWith(false);
    expect(adapter().syncChain).toHaveBeenCalledTimes(1);
    expect(lastChain()).toEqual([
      {
        type: 'nam-amp',
        enabled: false,
        params: STUDIO_AMP,
        namModelId: null,
      },
    ]);
    expect(fakes.fetchBundledModel).toHaveBeenCalledWith(QUARTZ_URL);

    finishFetch({ url: QUARTZ_URL });
    await settle();
    expect(adapter().loadNamModel).toHaveBeenCalledWith({ url: QUARTZ_URL }, 1);
    expect(adapter().setAmpSimMode).toHaveBeenCalledWith('nam');
    expect(lastChain()).toEqual([
      {
        type: 'nam-amp',
        enabled: true,
        params: STUDIO_AMP,
        namModelId: 'nam-clean-twin',
      },
    ]);
    expect(adapter().setMonitoring).not.toHaveBeenCalledWith(true);
  });

  it('can be retried after a failed build', async () => {
    fakes.FakeGuitarFxAdapter.initError = new Error('no worklet');
    await expect(rigs.acquireGuitarAmpRig()).rejects.toThrow('no worklet');
    expect(adapter().dispose).toHaveBeenCalled();
    expect(fakes.channels[0].disconnect).toHaveBeenCalled();
    // The failed acquire holds nothing to release.
    rigs.releaseGuitarAmpRig();

    fakes.FakeGuitarFxAdapter.initError = null;
    await rigs.acquireGuitarAmpRig();
    expect(fakes.FakeGuitarFxAdapter.made).toHaveLength(2);
    expect(adapter().dispose).not.toHaveBeenCalled();
  });
});

describe('releaseGuitarAmpRig', () => {
  it('tears the rig down on the last release, never closing the context', async () => {
    await rigs.acquireGuitarAmpRig();
    await rigs.acquireGuitarAmpRig();
    const first = adapter();
    const output = fakes.channels[0];

    rigs.releaseGuitarAmpRig();
    await settle();
    expect(first.dispose).not.toHaveBeenCalled();

    rigs.releaseGuitarAmpRig();
    await settle();
    expect(first.dispose).toHaveBeenCalled();
    expect(output.disconnect).toHaveBeenCalled();
    expect(fakes.context.close).not.toHaveBeenCalled();

    // Unsubscribed: the dial and the prefs no longer reach it.
    volume.setLessonVolume(0.2);
    prefs.setGuitarTonePrefs({ ampModelId: 'nam-vox-ac15' });
    await settle();
    expect(output.gain.setTargetAtTime).not.toHaveBeenCalled();
    expect(fakes.fetchBundledModel).not.toHaveBeenCalledWith(
      '/daw-assets/nam-models/vox-ac15.nam',
    );

    await rigs.acquireGuitarAmpRig();
    expect(fakes.FakeGuitarFxAdapter.made).toHaveLength(2);
  });
});

describe('the amp', () => {
  it('loads a Studio amp with its gain compensation, and null bypasses it', async () => {
    const rig = await rigs.acquireGuitarAmpRig();
    await settle();

    await rig.setAmpModel('nam-vox-ac15'); // Fire Opal, crunch
    expect(fakes.fetchBundledModel).toHaveBeenLastCalledWith(
      '/daw-assets/nam-models/vox-ac15.nam',
    );
    expect(adapter().loadNamModel).toHaveBeenLastCalledWith(
      { url: '/daw-assets/nam-models/vox-ac15.nam' },
      0.7,
    );
    expect(lastChain()[0]).toMatchObject({
      enabled: true,
      namModelId: 'nam-vox-ac15',
    });

    await rig.setAmpModel(null);
    expect(lastChain()[0]).toMatchObject({ enabled: false });

    // Back on: the model is still in, so nothing reloads.
    const loads = adapter().loadNamModel.mock.calls.length;
    await rig.setAmpModel('nam-vox-ac15');
    expect(adapter().loadNamModel).toHaveBeenCalledTimes(loads);
    expect(lastChain()[0]).toMatchObject({ enabled: true });
  });

  it('loads only the last amp asked for', async () => {
    const pending = new Map<string, (model: { url: string }) => void>();
    fakes.fetchBundledModel.mockImplementation(
      (url: string) =>
        new Promise((resolve) => pending.set(url, () => resolve({ url }))),
    );
    const rig = await rigs.acquireGuitarAmpRig(); // Quartz starts loading
    const vox = rig.setAmpModel('nam-vox-ac15');
    const done = rig.setAmpModel('nam-high-gain');

    pending.get(QUARTZ_URL)!({ url: QUARTZ_URL });
    await settle();
    pending.get('/daw-assets/nam-models/high-gain.nam')!({
      url: '/daw-assets/nam-models/high-gain.nam',
    });
    await Promise.all([vox, done]);

    expect(adapter().loadNamModel).toHaveBeenCalledTimes(1);
    expect(adapter().loadNamModel).toHaveBeenCalledWith(
      { url: '/daw-assets/nam-models/high-gain.nam' },
      0.5,
    );
    expect(pending.has('/daw-assets/nam-models/vox-ac15.nam')).toBe(false);
    expect(lastChain()[0]).toMatchObject({ namModelId: 'nam-high-gain' });
  });

  it('follows the amp chosen in the tone prefs', async () => {
    await rigs.acquireGuitarAmpRig();
    await settle();
    prefs.setGuitarTonePrefs({ ampModelId: 'nam-marshall-jcm800' });
    await settle();
    expect(adapter().loadNamModel).toHaveBeenLastCalledWith(
      { url: '/daw-assets/nam-models/marshall-jcm800.nam' },
      0.7,
    );
    expect(lastChain()[0]).toMatchObject({ namModelId: 'nam-marshall-jcm800' });
  });

  it('stays bypassed when a model fails to load, and tries again when asked', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    fakes.fetchBundledModel.mockRejectedValueOnce(new Error('offline'));
    const rig = await rigs.acquireGuitarAmpRig();
    await settle();
    expect(warn).toHaveBeenCalled();
    expect(lastChain()[0]).toMatchObject({ enabled: false });

    await rig.setAmpModel('nam-clean-twin');
    expect(adapter().loadNamModel).toHaveBeenCalledWith({ url: QUARTZ_URL }, 1);
    expect(lastChain()[0]).toMatchObject({ enabled: true });
    warn.mockRestore();
  });

  it('refuses an amp the Studio does not have for guitar', async () => {
    const rig = await rigs.acquireGuitarAmpRig();
    await expect(rig.setAmpModel('nam-ampeg-svt')).rejects.toThrow(
      'Unknown guitar amp',
    );
  });
});

describe('input', () => {
  it('hands device, channel, monitoring and taps to the Studio adapter', async () => {
    const rig = await rigs.acquireGuitarAmpRig();
    await rig.setDevice('interface-1', 4);
    expect(adapter().setDevice).toHaveBeenCalledWith('interface-1', 4);

    rig.setChannel(2);
    expect(adapter().setChannelConfig).toHaveBeenCalledWith({
      mode: 'mono',
      channel: 2,
    });
    rig.setMonitoring(true);
    expect(adapter().setMonitoring).toHaveBeenLastCalledWith(true);

    expect(rig.getChordAnalyserNode()).toBe(fakes.chordAnalyser);
    expect(rig.getPitchDetectSourceNode()).toBe(fakes.pitchNode);
    expect(rig.getInputLevel()).toBe(0.25);
    expect(rig.getPlaybackInputNode()).toBe(fakes.pedalInput);
  });

  it('trims the input stage, and trims a newly opened device the same', async () => {
    const rig = await rigs.acquireGuitarAmpRig();
    rig.setInputTrim(6);
    const trim = fakes.pitchNode.gain.setTargetAtTime;
    expect(trim).toHaveBeenLastCalledWith(10 ** (6 / 20), 4, 0.02);
    trim.mockClear();
    await rig.setDevice('interface-2');
    expect(trim).toHaveBeenLastCalledWith(10 ** (6 / 20), 4, 0.02);
    rig.setInputTrim(Number.NaN);
    expect(trim).toHaveBeenLastCalledWith(1, 4, 0.02);
  });

  it("opens the browser's default input for a null device", async () => {
    const rig = await rigs.acquireGuitarAmpRig();
    fakes.getAudioInputs.mockResolvedValueOnce([
      { id: 'usb-mic' },
      { id: 'default' },
    ]);
    await rig.setDevice(null);
    expect(adapter().setDevice).toHaveBeenCalledWith('default', undefined);

    fakes.getAudioInputs.mockResolvedValueOnce([{ id: 'usb-mic' }]);
    await rig.setDevice(null);
    expect(adapter().setDevice).toHaveBeenLastCalledWith('usb-mic', undefined);

    fakes.getAudioInputs.mockResolvedValueOnce([]);
    await expect(rig.setDevice(null)).rejects.toThrow('No audio input found');
  });

  it('reports an input that fails to open, and forgets it so a retry asks again', async () => {
    const rig = await rigs.acquireGuitarAmpRig();
    adapter().hasInput = false;
    await expect(rig.setDevice('interface-1')).rejects.toThrow(
      'Could not open the audio input',
    );
    expect(adapter().setDevice).toHaveBeenLastCalledWith(null);
  });
});

describe('lesson volume', () => {
  it('follows the dial, linear like the piano sampler', async () => {
    await rigs.acquireGuitarAmpRig();
    volume.setLessonVolume(0.3);
    expect(fakes.channels[0].gain.setTargetAtTime).toHaveBeenLastCalledWith(
      0.3,
      fakes.context.currentTime,
      0.01,
    );
  });
});
