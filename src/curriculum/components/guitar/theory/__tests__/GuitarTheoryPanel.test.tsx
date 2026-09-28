// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildGuitarAppliedTheoryFundamentalsFlow } from '@/curriculum/data/activityFlows/guitarAppliedTheoryFundamentals';
import { getGuitarShape } from '@/curriculum/data/guitar/bookOne';
import { theoryStepsFor } from '@/curriculum/data/guitar/theoryConditions';
import type { GuitarKeyName } from '@/curriculum/data/guitar/types';
import type {
  ActivityFlowV2,
  ActivityStepV2,
} from '@/curriculum/types/activity.v2';
import { useGuitarDisplaySettings } from '@/features/learn/useGuitarDisplaySettings';
import {
  GuitarTheoryPanel,
  type GuitarTheoryPanelProps,
} from '../GuitarTheoryPanel';
import { activityId } from '../theoryUi';

const RED = '#D2404A';
const FLOWS = new Map<GuitarKeyName, ActivityFlowV2>();

function flowOf(key: GuitarKeyName): ActivityFlowV2 {
  let flow = FLOWS.get(key);
  if (!flow) {
    flow = buildGuitarAppliedTheoryFundamentalsFlow(key);
    FLOWS.set(key, flow);
  }
  return flow;
}

function stepOf(key: GuitarKeyName, id: string): ActivityStepV2 {
  const step = flowOf(key)
    .sections.flatMap((s) => s.steps)
    .find((s) => activityId(s) === id);
  if (!step) throw new Error(`no step ${id} in ${key}`);
  return step;
}

function props(
  key: GuitarKeyName,
  id: string,
  over: Partial<GuitarTheoryPanelProps> = {},
): GuitarTheoryPanelProps {
  return {
    flow: flowOf(key),
    step: stepOf(key, id),
    keyCenter: key,
    keyColor: RED,
    ...over,
  };
}

const openNotes = () =>
  [...document.querySelectorAll('[data-open-intro]')].map((el) =>
    el.getAttribute('data-theory-note'),
  );
const whyLinks = () =>
  [...document.querySelectorAll('[data-why]')].map((el) =>
    el.getAttribute('data-why'),
  );
const dismissed = () => useGuitarDisplaySettings.getState().dismissedNotes;

beforeEach(() => {
  localStorage.clear();
  useGuitarDisplaySettings.setState({
    dismissedNotes: [],
    showRomanNumerals: false,
    showChordJobs: false,
    showSharedNotes: true,
  });
});
afterEach(cleanup);

