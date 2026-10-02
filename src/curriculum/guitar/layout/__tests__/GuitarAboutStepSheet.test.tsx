// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sectionBCardSeenId } from '@/curriculum/components/guitar/theory/theoryUi';
import type { GuitarKeyName } from '@/curriculum/data/guitar/types';
import { useGuitarDisplaySettings } from '@/features/learn/useGuitarDisplaySettings';
import {
  GuitarAboutStepSheet,
  useAboutStepNews,
  type GuitarAboutStepSheetProps,
} from '../GuitarAboutStepSheet';
import type { TheoryModel } from '../types';
import { theoryFor } from './sheetFixtures';

const INSTRUCTION = 'Play the notes of the scale from lowest to highest.';

/** The About button's dot, as the header shows it. */
function NewsDot({ theory }: { theory: TheoryModel }) {
  return useAboutStepNews(theory) ? <span data-testid="news" /> : null;
}

function Lesson(props: GuitarAboutStepSheetProps) {
  return (
    <>
      <button type="button">About this step</button>
      <NewsDot theory={props.theory} />
      <GuitarAboutStepSheet {...props} />
    </>
  );
}

function renderLesson(
  key: GuitarKeyName,
  id: string,
  over: Partial<TheoryModel> = {},
  open = false,
) {
  const props: GuitarAboutStepSheetProps = {
    open,
    onOpenChange: vi.fn(),
    theory: theoryFor(key, id, over),
    instruction: INSTRUCTION,
  };
  const view = render(<Lesson {...props} />);
  const setOpen = (next: boolean) =>
    view.rerender(<Lesson {...props} open={next} />);
  return { ...view, props, setOpen };
}

const dismissed = () => useGuitarDisplaySettings.getState().dismissedNotes;
const news = () => screen.queryByTestId('news') !== null;
const shownNotes = () =>
  [...document.querySelectorAll('[data-step-intro] [data-theory-note]')].map(
    (el) => el.getAttribute('data-theory-note'),
  );
const sectionB = () =>
  screen.queryByRole('region', { name: 'Chords come from the scale' });
const sectionBToggle = () =>
  screen.getByRole('button', { name: 'Chords come from the scale' });

beforeEach(() => {
  localStorage.clear();
  useGuitarDisplaySettings.setState({
    dismissedNotes: [],
    showRomanNumerals: false,
  });
});
afterEach(cleanup);

