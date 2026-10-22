// @vitest-environment jsdom
/**
 * An audio track's own chain (GuitarBassView on 'audio-input'): its + slots
 * open the Add audio effect picker, whose amps and pitch correction go into
 * the stored chain the engine plays the track's clips through. One amp:
 * another pick swaps its model. Pitch correction follows the song's key and
 * goes first.
 */
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/daw/hooks/usePlaybackEngine', () => ({
  getTrackAudioState: () => undefined,
  subscribeEngineReady: () => () => {},
}));
vi.mock('@/daw/midi/AudioInputEnumerator', () => ({
  getAudioInputs: () => Promise.resolve([]),
  probeDeviceChannelCount: () => Promise.resolve(2),
}));
vi.mock('../TunerDisplay', () => ({
  TunerDisplay: () => <div data-testid="tuner" />,
}));

import { SCALE_TYPES } from '@/daw/audio/pitch-correction/PitchCorrectionNode';
import { AUDIO_EFFECTS } from '@/daw/data/audioEffects';
import { useStore } from '@/daw/store';
import { GuitarBassView } from '../GuitarBassView';
import { activeNotesFor } from '../PitchCorrectionControls';

const s = () => useStore.getState();
let track = '';
const chain = () => s().tracks.find((t) => t.id === track)?.guitarChain ?? [];

const settle = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

beforeEach(() => {
  // jsdom has no media devices; the view listens for device changes.
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: {
      addEventListener: () => {},
      removeEventListener: () => {},
      getUserMedia: () => Promise.reject(new Error('no media in tests')),
    },
  });
  useStore.setState(useStore.getInitialState(), true);
  track = s().addTrack('audio', 'audio-input', 'Audio');
  s().setSelectedTrackId(track);
});
afterEach(cleanup);

async function renderAudio() {
  render(<GuitarBassView trackId={track} />);
  await settle();
}

