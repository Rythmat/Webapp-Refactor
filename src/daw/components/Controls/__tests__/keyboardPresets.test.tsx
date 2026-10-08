// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';

// ── Keyboard presets name what the track plays (instruments-08) ────────────
// The browser lists only presets with a sound of their own, and a track saved
// with a preset the catalog no longer lists shows its instrument's preset.

vi.mock('@/daw/hooks/usePlaybackEngine', () => ({
  trackEngineRegistry: new Map(),
}));
vi.mock('@/daw/collab/studioRealtime', () => ({
  studioRealtime: { shouldBroadcast: () => false, send: vi.fn() },
}));
vi.mock('@/daw/instruments/SoundFontAdapter', () => ({
  SoundFontAdapter: class {},
}));
vi.mock('@/daw/oracle-synth/components/keyboard/PianoKeyboard', () => ({
  PianoKeyboard: () => null,
}));
vi.mock('@/daw/components/PianoRoll/PianoRoll', () => ({
  PianoRoll: () => null,
}));
vi.mock('@/daw/audio/auditionNote', () => ({ auditionNote: vi.fn() }));

import { useStore } from '@/daw/store';
import type { InstrumentType } from '@/daw/store/tracksSlice';
import { PRESET_CATEGORIES } from '@/daw/data/instrumentPresets';
import { KeyboardView } from '../KeyboardView';

function keysTrack(instrument: InstrumentType, presetName?: string) {
  const id = useStore.getState().addTrack('midi', instrument, 'Keys');
  if (presetName) useStore.getState().updateTrack(id, { presetName });
  return id;
}

const track = (id: string) =>
  useStore.getState().tracks.find((t) => t.id === id)!;

beforeEach(() => {
  useStore.setState({ tracks: [], remoteUsers: new Map() });
});

afterEach(cleanup);

describe('KeyboardView presets', () => {
  it.each([
    ['piano-sampler', 'Warm Pad', 'Studio Grand'],
    ['piano-sampler', 'Grand Piano', 'Studio Grand'],
    ['electric-piano', 'Rhodes', 'Mellow EP'],
    ['organ', 'Hammond B3', 'Church Organ'],
  ] as const)(
    'shows a %s track saved as %s as %s',
    (instrument, saved, shown) => {
      render(<KeyboardView trackId={keysTrack(instrument, saved)} />);
      expect(screen.getByText(shown)).toBeInTheDocument();
      expect(screen.queryByText(saved)).toBeNull();
    },
  );

  it('browses only categories with presets, and only real ones', () => {
    render(<KeyboardView trackId={keysTrack('piano-sampler')} />);
    fireEvent.click(screen.getByRole('button', { name: 'Browse' }));

    for (const category of PRESET_CATEGORIES) {
      expect(screen.getByRole('button', { name: category })).toBeVisible();
    }
    for (const empty of ['808s', 'Leads', 'Pads', 'Percussion']) {
      expect(screen.queryByRole('button', { name: empty })).toBeNull();
    }
    expect(screen.queryByRole('button', { name: 'Lofi Piano' })).toBeNull();
  });

  it('switches the instrument when a preset is picked', () => {
    const id = keysTrack('piano-sampler');
    render(<KeyboardView trackId={id} />);
    fireEvent.click(screen.getByRole('button', { name: 'Browse' }));
    const browser = screen
      .getByText('Browse Instruments')
      .closest('div')!.parentElement!;
    fireEvent.click(within(browser).getByRole('button', { name: 'Mellow EP' }));

    expect(track(id)).toEqual(
      expect.objectContaining({
        instrument: 'electric-piano',
        presetName: 'Mellow EP',
      }),
    );
  });
});
