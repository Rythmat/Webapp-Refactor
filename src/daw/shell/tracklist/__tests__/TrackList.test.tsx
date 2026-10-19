// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
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

// ── The track list (milestone 2.6) ─────────────────────────────────────────
// 64 px rows with M, S, Arm and the fader named in full and showing their
// state as pressed (timeline-21); the keyboard moves the selection (A11Y#3),
// mutes, solos, renames and reorders; the ⋯ menu deletes with Undo. Since
// 2.15 the row's instrument button opens the track in the dock, and the
// selected row has an edge in its track's colour. (The ⋯ menu itself, and
// the right-click that opens it: TrackMenu.test.tsx.)

const h = vi.hoisted(() => ({ toast: vi.fn() }));
vi.mock('sonner', () => ({ toast: h.toast }));

import { installKeyDispatcher } from '@/daw/commands/dispatcher';
import { useStore } from '@/daw/store';
import { contrastRatio } from '@/daw/ui/color';
import { COLOR } from '@/daw/ui/tokens';
import { resetHistory, startHistory } from '@/daw/store/history';
import { TrackList } from '../TrackList';

const s = () => useStore.getState();
const names = () => s().tracks.map((t) => t.name);
const selector = (name: string) =>
  screen.getByRole('button', { name: new RegExp(`^${name}, track`) });

let uninstall: () => void;
let stopHistory: () => void;
// The editor's rAF focus moves: run them now.
const raf = window.requestAnimationFrame;
// jsdom has no 2D canvas: the row meters just don't draw.
const getContext = HTMLCanvasElement.prototype.getContext;
beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = (() =>
    null) as unknown as typeof getContext;
  uninstall = installKeyDispatcher();
  window.requestAnimationFrame = (cb) => {
    cb(0);
    return 0;
  };
});
afterAll(() => {
  uninstall();
  window.requestAnimationFrame = raf;
  HTMLCanvasElement.prototype.getContext = getContext;
});

beforeEach(() => {
  useStore.setState({
    tracks: [],
    selectedTrackId: null,
    remoteUsers: new Map(),
    singleKeyShortcuts: true,
    automationOpenTrackId: null,
  });
  s().addTrack('midi', 'piano-sampler', 'Rhodes');
  s().addTrack('midi', 'drum-machine', 'Drums');
  s().addTrack('audio', 'vocal-fx', 'Vox');
  s().setSelectedTrackId(null);
  resetHistory();
  stopHistory = startHistory();
  h.toast.mockClear();
});

afterEach(() => {
  stopHistory();
  cleanup();
});

describe('a track row', () => {
  it('names every control in full and shows state as pressed', () => {
    render(<TrackList />);
    const row = screen.getAllByTestId('track-row')[0];
    const mute = within(row).getByRole('button', { name: 'Mute Rhodes' });
    expect(mute).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(mute);
    expect(s().tracks[0].mute).toBe(true);
    expect(mute).toHaveAttribute('aria-pressed', 'true');
    expect(
      within(row).getByRole('button', { name: 'Solo Rhodes' }),
    ).toBeInTheDocument();
    expect(
      within(row).getByRole('button', { name: 'Arm Rhodes to record' }),
    ).toBeInTheDocument();
    expect(
      within(row).getByRole('slider', { name: 'Volume of Rhodes' }),
    ).toHaveAttribute('aria-valuetext');
    expect(
      within(row).getByRole('button', { name: 'More for Rhodes' }),
    ).toBeInTheDocument();
    expect(row.style.height).toBe('64px');
  });

  it('selects its track from the name, which is the one Tab stop', () => {
    render(<TrackList />);
    expect(selector('Rhodes')).toHaveAttribute('tabindex', '0');
    expect(selector('Drums')).toHaveAttribute('tabindex', '-1');
    fireEvent.click(selector('Drums'));
    expect(s().selectedTrackId).toBe(s().tracks[1].id);
    expect(selector('Drums')).toHaveAttribute('aria-pressed', 'true');
    expect(selector('Drums')).toHaveAttribute('tabindex', '0');
  });

  it('carries the lessons’ ⋯ anchor on the selected row only', () => {
    s().setSelectedTrackId(s().tracks[2].id);
    render(<TrackList />);
    const anchors = document.querySelectorAll(
      '[data-tutorial-id="track-menu-button"]',
    );
    expect(anchors).toHaveLength(1);
    expect(anchors[0]).toHaveAccessibleName('More for Vox');
  });
});

