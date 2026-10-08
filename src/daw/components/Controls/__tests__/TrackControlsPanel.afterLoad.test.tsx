// @vitest-environment jsdom
/**
 * The instrument panel shows the project open now, even one that reuses the
 * last project's track ids: kept work restored, a project reopened, a
 * Save-As copy opened beside its original.
 *
 * The views copy some of the track into their own state as they mount. The
 * guitar and vocal views copy the pedal chain, play their copy through the
 * track's engine and save it back to the track. TrackControlsPanel keyed the
 * views by track id alone, so a load that kept the id kept them mounted: the
 * last project's chain went into the new project's engine and, with the next
 * edit, over the chain it had loaded. Now every view mounts again for every
 * load (useSessionGeneration), and still for every track selected: a view
 * kept mounted from one track to the next would put the first track's chain
 * into the second track's engine and save it over the second track's.
 *
 * The loads are the real loader (deserializeSession, as a kept-work Restore
 * runs it) on a draft of the same project. The engines are replaced by the
 * registry the views read, which the tests drive: a load rebuilds every
 * engine (usePlaybackEngine), so the new project's track gets a new adapter.
 *
 * Run: npx vitest run src/daw/components/Controls/__tests__/TrackControlsPanel.afterLoad.test.tsx
 */
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';

