// @vitest-environment jsdom
/**
 * The bottom rail's dock views (the floating frame, 2026-10-21): Instrument
 * · FX and Edit · Automation, icon toggles in two pills, in place of the
 * dock's tab bar. A press opens the view and a press on the open one shuts
 * it; a view that doesn't fit the track is off; Automation opens the
 * selected track's lane and follows the selection.
 *
 * Run: npx vitest run src/daw/shell/bottombar/__tests__/DockViews.test.tsx
 */
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { MASTER_AUTOMATION_ID } from '@/daw/audio/automationParams';
import { useStore } from '@/daw/store';
import type { InstrumentType, TrackType } from '@/daw/store/tracksSlice';
import { installDomShims } from '@/daw/ui/__tests__/dom';
import { DockViews } from '../DockViews';

const s = () => useStore.getState();
const add = (type: TrackType, instrument: InstrumentType, name: string) =>
  s().addTrack(type, instrument, name);
const view = (name: string) => screen.getByRole('button', { name });
const pressed = () =>
  screen
    .getAllByRole('button')
    .filter((b) => b.getAttribute('aria-pressed') === 'true')
    .map((b) => b.getAttribute('aria-label'));

beforeAll(installDomShims);
beforeEach(() => {
  useStore.setState(useStore.getInitialState(), true);
  useStore.setState({ remoteUsers: new Map(), currentView: 'arrange' });
});
afterEach(cleanup);

describe('the dock views', () => {
  it('are four icon toggles in two pills, with the lessons’ anchors', () => {
    const keys = add('midi', 'soundfont', 'Keys');
    s().setSelectedTrackId(keys);
    render(<DockViews />);
    const sound = screen.getByRole('group', { name: 'Instrument and effects' });
    const edit = screen.getByRole('group', { name: 'Editing and automation' });
    expect(sound).toHaveClass('bg-daw-pill', 'rounded-full');
    expect(
      [...sound.querySelectorAll('button')].map((b) => b.ariaLabel),
    ).toEqual(['Instrument', 'FX']);
    expect(
      [...edit.querySelectorAll('button')].map((b) => b.ariaLabel),
    ).toEqual(['Edit', 'Automation']);
    expect(
      [...document.querySelectorAll('[data-tutorial-id]')].map(
        (b) => (b as HTMLElement).dataset.tutorialId,
      ),
    ).toEqual([
      'chanstrip-tab-controls',
      'chanstrip-tab-fx',
      'chanstrip-tab-piano-roll',
    ]);
    for (const b of screen.getAllByRole('button')) {
      expect(b.querySelector('svg')).not.toBeNull();
      expect(b.textContent).toBe('');
    }
  });

  it('open their tab, and a press on the open one shuts the dock', () => {
    const keys = add('midi', 'soundfont', 'Keys');
    s().setSelectedTrackId(keys);
    render(<DockViews />);
    expect(pressed()).toEqual([]);

    fireEvent.click(view('Edit'));
    expect(s().channelStripTab).toBe('piano-roll');
    expect(pressed()).toEqual(['Edit']);

    fireEvent.click(view('FX'));
    expect(s().channelStripTab).toBe('fx');
    expect(pressed()).toEqual(['FX']);

    fireEvent.click(view('FX'));
    expect(s().channelStripTab).toBeNull();
    expect(pressed()).toEqual([]);

    fireEvent.click(view('Instrument'));
    expect(s().channelStripTab).toBe('controls');
  });

  it('are FX and Automation on Master, as on a track (2026-10-22)', () => {
    const keys = add('midi', 'soundfont', 'Keys');
    s().setSelectedTrackId(keys);
    s().setChannelStripTab('controls');
    s().setDockMaster(true);
    render(<DockViews />);
    // Master's dock is its effects: FX shows pressed, as wide as the
    // Instrument · FX pair; Master has no Instrument (2026-10-22).
    expect(pressed()).toEqual(['FX']);
    expect(screen.queryByRole('button', { name: 'Instrument' })).toBeNull();
    expect(view('FX').className).toContain('w-[74px]');
    expect(view('Edit')).toBeDisabled();
    expect(view('FX')).toBeEnabled();
    expect(view('Automation')).toBeEnabled();

    // Its lane, then back to its effects: Master stays in the dock.
    fireEvent.click(view('Automation'));
    expect(s().automationOpenTrackId).toBe(MASTER_AUTOMATION_ID);
    fireEvent.click(view('FX'));
    expect(s().automationOpenTrackId).toBeNull();
    expect(s().dockMaster).toBe(true);
    expect(pressed()).toEqual(['FX']);

    // FX again shuts the dock, and Master with it.
    fireEvent.click(view('FX'));
    expect(s().dockMaster).toBe(false);
    expect(s().channelStripTab).toBeNull();
  });

  it('are off where they don’t fit the track', () => {
    render(<DockViews />);
    for (const name of ['Instrument', 'FX', 'Automation', 'Edit']) {
      expect(view(name)).toBeDisabled();
    }
    cleanup();

    // An uploaded file's track: its effects alone, FX as wide as the pair
    // (2026-10-22).
    const take = add('audio', 'none', 'Take');
    s().setSelectedTrackId(take);
    render(<DockViews />);
    expect(screen.queryByRole('button', { name: 'Instrument' })).toBeNull();
    expect(view('FX')).toBeEnabled();
    expect(view('FX').className).toContain('w-[74px]');
    expect(view('Automation')).toBeEnabled();
    expect(view('Edit')).toBeDisabled();
    cleanup();

    // An Audio track (Guitar, Bass and Voice folded into it, 2026-10-22):
    // one button, its effects in the same dock.
    const audio = add('audio', 'audio-input', 'Guitar');
    s().setSelectedTrackId(audio);
    render(<DockViews />);
    expect(view('Instrument and effects')).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'FX' })).toBeNull();
    expect(view('Edit')).toBeDisabled();
  });

  it('show an Audio track one button, the Effects icon, as wide as the pair', () => {
    const audio = add('audio', 'audio-input', 'Audio');
    s().setSelectedTrackId(audio);
    s().setChannelStripTab('controls');
    render(<DockViews />);
    expect(screen.queryByRole('button', { name: 'FX' })).toBeNull();
    const one = screen.getByRole('button', { name: 'Instrument and effects' });
    expect(one.className).toContain('w-[74px]');
    expect(pressed()).toEqual(['Instrument and effects']);
    // Whatever the tab: its effects share the dock.
    act(() => s().setChannelStripTab('fx'));
    expect(pressed()).toEqual(['Instrument and effects']);
  });

  it('show an audio track’s chain as FX, whatever the tab', () => {
    const take = add('audio', 'none', 'Take');
    s().setSelectedTrackId(take);
    s().setChannelStripTab('controls');
    render(<DockViews />);
    expect(pressed()).toEqual(['FX']);
  });

  it('press none on a tab with no button (Prism)', () => {
    const keys = add('midi', 'soundfont', 'Keys');
    s().setSelectedTrackId(keys);
    s().setChannelStripTab('prism');
    render(<DockViews />);
    expect(pressed()).toEqual([]);
    fireEvent.click(view('Edit'));
    expect(s().channelStripTab).toBe('piano-roll');
  });
});

