// @vitest-environment jsdom
import { act, cleanup, render, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { StartHere } from '@/components/learn/StartHere';
import { TUTORIAL_COURSES } from '@/daw/components/Tutorial/tutorialCatalog';
import { useTutorialProgressStore } from '@/features/tutorials/useTutorialProgressStore';

/**
 * Learn → Start Here's fourth stop, Studio Basics: open, its way in the
 * Studio's lesson 1 on the course's demo song, or the first lesson not
 * finished; its lessons counted as pips; done once every lesson is. It
 * follows the student's lesson completions as they load.
 */

const LESSONS = TUTORIAL_COURSES[0].lessonIds;

const stop = () =>
  document.querySelector<HTMLElement>('[data-path-stop="studio-basics"]')!;

function renderPath() {
  render(
    <MemoryRouter>
      <StartHere />
    </MemoryRouter>,
  );
  return within(stop());
}

const finish = (...ids: string[]) =>
  act(() => {
    useTutorialProgressStore.setState({
      completedAt: Object.fromEntries(ids.map((id, i) => [id, i + 1])),
    });
  });

beforeEach(() => {
  localStorage.clear();
  useTutorialProgressStore.setState({ completedAt: {} });
});
afterEach(() => cleanup());

describe('Start Here’s Studio Basics stop', () => {
  it('is open, lesson 1 in the Studio its way in', () => {
    const card = renderPath();
    expect(stop().getAttribute('data-path-status')).toBe('new');
    expect(card.getByText('Learn Studio Basics')).toBeTruthy();
    expect(card.getByText(/^Studio$/)).toBeTruthy();
    expect(
      card
        .getByRole('link', { name: 'Start Learn Studio Basics' })
        .getAttribute('href'),
    ).toBe('/studio/editor?tutorial=studio-basics-your-tracks');
    expect(card.getByRole('img', { name: '0 of 9 lessons done' })).toBeTruthy();
    expect(card.getByText('9 lessons')).toBeTruthy();
    // No key to wear: the course isn't in one.
    expect(card.queryByRole('img', { name: /Major|Minor/ })).toBeNull();
  });

  it('continues at the first lesson not finished', () => {
    finish(LESSONS[0], LESSONS[1], LESSONS[2]);
    const card = renderPath();
    expect(stop().getAttribute('data-path-status')).toBe('started');
    expect(card.getByText(/3 of 9 lessons/)).toBeTruthy();
    expect(card.getByText(/Next: The Piano Roll/)).toBeTruthy();
    expect(
      card
        .getByRole('link', { name: 'Continue Learn Studio Basics' })
        .getAttribute('href'),
    ).toBe('/studio/editor?tutorial=studio-basics-piano-roll');
    const marks = Array.from(
      stop().querySelectorAll('[data-step-mark]'),
      (el) => el.getAttribute('data-step-mark'),
    );
    expect(marks).toEqual([
      'passed',
      'passed',
      'passed',
      ...Array(6).fill('todo'),
    ]);
  });

  it('is done once every lesson is, to take again from lesson 1', () => {
    finish(...LESSONS);
    const card = renderPath();
    expect(stop().getAttribute('data-path-status')).toBe('done');
    expect(card.getByText('All 9 lessons done')).toBeTruthy();
    expect(
      card
        .getByRole('link', { name: 'Play again Learn Studio Basics' })
        .getAttribute('href'),
    ).toBe('/studio/editor?tutorial=studio-basics-your-tracks');
  });

  it('follows the student’s completions as they load', () => {
    renderPath();
    expect(stop().getAttribute('data-path-status')).toBe('new');
    finish(LESSONS[0]);
    expect(stop().getAttribute('data-path-status')).toBe('started');
  });
});
