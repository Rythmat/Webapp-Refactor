// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { matchResult } from '../lab/physics/wave';
import { MATCH_ROUNDS } from '../labs/FrequencyLab';
import { openUnit } from './openLabTopic';

const set = vi.fn();
const stop = vi.fn();
const stopAll = vi.fn();
vi.mock('../lab/useLabTone', () => ({
  useLabTone: () => ({
    set,
    stop,
    stopAll,
    glide: vi.fn(),
    sounding: new Set<string>(),
    needsTap: false,
    peak: () => 0,
  }),
}));
vi.mock('@/hooks/useMediaQuery', () => ({ useMediaQuery: () => false }));
vi.mock('../lab/audioProgress', async (original) => ({
  ...(await original<typeof import('../lab/audioProgress')>()),
  useAudioProgress: () => ({ stepDone: vi.fn(), percent: 0 }),
}));

// jsdom has no canvas: the picture is checked in the browser.
HTMLCanvasElement.prototype.getContext = () => null;

const open = (step = '') => openUnit(`?topic=frequency${step}`);

describe('matching a tone', () => {
  it('counts within a quarter tone, and says which way otherwise', () => {
    expect(matchResult(440, 440)).toBe('match');
    expect(matchResult(450, 440)).toBe('match');
    expect(matchResult(430, 440)).toBe('match');
    expect(matchResult(400, 440)).toBe('higher');
    expect(matchResult(500, 440)).toBe('lower');
  });

  it('shows the wave once, then asks for the ear alone', () => {
    expect(MATCH_ROUNDS.map((r) => r.showTarget)).toEqual([true, false, false]);
  });
});

describe('the Frequency & Pitch lab', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('is silent until asked, then plays what the slider says', async () => {
    await open();
    expect(set).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    expect(set).toHaveBeenCalledWith('mine', 440);
  });

  it('holds the reveal back until a guess has been made', async () => {
    await open('&step=predict');
    expect(
      screen.queryByRole('button', { name: 'See what really happens' }),
    ).toBeNull();
    fireEvent.click(screen.getByRole('radio', { name: /Twice as many/ }));
    expect(
      screen.getByRole('button', { name: 'See what really happens' }),
    ).toBeTruthy();
  });

  it('credits the right guess at the reveal', async () => {
    await open('&step=predict');
    fireEvent.click(screen.getByRole('radio', { name: /Twice as many/ }));
    fireEvent.click(
      screen.getByRole('button', { name: 'See what really happens' }),
    );
    expect(screen.getByText(/You called it/)).toBeTruthy();
  });

  it('is kind about a wrong guess, and still gives the answer', async () => {
    await open('&step=predict');
    fireEvent.click(screen.getByRole('radio', { name: /gets taller/ }));
    fireEvent.click(
      screen.getByRole('button', { name: 'See what really happens' }),
    );
    expect(screen.getByText(/Not quite/)).toBeTruthy();
    expect(screen.getByText(/exactly twice the frequency/)).toBeTruthy();
  });

  it('stops the sound on leaving a step', async () => {
    await open();
    fireEvent.click(
      screen.getByRole('button', { name: 'Next: make a prediction' }),
    );
    expect(stopAll).toHaveBeenCalled();
  });

  it('tells the student which way to go when a match is off', async () => {
    await open('&step=try');
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    expect(screen.getByRole('status').textContent).toMatch(/target is higher/);
  });
});

describe('with reduced motion', () => {
  afterEach(cleanup);

  it('offers a scrubber instead of moving the wave', async () => {
    vi.doMock('framer-motion', async (original) => ({
      ...(await original<typeof import('framer-motion')>()),
      useReducedMotion: () => true,
    }));
    vi.resetModules();
    const { default: Lab } = await import('../labs/FrequencyLab');
    render(
      <MemoryRouter>
        <Lab
          step="hear"
          accent="#fff"
          next={vi.fn()}
          complete={vi.fn()}
          following={null}
          about={{ open: false, onClose: vi.fn(), name: 'about', title: '' }}
        />
      </MemoryRouter>,
    );
    expect(screen.getByLabelText('Slide the wave along')).toBeTruthy();
    vi.doUnmock('framer-motion');
  });
});
