// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import type { PathRow } from '@/components/learn/path/types';
import { addPremiumLesson } from '@/daw/components/Tutorial/__tests__/premiumLessonFixture';
import {
  listTutorialCatalog,
  TUTORIAL_COURSES,
} from '@/daw/components/Tutorial/tutorialCatalog';
import { genreReadinessFrom } from '@/features/learn/genreReadiness';
import {
  coursePercent,
  nextRow,
  primaryLabel,
  stopsDone,
} from '@/features/learn/paths/courseProgress';
import { activityIndex, courseTouches } from '../courseActivity';
import { exploreHref, parseLearnHash, topicOfWord } from '../exploreState';
import { allCourses, buildLearnCatalog } from '../learnCatalog';

const row = (id: string, percent: number, tracked = true): PathRow => ({
  id,
  title: id,
  ratio: [2, 3],
  levelId: 'l1',
  route: `/r/${id}`,
  percent,
  tracked,
  locked: false,
});

describe('course progress', () => {
  const course = {
    rows: [row('a', 100), row('b', 40), row('c', 0), row('x', 0, false)],
  };

  it('averages the tracked stops only', () => {
    expect(coursePercent(course)).toBe(47);
    expect(coursePercent({ rows: [row('x', 0, false)] })).toBe(0);
  });

  it('finds the first unfinished tracked stop', () => {
    expect(nextRow(course)?.id).toBe('b');
    expect(nextRow(course, 'a')?.id).toBe('a');
    expect(nextRow({ rows: [row('a', 100)] })).toBeNull();
    expect(stopsDone(course)).toEqual({ done: 1, total: 3 });
  });

  it('names the button by the stop’s state', () => {
    expect(primaryLabel(row('a', 100), false)).toBe('Go over it');
    expect(primaryLabel(row('b', 40), true)).toBe('Continue');
    expect(primaryLabel(row('c', 0), true)).toBe('Start');
    expect(primaryLabel({ ...row('c', 0), locked: true }, true)).toBe(
      'Subscribe to unlock',
    );
  });
});

describe('Explore’s address', () => {
  it('writes topics as readable words', () => {
    expect(exploreHref('piano', 'theory')).toBe('/learn?i=keyboard&c=theory');
    expect(exploreHref()).toBe('/learn');
    expect(topicOfWord('keyboard')).toBe('piano');
    expect(topicOfWord('piano')).toBe('piano');
    expect(topicOfWord('drums')).toBeNull();
  });

  it('reads the old one-page anchors', () => {
    expect(parseLearnHash('#guitar-theory')).toEqual({
      topic: 'guitar',
      section: 'theory',
    });
    expect(parseLearnHash('#piano-genres')).toEqual({
      topic: 'piano',
      section: 'genres',
    });
    expect(parseLearnHash('#audio')).toEqual({ topic: 'audio', section: null });
    expect(parseLearnHash('#learn-home')).toBeNull();
    expect(parseLearnHash('')).toBeNull();
  });
});

const catalog = (premium = true) =>
  buildLearnCatalog({
    enabled: () => true,
    isPremium: premium,
    lessons: [],
    completedAt: {},
    genreReady: genreReadinessFrom(new Set(['pop:1:A', 'pop:1:B'])),
  });

