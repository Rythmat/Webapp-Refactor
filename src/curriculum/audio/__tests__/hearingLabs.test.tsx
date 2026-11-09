// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AUTO_FADE_MS } from '../lab/labAudio';
import { placeOf } from '../lab/physics/hearing';
import { hzToPosition } from '../lab/physics/wave';
import { PITCH_ROUNDS } from '../labs/BrainLab';
import { PLACE_ROUNDS } from '../labs/EarLab';
import { MOODS } from '../labs/EmotionLab';
import { openUnit } from './openLabTopic';

const stepDone = vi.fn();
const set = vi.fn();
const glide = vi.fn();
const playNote = vi.fn();
const stopAll = vi.fn();
vi.mock('../lab/useLabTone', () => ({
  useLabTone: () => ({
    set,
    glide,
    playNote,
    stopAll,
    setPair: vi.fn(),
    glidePair: vi.fn(),
    spectrum: () => null,
    noteOn: vi.fn(),
    noteOff: vi.fn(),
    blip: vi.fn(),
    stop: vi.fn(),
    sounding: new Set<string>(),
    needsTap: false,
    peak: () => 0,
  }),
}));
vi.mock('@/hooks/useMediaQuery', () => ({ useMediaQuery: () => false }));
vi.mock('../lab/audioProgress', async (original) => ({
  ...(await original<typeof import('../lab/audioProgress')>()),
  useAudioProgress: () => ({ stepDone, percent: 0 }),
}));

// jsdom has no canvas: the pictures are checked in the browser.
HTMLCanvasElement.prototype.getContext = () => null;

const open = (topic: string, step = '') =>
  openUnit(`?topic=${topic}${step}`, 'hearing');
const name = (text: string | RegExp) =>
  screen.getByRole('button', { name: text });
const slide = (label: string | RegExp, value: number) =>
  fireEvent.change(screen.getByRole('slider', { name: label }), {
    target: { value: String(value) },
  });

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe('Ear Mechanics', () => {
  it('names each part, and is silent until asked', async () => {
    await open('ear');
    expect(set).not.toHaveBeenCalled();
    fireEvent.click(name('Middle ear'));
    expect(screen.getByText(/hammer, anvil and stirrup/)).toBeTruthy();
    fireEvent.click(name('Play'));
    expect(set).toHaveBeenCalledWith('mine', 440);
  });

  it('credits the entrance for a high note', async () => {
    await open('ear', '&step=predict');
    fireEvent.click(screen.getByRole('radio', { name: 'Near the entrance' }));
    fireEvent.click(name(/See what/));
    expect(screen.getByText(/You called it/)).toBeTruthy();
    expect(stepDone).toHaveBeenCalledWith('ear', 'predict');
  });

  it('warns that damaged hair cells don’t grow back', async () => {
    await open('ear', '&step=reveal');
    expect(screen.getByText(/don’t grow back/)).toBeTruthy();
  });

  it('needs a mark, says which way to go, then accepts each place', async () => {
    await open('ear', '&step=try');
    expect((name('Check') as HTMLButtonElement).disabled).toBe(true);
    slide('Your mark', 0.95);
    fireEvent.click(name('Check'));
    expect(screen.getByRole('status').textContent).toMatch(
      /nearer the entrance/,
    );
    for (const { hz } of PLACE_ROUNDS) {
      slide('Your mark', placeOf(hz));
      fireEvent.click(name('Check'));
    }
    expect(document.querySelector('[data-lab-done]')).toBeTruthy();
    expect(stepDone).toHaveBeenCalledWith('ear', 'try');
  });
});

describe('Brain & Psychoacoustics', () => {
  it('really leaves the note’s frequency out of what plays', async () => {
    await open('brain', '&step=reveal');
    fireEvent.click(screen.getAllByRole('button', { name: 'Play' })[0]);
    const harmonics = set.mock.lastCall?.[3] as number[];
    expect(harmonics[0]).toBe(0);
    expect(harmonics[1]).toBeGreaterThan(0);
    fireEvent.click(name('Whole note'));
    expect((glide.mock.lastCall?.[3] as number[])[0]).toBe(1);
  });

  it('plays the quiet tone equally quiet wherever it is', async () => {
    await open('brain', '&step=reveal');
    fireEvent.click(name(/^Loud/));
    fireEvent.click(name('Quiet tone'));
    const level = set.mock.lastCall?.[2];
    expect(level).toBeLessThan(0.1);
    fireEvent.click(name(/^Far/));
    expect(glide.mock.lastCall?.[2]).toBe(level);
  });

  it('matches a note whose own frequency is missing', async () => {
    await open('brain', '&step=try');
    fireEvent.click(name('Target'));
    expect((set.mock.lastCall?.[3] as number[])[0]).toBe(0);
    fireEvent.click(name('Check'));
    expect(screen.getByRole('status').textContent).toMatch(/higher/);
    for (const hz of PITCH_ROUNDS) {
      slide('Your tone', hzToPosition(hz, 80, 500));
      fireEvent.click(name('Check'));
    }
    expect(document.querySelector('[data-lab-done]')).toBeTruthy();
    expect(stepDone).toHaveBeenCalledWith('brain', 'try');
  });
});

describe('Music, Emotion & Body', () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));

  it('loops the tune once asked, and stops when told', async () => {
    await open('emotion');
    expect(playNote).not.toHaveBeenCalled();
    fireEvent.click(name('Play'));
    expect(playNote).toHaveBeenCalledTimes(1);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(playNote.mock.calls.length).toBeGreaterThan(2);
    fireEvent.click(name('Stop'));
    const count = playNote.mock.calls.length;
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(playNote.mock.calls.length).toBe(count);
  });

  it('stops by itself rather than playing forever', async () => {
    await open('emotion');
    fireEvent.click(name('Play'));
    act(() => {
      vi.advanceTimersByTime(AUTO_FADE_MS + 1000);
    });
    const count = playNote.mock.calls.length;
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(playNote.mock.calls.length).toBe(count);
    expect(name('Play')).toBeTruthy();
  });

  it('stops looping on leaving the step', async () => {
    await open('emotion');
    fireEvent.click(name('Play'));
    fireEvent.click(name('Next: make a prediction'));
    const count = playNote.mock.calls.length;
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(playNote.mock.calls.length).toBe(count);
  });

  it('credits the careful answer about minor', async () => {
    await open('emotion', '&step=predict');
    fireEvent.click(screen.getByRole('radio', { name: /Often/ }));
    fireEvent.click(name(/Hear what/));
    expect(screen.getByText(/You called it/)).toBeTruthy();
  });

  it('hedges the body’s response, and doesn’t claim treatment', async () => {
    await open('emotion', '&step=reveal');
    expect(screen.getByText(/varies a lot between people/)).toBeTruthy();
  });

  it('never marks a mood wrong, whatever the dials say', async () => {
    await open('emotion', '&step=try');
    for (let i = 0; i < MOODS.length; i++) {
      fireEvent.click(name('That’s my tune'));
      expect(screen.getByRole('status').textContent).toMatch(/Yours is yours/);
      fireEvent.click(name('Next'));
    }
    expect(document.querySelector('[data-lab-done]')).toBeTruthy();
    expect(stepDone).toHaveBeenCalledWith('emotion', 'try');
  });
});
