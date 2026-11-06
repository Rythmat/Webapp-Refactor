import { describe, expect, it } from 'vitest';
import { getActivityFlow } from '@/curriculum/data/activityFlows';
import { buildGuitarTheoryFlow } from '@/curriculum/data/activityFlows/guitarTheoryFlows';
import type { ActivityFlowV2 } from '@/curriculum/types/activity.v2';
import { ionianGuitarLesson, ionianKey, popLevel1Lesson } from '../lessons';
import { ionianKeyboardChapters } from '../lessons/ionian';
import { lintChapter } from '../lintChapter';
import {
  chapterPracticeStart,
  chapterScreens,
  chapterSteps,
  resolveChapter,
  type GuidedChapter,
} from '../types';

const KEYS = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'];

const code = (activity: string) => activity.split(':')[0].trim();

/** Every step of each of its sections is on a screen. */
function expectCovers(
  flow: ActivityFlowV2,
  chapters: readonly GuidedChapter[],
) {
  for (const section of flow.sections) {
    const chapter = chapters.find((c) => c.id === section.id);
    expect(chapter, `${section.name} has a chapter`).toBeTruthy();
    const covered = chapterSteps(chapter!);
    for (const step of section.steps) {
      expect(covered.has(code(step.activity)), step.activity).toBe(true);
    }
  }
}

/** Every step a chapter names is in its section. */
function expectExists(
  flow: ActivityFlowV2,
  chapters: readonly GuidedChapter[],
) {
  for (const chapter of chapters) {
    const section = flow.sections.find((s) => s.id === chapter.id)!;
    const known = new Set(section.steps.map((s) => code(s.activity)));
    const named = new Set(chapterSteps(chapter));
    if (chapter.hook.hear) named.add(chapter.hook.hear);
    for (const step of named) {
      expect(known.has(step), `${chapter.id} names ${step}`).toBe(true);
    }
  }
}

/** A step only proves steps that come before it. */
function expectCreditsBefore(chapters: readonly GuidedChapter[]) {
  for (const chapter of chapters) {
    const earlier: string[] = [];
    for (const screen of chapter.screens) {
      if (screen.kind !== 'play') continue;
      for (const rung of screen.rungs) {
        rung.credits?.forEach((credited) =>
          expect(earlier, `${screen.id}: ${rung.step}`).toContain(credited),
        );
        earlier.push(rung.step);
      }
    }
  }
}

describe('Pop, Level 1', () => {
  it('covers every step of every section, with nothing made up', async () => {
    const flow = (await getActivityFlow('pop', 1)) as ActivityFlowV2;
    const chapters = popLevel1Lesson();
    expect(chapters.map((c) => c.id)).toEqual(['A', 'B', 'C', 'D']);
    expectCovers(flow, chapters);
    expectExists(flow, chapters);
    expectCreditsBefore(chapters);
  });

  it('keeps to the house rules', () => {
    for (const chapter of popLevel1Lesson()) {
      expect(lintChapter(`pop/${chapter.id}`, chapter)).toEqual([]);
    }
  });
});

describe('Ionian on guitar', () => {
  const chapters = (key: string) => {
    const flow = buildGuitarTheoryFlow(key, 'ionian');
    return {
      flow,
      chapters: ionianGuitarLesson({ flow, chordName: (symbol) => symbol }),
    };
  };

  it.each(KEYS)('covers every step in %s, with nothing made up', (key) => {
    const { flow, chapters: list } = chapters(key);
    expect(list.map((c) => c.id)).toEqual(flow.sections.map((s) => s.id));
    expectCovers(flow, list);
    expectExists(flow, list);
    expectCreditsBefore(list);
  });

  it.each(KEYS)('keeps to the house rules in %s', (key) => {
    for (const chapter of chapters(key).chapters) {
      expect(lintChapter(`guitar/${key}/${chapter.id}`, chapter)).toEqual([]);
    }
  });

  it('names a chord as the student reads them', () => {
    const flow = buildGuitarTheoryFlow('C', 'ionian');
    const [, chords] = ionianGuitarLesson({
      flow,
      chordName: (symbol) => `<${symbol}>`,
    });
    const first = chapterScreens(chords).find((s) => s.id === 'first-four');
    expect(first?.kind === 'play' && first.rungs[0].label).toContain('<C>');
  });
});

