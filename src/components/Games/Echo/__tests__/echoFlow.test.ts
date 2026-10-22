import { describe, expect, it } from 'vitest';
import {
  BOSS_CALLS,
  ECHO_XP,
  type ChordCall,
  type MelodyCall,
} from '@/curriculum/engine/echo';
import { easiestContours } from '../echoCalls';
import {
  BOSS_GAP_BARS,
  CHORD_ECHO_ROUNDS,
  MELODY_ECHO_ROUNDS,
  echoFlowReducer,
  newEchoFlow,
  runCallsOf,
  wantsRun,
  type EchoFlow,
  type EchoFlowEvent,
  type EchoOutcome,
} from '../echoFlow';

/**
 * A game of Echo, screen by screen, as a pure reducer: setup, Melody Echo's
 * eight rounds, Chord Echo's six, the Echo Boss (won at the third good
 * echo, lost at the second miss, retried alone), the gate and Make Your
 * Song; the streak and its best, the easier call after a miss, and the
 * tempo climbing with good echoes.
 */

const KEY = { tonic: 'C', mode: 'major' } as const;

const outcome = (passed: boolean): EchoOutcome => ({
  passed,
  percent: passed ? 100 : 20,
  played: [],
  asked: [],
});

const step = (flow: EchoFlow, ...events: EchoFlowEvent[]) =>
  events.reduce(echoFlowReducer, flow);

const begun = (level: 1 | 2 | 3 = 1, seed = 'seed') =>
  step(newEchoFlow(), { type: 'begin', level, key: KEY, seed });

/** Every round of the sections, passed or as `pass` says (by round number). */
function playSections(
  flow: EchoFlow,
  pass: (section: string, round: number) => boolean = () => true,
): EchoFlow {
  let now = step(flow, { type: 'go' });
  for (;;) {
    const { screen } = now;
    if (screen.kind === 'intro') {
      now = step(now, { type: 'go' });
      continue;
    }
    if (screen.kind !== 'round') return now;
    now = step(
      now,
      { type: 'graded', outcome: outcome(pass(screen.section, screen.round)) },
      { type: 'next' },
    );
  }
}

