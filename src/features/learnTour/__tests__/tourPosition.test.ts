// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { restoreLearnTour, useLearnTourStore } from '../learnTourStore';
import {
  POSITION_KEY,
  readPosition,
  resumeIndex,
  sameStop,
  writePosition,
} from '../tourPosition';
import { lessonTour } from '../tours/lessonTour';
import { navigateTour, songsTour } from '../tours/navigateTour';

const idx = (def: typeof navigateTour, id: string) =>
  def.steps.findIndex((s) => s.id === id);
const ctx = { returnTo: '/learn', premium: true };

/** The store as the app opens with what this browser kept. */
function openApp(at: string) {
  window.history.pushState({}, '', at);
  restoreLearnTour();
  return { useLearnTourStore };
}

beforeEach(() => {
  useLearnTourStore.getState().quit();
  useLearnTourStore.setState({ offer: null, finale: null });
  localStorage.clear();
});
afterEach(() => {
  localStorage.clear();
  window.history.pushState({}, '', '/');
});

describe('where a tour picks up', () => {
  it('at the step itself when nothing it needs was lost', () => {
    expect(resumeIndex(navigateTour, idx(navigateTour, 'songs-genre'))).toBe(
      idx(navigateTour, 'songs-genre'),
    );
  });

  it('at the step that opens what it needs', () => {
    expect(resumeIndex(navigateTour, idx(navigateTour, 'key-wheel'))).toBe(
      idx(navigateTour, 'key'),
    );
    expect(resumeIndex(navigateTour, idx(navigateTour, 'show-into-band'))).toBe(
      idx(navigateTour, 'set-lists'),
    );
    expect(resumeIndex(lessonTour, idx(lessonTour, 'record'))).toBe(
      idx(lessonTour, 'open-practice-track'),
    );
  });

  it('within a page’s part, never before its start', () => {
    expect(resumeIndex(songsTour, idx(songsTour, 'key-wheel'))).toBe(
      idx(songsTour, 'key'),
    );
  });

  it('knows a Learn tab from another on the same path', () => {
    expect(sameStop('/learn?tab=Songs&q=close', '/learn?tab=Songs')).toBe(true);
    expect(sameStop('/learn?tab=Theory', '/learn?tab=Songs')).toBe(false);
    expect(sameStop('/learn/ionian/C', '/learn/ionian/c?activity=x')).toBe(
      true,
    );
  });
});

describe('a kept place', () => {
  const tours = { lesson: lessonTour, navigate: navigateTour } as never;

  it('is read back as written, and not once it’s a month old or makes no sense', () => {
    const position = {
      tour: 'navigate' as const,
      index: 20,
      ctx,
      lastHref: '/learn?tab=Songs',
      savedAt: Date.now(),
    };
    writePosition(position);
    expect(readPosition(tours)).toEqual(position);
    writePosition({ ...position, savedAt: Date.now() - 31 * 864e5 });
    expect(readPosition(tours)).toBeNull();
    writePosition({ ...position, index: 999 });
    expect(readPosition(tours)).toBeNull();
    localStorage.setItem(POSITION_KEY, '{nope');
    expect(readPosition(tours)).toBeNull();
  });
});

describe('never losing a tour', () => {
  it('a reload on the page the tour was on carries on at its step', async () => {
    const at = idx(navigateTour, 'songs-genre');
    writePosition({
      tour: 'navigate',
      index: at,
      ctx,
      lastHref: '/learn?tab=Songs',
      savedAt: Date.now(),
    });
    const { useLearnTourStore } = openApp('/learn?tab=Songs');
    expect(useLearnTourStore.getState()).toMatchObject({
      tour: 'navigate',
      index: at,
      offer: null,
    });
  });

  it('opening the app elsewhere offers it back, and Quit keeps it for later', async () => {
    writePosition({
      tour: 'navigate',
      index: idx(navigateTour, 'key-wheel'),
      ctx,
      lastHref: '/songs/they_long_to_be_close_to_you',
      savedAt: Date.now(),
    });
    const { useLearnTourStore } = openApp('/learn');
    const store = useLearnTourStore.getState;
    expect(store().tour).toBeNull();
    expect(store().offer?.ask).toBe('load');
    store().closeOffer();
    expect(store().offer).toBeNull();
    expect(readPosition({ navigate: navigateTour } as never)?.quit).toBe(true);
  });

  it('picks up at the step that opens what was lost', async () => {
    writePosition({
      tour: 'navigate',
      index: idx(navigateTour, 'key-wheel'),
      ctx,
      lastHref: '/songs/they_long_to_be_close_to_you',
      savedAt: Date.now(),
    });
    const { useLearnTourStore } = openApp('/learn');
    useLearnTourStore.getState().resume();
    expect(useLearnTourStore.getState()).toMatchObject({
      tour: 'navigate',
      index: idx(navigateTour, 'key'),
      lastHref: null,
    });
  });

  it('starting a tour quit midway asks: pick up, or start over', async () => {
    const { useLearnTourStore } = openApp('/learn');
    const store = useLearnTourStore.getState;
    store().start('navigate');
    store().goTo(idx(navigateTour, 'songs-sort'));
    store().quit();
    store().start('navigate');
    expect(store().tour).toBeNull();
    expect(store().offer?.ask).toBe('start');
    store().startOver();
    expect(store()).toMatchObject({ tour: 'navigate', index: 0, offer: null });
    store().goTo(idx(navigateTour, 'songs-sort'));
    store().quit();
    store().start('navigate');
    store().resume();
    expect(store().index).toBe(idx(navigateTour, 'songs-sort'));
  });

  it('a finished tour starts afresh next time', async () => {
    const { useLearnTourStore } = openApp('/learn');
    const store = useLearnTourStore.getState;
    store().start('lesson', { returnTo: '/learn/ionian/c' });
    store().goTo(5);
    store().goTo(lessonTour.steps.length);
    expect(store().finale).toBe('lesson');
    expect(localStorage.getItem(POSITION_KEY)).toBeNull();
    store().endFinale();
    store().start('lesson');
    expect(store()).toMatchObject({ tour: 'lesson', index: 0, offer: null });
  });
});
