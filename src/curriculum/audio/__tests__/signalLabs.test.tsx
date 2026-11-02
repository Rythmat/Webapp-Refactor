// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { pickupNamed, pickupRecipe } from '../lab/physics/electric';
import { VOLT_ROUNDS } from '../labs/ElectricityLab';
import { REACH_ROUNDS } from '../labs/ElectromagnetismLab';
import { MYSTERY_PICKUPS } from '../labs/TransducersLab';
import { openUnit } from './openLabTopic';

const stepDone = vi.fn();
const set = vi.fn();
const glide = vi.fn();
const playNote = vi.fn();
const sounding = new Set<string>();
vi.mock('../lab/useLabTone', () => ({
  useLabTone: () => ({
    set,
    glide,
    playNote,
    stopAll: vi.fn(),
    setPair: vi.fn(),
    glidePair: vi.fn(),
    spectrum: () => null,
    noteOn: vi.fn(),
    noteOff: vi.fn(),
    blip: vi.fn(),
    stop: vi.fn(),
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
  openUnit(`?topic=${topic}${step}`, 'sound-to-electricity');
const name = (text: string | RegExp) =>
  screen.getByRole('button', { name: text });
const slide = (label: string | RegExp, value: number) =>
  fireEvent.change(screen.getByRole('slider', { name: label }), {
    target: { value: String(value) },
  });

afterEach(() => {
  cleanup();
  sounding.clear();
  vi.clearAllMocks();
});

describe('Electricity & Voltage', () => {
  it('shows Ohm’s law at work', async () => {
    await open('electricity');
    expect(screen.getByText('60 mA')).toBeTruthy();
    fireEvent.click(name('50 Ω'));
    expect(screen.getByText('120 mA')).toBeTruthy();
    slide(/^Voltage/, 3);
    expect(screen.getByText('60 mA')).toBeTruthy();
  });

  it('credits the click, and says why not to try it for real', async () => {
    await open('electricity', '&step=predict');
    fireEvent.click(screen.getByRole('radio', { name: /One click/ }));
    fireEvent.click(name(/Hear what/));
    expect(screen.getByText(/You called it/)).toBeTruthy();
    expect(screen.getByText(/can damage it/)).toBeTruthy();
  });

  it('plays a short click for a battery, and a held tone for a signal', async () => {
    await open('electricity', '&step=reveal');
    fireEvent.click(name('Connect a battery'));
    expect(playNote).toHaveBeenCalledTimes(1);
    expect(playNote.mock.lastCall?.[2].sustain).toBe(0);
    fireEvent.click(name('A changing voltage'));
    expect(set).toHaveBeenCalledWith('signal', 220);
  });

  it('takes away the meter after the first lamp, and finishes by working it out', async () => {
    await open('electricity', '&step=try');
    expect(screen.getByText('Current')).toBeTruthy();
    fireEvent.click(name('Check'));
    expect(screen.getByRole('status').textContent).toMatch(/more voltage/);
    VOLT_ROUNDS.forEach(({ ohms, milliamps }, i) => {
      slide(/^Voltage/, (ohms * milliamps) / 1000);
      fireEvent.click(name('Check'));
      if (i === 0) expect(screen.queryByText('Current')).toBeNull();
    });
    expect(document.querySelector('[data-lab-done]')).toBeTruthy();
    expect(stepDone).toHaveBeenCalledWith('electricity', 'try');
  });

  it('notes both directions of current', async () => {
    await open('electricity');
    fireEvent.click(screen.getByRole('button', { name: /about/i }));
    expect(screen.getByText(/conventional current/)).toBeTruthy();
  });
});

describe('Electromagnetism', () => {
  it('credits no voltage for a still magnet', async () => {
    await open('electromagnetism', '&step=predict');
    fireEvent.click(screen.getByRole('radio', { name: 'No voltage at all' }));
    fireEvent.click(name(/See what/));
    expect(screen.getByText(/You called it/)).toBeTruthy();
    expect(screen.getByText(/It’s the change/)).toBeTruthy();
  });

  it('doubles the model’s voltage with the speed and with the turns', async () => {
    await open('electromagnetism', '&step=reveal');
    expect(screen.getByText('10 mV')).toBeTruthy();
    fireEvent.click(name('200'));
    expect(screen.getByText('20 mV')).toBeTruthy();
    slide(/^Speed/, 2);
    expect(screen.getByText('40 mV')).toBeTruthy();
  });

  it('plays louder at the same reach, swung faster', async () => {
    await open('electromagnetism', '&step=reveal');
    fireEvent.click(name('Play'));
    expect(set).toHaveBeenLastCalledWith('mine', 110, 0.5);
    fireEvent.click(name('220 Hz'));
    expect(glide).toHaveBeenLastCalledWith('mine', 220, 1);
  });

  it('reaches each target, with what it’s given', async () => {
    await open('electromagnetism', '&step=try');
    expect(REACH_ROUNDS.length).toBe(3);
    fireEvent.click(name('100 turns'));
    slide(/^Speed/, 4);
    fireEvent.click(name('Check'));
    expect(screen.getByText(/Target 2 of 3/)).toBeTruthy();
    expect(screen.queryByRole('slider', { name: /^Speed/ })).toBeNull();
    fireEvent.click(name('Check'));
    expect(screen.getByRole('status').textContent).toMatch(/Not enough/);
    fireEvent.click(name('400 turns'));
    fireEvent.click(name('Check'));
    expect(screen.queryByRole('button', { name: '400 turns' })).toBeNull();
    slide(/^Speed/, 2);
    fireEvent.click(name('Check'));
    expect(document.querySelector('[data-lab-done]')).toBeTruthy();
    expect(stepDone).toHaveBeenCalledWith('electromagnetism', 'try');
  });
});

describe('Transducers', () => {
  it('explains each one, and needs no sound to start', async () => {
    await open('transducers');
    expect(screen.getByText(/thin diaphragm/)).toBeTruthy();
    fireEvent.click(name('Speaker'));
    expect(screen.getByText(/A mic in reverse/)).toBeTruthy();
    expect(set).not.toHaveBeenCalled();
  });

  it('credits headphones as a faint mic', async () => {
    await open('transducers', '&step=predict');
    fireEvent.click(screen.getByRole('radio', { name: /faint/ }));
    fireEvent.click(name(/See what/));
    expect(screen.getByText(/You called it/)).toBeTruthy();
  });

  it('plays the recipe for the pickup chosen', async () => {
    await open('transducers', '&step=reveal');
    fireEvent.click(name('Play'));
    expect(set.mock.lastCall?.[3]).toEqual(
      pickupRecipe(pickupNamed('neck').place, 12),
    );
    fireEvent.click(name('Bridge'));
    expect(glide.mock.lastCall?.[3]).toEqual(
      pickupRecipe(pickupNamed('bridge').place, 12),
    );
  });

  it('plays the true pickup as the mystery, and accepts it', async () => {
    await open('transducers', '&step=try');
    fireEvent.click(name('Mystery'));
    expect(set.mock.lastCall?.[3]).toEqual(
      pickupRecipe(pickupNamed(MYSTERY_PICKUPS[0]).place, 12),
    );
    const answer = (text: string) =>
      fireEvent.click(
        [
          ...screen
            .getByRole('group', { name: 'It’s the…' })
            .querySelectorAll('button'),
        ].find((b) => b.textContent === text)!,
      );
    answer('Neck');
    expect(screen.getByRole('status').textContent).toMatch(/Not that one/);
    for (const id of MYSTERY_PICKUPS) answer(pickupNamed(id).name);
    expect(document.querySelector('[data-lab-done]')).toBeTruthy();
    expect(stepDone).toHaveBeenCalledWith('transducers', 'try');
    expect(name('Back to Audio')).toBeTruthy();
  });
});
