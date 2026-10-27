import { afterEach, describe, expect, it } from 'vitest';
import { useSetListSandbox } from '@/features/setlists/storage/setListSandbox';
import { useTourPremiumPreview } from '@/hooks/tourPremiumPreview';
import { TOURS, useLearnTourStore } from '../learnTourStore';

const store = () => useLearnTourStore.getState();
const indexOf = (id: string) =>
  TOURS.navigate.steps.findIndex((s) => s.id === id);
const sandboxOn = () => useSetListSandbox.getState().active;
const previewOn = () => useTourPremiumPreview.getState().on;

afterEach(() => {
  store().quit();
  store().endFinale();
});

describe('the running tour', () => {
  it('starts at its first step, from where the player is', () => {
    store().start('lesson', { returnTo: '/learn/keyboard/ionian/c' });
    expect(store()).toMatchObject({ tour: 'lesson', index: 0, finale: null });
    expect(store().ctx.returnTo).toBe('/learn/keyboard/ionian/c');
  });

  it('turns the practice copy and the preview on for their steps and off after', () => {
    store().start('navigate');
    expect(sandboxOn()).toBe(false);
    store().goTo(indexOf('save-version'));
    expect(sandboxOn()).toBe(true);
    store().goTo(indexOf('place-the-list'));
    expect(sandboxOn()).toBe(true);
    store().goTo(indexOf('open-genre'));
    expect(sandboxOn()).toBe(false);
    expect(previewOn()).toBe(true);
    store().goTo(indexOf('open-theory'));
    expect(previewOn()).toBe(false);
  });

  it('turns both off when the player quits midway', () => {
    store().start('navigate');
    store().goTo(indexOf('course-theory'));
    expect(previewOn()).toBe(true);
    store().quit();
    expect(previewOn()).toBe(false);
    expect(store()).toMatchObject({ tour: null, finale: null });
    store().start('navigate');
    store().goTo(indexOf('place-the-list'));
    store().quit();
    expect(sandboxOn()).toBe(false);
  });

  it('ends on its finale past the last step', () => {
    store().start('lesson');
    store().goTo(TOURS.lesson.steps.length);
    expect(store()).toMatchObject({ tour: null, finale: 'lesson' });
    store().endFinale();
    expect(store().finale).toBeNull();
  });
});
