// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useTutorialProgressStore } from '@/features/tutorials/useTutorialProgressStore';
import { medium } from '../lab/physics/particles';
import { LEVEL_ROUNDS } from '../labs/AmplitudeLab';
import { MYSTERY_ROUNDS } from '../labs/WavesLab';
import { openUnit } from './openLabTopic';

vi.mock('../lab/useLabTone', () => ({
  useLabTone: () => ({
    set: vi.fn(),
    blip: vi.fn(),
    stop: vi.fn(),
    stopAll: vi.fn(),
    glide: vi.fn(),
    sounding: new Set<string>(),
    needsTap: false,
    peak: () => 0,
  }),
}));
// A wide screen, with the lesson rail.
vi.mock('@/hooks/useMediaQuery', () => ({ useMediaQuery: () => true }));
vi.mock('@/hooks/data/progress/useUpdateActivityProgress', () => ({
  useUpdateActivityProgress: () => ({ mutate: vi.fn() }),
}));
vi.mock('@/hooks/data/experience/useAwardExperience', () => ({
  useAwardLessonActivityExperience: () => ({ mutate: vi.fn() }),
  useAwardLessonCompletionExperience: () => ({ mutate: vi.fn() }),
}));

// jsdom has no canvas: the pictures are checked in the browser.
HTMLCanvasElement.prototype.getContext = () => null;

const id = (topic: string, step: string) =>
  `audio:sound-basics:physics-of-sound:${topic}:${step}`;
const topicOpen = () =>
  document
    .querySelector('[data-audio-topic]')
    ?.getAttribute('data-audio-topic');
const title = () => document.querySelector('[data-guitar-title]')?.textContent;
const where = () =>
  document.querySelector('[data-guitar-subtitle]')?.textContent;

afterEach(() => {
  cleanup();
  useTutorialProgressStore.setState({ completedAt: {} });
});

describe('the Physics of Sound unit', () => {
  it('is one lesson, with its four topics as tabs', async () => {
    await openUnit();
    expect(title()).toBe('Physics of Sound');
    const tabs = screen.getByRole('group', { name: 'Topics' });
    expect(
      [...tabs.querySelectorAll('[data-lesson-tab]')].map((tab) =>
        tab.getAttribute('data-lesson-tab'),
      ),
    ).toEqual(['waves', 'compression', 'frequency', 'amplitude']);
    expect(tabs.querySelectorAll('[data-segment]')).toHaveLength(16);
  });

  it('lists every step on the rail under its topic', async () => {
    await openUnit();
    const rail = document.querySelector<HTMLElement>('[data-lesson-rail]')!;
    expect(rail.querySelectorAll('[data-step-status]')).toHaveLength(16);
    expect(
      within(rail).getByRole('heading', { name: 'Compression & Rarefaction' }),
    ).toBeTruthy();
  });

  it('starts a new student at the beginning', async () => {
    await openUnit();
    expect(topicOpen()).toBe('waves');
    expect(where()).toBe('Waves & Mediums: Hear');
  });

  it('opens where the student left off', async () => {
    useTutorialProgressStore.setState({
      completedAt: Object.fromEntries(
        ['hear', 'predict', 'reveal', 'try']
          .map((step) => [id('waves', step), 1])
          .concat([[id('compression', 'hear'), 1]]),
      ),
    });
    await openUnit();
    expect(topicOpen()).toBe('compression');
    expect(where()).toBe('Compression & Rarefaction: Predict');
  });

  it('opens any step from its address, and from the rail', async () => {
    await openUnit('?topic=amplitude&step=reveal');
    expect(where()).toBe('Amplitude & Volume: Reveal');
    const rail = document.querySelector<HTMLElement>('[data-lesson-rail]')!;
    fireEvent.click(
      rail.querySelectorAll<HTMLElement>('[data-step-status]')[4],
    );
    await waitFor(() => expect(topicOpen()).toBe('compression'));
    expect(where()).toBe('Compression & Rarefaction: Hear');
  });

  it('marks a finished step on the rail and on its tab', async () => {
    await openUnit();
    fireEvent.click(
      screen.getByRole('button', { name: 'Next: make a prediction' }),
    );
    expect(where()).toBe('Waves & Mediums: Predict');
    expect(useTutorialProgressStore.getState().completedAt).toHaveProperty([
      id('waves', 'hear'),
    ]);
    expect(
      document.querySelectorAll('[data-step-status="passed"]'),
    ).toHaveLength(1);
    expect(document.querySelector('[data-segment="passed"]')).toBeTruthy();
  });

  it('leads on to the next topic when one is finished', async () => {
    await openUnit('?topic=waves&step=try');
    for (const round of MYSTERY_ROUNDS) {
      fireEvent.click(screen.getByRole('button', { name: medium(round).name }));
    }
    fireEvent.click(
      screen.getByRole('button', { name: 'Next: Compression & Rarefaction' }),
    );
    await waitFor(() => expect(topicOpen()).toBe('compression'));
    expect(where()).toBe('Compression & Rarefaction: Hear');
  });

  it('ends the unit with the way back to Audio', async () => {
    await openUnit('?topic=amplitude&step=try');
    for (const db of LEVEL_ROUNDS) {
      fireEvent.change(screen.getByRole('slider', { name: 'Your level' }), {
        target: { value: String(db) },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    }
    expect(document.querySelector('[data-lab-done]')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Back to Audio' })).toBeTruthy();
  });
});