describe('GuitarAboutStepSheet: opening', () => {
  it('opens only when asked, and marks nothing seen until then', () => {
    const { setOpen } = renderLesson('C', 'A1.1');
    expect(screen.queryByRole('dialog')).toBeNull();
    // Rendering the lesson (closed sheet, and the dot) marks nothing.
    setOpen(false);
    expect(dismissed()).toEqual([]);
    expect(news()).toBe(true);

    setOpen(true);
    expect(
      screen.getByRole('dialog', {
        name: /^About this step\s?: Major Scale Ascending$/,
      }),
    ).toBeInTheDocument();
    // Opening is reading: the step's intro notes are seen, the dot clears.
    expect(dismissed()).toEqual(['a1.steps', 'a1.fingers']);
    expect(news()).toBe(false);
  });

  it('marks once under StrictMode too', () => {
    render(
      <StrictMode>
        <GuitarAboutStepSheet
          open
          onOpenChange={() => {}}
          theory={theoryFor('C', 'A1.1')}
          instruction={INSTRUCTION}
        />
      </StrictMode>,
    );
    expect(dismissed()).toEqual(['a1.steps', 'a1.fingers']);
  });

  it('focuses its title, and gives focus back when it closes', async () => {
    const { setOpen } = renderLesson('C', 'A1.1');
    const trigger = screen.getByRole('button', { name: 'About this step' });
    trigger.focus();
    setOpen(true);
    expect(document.activeElement).toBe(
      screen.getByRole('heading', { level: 2 }),
    );
    expect(document.activeElement).toHaveTextContent(
      /^About this step: ?Major Scale Ascending$/,
    );
    setOpen(false);
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it('closes on a press on the dimmed lesson, however it was opened', async () => {
    // Safari leaves focus on the page when the About button is clicked.
    const { props, setOpen } = renderLesson('C', 'A1.1');
    (document.activeElement as HTMLElement | null)?.blur();
    setOpen(true);
    // Radix listens for presses outside from the tick after it opens.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    fireEvent.pointerDown(document.body);
    expect(props.onOpenChange).toHaveBeenCalledWith(false);
  });

  it('is modal: the lesson behind it waits', () => {
    renderLesson('C', 'A1.1', {}, true);
    // Hidden from assistive tech while the sheet is open.
    expect(
      screen.queryByRole('button', { name: 'About this step' }),
    ).toBeNull();
  });
});

describe('GuitarAboutStepSheet: contents', () => {
  it('starts with the full instruction, then the notes, open, with nothing to close', () => {
    renderLesson('C', 'A1.2', {}, true);
    const dialog = screen.getByRole('dialog');
    expect(dialog.querySelector('[data-about-instruction]')).toHaveTextContent(
      INSTRUCTION,
    );
    expect(shownNotes()).toEqual(['a1.steps', 'a1.fingers', 'a1.slowFirst']);
    expect(
      within(dialog).getByRole('heading', { name: 'Whole and half steps' }),
    ).toBeInTheDocument();
    expect(within(dialog).getByText(/A whole step is 2 frets\./)).toBeTruthy();
    expect(within(dialog).queryByRole('button', { name: 'Got it' })).toBeNull();
    // No Section B content in Section A.
    expect(sectionB()).toBeNull();
  });

  it('lists "More notes" most relevant first, each opening on request', () => {
    useGuitarDisplaySettings.setState({ dismissedNotes: ['b7.plusOne'] });
    renderLesson('C', 'B8.1', {}, true);
    const list = screen.getByRole('list', { name: 'More notes' });
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((li) => li.getAttribute('data-info-note')),
    ).toEqual([
      'b8.topNote',
      'b8.octaveSame',
      'b7.kinds',
      'b7.sound',
      'b7.oneNote',
      'b7.why',
    ]);
    const why = within(list).getByRole('button', { name: 'Why these shapes?' });
    expect(why).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText(/Four notes packed close together/)).toBeNull();
    fireEvent.click(why);
    expect(screen.getByText(/Four notes packed close together/)).toBeTruthy();
    // "More notes" are not marked by opening the sheet.
    expect(dismissed()).not.toContain('b8.topNote');
  });

  it('adds the practice tips while practising', () => {
    const view = renderLesson('C', 'A2.1', {}, true);
    expect(screen.queryByRole('heading', { name: 'Practice tips' })).toBeNull();
    view.unmount();

    renderLesson('C', 'A2.1', { practising: true }, true);
    const tips = screen.getByRole('region', { name: 'Practice tips' });
    expect(
      [...tips.querySelectorAll('[data-theory-note]')].map((el) =>
        el.getAttribute('data-theory-note'),
      ),
    ).toEqual(['pt.focus', 'pt.clean']);
  });

  it('compares four 7th chords on the same root on B7', () => {
    const onHearShape = vi.fn();
    renderLesson('C', 'B7.1', { onHearShape }, true);
    fireEvent.click(
      screen.getByRole('button', { name: 'Same root, four kinds' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Hear C minor 7' }));
    expect(onHearShape).toHaveBeenCalledWith('X-3-5-3-4-X');
  });

  it('ends with the key, opening on request', () => {
    renderLesson('F#', 'A1.1', {}, true);
    const about = screen.getByRole('button', { name: 'About F♯ major' });
    expect(about).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(about);
    const region = screen.getByRole('region', { name: 'About F♯ major' });
    expect(region).toHaveTextContent('Its minor partner');
    expect(
      within(region).getByRole('list', { name: 'Chords in this key' }),
    ).toBeInTheDocument();
  });
});

describe('GuitarAboutStepSheet: Section B', () => {
  it('shows "Chords come from the scale" on B steps, open while it is new', () => {
    const { setOpen } = renderLesson('C', 'B1.2');
    // Due for the key: the dot shows although the step's notes were seen.
    useGuitarDisplaySettings.setState({
      dismissedNotes: ['b1.arp', 'b.barreCare@C'],
    });
    setOpen(false);
    expect(news()).toBe(true);

    setOpen(true);
    expect(sectionB()).toBeInTheDocument();
    expect(sectionBToggle()).toHaveAttribute('aria-expanded', 'true');
    // No frame and nothing to close: the sheet closes.
    expect(screen.queryByRole('button', { name: 'Got it' })).toBeNull();
    expect(dismissed()).toContain(sectionBCardSeenId('C'));
    expect(news()).toBe(false);
    // Still open while it is read.
    expect(sectionBToggle()).toHaveAttribute('aria-expanded', 'true');

    // Seen: next time it waits behind its title.
    setOpen(false);
    setOpen(true);
    expect(sectionBToggle()).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(sectionBToggle());
    expect(sectionBToggle()).toHaveAttribute('aria-expanded', 'true');
  });

  it('shows hand care once, in the Section B block while that is new', () => {
    // D♭ opens Section B with barre triads: the block carries hand care.
    const { setOpen } = renderLesson('Db', 'B1.1', {}, true);
    expect(
      document.querySelectorAll('[data-theory-note="b.barreCare"]'),
    ).toHaveLength(1);
    expect(shownNotes()).toEqual(['b1.arp']);
    expect(dismissed()).toEqual(
      expect.arrayContaining([sectionBCardSeenId('Db'), 'b.barreCare@Db']),
    );

    // Seen: the block waits closed, and the step's notes carry hand care;
    // opening the block doesn't show it again.
    setOpen(false);
    setOpen(true);
    expect(sectionBToggle()).toHaveAttribute('aria-expanded', 'false');
    expect(shownNotes()).toEqual(['b.barreCare', 'b1.arp']);
    fireEvent.click(sectionBToggle());
    expect(
      document.querySelectorAll('[data-theory-note="b.barreCare"]'),
    ).toHaveLength(1);
  });

  it("keeps hand care in the Section B block on steps whose notes don't have it", () => {
    useGuitarDisplaySettings.setState({
      dismissedNotes: [sectionBCardSeenId('Db'), 'b.barreCare@Db'],
    });
    renderLesson('Db', 'B2.1', {}, true);
    fireEvent.click(sectionBToggle());
    expect(
      sectionB()!.querySelectorAll('[data-theory-note="b.barreCare"]'),
    ).toHaveLength(1);
    expect(shownNotes()).not.toContain('b.barreCare');
  });

  it('has nothing new once everything was read', () => {
    useGuitarDisplaySettings.setState({
      dismissedNotes: [sectionBCardSeenId('C'), 'b1.arp', 'b.barreCare@C'],
    });
    renderLesson('C', 'B1.2');
    expect(news()).toBe(false);
  });
});
