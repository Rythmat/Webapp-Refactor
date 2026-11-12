// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { CHECK_CATALOG } from '@/content/studioLessons/checkCatalog';
import {
  studioLessonSchema,
  type StudioLesson,
} from '@/content/studioLessons/schemas';
import {
  rememberStudioLessonDeleted,
  rememberStudioLessonSaved,
  setStudioLessonDrafts,
} from '@/curriculum/engine/studioLessons/registry';
import type { AllSlices } from '@/daw/store';
import type { SynthStore } from '@/daw/oracle-synth/store';
import { BUILT_CHECK_NAMES, buildNamedCheck } from '../checkRegistry';
import { codeLessonAsFile } from '../lessonFiles';
import {
  courseLessons,
  getTutorialEntry,
  lessonPlace,
  listTutorialCatalog,
  TUTORIAL_COURSES,
} from '../tutorialCatalog';
import { getTutorial, TUTORIALS, tutorialFromFile } from '../tutorials';

const mock = (partial: Record<string, unknown>) =>
  partial as unknown as AllSlices;

const saved: string[] = [];
const save = (lesson: StudioLesson) => {
  saved.push(lesson.id);
  rememberStudioLessonSaved(lesson);
};

afterEach(() => {
  saved.splice(0).forEach(rememberStudioLessonDeleted);
  setStudioLessonDrafts(false);
});

const newLesson = (over: Partial<StudioLesson> = {}): StudioLesson => ({
  id: 'console-lesson',
  title: 'A console lesson',
  subtitle: 'Made in the console.',
  difficulty: 'Beginner',
  estMinutes: 3,
  requiresPremium: false,
  status: 'live',
  steps: [
    {
      id: 'set-tempo',
      stage: 'STAGE 1',
      instruction: 'Set the tempo to **90**.',
      target: 'transport-bpm',
      check: {
        kind: 'named',
        name: 'store.value',
        params: { field: 'bpm', op: '=', value: '90', changed: false },
      },
    },
    { id: 'listen', stage: 'STAGE 2', instruction: 'Listen, then click Next.' },
  ],
  ...over,
});

describe('a code lesson as a file', () => {
  it.each(TUTORIALS.map((t) => [t.id]))(
    '%s round-trips: valid, and built back exactly as the code',
    (id) => {
      const file = codeLessonAsFile(id)!;
      expect(studioLessonSchema.safeParse(file).success).toBe(true);
      const code = TUTORIALS.find((t) => t.id === id)!;
      const built = tutorialFromFile(file);
      expect(built.requiresPremium).toBe(code.requiresPremium);
      expect(built.steps.map((st) => st.id)).toEqual(
        code.steps.map((st) => st.id),
      );
      built.steps.forEach((st, i) => {
        const was = code.steps[i];
        expect(st.target).toEqual(was.target);
        expect(st.instruction).toBe(was.instruction);
        expect(st.requires).toEqual(was.requires);
        // The very same functions and beats, by reference.
        expect(st.check).toBe(was.check);
        expect(st.synthCheck).toBe(was.synthCheck);
        expect(st.demo).toBe(was.demo);
      });
    },
  );
});

describe('the ready-made checks', () => {
  it('builds every check the console lists, and only those', () => {
    expect([...BUILT_CHECK_NAMES].sort()).toEqual(
      CHECK_CATALOG.map((c) => c.name).sort(),
    );
  });

  it('store.value compares, and asks for a change when told to', () => {
    const at = (bpm: number) => mock({ bpm });
    const eq = buildNamedCheck('store.value', {
      field: 'bpm',
      op: '≤',
      value: '95',
      changed: true,
    })!.check!;
    expect(eq(at(90), at(120))).toBe(true);
    expect(eq(at(90), at(90))).toBe(false); // not changed
    expect(eq(at(100), at(120))).toBe(false);
    const view = buildNamedCheck('store.value', {
      field: 'currentView',
      op: '=',
      value: 'studio',
    })!.check!;
    expect(view(mock({ currentView: 'studio' }), mock({}))).toBe(true);
    const playing = buildNamedCheck('store.value', {
      field: 'isPlaying',
      op: '=',
      value: 'true',
    })!.check!;
    expect(playing(mock({ isPlaying: true }), mock({}))).toBe(true);
  });

  it('refuses a field off the list, and a name it does not know', () => {
    expect(buildNamedCheck('store.value', { field: 'tracks' })).toBeNull();
    expect(buildNamedCheck('nope', {})).toBeNull();
  });

  it('track and effect checks read the selected track', () => {
    const state = (effects: Record<string, unknown>, active: string[]) =>
      mock({
        selectedTrackId: 't1',
        tracks: [
          {
            id: 't1',
            type: 'midi',
            instrument: 'oracle-synth',
            activeEffects: active,
            effects,
          },
        ],
      });
    const synth = buildNamedCheck('track.selectedInstrument', {
      instrument: 'oracle-synth',
    })!.check!;
    expect(synth(state({}, []), mock({ tracks: [] }))).toBe(true);
    const added = buildNamedCheck('effect.added', { effect: 'reverb' })!.check!;
    expect(added(state({}, ['reverb']), mock({ tracks: [] }))).toBe(true);
    expect(added(state({}, []), mock({ tracks: [] }))).toBe(false);
    const raised = buildNamedCheck('effect.paramAbove', {
      effect: 'multiband',
      param: 'depth',
      value: 0.4,
    })!.check!;
    expect(
      raised(
        state({ multiband: { depth: 0.6 } }, ['multiband']),
        state({ multiband: { depth: 0.3 } }, ['multiband']),
      ),
    ).toBe(true);
    expect(
      raised(
        state({ multiband: { depth: 0.6 } }, ['multiband']),
        state({ multiband: { depth: 0.6 } }, ['multiband']),
      ),
    ).toBe(false);
  });

  it('synth.preset checks the synth’s own store', () => {
    const built = buildNamedCheck('synth.preset', { name: 'WOBBLE' })!;
    expect(built.check).toBeUndefined();
    const sy = (presetName: string) =>
      ({ presetName }) as unknown as SynthStore;
    expect(built.synthCheck!(sy('WOBBLE'), sy('BASS'))).toBe(true);
    expect(built.synthCheck!(sy('BASS'), sy('BASS'))).toBe(false);
  });
});

