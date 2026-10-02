// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { stepAccessibleName } from '../GuitarStepList';
import { GuitarStepNav } from '../GuitarStepNav';
import type { StepNavModel } from '../types';
import { KEY_COLOR, makeNav, makeSteps } from './fixtures';

afterEach(cleanup);

function setup(overrides: Partial<StepNavModel> = {}) {
  const nav = makeNav(overrides);
  const view = render(<GuitarStepNav nav={nav} keyColor={KEY_COLOR} />);
  return { ...view, nav };
}

const openList = () =>
  fireEvent.click(screen.getByRole('button', { name: /^Step \d+ of \d+/ }));

describe('GuitarStepNav — sections', () => {
  it('names each section with its letter; the eye reads just the name', () => {
    setup();
    for (const name of ['A Melody', 'B Chords', 'D Play-Along']) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument();
    }
    const chords = screen.getByRole('button', { name: 'B Chords' });
    expect(chords.textContent).toBe('Chords');
  });

  it('marks the active section current, and a finished one with ✓', () => {
    setup();
    expect(screen.getByRole('button', { name: 'A Melody' })).toHaveAttribute(
      'aria-current',
      'true',
    );
    expect(
      screen.getByRole('button', { name: 'B Chords' }),
    ).not.toHaveAttribute('aria-current');
    const chords = screen.getByRole('button', { name: 'B Chords' });
    expect(chords.querySelector('[data-section-done]')).not.toBeNull();
    expect(chords).toHaveAccessibleDescription('Every step passed');
    expect(
      screen
        .getByRole('button', { name: 'A Melody' })
        .querySelector('[data-section-done]'),
    ).toBeNull();
  });

  it('shows no percentages', () => {
    const { container } = setup();
    expect(container.textContent).not.toMatch(/%/);
  });

  it('switches section', () => {
    const { nav } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'D Play-Along' }));
    expect(nav.onSection).toHaveBeenCalledWith('D');
  });

  it('keeps ♪ Practice Track, same label and action, when offered', () => {
    const { nav, rerender } = setup();
    const button = screen.getByRole('button', { name: '♪ Practice Track' });
    expect(button).toHaveAttribute('title', 'Play over the Melody groove');
    fireEvent.click(button);
    expect(nav.practiceTrack!.onOpen).toHaveBeenCalledTimes(1);

    rerender(
      <GuitarStepNav
        nav={{ ...nav, practiceTrack: null }}
        keyColor={KEY_COLOR}
      />,
    );
    expect(screen.queryByRole('button', { name: /Practice Track/ })).toBeNull();
  });
});