describe('a track row’s instrument button', () => {
  it('shows the track’s instrument', () => {
    render(<TrackList />);
    const [keys, drums, vox] = screen.getAllByTestId('track-instrument-button');
    expect(keys).toHaveAccessibleName('Open Rhodes’s instrument');
    expect(keys.querySelector('svg.lucide-piano')).not.toBeNull();
    expect(drums.querySelector('svg.lucide-drum')).not.toBeNull();
    expect(vox.querySelector('svg.lucide-mic')).not.toBeNull();
  });

  it('selects the track and opens its instrument in the dock, focus there', () => {
    useStore.setState({ channelStripTab: null, dockMaster: false });
    const dock = document.createElement('div');
    dock.tabIndex = -1;
    dock.setAttribute('data-dock-content', '');
    document.body.append(dock);
    render(<TrackList />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Open Drums’s instrument' }),
    );
    expect(s().selectedTrackId).toBe(s().tracks[1].id);
    expect(s().channelStripTab).toBe('controls');
    expect(document.activeElement).toBe(dock);
    dock.remove();
  });

  it('opens an audio track’s effects', () => {
    useStore.setState({ channelStripTab: null });
    s().addTrack('audio', 'none', 'Take');
    s().setSelectedTrackId(null);
    render(<TrackList />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Open Take’s instrument' }),
    );
    expect(s().selectedTrackId).toBe(s().tracks[3].id);
    expect(s().channelStripTab).toBe('fx');
  });
});

describe('the instrument glyph’s colour', () => {
  const ROW = COLOR['surface-1'].value;
  const glyph = (name: string) =>
    screen.getByRole('button', { name: `Open ${name}’s instrument` });

  it('leaves a dark track colour out of an unselected row', () => {
    // A wine red: under 3:1 on the row, so the glyph takes the row's text.
    expect(contrastRatio('#450920', ROW)).toBeLessThan(3);
    s().updateTrack(s().tracks[0].id, { color: '#450920' });
    render(<TrackList />);
    expect(glyph('Rhodes').style.color).toBe('');
    expect(glyph('Rhodes').style.backgroundColor).toBe('');
  });

  it('keeps a light track colour on the glyph', () => {
    expect(contrastRatio('#f5d76e', ROW)).toBeGreaterThanOrEqual(3);
    s().updateTrack(s().tracks[0].id, { color: '#f5d76e' });
    render(<TrackList />);
    expect(glyph('Rhodes').style.color).toBe('rgb(245, 215, 110)');
  });

  it('fills the selected row’s button with the track colour, dark or not', () => {
    s().updateTrack(s().tracks[0].id, { color: '#450920' });
    s().setSelectedTrackId(s().tracks[0].id);
    render(<TrackList />);
    expect(glyph('Rhodes').style.backgroundColor).toBe('rgb(69, 9, 32)');
    expect(glyph('Rhodes').style.color).not.toBe('');
  });
});

