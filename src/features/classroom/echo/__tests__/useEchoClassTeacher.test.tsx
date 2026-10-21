// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fromEchoCallWire } from '@/curriculum/engine/echo';
import type { InteractionResponsePayload } from '../../types';
import {
  CLASS_ROUND_LEAD_MS,
  RESULT_GRACE_MS,
  RESULT_HOLD_MS,
  classRoundLengthMs,
  withRound,
} from '../classRound';
import { DEFAULT_ECHO_INTERACTION, type SessionEcho } from '../types';
import {
  useEchoClassTeacher,
  type UseEchoClassTeacher,
} from '../useEchoClassTeacher';

/**
 * The teacher's computer runs the class's Echo (useEchoClassTeacher.ts):
 * the setup goes out before the first round, each round is published two
 * seconds ahead, counted when it's over (counts only), and followed by the
 * next; Pause and Play; the Boss fought as a class; and first names on the
 * projector only when the teacher chooses them.
 */

const ROSTER = [
  { enrollmentId: 'a', displayName: 'Ana Perez' },
  { enrollmentId: 'b', displayName: 'Ben K.' },
  { enrollmentId: 'c', displayName: 'Cleo R.' },
];

type Responses = Record<string, Record<string, InteractionResponsePayload>>;

let sent: SessionEcho[] = [];
let teacher: UseEchoClassTeacher;
let test = 0;

function Harness({ responses }: { responses: Responses }) {
  const [echo, setEcho] = useState<SessionEcho | null>(null);
  teacher = useEchoClassTeacher({
    sessionId: `sess-${test}`,
    classroomId: `class-${test}`,
    slideId: 'sl-echo',
    interactionId: 'ix-echo',
    config: DEFAULT_ECHO_INTERACTION,
    echo,
    responses,
    roster: ROSTER,
    presence: { a: 'active', b: 'active', c: 'active' },
    serverNow: () => Date.now(),
    sendEcho: (next) => {
      sent.push(next!);
      setEcho(next);
    },
  });
  return null;
}

const last = () => sent[sent.length - 1];
const wait = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

/** Everyone's echo of a run: `good` of them good. */
function answers(prior: Responses, run: number, good: string[]): Responses {
  const out: Responses = { ...prior };
  for (const { enrollmentId } of ROSTER) {
    const before = out[enrollmentId]?.['ix-echo'];
    const payload = withRound(
      before?.kind === 'echo' ? before : null,
      'sl-echo',
      {
        run,
        passed: good.includes(enrollmentId),
        score: good.includes(enrollmentId) ? 100 : 33,
        asked: ['1', '2', '3'],
        played: ['1'],
      },
    );
    out[enrollmentId] = { 'ix-echo': payload };
  }
  return out;
}