describe('the catalog', () => {
  it('lists every topic with its sections, Audio last', () => {
    const topics = catalog();
    expect(topics.map((t) => t.id)).toEqual([
      'piano',
      'guitar',
      'bass',
      'ukulele',
      'audio',
    ]);
    expect(topics[0].sections.map((s) => s.id)).toEqual([
      'theory',
      'genres',
      'technique',
    ]);
    // Genres teach at the keys only.
    expect(topics[1].sections.map((s) => s.id)).not.toContain('genres');
  });

  it('puts built genres first and marks the rest coming soon', () => {
    const genres = catalog()[0].sections.find((s) => s.id === 'genres')!;
    expect(genres.courses[0].slug).toBe('pop');
    expect(genres.courses[0].comingSoon).toBe(false);
    expect(genres.courses[0].next?.title).toBe('Melody');
    expect(genres.courses.at(-1)?.comingSoon).toBe(true);
  });

  it('gives each course a unique id and a next stop where it has a path', () => {
    const courses = allCourses(catalog());
    expect(new Set(courses.map((c) => c.id)).size).toBe(courses.length);
    const diatonic = courses.find((c) => c.id === 'guitar/theory/diatonic')!;
    expect(diatonic.next?.route).toMatch(/^\/learn\/guitar\/ionian\//);
    expect(diatonic.next?.total).toBeGreaterThan(0);
  });

  it('locks premium technique for free students', () => {
    const technique = allCourses(catalog(false)).filter(
      (c) => c.kind === 'technique',
    );
    expect(technique.some((c) => c.locked)).toBe(true);
    expect(technique.some((c) => !c.locked)).toBe(true);
  });

  it('maps Cortex activities to their courses', () => {
    const courses = allCourses(catalog());
    const toCourse = activityIndex(courses);
    expect(toCourse('theory:guitar.dorian.d-flat')).toBe(
      'guitar/theory/diatonic',
    );
    expect(toCourse('lesson:pop-l1')).toBe('piano/genre/pop');
    expect(toCourse('lesson:hiphop-l2')).toBe('piano/genre/hip-hop');
    expect(toCourse('audio:sound-basics.what-is-sound')).toBe(
      'audio/course/sound-basics',
    );
    expect(toCourse('technique:piano-fundamentals')).toBe(
      'piano/technique/Piano Fundamentals',
    );
    expect(toCourse('song:africa')).toBeNull();

    const touches = courseTouches(courses, {
      'theory:guitar.dorian.d-flat': [10, 20, 0],
      'theory:guitar.ionian.c': [5, 15, 15],
    });
    expect(touches.get('guitar/theory/diatonic')).toEqual({
      lastMin: 20,
      doneMin: 15,
      doneCount: 1,
    });
  });
});

describe('Audio’s Production Lessons', () => {
  const production = (premium: boolean, completedAt = {}) =>
    buildLearnCatalog({
      enabled: () => true,
      isPremium: premium,
      lessons: [],
      completedAt,
      genreReady: null,
    })
      .find((t) => t.id === 'audio')!
      .sections.find((s) => s.id === 'production')!;

  it('comes right after the courses', () => {
    const audio = catalog().find((t) => t.id === 'audio')!;
    expect(audio.sections.map((s) => s.id).slice(0, 2)).toEqual([
      'courses',
      'production',
    ]);
  });

  it('lists every Studio lesson, the courses’ first and in order', () => {
    const slugs = production(true).courses.map((c) => c.slug);
    expect([...slugs].sort()).toEqual(
      listTutorialCatalog()
        .map((t) => t.id)
        .sort(),
    );
    const first = TUTORIAL_COURSES[0];
    expect(slugs.slice(0, first.lessonIds.length)).toEqual(first.lessonIds);
  });

  it('opens each in the Studio with the lesson running', () => {
    for (const course of production(true).courses) {
      expect(course.route).toBe(
        `/studio?tutorial=${encodeURIComponent(course.slug)}`,
      );
    }
  });

  it('locks only the Premium lessons, and only for a free student', () => {
    // Every Studio Production lesson is free; a console lesson in the old
    // Prism is Premium.
    const removePremiumLesson = addPremiumLesson();
    const premiumOnly = new Set(
      listTutorialCatalog()
        .filter((t) => t.requiresPremium)
        .map((t) => t.id),
    );
    expect(premiumOnly.size).toBeGreaterThan(0);
    for (const course of production(false).courses) {
      expect(course.locked, course.slug).toBe(premiumOnly.has(course.slug));
    }
    expect(production(true).courses.some((c) => c.locked)).toBe(false);
    removePremiumLesson();
  });

  it('shows a finished lesson as done', () => {
    const courses = production(true, { 'hiphop-build-the-beat': 1 }).courses;
    expect(
      courses.find((c) => c.slug === 'hiphop-build-the-beat')!.percent,
    ).toBe(100);
    expect(courses.find((c) => c.slug === 'house-make-it-pump')!.percent).toBe(
      0,
    );
  });
});
