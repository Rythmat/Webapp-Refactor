// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  compressionsAt,
  medium,
  squeezeAt,
  wavesAcross,
} from '../lab/physics/particles';
import { LEVEL_ROUNDS, levelResult, MATCH_DB } from '../labs/AmplitudeLab';
import { FIND_ROUNDS } from '../labs/CompressionLab';
import { MYSTERY_ROUNDS } from '../labs/WavesLab';
import { openUnit } from './openLabTopic';

const stepDone = vi.fn();
const set = vi.fn();
const blip = vi.fn();
vi.mock('../lab/useLabTone', () => ({
  useLabTone: () => ({
    set,
    blip,
    stop: vi.fn(),
    stopAll: vi.fn(),
    glide: vi.fn(),
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

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Waves & Mediums', () => {
  it('sends a pulse with a tap, and is silent until asked', async () => {
    await openUnit('?topic=waves');
    expect(blip).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Send a pulse' }));
    expect(blip).toHaveBeenCalledTimes(1);
  });

  it('holds the reveal back until a guess, then credits the right one', async () => {
    await openUnit('?topic=waves&step=predict');
    expect(screen.queryByRole('button', { name: /See what/ })).toBeNull();
    fireEvent.click(screen.getByRole('radio', { name: /goes back/ }));
    fireEvent.click(screen.getByRole('button', { name: /See what/ }));
    expect(screen.getByText(/You called it/)).toBeTruthy();
    expect(stepDone).toHaveBeenCalledWith('waves', 'predict');
  });

  it('finishes once every mystery is named, keeping a wrong guess open', async () => {
    await openUnit('?topic=waves&step=try');
    const wrong = MYSTERY_ROUNDS[0] === 'air' ? 'Water' : 'Air';
    fireEvent.click(screen.getByRole('button', { name: wrong }));
    expect(screen.getByRole('status').textContent).toMatch(/^Not /);
    for (const id of MYSTERY_ROUNDS) {
      fireEvent.click(screen.getByRole('button', { name: medium(id).name }));
    }
    expect(document.querySelector('[data-lab-done]')).toBeTruthy();
    expect(stepDone).toHaveBeenCalledWith('waves', 'try');
  });

  it('has a mystery with nothing to cross', () => {
    expect(MYSTERY_ROUNDS).toContain('vacuum');
  });
});

describe('Compression & Rarefaction', () => {
  it('needs a mark before it can check one', async () => {
    await openUnit('?topic=compression&step=try');
    expect(
      (screen.getByRole('button', { name: 'Check' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it('names what a wrong mark is, and accepts a compression', async () => {
    await openUnit('?topic=compression&step=try');
    const { hz, phase } = FIND_ROUNDS[0];
    const waves = wavesAcross(hz);
    const peak = compressionsAt(phase, waves)[1];
    const mark = (x: number) =>
      fireEvent.change(screen.getByRole('slider', { name: 'Your mark' }), {
        target: { value: String(x) },
      });
    mark(peak + 0.5 / waves);
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    expect(screen.getByRole('status').textContent).toMatch(/rarefaction/);
    mark(peak);
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    expect(screen.getByText(/Moment 2 of 3/)).toBeTruthy();
  });

  it('has a compression on stage to find in every round', () => {
    for (const { hz, phase } of FIND_ROUNDS) {
      const waves = wavesAcross(hz);
      const peaks = compressionsAt(phase, waves);
      expect(peaks.length).toBeGreaterThan(0);
      for (const x of peaks) {
        expect(squeezeAt(x, phase, waves)).toBe('compression');
      }
    }
  });
});

describe('Amplitude & Volume', () => {
  it('counts within what an ear can tell, and says which way otherwise', () => {
    expect(levelResult(-6, -6)).toBe('match');
    expect(levelResult(-6 - MATCH_DB, -6)).toBe('match');
    expect(levelResult(-20, -6)).toBe('louder');
    expect(levelResult(-2, -12)).toBe('quieter');
  });

  it('plays at the level the slider says', async () => {
    await openUnit('?topic=amplitude');
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    expect(set).toHaveBeenCalledWith('mine', 440, 0.7);
  });

  it('plays half the amplitude at −6 dB, and says what it means', async () => {
    await openUnit('?topic=amplitude&step=reveal');
    fireEvent.click(screen.getByRole('button', { name: /Half · −6 dB/ }));
    expect(set).toHaveBeenCalledWith('mine', 440, 0.5);
    expect(screen.getByText(/about −10 dB/)).toBeTruthy();
  });

  it('never claims to know the student’s real volume', async () => {
    await openUnit('?topic=amplitude');
    expect(screen.getByText(/depends\s+on your device/)).toBeTruthy();
    expect(LEVEL_ROUNDS.every((db) => db < 0)).toBe(true);
  });
});
