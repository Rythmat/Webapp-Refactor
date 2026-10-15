import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  TUTORIAL_CATALOG,
  getTutorialEntry,
  lessonAccess,
  lessonNeedsUpgrade,
} from '../tutorialCatalog';
import { TUTORIALS, type TutorialStep } from '../tutorials';

/**
 * The Production lessons' catalog (tutorialCatalog.ts): the tile copy and the
 * Premium flag the Studio dashboard reads without the steps (audit
 * practice-tutorial-25), and the access rule both the dashboard and the
 * editor's boot apply to it (owner decision 8: the Prism lessons are Premium,
 * Prism is not unlocked during lessons; audit ia-flows-14).
 */

const targetsOf = (step: TutorialStep): string[] =>
  !step.target ? [] : Array.isArray(step.target) ? step.target : [step.target];

/**
 * A step in Prism: it opens the Prism tab, or it spotlights the tab or an
 * anchor inside the Prism panel (every one of those is `prism-*`). A free
 * student meets the premium lock on any of them.
 */
const usesPrism = (step: TutorialStep): boolean =>
  step.requires?.channelStripTab === 'prism' ||
  targetsOf(step).some(
    (id) => id.startsWith('prism-') || id === 'chanstrip-tab-prism',
  );

describe('the lesson catalog', () => {
  it('lists every lesson tutorials.ts has, in the same order, with the same copy', () => {
    expect(TUTORIALS.map((t) => t.id)).toEqual(
      TUTORIAL_CATALOG.map((t) => t.id),
    );
    for (const [i, entry] of TUTORIAL_CATALOG.entries()) {
      const { steps, ...card } = TUTORIALS[i];
      expect(card).toEqual(entry);
      expect(steps.length).toBeGreaterThan(0);
    }
    expect(new Set(TUTORIAL_CATALOG.map((t) => t.id)).size).toBe(
      TUTORIAL_CATALOG.length,
    );
  });

  it('marks a lesson Premium exactly when one of its steps is in Prism', () => {
    for (const lesson of TUTORIALS) {
      const prismSteps = lesson.steps.filter(usesPrism).map((s) => s.id);
      expect(
        { lesson: lesson.id, requiresPremium: lesson.requiresPremium },
        `${lesson.id}'s Prism steps: ${prismSteps.join(', ') || 'none'}`,
      ).toEqual({ lesson: lesson.id, requiresPremium: prismSteps.length > 0 });
    }
  });

  it('makes the four Prism lessons Premium and leaves the other four free', () => {
    const premium = (want: boolean) =>
      TUTORIAL_CATALOG.filter((t) => t.requiresPremium === want).map(
        (t) => t.id,
      );
    expect(premium(true)).toEqual([
      'make-first-track',
      'jazz-color-your-chords',
      'edm-design-the-drop',
      'rnb-mix-and-polish',
    ]);
    expect(premium(false)).toEqual([
      'hiphop-build-the-beat',
      'pop-flip-a-sample',
      'house-make-it-pump',
      'indie-movement-and-dynamics',
    ]);
  });

  it('finds an entry by id, and nothing for an unknown or missing id', () => {
    expect(getTutorialEntry('pop-flip-a-sample')?.title).toBe(
      'Pop — Flip a sample',
    );
    expect(getTutorialEntry('no-such-lesson')).toBeNull();
    expect(getTutorialEntry(null)).toBeNull();
  });

  it('imports nothing, so the dashboard never loads the steps or Prism', () => {
    const source = readFileSync(
      join(__dirname, '..', 'tutorialCatalog.ts'),
      'utf8',
    );
    expect(source).not.toMatch(/^\s*import\s/m);
    expect(source).not.toMatch(/\bimport\(/);
  });
});

describe('lesson access', () => {
  const free = { isPremium: false, isLoading: false };
  const premium = { isPremium: true, isLoading: false };
  // useIsPremium reports isPremium false while the subscription loads.
  const loading = { isPremium: false, isLoading: true };

  it('turns a free student away from a Premium lesson only', () => {
    expect(lessonNeedsUpgrade('make-first-track', false)).toBe(true);
    expect(lessonNeedsUpgrade('make-first-track', true)).toBe(false);
    expect(lessonNeedsUpgrade('hiphop-build-the-beat', false)).toBe(false);
    expect(lessonAccess('jazz-color-your-chords', free)).toBe('upgrade');
    expect(lessonAccess('jazz-color-your-chords', premium)).toBe('open');
    expect(lessonAccess('house-make-it-pump', free)).toBe('open');
  });

  it('waits on a Premium lesson while the subscription loads, never on a free one', () => {
    expect(lessonAccess('edm-design-the-drop', loading)).toBe('wait');
    expect(lessonAccess('pop-flip-a-sample', loading)).toBe('open');
  });

  it('leaves an unknown lesson to the boot, which says it was not found', () => {
    expect(lessonNeedsUpgrade('no-such-lesson', false)).toBe(false);
    expect(lessonAccess('no-such-lesson', free)).toBe('open');
    expect(lessonAccess(null, loading)).toBe('open');
  });
});
