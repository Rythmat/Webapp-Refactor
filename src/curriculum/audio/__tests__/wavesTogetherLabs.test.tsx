// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { intervalHz, intervalNamed } from '../lab/physics/intervals';
import { broadBandOf, BROAD_BANDS } from '../lab/physics/spectrum';
import { hzToPosition } from '../lab/physics/wave';
import { TRY_ROUNDS } from '../labs/InterferenceLab';
import {
  BUILD_ROUNDS,
  PIANO_THIRD,
  PURE_THIRD,
  thirdBeats,
} from '../labs/IntervalsLab';
import { BAND_ROUNDS } from '../labs/SpectrumLab';
import { openUnit } from './openLabTopic';

const stepDone = vi.fn();
const set = vi.fn();
const glide = vi.fn();
const setPair = vi.fn();
const glidePair = vi.fn();
vi.mock('../lab/useLabTone', () => ({
  useLabTone: () => ({
    set,
    glide,
    setPair,
    glidePair,
    spectrum: () => null,
    noteOn: vi.fn(),
    noteOff: vi.fn(),
    playNote: vi.fn(),
    blip: vi.fn(),
    stop: vi.fn(),
    stopAll: vi.fn(),
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
  openUnit(`?topic=${topic}${step}`, 'waves-together');
const name = (text: string | RegExp) =>
  screen.getByRole('button', { name: text });
const slide = (label: string | RegExp, value: number) =>
  fireEvent.change(screen.getByRole('slider', { name: label }), {
    target: { value: String(value) },
  });

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Interference & Phase', () => {
  it('plays a real pair, with the phase on the slider', async () => {
    await open('interference');
    expect(setPair).not.toHaveBeenCalled();
    fireEvent.click(name('Play'));
    expect(setPair).toHaveBeenCalledWith('pair', 220, 0);
    slide(/behind by/, 90);
    expect(glidePair).toHaveBeenCalledWith('pair', 220, 90);
    expect(screen.getByText('71%')).toBeTruthy();
  });

  it('credits silence as the answer', async () => {
    await open('interference', '&step=predict');
    fireEvent.click(screen.getByRole('radio', { name: /silent/ }));
    fireEvent.click(name(/Hear what/));
    expect(screen.getByText(/You called it/)).toBeTruthy();
  });

  it('starts the reveal at 180°, and plays beats at the distance chosen', async () => {
    await open('interference', '&step=reveal');
    const pills = screen.getAllByRole('button', { name: 'Play' });
    fireEvent.click(pills[0]);
    expect(setPair).toHaveBeenCalledWith('pair', 220, 180);
    fireEvent.click(pills[1]);
    expect(set).toHaveBeenCalledWith('low', 220, 0.5);
    expect(set).toHaveBeenCalledWith('high', 223, 0.5);
  });

  it('cancels, then tunes twice, without saying which way to go', async () => {
    await open('interference', '&step=try');
    fireEvent.click(name('Check'));
    expect(screen.getByRole('status').textContent).toMatch(/still some sound/);
    slide(/behind by/, 175);
    fireEvent.click(name('Check'));
    expect(screen.getByText(/Part 2 of 3/)).toBeTruthy();
    fireEvent.click(name('Check'));
    const status = screen.getByRole('status').textContent ?? '';
    expect(status).toMatch(/Still beating/);
    expect(status).not.toMatch(/\b(higher|lower)\b/);
    slide('Your tone', 0.5);
    fireEvent.click(name('Check'));
    expect(screen.getByText(/Part 3 of 3/)).toBeTruthy();
    fireEvent.click(name('Play'));
    expect(set).toHaveBeenCalledWith('low', TRY_ROUNDS[2].hz, 0.5);
    slide('Your tone', -0.5);
    fireEvent.click(name('Check'));
    expect(document.querySelector('[data-lab-done]')).toBeTruthy();
    expect(stepDone).toHaveBeenCalledWith('interference', 'try');
  });
});

describe('Frequency Spectrum', () => {
  it('names the band as it sweeps, and stays silent until asked', async () => {
    await open('spectrum');
    expect(set).not.toHaveBeenCalled();
    fireEvent.click(name('Play'));
    expect(set).toHaveBeenCalledWith('mine', 440);
    expect(screen.getByText('Low mids')).toBeTruthy();
  });

  it('says why it stops short of the top of hearing', async () => {
    await open('spectrum');
    expect(screen.getByText(/look after your ears/)).toBeTruthy();
  });

  it('shows notes and harmonics apart, and plays an instrument’s real ends', async () => {
    await open('spectrum', '&step=reveal');
    fireEvent.click(name('Bass guitar'));
    fireEvent.click(name(/Lowest · E1/));
    expect(set.mock.lastCall?.slice(0, 3)).toEqual(['note', 41.2, 1]);
    expect(screen.getByText(/not which notes it can play/)).toBeTruthy();
  });

  it('asks about every band, so no answer is a sure thing', () => {
    expect(new Set(BAND_ROUNDS.map(broadBandOf)).size).toBe(BROAD_BANDS.length);
  });

  it('plays the true tone as the mystery, and accepts its band', async () => {
    await open('spectrum', '&step=try');
    fireEvent.click(name('Mystery'));
    expect(set).toHaveBeenLastCalledWith('sound', BAND_ROUNDS[0]);
    const answer = (band: string) =>
      fireEvent.click(
        [
          ...screen
            .getByRole('group', { name: 'Which band' })
            .querySelectorAll('button'),
        ].find((b) => b.textContent === band)!,
      );
    answer('Lows');
    expect(screen.getByRole('status').textContent).toMatch(/Not there/);
    for (const hz of BAND_ROUNDS) {
      answer(BROAD_BANDS.find((b) => b.id === broadBandOf(hz))!.name);
    }
    expect(document.querySelector('[data-lab-done]')).toBeTruthy();
    expect(stepDone).toHaveBeenCalledWith('spectrum', 'try');
  });
});

describe('Intervals & Ratios', () => {
  it('plays both notes with harmonics on', async () => {
    await open('intervals');
    fireEvent.click(name('Play'));
    expect(set.mock.calls.map((call) => call.slice(0, 2))).toEqual([
      ['root', 220],
      ['upper', 330],
    ]);
    expect(set.mock.calls[0][3].length).toBeGreaterThan(1);
  });

  it('credits three cycles for a fifth', async () => {
    await open('intervals', '&step=predict');
    fireEvent.click(screen.getByRole('radio', { name: '3 cycles' }));
    fireEvent.click(name(/See what/));
    expect(screen.getByText(/You called it/)).toBeTruthy();
  });

  it('has a piano third that beats where a pure one doesn’t', () => {
    expect(thirdBeats(PURE_THIRD)).toBeCloseTo(0);
    expect(thirdBeats(PIANO_THIRD)).toBeCloseTo(8.7, 0);
  });

  it('says consonance is only partly physics', async () => {
    await open('intervals', '&step=reveal');
    expect(screen.getByText(/only partly physics/)).toBeTruthy();
  });

  it('builds each interval, saying which way to go', async () => {
    await open('intervals', '&step=try');
    fireEvent.click(name('Check'));
    expect(screen.getByRole('status').textContent).toMatch(/higher/);
    for (const id of BUILD_ROUNDS) {
      const hz = intervalHz(220, intervalNamed(id));
      slide('The upper note', hzToPosition(hz, 220, 440));
      fireEvent.click(name('Check'));
    }
    expect(document.querySelector('[data-lab-done]')).toBeTruthy();
    expect(stepDone).toHaveBeenCalledWith('intervals', 'try');
    expect(name('Back to Audio')).toBeTruthy();
  });
});