describe('a game of Echo', () => {
  it('opens on setup, and begins on Melody Echo’s title card', () => {
    const flow = newEchoFlow();
    expect(flow.screen.kind).toBe('setup');
    expect(wantsRun(flow)).toBe(false);
    const next = begun(2);
    expect(next.screen).toEqual({ kind: 'intro', section: 'melodyEcho' });
    expect(next.level).toBe(2);
    expect(next.stats.level).toBe(2);
  });

  it('plays 8 melody rounds, then 6 chord rounds, then meets the boss', () => {
    expect(MELODY_ECHO_ROUNDS).toBe(8);
    expect(CHORD_ECHO_ROUNDS).toBe(6);
    let flow = step(begun(), { type: 'go' });
    const seen: string[] = [];
    while (flow.screen.kind === 'round' || flow.screen.kind === 'intro') {
      if (flow.screen.kind === 'intro') {
        seen.push(`intro:${flow.screen.section}`);
        flow = step(flow, { type: 'go' });
        continue;
      }
      expect(wantsRun(flow)).toBe(true);
      expect(flow.screen.call.kind).toBe(
        flow.screen.section === 'melodyEcho' ? 'melody' : 'chords',
      );
      seen.push(`${flow.screen.section}:${flow.screen.round}`);
      const run = flow.run;
      flow = step(flow, { type: 'graded', outcome: outcome(true) });
      // The result shows; no run wanted, nothing new asked for.
      expect(wantsRun(flow)).toBe(false);
      expect(flow.run).toBe(run);
      flow = step(flow, { type: 'next' });
    }
    expect(seen.filter((s) => s.startsWith('melodyEcho'))).toHaveLength(8);
    expect(seen.filter((s) => s.startsWith('chordEcho'))).toHaveLength(6);
    expect(seen[8]).toBe('intro:chordEcho');
    expect(flow.screen.kind).toBe('bossIntro');
    expect(flow.stats.sections.melodyEcho).toEqual({ tried: 8, passed: 8 });
    expect(flow.stats.sections.chordEcho).toEqual({ tried: 6, passed: 6 });
  });

  it('asks for a run for each round', () => {
    const flow = step(begun(), { type: 'go' });
    const second = step(
      flow,
      { type: 'graded', outcome: outcome(true) },
      { type: 'next' },
    );
    expect(second.run).toBe(flow.run + 1);
    expect(runCallsOf(second)).toHaveLength(1);
  });

  it('grades a round once, and moves on only from its result', () => {
    const flow = step(begun(), { type: 'go' });
    expect(step(flow, { type: 'next' })).toBe(flow);
    const graded = step(flow, { type: 'graded', outcome: outcome(true) });
    expect(step(graded, { type: 'graded', outcome: outcome(false) })).toBe(
      graded,
    );
  });

  it('counts the streak across sections, and keeps the best', () => {
    // Pass all but Melody Echo's fourth round and Chord Echo's second.
    const flow = playSections(
      begun(),
      (section, round) =>
        !(
          (section === 'melodyEcho' && round === 3) ||
          (section === 'chordEcho' && round === 1)
        ),
    );
    expect(flow.pips.melodyEcho).toEqual([
      true,
      true,
      true,
      false,
      true,
      true,
      true,
      true,
    ]);
    // 4 melody after the miss, then the first chord round: 5; then 4 more.
    expect(flow.stats.bestStreak).toBe(5);
    expect(flow.stats.streak).toBe(4);
    expect(flow.stats.xp).toBe(12 * ECHO_XP.echo_round_passed);
  });

  it('gives an easier call after a miss, and the level’s own after a pass', () => {
    let flow = step(begun(1, 'easier'), { type: 'go' });
    flow = step(
      flow,
      { type: 'graded', outcome: outcome(false) },
      { type: 'next' },
    );
    expect(flow.screen.kind === 'round' && flow.screen.easier).toBe(true);
    const easy = (flow.screen as { call: MelodyCall }).call;
    expect(easy.notes).toHaveLength(3);
    expect(easy.zeroPoint).toBe(1);
    expect(easiestContours().map((c) => c.id)).toContain(easy.contour.id);
    flow = step(
      flow,
      { type: 'graded', outcome: outcome(true) },
      { type: 'next' },
    );
    expect(flow.screen.kind === 'round' && flow.screen.easier).toBe(false);
  });

  it('gives an easier chord call after a miss: home to the 1, out to the 4 or 5', () => {
    // On to Chord Echo's first round, then miss it.
    let flow = step(begun(2, 'chords'), { type: 'go' });
    while (
      !(flow.screen.kind === 'round' && flow.screen.section === 'chordEcho')
    ) {
      flow =
        flow.screen.kind === 'intro'
          ? step(flow, { type: 'go' })
          : step(
              flow,
              { type: 'graded', outcome: outcome(true) },
              { type: 'next' },
            );
    }
    flow = step(
      flow,
      { type: 'graded', outcome: outcome(false) },
      { type: 'next' },
    );
    expect(flow.screen.kind === 'round' && flow.screen.easier).toBe(true);
    const call = (flow.screen as { call: ChordCall }).call;
    expect(call.kind).toBe('chords');
    expect(call.level).toBe(2);
    expect(call.degrees[0]).toBe('1');
    expect(['4', '5']).toContain(call.degrees[1]);
  });

  it('replays the same calls from the same seed', () => {
    const calls = (seed: string) => {
      const flow = step(begun(2, seed), { type: 'go' });
      return flow.screen.kind === 'round'
        ? flow.screen.call.notes.map((n) => n.midi)
        : [];
    };
    expect(calls('same')).toEqual(calls('same'));
  });
});