describe('GuitarStepNav — pager', () => {
  it('reads "3 / 4" and names the step', () => {
    setup();
    const count = screen.getByRole('button', {
      name: 'Step 3 of 4, attempted',
    });
    expect(count).toHaveTextContent(/^3\s*\/\s*4$/);
  });

  it('shows ✓ or ✋ on the count for a passed or self-counted step', () => {
    setup({ index: 0 });
    const passed = screen.getByRole('button', { name: 'Step 1 of 4, passed' });
    expect(passed.querySelector('[data-status-mark="passed"]')).not.toBeNull();
    cleanup();
    setup({ index: 1 });
    const counted = screen.getByRole('button', {
      name: 'Step 2 of 4, counted by you',
    });
    expect(
      counted.querySelector('[data-status-mark="selfReported"]'),
    ).not.toBeNull();
  });

  it('‹ and › step through goToStep', () => {
    const { nav } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Previous step' }));
    expect(nav.goToStep).toHaveBeenLastCalledWith(1);
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    expect(nav.goToStep).toHaveBeenLastCalledWith(3);
  });

  it('disables ‹ on the first step and › on the last', () => {
    setup({ index: 0 });
    expect(
      screen.getByRole('button', { name: 'Previous step' }),
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next step' })).toBeEnabled();
    cleanup();
    setup({ index: 3 });
    expect(screen.getByRole('button', { name: 'Previous step' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Next step' })).toBeDisabled();
  });
});

describe('GuitarStepNav — step list', () => {
  it('is closed until the count is pressed', () => {
    setup();
    expect(screen.queryByRole('dialog')).toBeNull();
    openList();
    expect(
      screen.getByRole('dialog', { name: 'All steps in this section' }),
    ).toBeInTheDocument();
  });

  it('groups the steps by subsection', () => {
    setup();
    openList();
    const list = screen.getByRole('dialog');
    const a1 = within(list).getByRole('region', { name: 'A1: Major Scale' });
    const a2 = within(list).getByRole('region', { name: 'A2: Melody' });
    expect(within(a1).getAllByRole('button')).toHaveLength(3);
    expect(within(a2).getAllByRole('button')).toHaveLength(1);
  });

  it('says how each step went: passed, counted by you, attempted', () => {
    setup();
    openList();
    const list = screen.getByRole('dialog');
    expect(
      within(list).getByRole('button', {
        name: 'A1.1: Major Scale Ascending (Out of Time): passed',
      }),
    ).toBeInTheDocument();
    // The pattern the container's tests look for.
    const counted = within(list).getByRole('button', {
      name: /A1\.\d.*: counted by you$/,
    });
    expect(counted).toHaveAccessibleName(
      'A1.2: Major Scale Ascending (In Time): counted by you',
    );
    expect(
      counted.querySelector('[data-status-mark="selfReported"]'),
    ).not.toBeNull();
    expect(
      within(list).getByRole('button', {
        name: 'A1.3: Major Scale Descending (Out of Time): attempted',
      }),
    ).toBeInTheDocument();
    const todo = within(list).getByRole('button', {
      name: 'A2.1: 3 Note Contour (Out of Time)',
    });
    expect(todo.querySelector('[data-status-mark]')).toBeNull();
  });

  it('marks the current step and focuses it', () => {
    setup();
    openList();
    const current = screen.getByRole('button', {
      name: 'A1.3: Major Scale Descending (Out of Time): attempted',
    });
    expect(current).toHaveAttribute('aria-current', 'step');
    expect(current).toHaveFocus();
    expect(
      screen
        .getAllByRole('button')
        .filter((b) => b.hasAttribute('aria-current')),
    ).toEqual([screen.getByRole('button', { name: 'A Melody' }), current]);
  });

  it('opens a step and closes', () => {
    const { nav } = setup();
    openList();
    fireEvent.click(
      screen.getByRole('button', {
        name: 'A2.1: 3 Note Contour (Out of Time)',
      }),
    );
    expect(nav.goToStep).toHaveBeenCalledWith(3);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('stepAccessibleName puts the status after the code and title', () => {
    const [passed, counted, attempted, todo] = makeSteps();
    expect(stepAccessibleName(passed)).toMatch(/: passed$/);
    expect(stepAccessibleName(counted)).toMatch(/^A1\.2: .*: counted by you$/);
    expect(stepAccessibleName(attempted)).toMatch(/: attempted$/);
    expect(stepAccessibleName(todo)).toBe('A2.1: 3 Note Contour (Out of Time)');
  });
});

describe('GuitarStepNav — progress line', () => {
  it('one 2px segment per step: passed, attempted, untried; current in the key colour', () => {
    const { container } = setup();
    const line = container.querySelector('[data-guitar-progress]')!;
    expect(line).toHaveAttribute('aria-hidden');
    const segments = [...line.children] as HTMLElement[];
    expect(segments.map((s) => s.dataset.segment)).toEqual([
      'passed',
      'selfReported',
      'current',
      'todo',
    ]);
    expect(segments[0].className).toMatch(/bg-white\/55/);
    expect(segments[1].className).toMatch(/bg-white\/55/);
    expect(segments[3].className).toMatch(/bg-white\/\[0\.08\]/);
    expect(segments[2].style.backgroundColor).toBe('rgb(210, 64, 74)');
    // The key colour is on the current segment only.
    expect(segments.filter((s) => s.style.backgroundColor !== '')).toHaveLength(
      1,
    );
  });

  it('an attempted step that is not current is white/20', () => {
    const { container } = setup({ index: 0 });
    const segments = [
      ...container.querySelector('[data-guitar-progress]')!.children,
    ] as HTMLElement[];
    expect(segments[2].dataset.segment).toBe('attempted');
    expect(segments[2].className).toMatch(/bg-white\/20/);
  });
});