// The engine's adapter registry and its engine-ready signal, as in
// liveInputEngineReady.test.tsx.
const engine = vi.hoisted(() => {
  const registry = new Map<
    string,
    { instrument: unknown; trackEngine: { getInstrument: () => unknown } }
  >();
  const listeners = new Set<() => void>();
  return {
    registry,
    listeners,
    /** `adapter` finished its init on `trackId`'s (new) engine. */
    ready(trackId: string, adapter: unknown) {
      registry.set(trackId, {
        instrument: adapter,
        trackEngine: { getInstrument: () => adapter },
      });
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
vi.mock('@/daw/midi/AudioInputEnumerator', () => ({
  getAudioInputs: () =>
    Promise.resolve([{ id: 'iface-1', label: 'Interface', groupId: 'g1' }]),
  probeDeviceChannelCount: () => Promise.resolve(2),
}));
// A model download that never finishes: the amps keep the model they name.
vi.mock('@/daw/audio/nam/NamModelStore', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/daw/audio/nam/NamModelStore')>()),
  fetchBundledModel: () => new Promise(() => {}),
}));
vi.mock('../TunerDisplay', () => ({ TunerDisplay: () => null }));
vi.mock('@/daw/hooks/usePitchInfo', () => ({
  usePitchInfo: () => ({ detected: 0, corrected: 0 }),
}));
vi.mock('../AudioMidiSourcePanel', () => ({
  AudioMidiSourcePanel: () => null,
}));

// The other instruments' views stand in for themselves, counting mounts.
const views = vi.hoisted(() => {
  const mounts: Record<string, number> = {};
  return {
    mounts,
    stub: (react: typeof import('react'), name: string) =>
      function CountedView() {
        react.useEffect(() => {
          mounts[name] = (mounts[name] ?? 0) + 1;
        }, []);
        return null;
      },
  };
});
vi.mock('../KeyboardView', async () => ({
  KeyboardView: views.stub(await import('react'), 'KeyboardView'),
}));
vi.mock('../OrganView', async () => ({
  OrganView: views.stub(await import('react'), 'OrganView'),
}));
vi.mock('../DrumMachineView', async () => ({
  DrumMachineView: views.stub(await import('react'), 'DrumMachineView'),
}));
vi.mock('../SoundFontView', async () => ({
  SoundFontView: views.stub(await import('react'), 'SoundFontView'),
}));
vi.mock('../SamplerChopsView', async () => ({
  SamplerChopsView: views.stub(await import('react'), 'SamplerChopsView'),
}));
vi.mock('../OracleSynthInline', async () => ({
  OracleSynthInline: views.stub(await import('react'), 'OracleSynthInline'),
}));
vi.mock('../OracleSynthView', async () => ({
  OracleSynthView: views.stub(await import('react'), 'OracleSynthView'),
}));

import { GuitarFxAdapter } from '@/daw/instruments/GuitarFxAdapter';
import { VocalFxAdapter } from '@/daw/instruments/VocalFxAdapter';
import {
  deserializeSession,
  forgetLiveSession,
  serializeSession,
  type SessionData,
} from '@/daw/persistence/SessionSerializer';
import { useStore } from '@/daw/store';
import type { InstrumentType, Track } from '@/daw/store/tracksSlice';
import { TrackControlsPanel } from '../TrackControlsPanel';

const s = () => useStore.getState();

/** Lets pending promises (the device list) settle. */
const settle = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

type Chain = NonNullable<Track['guitarChain']>;

/** The project open on screen: one track, selected, the panel on it. */
function openProject(instrument: InstrumentType, fields: Partial<Track> = {}) {
  const type =
    instrument === 'guitar-fx' || instrument === 'vocal-fx' ? 'audio' : 'midi';
  const id = s().addTrack(type, instrument, 'Track');
  s().updateTrack(id, fields);
  s().setSelectedTrackId(id);
  return id;
}

/**
 * The same project with `fields` changed on its track, as a draft: kept
 * work, or a copy saved earlier. The project on screen is left as it was.
 */
function draftOfThisProjectWith(id: string, fields: Partial<Track>) {
  const before = s().tracks.find((t) => t.id === id)!;
  s().updateTrack(id, fields);
  const draft = serializeSession();
  s().updateTrack(id, before);
  return draft;
}

/** Open a draft as a kept-work Restore does. */
function load(draft: SessionData) {
  act(() => {
    expect(deserializeSession(draft)).toBe(true);
  });
}

/** Every value the store takes for the track's `key`, from now on. */
let stopRecording = () => {};
function recordWrites(id: string, key: 'guitarChain' | 'vocalChain') {
  const writes: unknown[] = [];
  stopRecording = useStore.subscribe((state, prev) => {
    const now = state.tracks.find((t) => t.id === id)?.[key];
    if (now !== prev.tracks.find((t) => t.id === id)?.[key]) {
      writes.push(structuredClone(now));
    }
  });
  return writes;
}

function fakeGuitarAdapter() {
  const adapter = new GuitarFxAdapter();
  vi.spyOn(adapter, 'setDevice').mockResolvedValue();
  vi.spyOn(adapter, 'setChannelConfig').mockImplementation(() => {});
  vi.spyOn(adapter, 'loadNamModel').mockResolvedValue();
  vi.spyOn(adapter, 'setAmpSimMode').mockImplementation(() => {});
  vi.spyOn(adapter, 'isNamLoaded').mockReturnValue(false);
  return {
    adapter,
    syncChain: vi.spyOn(adapter, 'syncChain').mockImplementation(() => {}),
  };
}

function fakeVocalAdapter() {
  const adapter = new VocalFxAdapter();
  vi.spyOn(adapter, 'setDevice').mockResolvedValue();
  vi.spyOn(adapter, 'setChannelConfig').mockImplementation(() => {});
  return {
    adapter,
    syncChain: vi.spyOn(adapter, 'syncChain').mockImplementation(() => {}),
    // A freshly built chain has no processors, so the param fast path fails.
    updateChainParams: vi
      .spyOn(adapter, 'updateChainParams')
      .mockReturnValue(false),
  };
}

// The amp the student left on screen, and the chain the draft holds.
const LEFT_ON_SCREEN: Chain = [
  {
    type: 'nam-amp',
    enabled: true,
    params: { inputLevel: 0.5, volume: 0.7 },
    namModelId: 'nam-vox-ac15', // Fire Opal
  },
];
const IN_THE_DRAFT: Chain = [
  {
    type: 'compressor',
    enabled: true,
    params: { threshold: 0.4, ratio: 0.3, attack: 0.2, release: 0.5 },
  },
  {
    type: 'nam-amp',
    enabled: true,
    params: { inputLevel: 0.6, volume: 0.5 },
    namModelId: 'nam-clean-twin', // Quartz
  },
];

const VOCALS_ON_SCREEN: NonNullable<Track['vocalChain']> = [
  {
    type: 'reverb',
    enabled: true,
    params: { size: 0.8, decay: 0.7, mix: 0.6 },
  },
];
const VOCALS_IN_THE_DRAFT: NonNullable<Track['vocalChain']> = [
  {
    type: 'delay',
    enabled: true,
    params: { time: 0.25, feedback: 0.4, mix: 0.35 },
  },
  {
    type: 'compressor',
    enabled: false,
    params: { threshold: 0.5, ratio: 0.3, attack: 0.2, release: 0.5 },
  },
];

/** What a view hands the engine for a stored chain. */
const toEngine = (chain: Chain) =>
  chain.map(({ type, enabled, params, namModelId }) => ({
    type,
    enabled,
    params,
    namModelId,
  }));

beforeAll(() => {
  // jsdom has no media devices; the views listen for device changes.
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { addEventListener() {}, removeEventListener() {} },
  });
});

beforeEach(() => {
  localStorage.clear();
  useStore.setState(useStore.getInitialState(), true);
  useStore.setState({ inputDeviceId: 'iface-1' });
  forgetLiveSession();
  engine.registry.clear();
  for (const view of Object.keys(views.mounts)) delete views.mounts[view];
});

afterEach(() => {
  stopRecording();
  cleanup();
  vi.restoreAllMocks();
});

