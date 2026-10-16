// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ── Adding tracks: the sheet and an empty project's tiles (milestone 2.6) ──
// The Add-track sheet is a dialog whose grid wraps (timeline-27), starts on
// its first card and closes on Escape; its Import card opens a file picker
// and never makes an empty track (fx-mixer-24). An empty project offers four
// ways in (ia-flows-25).

const h = vi.hoisted(() => ({ pick: vi.fn() }));
vi.mock('@/daw/midi/importMidiToTracks', () => ({ pickAndImportMidi: h.pick }));

import { useMusicalTypingStore } from '@/daw/commands/musicalTypingStore';
import { useStore } from '@/daw/store';
import { AddTrackSheet } from '../AddTrackSheet';
import { openAddTrackSheet, useAddTrackSheet } from '../addTrack';
import { EmptyProjectTiles } from '../EmptyProjectTiles';

const s = () => useStore.getState();

beforeEach(() => {
  useStore.setState({
    tracks: [],
    selectedTrackId: null,
    channelStripTab: null,
    activeTutorialId: null,
  });
  useAddTrackSheet.setState({ open: false });
  useMusicalTypingStore.setState({ enabled: false });
  h.pick.mockClear();
});
afterEach(cleanup);

describe('the Add-track sheet', () => {
  it('opens on its first card, Keys, with every kind and Import', () => {
    render(<AddTrackSheet />);
    act(openAddTrackSheet);
    const dialog = screen.getByRole('dialog', { name: 'Add a track' });
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: /^Keys/ }),
    );
    for (const id of [
      'add-track-piano-sampler',
      'add-track-synth',
      'add-track-drum-machine',
      'add-track-sampler',
      'add-track-vocal-fx',
      'add-track-import',
    ]) {
      expect(dialog.querySelector(`[data-tutorial-id="${id}"]`)).not.toBeNull();
    }
  });

  it('adds the track, selects it, opens the dock on it and closes', () => {
    render(<AddTrackSheet />);
    act(openAddTrackSheet);
    fireEvent.click(screen.getByRole('button', { name: /^Drums/ }));
    expect(s().tracks.map((t) => t.instrument)).toEqual(['drum-machine']);
    expect(s().selectedTrackId).toBe(s().tracks[0].id);
    expect(s().channelStripTab).toBe('controls');
    expect(useAddTrackSheet.getState().open).toBe(false);
  });

  it('leaves the dock to a running lesson', () => {
    useStore.setState({ activeTutorialId: 'make-first-track' });
    render(<AddTrackSheet />);
    act(openAddTrackSheet);
    fireEvent.click(screen.getByRole('button', { name: /^Synth/ }));
    expect(s().tracks).toHaveLength(1);
    expect(s().channelStripTab).toBeNull();
  });

  it('imports through the file picker, adding no track itself', () => {
    render(<AddTrackSheet />);
    act(openAddTrackSheet);
    fireEvent.click(screen.getByRole('button', { name: /^Import MIDI file/ }));
    expect(h.pick).toHaveBeenCalledTimes(1);
    expect(s().tracks).toHaveLength(0);
  });

  it('closes on Escape', () => {
    render(<AddTrackSheet />);
    act(openAddTrackSheet);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(useAddTrackSheet.getState().open).toBe(false);
  });
});

describe('an empty project’s tiles', () => {
  it('starts with a beat: drums, open on the pads', () => {
    render(<EmptyProjectTiles />);
    fireEvent.click(screen.getByRole('button', { name: /Start with a beat/ }));
    expect(s().tracks[0].instrument).toBe('drum-machine');
    expect(s().channelStripTab).toBe('controls');
  });

  it('plays an instrument: keys, with the computer keyboard on', () => {
    render(<EmptyProjectTiles />);
    fireEvent.click(screen.getByRole('button', { name: /Play an instrument/ }));
    expect(s().tracks[0].instrument).toBe('piano-sampler');
    expect(useMusicalTypingStore.getState().enabled).toBe(true);
  });

  it('starts from a genre: drums, open on the grooves', () => {
    render(<EmptyProjectTiles />);
    fireEvent.click(screen.getByRole('button', { name: /Start from a genre/ }));
    expect(s().tracks[0].instrument).toBe('drum-machine');
    expect(s().channelStripTab).toBe('grooves');
  });

  it('adds a track through the sheet', () => {
    render(<EmptyProjectTiles />);
    fireEvent.click(screen.getByRole('button', { name: /Add a track/ }));
    expect(useAddTrackSheet.getState().open).toBe(true);
    expect(s().tracks).toHaveLength(0);
  });
});