describe('GuitarTheoryPanel: intro notes', () => {
  it('opens one intro note per step, in list order, from the first step', () => {
    const view = render(<GuitarTheoryPanel {...props('C', 'A1.1')} />);
    expect(openNotes()).toEqual(['a1.steps']);
    expect(
      screen.getByRole('heading', { name: 'Whole and half steps' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/A whole step is 2 frets\./)).toBeInTheDocument();
    // The next note waits behind a "Why?" link: one idea at a time.
    expect(whyLinks()).toEqual(['a1.fingers']);
    expect(
      screen.getByRole('button', { name: 'Why? One finger per fret' }),
    ).toBeInTheDocument();
    // Shown once is seen: it will not open by itself again.
    expect(dismissed()).toContain('a1.steps');

    view.rerender(<GuitarTheoryPanel {...props('C', 'A1.2')} />);
    expect(openNotes()).toEqual(['a1.fingers']);
    expect(whyLinks()).toEqual(['a1.steps', 'a1.slowFirst']);

    view.rerender(<GuitarTheoryPanel {...props('C', 'A1.3')} />);
    expect(openNotes()).toEqual([]);
    expect(whyLinks()).toEqual(['a1.steps', 'a1.fingers']);

    view.rerender(<GuitarTheoryPanel {...props('C', 'A1.4')} />);
    expect(openNotes()).toEqual(['a1.slowFirst']);
  });

  it('picks the same note under StrictMode', () => {
    render(
      <StrictMode>
        <GuitarTheoryPanel {...props('C', 'A1.1')} />
      </StrictMode>,
    );
    expect(openNotes()).toEqual(['a1.steps']);
    expect(dismissed()).toEqual(['a1.steps']);
  });

  it('collapses a closed note to a "Why?" link and keeps one open at a time', () => {
    render(<GuitarTheoryPanel {...props('C', 'A1.1')} />);
    fireEvent.click(screen.getByRole('button', { name: 'Got it' }));
    expect(openNotes()).toEqual([]);
    expect(whyLinks()).toEqual(['a1.steps', 'a1.fingers']);

    fireEvent.click(
      screen.getByRole('button', { name: 'Why? One finger per fret' }),
    );
    expect(openNotes()).toEqual(['a1.fingers']);
    fireEvent.click(
      screen.getByRole('button', { name: 'Why? Whole and half steps' }),
    );
    expect(openNotes()).toEqual(['a1.steps']);
    fireEvent.click(screen.getByRole('button', { name: 'Got it' }));
    expect(dismissed()).toEqual(
      expect.arrayContaining(['a1.steps', 'a1.fingers']),
    );
  });

  it('moves focus with the note, so it never drops to the page', () => {
    render(<GuitarTheoryPanel {...props('C', 'A1.1')} />);
    fireEvent.click(screen.getByRole('button', { name: 'Got it' }));
    // The note became its link: focus is on it.
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Why? Whole and half steps' }),
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Why? One finger per fret' }),
    );
    // The link became the note: focus is on the note, named by its title.
    const card = screen.getByRole('group', { name: 'One finger per fret' });
    expect(document.activeElement).toBe(card);
    expect(card).toHaveAttribute('data-theory-note', 'a1.fingers');
  });

  it('remembers what was seen on this device', () => {
    const first = render(<GuitarTheoryPanel {...props('C', 'A1.1')} />);
    fireEvent.click(screen.getByRole('button', { name: 'Got it' }));
    first.unmount();
    // Persisted with the display settings.
    expect(localStorage.getItem('music-atlas-guitar-display')).toContain(
      'a1.steps',
    );

    render(<GuitarTheoryPanel {...props('C', 'A1.1')} />);
    expect(openNotes()).toEqual(['a1.fingers']);
    expect(whyLinks()).toEqual(['a1.steps']);
  });

  it('opens the barre-care note on the first barre step, once per key', () => {
    const view = render(<GuitarTheoryPanel {...props('C', 'B1.1')} />);
    expect(openNotes()).toEqual(['b1.arp']);
    view.rerender(<GuitarTheoryPanel {...props('C', 'B1.7')} />);
    expect(openNotes()).toEqual(['b.barreCare']);
    expect(dismissed()).toContain('b.barreCare@C');
    expect(dismissed()).not.toContain('b.barreCare');
    view.unmount();

    // Seen in C: a "Why?" link from then on.
    render(<GuitarTheoryPanel {...props('C', 'B1.7')} />);
    expect(openNotes()).toEqual([]);
    expect(whyLinks()).toEqual(['b.barreCare', 'b1.arp']);
    cleanup();

    // Still due in the next key, on its own first barre step.
    const gSteps = theoryStepsFor(flowOf('G'));
    const firstBarre = gSteps.find((s) =>
      s.shapeIds.some((id) => getGuitarShape(id)?.barre),
    );
    render(<GuitarTheoryPanel {...props('G', firstBarre!.id)} />);
    expect(openNotes()).toEqual(['b.barreCare']);
    expect(dismissed()).toContain('b.barreCare@G');
  });

  it('leaves hand care to the Section B card while that card is due', () => {
    // D♭ opens Section B with barre triads: the card carries hand care.
    const view = render(<GuitarTheoryPanel {...props('Db', 'B1.1')} />);
    expect(openNotes()).toEqual(['b1.arp']);
    expect(whyLinks()).toEqual(['b.barreCare']);
    expect(dismissed()).not.toContain('b.barreCare@Db');

    // The card closes (it marks itself and hand care seen): still one note.
    useGuitarDisplaySettings.setState({
      dismissedNotes: [...dismissed(), 'card.sectionB@Db', 'b.barreCare@Db'],
    });
    view.rerender(<GuitarTheoryPanel {...props('Db', 'B1.1')} />);
    expect(openNotes()).toEqual(['b1.arp']);
    view.unmount();

    // With the card already seen and hand care not, the panel opens it.
    useGuitarDisplaySettings.setState({ dismissedNotes: ['card.sectionB@Db'] });
    render(<GuitarTheoryPanel {...props('Db', 'B1.1')} />);
    expect(openNotes()).toEqual(['b.barreCare']);
  });
});