describe('the tempo', () => {
  it('climbs 4 BPM every two good echoes, and eases 4 after a miss', () => {
    let flow = step(begun(), { type: 'go' });
    const tempos: number[] = [];
    const play = (passed: boolean) => {
      if (flow.screen.kind === 'round') tempos.push(flow.screen.tempo);
      flow = step(
        flow,
        { type: 'graded', outcome: outcome(passed) },
        { type: 'next' },
      );
    };
    [true, true, true, true, false, true, true].forEach(play);
    if (flow.screen.kind === 'round') tempos.push(flow.screen.tempo);
    expect(tempos).toEqual([80, 80, 84, 84, 88, 84, 84, 88]);
    expect(flow.tempo.top).toBe(88);
  });

  it('starts at each level’s base, and makes each call at the tempo of its moment', () => {
    for (const [level, base] of [
      [1, 80],
      [2, 90],
      [3, 100],
    ] as const) {
      const flow = step(begun(level), { type: 'go' });
      expect(flow.screen.kind === 'round' && flow.screen.tempo).toBe(base);
      expect(flow.screen.kind === 'round' && flow.screen.call.tempo).toBe(base);
      expect(runCallsOf(flow)[0].timeline.tempo).toBe(base);
    }
  });

  it('plays the boss at the highest tempo reached, its echoes leaving it be', () => {
    let boss = step(playSections(begun()), { type: 'fight' });
    const before = boss.tempo;
    for (const passed of [true, false, false]) {
      boss = step(boss, {
        type: 'bossGraded',
        index: boss.screen.kind === 'boss' ? boss.screen.at : -1,
        outcome: outcome(passed),
      });
    }
    expect(boss.stats.boss.outcome).toBe('lost');
    expect(boss.tempo).toEqual(before);
    boss = step(boss, { type: 'bossRetry' });
    expect(boss.screen.kind === 'boss' && boss.screen.tempo).toBe(96);
  });

  it('plays the boss at the highest tempo reached', () => {
    const flow = step(playSections(begun()), { type: 'fight' });
    expect(flow.screen.kind).toBe('boss');
    // 14 good echoes: up to the top, 16 above the level's.
    expect(flow.screen.kind === 'boss' && flow.screen.tempo).toBe(96);
    expect(runCallsOf(flow).every((c) => c.timeline.tempo === 96)).toBe(true);
  });
});

