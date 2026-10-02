// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildGuitarAppliedTheoryFundamentalsFlow } from '@/curriculum/data/activityFlows/guitarAppliedTheoryFundamentals';
import type { GuitarKeyName } from '@/curriculum/data/guitar/types';
import type {
  ActivityFlowV2,
  ActivityStepV2,
} from '@/curriculum/types/activity.v2';
import { useGuitarDisplaySettings } from '@/features/learn/useGuitarDisplaySettings';
import {
  GuitarKeyNotes,
  GuitarStepNotes,
  type GuitarStepNotesProps,
} from '../GuitarStepNotes';
import { COMPARE_SHEET_LOOK, FAMILY_STRIP_SHEET_LOOK } from '../noteParts';
import { activityId, stepTheoryNotes } from '../theoryUi';

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

function renderNotes(
  key: GuitarKeyName,
  id: string,
  over: Partial<GuitarStepNotesProps> = {},
) {
  return render(
    <GuitarStepNotes
      flow={flowOf(key)}
      step={stepOf(key, id)}
      keyCenter={key}
      {...over}
    />,
  );
}

const intro = () =>
  [...document.querySelectorAll('[data-step-intro] [data-theory-note]')].map(
    (el) => el.getAttribute('data-theory-note'),
  );

beforeEach(() => {
  localStorage.clear();
  useGuitarDisplaySettings.setState({
    dismissedNotes: [],
    showRomanNumerals: false,
  });
});
afterEach(cleanup);

describe('GuitarStepNotes', () => {
  it('shows every intro note open, and marks nothing seen by showing them', () => {
    renderNotes('C', 'A1.2');
    expect(intro()).toEqual(['a1.steps', 'a1.fingers', 'a1.slowFirst']);
    for (const title of ['Whole and half steps', 'One finger per fret']) {
      expect(screen.getByRole('group', { name: title })).toBeInTheDocument();
    }
    expect(screen.queryByRole('button', { name: 'Got it' })).toBeNull();
    expect(useGuitarDisplaySettings.getState().dismissedNotes).toEqual([]);
  });

  it('shows notes seen before just the same: nothing waits behind a link', () => {
    useGuitarDisplaySettings.setState({
      dismissedNotes: ['a1.steps', 'a1.fingers'],
    });
    renderNotes('C', 'A1.2');
    expect(intro()).toEqual(['a1.steps', 'a1.fingers', 'a1.slowFirst']);
  });

  it('leaves out a note another block of the sheet shows', () => {
    renderNotes('Db', 'B1.1', { exclude: ['b.barreCare'] });
    expect(intro()).toEqual(['b1.arp']);
  });

  it('matches the theory panel: the same notes, in the same order', () => {
    const notes = stepTheoryNotes(flowOf('C'), stepOf('C', 'B8.1'), 'C');
    expect(notes.prefix).toBe('B8');
    expect(notes.info.map((n) => n.id)).toEqual([
      'b8.topNote',
      'b8.octaveSame',
      'b7.kinds',
      'b7.sound',
      'b7.oneNote',
      'b7.why',
    ]);
    expect(notes.practice.map((n) => n.id)).toEqual(['pt.focus', 'pt.clean']);
    // The Roman-numeral note joins "More notes" with the setting.
    const plain = stepTheoryNotes(flowOf('C'), stepOf('C', 'D3.4'), 'C');
    const roman = stepTheoryNotes(flowOf('C'), stepOf('C', 'D3.4'), 'C', true);
    expect(roman.info.length).toBe(plain.info.length + 1);
  });

  it('reads a resolved copy of the step the same as the flow step', () => {
    renderNotes('C', 'A1.1', { step: { ...stepOf('C', 'A1.1') } });
    expect(intro()).toEqual(['a1.steps', 'a1.fingers']);
  });

  it('keeps "More notes" closed until asked, one at a time', () => {
    renderNotes('C', 'A2.1');
    const list = screen.getByRole('list', { name: 'More notes' });
    const item = within(list).getAllByRole('button')[0];
    expect(item).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(item);
    expect(item).toHaveAttribute('aria-expanded', 'true');
    expect(item.getAttribute('aria-controls')).toBe(
      list.querySelector('p')?.id,
    );
  });

  it('adds the practice tips only while practising', () => {
    const view = renderNotes('C', 'A2.1');
    expect(screen.queryByRole('region', { name: 'Practice tips' })).toBeNull();
    view.rerender(
      <GuitarStepNotes
        flow={flowOf('C')}
        step={stepOf('C', 'A2.1')}
        keyCenter="C"
        practising
      />,
    );
    expect(
      screen.getByRole('region', { name: 'Practice tips' }),
    ).toHaveTextContent('One thing at a time');
  });

  it('offers "Same root, four kinds" on B7 only when shapes can be heard', () => {
    const onHearShape = vi.fn();
    const view = renderNotes('C', 'B7.1', { onHearShape });
    const compare = screen.getByRole('button', {
      name: 'Same root, four kinds',
    });
    // In the sheet's type: a full-size target, 12 px labels.
    expect(
      compare.closest('[data-same-root-compare]')?.parentElement,
    ).toHaveClass(...COMPARE_SHEET_LOOK.split(' '));
    view.rerender(
      <GuitarStepNotes
        flow={flowOf('C')}
        step={stepOf('C', 'B7.1')}
        keyCenter="C"
      />,
    );
    expect(
      screen.queryByRole('button', { name: 'Same root, four kinds' }),
    ).toBeNull();
  });
});

describe('GuitarKeyNotes', () => {
  it('names the key and opens to what it changes, with its chord family', () => {
    render(<GuitarKeyNotes keyCenter="Db" />);
    const toggle = screen.getByRole('button', { name: 'About D♭ major' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(
      screen.queryByRole('list', { name: 'Chords in this key' }),
    ).toBeNull();
    fireEvent.click(toggle);
    const region = screen.getByRole('region', { name: 'About D♭ major' });
    expect(
      [...region.querySelectorAll('[data-theory-note]')].map((el) =>
        el.getAttribute('data-theory-note'),
      ),
    ).toEqual([
      'key.newNoteRespelled',
      'key.flatSwitch',
      'key.circle',
      'key.relMinor',
    ]);
    const strip = within(region).getByRole('list', {
      name: 'Chords in this key',
    });
    // In the sheet's type: bold symbols, 12 px labels.
    expect(strip.parentElement?.className).toBe(FAMILY_STRIP_SHEET_LOOK);
  });
});
