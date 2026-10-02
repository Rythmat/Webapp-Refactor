// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  GuitarLessonHeader,
  eyebrowSubsection,
  lessonTitle,
  type GuitarLessonHeaderProps,
} from '../GuitarLessonHeader';
import { KEY_COLOR, makeLayoutProps } from './fixtures';

afterEach(cleanup);

function setup(overrides: Partial<GuitarLessonHeaderProps> = {}) {
  const props: GuitarLessonHeaderProps = {
    header: makeLayoutProps().header,
    aboutHasNews: false,
    aboutOpen: false,
    onOpenAbout: vi.fn(),
    settingsOpen: false,
    onOpenSettings: vi.fn(),
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
  it('titles the step without its code or its timing', () => {
    setup();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Major Scale Descending' }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/A1\.3:/)).toBeNull();
    expect(screen.queryByText(/Out of Time/)).toBeNull();
  });

  it('crumbs are buttons that go where they say', () => {
    const { props } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Theory' }));
    expect(props.header.crumbs[0].onClick).toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole('button', { name: 'Guitar · Ionian (Major)' }),
    );
    expect(props.header.crumbs[1].onClick).toHaveBeenCalled();
    const trail = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(trail).toHaveTextContent(
      /Theory›Guitar · Ionian \(Major\)›C major›A1 Major Scale/,
    );
  });

  it('leaves Theory and the subsection out of a phone’s trail, so the key is never cut off', () => {
    const { container } = setup();
    const subsection = container.querySelector<HTMLElement>(
      '[data-crumb-subsection]',
    )!;
    expect(subsection).toHaveTextContent('A1 Major Scale');
    expect(subsection.className).toMatch(/(^| )max-\[639px\]:hidden( |$)/);
    // Its separator goes with it.
    expect(
      (subsection.previousElementSibling as HTMLElement).className,
    ).toMatch(/(^| )max-\[639px\]:hidden( |$)/);
    // Theory and its separator go; the mode's crumb (back to the mode, and
    // from there to Theory) and the key stay.
    const theory = screen.getByRole('button', { name: 'Theory' })
      .parentElement as HTMLElement;
    expect(theory.className).toMatch(/(^| )max-\[639px\]:hidden( |$)/);
    expect((theory.nextElementSibling as HTMLElement).className).toMatch(
      /(^| )max-\[639px\]:hidden( |$)/,
    );
    const mode = screen.getByRole('button', { name: 'Guitar · Ionian (Major)' })
      .parentElement as HTMLElement;
    expect(mode.className).not.toMatch(/hidden/);
    const key = container.querySelector('[data-guitar-key-dot]')!
      .parentElement as HTMLElement;
    expect(key.className).not.toMatch(/hidden/);
  });

  it('the key dot is the header’s only colour', () => {
    const { container } = setup();
    const dot = container.querySelector<HTMLElement>('[data-guitar-key-dot]')!;
    expect(dot.style.backgroundColor).toBe('rgb(210, 64, 74)');
    const coloured = [...container.querySelectorAll<HTMLElement>('*')].filter(
      (el) => el.style.color || el.style.backgroundColor,
    );
    expect(coloured).toEqual([dot]);
    expect(KEY_COLOR).toBe('#D2404A');
  });

  it('About this step and the gear open their sheets', () => {
    const { props } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'About this step' }));
    expect(props.onOpenAbout).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Lesson settings' }));
    expect(props.onOpenSettings).toHaveBeenCalledTimes(1);
  });

  it('say whether their sheets are open', () => {
    setup({ aboutOpen: true });
    expect(
      screen.getByRole('button', { name: 'About this step' }),
    ).toHaveAttribute('aria-expanded', 'true');
    expect(
      screen.getByRole('button', { name: 'Lesson settings' }),
    ).toHaveAttribute('aria-expanded', 'false');
  });

  it('marks About this step when the step has unseen notes', () => {
    const { rerender, props, container } = setup();
    const about = () => screen.getByRole('button', { name: 'About this step' });
    expect(container.querySelector('[data-guitar-about-dot]')).toBeNull();
    expect(about()).not.toHaveAccessibleDescription();

    rerender(<GuitarLessonHeader {...props} aboutHasNews />);
    expect(container.querySelector('[data-guitar-about-dot]')).not.toBeNull();
    expect(about()).toHaveAccessibleDescription('New notes for this step');
  });

  it('shows the input indicator it is given', () => {
    setup({ inputIndicator: <button type="button">Set up guitar</button> });
    expect(
      screen.getByRole('button', { name: 'Set up guitar' }),
    ).toBeInTheDocument();
  });
});
