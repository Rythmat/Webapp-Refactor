import { describe, expect, it } from 'vitest';
import {
  initialPlayer,
  playerReducer,
  type PlayerAction,
  type PlayerState,
} from '../playerMachine';

const run = (actions: readonly PlayerAction[], from = initialPlayer()) =>
  actions.reduce<PlayerState>(playerReducer, from);

const next: PlayerAction = { type: 'continue', count: 6, practiceFrom: 3 };

describe('the player', () => {
  it('counts a first-try answer, and only a first try', () => {
    const first = run([{ type: 'verdict', screenId: 's', ok: true }]);
    expect(first.phase).toBe('right');
    expect(first.firstTry).toEqual(['s']);
    const second = run([
      { type: 'verdict', screenId: 's', ok: false, mistake: 'm' },
      { type: 'tryAgain' },
      { type: 'verdict', screenId: 's', ok: true },
    ]);
    expect(second.phase).toBe('right');
    expect(second.firstTry).toEqual([]);
    expect(second.answered).toEqual(['s']);
    expect(second.attempts).toBe(2);
  });

  it('crosses off a wrong choice and clears it for the next try', () => {
    const wrong = run([
      { type: 'pick', id: 'b' },
      { type: 'verdict', screenId: 's', ok: false, mistake: 'b' },
    ]);
    expect(wrong.phase).toBe('wrong');
    expect(wrong.mistake).toBe('b');
    expect(wrong.eliminated).toEqual(['b']);
    const again = playerReducer(wrong, { type: 'tryAgain' });
    expect(again.phase).toBe('acting');
    expect(again.picked).toBeNull();
    expect(again.eliminated).toEqual(['b']);
  });

  it('shows the answer only after a wrong one', () => {
    expect(run([{ type: 'seeAnswer', screenId: 's' }]).phase).toBe('acting');
    const shown = run([
      { type: 'verdict', screenId: 's', ok: false, mistake: 'm' },
      { type: 'seeAnswer', screenId: 's', answer: 'a' },
    ]);
    expect(shown.phase).toBe('revealed');
    expect(shown.picked).toBe('a');
    expect(shown.firstTry).toEqual([]);
  });

  it('ignores a pick or a verdict once the result is showing', () => {
    const right = run([{ type: 'verdict', screenId: 's', ok: true }]);
    expect(playerReducer(right, { type: 'pick', id: 'a' })).toBe(right);
    expect(
      playerReducer(right, {
        type: 'verdict',
        screenId: 's',
        ok: false,
        mistake: 'm',
      }),
    ).toBe(right);
  });

  it('pauses for the skill check, then finishes after the last screen', () => {
    const atPractice = run([next, next, next]);
    expect(atPractice.index).toBe(3);
    expect(atPractice.view).toBe('skillIntro');
    const going = playerReducer(atPractice, { type: 'startPractice' });
    expect(going.view).toBe('lesson');
    const end = run([next, next, next], going);
    expect(end.view).toBe('finish');
    expect(end.index).toBe(5);
  });

  it('goes back, and jumps only as far as they’ve been', () => {
    const on = run([next, next]);
    const back = playerReducer(on, { type: 'back' });
    expect(back.index).toBe(1);
    expect(back.furthest).toBe(2);
    expect(back.phase).toBe('acting');
    expect(playerReducer(back, { type: 'jump', index: 2 }).index).toBe(2);
    expect(playerReducer(back, { type: 'jump', index: 4 })).toBe(back);
    expect(playerReducer(initialPlayer(), { type: 'back' }).index).toBe(0);
  });
});

describe('following the class (owner, 2026-11-10)', () => {
  it("takes the class's screen even past where the student has been", () => {
    const at = playerReducer(initialPlayer(0), {
      type: 'follow',
      index: 4,
      count: 10,
    });
    expect(at.index).toBe(4);
    expect(at.furthest).toBe(4);
    expect(at.phase).toBe('acting');
    // A plain jump still can't go there.
    expect(
      playerReducer(initialPlayer(0), { type: 'jump', index: 4 }).index,
    ).toBe(0);
  });

  it('stays inside the lesson and does nothing for the screen it is on', () => {
    const state = initialPlayer(2);
    expect(
      playerReducer(state, { type: 'follow', index: 99, count: 10 }).index,
    ).toBe(9);
    expect(playerReducer(state, { type: 'follow', index: 2, count: 10 })).toBe(
      state,
    );
  });
});
