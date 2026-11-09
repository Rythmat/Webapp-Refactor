// @vitest-environment jsdom
/**
 * The instrument panel shows the project open now, even one that reuses the
 * last project's track ids: kept work restored, a project reopened, a
 * Save-As copy opened beside its original.
 *
 * The views copy some of the track into their own state as they mount. An
 * Audio track's view (GuitarBassView) copies its chain (amp and pitch
 * correction), plays its copy through the track's engine and saves it back
 * to the track. TrackControlsPanel keyed the views by track id alone, so a
 * load that kept the id kept them mounted: the last project's chain went
 * into the new project's engine and, with the next edit, over the chain it
 * had loaded. Now every view mounts again for every
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
vi.mock('../DrumMachineView', async () => ({
  DrumMachineView: views.stub(await import('react'), 'DrumMachineView'),
}));
vi.mock('../SoundFontView', async () => ({
  SoundFontView: views.stub(await import('react'), 'SoundFontView'),
}));
vi.mock('../OracleSynthInline', async () => ({
  OracleSynthInline: views.stub(await import('react'), 'OracleSynthInline'),
}));
vi.mock('../OracleSynthView', async () => ({
  OracleSynthView: views.stub(await import('react'), 'OracleSynthView'),
}));
vi.mock('@/daw/shell/dock/DrumPadsView', async () => ({
  DrumPadsView: views.stub(await import('react'), 'DrumPadsView'),
}));

import { GuitarFxAdapter } from '@/daw/instruments/GuitarFxAdapter';
import {
  deserializeSession,
  forgetLiveSession,
  serializeSession,
  type SessionData,
} from '@/daw/persistence/SessionSerializer';
import {
  DrumPadsViewPart,
  GuitarBassViewPart,
  OracleSynthInlinePart,
  OracleSynthViewPart,
  SoundFontViewPart,
} from '@/daw/shell/lazyParts';
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
  const type = instrument === 'audio-input' ? 'audio' : 'midi';
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
function recordWrites(id: string) {
  const writes: unknown[] = [];
  stopRecording = useStore.subscribe((state, prev) => {
    const now = state.tracks.find((t) => t.id === id)?.guitarChain;
    if (now !== prev.tracks.find((t) => t.id === id)?.guitarChain) {
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
    type: 'pitch-correction',
    enabled: true,
    params: { rootNote: 7, scaleType: 2, correction: 80, speed: 50, mix: 100 },
  },
  {
    type: 'nam-amp',
    enabled: true,
    params: { inputLevel: 0.6, volume: 0.5 },
    namModelId: 'nam-clean-twin', // Quartz
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

beforeAll(async () => {
  // jsdom has no media devices; the views listen for device changes.
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { addEventListener() {}, removeEventListener() {} },
  });
  // Each instrument view is its own chunk (milestone 1.12a); loaded here,
  // the panel renders them at once, as after a preload in the editor.
  await Promise.all(
    [
      GuitarBassViewPart,
      OracleSynthInlinePart,
      OracleSynthViewPart,
      SoundFontViewPart,
      DrumPadsViewPart,
    ].map((part) => part.preload()),
  );
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

/** The amp card's model name, as the dock shows it. */
const ampOnScreen = () =>
  screen.getByTestId('audio-fx-card-nam-amp').querySelector('h3')?.textContent;

describe('the audio view after a load that keeps the track id', () => {
  it('plays and shows the chain the project loaded with', async () => {
    const id = openProject('audio-input', { guitarChain: LEFT_ON_SCREEN });
    const draft = draftOfThisProjectWith(id, { guitarChain: IN_THE_DRAFT });
    render(<TrackControlsPanel />);
    const first = fakeGuitarAdapter();
    act(() => engine.ready(id, first.adapter));
    await settle();
    expect(first.syncChain).toHaveBeenLastCalledWith(toEngine(LEFT_ON_SCREEN));
    expect(ampOnScreen()).toBe('Fire Opal');

    load(draft);
    // The load rebuilt the track's engine.
    const rebuilt = fakeGuitarAdapter();
    act(() => engine.ready(id, rebuilt.adapter));
    await settle();

    expect(rebuilt.syncChain).toHaveBeenCalled();
    for (const [chain] of rebuilt.syncChain.mock.calls) {
      expect(chain).toEqual(toEngine(IN_THE_DRAFT));
    }
    // One card per block of the loaded chain, its amp the loaded model.
    expect(screen.getByTestId('audio-fx-card-pitch-correction')).toBeTruthy();
    expect(ampOnScreen()).toBe('Quartz');
  });

  it('never saves the last chain over the loaded one, not even with the next edit', async () => {
    const id = openProject('audio-input', { guitarChain: LEFT_ON_SCREEN });
    const draft = draftOfThisProjectWith(id, { guitarChain: IN_THE_DRAFT });
    render(<TrackControlsPanel />);
    act(() => engine.ready(id, fakeGuitarAdapter().adapter));
    await settle();

    const writes = recordWrites(id);
    load(draft);
    act(() => engine.ready(id, fakeGuitarAdapter().adapter));
    await settle();
    expect(s().tracks[0].guitarChain).toEqual(IN_THE_DRAFT);

    // The student switches the amp off: the loaded chain's amp.
    fireEvent.click(screen.getByRole('button', { name: 'Quartz on' }));
    await settle();

    expect(s().tracks[0].guitarChain).toEqual([
      IN_THE_DRAFT[0],
      { ...IN_THE_DRAFT[1], enabled: false },
    ]);
    expect(JSON.stringify(writes)).not.toContain('nam-vox-ac15');
  });
});

describe('the audio view when another audio track is selected', () => {
  it('plays, shows and keeps the chain of the track selected', async () => {
    const first = openProject('audio-input', { guitarChain: LEFT_ON_SCREEN });
    const next = openProject('audio-input', { guitarChain: IN_THE_DRAFT });
    s().setSelectedTrackId(first);
    render(<TrackControlsPanel />);
    act(() => engine.ready(first, fakeGuitarAdapter().adapter));
    const onNext = fakeGuitarAdapter();
    act(() => engine.ready(next, onNext.adapter));
    await settle();
    expect(onNext.syncChain).not.toHaveBeenCalled();

    const writes = recordWrites(next);
    act(() => s().setSelectedTrackId(next));
    await settle();

    expect(onNext.syncChain).toHaveBeenCalled();
    for (const [chain] of onNext.syncChain.mock.calls) {
      expect(chain).toEqual(toEngine(IN_THE_DRAFT));
    }
    expect(ampOnScreen()).toBe('Quartz');
    expect(s().tracks.find((t) => t.id === next)?.guitarChain).toEqual(
      IN_THE_DRAFT,
    );
    expect(JSON.stringify(writes)).not.toContain('nam-vox-ac15');
  });
});

describe('every instrument view', () => {
  it.each([
    ['drum-machine', 'DrumPadsView'],
    ['soundfont', 'SoundFontView'],
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
    ['drum-machine', 'DrumPadsView'],
    ['soundfont', 'SoundFontView'],
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

  // A maximized dock shows the Oracle synth's full panel, as its pop-out
  // window did until milestone 2.9.
  it('in a maximized dock, the oracle-synth’s full panel mounts again for a load too', () => {
    openProject('oracle-synth');
    const draft = serializeSession();
    render(<TrackControlsPanel roomy />);
    expect(views.mounts.OracleSynthView).toBe(1);
    expect(views.mounts.OracleSynthInline).toBeUndefined();

    load(draft);

    expect(views.mounts.OracleSynthView).toBe(2);
  });
});
