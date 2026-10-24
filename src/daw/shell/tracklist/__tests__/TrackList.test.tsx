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
// 86 px rows after Suno's header (2026-10-21): the track's number, its name,
// Mute, Solo, Arm and its input named in full and showing their state as
// pressed (timeline-21), the volume pill and the pan dial; the track's
// colour down every row's edge. The keyboard moves the selection (A11Y#3),
// mutes, solos, renames and reorders; the ⋯ menu deletes with Undo. (The ⋯
// menu itself, and the right-click that opens it: TrackMenu.test.tsx.)

const h = vi.hoisted(() => ({ toast: vi.fn() }));
vi.mock('sonner', () => ({ toast: h.toast }));

import { installKeyDispatcher } from '@/daw/commands/dispatcher';
import { useStore } from '@/daw/store';
import {
  resetHistory,
  startHistory,
  undo,
  undoLabel,
} from '@/daw/store/history';
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
  s().addTrack('midi', 'soundfont', 'Rhodes');
  s().addTrack('midi', 'drum-machine', 'Drums');
  s().addTrack('audio', 'audio-input', 'Vox');
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
      within(row).getByRole('slider', { name: 'Pan of Rhodes' }),
    ).toHaveAttribute('aria-valuetext', 'Centre');
    // No ▾ of its own: the input is in the track's menu (2026-10-22).
    expect(
      within(row).queryByRole('button', { name: 'MIDI input of Rhodes' }),
    ).toBeNull();
    expect(
      within(row).getByRole('button', { name: 'More for Rhodes' }),
    ).toBeInTheDocument();
    expect(row.style.height).toBe('86px');
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

describe('the record button', () => {
  it('arms and monitors, then stops monitoring, then disarms', () => {
    render(<TrackList />);
    const t = () => s().tracks[0];
    const arm = () => screen.getAllByTestId('track-arm')[0];

    expect(arm()).toHaveAccessibleName('Arm Rhodes to record');
    expect(arm()).toHaveAttribute('data-arm-state', 'off');

    fireEvent.click(arm());
    expect(t()).toMatchObject({ recordArmed: true, monitoring: true });
    expect(arm()).toHaveAttribute('data-arm-state', 'monitoring');
    expect(arm()).toHaveAttribute('aria-pressed', 'true');
    expect(arm()).toHaveAccessibleName('Stop hearing Rhodes’s input');

    fireEvent.click(arm());
    expect(t()).toMatchObject({ recordArmed: true, monitoring: false });
    expect(arm()).toHaveAttribute('data-arm-state', 'armed');
    expect(arm()).toHaveAccessibleName('Disarm Rhodes');

    fireEvent.click(arm());
    expect(t()).toMatchObject({ recordArmed: false, monitoring: false });
    expect(arm()).toHaveAttribute('data-arm-state', 'off');
    expect(arm()).toHaveAttribute('aria-pressed', 'false');
  });

  it('disarms the others when it arms a track, with Record arm exclusive on', () => {
    useStore.setState({ recordArmExclusive: true });
    render(<TrackList />);
    const arm = (i: number) => screen.getAllByTestId('track-arm')[i];
    fireEvent.click(arm(0));
    fireEvent.click(arm(1));
    expect(s().tracks.map((t) => [t.recordArmed, t.monitoring])).toEqual([
      [false, false],
      [true, true],
      [false, false],
    ]);
    // Stepping the armed track on (to quiet, then off) leaves the others be.
    fireEvent.click(arm(2), { metaKey: true });
    fireEvent.click(arm(1));
    expect(s().tracks.map((t) => t.recordArmed)).toEqual([false, true, true]);
  });

  it('arms more than one with ⌘- or Ctrl-click', () => {
    useStore.setState({ recordArmExclusive: true });
    render(<TrackList />);
    const arm = (i: number) => screen.getAllByTestId('track-arm')[i];
    fireEvent.click(arm(0));
    fireEvent.click(arm(1), { metaKey: true });
    fireEvent.click(arm(2), { ctrlKey: true });
    expect(s().tracks.every((t) => t.recordArmed && t.monitoring)).toBe(true);
    // A plain click takes the arm back to one track.
    fireEvent.click(arm(2)); // armed, quiet: still armed, the others kept
    fireEvent.click(arm(2)); // off
    fireEvent.click(arm(2)); // armed again: it takes the arm
    expect(s().tracks.map((t) => t.recordArmed)).toEqual([false, false, true]);
  });

  it('arms tracks alongside each other with Record arm exclusive off', () => {
    useStore.setState({ recordArmExclusive: false });
    render(<TrackList />);
    const arm = (i: number) => screen.getAllByTestId('track-arm')[i];
    fireEvent.click(arm(0));
    fireEvent.click(arm(1));
    expect(s().tracks.map((t) => t.recordArmed)).toEqual([true, true, false]);
    useStore.setState({ recordArmExclusive: true });
  });

  it('arms a track already monitoring from the menu, and keeps it heard', () => {
    s().updateTrack(s().tracks[0].id, { monitoring: true });
    render(<TrackList />);
    fireEvent.click(screen.getAllByTestId('track-arm')[0]);
    expect(s().tracks[0]).toMatchObject({
      recordArmed: true,
      monitoring: true,
    });
  });
});

