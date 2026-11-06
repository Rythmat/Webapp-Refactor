import { describe, expect, it } from 'vitest';
import { audioModule } from '../../catalog';
import { DECIBELS_SCRIPT } from '../decibels-and-faders/script';
import { GAIN_SCRIPT } from '../gain-staging/script';
import { KIT_SCRIPT } from '../hear-the-kit/script';
import { lintLesson } from '../lintLesson';
import { PATH_SCRIPT } from '../mic-to-speaker/script';
import { lateMs, offsetMs, PHYSICS_SCRIPT } from '../physics-of-sound/script';
import { faderGainDb, scalePosition } from '../stage/ChannelStrip';
import { allScreens, doScreenFor, sceneAt, type LessonScript } from '../types';

const SCRIPTS = [
  PHYSICS_SCRIPT,
  KIT_SCRIPT,
  DECIBELS_SCRIPT,
  GAIN_SCRIPT,
  PATH_SCRIPT,
] as unknown as readonly LessonScript<never>[];

describe('every guided lesson', () => {
  it.each(SCRIPTS.map((s) => [s.id, s] as const))(
    '%s keeps to the house rules',
    (_, script) => {
      expect(lintLesson(script)).toEqual([]);
    },
  );

  it('tells the catalog how many screens it has', () => {
    for (const script of SCRIPTS) {
      const entry = ['sound-basics', 'signal-path']
        .flatMap((id) => audioModule(id)?.lessons ?? [])
        .find((lesson) => lesson.id === script.id);
      expect(entry?.kind, script.id).toBe('guided');
      if (entry?.kind === 'guided') {
        expect(entry.screens).toBe(allScreens(script).length);
      }
    }
  });
});

describe('Physics of Sound', () => {
  it('takes about 3 ms a metre, as it says', () => {
    expect(lateMs(1)).toBeGreaterThan(2.8);
    expect(lateMs(1)).toBeLessThan(3);
    expect(lateMs(3.4)).toBeCloseTo(9.9, 1);
    expect(lateMs(6)).toBeCloseTo(17.5, 1);
  });

  it('lands a nudged track by its distance and its nudge', () => {
    expect(offsetMs({ metres: 3.4, nudgeMs: -9.9 })).toBeCloseTo(0, 1);
    expect(offsetMs({ metres: 1, nudgeMs: -5 })).toBeLessThan(0);
  });
});

describe('Decibels and Faders', () => {
  it('starts its first exercise level, whatever was done on the hook', () => {
    const half = DECIBELS_SCRIPT.screens[0];
    expect(half.scene?.master).toBe(0);
    expect(Object.values(half.scene?.faders ?? {})).toEqual([0, 0, 0, 0]);
  });

  it('turns a fader off at the bottom of its travel', () => {
    expect(faderGainDb(-48)).toBe(-Infinity);
    expect(faderGainDb(-47.5)).toBe(-47.5);
    expect(faderGainDb(0)).toBe(0);
  });

  it('marks every fader and meter on one scale, with 0 near the top', () => {
    expect(scalePosition(6)).toBe(1);
    expect(scalePosition(-48)).toBe(0);
    expect(scalePosition(0)).toBeCloseTo(48 / 54, 9);
  });
});

describe('the rules catch what they should', () => {
  interface Scene {
    n: number;
  }
  const doScreen = doScreenFor<Scene>();
  const base: LessonScript<Scene> = {
    id: 'test',
    initial: { n: 0 },
    needs: ['kick'],
    hook: { kind: 'hook', id: 'hook', view: 'x', title: 'T', body: 'B' },
    screens: [
      doScreen<'low'>({
        id: 'do',
        view: 'x',
        body: 'Do',
        right: 'Yes',
        feedback: { low: 'Low' },
        evaluate: (s) =>
          s.n > 0 ? { ok: true } : { ok: false, mistake: 'low' },
        answer: { n: 1 },
        probes: [
          { scene: { n: 0 }, expect: 'low' },
          { scene: { n: 1 }, expect: 'ok' },
        ],
        why: { title: 'W', paragraphs: ['P'] },
      }),
    ],
    takeaway: {
      kind: 'takeaway',
      id: 'end',
      view: 'x',
      body: 'B',
      points: [],
      inSession: 'S',
      limits: 'L',
      next: 'N',
    },
    practice: [
      {
        kind: 'choose',
        id: 'p1',
        view: 'x',
        body: 'B',
        question: 'Q',
        correct: 'a',
        right: 'R',
        choices: [{ id: 'a', text: 'A' }],
        why: { title: 'W', paragraphs: ['P'] },
      },
      {
        kind: 'choose',
        id: 'p2',
        view: 'x',
        body: 'B',
        question: 'Q',
        correct: 'a',
        right: 'R',
        choices: [{ id: 'a', text: 'A' }],
        why: { title: 'W', paragraphs: ['P'] },
      },
      {
        kind: 'choose',
        id: 'p3',
        view: 'x',
        body: 'B',
        question: 'Q',
        correct: 'a',
        right: 'R',
        choices: [{ id: 'a', text: 'A' }],
        why: { title: 'W', paragraphs: ['P'] },
      },
    ],
  };

  it('passes a good lesson', () => {
    expect(lintLesson(base)).toEqual([]);
  });

  it('wants the student acting straight after the hook', () => {
    const late: LessonScript<Scene> = {
      ...base,
      screens: [
        { kind: 'explain', id: 'e', view: 'x', body: 'B' },
        ...base.screens,
      ],
    };
    expect(lintLesson(late).join()).toMatch(/after the hook must be checked/);
  });

  it('wants every explanation put to use', () => {
    const bare: LessonScript<Scene> = {
      ...base,
      screens: [
        ...base.screens,
        { kind: 'explain', id: 'e', view: 'x', body: 'B' },
      ],
    };
    expect(lintLesson(bare).join()).toMatch(/explain must be followed/);
  });

  it('catches long text and too many terms', () => {
    const wordy: LessonScript<Scene> = {
      ...base,
      hook: {
        ...base.hook,
        body: `${'word '.repeat(46)}**a** **b** **c**`,
      },
    };
    const problems = lintLesson(wordy).join();
    expect(problems).toMatch(/body over 45/);
    expect(problems).toMatch(/over 2 bold/);
  });

  it('catches an answer that fails, and a mistake with no probe', () => {
    const broken: LessonScript<Scene> = {
      ...base,
      screens: [
        doScreen<'low'>({
          id: 'do',
          view: 'x',
          body: 'Do',
          right: 'Yes',
          feedback: { low: 'Low' },
          evaluate: () => ({ ok: false, mistake: 'low' }),
          answer: { n: 1 },
          probes: [],
          why: { title: 'W', paragraphs: ['P'] },
        }),
      ],
    };
    const problems = lintLesson(broken).join();
    expect(problems).toMatch(/its own answer fails/);
    expect(problems).toMatch(/no probe for "low"/);
  });

  it('builds the stage part way through, with earlier answers in place', () => {
    expect(sceneAt(base, 0)).toEqual({ n: 0 });
    expect(sceneAt(base, 1)).toEqual({ n: 0 });
    expect(sceneAt(base, 2)).toEqual({ n: 1 });
  });
});