/** The current round's length, from its count-in to the end of its result. */
const roundMs = () => {
  const echo = last();
  return classRoundLengthMs(fromEchoCallWire(echo.call)!, echo.tempo);
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-21T10:00:00Z'));
  sent = [];
  test += 1;
  localStorage.clear();
  sessionStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('the teacher’s computer runs the class’s Echo', () => {
  it('sends the setup before the first round, no call in it', () => {
    render(<Harness responses={{}} />);
    expect(last()).toMatchObject({
      slideId: 'sl-echo',
      run: 0,
      call: null,
      leader: 'atlas',
      level: 1,
      key: { tonic: 'C', mode: 'major' },
    });
    expect(teacher.phase).toBe('idle');
  });

  it('publishes each round two seconds ahead, counts it, then moves on', async () => {
    const view = render(<Harness responses={{}} />);
    act(() => teacher.start());
    const first = last();
    expect(first.run).toBe(1);
    expect(first.startsAt).toBe(Date.now() + CLASS_ROUND_LEAD_MS);
    expect(fromEchoCallWire(first.call)?.kind).toBe('melody');
    expect(teacher.phase).toBe('playing');

    // Two of the three echo it well.
    view.rerender(<Harness responses={answers({}, 1, ['a', 'b'])} />);
    await wait(CLASS_ROUND_LEAD_MS + roundMs() + RESULT_GRACE_MS);
    expect(last().classResult).toEqual({
      run: 1,
      good: 2,
      answered: 3,
      joined: 3,
    });
    expect(teacher.phase).toBe('result');
    expect(teacher.grid.map((r) => r.marks)).toEqual([
      ['good'],
      ['good'],
      ['miss'],
    ]);
    // Counts only: no names, no ids, by default.
    expect(last().names).toBeUndefined();
    expect(JSON.stringify(last())).not.toContain('Ana');

    await wait(RESULT_HOLD_MS);
    expect(last().run).toBe(2);
    expect(teacher.phase).toBe('playing');
  });

  it('pauses every device, and Play plays the call again from its count-in', async () => {
    render(<Harness responses={{}} />);
    act(() => teacher.start());
    const playing = last();
    await wait(CLASS_ROUND_LEAD_MS + 3000);
    act(() => teacher.pause());
    expect(last()).toMatchObject({ run: 1, paused: true });
    expect(teacher.phase).toBe('paused');
    // Paused, nothing is counted and nothing moves on.
    await wait(60_000);
    expect(last().run).toBe(1);
    act(() => teacher.play());
    expect(last().run).toBe(2);
    expect(last().paused).toBe(false);
    expect(last().call).toEqual(playing.call);
    // The round cut short is no column of the grid.
    expect(teacher.runs).toEqual([]);
  });

  it('plays Again: the same call, a new round', () => {
    render(<Harness responses={{}} />);
    act(() => teacher.start());
    const first = last();
    act(() => teacher.again());
    expect(last().run).toBe(2);
    expect(last().call).toEqual(first.call);
  });

  it('fights the Boss as a class: three hits win, and it stops there', async () => {
    let responses: Responses = {};
    const view = render(<Harness responses={responses} />);
    act(() => teacher.setStage({ section: 'boss' }));
    act(() => teacher.start());
    for (let hit = 1; hit <= 3; hit++) {
      const echo = last();
      expect(echo.section).toBe('boss');
      expect(echo.bossAt).toBe(hit - 1);
      // All three echo it: a hit.
      responses = answers(responses, echo.run, ['a', 'b', 'c']);
      view.rerender(<Harness responses={responses} />);
      await wait(CLASS_ROUND_LEAD_MS + roundMs() + RESULT_GRACE_MS);
      expect(last().classResult?.boss).toEqual({ hits: hit, misses: 0 });
      if (hit < 3) await wait(RESULT_HOLD_MS);
    }
    expect(teacher.phase).toBe('won');
    await wait(60_000);
    expect(last().run).toBe(3);
    // A new fight starts clean.
    act(() => teacher.fightAgain());
    expect(last()).toMatchObject({ run: 4, bossAt: 0 });
    expect(last().classResult).toBeUndefined();
  });

  it('loses the fight at two misses', async () => {
    let responses: Responses = {};
    const view = render(<Harness responses={responses} />);
    act(() => teacher.setStage({ section: 'boss' }));
    act(() => teacher.start());
    for (let miss = 1; miss <= 2; miss++) {
      // One of three: under 70%, a miss.
      responses = answers(responses, last().run, ['a']);
      view.rerender(<Harness responses={responses} />);
      await wait(CLASS_ROUND_LEAD_MS + roundMs() + RESULT_GRACE_MS);
      if (miss < 2) await wait(RESULT_HOLD_MS);
    }
    expect(last().classResult?.boss).toEqual({ hits: 0, misses: 2 });
    expect(teacher.phase).toBe('lost');
  });

  it('puts first names on the projector only once the teacher chooses them', async () => {
    const view = render(<Harness responses={{}} />);
    act(() => teacher.start());
    view.rerender(<Harness responses={answers({}, 1, ['a', 'c'])} />);
    await wait(CLASS_ROUND_LEAD_MS + roundMs() + RESULT_GRACE_MS);
    expect(last().names).toBeUndefined();
    act(() => teacher.updateSettings({ projector: 'leaderboard' }));
    expect(last().settings.projector).toBe('leaderboard');
    expect(last().names?.map((n) => n.name)).toEqual(['Ana', 'Cleo']);
    expect(JSON.stringify(last().names)).not.toContain('Perez');
    // Saved for the classroom.
    expect(
      localStorage.getItem(`echo_class_settings:v1:class-${test}`),
    ).toContain('leaderboard');
  });

  it('stages the level, key and tempo for the next round', () => {
    render(<Harness responses={{}} />);
    act(() => teacher.setStage({ level: 2 }));
    expect(teacher.stage.tempo).toBe(90);
    act(() => teacher.setStage({ tempo: 500 }));
    expect(teacher.stage.tempo).toBe(106);
    act(() => teacher.setStage({ key: { tonic: 'G', mode: 'minor' } }));
    // Before the first round, the setup goes out at once.
    expect(last()).toMatchObject({ run: 0, level: 2, key: { tonic: 'G' } });
    act(() => teacher.start());
    const call = fromEchoCallWire(last().call)!;
    expect(call.level).toBe(2);
    expect(call.key).toEqual({ tonic: 'G', mode: 'minor' });
    expect(last().tempo).toBe(106);
  });
});
