// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ── Adding tracks: the picker and an empty project's tiles (2.6, 2.14) ─────
// The Add-track picker is a dialog in two steps. Its first step is eight
// category tiles, each with an About line, in a grid that wraps
// (timeline-27); a one-choice category adds its track at once, and Keys,
// Drums and the amp open a second step with their choices and a way back.
// It starts on its first tile and closes on Escape on either step, and the
// next open starts on the categories. Its Import chip opens a file picker and
// never makes an empty track (fx-mixer-24); its library chip shows the
// Library panel. An empty project offers four ways in (ia-flows-25).

const h = vi.hoisted(() => ({ pick: vi.fn() }));
vi.mock('@/daw/midi/importMidiToTracks', () => ({ pickAndImportMidi: h.pick }));

import { useMusicalTypingStore } from '@/daw/commands/musicalTypingStore';
import { useStore } from '@/daw/store';
import { AddTrackSheet } from '../AddTrackSheet';
import { openAddTrackSheet, useAddTrackSheet } from '../addTrack';
import { EmptyProjectTiles } from '../EmptyProjectTiles';

const s = () => useStore.getState();
const realAddTrack = useStore.getState().addTrack;

beforeEach(() => {
  useStore.setState({
    tracks: [],
    selectedTrackId: null,
    channelStripTab: null,
    activeTutorialId: null,
    libraryOpen: false,
    inspectorPanel: 'insight',
    addTrack: realAddTrack,
  });
  useAddTrackSheet.setState({ open: false });
  useMusicalTypingStore.setState({ enabled: false });
  h.pick.mockClear();
});
afterEach(cleanup);

const dialog = () => screen.getByRole('dialog', { name: 'Add a track' });
const tile = (anchor: string) => {
  const el = dialog().querySelector<HTMLElement>(
    `[data-tutorial-id="add-track-${anchor}"]`,
  );
  if (!el) throw new Error(`No tile add-track-${anchor}`);
  return el;
};
const openPicker = () => {
  render(<AddTrackSheet />);
  act(openAddTrackSheet);
};

describe('the Add-track picker: categories', () => {
  it('opens on Keys, with eight tiles, each with an About line, in a grid', () => {
    openPicker();
    expect(dialog().getAttribute('data-step')).toBe('categories');
    expect(document.activeElement).toBe(tile('cat-keys'));
    const grid = dialog().querySelector('.grid');
    expect(grid).not.toBeNull();
    const tiles = grid!.querySelectorAll('button[data-tutorial-id]');
    expect([...tiles].map((t) => t.getAttribute('data-tutorial-id'))).toEqual([
      'add-track-cat-keys',
      'add-track-cat-drums',
      'add-track-bass-electric',
      'add-track-synth',
      'add-track-soundfont',
      'add-track-sampler',
      'add-track-vocal-fx',
      'add-track-cat-amp',
    ]);
    for (const t of tiles) {
      expect(
        t.querySelector('[data-testid="add-track-about"]')?.textContent,
      ).toBeTruthy();
    }
  });

  it.each([
    ['bass-electric', 'midi', 'bass-electric', 'Bass'],
    ['synth', 'midi', 'oracle-synth', 'Synth'],
    ['soundfont', 'midi', 'soundfont', 'Instruments'],
    ['sampler', 'midi', 'sampler', 'Sampler'],
    ['vocal-fx', 'audio', 'vocal-fx', 'Voice'],
  ] as const)(
    'adds %s at once: selects it, opens the dock on it and closes',
    (anchor, type, instrument, name) => {
      openPicker();
      fireEvent.click(tile(anchor));
      expect(s().tracks).toHaveLength(1);
      const track = s().tracks[0];
      expect(track.type).toBe(type);
      expect(track.instrument).toBe(instrument);
      expect(track.name).toBe(name);
      expect(s().selectedTrackId).toBe(track.id);
      expect(s().channelStripTab).toBe('controls');
      expect(useAddTrackSheet.getState().open).toBe(false);
    },
  );

  it('makes the Bass a finger bass in the bass role', () => {
    openPicker();
    fireEvent.click(tile('bass-electric'));
    expect(s().tracks[0].bassVoice).toBe('finger');
    expect(s().tracks[0].trackRole).toBe('bass');
  });

  it('stays open at the track limit', () => {
    useStore.setState({ addTrack: () => '' });
    openPicker();
    fireEvent.click(tile('synth'));
    expect(useAddTrackSheet.getState().open).toBe(true);
  });

  it('leaves the dock to a running lesson', () => {
    useStore.setState({ activeTutorialId: 'make-first-track' });
    openPicker();
    fireEvent.click(tile('synth'));
    expect(s().tracks).toHaveLength(1);
    expect(s().channelStripTab).toBeNull();
  });
});

