// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  GuitarLessonHeader,
  eyebrowSubsection,
  lessonTitle,
  type GuitarLessonHeaderProps,
} from '../GuitarLessonHeader';
import { makeLayoutProps } from './fixtures';

afterEach(cleanup);

function setup(overrides: Partial<GuitarLessonHeaderProps> = {}) {
  const props: GuitarLessonHeaderProps = {
    header: makeLayoutProps().header,
    ...overrides,
  };
  const view = render(<GuitarLessonHeader {...props} />);
  return { ...view, props };
}

describe('lessonTitle', () => {
  it.each([
    ['A1.1: Major Scale Ascending (Out of Time)', 'Major Scale Ascending'],
    ['A1.2: Major Scale Ascending (In Time)', 'Major Scale Ascending'],
    [
      'A1.6: Major Scale Ascending & Descending (In Time)',
      'Major Scale Ascending & Descending',
    ],
    ['B2.1: Play Chords 1,2,3,4 (Out of Time)', 'Play Chords 1,2,3,4'],
    // Other brackets say something the bar doesn't: they stay.
    [
      'B2.2: Play Chords 1,2,3,4 (Whole Notes)',
      'Play Chords 1,2,3,4 (Whole Notes)',
    ],
    ['A3.2: 3 Note Contour (Legato)', '3 Note Contour (Legato)'],
    [
      'B7.10: Arpeggiate The 5 7th Chord (In Time)',
      'Arpeggiate The 5 7th Chord',
    ],
    [
      'D1.1: Three Note Contour — Play Along',
      'Three Note Contour — Play Along',
    ],
    [
      'D3.4: Music Map — Example 4 (Four Bars)',
      'Music Map — Example 4 (Four Bars)',
    ],
    ['Free Play', 'Free Play'],
  ])('%s → %s', (activity, title) => {
    expect(lessonTitle(activity)).toBe(title);
  });
});

describe('eyebrowSubsection', () => {
  it('drops the colon after the code', () => {
    expect(eyebrowSubsection('A1: Major Scale')).toBe('A1 Major Scale');
    expect(eyebrowSubsection('B1: Arpeggiate Chords (Triads)')).toBe(
      'B1 Arpeggiate Chords (Triads)',
    );
  });
});

describe('GuitarLessonHeader', () => {
  it('titles the lesson for its key, the step in the subtitle without its code or timing', () => {
    setup();
    expect(
      screen.getByRole('heading', { level: 1, name: 'C major' }),
    ).toBeInTheDocument();
    expect(document.querySelector('[data-subtitle-step]')?.textContent).toBe(
      'Major Scale Descending',
    );
    expect(screen.queryByText(/A1\.3:/)).toBeNull();
    expect(screen.queryByText(/Out of Time/)).toBeNull();
  });

  it('leads the subtitle with the section, or without one the subsection', () => {
    setup({ section: 'Melody' });
    expect(document.querySelector('[data-guitar-subtitle]')?.textContent).toBe(
      'Melody: Major Scale Descending',
    );
    cleanup();
    setup();
    expect(document.querySelector('[data-guitar-subtitle]')?.textContent).toBe(
      'A1 Major Scale: Major Scale Descending',
    );
  });

  it('has no trail (the lesson rail leads back) and no colour of its own', () => {
    const { container } = setup();
    expect(screen.queryByRole('navigation', { name: 'Breadcrumb' })).toBeNull();
    const coloured = [...container.querySelectorAll<HTMLElement>('*')].filter(
      (el) => el.style.color || el.style.backgroundColor,
    );
    expect(coloured).toEqual([]);
  });

  it('leaves About this step and the settings to the tool rail', () => {
    setup();
    expect(
      screen.queryByRole('button', { name: 'About this step' }),
    ).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Lesson settings' }),
    ).toBeNull();
  });

  it('shows the input indicator it is given', () => {
    setup({ inputIndicator: <button type="button">Set up guitar</button> });
    expect(
      screen.getByRole('button', { name: 'Set up guitar' }),
    ).toBeInTheDocument();
  });
});