describe('Ionian on keyboard', () => {
  const STEPS = [
    ...[
      'asc-nh',
      'asc-pa',
      'desc-nh',
      'desc-pa',
      'ascdesc-nh',
      'ascdesc-pa',
      'contour-1-nh',
      'contour-1-pa',
      'contour-2-nh',
      'contour-2-pa',
      'contour-1-stac-pa',
      'contour-1-lega-pa',
      'contour-1-mix-pa',
    ].map((ref) => ({ ref, title: ref })),
    ...[1, 2, 3, 4, 5, 6, 7].flatMap((n) => [
      { ref: `triad-${n}-arp-pa`, title: `${n} maj Chord • Arpeggio & Hold` },
      {
        ref: `seventh-${n}-arp-pa`,
        title: `${n} maj7 7th Chord • Arpeggio & Hold`,
      },
    ]),
    {
      ref: 'triad-progression-1-pa',
      title: 'Chord Progression 1 – 4 – 5 – 1 • Play Along',
    },
    {
      ref: 'seventh-progression-1-pa',
      title: '7th Chord Progression 2 – 5 – 1 • Play Along',
    },
  ];

  it.each(['C', 'G', 'F♯', 'D♭', 'E♭'])('spells %s, and passes', (key) => {
    const chapters = ionianKeyboardChapters(ionianKey(key), STEPS);
    expect(chapters.map((c) => c.id)).toEqual(['A', 'B']);
    for (const chapter of chapters) {
      expect(lintChapter(`keyboard/${key}/${chapter.id}`, chapter)).toEqual([]);
    }
    const covered = new Set(chapters.flatMap((c) => [...chapterSteps(c)]));
    for (const step of STEPS)
      expect(covered.has(step.ref), step.ref).toBe(true);
  });

  it.each(KEYS)('finds the notes of %s, spelled for the key', (key) => {
    const [melody] = ionianKeyboardChapters(ionianKey(key), STEPS);
    const screen = chapterScreens(melody).find((s) => s.id === 'find-notes');
    if (screen?.kind !== 'pick') throw new Error('no picking screen');
    const { notes } = ionianKey(key);
    expect(screen.scale).toHaveLength(7);
    expect(new Set(screen.scale).size).toBe(7);
    expect(screen.scale.map(screen.nameOf)).toEqual(notes);
  });

  it('asks which notes, with wrong answers one note away', () => {
    const [melody] = ionianKeyboardChapters(ionianKey('E♭'), STEPS);
    const screen = melody.practice.find((s) => s.id === 'check-notes');
    if (screen?.kind !== 'choose') throw new Error('no question');
    const text = (id: string) => screen.choices.find((c) => c.id === id)?.text;
    expect(text('ionian')).toBe('E♭, F, G, A♭, B♭, C, D');
    expect(text('lydian')).toBe('E♭, F, G, A, B♭, C, D');
    expect(text('mixolydian')).toBe('E♭, F, G, A♭, B♭, C, D♭');
  });

  it.each(KEYS)('never offers the same list twice in %s', (key) => {
    const [melody] = ionianKeyboardChapters(ionianKey(key), STEPS);
    const screen = melody.practice.find((s) => s.id === 'check-notes');
    if (screen?.kind !== 'choose') throw new Error('no question');
    expect(new Set(screen.choices.map((c) => c.text)).size).toBe(3);
  });

  it('no longer asks about neighbours', () => {
    for (const key of KEYS) {
      for (const chapter of ionianKeyboardChapters(ionianKey(key), STEPS)) {
        for (const screen of chapterScreens(chapter)) {
          expect(screen.id).not.toBe('half-steps');
        }
      }
    }
  });

  it('labels a chord and a progression from their titles', () => {
    const [, chords] = ionianKeyboardChapters(ionianKey('C'), STEPS);
    const screens = chapterScreens(chords);
    const triads = screens.find((s) => s.id === 'triads');
    const progressions = screens.find((s) => s.id === 'progressions');
    const sevenths = screens.find((s) => s.id === 'sevenths');
    expect(triads?.kind === 'play' && triads.rungs[0].label).toBe('1 maj');
    expect(sevenths?.kind === 'play' && sevenths.rungs[0].label).toBe('1 maj7');
    expect(progressions?.kind === 'play' && progressions.rungs[0].label).toBe(
      '1 – 4 – 5 – 1',
    );
  });
});

describe('a flow that has changed under a lesson', () => {
  const chapter = popLevel1Lesson()[0];
  const stepsWithout = (...gone: string[]) =>
    [...chapterSteps(chapter)]
      .filter((ref) => !gone.includes(ref))
      .map((ref) => ({ ref, title: ref, direction: '' }));

  it('drops a step that has gone, and a screen left with nothing', () => {
    const resolved = resolveChapter(chapter, stepsWithout('A2.1'));
    expect(chapterSteps(resolved).has('A2.1')).toBe(false);
    expect(resolved.screens.some((s) => s.id === 'three-notes')).toBe(false);
  });

  it('gives a new step a screen of its own, so that nothing vanishes', () => {
    const resolved = resolveChapter(chapter, [
      ...stepsWithout(),
      { ref: 'A9.1', title: 'New', direction: 'Play this new thing.' },
    ]);
    const added = resolved.screens.find((s) => s.id === 'step-A9.1');
    expect(added?.body).toBe('Play this new thing.');
    expect(chapterPracticeStart(resolved)).toBe(
      chapterPracticeStart(chapter) + 1,
    );
  });

  it('stops the hook playing a step that has gone', () => {
    const resolved = resolveChapter(chapter, stepsWithout('A2.2'));
    expect(resolved.hook.hear).toBeUndefined();
  });
});