describe('an audio track’s chain', () => {
  it('gives the Input column to the Tuner: the track list picks the input', async () => {
    await renderAudio();
    expect(screen.queryByTestId('audio-input-section')).toBeNull();
    expect(screen.queryByText('Input Level')).toBeNull();
    expect(
      screen
        .getByTestId('audio-tuner-section')
        .querySelector('[data-testid="tuner"]'),
    ).not.toBeNull();
  });

  it('starts empty, with no inline amp or pedal lists, and offers the picker', async () => {
    await renderAudio();
    expect(screen.queryByText('Amps')).toBeNull();
    expect(screen.queryByText('Pedals')).toBeNull();
    fireEvent.click(screen.getByTestId('audio-fx-add'));
    expect(
      screen.getByRole('dialog', { name: 'Add audio effect' }),
    ).toBeTruthy();
  });

  it('adds pitch correction in the song’s key, first in the chain', async () => {
    s().setRootNote(7); // G
    await renderAudio();
    fireEvent.click(screen.getByTestId('audio-fx-add'));
    fireEvent.click(screen.getByTestId('audio-effect-pitch-correction'));
    await settle();
    const [block] = chain();
    expect(block.type).toBe('pitch-correction');
    expect(block.params.rootNote).toBe(7);
    expect(block.params.activeNotes).toBe(
      activeNotesFor(7, block.params.scaleType),
    );
    // Drawn as an effect card, as the dock's Effects are.
    const card = screen.getByTestId('audio-fx-card-pitch-correction');
    expect(card.textContent).toContain('Pitch Correction');
    expect(screen.getByTestId('pitch-correction-controls')).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('adds one amp, swaps its model on another pick, and can remove it', async () => {
    await renderAudio();
    fireEvent.click(screen.getByTestId('audio-fx-add'));
    fireEvent.click(screen.getByTestId('audio-effect-nam-ampeg-svt'));
    await settle();
    expect(chain().map((b) => [b.type, b.namModelId])).toEqual([
      ['nam-amp', 'nam-ampeg-svt'],
    ]);
    expect(screen.getByTestId('audio-fx-card-nam-amp').textContent).toContain(
      'Diamond',
    );

    // Its power dot switches it off.
    fireEvent.click(screen.getByRole('button', { name: 'Diamond on' }));
    await settle();
    expect(chain()[0].enabled).toBe(false);

    fireEvent.click(screen.getByTestId('audio-fx-add'));
    const swap = screen.getByTestId('audio-effect-nam-vox-ac30');
    expect(swap.getAttribute('aria-label')).toBe('Swap the amp for Emerald');
    fireEvent.click(swap);
    await settle();
    expect(chain().map((b) => b.namModelId)).toEqual(['nam-vox-ac30']);

    fireEvent.click(screen.getByTestId('audio-fx-remove-nam-amp'));
    await settle();
    expect(chain()).toEqual([]);
  });
});

describe('one amp at a time', () => {
  it('loads a saved chain with two amps as one, and saves it so', async () => {
    s().setGuitarChain(track, [
      {
        type: 'nam-amp',
        enabled: true,
        params: {},
        namModelId: 'nam-ampeg-svt',
      },
      {
        type: 'nam-amp',
        enabled: true,
        params: {},
        namModelId: 'nam-vox-ac30',
      },
    ]);
    await renderAudio();
    expect(screen.getAllByTestId('audio-fx-card-nam-amp')).toHaveLength(1);
    expect(chain().map((b) => b.namModelId)).toEqual(['nam-ampeg-svt']);
  });

  it('marks the other amps as swaps once one is in', async () => {
    await renderAudio();
    fireEvent.click(screen.getByTestId('audio-fx-add'));
    fireEvent.click(screen.getByTestId('audio-effect-nam-clean-twin'));
    await settle();
    // Add now offers the track's Effects; the audio picker is a link.
    expect(screen.getByTestId('audio-fx-add-effects').textContent).toContain(
      'Add effects',
    );
    expect(screen.getByTestId('audio-fx-add').textContent).toBe(
      'Add pitch correction',
    );
    fireEvent.click(screen.getByTestId('audio-fx-add'));
    expect(
      screen.getByTestId('audio-effect-nam-ampeg-svt').textContent,
    ).toContain('Swap');
    expect(
      screen.getByTestId('audio-fx-purpose-guitar-amps').textContent,
    ).toContain('swaps Quartz');
    fireEvent.click(screen.getByTestId('audio-effect-nam-ampeg-svt'));
    await settle();
    expect(chain().filter((b) => b.type === 'nam-amp')).toHaveLength(1);
    expect(chain()[0].namModelId).toBe('nam-ampeg-svt');
  });
});

describe('Add effects', () => {
  it('offers an amp or pitch correction first, its effects as a link', async () => {
    await renderAudio();
    expect(screen.getByTestId('audio-fx-add').textContent).toBe(
      'Add amp or pitch correction',
    );
    // One dock: its effects are a link on the same card.
    expect(screen.getByTestId('audio-fx-add-effects').textContent).toBe(
      'Add effects',
    );
    fireEvent.click(screen.getByTestId('audio-fx-add'));
    fireEvent.click(screen.getByTestId('audio-effect-pitch-correction'));
    await settle();
    expect(screen.getByTestId('audio-fx-add').textContent).toBe('Add an amp');
  });

  it('then opens the Add effect picker, its effects in the same row', async () => {
    s().setChannelStripTab('controls');
    await renderAudio();
    fireEvent.click(screen.getByTestId('audio-fx-add'));
    fireEvent.click(screen.getByTestId('audio-effect-nam-clean-twin'));
    await settle();
    fireEvent.click(screen.getByTestId('audio-fx-add-effects'));
    expect(s().effectPickerOpen).toBe(true);
    // An effect added lands in the same row as the amp, after it.
    act(() => s().addActiveEffect(track, 'reverb'));
    const row = screen.getByTestId('fx-cards');
    const amp = screen.getByTestId('audio-fx-card-nam-amp');
    const reverb = screen.getByTestId('fx-card-reverb');
    expect(row.contains(amp) && row.contains(reverb)).toBe(true);
    expect(
      amp.compareDocumentPosition(reverb) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('leaves no link once both are in', async () => {
    s().setGuitarChain(track, [
      { type: 'pitch-correction', enabled: true, params: {} },
      {
        type: 'nam-amp',
        enabled: true,
        params: {},
        namModelId: 'nam-vox-ac30',
      },
    ]);
    await renderAudio();
    expect(screen.getByTestId('audio-fx-add-effects')).toBeTruthy();
    expect(screen.queryByTestId('audio-fx-add')).toBeNull();
  });
});

describe('the audio effects', () => {
  it('list pitch correction and every bundled amp, each with a line', () => {
    expect(AUDIO_EFFECTS[0].id).toBe('pitch-correction');
    expect(AUDIO_EFFECTS.filter((e) => e.kind === 'amp')).toHaveLength(23);
    for (const e of AUDIO_EFFECTS) expect(e.about.length).toBeGreaterThan(10);
  });

  it('never name an amp maker', () => {
    const brands =
      /marshall|vox|fender|mesa|ampeg|orange|engl|friedman|soldano|roland|magnatone|markbass|aguilar|darkglass|gallien/i;
    for (const e of AUDIO_EFFECTS) {
      expect(`${e.name} ${e.about}`).not.toMatch(brands);
    }
  });

  it('snap to the scale’s notes, or any note without a key', () => {
    const major = SCALE_TYPES.indexOf('ionian');
    // C major: C D E F G A B.
    expect(activeNotesFor(0, major)).toBe(
      [0, 2, 4, 5, 7, 9, 11].reduce((m, pc) => m | (1 << pc), 0),
    );
    expect(activeNotesFor(-1, major)).toBe(0xfff);
  });
});
