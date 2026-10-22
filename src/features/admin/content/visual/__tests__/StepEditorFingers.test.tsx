// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  ActivityStepV2,
  TargetNote,
} from '@/curriculum/types/activity.v2';
import type { StepFingerSuggestions } from '@/learn/fingering/stepFingering';
import { StepEditor } from '../StepEditor';

// The editor's own logic, not Radix: a native select stands in for it.
vi.mock('../Editable', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../Editable')>()),
  InlineSelect: ({
    value,
    onChange,
    options,
    ariaLabel,
  }: {
    value: string | undefined;
    onChange: (value: string) => void;
    options: readonly (string | { value: string; label: string })[];
    ariaLabel: string;
  }): ReactNode => (
    <select
      aria-label={ariaLabel}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((o) => {
        const { value: v, label } =
          typeof o === 'string' ? { value: o, label: o } : o;
        return (
          <option key={v} value={v}>
            {label}
          </option>
        );
      })}
    </select>
  ),
}));

// The keyboard isn't what's under test.
vi.mock('@/components/PianoKeyboard/PianoKeyboard', () => ({
  PianoKeyboard: () => null,
}));

const notes: TargetNote[] = [
  { midi: 60, onset: 0, duration: 480 },
  { midi: 62, onset: 480, duration: 480, finger: 3 },
  { midi: 64, onset: 960, duration: 480 },
];

const step = (targetNotes: TargetNote[]): ActivityStepV2 =>
  ({
    stepNumber: 1,
    module: 'test',
    section: 'A',
    subsection: 'Listen & Learn',
    activity: 'C D E',
    direction: '',
    assessment: null,
    tag: 'test_l1_a1',
    styleRef: '',
    successFeedback: '',
    targetNotes,
  }) as ActivityStepV2;

/** What the lesson shows (D pinned to 3), and each note on its own. */
const fingers: StepFingerSuggestions = {
  shown: [
    { hand: 'rh', finger: 2 },
    { hand: 'rh', finger: 3 },
    { hand: 'rh', finger: 4 },
  ],
  auto: [
    { hand: 'rh', finger: 1 },
    { hand: 'rh', finger: 2 },
    { hand: 'rh', finger: 3 },
  ],
};

function renderEditor(withFingers = true) {
  const onChange = vi.fn();
  render(
    <StepEditor
      step={step(notes)}
      onChange={onChange}
      fingering={withFingers ? () => fingers : undefined}
    />,
  );
  const written = () =>
    (onChange.mock.calls.at(-1)![0] as ActivityStepV2).targetNotes!;
  return { onChange, written };
}

afterEach(cleanup);

describe('StepEditor: fingers', () => {
  it('shows each note following the suggestion, or its pinned finger', () => {
    renderEditor();
    const first = screen.getByRole('combobox', { name: 'Note 1 finger' });
    expect(first).toHaveValue('__auto');
    expect(first).toHaveDisplayValue('auto · RH 2');
    // A pinned note's "auto" is what it falls back to on its own.
    const second = screen.getByRole('combobox', { name: 'Note 2 finger' });
    expect(second).toHaveValue('3');
    expect(
      [...(second as HTMLSelectElement).options].map((o) => o.textContent),
    ).toEqual([
      'auto · RH 2',
      'RH 1 · thumb',
      'RH 2 · index',
      'RH 3 · middle',
      'RH 4 · ring',
      'RH 5 · little',
    ]);
  });

  it('pins a finger, and writes only the finger, never the hand', () => {
    const { written } = renderEditor();
    fireEvent.change(screen.getByRole('combobox', { name: 'Note 1 finger' }), {
      target: { value: '1' },
    });
    expect(written()[0]).toEqual({
      midi: 60,
      onset: 0,
      duration: 480,
      finger: 1,
    });
    expect(written()[0]).not.toHaveProperty('hand');
  });

  it('back to auto takes the finger off', () => {
    const { written } = renderEditor();
    fireEvent.change(screen.getByRole('combobox', { name: 'Note 2 finger' }), {
      target: { value: '__auto' },
    });
    expect(written()[1]).toEqual({ midi: 62, onset: 480, duration: 480 });
  });

  it('fills the suggestions where no finger is pinned, and clears them all', () => {
    const { written } = renderEditor();
    fireEvent.click(
      screen.getByRole('button', { name: 'fill suggested fingers' }),
    );
    expect(written().map((n) => n.finger)).toEqual([2, 3, 4]);
    expect(written().every((n) => !('hand' in n))).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'clear fingers' }));
    expect(written().every((n) => !('finger' in n))).toBe(true);
  });

  it('has no finger column without suggestions (a guitar lesson)', () => {
    renderEditor(false);
    expect(
      screen.queryByRole('combobox', { name: 'Note 1 finger' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'fill suggested fingers' }),
    ).not.toBeInTheDocument();
  });
});