describe('console lessons alongside the code’s', () => {
  it('adds a new lesson to the catalog and builds its steps', () => {
    save(newLesson());
    expect(listTutorialCatalog().at(-1)?.id).toBe('console-lesson');
    const lesson = getTutorial('console-lesson')!;
    expect(lesson.steps).toHaveLength(2);
    const check = lesson.steps[0].check!;
    expect(check(mock({ bpm: 90 }), mock({ bpm: 120 }))).toBe(true);
    expect(lesson.steps[1].check).toBeUndefined();
  });

  it('keeps a draft from students, and shows it in the console', () => {
    save(newLesson({ status: 'draft' }));
    expect(getTutorial('console-lesson')).toBeNull();
    expect(getTutorialEntry('console-lesson')).toBeNull();
    setStudioLessonDrafts(true);
    expect(getTutorial('console-lesson')?.title).toBe('A console lesson');
  });

  it('replaces a code lesson in place, keeping its code checks', () => {
    const file = codeLessonAsFile('hiphop-build-the-beat')!;
    const reworded = {
      ...file,
      title: 'Hip Hop — Build it',
      steps: [...file.steps].reverse(),
    };
    save(reworded);
    const ids = listTutorialCatalog().map((t) => t.id);
    expect(ids.filter((id) => id === 'hiphop-build-the-beat')).toHaveLength(1);
    expect(ids.indexOf('hiphop-build-the-beat')).toBe(
      TUTORIALS.findIndex((t) => t.id === 'hiphop-build-the-beat'),
    );
    const lesson = getTutorial('hiphop-build-the-beat')!;
    expect(lesson.title).toBe('Hip Hop — Build it');
    const code = TUTORIALS.find((t) => t.id === 'hiphop-build-the-beat')!;
    expect(lesson.steps[0].check).toBe(code.steps.at(-1)!.check);
  });

  it('gives Premium by the steps: a Prism step needs it', () => {
    save(
      newLesson({
        steps: [
          {
            id: 'open-prism',
            stage: 'S',
            instruction: 'Open Prism.',
            requires: { channelStripTab: 'prism' },
          },
        ],
      }),
    );
    expect(getTutorialEntry('console-lesson')?.requiresPremium).toBe(true);
  });

  it('may join a course, in its place', () => {
    const course = TUTORIAL_COURSES[0];
    save(newLesson({ course: 'studio-production', courseOrder: 2 }));
    const ids = courseLessons(course).map((t) => t.id);
    expect(ids.slice(0, 3)).toEqual([
      'studio-basics',
      'hiphop-build-the-beat',
      'console-lesson',
    ]);
    expect(lessonPlace('console-lesson')?.total).toBe(
      course.lessonIds.length + 1,
    );
  });
});

describe('the lesson schema', () => {
  it('refuses a repeated step id and a course without its place', () => {
    const twice = newLesson();
    twice.steps[1] = { ...twice.steps[1], id: 'set-tempo' };
    expect(studioLessonSchema.safeParse(twice).success).toBe(false);
    expect(
      studioLessonSchema.safeParse(newLesson({ course: 'studio-production' }))
        .success,
    ).toBe(false);
  });

  it('refuses a ready-made check it does not list', () => {
    const lesson = newLesson();
    lesson.steps[0] = {
      ...lesson.steps[0],
      check: { kind: 'named', name: 'nope' as never, params: {} },
    };
    expect(studioLessonSchema.safeParse(lesson).success).toBe(false);
  });
});
