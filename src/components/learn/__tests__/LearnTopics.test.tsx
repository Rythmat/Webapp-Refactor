// @vitest-environment jsdom
import { cleanup, render, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { genreReadinessFrom } from '@/features/learn/genreReadiness';
import { useInstrumentStore } from '@/features/learn/useInstrumentStore';
import { LearnTopics } from '../LearnTopics';

let isPremium = true;
vi.mock('@/hooks/useIsPremium', () => ({
  useIsPremium: () => ({ isPremium, isLoading: false }),
}));
vi.mock('@/hooks/data/progress', () => ({
  useProgressSummary: () => ({ data: { lessons: [] } }),
}));
vi.stubGlobal(
  'IntersectionObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);
HTMLCanvasElement.prototype.getContext = () => null;

const open = (built = genreReadinessFrom(new Set(['pop:1:A', 'funk:1:A']))) =>
  render(
    <MemoryRouter>
      <LearnTopics genreReady={built} />
    </MemoryRouter>,
  );

const topicIds = () =>
  [...document.querySelectorAll<HTMLElement>('[data-learn-topic]')].map(
    (t) => t.dataset.learnTopic,
  );
const topic = (id: string) =>
  document.querySelector<HTMLElement>(`[data-learn-topic="${id}"]`)!;

beforeEach(() => {
  useInstrumentStore.setState({ instrument: 'piano', audio: false });
});
afterEach(() => {
  cleanup();
  isPremium = true;
});

describe('Learn’s topics', () => {
  it('has the five, with the instrument played last first', () => {
    useInstrumentStore.setState({ instrument: 'ukulele', audio: false });
    open();
    expect(topicIds()[0]).toBe('ukulele');
    expect(topicIds()).toEqual(
      expect.arrayContaining(['piano', 'guitar', 'bass', 'ukulele', 'audio']),
    );
  });

  it('puts Audio first if that’s where the student was', () => {
    useInstrumentStore.setState({ instrument: 'guitar', audio: true });
    open();
    expect(topicIds()[0]).toBe('audio');
  });

  it('links a Theory family to its path on that instrument', () => {
    open();
    expect(
      within(topic('guitar'))
        .getByRole('link', { name: 'Harmonic Minor' })
        .getAttribute('href'),
    ).toBe('/learn/guitar/theory/harmonic-minor');
  });

  it('offers Genres on the keyboard only', () => {
    open();
    expect(
      topic('piano').querySelector('[data-learn-row="genres"]'),
    ).toBeTruthy();
    expect(
      topic('guitar').querySelector('[data-learn-row="genres"]'),
    ).toBeNull();
    expect(
      within(topic('piano'))
        .getByRole('link', { name: 'Pop' })
        .getAttribute('href'),
    ).toBe('/learn/keyboard/genre/pop');
  });

  it('shows all 14 genres, the unbuilt ones as coming soon and unlinked', () => {
    open();
    const row = topic('piano').querySelector<HTMLElement>(
      '[data-learn-row="genres"]',
    )!;
    expect(row.querySelectorAll('[data-learn-tile]')).toHaveLength(14);
    expect(within(row).queryByRole('link', { name: 'Rock' })).toBeNull();
    expect(
      within(row).getByRole('img', { name: 'Rock: coming soon' }),
    ).toBeTruthy();
    // What's ready comes first.
    expect(
      row.querySelector('[data-learn-tile]')?.getAttribute('data-learn-tile'),
    ).toMatch(/pop|funk/);
  });

  it('lets free students see the paths, and locks Premium Anatomy', () => {
    isPremium = false;
    open();
    expect(
      within(topic('piano')).getByRole('link', { name: 'Melodic Minor' }),
    ).toBeTruthy();
    expect(
      within(topic('audio')).getByRole('link', { name: 'The Signal Path' }),
    ).toBeTruthy();
    // Anatomy is Audio's now (Piano Fundamentals took the Technique tile).
    expect(
      within(topic('audio')).getByRole('button', {
        name: /Piano Anatomy: subscribe/,
      }),
    ).toBeTruthy();
  });

  it('lists Audio’s courses, then its other shelves', () => {
    open();
    const rows = [
      ...topic('audio').querySelectorAll<HTMLElement>('[data-learn-row]'),
    ].map((r) => r.dataset.learnRow);
    expect(rows[0]).toBe('courses');
    expect(rows).toContain('gear-anatomy');
  });
});
