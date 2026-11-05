// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  GuitarLessonHeader,
  eyebrowSubsection,
  lessonTitle,
  withLessonTitle,
  type GuitarLessonHeaderProps,
} from '../GuitarLessonHeader';
import { LessonTextEditingContext } from '../lessonTextEditing';
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

describe('withLessonTitle', () => {
  it.each([
    [
      'B1.1: 1-7 Shells — ii–V–I (Out of Time)',
      'Dominant 7th Shells',
      'B1.1: Dominant 7th Shells (Out of Time)',
    ],
    [
      'A1.2: Major Scale (In Time)',
      'Major Scale Up',
      'A1.2: Major Scale Up (In Time)',
    ],
    ['A3.2: 3 Note Contour (Legato)', 'Contour', 'A3.2: Contour'],
    ['Warm-up', 'Warm-up Two', 'Warm-up Two'],
  ])('%s with the title %s is %s', (activity, title, expected) => {
    expect(withLessonTitle(activity, title)).toBe(expected);
    expect(lessonTitle(withLessonTitle(activity, title))).toBe(title);
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

  it('edits the section and title in place, in the console’s editor only', () => {
    const edits: string[] = [];
    const { props } = setup({ section: 'Chords' });
    expect(screen.queryByRole('button', { name: /Step title/ })).toBeNull();
    cleanup();
    render(
      <LessonTextEditingContext.Provider
        value={{
          activity: props.header.activity,
          setActivity: (a) => edits.push(a),
          sectionName: 'Chords',
          setSectionName: (n) => edits.push(`section ${n}`),
          chordSymbols: [],
          setChordSymbols: () => {},
        }}
      >
        <GuitarLessonHeader {...props} section="Chords" />
      </LessonTextEditingContext.Provider>,
    );
    fireEvent.click(screen.getByRole('button', { name: /Step title/ }));
    const input = screen.getByRole('textbox', { name: 'Step title' });
    fireEvent.change(input, { target: { value: 'A new title' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: /Section name/ }));
    const section = screen.getByRole('textbox', { name: 'Section name' });
    fireEvent.change(section, { target: { value: 'Voicings' } });
    fireEvent.keyDown(section, { key: 'Enter' });
    expect(edits).toEqual([
      withLessonTitle(props.header.activity, 'A new title'),
      'section Voicings',
    ]);
  });
});
