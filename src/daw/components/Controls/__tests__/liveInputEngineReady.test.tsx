// @vitest-environment jsdom
import { StrictMode } from 'react';
import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  beforeEach,
  afterEach,
} from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';

// The engine's adapter registry and its engine-ready notification, driven by
// the tests. The real engine starts only on the first click or key press,
// which after a reload is always after these views have mounted.
const engine = vi.hoisted(() => {
  const registry = new Map<
    string,
    { instrument: unknown; trackEngine: { getInstrument: () => unknown } }
  >();
  const listeners = new Set<() => void>();
  return {
    registry,
    listeners,
    /**
     * An instrument finished its init: `adapter` for `trackId`, or, with no
     * arguments, an instrument on some other track.
     */
    ready(trackId?: string, adapter?: unknown) {
      if (trackId) {
        registry.set(trackId, {
          instrument: adapter,
          trackEngine: { getInstrument: () => adapter },
        });
      }
      listeners.forEach((cb) => cb());
    },
  };
});

vi.mock('@/daw/hooks/usePlaybackEngine', () => ({
  getTrackAudioState: (trackId: string) => engine.registry.get(trackId),
  subscribeEngineReady: (cb: () => void) => {
    engine.listeners.add(cb);
    return () => {
      engine.listeners.delete(cb);
    };
  },
}));

const inputs = vi.hoisted(() => ({
  devices: [] as { id: string; label: string; groupId: string }[],
}));
vi.mock('@/daw/midi/AudioInputEnumerator', () => ({
  getAudioInputs: () => Promise.resolve(inputs.devices),
  probeDeviceChannelCount: () => Promise.resolve(2),
}));

const nam = vi.hoisted(() => ({ fetchBundledModel: vi.fn() }));
vi.mock('@/daw/audio/nam/NamModelStore', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/daw/audio/nam/NamModelStore')>()),
  fetchBundledModel: nam.fetchBundledModel,
}));

// The tuner opens its own audio, so it is replaced by a switch the tests flip.
const tuner = vi.hoisted(() => ({
  setActive: (() => {}) as (active: boolean) => void,
}));
vi.mock('../TunerDisplay', () => ({
  TunerDisplay: ({
    onActiveChange,
  }: {
    onActiveChange: (active: boolean) => void;
  }) => {
    tuner.setActive = onActiveChange;
    return null;
  },
}));
vi.mock('@/daw/hooks/usePitchInfo', () => ({
  usePitchInfo: () => ({ detected: 0, corrected: 0 }),
}));

const media = vi.hoisted(() => ({ getUserMedia: vi.fn() }));

import { useStore } from '@/daw/store';
import type { AudioInputChannel } from '@/daw/store/tracksSlice';
import { GuitarFxAdapter } from '@/daw/instruments/GuitarFxAdapter';
import { VocalFxAdapter } from '@/daw/instruments/VocalFxAdapter';
import { GuitarBassView } from '../GuitarBassView';
import { VocalView } from '../VocalView';

const INTERFACE = { id: 'iface-1', label: 'Interface', groupId: 'g1' };
const INPUT_1: AudioInputChannel = { mode: 'mono', channel: 0 };
const INPUT_2: AudioInputChannel = { mode: 'mono', channel: 1 };

/** Lets pending promises (device list, model download) settle. */
const settle = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

const trackById = (id: string) =>
  useStore.getState().tracks.find((t) => t.id === id);

/** Opens the input device menu and picks the device with this label. */
function pickDevice(label: string) {
  fireEvent.click(screen.getByText(label));
  const items = screen.getAllByText(label);
  fireEvent.click(items[items.length - 1]);
}