describe('the track menu from the keys', () => {
  const menuName = () =>
    screen.queryByTestId('track-menu')?.getAttribute('aria-label') ?? null;

  it('opens a track’s ⋯ menu with ⇧F10 on its name', () => {
    render(<TrackList />);
    selector('Drums').focus();
    fireEvent.keyDown(selector('Drums'), {
      key: 'F10',
      code: 'F10',
      shiftKey: true,
    });
    expect(menuName()).toBe('Drums menu');
  });

  it('opens it with ⌥Return too', () => {
    render(<TrackList />);
    selector('Vox').focus();
    fireEvent.keyDown(selector('Vox'), {
      key: 'Enter',
      code: 'Enter',
      altKey: true,
    });
    expect(menuName()).toBe('Vox menu');
  });

  it('opens it with the menu key, and keeps the browser’s menu shut', () => {
    render(<TrackList />);
    selector('Rhodes').focus();
    fireEvent.keyDown(selector('Rhodes'), {
      key: 'ContextMenu',
      code: 'ContextMenu',
    });
    expect(menuName()).toBe('Rhodes menu');
    // The key's own contextmenu event, as it comes up.
    const native = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(native);
    expect(native.defaultPrevented).toBe(true);
  });

  it('does nothing on another of the row’s controls', () => {
    render(<TrackList />);
    const mute = screen.getByRole('button', { name: 'Mute Drums' });
    mute.focus();
    fireEvent.keyDown(mute, { key: 'F10', code: 'F10', shiftKey: true });
    fireEvent.keyDown(mute, { key: 'ContextMenu', code: 'ContextMenu' });
    expect(menuName()).toBeNull();
  });
});

describe('the selected row', () => {
  it('has an edge in its track’s colour; the others don’t', () => {
    s().setSelectedTrackId(s().tracks[1].id);
    render(<TrackList />);
    const rows = screen.getAllByTestId('track-row');
    expect(within(rows[0]).queryByTestId('track-selected-edge')).toBeNull();
    expect(within(rows[2]).queryByTestId('track-selected-edge')).toBeNull();
    const edge = within(rows[1]).getByTestId('track-selected-edge');
    const probe = document.createElement('span');
    probe.style.backgroundColor = s().tracks[1].color;
    expect(edge.style.backgroundColor).toBe(probe.style.backgroundColor);
    expect(rows[1]).toHaveAttribute('aria-current', 'true');

    // The edge follows the selection.
    fireEvent.click(selector('Rhodes'));
    expect(
      within(rows[0]).getByTestId('track-selected-edge'),
    ).toBeInTheDocument();
    expect(within(rows[1]).queryByTestId('track-selected-edge')).toBeNull();
  });
});

