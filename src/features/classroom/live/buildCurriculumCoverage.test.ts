import { describe, expect, it } from 'vitest';
import type { ProgressSummaryLesson } from '@/lib/progress/types';
import type { DaySnapshot } from '../publish/publishDay';
import type { Interaction } from '../types';
import {
  activityRefToLessonRef,
  buildCurriculumCoverage,
  collectDeckLessonRefs,
} from './buildCurriculumCoverage';

describe('activityRefToLessonRef', () => {
  it('maps curriculum refs to a curriculum lessonId (dropping the section)', () => {
    expect(activityRefToLessonRef('curriculum:JAZZ:L1:A')).toMatchObject({
      lessonId: 'curriculum:JAZZ:L1',
      source: 'genre',
    });
    expect(activityRefToLessonRef('curriculum:hip hop:L2')?.lessonId).toBe(
      'curriculum:HIP HOP:L2',
    );
  });

  it('maps learn refs to the mode-lesson-flow lesson (mode + canonical root)', () => {
    expect(activityRefToLessonRef('learn:dorian:D minor')).toMatchObject({
      lessonId: 'mode-lesson-flow',
      mode: 'dorian',
      root: 'd',
      source: 'theory',
    });
  });

  it('returns null for song/globe/studio + junk', () => {
    expect(activityRefToLessonRef('song:x:lesson')).toBeNull();
    expect(activityRefToLessonRef('globe:event:e')).toBeNull();
    expect(activityRefToLessonRef('nonsense')).toBeNull();
  });
});

describe('collectDeckLessonRefs', () => {
  const atlasIx = (id: string, activityRef: string): Interaction => ({
    id,
    type: 'atlas',
    question: { en: 'q', es: 'q' },
    shareable: false,
    atlas: { module: 'learn', activityRef, expects: 'completion' },
  });

  it('collects + de-dupes gcmKey + app-route refs from a deck snapshot', () => {
    const snapshot = {
      cells: {
        groupPractice: {
          presentation: {
            interactions: [
              atlasIx('ix-a', 'curriculum:JAZZ:L1:A'),
              atlasIx('ix-t', 'learn:dorian:g'),
            ],
          },
        },
      },
      deck: {
        id: 'd',
        title: { en: 'd' },
        slides: [
          { id: 's-a', kind: 'app-route', phase: 'groupPractice', title: { en: 't' }, interactionId: 'ix-a' },
          { id: 's-t', kind: 'app-route', phase: 'groupPractice', title: { en: 't' }, interactionId: 'ix-t' },
        ],
        templateRef: { templateId: 'genre-lesson-v1', gcmKey: 'JAZZ:L1' },
      },
    } as unknown as DaySnapshot;

    const refs = collectDeckLessonRefs(snapshot);
    // gcmKey JAZZ:L1 and curriculum:JAZZ:L1:A both → curriculum:JAZZ:L1 (deduped),
    // plus the theory lesson.
    const ids = refs.map((r) => r.lessonId).sort();
    expect(ids).toEqual(['curriculum:JAZZ:L1', 'mode-lesson-flow']);
  });

  it('returns [] for a deckless snapshot', () => {
    expect(collectDeckLessonRefs({ cells: {} } as unknown as DaySnapshot)).toEqual([]);
  });
});

describe('buildCurriculumCoverage', () => {
  const refs = [
    { lessonId: 'curriculum:JAZZ:L1', version: 1, label: 'JAZZ:L1', source: 'genre' as const },
    { lessonId: 'mode-lesson-flow', mode: 'dorian', root: 'g', version: 1, label: 'Theory dorian / g', source: 'theory' as const },
  ];

  it('matches curriculum exact + mode-lesson-flow by prefix/mode/root and computes pct', () => {
    const summary: ProgressSummaryLesson[] = [
      { lessonId: 'curriculum:JAZZ:L1', lessonVersion: 1, currentActivityInstanceId: null, completedCount: 3, totalCount: 4, updatedAt: '' },
      { lessonId: 'mode-lesson-flow__g__dorian', lessonVersion: 1, mode: 'dorian', root: 'g', currentActivityInstanceId: null, completedCount: 1, totalCount: 2, updatedAt: '' },
    ];
    const rows = buildCurriculumCoverage(refs, summary);
    expect(rows[0]).toMatchObject({ completedCount: 3, totalCount: 4, pct: 75 });
    expect(rows[1]).toMatchObject({ completedCount: 1, totalCount: 2, pct: 50 });
  });

  it('treats an unmatched lesson as 0/unknown', () => {
    const rows = buildCurriculumCoverage(refs, []);
    expect(rows.every((r) => r.pct === 0 && r.totalCount === null)).toBe(true);
  });
});