describe('the guitar view after a load that keeps the track id', () => {
  it('plays and shows the chain the project loaded with', async () => {
    const id = openProject('guitar-fx', { guitarChain: LEFT_ON_SCREEN });
    const draft = draftOfThisProjectWith(id, { guitarChain: IN_THE_DRAFT });
    render(<TrackControlsPanel />);
    const first = fakeGuitarAdapter();
    act(() => engine.ready(id, first.adapter));
    await settle();
    expect(first.syncChain).toHaveBeenLastCalledWith(toEngine(LEFT_ON_SCREEN));

    load(draft);
    // The load rebuilt the track's engine.
    const rebuilt = fakeGuitarAdapter();
    act(() => engine.ready(id, rebuilt.adapter));
    await settle();

    expect(rebuilt.syncChain).toHaveBeenCalled();
    for (const [chain] of rebuilt.syncChain.mock.calls) {
      expect(chain).toEqual(toEngine(IN_THE_DRAFT));
    }
    // The loaded amp's model is the one marked in the model list.
    expect(screen.getByText('Quartz').style.color).toBe('var(--color-accent)');
    expect(screen.getByText('Fire Opal').style.color).toBe('var(--color-text)');
  });

  it('never saves the last chain over the loaded one, not even with the next edit', async () => {
    const id = openProject('guitar-fx', { guitarChain: LEFT_ON_SCREEN });
    const draft = draftOfThisProjectWith(id, { guitarChain: IN_THE_DRAFT });
    render(<TrackControlsPanel />);
    act(() => engine.ready(id, fakeGuitarAdapter().adapter));
    await settle();

    const writes = recordWrites(id, 'guitarChain');
    load(draft);
    act(() => engine.ready(id, fakeGuitarAdapter().adapter));
    await settle();
    expect(s().tracks[0].guitarChain).toEqual(IN_THE_DRAFT);

    // The student adds a pedal: it goes into the loaded chain, before its amp.
    fireEvent.click(screen.getByRole('button', { name: 'Overdrive' }));
    await settle();

    expect(s().tracks[0].guitarChain).toEqual([
      IN_THE_DRAFT[0],
      expect.objectContaining({ type: 'overdrive' }),
      IN_THE_DRAFT[1],
    ]);
    expect(JSON.stringify(writes)).not.toContain('nam-vox-ac15');
  });
});

describe('the guitar view when another guitar track is selected', () => {
  it('plays, shows and keeps the chain of the track selected', async () => {
    const first = openProject('guitar-fx', { guitarChain: LEFT_ON_SCREEN });
    const next = openProject('guitar-fx', { guitarChain: IN_THE_DRAFT });
    s().setSelectedTrackId(first);
    render(<TrackControlsPanel />);
    act(() => engine.ready(first, fakeGuitarAdapter().adapter));
    const onNext = fakeGuitarAdapter();
    act(() => engine.ready(next, onNext.adapter));
    await settle();
    expect(onNext.syncChain).not.toHaveBeenCalled();

    const writes = recordWrites(next, 'guitarChain');
    act(() => s().setSelectedTrackId(next));
    await settle();

    expect(onNext.syncChain).toHaveBeenCalled();
    for (const [chain] of onNext.syncChain.mock.calls) {
      expect(chain).toEqual(toEngine(IN_THE_DRAFT));
    }
    expect(screen.getByText('Quartz').style.color).toBe('var(--color-accent)');
    expect(s().tracks.find((t) => t.id === next)?.guitarChain).toEqual(
      IN_THE_DRAFT,
    );
    expect(JSON.stringify(writes)).not.toContain('nam-vox-ac15');
  });
});

describe('the vocal view after a load that keeps the track id', () => {
  it('plays and shows the chain the project loaded with', async () => {
    const id = openProject('vocal-fx', { vocalChain: VOCALS_ON_SCREEN });
    const draft = draftOfThisProjectWith(id, {
      vocalChain: VOCALS_IN_THE_DRAFT,
    });
    const { container } = render(<TrackControlsPanel />);
    const first = fakeVocalAdapter();
    act(() => engine.ready(id, first.adapter));
    await settle();
    expect(first.syncChain).toHaveBeenLastCalledWith(VOCALS_ON_SCREEN);
    expect(container.querySelectorAll('[draggable="true"]')).toHaveLength(1);

    load(draft);
    const rebuilt = fakeVocalAdapter();
    act(() => engine.ready(id, rebuilt.adapter));
    await settle();

    const handed = [
      ...rebuilt.updateChainParams.mock.calls,
      ...rebuilt.syncChain.mock.calls,
    ];
    expect(handed.length).toBeGreaterThan(0);
    for (const [chain] of handed) expect(chain).toEqual(VOCALS_IN_THE_DRAFT);
    // One pedal on screen per block of the loaded chain.
    expect(container.querySelectorAll('[draggable="true"]')).toHaveLength(2);
  });

  it('never saves the last chain over the loaded one, not even with the next edit', async () => {
    const id = openProject('vocal-fx', { vocalChain: VOCALS_ON_SCREEN });
    const draft = draftOfThisProjectWith(id, {
      vocalChain: VOCALS_IN_THE_DRAFT,
    });
    render(<TrackControlsPanel />);
    act(() => engine.ready(id, fakeVocalAdapter().adapter));
    await settle();

    const writes = recordWrites(id, 'vocalChain');
    load(draft);
    act(() => engine.ready(id, fakeVocalAdapter().adapter));
    await settle();
    expect(s().tracks[0].vocalChain).toEqual(VOCALS_IN_THE_DRAFT);

    // The student adds a pedal: it goes on the end of the loaded chain.
    fireEvent.click(screen.getByRole('button', { name: 'Chorus' }));
    await settle();

    expect(s().tracks[0].vocalChain).toEqual([
      ...VOCALS_IN_THE_DRAFT,
      expect.objectContaining({ type: 'chorus' }),
    ]);
    expect(JSON.stringify(writes)).not.toContain('reverb');
  });
});