describe('the track list’s keys', () => {
  it('moves the selection with the arrows, Home and End', () => {
    render(<TrackList />);
    selector('Rhodes').focus();
    fireEvent.keyDown(selector('Rhodes'), {
      key: 'ArrowDown',
      code: 'ArrowDown',
    });
    expect(s().selectedTrackId).toBe(s().tracks[1].id);
    expect(document.activeElement).toBe(selector('Drums'));
    fireEvent.keyDown(document.activeElement!, { key: 'End', code: 'End' });
    expect(s().selectedTrackId).toBe(s().tracks[2].id);
    fireEvent.keyDown(document.activeElement!, {
      key: 'ArrowDown',
      code: 'ArrowDown',
    });
    expect(s().selectedTrackId).toBe(s().tracks[2].id);
    fireEvent.keyDown(document.activeElement!, { key: 'Home', code: 'Home' });
    expect(s().selectedTrackId).toBe(s().tracks[0].id);
  });

  it('mutes and solos the focused track ahead of the metronome key', () => {
    render(<TrackList />);
    selector('Drums').focus();
    fireEvent.keyDown(selector('Drums'), { key: 'm', code: 'KeyM' });
    fireEvent.keyDown(selector('Drums'), { key: 's', code: 'KeyS' });
    expect(s().tracks[1].mute).toBe(true);
    expect(s().tracks[1].solo).toBe(true);
    expect(s().metronomeEnabled).toBe(false);
  });

  it('moves a track with Alt+arrows, as one undo step', () => {
    render(<TrackList />);
    selector('Rhodes').focus();
    fireEvent.keyDown(selector('Rhodes'), {
      key: 'ArrowDown',
      code: 'ArrowDown',
      altKey: true,
    });
    expect(names()).toEqual(['Drums', 'Rhodes', 'Vox']);
    expect(document.activeElement).toBe(selector('Rhodes'));
  });

  it('renames with F2: Enter keeps the name, Escape keeps the old one', () => {
    render(<TrackList />);
    selector('Vox').focus();
    fireEvent.keyDown(selector('Vox'), { key: 'F2', code: 'F2' });
    const field = screen.getByRole('textbox', { name: 'Name of Vox' });
    expect(document.activeElement).toBe(field);
    fireEvent.change(field, { target: { value: 'Lead vocal' } });
    fireEvent.keyDown(field, { key: 'Enter', code: 'Enter' });
    expect(names()[2]).toBe('Lead vocal');

    selector('Lead vocal').focus();
    fireEvent.keyDown(selector('Lead vocal'), { key: 'n', code: 'KeyN' });
    const again = screen.getByRole('textbox', { name: 'Name of Lead vocal' });
    fireEvent.change(again, { target: { value: 'Nope' } });
    fireEvent.keyDown(again, { key: 'Escape', code: 'Escape' });
    expect(names()[2]).toBe('Lead vocal');
  });

  it('leaves a toggle its own keys: Enter on Mute is not the track’s', () => {
    useStore.setState({ channelStripTab: null });
    render(<TrackList />);
    const mute = screen.getByRole('button', { name: 'Mute Rhodes' });
    mute.focus();
    fireEvent.keyDown(mute, { key: 'Enter', code: 'Enter' });
    expect(s().channelStripTab).toBeNull();
  });

  it('Enter on a track opens the dock on it', () => {
    useStore.setState({ channelStripTab: null });
    render(<TrackList />);
    selector('Drums').focus();
    fireEvent.keyDown(selector('Drums'), { key: 'Enter', code: 'Enter' });
    expect(s().selectedTrackId).toBe(s().tracks[1].id);
    expect(s().channelStripTab).toBe('controls');
  });
});

describe('reordering by the grip', () => {
  it('drops the row in the gap under the pointer, as one undo step', () => {
    render(<TrackList />);
    const list = screen.getByTestId('track-list');
    list.getBoundingClientRect = () =>
      ({ top: 100, left: 0, width: 200, height: 192 }) as DOMRect;
    const grip = screen.getAllByTestId('track-grip')[0];
    grip.setPointerCapture = () => {};
    // jsdom's PointerEvent has no button or pointerId: a MouseEvent with
    // the pointer's id stands in for each.
    const pointer = (type: string, clientY: number) =>
      Object.assign(
        new MouseEvent(type, { bubbles: true, button: 0, clientY }),
        { pointerId: 1 },
      );
    act(() => {
      grip.dispatchEvent(pointer('pointerdown', 110));
    });
    // Into the bottom half of the last row: below it.
    act(() => {
      grip.dispatchEvent(pointer('pointermove', 100 + 64 * 2 + 50));
    });
    expect(screen.getByTestId('track-drop-line').style.top).toBe('192px');
    act(() => {
      grip.dispatchEvent(pointer('pointerup', 100 + 64 * 2 + 50));
    });
    expect(names()).toEqual(['Drums', 'Vox', 'Rhodes']);
  });
});

describe('the ⋯ menu', () => {
  it('deletes a track with Undo on its toast', async () => {
    const { deleteTrack } = await import('../TrackMenu');
    const { undoLabel } = await import('@/daw/store/history');
    deleteTrack(s().tracks[1]);
    expect(names()).toEqual(['Rhodes', 'Vox']);
    expect(undoLabel()).toBe('Delete track');
    const [text, options] = h.toast.mock.calls[0];
    expect(text).toBe('Deleted Drums');
    options.action.onClick();
    expect(names()).toEqual(['Rhodes', 'Drums', 'Vox']);
  });
});
