// @vitest-environment jsdom
/**
 * The bottom rail's dock views (the floating frame, 2026-10-21): Instrument
 * · FX and Automation · Edit, icon toggles in two pills, in place of the
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
    const keys = add('midi', 'piano-sampler', 'Keys');
    s().setSelectedTrackId(keys);
    render(<DockViews />);
    const sound = screen.getByRole('group', { name: 'Instrument and effects' });
    const edit = screen.getByRole('group', { name: 'Automation and editing' });
    expect(sound).toHaveClass('bg-daw-pill', 'rounded-full');
    expect(
      [...sound.querySelectorAll('button')].map((b) => b.ariaLabel),
    ).toEqual(['Instrument', 'FX']);
    expect(
      [...edit.querySelectorAll('button')].map((b) => b.ariaLabel),
    ).toEqual(['Automation', 'Edit']);
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
    const keys = add('midi', 'piano-sampler', 'Keys');
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

  it('take the slot back from Master', () => {
    const keys = add('midi', 'piano-sampler', 'Keys');
    s().setSelectedTrackId(keys);
    s().setChannelStripTab('controls');
    s().setDockMaster(true);
    render(<DockViews />);
    expect(pressed()).toEqual([]);
    fireEvent.click(view('Instrument'));
    expect(s().dockMaster).toBe(false);
    expect(s().channelStripTab).toBe('controls');
    expect(pressed()).toEqual(['Instrument']);
  });

  it('are off where they don’t fit the track', () => {
    render(<DockViews />);
    for (const name of ['Instrument', 'FX', 'Automation', 'Edit']) {
      expect(view(name)).toBeDisabled();
    }
    cleanup();

    const take = add('audio', 'none', 'Take');
    s().setSelectedTrackId(take);
    render(<DockViews />);
    expect(view('Instrument')).toBeDisabled();
    expect(view('FX')).toBeEnabled();
    expect(view('Automation')).toBeEnabled();
    expect(view('Edit')).toBeDisabled();
    cleanup();

    const guitar = add('audio', 'guitar-fx', 'Guitar');
    s().setSelectedTrackId(guitar);
    render(<DockViews />);
    expect(view('Instrument')).toBeEnabled();
    expect(view('FX')).toBeDisabled();
    expect(view('Edit')).toBeDisabled();
  });

  it('show an audio track’s chain as FX, whatever the tab', () => {
    const take = add('audio', 'none', 'Take');
    s().setSelectedTrackId(take);
    s().setChannelStripTab('controls');
    render(<DockViews />);
    expect(pressed()).toEqual(['FX']);
  });

  it('press none on a tab with no button (Prism)', () => {
    const keys = add('midi', 'piano-sampler', 'Keys');
    s().setSelectedTrackId(keys);
    s().setChannelStripTab('prism');
    render(<DockViews />);
    expect(pressed()).toEqual([]);
    fireEvent.click(view('Edit'));
    expect(s().channelStripTab).toBe('piano-roll');
  });
});

describe('Automation', () => {
  it('opens the selected track’s lane, beside the dock, and shuts it', () => {
    const keys = add('midi', 'piano-sampler', 'Keys');
    s().setSelectedTrackId(keys);
    s().setChannelStripTab('controls');
    render(<DockViews />);
    fireEvent.click(view('Automation'));
    expect(s().automationOpenTrackId).toBe(keys);
    expect(s().channelStripTab).toBe('controls');
    expect(pressed()).toEqual(['Instrument', 'Automation']);
    fireEvent.click(view('Automation'));
    expect(s().automationOpenTrackId).toBeNull();
  });

  it('follows the selection, and leaves Master’s lane alone', () => {
    const keys = add('midi', 'piano-sampler', 'Keys');
    const bass = add('midi', 'bass-electric', 'Bass');
    s().setSelectedTrackId(keys);
    render(<DockViews />);
    fireEvent.click(view('Automation'));
    act(() => s().setSelectedTrackId(bass));
    expect(s().automationOpenTrackId).toBe(bass);
    expect(pressed()).toEqual(['Automation']);

    act(() => s().setAutomationOpenTrackId(MASTER_AUTOMATION_ID));
    expect(pressed()).toEqual([]);
    act(() => s().setSelectedTrackId(keys));
    expect(s().automationOpenTrackId).toBe(MASTER_AUTOMATION_ID);
  });
});