function fakeVocalAdapter() {
  const adapter = new VocalFxAdapter();
  return {
    adapter,
    setDevice: vi.spyOn(adapter, 'setDevice').mockResolvedValue(),
    setChannelConfig: vi
      .spyOn(adapter, 'setChannelConfig')
      .mockImplementation(() => {}),
    syncChain: vi.spyOn(adapter, 'syncChain').mockImplementation(() => {}),
    // A freshly built chain has no processors, so the param fast path fails.
    updateChainParams: vi
      .spyOn(adapter, 'updateChainParams')
      .mockReturnValue(false),
  };
}

function fakeGuitarAdapter() {
  const adapter = new GuitarFxAdapter();
  // Like the real chain, a sync keeps the amp, and the model in it, while the
  // amp stays in its slot, and builds a fresh amp with no model when it moves.
  let ampSlot = -1;
  let modelLoaded = false;
  return {
    adapter,
    setDevice: vi.spyOn(adapter, 'setDevice').mockResolvedValue(),
    setChannelConfig: vi
      .spyOn(adapter, 'setChannelConfig')
      .mockImplementation(() => {}),
    setMonitoring: vi.spyOn(adapter, 'setMonitoring'),
    syncChain: vi.spyOn(adapter, 'syncChain').mockImplementation((blocks) => {
      const slot = blocks.findIndex((b) => b.type === 'nam-amp');
      if (slot !== ampSlot) modelLoaded = false;
      ampSlot = slot;
    }),
    loadNamModel: vi
      .spyOn(adapter, 'loadNamModel')
      .mockImplementation(async () => {
        if (ampSlot >= 0) modelLoaded = true;
      }),
    setAmpSimMode: vi
      .spyOn(adapter, 'setAmpSimMode')
      .mockImplementation(() => {}),
    isNamLoaded: vi
      .spyOn(adapter, 'isNamLoaded')
      .mockImplementation(() => modelLoaded),
  };
}

/** Just enough of an AudioContext for an adapter's init and its input stage. */
function fakeAudioContext() {
  const node = () => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    getFloatTimeDomainData: vi.fn(),
    gain: { value: 1 },
    offset: { value: 0 },
    channelCount: 2,
    channelCountMode: 'max',
    channelInterpretation: 'speakers',
    fftSize: 2048,
    smoothingTimeConstant: 0.8,
  });
  return {
    state: 'running',
    createGain: node,
    createAnalyser: node,
    createConstantSource: node,
    createMediaStreamSource: node,
    createChannelMerger: node,
    createChannelSplitter: vi.fn(node),
  };
}

/** A real guitar adapter on a fake context, so its input stage is real. */
async function realGuitarAdapter() {
  const ctx = fakeAudioContext();
  const adapter = new GuitarFxAdapter();
  await adapter.init(
    ctx as unknown as AudioContext,
    ctx.createGain() as unknown as AudioNode,
  );
  // The pedals and the amp are not under test here.
  vi.spyOn(adapter, 'syncChain').mockImplementation(() => {});
  return { adapter, ctx };
}

function fakeStream() {
  const track = { addEventListener: vi.fn(), stop: vi.fn() };
  return {
    getAudioTracks: () => [track],
    getTracks: () => [track],
  } as unknown as MediaStream;
}

/**
 * A vocal track as a reload brings it back: its saved chain, and no channel
 * unless one is given (older saves and cloud opens have none).
 */
function reloadedVocalTrack(channel: AudioInputChannel | null = null) {
  const id = useStore.getState().addTrack('audio', 'vocal-fx', 'Vocals');
  useStore.getState().updateTrack(id, {
    audioInputChannel: channel,
    vocalChain: [{ type: 'reverb', enabled: true, params: { mix: 0.3 } }],
  });
  return id;
}

/**
 * A guitar track as a reload brings it back: its saved amp, and no channel
 * unless one is given (older saves and cloud opens have none).
 */
function reloadedGuitarTrack(channel: AudioInputChannel | null = null) {
  const id = useStore.getState().addTrack('audio', 'guitar-fx', 'Guitar');
  useStore.getState().updateTrack(id, {
    audioInputChannel: channel,
    guitarChain: [
      {
        type: 'nam-amp',
        enabled: true,
        params: { inputLevel: 0.5, volume: 0.7 },
        namModelId: 'nam-vox-ac15',
      },
    ],
  });
  return id;
}

