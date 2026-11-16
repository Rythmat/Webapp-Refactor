// @vitest-environment jsdom
/**
 * The class's vote for its Group Project (owner, 2026-11-16): a card a role,
 * a student's tap their vote, the counts only once the teacher shows them,
 * and the teacher's card going to that Group Project.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { VoteChip, VoteGoRow } from '../../live/slides/VoteControls';
import type { Interaction } from '../../types';
import { GroupVoteMenu, roleOfOption } from '../parts/GroupVoteMenu';
import type { InteractionSlide } from '../types';

afterEach(cleanup);

const slide: InteractionSlide = {
  id: 'd-slide-vote',
  kind: 'interaction',
  phase: 'groupPractice',
  section: 'groupProject',
  presetId: 'group-vote',
  title: { en: 'Vote: which project today?' },
  interactionIds: ['ix-vote'],
  branches: [
    'd-slide-group-promoter',
    'd-slide-group-producer',
    'd-slide-group-performer',
  ],
};
const options = [
  { en: 'Promoter', es: 'Promotor' },
  { en: 'Producer', es: 'Productor' },
  { en: 'Performer', es: 'Intérprete' },
];
const activity = (module: 'globe' | 'studio' | 'learn', ref: string) =>
  ({
    id: `ix-${module}`,
    type: 'atlas',
    question: { en: 'Do it' },
    shareable: false,
    atlas: { module, activityRef: ref, expects: 'completion' },
  }) as Interaction;
const activities = [
  activity('globe', 'globe:mindmap'),
  activity('studio', 'studio:tutorial:rnb-mix-and-polish'),
  null,
];

const cards = () =>
  [...document.querySelectorAll('[data-vote-card]')].map((c) =>
    c.textContent?.replace(/\s+/g, ' ').trim(),
  );

describe('the vote’s cards', () => {
  it('names each role and what the class would do', () => {
    render(
      <GroupVoteMenu
        slide={slide}
        options={options}
        surface="projector"
        language="en"
        vote={{ activities }}
        still
      />,
    );
    const shown = cards();
    expect(shown[0]).toContain('Promoter');
    expect(shown[0]).toContain('Mind map on the Globe');
    expect(shown[1]).toContain('Producer');
    // No activity found: what the role does.
    expect(shown[2]).toContain('Play a lesson together');
    expect(
      [...document.querySelectorAll('[data-vote-role]')].map((r) =>
        r.getAttribute('data-vote-role'),
      ),
    ).toEqual(['promoter', 'producer', 'performer']);
    // The room's screen can't be tapped, and has no counts until shown.
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(document.querySelector('[data-vote-count]')).toBeNull();
  });

  it('is a student’s vote, theirs marked', () => {
    const onPick = vi.fn();
    render(
      <GroupVoteMenu
        slide={slide}
        options={options}
        surface="student"
        language="en"
        vote={{ activities, mine: 2, onPick, pickAction: 'vote' }}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Vote for Producer' }));
    expect(onPick).toHaveBeenCalledWith(1);
    expect(
      screen.getByRole('button', { name: 'Vote for Performer' }).textContent,
    ).toContain('Your vote');
  });

  it('shows the counts and the leader once shown; the teacher’s card goes', () => {
    const onPick = vi.fn();
    render(
      <GroupVoteMenu
        slide={slide}
        options={options}
        surface="present"
        language="en"
        vote={{
          activities,
          counts: [1, 3, 0],
          leader: 1,
          onPick,
          pickAction: 'go',
        }}
      />,
    );
    expect(
      [...document.querySelectorAll('[data-vote-count]')].map(
        (c) => c.textContent,
      ),
    ).toEqual(['1 vote', '3 votes', '0 votes']);
    expect(cards()[1]).toContain('Leading');
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Go to the Performer Group Project',
      }),
    );
    expect(onPick).toHaveBeenCalledWith(2);
  });

  it('is a list on a phone', () => {
    render(
      <GroupVoteMenu
        slide={slide}
        options={options}
        surface="student"
        language="es"
        vote={{ activities, mine: 0, onPick: vi.fn(), pickAction: 'vote' }}
        stacked
      />,
    );
    expect(document.querySelector('[data-vote-beam]')).toBeNull();
    expect(cards()[0]).toContain('Promotor');
    expect(cards()[0]).toContain('Tu voto');
  });

  it('knows a role from its activity, its slide, or its name', () => {
    expect(roleOfOption({ en: 'X' }, activities[1], undefined)).toBe(
      'producer',
    );
    expect(roleOfOption({ en: 'X' }, null, 'a-slide-group-performer')).toBe(
      'performer',
    );
    expect(roleOfOption({ en: 'Promoter' }, null, 'other')).toBe('promoter');
    expect(roleOfOption({ en: 'Dance' }, null, 'other')).toBeNull();
  });
});

describe('the teacher’s vote controls', () => {
  it('counts the votes and shows or hides the results', () => {
    const onToggle = vi.fn();
    const { rerender } = render(
      <VoteChip voted={2} total={4} shown={false} onToggle={onToggle} />,
    );
    expect(screen.getByText('2 of 4 voted')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Show results/ }));
    expect(onToggle).toHaveBeenCalledWith(true);
    rerender(<VoteChip voted={2} total={4} shown onToggle={onToggle} />);
    fireEvent.click(screen.getByRole('button', { name: /Hide results/ }));
    expect(onToggle).toHaveBeenLastCalledWith(false);
  });

  it('sends the class to any Group Project, the leader marked', () => {
    const onGo = vi.fn();
    render(
      <VoteGoRow
        names={['Promoter', 'Producer', 'Performer']}
        counts={[1, 3, 0]}
        leader={1}
        onGo={onGo}
      />,
    );
    expect(screen.getByText(/Next goes to.*\(Producer\)/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Go to Performer/ }));
    expect(onGo).toHaveBeenCalledWith(2);
  });
});
