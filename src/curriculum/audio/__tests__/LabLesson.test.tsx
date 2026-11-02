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
import { shapeNamed } from '../lab/physics/envelope';
import { recipeNamed } from '../lab/physics/harmonics';
import { MYSTERY_SHAPES } from '../labs/EnvelopeLab';
import { MYSTERY_RECIPES } from '../labs/TimbreLab';
import { openUnit } from './openLabTopic';

vi.mock('../lab/useLabTone', () => ({
  useLabTone: () => ({
    set: vi.fn(),
    blip: vi.fn(),
    stop: vi.fn(),
    stopAll: vi.fn(),
    glide: vi.fn(),
    noteOn: vi.fn(),
    noteOff: vi.fn(),
    playNote: vi.fn(),
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
  `audio:sound-color:tone-and-timbre:${topic}:${step}`;
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

describe('a lab’s unit', () => {
  it('is one lesson, with its topics as tabs', async () => {
    await openUnit();
    expect(title()).toBe('Tone & Timbre');
    const tabs = screen.getByRole('group', { name: 'Topics' });
    expect(
      [...tabs.querySelectorAll('[data-lesson-tab]')].map((tab) =>
        tab.getAttribute('data-lesson-tab'),
      ),
    ).toEqual(['strings-and-pipes', 'timbre', 'envelope']);
    expect(tabs.querySelectorAll('[data-segment]')).toHaveLength(12);
  });

  it('lists every step on the rail under its topic', async () => {
    await openUnit();
    const rail = document.querySelector<HTMLElement>('[data-lesson-rail]')!;
    expect(rail.querySelectorAll('[data-step-status]')).toHaveLength(12);
    expect(
      within(rail).getByRole('heading', { name: 'Timbre & Harmonics' }),
    ).toBeTruthy();
  });

  it('starts a new student at the beginning', async () => {
    await openUnit();
    expect(topicOpen()).toBe('strings-and-pipes');
    expect(where()).toBe('Strings & Pipes: Hear');
  });

  it('opens where the student left off', async () => {
    useTutorialProgressStore.setState({
      completedAt: Object.fromEntries(
        ['hear', 'predict', 'reveal', 'try']
          .map((step) => [id('strings-and-pipes', step), 1])
          .concat([[id('timbre', 'hear'), 1]]),
      ),
    });
    await openUnit();
    expect(topicOpen()).toBe('timbre');
    expect(where()).toBe('Timbre & Harmonics: Predict');
  });

  it('opens any step from its address, and from the rail', async () => {
    await openUnit('?topic=envelope&step=reveal');
    expect(where()).toBe('Envelope & ADSR: Reveal');
    const rail = document.querySelector<HTMLElement>('[data-lesson-rail]')!;
    fireEvent.click(
      rail.querySelectorAll<HTMLElement>('[data-step-status]')[4],
    );
    await waitFor(() => expect(topicOpen()).toBe('timbre'));
    expect(where()).toBe('Timbre & Harmonics: Hear');
  });

  it('marks a finished step on the rail and on its tab', async () => {
    await openUnit();
    fireEvent.click(
      screen.getByRole('button', { name: 'Next: make a prediction' }),
    );
    expect(where()).toBe('Strings & Pipes: Predict');
    expect(useTutorialProgressStore.getState().completedAt).toHaveProperty([
      id('strings-and-pipes', 'hear'),
    ]);
    expect(
      document.querySelectorAll('[data-step-status="passed"]'),
    ).toHaveLength(1);
    expect(document.querySelector('[data-segment="passed"]')).toBeTruthy();
  });

  it('leads on to the next topic when one is finished', async () => {
    await openUnit('?topic=timbre&step=try');
    for (const recipe of MYSTERY_RECIPES) {
      const answers = screen.getByRole('group', { name: 'It’s…' });
      fireEvent.click(
        [...answers.querySelectorAll('button')].find(
          (b) => b.textContent === recipeNamed(recipe).name,
        )!,
      );
    }
    fireEvent.click(
      screen.getByRole('button', { name: 'Next: Envelope & ADSR' }),
    );
    await waitFor(() => expect(topicOpen()).toBe('envelope'));
    expect(where()).toBe('Envelope & ADSR: Hear');
  });

  it('ends the unit with the way back to Audio', async () => {
    await openUnit('?topic=envelope&step=try');
    for (const shape of MYSTERY_SHAPES) {
      fireEvent.click(
        screen.getByRole('button', { name: shapeNamed(shape).name }),
      );
    }
    expect(document.querySelector('[data-lab-done]')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Back to Audio' })).toBeTruthy();
  });
});