describe('the Echo Boss', () => {
  const atBoss = () => step(playSections(begun()), { type: 'fight' });
  const bossEcho = (flow: EchoFlow, passed: boolean) =>
    step(flow, {
      type: 'bossGraded',
      index: flow.screen.kind === 'boss' ? flow.screen.at : -1,
      outcome: outcome(passed),
    });

  it('fights four calls, melody and chords by turns, a bar apart', () => {
    const flow = atBoss();
    expect(flow.screen.kind).toBe('boss');
    const calls = runCallsOf(flow);
    expect(calls).toHaveLength(BOSS_CALLS);
    expect(calls.map((c) => c.call.kind)).toEqual([
      'melody',
      'chords',
      'melody',
      'chords',
    ]);
    // Between calls, a bar for the boss to react: the next call's count-in.
    for (let i = 1; i < calls.length; i++) {
      const before = calls[i - 1].timeline;
      const t = calls[i].timeline;
      expect(t.countIn).toEqual({
        start: before.total,
        length: BOSS_GAP_BARS * t.barTicks,
      });
      expect(t.call.start).toBe(before.total + BOSS_GAP_BARS * t.barTicks);
    }
    expect(calls[0].timeline.countIn).toEqual({ start: 0, length: 1920 });
    expect(flow.stats.boss.health).toBe(3);
  });

  it('starts a resumed fight on its call, after a count-in', () => {
    let flow = atBoss();
    flow = bossEcho(flow, true);
    const calls = runCallsOf(flow);
    expect(calls).toHaveLength(BOSS_CALLS - 1);
    expect(calls[0].timeline.countIn).toEqual({ start: 0, length: 1920 });
  });

  it('can go straight to the boss (the development shortcut)', () => {
    const flow = step(newEchoFlow(), {
      type: 'begin',
      level: 1,
      key: KEY,
      seed: 'seed',
      skipTo: 'boss',
    });
    expect(flow.screen.kind).toBe('bossIntro');
    expect(step(flow, { type: 'fight' }).screen.kind).toBe('boss');
  });

  it('is beaten at the third good echo, then the gate, then the song', () => {
    let flow = atBoss();
    flow = bossEcho(flow, true);
    flow = bossEcho(flow, false);
    expect(flow.stats.boss.health).toBe(2);
    flow = bossEcho(flow, true);
    expect(flow.stats.boss.outcome).toBe('fighting');
    // A resumed fight picks up at the call it was on.
    expect(runCallsOf(flow)).toHaveLength(1);
    flow = bossEcho(flow, true);
    expect(flow.stats.boss.outcome).toBe('won');
    expect(wantsRun(flow)).toBe(false);
    expect(flow.stats.awards.echo_boss_defeated).toBe(1);
    flow = step(flow, { type: 'toGate' });
    expect(flow.screen.kind).toBe('gate');
    flow = step(flow, { type: 'toSong' });
    expect(flow.screen.kind).toBe('song');
    flow = step(flow, { type: 'songFinished' }, { type: 'songFinished' });
    expect(flow.stats.songFinished).toBe(true);
    expect(flow.stats.awards.echo_song_finished).toBe(1);
  });

  it('wins straight off with three good echoes', () => {
    let flow = atBoss();
    for (let i = 0; i < 3; i++) flow = bossEcho(flow, true);
    expect(flow.stats.boss.outcome).toBe('won');
    expect(flow.stats.boss.calls).toBe(3);
  });

  it('is lost at the second miss, and retried alone', () => {
    let flow = atBoss();
    const sections = flow.stats.sections;
    flow = bossEcho(flow, false);
    flow = bossEcho(flow, false);
    expect(flow.stats.boss.outcome).toBe('lost');
    expect(wantsRun(flow)).toBe(false);
    // No gate for a lost fight.
    expect(step(flow, { type: 'toGate' })).toBe(flow);
    const run = flow.run;
    const firstCalls =
      flow.screen.kind === 'boss' ? flow.screen.calls.map((c) => c.kind) : [];
    flow = step(flow, { type: 'bossRetry' });
    expect(flow.screen.kind).toBe('boss');
    expect(flow.screen.kind === 'boss' && flow.screen.at).toBe(0);
    expect(firstCalls).toHaveLength(4);
    expect(flow.stats.boss).toMatchObject({
      outcome: 'fighting',
      health: 3,
      attempts: 2,
      calls: 0,
    });
    expect(flow.run).toBe(run + 1);
    // The sections stand: only the boss is fought again.
    expect(flow.stats.sections.melodyEcho).toEqual(sections.melodyEcho);
    expect(flow.stats.sections.boss).toEqual({ tried: 2, passed: 0 });
    for (let i = 0; i < 3; i++) flow = bossEcho(flow, true);
    expect(flow.stats.boss.outcome).toBe('won');
  });

  it('ignores an echo for a call it isn’t on', () => {
    const flow = atBoss();
    expect(
      step(flow, { type: 'bossGraded', index: 2, outcome: outcome(true) }),
    ).toBe(flow);
  });

  it('goes back to setup on exit, keeping the level and key', () => {
    const flow = step(begun(3), { type: 'exit' });
    expect(flow.screen.kind).toBe('setup');
    expect(flow.level).toBe(3);
    expect(flow.key).toEqual(KEY);
  });
});