beforeAll(() => {
  // jsdom has no media devices: the views listen for device changes, and the
  // real adapter opens the input.
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: {
      addEventListener() {},
      removeEventListener() {},
      getUserMedia: media.getUserMedia,
    },
  });
});

beforeEach(() => {
  engine.registry.clear();
  inputs.devices = [INTERFACE];
  // A model download that never finishes, unless a test says otherwise.
  nam.fetchBundledModel.mockReset().mockReturnValue(new Promise(() => {}));
  media.getUserMedia.mockReset();
  useStore.setState({
    tracks: [],
    selectedTrackId: null,
    inputDeviceId: INTERFACE.id,
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('VocalView after a reload (live-input-02, live-input-03)', () => {
  it('connects the input on channel 1 and applies the saved chain once the engine is ready', async () => {
    const id = reloadedVocalTrack();
    const fake = fakeVocalAdapter();
    render(<VocalView trackId={id} />);
    await settle();
    expect(fake.setDevice).not.toHaveBeenCalled();

    act(() => engine.ready(id, fake.adapter));

    expect(fake.setChannelConfig).toHaveBeenLastCalledWith(INPUT_1);
    expect(fake.setDevice).toHaveBeenCalledWith(INTERFACE.id);
    expect(fake.setDevice).not.toHaveBeenCalledWith(null);
    expect(fake.syncChain).toHaveBeenCalledWith([
      { type: 'reverb', enabled: true, params: { mix: 0.3 } },
    ]);
  });

  it('keeps a saved channel', () => {
    const stereo: AudioInputChannel = { mode: 'stereo', left: 0, right: 1 };
    const id = reloadedVocalTrack(stereo);
    const fake = fakeVocalAdapter();
    render(<VocalView trackId={id} />);

    act(() => engine.ready(id, fake.adapter));

    expect(fake.setChannelConfig).toHaveBeenLastCalledWith(stereo);
  });

  it('re-applies nothing when another track finishes loading', () => {
    const id = reloadedVocalTrack();
    const fake = fakeVocalAdapter();
    render(<VocalView trackId={id} />);
    act(() => engine.ready(id, fake.adapter));
    vi.clearAllMocks();

    act(() => {
      engine.ready();
      engine.ready('other-track', new VocalFxAdapter());
    });

    expect(fake.setDevice).not.toHaveBeenCalled();
    expect(fake.setChannelConfig).not.toHaveBeenCalled();
    expect(fake.updateChainParams).not.toHaveBeenCalled();
    expect(fake.syncChain).not.toHaveBeenCalled();
  });

  it('keeps the newest channel when the device finishes opening late', async () => {
    const id = reloadedVocalTrack(INPUT_1);
    const fake = fakeVocalAdapter();
    let finishOpening = () => {};
    fake.setDevice.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishOpening = resolve;
        }),
    );
    engine.ready(id, fake.adapter);
    render(<VocalView trackId={id} />);

    // Input 2 is picked while input 1's device is still opening.
    act(() =>
      useStore.getState().updateTrack(id, { audioInputChannel: INPUT_2 }),
    );
    await act(async () => finishOpening());

    expect(fake.setChannelConfig).toHaveBeenLastCalledWith(INPUT_2);
  });

  it('still drops the input when no device is selected', async () => {
    inputs.devices = [];
    useStore.setState({ inputDeviceId: null });
    const id = reloadedVocalTrack();
    const fake = fakeVocalAdapter();
    render(<VocalView trackId={id} />);
    await settle();

    act(() => engine.ready(id, fake.adapter));

    expect(fake.setDevice).toHaveBeenCalledWith(null);
    expect(fake.setChannelConfig).not.toHaveBeenCalled();
  });

  it('applies the input again when the device in use is picked again', async () => {
    const id = reloadedVocalTrack(INPUT_1);
    const fake = fakeVocalAdapter();
    engine.ready(id, fake.adapter);
    render(<VocalView trackId={id} />);
    await settle();
    expect(fake.setDevice).toHaveBeenCalledTimes(1);

    // The pick leaves the store as it was: same device, same channel.
    pickDevice(INTERFACE.label);
    await settle();

    expect(fake.setDevice).toHaveBeenCalledTimes(2);
    expect(fake.setDevice).toHaveBeenLastCalledWith(INTERFACE.id);
  });

  it('marks input 1 in the channel menu for a track with no saved channel', async () => {
    const id = reloadedVocalTrack();
    render(<VocalView trackId={id} />);
    await settle();

    fireEvent.click(screen.getByText('1'));

    const [, input1] = screen.getAllByText('1');
    expect(input1.style.color).toBe('var(--color-accent)');
    expect(screen.getByText('2').style.color).toBe('var(--color-text)');
  });

  it('logs an input that fails to open instead of leaving it unhandled', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const id = reloadedVocalTrack();
    const fake = fakeVocalAdapter();
    const failure = new Error('resume failed');
    fake.setDevice.mockRejectedValueOnce(failure);
    engine.ready(id, fake.adapter);
    render(<VocalView trackId={id} />);
    await settle();

    expect(warn).toHaveBeenCalledWith(
      '[LiveInput] Could not open input:',
      failure,
    );
  });
});

