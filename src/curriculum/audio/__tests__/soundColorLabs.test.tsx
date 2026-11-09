// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { shapeNamed, SHAPES } from '../lab/physics/envelope';
import { recipeNamed, RECIPES } from '../lab/physics/harmonics';
import { stringHz } from '../lab/physics/standing';
import { MYSTERY_SHAPES } from '../labs/EnvelopeLab';
import { LENGTH_ROUNDS } from '../labs/StringsAndPipesLab';
import { MYSTERY_RECIPES } from '../labs/TimbreLab';
import { openUnit } from './openLabTopic';

const stepDone = vi.fn();
const set = vi.fn();
const glide = vi.fn();
const noteOn = vi.fn();
const noteOff = vi.fn();
const playNote = vi.fn();
const sounding = new Set<string>();
vi.mock('../lab/useLabTone', () => ({
  useLabTone: () => ({
    set,
    glide,
    noteOn,
    noteOff,
    playNote,
    blip: vi.fn(),
    stop: vi.fn(),
    stopAll: vi.fn(),
    sounding,
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
  openUnit(`?topic=${topic}${step}`, 'sound-color');
const name = (text: string | RegExp) =>
  screen.getByRole('button', { name: text });

afterEach(() => {
  cleanup();
  sounding.clear();
  vi.clearAllMocks();
});

describe('Strings & Pipes', () => {
  it('plays the pattern shown, and is silent until asked', async () => {
    await open('strings-and-pipes');
    expect(set).not.toHaveBeenCalled();
    fireEvent.click(name('Play'));
    expect(set).toHaveBeenCalledWith('mine', 110);
    fireEvent.click(name('Harmonic 3'));
    expect(glide).toHaveBeenCalledWith('mine', 330);
  });

  it('offers a clarinet only its odd harmonics', async () => {
    await open('strings-and-pipes');
    fireEvent.click(name('Clarinet'));
    expect(screen.queryByRole('button', { name: 'Harmonic 2' })).toBeNull();
    expect(name('Harmonic 3')).toBeTruthy();
  });

  it('falls back to the first pattern when a clarinet lacks the one open', async () => {
    await open('strings-and-pipes');
    fireEvent.click(name('Harmonic 2'));
    fireEvent.click(name('Clarinet'));
    expect(name('Harmonic 1').getAttribute('aria-pressed')).toBe('true');
  });

  it('holds the reveal back until a guess, then credits the right one', async () => {
    await open('strings-and-pipes', '&step=predict');
    expect(screen.queryByRole('button', { name: /See what/ })).toBeNull();
    fireEvent.click(screen.getByRole('radio', { name: /up one octave/ }));
    fireEvent.click(name(/See what/));
    expect(screen.getByText(/You called it/)).toBeTruthy();
    expect(stepDone).toHaveBeenCalledWith('strings-and-pipes', 'predict');
  });

  it('finds each note by length, saying which way to go', async () => {
    await open('strings-and-pipes', '&step=try');
    fireEvent.click(name('Check'));
    expect(screen.getByRole('status').textContent).toMatch(/higher/);
    for (const { length } of LENGTH_ROUNDS) {
      fireEvent.change(screen.getByRole('slider', { name: 'String length' }), {
        target: { value: String(length) },
      });
      fireEvent.click(name('Target'));
      expect(set).toHaveBeenLastCalledWith('target', stringHz(length));
      fireEvent.click(name('Check'));
    }
    expect(document.querySelector('[data-lab-done]')).toBeTruthy();
    expect(stepDone).toHaveBeenCalledWith('strings-and-pipes', 'try');
  });
});

describe('Timbre & Harmonics', () => {
  it('plays the same note whichever recipe is chosen', async () => {
    await open('timbre');
    fireEvent.click(name('Play'));
    expect(set).toHaveBeenCalledWith(
      'mine',
      220,
      1,
      recipeNamed('pure').harmonics,
    );
    fireEvent.click(name('Hollow'));
    expect(glide).toHaveBeenCalledWith(
      'mine',
      220,
      1,
      recipeNamed('hollow').harmonics,
    );
  });

  it('says its recipes are simplified, not recordings', async () => {
    await open('timbre');
    expect(screen.getByText(/not recordings/)).toBeTruthy();
  });

  it('adds a harmonic without moving the note, and keeps the note itself', async () => {
    await open('timbre', '&step=reveal');
    const first = name(/^1 · /) as HTMLButtonElement;
    expect(first.disabled).toBe(true);
    fireEvent.click(name(/^3 · /));
    const [, hz, , harmonics] = glide.mock.lastCall as [
      string,
      number,
      number,
      number[],
    ];
    expect(hz).toBe(220);
    expect(harmonics[0]).toBe(1);
    expect(harmonics[2]).toBeCloseTo(1 / 3);
  });

  it('plays the true recipe as the mystery, and keeps a wrong guess open', async () => {
    await open('timbre', '&step=try');
    fireEvent.click(name('Mystery'));
    expect(set).toHaveBeenLastCalledWith(
      'sound',
      220,
      1,
      recipeNamed(MYSTERY_RECIPES[0]).harmonics,
    );
    const answers = screen.getByRole('group', { name: 'It’s…' });
    const pick = (id: string) =>
      fireEvent.click(
        [...answers.querySelectorAll('button')].find(
          (b) => b.textContent === RECIPES.find((r) => r.id === id)?.name,
        )!,
      );
    pick(MYSTERY_RECIPES[0] === 'pure' ? 'hollow' : 'pure');
    expect(screen.getByRole('status').textContent).toMatch(/Not that one/);
    expect(screen.getByText(/Mystery 1 of/)).toBeTruthy();
    for (const id of MYSTERY_RECIPES.slice(0, -1)) {
      pick(id);
      expect(screen.queryByText(/Mystery 1 of/)).toBeNull();
    }
  });

  it('finishes once every mystery is named', async () => {
    await open('timbre', '&step=try');
    for (const id of MYSTERY_RECIPES) {
      const answers = screen.getByRole('group', { name: 'It’s…' });
      fireEvent.click(
        [...answers.querySelectorAll('button')].find(
          (b) => b.textContent === recipeNamed(id).name,
        )!,
      );
    }
    expect(document.querySelector('[data-lab-done]')).toBeTruthy();
    expect(stepDone).toHaveBeenCalledWith('timbre', 'try');
  });
});

describe('Envelope & ADSR', () => {
  it('plays a shape when it’s pressed, and nothing before', async () => {
    await open('envelope');
    expect(playNote).not.toHaveBeenCalled();
    fireEvent.click(name('Swell'));
    expect(playNote.mock.lastCall?.[2]).toEqual(shapeNamed('swell').envelope);
  });

  it('holds a note only while pressed', async () => {
    await open('envelope', '&step=reveal');
    const hold = name('Press and hold');
    fireEvent.pointerDown(hold);
    expect(noteOn).toHaveBeenCalledTimes(1);
    fireEvent.pointerUp(hold);
    expect(noteOff).toHaveBeenCalledWith('held');
    // Losing focus afterwards lets nothing go twice.
    fireEvent.blur(hold);
    expect(noteOff).toHaveBeenCalledTimes(1);
  });

  it('lets a quick tap go, however fast the press was', async () => {
    await open('envelope', '&step=reveal');
    const hold = name('Press and hold');
    fireEvent.pointerDown(hold);
    fireEvent.pointerUp(hold);
    expect(noteOff).toHaveBeenCalledTimes(1);
  });

  it('holds a note from the keyboard, without restarting on key repeat', async () => {
    await open('envelope', '&step=reveal');
    const hold = name('Press and hold');
    fireEvent.keyDown(hold, { key: ' ' });
    fireEvent.keyDown(hold, { key: ' ', repeat: true });
    expect(noteOn).toHaveBeenCalledTimes(1);
    fireEvent.keyUp(hold, { key: ' ' });
    expect(noteOff).toHaveBeenCalledWith('held');
  });

  it('holds the note with the shape on the sliders', async () => {
    await open('envelope', '&step=reveal');
    fireEvent.change(screen.getByRole('slider', { name: /^Sustain/ }), {
      target: { value: '0.25' },
    });
    fireEvent.pointerDown(name('Press and hold'));
    expect(noteOn.mock.lastCall?.[2]).toMatchObject({ sustain: 0.25 });
  });

  it('plays the true shape as the mystery, then accepts it', async () => {
    await open('envelope', '&step=try');
    fireEvent.click(name('Play the note'));
    expect(playNote.mock.lastCall?.[2]).toEqual(
      shapeNamed(MYSTERY_SHAPES[0]).envelope,
    );
    const wrong = SHAPES.find((s) => s.id !== MYSTERY_SHAPES[0])!;
    fireEvent.click(name(wrong.name));
    expect(screen.getByRole('status').textContent).toMatch(/Not that shape/);
    for (const id of MYSTERY_SHAPES) fireEvent.click(name(shapeNamed(id).name));
    expect(document.querySelector('[data-lab-done]')).toBeTruthy();
    expect(stepDone).toHaveBeenCalledWith('envelope', 'try');
  });

  it('ends the unit with the way back to Audio', async () => {
    await open('envelope', '&step=try');
    for (const id of MYSTERY_SHAPES) fireEvent.click(name(shapeNamed(id).name));
    expect(name('Back to Audio')).toBeTruthy();
  });
});
