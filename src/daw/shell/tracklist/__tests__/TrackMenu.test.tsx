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

// ── A track's ⋯ menu (milestones 2.6 and 2.15) ─────────────────────────────
// It starts with the name, a field to type over: Enter, leaving it or
// closing the menu renames as one undo step, but only a name typed there;
// Escape puts it back. Its keys are its own (letters never jump the menu to
// an item) and ↓ goes on to the first item. Then Colour, Role, Duplicate
// track (⌘D), Monitor, Test sound, Show automation, Export track ▸, Release
// and Delete. On a track a collaborator holds, what would change it is off.
// A right-click on a row selects it and opens the same menu at the pointer;
// closing it gives focus back to the row's name.
//
// Run: npx vitest run src/daw/shell/tracklist/__tests__/TrackMenu.test.tsx

const h = vi.hoisted(() => ({ toast: vi.fn(), notice: vi.fn() }));
vi.mock('sonner', () => ({ toast: h.toast }));
vi.mock('@/daw/shell/notice', () => ({ notice: h.notice }));

import { shortcutKeys } from '@/daw/commands/shortcuts';
import type { UserPresence } from '@/daw/collab/types';
import {
  DEFAULT_EXPORT_CHOICES,
  useExportDialogStore,
} from '@/daw/shell/export/exportDialogStore';
import { useStore } from '@/daw/store';
import {
  resetHistory,
  startHistory,
  undo,
  undoLabel,
} from '@/daw/store/history';
import type { AudioClip, MidiClip } from '@/daw/store/tracksSlice';
import { TrackList } from '../TrackList';

const s = () => useStore.getState();
const names = () => s().tracks.map((t) => t.name);
const exportState = () => useExportDialogStore.getState();
const DUPLICATE_LABEL = shortcutKeys('tracks.duplicate').label;

// The editor's focus moves wait a frame: held here and run on flushFrames,
// after Radix has given focus back to whatever opened the menu, as a
// browser's next frame comes after it.
let frames: FrameRequestCallback[] = [];
const raf = window.requestAnimationFrame;
const getContext = HTMLCanvasElement.prototype.getContext;
beforeAll(() => {
  // jsdom has no 2D canvas: the row meters just don't draw.
  HTMLCanvasElement.prototype.getContext = (() =>
    null) as unknown as typeof getContext;
  window.requestAnimationFrame = (cb) => {
    frames.push(cb);
    return frames.length;
  };
});
afterAll(() => {
  window.requestAnimationFrame = raf;
  HTMLCanvasElement.prototype.getContext = getContext;
});

/** Lets Radix's close settle (its focus return waits a tick), then a frame. */
async function flushFrames() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  act(() => {
    const due = frames;
    frames = [];
    for (const cb of due) cb(0);
  });
}

let stopHistory: () => void;
let rhodes = '';
let drums = '';
let vox = '';

const note = {
  note: 60,
  velocity: 100,
  startTick: 0,
  durationTicks: 480,
  channel: 0,
};

beforeEach(() => {
  frames = [];
  useStore.setState({
    tracks: [],
    selectedTrackId: null,
    remoteUsers: new Map(),
    isCollabActive: false,
    isRecording: false,
    automationOpenTrackId: null,
  });
  rhodes = s().addTrack('midi', 'piano-sampler', 'Rhodes');
  drums = s().addTrack('midi', 'drum-machine', 'Drums');
  vox = s().addTrack('audio', 'none', 'Vox');
  s().addMidiClip(rhodes, {
    id: 'rhodes-clip',
    startTick: 0,
    events: [note],
  } as MidiClip);
  s().setSelectedTrackId(null);
  useExportDialogStore.setState({
    isOpen: false,
    tab: 'audio',
    choices: DEFAULT_EXPORT_CHOICES,
  });
  resetHistory();
  stopHistory = startHistory();
  h.toast.mockClear();
  h.notice.mockClear();
});

afterEach(() => {
  stopHistory();
  cleanup();
});

/** Opens a row's ⋯ menu from the keyboard (Radix opens it so in jsdom). */
function openMenu(name: string) {
  fireEvent.keyDown(screen.getByRole('button', { name: `More for ${name}` }), {
    key: 'Enter',
  });
  return screen.getByTestId('track-menu');
}