describe('presenting to a class', () => {
  const classGame = (leader: 'atlas' | 'teacher' = 'atlas') =>
    step(
      newEchoFlow(),
      {
        type: 'begin',
        level: 1,
        key: KEY,
        seed: 'class',
        audience: 'class',
        leader,
      },
      { type: 'go' },
    );
  const teacherCall = (flow: EchoFlow): MelodyCall => {
    const screen = flow.screen as Extract<
      EchoFlow['screen'],
      { kind: 'round' }
    >;
    return {
      ...(screen.call as MelodyCall),
      notes: [
        {
          midi: 60,
          onset: 0,
          duration: 480,
          degree: '1',
          label: '1',
          position: 0,
          index: 0,
        },
      ],
    };
  };

  it('asks the teacher how it went when the answer wasn’t played here', () => {
    let flow = classGame();
    expect(flow.audience).toBe('class');
    expect(wantsRun(flow)).toBe(true);
    flow = step(flow, { type: 'unanswered' });
    expect(flow.screen).toMatchObject({ kind: 'round', judging: true });
    expect(wantsRun(flow)).toBe(false);
    // Got It!: a good echo, and on to the next round.
    flow = step(flow, { type: 'judge', verdict: 'good' });
    expect(flow.screen).toMatchObject({
      kind: 'round',
      round: 1,
      judging: false,
    });
    expect(flow.stats.streak).toBe(1);
    expect(flow.pips.melodyEcho).toEqual([true]);
    // Missed It: a miss, and the next call is easier.
    flow = step(
      flow,
      { type: 'unanswered' },
      { type: 'judge', verdict: 'miss' },
    );
    expect(flow.pips.melodyEcho).toEqual([true, false]);
    expect(flow.easier).toBe(true);
    expect(flow.stats.streak).toBe(0);
  });

  it('plays the same call again on Again, counting nothing', () => {
    let flow = step(classGame(), { type: 'unanswered' });
    const before = flow.screen as Extract<
      EchoFlow['screen'],
      { kind: 'round' }
    >;
    const run = flow.run;
    flow = step(flow, { type: 'judge', verdict: 'again' });
    expect(flow.screen).toMatchObject({
      round: 0,
      judging: false,
      outcome: null,
    });
    expect((flow.screen as typeof before).call).toBe(before.call);
    expect(flow.run).toBe(run + 1);
    expect(flow.pips.melodyEcho).toEqual([]);
  });

  it('ignores the teacher’s verdicts in a game of one', () => {
    const solo = step(
      newEchoFlow(),
      { type: 'begin', level: 1, key: KEY, seed: 'solo' },
      { type: 'go' },
    );
    expect(step(solo, { type: 'unanswered' }).screen).toMatchObject({
      judging: false,
    });
  });

  it('waits for the teacher’s call, takes it, and runs again when none came', () => {
    let flow = classGame('teacher');
    const screen = flow.screen as Extract<
      EchoFlow['screen'],
      { kind: 'round' }
    >;
    expect(screen.call.taught).toBe(true);
    expect(screen.call.notes).toEqual([]);
    expect(screen.easier).toBe(false);
    // Played: the round's call is the teacher's.
    const taught = teacherCall(flow);
    flow = step(flow, { type: 'taught', run: flow.run, call: taught });
    expect((flow.screen as typeof screen).call).toBe(taught);
    // Nothing played on the next: "No call heard", then again.
    let next = step(
      flow,
      { type: 'unanswered' },
      { type: 'judge', verdict: 'good' },
    );
    next = step(next, { type: 'noCall' });
    expect(next.screen).toMatchObject({ noCall: true });
    expect(wantsRun(next)).toBe(false);
    const run = next.run;
    next = step(next, { type: 'judge', verdict: 'again' });
    expect(next.screen).toMatchObject({ noCall: false, round: 1 });
    expect(next.run).toBe(run + 1);
    expect((next.screen as typeof screen).call.notes).toEqual([]);
  });

  it('switches who leads from the next call', () => {
    let flow = classGame('atlas');
    flow = step(flow, { type: 'leader', leader: 'teacher' });
    expect((flow.screen as { call: MelodyCall }).call.taught).toBeFalsy();
    flow = step(
      flow,
      { type: 'unanswered' },
      { type: 'judge', verdict: 'good' },
    );
    expect((flow.screen as { call: MelodyCall }).call.taught).toBe(true);
  });

  it('fights the boss a call at a time, each judged', () => {
    let flow = step(
      newEchoFlow(),
      {
        type: 'begin',
        level: 1,
        key: KEY,
        seed: 'class-boss',
        audience: 'class',
        leader: 'teacher',
        skipTo: 'boss',
      },
      { type: 'fight' },
    );
    // Always Atlas's calls, one a run.
    const screen = flow.screen as Extract<EchoFlow['screen'], { kind: 'boss' }>;
    expect(screen.calls.every((c) => !c.taught)).toBe(true);
    expect(runCallsOf(flow)).toHaveLength(1);
    for (let i = 0; i < 3; i++) {
      const run = flow.run;
      flow = step(flow, { type: 'unanswered' });
      expect(flow.screen).toMatchObject({ judging: true });
      expect(wantsRun(flow)).toBe(false);
      flow = step(flow, { type: 'judge', verdict: 'good' });
      expect((flow.screen as typeof screen).at).toBe(i + 1);
      if (i < 2) expect(flow.run).toBe(run + 1);
    }
    expect(flow.stats.boss.outcome).toBe('won');
  });
});
