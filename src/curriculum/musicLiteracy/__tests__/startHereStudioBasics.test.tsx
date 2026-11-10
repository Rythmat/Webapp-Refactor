// @vitest-environment jsdom
import { act, cleanup, render, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { StartHere } from '@/components/learn/StartHere';
import { useTutorialProgressStore } from '@/features/tutorials/useTutorialProgressStore';

/**
 * Learn → Start Here's fourth stop, Studio Basics: open, its way in the
 * Studio's one Studio Basics lesson on a blank project; done once that
 * lesson is. It follows the student's lesson completions as they load.
 */

const LESSON = 'studio-basics';

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
  it('is open, Studio Basics in the Studio its way in', () => {
    const card = renderPath();
    expect(stop().getAttribute('data-path-status')).toBe('new');
    expect(card.getByText('Learn Studio Basics')).toBeTruthy();
    expect(card.getByText(/^Studio$/)).toBeTruthy();
    expect(
      card
        .getByRole('link', { name: 'Start Learn Studio Basics' })
        .getAttribute('href'),
    ).toBe('/studio?tutorial=studio-basics');
    // No key to wear: the lesson isn't in one.
    expect(card.queryByRole('img', { name: /Major|Minor/ })).toBeNull();
  });

  it('is done once the lesson is, to take again', () => {
    finish(LESSON);
    const card = renderPath();
    expect(stop().getAttribute('data-path-status')).toBe('done');
    expect(
      card
        .getByRole('link', { name: 'Play again Learn Studio Basics' })
        .getAttribute('href'),
    ).toBe('/studio?tutorial=studio-basics');
  });

  it('follows the student’s completions as they load', () => {
    renderPath();
    expect(stop().getAttribute('data-path-status')).toBe('new');
    finish(LESSON);
    expect(stop().getAttribute('data-path-status')).toBe('done');
  });
});