const nameField = () => screen.getByTestId('track-menu-name');
const menuItems = (menu: HTMLElement) =>
  Array.from(
    menu.querySelectorAll<HTMLElement>(
      '[role="menuitem"], [role="menuitemcheckbox"]',
    ),
  );
const itemNamed = (menu: HTMLElement, text: string) =>
  menuItems(menu).find((el) => el.textContent?.startsWith(text))!;
const selector = (name: string) =>
  screen.getByRole('button', { name: new RegExp(`^${name}, track`) });

/** Opens Export track ▸ (the arrow key on its trigger). */
function openExportSub(menu: HTMLElement) {
  const trigger = within(menu).getByTestId('track-menu-export');
  trigger.focus();
  fireEvent.keyDown(trigger, { key: 'ArrowRight' });
}

/** A collaborator holding `trackId`. */
function heldBySam(trackId: string) {
  useStore.setState({
    isCollabActive: true,
    remoteUsers: new Map([
      [
        2,
        {
          userId: 'u2',
          userName: 'Sam',
          color: '#22aaff',
          selectedTrackId: trackId,
          selectedClipId: null,
          cursorTick: null,
        } as unknown as UserPresence,
      ],
    ]),
  });
}

describe('the ⋯ menu’s items', () => {
  it('starts with the name, then Colour, Role, Duplicate … Delete', () => {
    render(<TrackList />);
    const menu = openMenu('Rhodes');
    const field = nameField();
    expect(field).toHaveValue('Rhodes');
    expect(field).toHaveAccessibleName('Name of Rhodes');
    // The field comes before every item.
    expect(
      field.compareDocumentPosition(menuItems(menu)[0]) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      menuItems(menu).map((el) =>
        el.textContent?.replace(DUPLICATE_LABEL, '').trim(),
      ),
    ).toEqual([
      'Colour',
      'Role for chord analysis',
      'Duplicate track',
      'Monitor input',
      'Test sound',
      'Show automation',
      'Export track',
      'Delete track',
    ]);
  });

  it('shows Duplicate’s shortcut', () => {
    render(<TrackList />);
    const menu = openMenu('Rhodes');
    const duplicate = within(menu).getByTestId('track-menu-duplicate');
    expect(DUPLICATE_LABEL).toMatch(/D$/);
    expect(duplicate).toHaveTextContent(DUPLICATE_LABEL);
  });

  it('has no Test sound on an audio track', () => {
    render(<TrackList />);
    const menu = openMenu('Vox');
    expect(itemNamed(menu, 'Test sound')).toBeUndefined();
  });

  it('adds Release to others on the track you hold in a session', () => {
    useStore.setState({ isCollabActive: true });
    s().setSelectedTrackId(drums);
    render(<TrackList />);
    const menu = openMenu('Drums');
    fireEvent.click(itemNamed(menu, 'Release to others'));
    expect(s().selectedTrackId).toBeNull();
  });
});