describe('GuitarBassView after a reload (live-input-02, live-input-03)', () => {
  it('connects the input, builds the chain, then restores the saved amp model once', async () => {
    const model = { name: 'AC15' };
    nam.fetchBundledModel.mockResolvedValue(model);
    const id = reloadedGuitarTrack();
    const fake = fakeGuitarAdapter();
    render(<GuitarBassView trackId={id} instrument="guitar-fx" />);
    await settle();
    expect(fake.syncChain).not.toHaveBeenCalled();
    expect(nam.fetchBundledModel).not.toHaveBeenCalled();

    act(() => engine.ready(id, fake.adapter));
    await settle();

    expect(fake.setChannelConfig).toHaveBeenLastCalledWith(INPUT_1);
    expect(fake.setDevice).toHaveBeenCalledWith(INTERFACE.id);
    expect(fake.syncChain).toHaveBeenCalledTimes(1);
    expect(fake.syncChain.mock.calls[0][0]).toEqual([
      expect.objectContaining({ type: 'nam-amp', namModelId: 'nam-vox-ac15' }),
    ]);
    expect(nam.fetchBundledModel).toHaveBeenCalledTimes(1);
    expect(nam.fetchBundledModel).toHaveBeenCalledWith(
      '/daw-assets/nam-models/vox-ac15.nam',
    );
    expect(fake.loadNamModel).toHaveBeenCalledWith(model, 0.7);
    // The model can only land in an amp the chain sync has already built.
    expect(fake.syncChain.mock.invocationCallOrder[0]).toBeLessThan(
      fake.loadNamModel.mock.invocationCallOrder[0],
    );
    expect(fake.setAmpSimMode).toHaveBeenCalledWith('nam');

    // Other tracks finishing their init neither rewire nor re-download.
    act(() => {
      engine.ready();
      engine.ready('other-track', new GuitarFxAdapter());
    });
    await settle();
    expect(fake.syncChain).toHaveBeenCalledTimes(1);
    expect(nam.fetchBundledModel).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['guitar-fx', '/daw-assets/nam-models/clean-twin.nam', 'nam-clean-twin'],
    ['bass-fx', '/daw-assets/nam-models/ampeg-svt.nam', 'nam-ampeg-svt'],
  ] as const)(
    'gives a new %s track its first amp model once the engine is ready',
    async (instrument, url, modelId) => {
      const model = { name: modelId };
      nam.fetchBundledModel.mockResolvedValue(model);
      const id = useStore.getState().addTrack('audio', instrument, 'Amp');
      const fake = fakeGuitarAdapter();
      render(<GuitarBassView trackId={id} instrument={instrument} />);
      await settle();
      expect(nam.fetchBundledModel).not.toHaveBeenCalled();

      act(() => engine.ready(id, fake.adapter));
      await settle();

      expect(nam.fetchBundledModel).toHaveBeenCalledTimes(1);
      expect(nam.fetchBundledModel).toHaveBeenCalledWith(url);
      expect(fake.loadNamModel).toHaveBeenCalledWith(model, 1);
      expect(fake.setAmpSimMode).toHaveBeenCalledWith('nam');
      expect(trackById(id)?.guitarChain).toEqual([
        expect.objectContaining({ type: 'nam-amp', namModelId: modelId }),
      ]);

      act(() => {
        engine.ready();
        engine.ready('other-track', new GuitarFxAdapter());
      });
      await settle();
      expect(nam.fetchBundledModel).toHaveBeenCalledTimes(1);
    },
  );

  it('restores the amp model when a pedal inserted before the amp rebuilds it', async () => {
    const model = { name: 'AC15' };
    nam.fetchBundledModel.mockResolvedValue(model);
    const id = reloadedGuitarTrack();
    const fake = fakeGuitarAdapter();
    engine.ready(id, fake.adapter);
    render(<GuitarBassView trackId={id} instrument="guitar-fx" />);
    await settle();
    expect(fake.loadNamModel).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Overdrive' }));
    await settle();

    expect(fake.syncChain).toHaveBeenLastCalledWith([
      expect.objectContaining({ type: 'overdrive' }),
      expect.objectContaining({ type: 'nam-amp', namModelId: 'nam-vox-ac15' }),
    ]);
    expect(fake.loadNamModel).toHaveBeenCalledTimes(2);
    expect(fake.loadNamModel.mock.invocationCallOrder[1]).toBeGreaterThan(
      fake.syncChain.mock.invocationCallOrder.at(-1)!,
    );
  });

  it('re-applies everything to a rebuilt adapter', async () => {
    nam.fetchBundledModel.mockResolvedValue({ name: 'AC15' });
    const id = reloadedGuitarTrack();
    const first = fakeGuitarAdapter();
    render(<GuitarBassView trackId={id} instrument="guitar-fx" />);
    act(() => engine.ready(id, first.adapter));
    await settle();

    const rebuilt = fakeGuitarAdapter();
    act(() => engine.ready(id, rebuilt.adapter));
    await settle();

    expect(rebuilt.setDevice).toHaveBeenCalledWith(INTERFACE.id);
    expect(rebuilt.syncChain).toHaveBeenCalledTimes(1);
    expect(rebuilt.loadNamModel).toHaveBeenCalledTimes(1);
  });

  it('starts one model download while a restore is under way', () => {
    const id = reloadedGuitarTrack();
    const fake = fakeGuitarAdapter();
    engine.ready(id, fake.adapter);

    // Dev runs every effect twice on mount, as a chain edit re-runs the
    // restore while the model is still downloading.
    render(
      <StrictMode>
        <GuitarBassView trackId={id} instrument="guitar-fx" />
      </StrictMode>,
    );

    expect(nam.fetchBundledModel).toHaveBeenCalledTimes(1);
  });

  it('mutes monitoring while the tuner runs, on whichever adapter is current', () => {
    const id = reloadedGuitarTrack();
    useStore.getState().updateTrack(id, { monitoring: true });
    const first = fakeGuitarAdapter();
    render(<GuitarBassView trackId={id} instrument="guitar-fx" />);

    // The tuner is switched on before the engine has started.
    act(() => tuner.setActive(true));
    act(() => engine.ready(id, first.adapter));
    expect(first.setMonitoring).toHaveBeenLastCalledWith(false);

    // A rebuilt adapter is muted too; the old one gets the setting back.
    const rebuilt = fakeGuitarAdapter();
    act(() => engine.ready(id, rebuilt.adapter));
    expect(first.setMonitoring).toHaveBeenLastCalledWith(true);
    expect(rebuilt.setMonitoring).toHaveBeenLastCalledWith(false);

    act(() => tuner.setActive(false));
    expect(rebuilt.setMonitoring).toHaveBeenLastCalledWith(true);
  });

  it('applies the input again when the device in use is picked again', async () => {
    const id = reloadedGuitarTrack(INPUT_1);
    const fake = fakeGuitarAdapter();
    engine.ready(id, fake.adapter);
    render(<GuitarBassView trackId={id} instrument="guitar-fx" />);
    await settle();
    expect(fake.setDevice).toHaveBeenCalledTimes(1);

    pickDevice(INTERFACE.label);
    await settle();

    expect(fake.setDevice).toHaveBeenCalledTimes(2);
    expect(fake.setDevice).toHaveBeenLastCalledWith(INTERFACE.id);
  });
});

