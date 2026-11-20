// @vitest-environment jsdom
/**
 * Handing in (owner, 2026-11-13): each student's work and a note for the
 * teacher, the teacher's count and ask, and the ask on a student's device.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DaySnapshot } from '../publish/publishDay';
import type { Interaction, InteractionResponsePayload } from '../types';
import { HandInBanner } from './HandInBanner';
import { findHandInSlide, handInRows, hasHandedIn } from './handIn';
import type { SessionState } from './sessionsStore';
import { HandInChip, HandInPanel } from './slides/HandInPanel';

// The real inputs read the student's work and account; a stand-in answers.
vi.mock('./interactions', () => ({
  InteractionInput: ({
    interaction,
    onSubmit,
  }: {
    interaction: Interaction;
    onSubmit: (p: InteractionResponsePayload) => void;
  }) => (
    <button
      type="button"
      data-input={interaction.id}
      onClick={() =>
        onSubmit(
          interaction.type === 'text'
            ? { kind: 'text', text: 'Made a beat' }
            : {
                kind: 'showcase',
                artifact: {
                  projectId: 'p1',
                  name: 'Beat',
                  audience: 'teacher',
                },
              },
        )
      }
    >
      answer {interaction.id}
    </button>
  ),
}));

const handIn: Interaction = {
  id: 'ix-handin',
  type: 'showcase',
  question: { en: 'Hand in what you’ve done so far', es: 'Entrega' },
  shareable: false,
  showcase: { audience: 'teacher' },
};
const note: Interaction = {
  id: 'ix-note',
  type: 'text',
  question: { en: 'What did you get done today?', es: '¿Qué lograste hoy?' },
  shareable: false,
  text: { maxLen: 280 },
};
const share: Interaction = {
  id: 'ix-share',
  type: 'showcase',
  question: { en: 'Share your project', es: 'Comparte' },
  shareable: false,
};

const snapshot = {
  dayId: 'd',
  label: 'L',
  cells: {
    presentPerform: { presentation: { interactions: [handIn, note, share] } },
  },
  deck: {
    id: 'deck',
    slides: [
      {
        id: 'sl-share',
        kind: 'showcase',
        phase: 'presentPerform',
        title: { en: 'Show the class', es: 'Muestra' },
        interactionId: share.id,
      },
      {
        id: 'sl-6',
        kind: 'interaction',
        phase: 'presentPerform',
        title: { en: 'Present your progress', es: 'Presenta' },
        interactionIds: [handIn.id, note.id],
      },
    ],
  },
} as unknown as DaySnapshot;

const work: InteractionResponsePayload = {
  kind: 'showcase',
  artifact: {
    projectId: 'p1',
    name: 'Night beat',
    place: 'studio',
    deepLink: '/studio?project=p1',
    audience: 'teacher',
  },
};

afterEach(cleanup);

describe('the hand-in', () => {
  it('is the slide that takes work for the teacher, not the class showcase', () => {
    const found = findHandInSlide(snapshot);
    expect(found?.slide.id).toBe('sl-6');
    expect(found?.interactions.map((i) => i.id)).toEqual([
      'ix-handin',
      'ix-note',
    ]);
    expect(findHandInSlide(null)).toBeNull();
  });

  it('counts the work, or the note alone, as handed in', () => {
    const asks = [handIn, note];
    expect(hasHandedIn(undefined, asks)).toBe(false);
    expect(hasHandedIn({ 'ix-share': work }, asks)).toBe(false);
    expect(hasHandedIn({ 'ix-handin': work }, asks)).toBe(true);
    expect(hasHandedIn({ 'ix-note': { kind: 'text', text: 'x' } }, asks)).toBe(
      true,
    );
  });

  it('lists every student, what they handed in first, the missing last', () => {
    const rows = handInRows(
      [
        { id: 'e1', displayName: 'Ana' },
        { id: 'e2', displayName: 'Ben' },
        { id: 'e3', displayName: 'Cy' },
      ],
      {
        e2: { 'ix-handin': work, 'ix-note': { kind: 'text', text: ' Drums ' } },
        e3: { 'ix-note': { kind: 'text', text: 'Practised' } },
      },
      [handIn, note],
    );
    expect(rows.map((r) => [r.displayName, r.done])).toEqual([
      ['Ben', true],
      ['Cy', true],
      ['Ana', false],
    ]);
    expect(rows[0]).toMatchObject({
      note: 'Drums',
      work: { name: 'Night beat' },
    });
    expect(rows[1]).toMatchObject({ work: null, note: 'Practised' });
  });
});

describe('the teacher’s view', () => {
  const rows = handInRows(
    [
      { id: 'e1', displayName: 'Ana' },
      { id: 'e2', displayName: 'Ben' },
    ],
    { e2: { 'ix-handin': work, 'ix-note': { kind: 'text', text: 'Drums' } } },
    [handIn, note],
  );

  it('shows each one’s work, opening it, their note, and who hasn’t yet', () => {
    const onAsk = vi.fn();
    const { container } = render(<HandInPanel rows={rows} onAsk={onAsk} />);
    expect(screen.getByText(/Handed in · 1 of 2/)).toBeTruthy();
    expect(
      screen.getByRole('link', { name: /Open/ }).getAttribute('href'),
    ).toBe('/studio?project=p1');
    expect(screen.getByText('“Drums”')).toBeTruthy();
    expect(
      container.querySelector('[data-hand-in="missing"]')?.textContent,
    ).toContain('Not yet');
    fireEvent.click(screen.getByRole('button', { name: /Ask the class/ }));
    expect(onAsk).toHaveBeenCalledOnce();
  });

  it('on Present, counts and asks; asked once, it asks again', () => {
    const onAsk = vi.fn();
    render(<HandInChip done={1} total={2} onAsk={onAsk} lastAsked={5} />);
    expect(screen.getByText('1 of 2 handed in')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Ask again/ }));
    expect(onAsk).toHaveBeenCalledOnce();
  });
});

describe('the ask, on a student’s device', () => {
  const found = findHandInSlide(snapshot);
  const state = (id: number | null): SessionState =>
    ({
      status: 'live',
      notice: id === null ? null : { id, kind: 'hand-in', slideId: 'sl-6' },
    }) as unknown as SessionState;
  const clock = { offsetMs: 0, now: () => Date.now() } as never;

  const show = (
    id: number | null,
    submissions: Record<string, InteractionResponsePayload> = {},
    onSubmit = vi.fn(() => vi.fn()),
  ) =>
    render(
      <HandInBanner
        sessionId="s1"
        state={state(id)}
        handIn={found}
        submissions={submissions}
        onSubmit={onSubmit}
        language="en"
        clock={clock}
      />,
    );

  beforeEach(() => sessionStorage.clear());

  it('shows when the teacher asks, and not before', () => {
    show(null);
    expect(document.querySelector('[data-hand-in-banner]')).toBeNull();
    cleanup();
    show(1);
    expect(
      document.querySelector('[data-hand-in-banner]')?.textContent,
    ).toContain('Your teacher asks you to hand in');
  });

  it('stays out of the way while the hand-in slide is in front of them', () => {
    render(
      <HandInBanner
        sessionId="s1"
        state={state(1)}
        handIn={found}
        submissions={{}}
        onSubmit={vi.fn(() => vi.fn())}
        language="en"
        clock={clock}
        hidden
      />,
    );
    expect(document.querySelector('[data-hand-in-banner]')).toBeNull();
  });

  it('is gone once they have handed in', () => {
    show(1, { 'ix-handin': work });
    expect(document.querySelector('[data-hand-in-banner]')).toBeNull();
  });

  it('set aside, stays aside for that ask; a new ask shows it again', () => {
    show(1);
    fireEvent.click(screen.getByRole('button', { name: /Not now/ }));
    expect(document.querySelector('[data-hand-in-banner]')).toBeNull();
    cleanup();
    show(1);
    expect(document.querySelector('[data-hand-in-banner]')).toBeNull();
    cleanup();
    show(2);
    expect(document.querySelector('[data-hand-in-banner]')).not.toBeNull();
  });

  it('Hand in opens the slide’s own inputs, wherever the class is', () => {
    const submit = vi.fn();
    const onSubmit = vi.fn(() => submit);
    show(1, {}, onSubmit);
    fireEvent.click(screen.getByRole('button', { name: 'Hand in' }));
    const sheet = document.querySelector('[data-hand-in-sheet]');
    expect(sheet?.querySelectorAll('[data-input]')).toHaveLength(2);
    fireEvent.click(sheet!.querySelector('[data-input="ix-note"]')!);
    expect(onSubmit).toHaveBeenCalledWith('ix-note');
    expect(submit).toHaveBeenCalledWith({ kind: 'text', text: 'Made a beat' });
  });
});