describe('the vocal view when another vocal track is selected', () => {
  it('plays, shows and keeps the chain of the track selected', async () => {
    const first = openProject('vocal-fx', { vocalChain: VOCALS_ON_SCREEN });
    const next = openProject('vocal-fx', { vocalChain: VOCALS_IN_THE_DRAFT });
    s().setSelectedTrackId(first);
    const { container } = render(<TrackControlsPanel />);
    act(() => engine.ready(first, fakeVocalAdapter().adapter));
    const onNext = fakeVocalAdapter();
    act(() => engine.ready(next, onNext.adapter));
    await settle();

    const writes = recordWrites(next, 'vocalChain');
    act(() => s().setSelectedTrackId(next));
    await settle();

    const handed = [
      ...onNext.updateChainParams.mock.calls,
      ...onNext.syncChain.mock.calls,
    ];
    expect(handed.length).toBeGreaterThan(0);
    for (const [chain] of handed) expect(chain).toEqual(VOCALS_IN_THE_DRAFT);
    expect(container.querySelectorAll('[draggable="true"]')).toHaveLength(2);
    expect(s().tracks.find((t) => t.id === next)?.vocalChain).toEqual(
      VOCALS_IN_THE_DRAFT,
    );
    expect(JSON.stringify(writes)).not.toContain('reverb');
  });
});

describe('every instrument view', () => {
  it.each([
    ['piano-sampler', 'KeyboardView'],
    ['tonewheel-organ', 'OrganView'],
    ['drum-machine', 'DrumMachineView'],
    ['soundfont', 'SoundFontView'],
    ['sampler', 'SamplerChopsView'],
    ['oracle-synth', 'OracleSynthInline'],
  ] as const)(
    'on a %s track mounts again for a load, and only for a load',
    (instrument, view) => {
      const id = openProject(instrument);
      const draft = serializeSession();
      render(<TrackControlsPanel />);
      expect(views.mounts[view]).toBe(1);

      // An edit is not a load: the view stays as it is.
      act(() => s().updateTrack(id, { volume: 0.4 }));
      expect(views.mounts[view]).toBe(1);

      // The same project opened again, ids and all.
      load(draft);
      expect(s().selectedTrackId).toBe(id);
      expect(views.mounts[view]).toBe(2);
    },
  );

  it.each([
    ['piano-sampler', 'KeyboardView'],
    ['tonewheel-organ', 'OrganView'],
    ['drum-machine', 'DrumMachineView'],
    ['soundfont', 'SoundFontView'],
    ['sampler', 'SamplerChopsView'],
    ['oracle-synth', 'OracleSynthInline'],
  ] as const)(
    'on a %s track mounts again for another track of its kind',
    (instrument, view) => {
      const first = openProject(instrument);
      const next = openProject(instrument);
      s().setSelectedTrackId(first);
      render(<TrackControlsPanel />);
      expect(views.mounts[view]).toBe(1);

      act(() => s().setSelectedTrackId(next));

      expect(views.mounts[view]).toBe(2);
    },
  );

  it.each([
    ['piano-sampler', 'KeyboardView', 'Piano Sampler'],
    ['oracle-synth', 'OracleSynthView', 'Oracle Synth'],
  ] as const)(
    'in the %s pop-out mounts again for a load too',
    (instrument, view, title) => {
      openProject(instrument);
      const draft = serializeSession();
      render(<TrackControlsPanel />);
      fireEvent.click(screen.getByTitle('Open in full screen'));
      const mounted = views.mounts[view];
      expect(mounted).toBeGreaterThanOrEqual(1);

      load(draft);

      expect(views.mounts[view]).toBe(mounted * 2);
      // The pop-out stays open, over the project open now.
      expect(screen.getByText(title)).toBeTruthy();
    },
  );
});
