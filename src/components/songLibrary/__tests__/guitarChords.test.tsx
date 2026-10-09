// @vitest-environment jsdom
/**
 * The Songs page on guitar: a chord clicked in the chart opens its guitar
 * box (the same box the "Chords in this song" strip shows), chords the
 * keyboard can't spell still open, and piano and the content editor keep
 * their own popups.
 */

import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ChordBar, Song } from '@/curriculum/types/songLibrary';
import {
  useInstrumentStore,
  type LearnInstrument,
} from '@/features/learn/useInstrumentStore';

vi.mock('@/hooks/useUISound', () => ({
  useUISound: () => ({ play: () => {} }),
}));
const voice = vi.hoisted(() => ({
  loadGuitarVoice: vi.fn(async () => {}),
  strumGuitarChord: vi.fn(),
  releaseGuitarVoice: vi.fn(),
}));
vi.mock('@/learn/audio/guitar/guitarVoice', () => voice);
vi.mock('@/audio/core/toneBridge', () => ({ startTone: async () => {} }));

const { ChordChart } = await import('../ChordChart');
const { default: SongGuitarChords } = await import(
  '../guitar/SongGuitarChords'
);

const bar = (name: string, degree = '1 maj'): ChordBar => ({
  chords: [{ degree, chordName: name, beat: 1, duration: 4 }],
});

const SONG = {
  id: 't',
  title: 'T',
  artist: 'T',
  key: 'G major',
  keyRoot: 67,
  mode: 'major',
  tempo: 100,
  timeSignature: [4, 4],
  difficulty: 1,
  genreTags: [],
  techniques: [],
  sections: [
    {
      id: 'v',
      label: 'Verse',
      bars: [
        bar('G'),
        bar('C', '4 maj'),
        bar('D/F♯', '5 maj/7'),
        bar('F7(no 3)', '♭7 dom7'),
        bar('N.C.', 'N.C.'),
        bar('G'),
      ],
    },
  ],
  audioSources: [],
  artistImageSource: 'none',
} as unknown as Song;

function chart(instrument: LearnInstrument, props = {}) {
  useInstrumentStore.setState({ instrument });
  return render(<ChordChart song={SONG} {...props} />);
}

/** The chord symbol in the chart: an SVG text button showing its name. */
const chordButton = (name: string) =>
  screen
    .getAllByRole('button')
    .find(
      (b) =>
        b.tagName.toLowerCase() === 'text' &&
        (b.textContent ?? '').replace(/\s/g, '').startsWith(name),
    )!;

describe('song chords on guitar', () => {
  afterEach(() => {
    cleanup();
    useInstrumentStore.setState({ instrument: 'piano' });
  });

  it('opens a clicked chord as its guitar box', async () => {
    chart('guitar');
    fireEvent.click(chordButton('G'));
    const card = await screen.findByTestId('guitar-chord-card');
    expect(within(card).getByRole('heading', { name: 'G' })).toBeTruthy();
    // The open G: 3-2-0-0-0-3.
    expect(card.innerHTML).toContain('G: 3 2 0 0 0 3');
    expect(
      within(card).getByRole('radiogroup', { name: 'Chord box labels' }),
    ).toBeTruthy();
  });

  it('opens chords the keyboard can’t spell', async () => {
    chart('guitar');
    fireEvent.click(chordButton('F7'));
    // (Written as F7 with its "no 3" alteration.)
    const card = await screen.findByTestId('guitar-chord-card');
    expect(card.innerHTML).toContain('1 3 1 x x x');
  });

  it('keeps the keyboard on piano', () => {
    const { container } = chart('piano');
    fireEvent.click(chordButton('G'));
    expect(screen.queryByTestId('guitar-chord-card')).toBeNull();
    expect(container.ownerDocument.body.innerHTML).toContain('rounded-full');
  });

  it('opens nothing in the content editor', () => {
    chart('guitar', { onSelectChord: () => {} });
    fireEvent.click(chordButton('G'));
    expect(screen.queryByTestId('guitar-chord-card')).toBeNull();
  });

  it('lists the song’s chords in order, as the card shows them', () => {
    useInstrumentStore.setState({ instrument: 'guitar' });
    render(<SongGuitarChords song={SONG} />);
    const list = screen.getByRole('list', { name: 'Chords in this song' });
    const names = [...list.querySelectorAll('[data-song-chord]')].map((li) =>
      li.getAttribute('data-song-chord'),
    );
    expect(names).toEqual(['G', 'C', 'D/F♯', 'F7(no 3)']);
    // D/F♯ is the open slash grip, its F♯ on string 6.
    expect(list.innerHTML).toContain('D/F♯: 2 0 0 2 3 2');
  });

  it('strums a box’s voicing when it is clicked', async () => {
    useInstrumentStore.setState({ instrument: 'guitar' });
    render(<SongGuitarChords song={SONG} />);
    const g = screen
      .getByRole('list', { name: 'Chords in this song' })
      .querySelector('[data-song-chord="G"] button')!;
    fireEvent.click(g);
    await vi.waitFor(() => expect(voice.strumGuitarChord).toHaveBeenCalled());
    const [midis] = voice.strumGuitarChord.mock.calls[0];
    // 3-2-0-0-0-3: G2 B2 D3 G3 B3 G4.
    expect(midis).toEqual([43, 47, 50, 55, 59, 67]);
  });
});
