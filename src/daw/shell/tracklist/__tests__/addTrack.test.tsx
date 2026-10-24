// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ── Adding tracks: + Add track's menu ──────────────────────────────────────
// + Add track opens a menu of three rows (Suno's): Add Audio (A) makes an
// Audio Track open on its input, Add MIDI (M) opens a submenu of the MIDI
// instruments, and Upload (U) opens a file picker and makes no track
// itself. Each row's key picks it while the menu is open.

const h = vi.hoisted(() => ({ pick: vi.fn() }));
vi.mock('../uploadTrack', () => ({ pickAndUploadTrack: h.pick }));

import { useStore } from '@/daw/store';
import { AddTrackMenu } from '../AddTrackMenu';
import { openAddTrackMenu, useAddTrackMenu } from '../addTrack';

const s = () => useStore.getState();
const realAddTrack = useStore.getState().addTrack;

beforeEach(() => {
  useStore.setState({
    tracks: [],
    selectedTrackId: null,
    channelStripTab: null,
    activeTutorialId: null,
    addTrack: realAddTrack,
  });
  useAddTrackMenu.setState({ open: false });
  h.pick.mockClear();
});
afterEach(cleanup);

const menu = () => screen.getByTestId('add-track-menu');
const row = (item: string) => {
  const el = document.querySelector<HTMLElement>(`[data-item="${item}"]`);
  if (!el) throw new Error(`No row ${item}`);
  return el;
};
const openMenu = () => {
  render(<AddTrackMenu />);
  act(openAddTrackMenu);
};
const items = (el: HTMLElement) =>
  [...el.querySelectorAll('[data-item]')].map((e) =>
    e.getAttribute('data-item'),
  );

describe('+ Add track', () => {
  it('offers Add Audio, Add MIDI and Upload, each with its key but no keycap', () => {
    openMenu();
    expect(items(menu())).toEqual(['add:audio', 'add:midi', 'add:upload']);
    // The keys still pick the rows; the rows no longer show them.
    expect(row('add:audio').textContent).toBe('Add Audio');
    expect(row('add:audio').getAttribute('aria-keyshortcuts')).toBe('A');
    expect(row('add:midi').getAttribute('aria-keyshortcuts')).toBe('M');
    expect(row('add:upload').textContent).toBe('Upload');
    expect(row('add:upload').getAttribute('aria-keyshortcuts')).toBe('U');
  });

  it('keeps the lessons’ anchors', () => {
    render(<AddTrackMenu />);
    expect(
      document.querySelector('[data-tutorial-id="add-track-button"]'),
    ).toBe(screen.getByRole('button', { name: /Add track/ }));
  });

  it('Add Audio makes an Audio Track on a clean input, open on it', () => {
    openMenu();
    fireEvent.click(row('add:audio'));
    expect(s().tracks).toHaveLength(1);
    expect(s().tracks[0]).toMatchObject({
      name: 'Audio Track',
      type: 'audio',
      instrument: 'audio-input',
    });
    expect(s().selectedTrackId).toBe(s().tracks[0].id);
    expect(s().channelStripTab).toBe('controls');
    expect(useAddTrackMenu.getState().open).toBe(false);
    // Only a MIDI track starts armed.
    expect(s().tracks[0]).toMatchObject({
      recordArmed: false,
      monitoring: false,
    });
  });

  it('A adds the Audio Track from the keyboard', () => {
    openMenu();
    fireEvent.keyDown(menu(), { key: 'a' });
    expect(s().tracks[0]?.instrument).toBe('audio-input');
    expect(useAddTrackMenu.getState().open).toBe(false);
  });

  it('M opens Add MIDI’s instruments, and one adds its track', async () => {
    openMenu();
    fireEvent.keyDown(menu(), { key: 'm' });
    const sub = await screen.findByTestId('add-track-midi-menu');
    expect(items(sub)).toEqual([
      'add:instruments',
      'add:synth',
      'add:drum-grid',
    ]);
    expect(
      sub.querySelector('[data-tutorial-id="add-track-synth"]'),
    ).not.toBeNull();
    fireEvent.click(row('add:drum-grid'));
    expect(s().tracks[0]).toMatchObject({
      type: 'midi',
      instrument: 'drum-machine',
    });
    // A new drum track opens on its instrument, the kit (2026-10-23).
    expect(s().channelStripTab).toBe('controls');
  });

  it('arms a new MIDI track and hears its input, taking the arm from the others (2026-10-23)', async () => {
    s().addTrack('midi', 'soundfont', 'Rhodes');
    s().updateTrack(s().tracks[0].id, { recordArmed: true, monitoring: true });
    useStore.setState({ recordArmExclusive: true });
    openMenu();
    fireEvent.keyDown(menu(), { key: 'm' });
    await screen.findByTestId('add-track-midi-menu');
    fireEvent.click(row('add:drum-grid'));
    expect(s().tracks[1]).toMatchObject({
      recordArmed: true,
      monitoring: true,
    });
    expect(s().tracks[0]).toMatchObject({
      recordArmed: false,
      monitoring: false,
    });
  });

  it('keeps the others armed with Record arm exclusive off', async () => {
    s().addTrack('midi', 'soundfont', 'Rhodes');
    s().updateTrack(s().tracks[0].id, { recordArmed: true, monitoring: true });
    useStore.setState({ recordArmExclusive: false });
    openMenu();
    fireEvent.keyDown(menu(), { key: 'm' });
    await screen.findByTestId('add-track-midi-menu');
    fireEvent.click(row('add:drum-grid'));
    expect(s().tracks.map((t) => t.recordArmed)).toEqual([true, true]);
    useStore.setState({ recordArmExclusive: true });
  });

  it('Upload opens the file picker and adds no track itself', () => {
    openMenu();
    fireEvent.click(row('add:upload'));
    expect(h.pick).toHaveBeenCalledTimes(1);
    expect(s().tracks).toHaveLength(0);
  });

  it('U opens the file picker from the keyboard', () => {
    openMenu();
    fireEvent.keyDown(menu(), { key: 'u' });
    expect(h.pick).toHaveBeenCalledTimes(1);
    expect(useAddTrackMenu.getState().open).toBe(false);
  });

  it('leaves the dock to a running lesson', () => {
    useStore.setState({ activeTutorialId: 'first-beat' as never });
    openMenu();
    fireEvent.click(row('add:audio'));
    expect(s().tracks).toHaveLength(1);
    expect(s().channelStripTab).toBeNull();
  });

  it('closes on Escape', () => {
    openMenu();
    fireEvent.keyDown(menu(), { key: 'Escape' });
    expect(useAddTrackMenu.getState().open).toBe(false);
  });
});