describe('the name field', () => {
  it('renames on Enter, as one undo step', () => {
    render(<TrackList />);
    openMenu('Rhodes');
    fireEvent.change(nameField(), { target: { value: '  Keys  ' } });
    fireEvent.keyDown(nameField(), { key: 'Enter' });
    expect(names()[0]).toBe('Keys');
    expect(undoLabel()).toBe('Rename track');

    act(() => undo());
    expect(names()[0]).toBe('Rhodes');
  });

  it('renames on leaving the field', () => {
    render(<TrackList />);
    openMenu('Drums');
    fireEvent.change(nameField(), { target: { value: 'Beat' } });
    fireEvent.blur(nameField());
    expect(names()[1]).toBe('Beat');
    expect(undoLabel()).toBe('Rename track');
  });

  it('renames when the menu closes with the name typed, once', () => {
    render(<TrackList />);
    const menu = openMenu('Drums');
    fireEvent.change(nameField(), { target: { value: 'Beat' } });
    // Escape anywhere but the field closes the menu, keeping what was typed.
    fireEvent.keyDown(menu, { key: 'Escape' });
    expect(screen.queryByTestId('track-menu')).toBeNull();
    expect(names()[1]).toBe('Beat');

    act(() => undo());
    expect(names()[1]).toBe('Drums');
  });

  it('leaves a name it wasn’t typed in alone, even one a partner changed', () => {
    render(<TrackList />);
    const menu = openMenu('Drums');
    // A partner renames the track while the menu is open.
    act(() => s().updateTrack(drums, { name: 'Their beat' }));
    resetHistory();
    fireEvent.keyDown(menu, { key: 'Escape' });
    expect(screen.queryByTestId('track-menu')).toBeNull();
    expect(names()[1]).toBe('Their beat');
    expect(undoLabel()).toBeNull();
  });

  it('ignores an empty or unchanged name', () => {
    render(<TrackList />);
    openMenu('Rhodes');
    fireEvent.change(nameField(), { target: { value: '   ' } });
    fireEvent.keyDown(nameField(), { key: 'Enter' });
    fireEvent.change(nameField(), { target: { value: 'Rhodes' } });
    fireEvent.keyDown(nameField(), { key: 'Enter' });
    expect(names()[0]).toBe('Rhodes');
    expect(undoLabel()).toBeNull();
  });

  it('puts the name back on Escape and closes', () => {
    render(<TrackList />);
    openMenu('Rhodes');
    fireEvent.change(nameField(), { target: { value: 'Nope' } });
    fireEvent.keyDown(nameField(), { key: 'Escape' });
    expect(screen.queryByTestId('track-menu')).toBeNull();
    expect(names()[0]).toBe('Rhodes');
    expect(undoLabel()).toBeNull();
  });

  it('keeps letters to itself: no menu typeahead', () => {
    render(<TrackList />);
    openMenu('Rhodes');
    const field = nameField();
    field.focus();
    // 'D' would jump the menu to Duplicate track or Delete track.
    for (const key of ['D', 'd', 'e', 'M']) {
      fireEvent.keyDown(field, { key });
      expect(document.activeElement).toBe(field);
    }
  });

  it('goes on to the first item with ↓', () => {
    render(<TrackList />);
    openMenu('Rhodes');
    nameField().focus();
    fireEvent.keyDown(nameField(), { key: 'ArrowDown' });
    expect(document.activeElement).toHaveTextContent('Colour');
  });

  it('is off, with what would change the track, while a collaborator holds it', () => {
    heldBySam(rhodes);
    render(<TrackList />);
    const menu = openMenu('Rhodes');
    expect(nameField()).toBeDisabled();
    for (const text of [
      'Colour',
      'Role for chord analysis',
      'Monitor input',
      'Delete track',
    ]) {
      expect(itemNamed(menu, text)).toHaveAttribute('data-disabled');
    }
    // Duplicate and Export leave the track as it is.
    expect(
      within(menu).getByTestId('track-menu-duplicate'),
    ).not.toHaveAttribute('data-disabled');
    expect(within(menu).getByTestId('track-menu-export')).not.toHaveAttribute(
      'data-disabled',
    );
  });
});

describe('Duplicate track', () => {
  it('puts the copy after the track, selects it and moves focus to its row', async () => {
    render(<TrackList />);
    const menu = openMenu('Rhodes');
    fireEvent.click(within(menu).getByTestId('track-menu-duplicate'));
    expect(names()).toEqual(['Rhodes', 'Rhodes copy', 'Drums', 'Vox']);
    const copy = s().tracks[1];
    expect(copy.id).not.toBe(rhodes);
    expect(copy.midiClips[0].events).toHaveLength(1);
    expect(s().selectedTrackId).toBe(copy.id);
    expect(undoLabel()).toBe('Duplicate track');

    await flushFrames();
    expect(screen.queryByTestId('track-menu')).toBeNull();
    expect(document.activeElement).toBe(selector('Rhodes copy'));
  });

  it('works on a track a collaborator holds', () => {
    heldBySam(rhodes);
    render(<TrackList />);
    const menu = openMenu('Rhodes');
    fireEvent.click(within(menu).getByTestId('track-menu-duplicate'));
    expect(names()).toEqual(['Rhodes', 'Rhodes copy', 'Drums', 'Vox']);
  });
});