describe('a track row’s number and colour', () => {
  it('numbers the tracks in order, in place of an instrument icon', () => {
    render(<TrackList />);
    expect(
      screen.getAllByTestId('track-number').map((n) => n.textContent),
    ).toEqual(['1', '2', '3']);
    expect(screen.queryByTestId('track-instrument-button')).toBeNull();
  });

  it('opens the track’s settings from its number; M mutes (2026-10-23)', () => {
    render(<TrackList />);
    const number = screen.getAllByTestId('track-number')[1];
    expect(number).toHaveAccessibleName('More for Drums');
    fireEvent.keyDown(number, { key: 'Enter' });
    expect(screen.getByTestId('track-menu').getAttribute('aria-label')).toBe(
      'Drums menu',
    );
    expect(s().tracks[1].mute).toBe(false);

    const mute = screen.getAllByTestId('track-mute')[1];
    expect(mute).toHaveAccessibleName('Mute Drums');
    expect(mute).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(mute);
    expect(s().tracks[1].mute).toBe(true);
    expect(mute).toHaveAttribute('aria-pressed', 'true');
    expect(mute.textContent).toBe('M');
    fireEvent.click(mute);
    expect(s().tracks[1].mute).toBe(false);
  });

  it('runs every track’s colour down its row’s edge, fading it when muted', () => {
    render(<TrackList />);
    const bars = screen.getAllByTestId('track-colour-bar');
    expect(bars).toHaveLength(3);
    const probe = document.createElement('span');
    probe.style.backgroundColor = s().tracks[1].color;
    expect(bars[1].style.backgroundColor).toBe(probe.style.backgroundColor);
    fireEvent.click(screen.getByRole('button', { name: 'Mute Drums' }));
    expect(bars[1]).toHaveClass('opacity-40');
  });

  it('gives an audio track its input in its menu, not a ▾ of its own', () => {
    render(<TrackList />);
    expect(
      screen.queryByRole('button', { name: 'Audio input of Vox' }),
    ).toBeNull();
    fireEvent.keyDown(screen.getByRole('button', { name: 'More for Vox' }), {
      key: 'Enter',
    });
    const input = screen.getByTestId('track-menu-input');
    expect(input.textContent).toContain('Audio input');
    expect(input.textContent).toContain('Input 1');
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
  it('is lifted and marked current; the selection moves it', () => {
    s().setSelectedTrackId(s().tracks[1].id);
    render(<TrackList />);
    const rows = screen.getAllByTestId('track-row');
    expect(rows[1]).toHaveAttribute('aria-current', 'true');
    expect(rows[1]).toHaveClass('bg-daw-surface-2');
    expect(rows[0]).not.toHaveAttribute('aria-current');

    fireEvent.click(selector('Rhodes'));
    expect(rows[0]).toHaveAttribute('aria-current', 'true');
    expect(rows[1]).not.toHaveAttribute('aria-current');
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

  it('deletes the selected track with Delete, as one undo step, the next track taking its place', () => {
    render(<TrackList />);
    const drums = s().tracks[1].id;
    const vox = s().tracks[2].id;
    // A click on the row (not its name) selects it and gives it the keys.
    fireEvent.click(
      document.querySelector(`li[data-track-id="${drums}"]`) as HTMLElement,
    );
    expect(s().selectedTrackId).toBe(drums);
    expect(document.activeElement).toBe(selector('Drums'));
    fireEvent.keyDown(selector('Drums'), { key: 'Delete', code: 'Delete' });
    expect(s().tracks.map((t) => t.id)).not.toContain(drums);
    expect(undoLabel()).toBe('Delete track');
    expect(s().selectedTrackId).toBe(vox);
    expect(document.activeElement).toBe(selector('Vox'));
    // Backspace too (a Chromebook has no Delete key).
    fireEvent.keyDown(selector('Vox'), { key: 'Backspace', code: 'Backspace' });
    expect(s().tracks.map((t) => t.id)).toEqual([s().tracks[0].id]);
    undo();
    expect(s().tracks.map((t) => t.id)).toContain(vox);
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
      ({ top: 100, left: 0, width: 260, height: 258 }) as DOMRect;
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
      grip.dispatchEvent(pointer('pointermove', 100 + 86 * 2 + 50));
    });
    expect(screen.getByTestId('track-drop-line').style.top).toBe('258px');
    act(() => {
      grip.dispatchEvent(pointer('pointerup', 100 + 86 * 2 + 50));
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
