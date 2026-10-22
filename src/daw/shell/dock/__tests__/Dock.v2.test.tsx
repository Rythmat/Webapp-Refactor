// @vitest-environment jsdom
/**
 * The editor dock v2 (milestone 2.9; decision 16, after Soundtrap's drawer).
 *
 * - Its body by what the selected track is and the tab open. It has no tab
 *   bar since the floating frame (2026-10-21): the bottom rail's dock views
 *   open the tabs (DockViews.test). The ids are unchanged.
 * - Selection drives it: it follows the selected track, keeping the tab
 *   that applies, and a click on a clip opens that clip's editor.
 * - Master opens in the same slot; Maximize grows it over the canvas, and
 *   Escape gives the canvas back; Escape in the dock shuts it.
 */
import {
  afterAll,
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

// The tabs' contents and their engines aren't under test: each stands in
// for itself.
const stub = vi.hoisted(() => (name: string) => {
  const Body = () => <div data-testid={`body-${name}`} />;
  Body.displayName = `Stub(${name})`;
  return Body;
});
vi.mock('@/daw/components/PianoRoll/ClipPianoRoll', () => ({
  ClipPianoRoll: stub('notes'),
}));
vi.mock('@/daw/components/Controls/DrumMachineView', () => ({
  DrumMachineView: stub('drum-grid'),
}));
vi.mock('@/daw/components/Controls/TrackControlsPanel', () => ({
  TrackControlsPanel: stub('instrument'),
}));
vi.mock('@/daw/shell/dock/DockEffects', () => ({
  DockEffects: stub('effects'),
}));
vi.mock('@/daw/components/Prism/PrismPanel', () => ({
  PrismPanel: stub('prism'),
}));
vi.mock('@/daw/components/Controls/GroovesBrowser', () => ({
  GroovesBrowser: stub('grooves'),
}));
vi.mock('@/daw/shell/dock/DockMaster', () => ({
  DockMaster: stub('master'),
}));
vi.mock('@/components/ui/LockedFeatureOverlay', () => ({
  LockedFeatureOverlay: ({ children }: { children: unknown }) => children,
}));
vi.mock('@/hooks/useIsPremium', () => ({
  useIsPremium: () => ({ isPremium: true }),
}));
vi.mock('@/daw/audio/auditionNote', () => ({ auditionNote: vi.fn() }));

import { installKeyDispatcher } from '@/daw/commands/dispatcher';
import {
  ClipPianoRollPart,
  DockMasterPart,
  DrumMachineViewPart,
  EffectsPanelPart,
  GroovesBrowserPart,
  PrismPanelPart,
} from '@/daw/shell/lazyParts';
import { useStore } from '@/daw/store';
import type { InstrumentType, TrackType } from '@/daw/store/tracksSlice';
import { Dock } from '../Dock';
import { openClipEditor } from '../dockSelection';

const s = () => useStore.getState();

let uninstall = () => {};
beforeAll(async () => {
  uninstall = installKeyDispatcher();
  // Each tab's body is its own chunk (1.12a); loaded here, the dock shows
  // them at once, as after a preload in the editor.
  await Promise.all(
    [
      ClipPianoRollPart,
      DockMasterPart,
      DrumMachineViewPart,
      EffectsPanelPart,
      GroovesBrowserPart,
      PrismPanelPart,
    ].map((part) => part.preload()),
  );
});
afterAll(() => uninstall());

beforeEach(() => {
  useStore.setState(useStore.getInitialState(), true);
  useStore.setState({ remoteUsers: new Map(), currentView: 'arrange' });
});
afterEach(cleanup);

function add(type: TrackType, instrument: InstrumentType, name: string) {
  return s().addTrack(type, instrument, name);
}

/** The tab bar's labels, in order: none since the floating frame. */
const tabLabels = () =>
  screen.queryAllByRole('tab').map((tab) => tab.textContent);

describe('the body by track', () => {
  it('melodic: each tab its body, and no tab bar', () => {
    const keys = add('midi', 'piano-sampler', 'Keys');
    s().setSelectedTrackId(keys);
    s().setChannelStripTab('controls');
    render(<Dock />);
    expect(tabLabels()).toEqual([]);
    expect(screen.getByTestId('body-instrument')).toBeTruthy();
    act(() => s().setChannelStripTab('prism'));
    expect(screen.getByTestId('body-prism')).toBeTruthy();
    act(() => s().setChannelStripTab('piano-roll'));
    expect(screen.getByTestId('body-notes')).toBeTruthy();
    act(() => s().setChannelStripTab('fx'));
    expect(screen.getByTestId('body-effects')).toBeTruthy();
  });

  it('drums: Notes is the drum grid, and Grooves still opens', () => {
    const drums = add('midi', 'drum-machine', 'Drums');
    s().setSelectedTrackId(drums);
    s().setChannelStripTab('piano-roll');
    render(<Dock />);
    expect(tabLabels()).toEqual([]);
    expect(screen.getByTestId('body-drum-grid')).toBeTruthy();
    act(() => s().setChannelStripTab('grooves'));
    expect(screen.getByTestId('body-grooves')).toBeTruthy();
  });

  it('audio: no tab bar, the chain', () => {
    const take = add('audio', 'none', 'Take');
    s().setSelectedTrackId(take);
    s().setChannelStripTab('controls');
    render(<Dock />);
    expect(tabLabels()).toEqual([]);
    expect(screen.getByTestId('body-effects')).toBeTruthy();
  });

  it('live input: its pedals, and no Chain switch', () => {
    const guitar = add('audio', 'guitar-fx', 'Guitar');
    s().setSelectedTrackId(guitar);
    s().setChannelStripTab('controls');
    render(<Dock />);
    expect(tabLabels()).toEqual([]);
    expect(screen.queryByRole('radiogroup', { name: 'Chain' })).toBeNull();
    expect(screen.getByTestId('body-instrument')).toBeTruthy();
  });
});

describe('selection drives the dock', () => {
  it('keeps the tab that applies, and takes Grooves for Prism', () => {
    const keys = add('midi', 'piano-sampler', 'Keys');
    const drums = add('midi', 'drum-machine', 'Drums');
    s().setSelectedTrackId(keys);
    s().setChannelStripTab('piano-roll');
    render(<Dock />);

    act(() => s().setSelectedTrackId(drums));
    expect(s().channelStripTab).toBe('piano-roll');

    act(() => s().setChannelStripTab('prism'));
    expect(s().channelStripTab).toBe('grooves');
    act(() => s().setSelectedTrackId(keys));
    expect(s().channelStripTab).toBe('prism');
  });

  it('a clip click selects its track and opens its editor', () => {
    const keys = add('midi', 'piano-sampler', 'Keys');
    const drums = add('midi', 'drum-machine', 'Drums');
    const take = add('audio', 'none', 'Take');
    s().setSelectedTrackId(keys);
    render(<Dock />);

    act(() => openClipEditor(drums));
    expect(s().selectedTrackId).toBe(drums);
    expect(s().channelStripTab).toBe('piano-roll');
    expect(screen.getByTestId('body-drum-grid')).toBeTruthy();

    act(() => s().setChannelStripTab(null));
    act(() => openClipEditor(take));
    expect(s().selectedTrackId).toBe(take);
    expect(s().channelStripTab).toBe('fx');
    expect(screen.getByTestId('body-effects')).toBeTruthy();
  });

  it('Notes edits the selected track, whatever clip is selected elsewhere', () => {
    const keys = add('midi', 'piano-sampler', 'Keys');
    const drums = add('midi', 'drum-machine', 'Drums');
    s().addMidiClip(drums, { id: 'beat', startTick: 0, events: [] });
    s().setSelectedClip('beat', drums);
    s().setSelectedTrackId(keys);
    s().setChannelStripTab('piano-roll');
    render(<Dock />);
    expect(screen.getByTestId('body-notes')).toBeTruthy();
    expect(screen.queryByTestId('body-drum-grid')).toBeNull();
  });

  it('leaves the dock’s tab to a running lesson', () => {
    const keys = add('midi', 'piano-sampler', 'Keys');
    const synth = add('midi', 'oracle-synth', 'Synth');
    s().setSelectedTrackId(keys);
    s().setChannelStripTab('prism');
    useStore.setState({ activeTutorialId: 'make-first-track' } as never);
    openClipEditor(synth);
    expect(s().selectedTrackId).toBe(synth);
    expect(s().channelStripTab).toBe('prism');
  });
});

describe('Master in the dock’s slot', () => {
  it('shows Master, and gives the slot back when a track is chosen', () => {
    const keys = add('midi', 'piano-sampler', 'Keys');
    const pad = add('midi', 'piano-sampler', 'Pad');
    s().setSelectedTrackId(keys);
    render(<Dock />);

    act(() => s().setDockMaster(true));
    expect(screen.getByTestId('body-master')).toBeTruthy();
    expect(tabLabels()).toEqual([]);
    expect(screen.getByTestId('dock').dataset.kind).toBe('master');

    act(() => s().setSelectedTrackId(pad));
    expect(s().dockMaster).toBe(false);
    expect(s().channelStripTab).toBe('controls');
    expect(screen.getByTestId('body-instrument')).toBeTruthy();
  });

  it('shuts with the dock', () => {
    s().setDockMaster(true);
    render(<Dock />);
    fireEvent.click(screen.getByTestId('dock-toggle'));
    expect(s().dockMaster).toBe(false);
    expect(screen.queryByTestId('body-master')).toBeNull();
  });
});

describe('Maximize and Escape', () => {
  it('maximizes, and Escape restores wherever focus is', () => {
    const keys = add('midi', 'piano-sampler', 'Keys');
    s().setSelectedTrackId(keys);
    s().setChannelStripTab('piano-roll');
    render(<Dock />);
    fireEvent.click(screen.getByTestId('dock-maximize'));
    expect(s().dockMaximized).toBe(true);

    fireEvent.keyDown(document.body, { key: 'Escape', code: 'Escape' });
    expect(s().dockMaximized).toBe(false);
    // Restored, not shut.
    expect(s().channelStripTab).toBe('piano-roll');
  });

  it('shuts on Escape from inside the dock', () => {
    const keys = add('midi', 'piano-sampler', 'Keys');
    s().setSelectedTrackId(keys);
    s().setChannelStripTab('fx');
    render(<Dock />);
    const body = document.querySelector<HTMLElement>('[data-dock-content]')!;
    body.focus();
    fireEvent.keyDown(body, { key: 'Escape', code: 'Escape' });
    expect(s().channelStripTab).toBeNull();
  });

  it('a shut dock is never maximized', () => {
    const keys = add('midi', 'piano-sampler', 'Keys');
    s().setSelectedTrackId(keys);
    s().setChannelStripTab('fx');
    s().setDockMaximized(true);
    s().setChannelStripTab(null);
    expect(s().dockMaximized).toBe(false);
  });
});