describe('Export track ▸', () => {
  it('is off when the track plays nothing', () => {
    render(<TrackList />);
    const menu = openMenu('Drums');
    expect(within(menu).getByTestId('track-menu-export')).toHaveAttribute(
      'data-disabled',
    );
  });

  it('opens the Export dialog on the track, as WAV with or without effects', () => {
    render(<TrackList />);
    openExportSub(openMenu('Rhodes'));
    for (const id of [
      'track-menu-export-wav',
      'track-menu-export-wav-dry',
      'track-menu-export-midi',
      'track-menu-export-musicxml',
    ]) {
      expect(screen.getByTestId(id)).not.toHaveAttribute('data-disabled');
    }
    useExportDialogStore.setState({
      choices: { ...DEFAULT_EXPORT_CHOICES, format: 'opus' },
    });
    fireEvent.click(screen.getByTestId('track-menu-export-wav'));
    expect(exportState()).toMatchObject({ isOpen: true, tab: 'audio' });
    expect(exportState().choices).toMatchObject({
      what: 'track',
      trackId: rhodes,
      format: 'wav',
      dry: false,
    });

    act(() => exportState().close());
    openExportSub(openMenu('Rhodes'));
    fireEvent.click(screen.getByTestId('track-menu-export-wav-dry'));
    expect(exportState().choices).toMatchObject({
      what: 'track',
      trackId: rhodes,
      dry: true,
    });
  });

  it('opens it on Notation for MIDI and MusicXML', () => {
    render(<TrackList />);
    openExportSub(openMenu('Rhodes'));
    fireEvent.click(screen.getByTestId('track-menu-export-midi'));
    expect(exportState()).toMatchObject({ isOpen: true, tab: 'notation' });
    expect(exportState().choices).toMatchObject({
      what: 'track',
      trackId: rhodes,
      notation: 'midi',
    });

    act(() => exportState().close());
    openExportSub(openMenu('Rhodes'));
    fireEvent.click(screen.getByTestId('track-menu-export-musicxml'));
    expect(exportState()).toMatchObject({ isOpen: true, tab: 'notation' });
    expect(exportState().choices).toMatchObject({
      trackId: rhodes,
      notation: 'score',
    });
  });

  it('has MIDI and MusicXML off on a track without notes', () => {
    s().addAudioClip(vox, {
      id: 'take',
      startTick: 0,
      duration: 1920,
      fadeInTicks: 0,
      fadeOutTicks: 0,
    } as AudioClip);
    render(<TrackList />);
    openExportSub(openMenu('Vox'));
    expect(screen.getByTestId('track-menu-export-wav')).not.toHaveAttribute(
      'data-disabled',
    );
    expect(screen.getByTestId('track-menu-export-midi')).toHaveAttribute(
      'data-disabled',
    );
    expect(screen.getByTestId('track-menu-export-musicxml')).toHaveAttribute(
      'data-disabled',
    );
  });
});

describe('a right-click on a row', () => {
  it('selects the track and opens its menu, which gives focus back to the name', async () => {
    render(<TrackList />);
    const row = screen.getAllByTestId('track-row')[1];
    fireEvent.contextMenu(row, { clientX: 120, clientY: 80 });
    expect(s().selectedTrackId).toBe(drums);
    const menu = screen.getByTestId('track-menu');
    expect(menu).toHaveAttribute('aria-label', 'Drums menu');
    expect(nameField()).toHaveValue('Drums');
    // At the pointer: the menu hangs off a point there.
    const anchor = document.getElementById(
      menu.getAttribute('aria-labelledby')!,
    )!;
    expect(anchor.style.left).toBe('120px');
    expect(anchor.style.top).toBe('80px');

    fireEvent.keyDown(menu, { key: 'Escape' });
    await flushFrames();
    expect(screen.queryByTestId('track-menu')).toBeNull();
    expect(document.activeElement).toBe(selector('Drums'));
  });

  it('leaves a collaborator’s track theirs, but still opens the menu', () => {
    heldBySam(drums);
    s().setSelectedTrackId(rhodes);
    render(<TrackList />);
    fireEvent.contextMenu(screen.getAllByTestId('track-row')[1]);
    expect(s().selectedTrackId).toBe(rhodes);
    expect(h.notice).not.toHaveBeenCalled();
    expect(screen.getByTestId('track-menu')).toHaveAttribute(
      'aria-label',
      'Drums menu',
    );
    expect(nameField()).toBeDisabled();
  });

  it('leaves the browser’s own menu to the name while it is being renamed', () => {
    render(<TrackList />);
    fireEvent.doubleClick(selector('Vox'));
    const field = screen.getByRole('textbox', { name: 'Name of Vox' });
    const event = fireEvent.contextMenu(field);
    // Not prevented: the browser's menu (cut, copy, paste) opens.
    expect(event).toBe(true);
    expect(screen.queryByTestId('track-menu')).toBeNull();
  });
});