describe('the Add-track picker: second step', () => {
  it.each([
    [
      'cat-keys',
      'keys',
      'Keys',
      ['piano-sampler', 'electric-piano', 'tonewheel-organ'],
    ],
    ['cat-drums', 'drums', 'Drums', ['drum-machine', 'grooves']],
    ['cat-amp', 'amp', 'Guitar & bass amp', ['guitar-fx', 'bass-fx']],
  ] as const)(
    '%s opens its choices, focused on the first',
    (anchor, step, heading, choices) => {
      openPicker();
      fireEvent.click(tile(anchor));
      expect(s().tracks).toHaveLength(0);
      expect(dialog().getAttribute('data-step')).toBe(step);
      expect(
        screen.getByRole('heading', { name: heading, level: 3 }),
      ).toBeTruthy();
      const grid = dialog().querySelector('.grid')!;
      const tiles = [...grid.querySelectorAll('button[data-tutorial-id]')];
      expect(tiles.map((t) => t.getAttribute('data-tutorial-id'))).toEqual(
        choices.map((c) => `add-track-${c}`),
      );
      for (const t of tiles) {
        expect(
          t.querySelector('[data-testid="add-track-about"]')?.textContent,
        ).toBeTruthy();
      }
      expect(document.activeElement).toBe(tiles[0]);
    },
  );

  it('Drum grid adds Drums, open on the step sequencer (Notes)', () => {
    openPicker();
    fireEvent.click(tile('cat-drums'));
    fireEvent.click(tile('drum-machine'));
    expect(s().tracks.map((t) => [t.instrument, t.name])).toEqual([
      ['drum-machine', 'Drums'],
    ]);
    expect(s().channelStripTab).toBe('piano-roll');
    expect(useAddTrackSheet.getState().open).toBe(false);
  });

  it('Grooves adds Drums, open on the grooves', () => {
    openPicker();
    fireEvent.click(tile('cat-drums'));
    fireEvent.click(tile('grooves'));
    expect(s().tracks[0].instrument).toBe('drum-machine');
    expect(s().channelStripTab).toBe('grooves');
  });

  it.each([
    ['cat-keys', 'electric-piano', 'midi', 'electric-piano', 'Electric piano'],
    ['cat-keys', 'tonewheel-organ', 'midi', 'tonewheel-organ', 'Organ'],
    ['cat-amp', 'guitar-fx', 'audio', 'guitar-fx', 'Guitar'],
    ['cat-amp', 'bass-fx', 'audio', 'bass-fx', 'Bass'],
  ] as const)(
    '%s → %s adds its track',
    (category, anchor, type, instrument, name) => {
      openPicker();
      fireEvent.click(tile(category));
      fireEvent.click(tile(anchor));
      const track = s().tracks[0];
      expect([track.type, track.instrument, track.name]).toEqual([
        type,
        instrument,
        name,
      ]);
      expect(s().channelStripTab).toBe('controls');
    },
  );

  it('goes back to all tracks, focused on the category it came from', () => {
    openPicker();
    fireEvent.click(tile('cat-drums'));
    const back = screen.getByRole('button', { name: 'Back to all tracks' });
    expect(back.getAttribute('data-testid')).toBe('add-track-back');
    fireEvent.click(back);
    expect(dialog().getAttribute('data-step')).toBe('categories');
    expect(document.activeElement).toBe(tile('cat-drums'));
  });

  it('closes on Escape from the second step, and opens again on the categories', () => {
    openPicker();
    fireEvent.click(tile('cat-keys'));
    fireEvent.keyDown(dialog(), { key: 'Escape' });
    expect(useAddTrackSheet.getState().open).toBe(false);
    act(openAddTrackSheet);
    expect(dialog().getAttribute('data-step')).toBe('categories');
    expect(document.activeElement).toBe(tile('cat-keys'));
  });

  it('closes on Escape from the categories', () => {
    openPicker();
    fireEvent.keyDown(dialog(), { key: 'Escape' });
    expect(useAddTrackSheet.getState().open).toBe(false);
  });
});

describe('the Add-track picker: chips', () => {
  it('imports through the file picker, adding no track itself', () => {
    openPicker();
    const chip = tile('import');
    expect(chip.textContent).toMatch(/^Import MIDI file/);
    fireEvent.click(chip);
    expect(h.pick).toHaveBeenCalledTimes(1);
    expect(s().tracks).toHaveLength(0);
    expect(useAddTrackSheet.getState().open).toBe(false);
  });

  it('shows the Library panel for the library chip', () => {
    openPicker();
    fireEvent.click(tile('browser'));
    expect(useAddTrackSheet.getState().open).toBe(false);
    expect(s().inspectorPanel).toBe('library');
    expect(s().libraryOpen).toBe(true);
    expect(s().tracks).toHaveLength(0);
  });

  it('leaves the Library showing when it already is', () => {
    useStore.setState({ libraryOpen: true, inspectorPanel: 'library' });
    openPicker();
    fireEvent.click(tile('browser'));
    expect(s().inspectorPanel).toBe('library');
    expect(s().libraryOpen).toBe(true);
  });
});

describe('an empty project’s tiles', () => {
  it('starts with a beat: drums, open on the step sequencer', () => {
    render(<EmptyProjectTiles />);
    fireEvent.click(screen.getByRole('button', { name: /Start with a beat/ }));
    expect(s().tracks[0].instrument).toBe('drum-machine');
    expect(s().channelStripTab).toBe('piano-roll');
  });

  it('plays an instrument: a piano, with the computer keyboard on', () => {
    render(<EmptyProjectTiles />);
    fireEvent.click(screen.getByRole('button', { name: /Play an instrument/ }));
    expect(s().tracks[0].instrument).toBe('piano-sampler');
    expect(s().tracks[0].name).toBe('Piano');
    expect(s().channelStripTab).toBe('controls');
    expect(useMusicalTypingStore.getState().enabled).toBe(true);
  });

  it('starts from a genre: drums, open on the grooves', () => {
    render(<EmptyProjectTiles />);
    fireEvent.click(screen.getByRole('button', { name: /Start from a genre/ }));
    expect(s().tracks[0].instrument).toBe('drum-machine');
    expect(s().channelStripTab).toBe('grooves');
  });

  it('adds a track through the picker', () => {
    render(<EmptyProjectTiles />);
    fireEvent.click(screen.getByRole('button', { name: /Add a track/ }));
    expect(useAddTrackSheet.getState().open).toBe(true);
    expect(s().tracks).toHaveLength(0);
  });
});