describe('Automation', () => {
  it('opens the selected track’s lane in the dock, over the tab, and shuts it', () => {
    const keys = add('midi', 'soundfont', 'Keys');
    s().setSelectedTrackId(keys);
    s().setChannelStripTab('controls');
    render(<DockViews />);
    fireEvent.click(view('Automation'));
    expect(s().automationOpenTrackId).toBe(keys);
    // The tab stays underneath, for when the lane shuts.
    expect(s().channelStripTab).toBe('controls');
    expect(pressed()).toEqual(['Automation']);
    fireEvent.click(view('Automation'));
    expect(s().automationOpenTrackId).toBeNull();
    expect(pressed()).toEqual(['Instrument']);
  });

  it('gives the dock back to another view', () => {
    const keys = add('midi', 'soundfont', 'Keys');
    s().setSelectedTrackId(keys);
    s().setChannelStripTab('controls');
    render(<DockViews />);
    fireEvent.click(view('Automation'));
    // Instrument was underneath: a press shows it again, never shuts it.
    fireEvent.click(view('Instrument'));
    expect(s().automationOpenTrackId).toBeNull();
    expect(s().channelStripTab).toBe('controls');
    expect(pressed()).toEqual(['Instrument']);

    fireEvent.click(view('Automation'));
    fireEvent.click(view('FX'));
    expect(s().automationOpenTrackId).toBeNull();
    expect(s().channelStripTab).toBe('fx');
  });

  it('follows the selection, and leaves Master’s lane alone', () => {
    const keys = add('midi', 'soundfont', 'Keys');
    const bass = add('midi', 'soundfont', 'Bass');
    s().setSelectedTrackId(keys);
    render(<DockViews />);
    fireEvent.click(view('Automation'));
    act(() => s().setSelectedTrackId(bass));
    expect(s().automationOpenTrackId).toBe(bass);
    expect(pressed()).toEqual(['Automation']);

    act(() => s().setAutomationOpenTrackId(MASTER_AUTOMATION_ID));
    expect(pressed()).toEqual(['Automation']);
    act(() => s().setSelectedTrackId(keys));
    expect(s().automationOpenTrackId).toBe(MASTER_AUTOMATION_ID);
  });

  it('opens Master’s lane while the dock shows Master', () => {
    add('midi', 'soundfont', 'Keys');
    s().setSelectedTrackId(null);
    s().setDockMaster(true);
    render(<DockViews />);
    fireEvent.click(view('Automation'));
    expect(s().automationOpenTrackId).toBe(MASTER_AUTOMATION_ID);
  });
});