describe('GuitarTheoryPanel: (i) drawer', () => {
  it('lists the info notes, most relevant first, collapsed', () => {
    useGuitarDisplaySettings.setState({ dismissedNotes: ['b7.plusOne'] });
    render(<GuitarTheoryPanel {...props('C', 'B8.1')} />);
    const more = screen.getByRole('button', { name: 'More notes (6)' });
    // The name is the visible text (speech control users say what they see).
    expect(more).toHaveTextContent('More notes (6)');
    expect(more).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('list', { name: 'More notes' })).toBeNull();

    fireEvent.click(more);
    expect(more).toHaveAttribute('aria-expanded', 'true');
    const drawer = screen.getByRole('list', { name: 'More notes' });
    const ids = within(drawer)
      .getAllByRole('listitem')
      .map((li) => li.getAttribute('data-info-note'));
    // The B8-specific notes first, then the ones every 7th step shows.
    expect(ids).toEqual([
      'b8.topNote',
      'b8.octaveSame',
      'b7.kinds',
      'b7.sound',
      'b7.oneNote',
      'b7.why',
    ]);

    const why = within(drawer).getByRole('button', {
      name: 'Why these shapes?',
    });
    expect(why).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText(/Four notes packed close together/)).toBeNull();
    fireEvent.click(why);
    expect(why).toHaveAttribute('aria-expanded', 'true');
    expect(
      screen.getByText(/Four notes packed close together/),
    ).toBeInTheDocument();
  });

  it('adds the practice notes only when asked', () => {
    const view = render(<GuitarTheoryPanel {...props('C', 'A2.1')} />);
    expect(screen.getByRole('button', { name: 'More notes (1)' })).toBeTruthy();
    view.rerender(
      <GuitarTheoryPanel {...props('C', 'A2.1', { includePractice: true })} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'More notes (3)' }));
    const ids = within(screen.getByRole('list', { name: 'More notes' }))
      .getAllByRole('listitem')
      .map((li) => li.getAttribute('data-info-note'));
    expect(ids).toEqual(['a2.shape', 'pt.focus', 'pt.clean']);
  });

  it('spells notes with real accidentals', () => {
    useGuitarDisplaySettings.setState({ dismissedNotes: ['b7.plusOne'] });
    render(<GuitarTheoryPanel {...props('F#', 'D3.4')} />);
    fireEvent.click(screen.getByRole('button', { name: /^More notes/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Why 5 pulls to 1' }));
    expect(
      screen.getByText(
        'In C♯7, B wants to step down to A♯. E♯ wants to step up to F♯. Those small steps make 1 sound like home.',
      ),
    ).toBeInTheDocument();
  });
});

describe('GuitarTheoryPanel: settings and extras', () => {
  it('offers the chord-jobs switch on Music Maps, and Roman numerals when allowed', () => {
    render(
      <GuitarTheoryPanel {...props('C', 'D3.4', { allowRomanToggle: true })} />,
    );
    const jobs = screen.getByRole('switch', { name: 'Show chord jobs' });
    expect(jobs).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(jobs);
    expect(useGuitarDisplaySettings.getState().showChordJobs).toBe(true);
    expect(jobs).toHaveAttribute('aria-checked', 'true');

    // The Roman-numeral note joins the drawer once the setting is on.
    expect(screen.getByRole('button', { name: 'More notes (3)' })).toBeTruthy();
    fireEvent.click(
      screen.getByRole('switch', { name: 'Show Roman numerals' }),
    );
    expect(useGuitarDisplaySettings.getState().showRomanNumerals).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'More notes (4)' }));
    expect(
      screen.getByRole('button', { name: 'Roman numerals' }),
    ).toBeInTheDocument();
  });

  it('offers the shared-notes switch only on steps that change chords', () => {
    const view = render(<GuitarTheoryPanel {...props('C', 'B2.1')} />);
    expect(
      screen.getByRole('switch', { name: 'Show shared notes' }),
    ).toBeInTheDocument();
    view.rerender(<GuitarTheoryPanel {...props('C', 'B1.1')} />);
    expect(screen.queryByRole('switch')).toBeNull();
  });

  it('adds "Same root, four kinds" on 7th-chord arpeggio steps', () => {
    const onHearShape = vi.fn();
    const view = render(
      <GuitarTheoryPanel {...props('C', 'B7.1', { onHearShape })} />,
    );
    const toggle = screen.getByRole('button', {
      name: 'Same root, four kinds',
    });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    fireEvent.click(screen.getByRole('button', { name: 'Hear C minor 7' }));
    expect(onHearShape).toHaveBeenCalledWith('X-3-5-3-4-X');

    // Without a way to play the shapes, no panel.
    view.rerender(<GuitarTheoryPanel {...props('C', 'B7.1')} />);
    expect(
      screen.queryByRole('button', { name: 'Same root, four kinds' }),
    ).toBeNull();
  });

  it('reads a resolved copy of the step the same as the flow step', () => {
    const copy = { ...stepOf('C', 'A1.2') };
    render(<GuitarTheoryPanel {...props('C', 'A1.2', { step: copy })} />);
    expect(openNotes()).toEqual(['a1.steps']);
  });
});
