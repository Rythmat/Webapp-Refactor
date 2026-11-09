import { describe, expect, it } from 'vitest';
import { ACTIVITIES } from '@/features/classroom/content/activities';
import { LESSON_SEEDS } from '@/features/classroom/content/seeds';
import { THEMES } from '@/features/classroom/content/themes';
import { lessonFrom, matches, themeForMonth } from '../libraryModel';

const byId = (id: string) => ACTIVITIES.find((a) => a.id === id);

describe('matches', () => {
  it('needs every word somewhere in the item', () => {
    expect(matches('blues call', 'Call and response', 'A blues form')).toBe(
      true,
    );
    expect(matches('blues bebop', 'Call and response', 'A blues form')).toBe(
      false,
    );
    expect(matches('  ', 'anything')).toBe(true);
  });
});

describe('themeForMonth', () => {
  it('finds the month’s theme', () => {
    const t = themeForMonth(THEMES, 11);
    expect(t?.month).toBe(11);
  });
});

describe('lessonFrom', () => {
  const daySeed = LESSON_SEEDS.find((s) => s.kind === 'day');
  const activitySeed = LESSON_SEEDS.find((s) => s.kind === 'activity');

  it('makes a dated lesson in the class, slides from its cells', () => {
    if (!daySeed) throw new Error('no day seed in the bank');
    const day = lessonFrom(
      { kind: 'seed', seed: daySeed },
      { classroomId: 'c1', date: '2026-11-12', resolveActivityId: byId },
    );
    expect(day).toMatchObject({
      classroomId: 'c1',
      scheduledDate: '2026-11-12',
      label: daySeed.title.en,
      sourceSeedId: daySeed.id,
    });
    expect(day.deck?.slides.length).toBeGreaterThan(0);
    // The seed's words reach the slides.
    const titles = JSON.stringify(day.deck);
    const firstTitle = Object.values(daySeed.template).find(
      (p) => p.presentation.title?.en,
    )?.presentation.title?.en;
    if (firstTitle) expect(titles).toContain(firstTitle);
  });

  it('puts an activity seed and a bank activity in their phase', () => {
    if (!activitySeed || activitySeed.kind !== 'activity') return;
    const fromSeed = lessonFrom(
      { kind: 'seed', seed: activitySeed },
      { classroomId: 'c1', date: null, resolveActivityId: byId },
    );
    const phase = activitySeed.anchor.phase;
    expect(fromSeed.cells[phase].presentation.title.en).toBeTruthy();
    expect(fromSeed.scheduledDate).toBeNull();

    const activity = ACTIVITIES[0];
    const fromActivity = lessonFrom(
      { kind: 'activity', activity },
      { classroomId: 'c2', date: null, resolveActivityId: byId },
    );
    expect(fromActivity.cells[activity.phase].presentation.title.en).toBe(
      activity.title.en,
    );
    expect(fromActivity.label).toBe(activity.title.en);
  });

  it('keeps pedagogy off the slides', () => {
    if (!daySeed) return;
    const day = lessonFrom(
      { kind: 'seed', seed: daySeed },
      { classroomId: 'c1', date: null, resolveActivityId: byId },
    );
    const deck = JSON.stringify(day.deck);
    for (const key of ['assessment', 'standards', 'rationale', 'cloIds']) {
      expect(deck).not.toContain(`"${key}"`);
    }
  });
});