describe('GuitarBassView on a real adapter', () => {
  it('routes the newest channel when the device finishes opening late', async () => {
    const id = reloadedGuitarTrack(INPUT_1);
    const { adapter, ctx } = await realGuitarAdapter();
    let finishOpening: (stream: MediaStream) => void = () => {};
    media.getUserMedia.mockImplementationOnce(
      () =>
        new Promise<MediaStream>((resolve) => {
          finishOpening = resolve;
        }),
    );
    engine.ready(id, adapter);
    render(<GuitarBassView trackId={id} instrument="guitar-fx" />);

    // Input 2 is picked while the device is still opening.
    act(() =>
      useStore.getState().updateTrack(id, { audioInputChannel: INPUT_2 }),
    );
    await act(async () => finishOpening(fakeStream()));

    const splitter = ctx.createChannelSplitter.mock.results[0].value;
    const input = adapter.getPitchDetectSourceNode();
    expect(input).not.toBeNull();
    expect(splitter.connect).toHaveBeenLastCalledWith(input, 1);
    expect(splitter.connect).not.toHaveBeenCalledWith(input, 0);
  });

  it('asks the adapter again when a device that failed to open is picked again', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const id = reloadedGuitarTrack(INPUT_1);
    const { adapter } = await realGuitarAdapter();
    const setDevice = vi.spyOn(adapter, 'setDevice');
    media.getUserMedia
      .mockRejectedValueOnce(new DOMException('Dismissed', 'NotAllowedError'))
      .mockResolvedValue(fakeStream());
    engine.ready(id, adapter);
    render(<GuitarBassView trackId={id} instrument="guitar-fx" />);
    await settle();
    expect(media.getUserMedia).toHaveBeenCalledTimes(1);
    expect(adapter.getPitchDetectSourceNode()).toBeNull();

    pickDevice(INTERFACE.label);
    await settle();

    expect(setDevice).toHaveBeenCalledTimes(2);
    expect(setDevice).toHaveBeenLastCalledWith(INTERFACE.id);
  });

  // live-input-07. The adapters forget a device that failed to open or went
  // away, so the view's retry above reaches the browser again.
  it('opens a device that failed to open when it is picked again', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const id = reloadedGuitarTrack(INPUT_1);
    const { adapter } = await realGuitarAdapter();
    media.getUserMedia
      .mockRejectedValueOnce(new DOMException('Dismissed', 'NotAllowedError'))
      .mockResolvedValue(fakeStream());
    engine.ready(id, adapter);
    render(<GuitarBassView trackId={id} instrument="guitar-fx" />);
    await settle();

    pickDevice(INTERFACE.label);
    await settle();

    expect(media.getUserMedia).toHaveBeenCalledTimes(2);
    expect(adapter.getPitchDetectSourceNode()).not.toBeNull();
  });
});
