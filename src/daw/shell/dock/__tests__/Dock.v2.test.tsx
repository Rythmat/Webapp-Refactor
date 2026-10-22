// @vitest-environment jsdom
/**
 * The editor dock v2 (milestone 2.9; decision 16, after Soundtrap's drawer).
 *
 * - Its body by what the selected track is and the tab open. It has no tab
 *   bar since the floating frame (2026-10-21): the bottom rail's dock views
 *   open the tabs (DockViews.test). The ids are unchanged.
 * - Selection drives it: it follows the selected track, keeping the tab
 *   that applies, and a click on a clip opens that clip's editor.
 * - Master opens in the same slot, as its Effects (owner, 2026-10-22: like
 *   a track's dock); Maximize grows it over the canvas, and
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
  within,
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
  DrumMachineViewPart,
  EffectsPanelPart,
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
      DrumMachineViewPart,
      EffectsPanelPart,
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
    const keys = add('midi', 'soundfont', 'Keys');
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

  it('drums: Notes is the drum grid', () => {
    const drums = add('midi', 'drum-machine', 'Drums');
    s().setSelectedTrackId(drums);
    s().setChannelStripTab('piano-roll');
    render(<Dock />);
    expect(tabLabels()).toEqual([]);
    expect(screen.getByTestId('body-drum-grid')).toBeTruthy();
  });

  it('audio: no tab bar, the chain', () => {
    const take = add('audio', 'none', 'Take');
    s().setSelectedTrackId(take);
    s().setChannelStripTab('controls');
    render(<Dock />);
    expect(tabLabels()).toEqual([]);
    expect(screen.getByTestId('body-effects')).toBeTruthy();
  });

  it('an Audio track: one dock, whatever the tab', () => {
    const audio = add('audio', 'audio-input', 'Guitar');
    s().setSelectedTrackId(audio);
    s().setChannelStripTab('fx');
    render(<Dock />);
    expect(tabLabels()).toEqual([]);
    // Its effects share the dock with its input and chain (2026-10-22).
    expect(screen.getByTestId('body-instrument')).toBeTruthy();
    expect(screen.queryByTestId('body-effects')).toBeNull();
  });

  it('an Audio Track is live input too: its input and tuner', () => {
    const audio = add('audio', 'audio-input', 'Audio Track');
    s().setSelectedTrackId(audio);
    s().setChannelStripTab('controls');
    render(<Dock />);
    expect(tabLabels()).toEqual([]);
    expect(screen.queryByRole('radiogroup', { name: 'Chain' })).toBeNull();
    expect(screen.getByTestId('body-instrument')).toBeTruthy();
  });
});

describe('selection drives the dock', () => {
  it('keeps the tab that applies, and takes Instrument for Prism on drums', () => {
    const keys = add('midi', 'soundfont', 'Keys');
    const drums = add('midi', 'drum-machine', 'Drums');
    s().setSelectedTrackId(keys);
    s().setChannelStripTab('piano-roll');
    render(<Dock />);

    act(() => s().setSelectedTrackId(drums));
    expect(s().channelStripTab).toBe('piano-roll');

    act(() => s().setChannelStripTab('prism'));
    // Prism is a melodic track's; the drums' grooves are in Instrument.
    expect(s().channelStripTab).toBe('controls');
    act(() => s().setSelectedTrackId(keys));
    expect(s().channelStripTab).toBe('controls');
  });

  it('a clip click selects its track and opens its editor', () => {
    const keys = add('midi', 'soundfont', 'Keys');
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
    const keys = add('midi', 'soundfont', 'Keys');
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
    const keys = add('midi', 'soundfont', 'Keys');
    const synth = add('midi', 'oracle-synth', 'Synth');
    s().setSelectedTrackId(keys);
    s().setChannelStripTab('prism');
    useStore.setState({ activeTutorialId: 'make-first-track' } as never);
    openClipEditor(synth);
    expect(s().selectedTrackId).toBe(synth);
    expect(s().channelStripTab).toBe('prism');
  });
});

describe('the automation lane', () => {
  it('shows in the dock, over the tab, and shuts with it', () => {
    const synth = add('midi', 'oracle-synth', 'Synth');
    s().setSelectedTrackId(synth);
    s().setChannelStripTab(null);
    render(<Dock />);
    expect(screen.queryByTestId('automation-lane-editor')).toBeNull();

    // The lane alone opens the dock.
    act(() => s().setAutomationOpenTrackId(synth));
    expect(screen.getByTestId('dock').dataset.tab).toBe('automation');
    expect(screen.getByTestId('automation-lane-editor')).toBeTruthy();

    fireEvent.click(screen.getByTestId('dock-toggle'));
    expect(s().automationOpenTrackId).toBeNull();
    expect(screen.queryByTestId('automation-lane-editor')).toBeNull();
  });
});

describe('the automation lane’s parameters', () => {
  it('lists every parameter it can automate, a click showing that lane', () => {
    const synth = add('midi', 'oracle-synth', 'Synth');
    s().setSelectedTrackId(synth);
    s().upsertAutomationPoint(synth, 'pan', { tick: 0, value: 0.5 });
    render(<Dock />);
    act(() => s().setAutomationOpenTrackId(synth));

    const list = screen.getByRole('group', { name: 'Automate' });
    // A list, not a drop-down.
    expect(list.querySelector('select')).toBeNull();
    const names = within(list)
      .getAllByRole('button')
      .map((b) => b.textContent);
    expect(names).toEqual(['Volume', 'Pan', 'Send A', 'Send B']);
    const volume = within(list).getByRole('button', { name: 'Volume' });
    const pan = within(list).getByRole('button', { name: /^Pan/ });
    expect(volume).toHaveAttribute('aria-pressed', 'true');
    // Pan has points already: it is marked.
    expect(pan).toHaveAttribute('data-automated', 'true');
    expect(volume).not.toHaveAttribute('data-automated');

    fireEvent.click(pan);
    expect(s().automationParamId).toBe('pan');
    expect(pan).toHaveAttribute('aria-pressed', 'true');
    expect(volume).toHaveAttribute('aria-pressed', 'false');
  });
});

describe('the title row', () => {
  it('is gone while open on a track: Close floats in the corner', () => {
    const synth = add('midi', 'oracle-synth', 'Synth');
    s().setSelectedTrackId(synth);
    s().setChannelStripTab('controls');
    render(<Dock />);
    expect(screen.queryByTestId('dock-track-name')).toBeNull();
    expect(screen.getByTestId('dock-header').dataset.floating).toBeDefined();
    // No Maximize (owner, 2026-10-22): what needs room has its own Expand.
    expect(screen.queryByRole('button', { name: /maximize/i })).toBeNull();
    expect(screen.queryByTestId('dock-restore')).toBeNull();
    fireEvent.click(screen.getByTestId('dock-toggle'));
    expect(s().channelStripTab).toBeNull();
    // Shut, the row comes back with the track's name and the way to open.
    expect(screen.getByTestId('dock-track-name')).toHaveTextContent('Synth');
    expect(screen.getByTestId('dock-header').dataset.floating).toBeUndefined();
  });

  it('goes for Master too, with no Bypass in its controls', () => {
    s().setDockMaster(true);
    render(<Dock />);
    expect(screen.queryByRole('heading', { name: 'Master' })).toBeNull();
    const header = screen.getByTestId('dock-header');
    expect(header.dataset.floating).toBeDefined();
    // No Bypass on the dock (owner, 2026-10-22): only Close.
    expect(screen.queryByTestId('dock-master-bypass')).toBeNull();
    expect(screen.queryByRole('button', { name: /bypass/i })).toBeNull();
    expect(header).toContainElement(screen.getByTestId('dock-toggle'));
  });
});

describe('Master in the dock’s slot', () => {
  it('shows Master’s Effects, and gives the slot back when a track is chosen', () => {
    const keys = add('midi', 'soundfont', 'Keys');
    const pad = add('midi', 'soundfont', 'Pad');
    s().setSelectedTrackId(keys);
    render(<Dock />);

    act(() => s().setDockMaster(true));
    expect(screen.getByTestId('body-effects')).toBeTruthy();
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
    expect(screen.queryByTestId('body-effects')).toBeNull();
  });
});

describe('a maximized dock: Restore and Escape', () => {
  it('shows Restore only while maximized (the effect cards’ Show all)', () => {
    const keys = add('midi', 'soundfont', 'Keys');
    s().setSelectedTrackId(keys);
    s().setChannelStripTab('piano-roll');
    render(<Dock />);
    expect(screen.queryByTestId('dock-restore')).toBeNull();
    act(() => s().setDockMaximized(true));
    fireEvent.click(screen.getByTestId('dock-restore'));
    expect(s().dockMaximized).toBe(false);
    expect(screen.queryByTestId('dock-restore')).toBeNull();
  });

  it('restores on Escape wherever focus is', () => {
    const keys = add('midi', 'soundfont', 'Keys');
    s().setSelectedTrackId(keys);
    s().setChannelStripTab('piano-roll');
    render(<Dock />);
    act(() => s().setDockMaximized(true));
    expect(s().dockMaximized).toBe(true);

    fireEvent.keyDown(document.body, { key: 'Escape', code: 'Escape' });
    expect(s().dockMaximized).toBe(false);
    // Restored, not shut.
    expect(s().channelStripTab).toBe('piano-roll');
  });

  it('shuts on Escape from inside the dock', () => {
    const keys = add('midi', 'soundfont', 'Keys');
    s().setSelectedTrackId(keys);
    s().setChannelStripTab('fx');
    render(<Dock />);
    const body = document.querySelector<HTMLElement>('[data-dock-content]')!;
    body.focus();
    fireEvent.keyDown(body, { key: 'Escape', code: 'Escape' });
    expect(s().channelStripTab).toBeNull();
  });

  it('a shut dock is never maximized', () => {
    const keys = add('midi', 'soundfont', 'Keys');
    s().setSelectedTrackId(keys);
    s().setChannelStripTab('fx');
    s().setDockMaximized(true);
    s().setChannelStripTab(null);
    expect(s().dockMaximized).toBe(false);
  });
});
