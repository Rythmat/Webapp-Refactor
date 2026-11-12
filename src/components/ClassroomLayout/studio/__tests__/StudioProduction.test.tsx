// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfileRoutes, StudioRoutes } from '@/constants/routes';
import {
  addPremiumLesson,
  PREMIUM_LESSON,
  PREMIUM_LESSON_TITLE,
} from '@/daw/components/Tutorial/__tests__/premiumLessonFixture';
import {
  TUTORIAL_CATALOG,
  TUTORIAL_COURSES,
} from '@/daw/components/Tutorial/tutorialCatalog';
import { useTutorialProgressStore } from '@/features/tutorials/useTutorialProgressStore';
import { StudioProduction } from '../StudioProduction';

/**
 * The Production tab's Premium lessons (owner decision 8, audit ia-flows-14):
 * a lesson with steps in the old Prism wears a Premium chip, and for a free student their
 * tile opens the upgrade prompt instead of the editor. While the
 * subscription loads nobody is treated as free (the editor's boot decides),
 * and a premium student opens every lesson.
 */

const premium = vi.hoisted(() => ({
  state: { isPremium: false, isLoading: false },
}));
vi.mock('@/hooks/useIsPremium', () => ({
  useIsPremium: () => premium.state,
}));
const telemetry = vi.hoisted(() => ({ trackPaywallViewed: vi.fn() }));
vi.mock('@/telemetry/hooks/useTelemetryProduct', () => telemetry);

// Every Studio Production lesson is free since the rebuild (2026-11-09);
// the gate is held by a console lesson with a step in the old Prism.
const PREMIUM_LESSONS = [PREMIUM_LESSON];
const UPGRADE_TITLE = 'This lesson uses Prism, part of Premium';

function Where() {
  const { pathname, search } = useLocation();
  return <output aria-label="location">{pathname + search}</output>;
}

function renderProduction() {
  return render(
    <MemoryRouter initialEntries={[StudioRoutes.production.definition]}>
      <Routes>
        <Route
          path={StudioRoutes.production.definition}
          element={<StudioProduction />}
        />
        <Route path={StudioRoutes.editor.definition} element={null} />
        <Route path={ProfileRoutes.plan.definition} element={null} />
      </Routes>
      <Where />
    </MemoryRouter>,
  );
}

const tile = (id: string) => {
  const el = document.querySelector<HTMLButtonElement>(
    `button[data-lesson-id="${id}"]`,
  );
  if (!el) throw new Error(`no tile for ${id}`);
  return el;
};
const location = () => screen.getByLabelText('location').textContent;
const editorLink = (id: string) =>
  `${StudioRoutes.editor.definition}?tutorial=${encodeURIComponent(id)}`;

beforeEach(() => {
  premium.state = { isPremium: false, isLoading: false };
  telemetry.trackPaywallViewed.mockClear();
  useTutorialProgressStore.setState({ completedAt: {} });
});
afterEach(cleanup);

describe('the Production tab', () => {
  let removePremiumLesson = () => {};
  beforeEach(() => {
    removePremiumLesson = addPremiumLesson();
  });
  afterEach(() => removePremiumLesson());

  it('lists every lesson, with a 12 px Premium chip on the Prism ones', () => {
    renderProduction();
    for (const lesson of [...TUTORIAL_CATALOG, { id: PREMIUM_LESSON }]) {
      const chip = within(tile(lesson.id)).queryByText('Premium');
      if (PREMIUM_LESSONS.includes(lesson.id)) {
        expect(chip, lesson.id).not.toBeNull();
        // A neutral Chip (white/8, no meaning colour) at the 12 px label
        // floor, from the editor's tokens (src/daw/ui, milestone 2.2).
        expect(chip).toHaveAttribute('data-tone', 'neutral');
        expect(chip).toHaveClass(
          'bg-daw-chip',
          'text-[length:var(--daw-font-label)]',
        );
      } else {
        expect(chip, lesson.id).toBeNull();
      }
    }
  });

  it('opens a free lesson in the editor for a free student', () => {
    renderProduction();
    fireEvent.click(tile('hiphop-build-the-beat'));
    expect(location()).toBe(editorLink('hiphop-build-the-beat'));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(telemetry.trackPaywallViewed).not.toHaveBeenCalled();
  });

  it('shows a free student the upgrade prompt on a Premium lesson, and stays put', async () => {
    renderProduction();
    const lessonTile = tile(PREMIUM_LESSON);
    expect(lessonTile).toHaveAttribute('aria-haspopup', 'dialog');
    fireEvent.click(lessonTile);

    const dialog = await screen.findByRole('dialog', { name: UPGRADE_TITLE });
    expect(dialog).toHaveTextContent(
      `“${PREMIUM_LESSON_TITLE}” has steps in Prism`,
    );
    expect(location()).toBe(StudioRoutes.production.definition);
    // Reported once, with the existing paywall telemetry.
    expect(telemetry.trackPaywallViewed).toHaveBeenCalledTimes(1);

    // The primary action is the white pill.
    const seePlans = within(dialog).getByRole('button', { name: 'See plans' });
    expect(seePlans).toHaveAttribute('data-variant', 'primary');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Not now' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(location()).toBe(StudioRoutes.production.definition);

    // Each opening is a paywall view.
    fireEvent.click(tile(PREMIUM_LESSON));
    await screen.findByRole('dialog', { name: UPGRADE_TITLE });
    expect(telemetry.trackPaywallViewed).toHaveBeenCalledTimes(2);
  });

  it('takes a free student to the plans from the prompt', async () => {
    renderProduction();
    fireEvent.click(tile(PREMIUM_LESSON));
    const dialog = await screen.findByRole('dialog', { name: UPGRADE_TITLE });
    fireEvent.click(within(dialog).getByRole('button', { name: 'See plans' }));
    expect(location()).toBe(ProfileRoutes.plan.definition);
  });

  it('never treats a student as free while the subscription loads', () => {
    premium.state = { isPremium: false, isLoading: true };
    renderProduction();
    expect(tile(PREMIUM_LESSON)).not.toHaveAttribute('aria-haspopup');
    fireEvent.click(tile(PREMIUM_LESSON));
    // The editor's boot waits for the subscription and decides there.
    expect(location()).toBe(editorLink(PREMIUM_LESSON));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens every lesson for a premium student, Premium chip and all', () => {
    premium.state = { isPremium: true, isLoading: false };
    renderProduction();
    for (const id of PREMIUM_LESSONS) {
      expect(within(tile(id)).getByText('Premium')).toBeInTheDocument();
    }
    fireEvent.click(tile(PREMIUM_LESSON));
    expect(location()).toBe(editorLink(PREMIUM_LESSON));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('still marks a finished Premium lesson as Completed', () => {
    premium.state = { isPremium: true, isLoading: false };
    act(() => useTutorialProgressStore.getState().markComplete(PREMIUM_LESSON));
    renderProduction();
    const lessonTile = tile(PREMIUM_LESSON);
    expect(within(lessonTile).getByText('Completed')).toBeInTheDocument();
    expect(within(lessonTile).getByText('Premium')).toBeInTheDocument();
    expect(lessonTile).toHaveTextContent('Replay lesson');
  });

  it('reads the catalog, not the lesson steps or the Prism engine', () => {
    // The dashboard chunk stays free of the step checks and the prism-engine
    // barrel (audit practice-tutorial-25). What it takes from the editor's
    // tree is listed, so a new import there gets the same look.
    const src = join(__dirname, '..', '..', '..', '..');
    const read = (path: string) => readFileSync(join(src, path), 'utf8');
    const tab = 'components/ClassroomLayout/studio/StudioProduction.tsx';
    const fromDaw = [...read(tab).matchAll(/from '@\/(daw\/[^']+)'/g)].map(
      (m) => m[1],
    );
    expect(fromDaw.sort()).toEqual([
      'daw/components/Tutorial/UpgradeLessonDialog',
      'daw/components/Tutorial/tutorialCatalog',
      'daw/components/Tutorial/useLessonAccess',
      'daw/ui/PremiumBadge',
    ]);
    for (const file of [
      tab,
      'daw/components/Tutorial/UpgradeLessonDialog.tsx',
      'daw/components/Tutorial/useLessonAccess.ts',
      'daw/ui/PremiumBadge.tsx',
    ]) {
      const source = read(file);
      expect(source, file).not.toMatch(/(Tutorial|\.)\/tutorials['"]/);
      expect(source, file).not.toMatch(/@prism\/engine|prism-engine/);
    }
  });
});

// ── The Studio Production course, first on the tab ─────────────────────────
// Studio Basics, then a lesson a craft, each from a blank project: how far
// the student is, and Start or Continue, which opens the first lesson not
// finished.

const COURSE = TUTORIAL_COURSES[0];
const TOTAL = COURSE.lessonIds.length;
const courseSection = () =>
  document.querySelector<HTMLElement>('[data-course="studio-production"]')!;
const courseAction = () =>
  courseSection().querySelector<HTMLButtonElement>('[data-course-action]')!;
const finish = (...ids: string[]) =>
  act(() => {
    for (const id of ids) useTutorialProgressStore.getState().markComplete(id);
  });

describe('the Studio Production course on the Production tab', () => {
  it('lists its lessons in order, Studio Basics first, and nothing after it', () => {
    renderProduction();
    const section = courseSection();
    expect(within(section).getByText('Studio Production')).toBeInTheDocument();
    const tiles = Array.from(
      section.querySelectorAll<HTMLElement>('[data-lesson-id]'),
    );
    expect(tiles.map((t) => t.dataset.lessonId)).toEqual(COURSE.lessonIds);
    expect(tiles[0].querySelector('.text-base')?.textContent).toBe(
      'Studio Basics: make your first song',
    );
    expect(tiles[2]).toHaveTextContent('Lesson 3');
    // Every lesson is in the course: no "More lessons" under it.
    expect(screen.queryByText('More lessons')).toBeNull();
  });

  it('starts at Studio Basics', () => {
    renderProduction();
    expect(courseSection()).toHaveTextContent(`0 of ${TOTAL} lessons done`);
    expect(courseAction()).toHaveTextContent('Start');
    fireEvent.click(courseAction());
    expect(location()).toBe(editorLink('studio-basics'));
  });

  it('continues at the first lesson not finished', () => {
    finish('studio-basics');
    renderProduction();
    expect(courseSection()).toHaveTextContent(`1 of ${TOTAL} lessons done`);
    expect(courseSection()).toHaveTextContent('Next: Hip Hop');
    expect(courseAction()).toHaveTextContent('Continue');
    expect(
      within(tile('studio-basics')).getByText('Completed'),
    ).toBeInTheDocument();
    fireEvent.click(courseAction());
    expect(location()).toBe(editorLink('hiphop-build-the-beat'));
  });

  it('is done when every lesson is, and starts again at Studio Basics', () => {
    finish(...COURSE.lessonIds);
    renderProduction();
    expect(courseSection()).toHaveTextContent(`All ${TOTAL} lessons done`);
    expect(courseAction()).toHaveTextContent('Start again');
    fireEvent.click(courseAction());
    expect(location()).toBe(editorLink('studio-basics'));
  });

  it('opens a free lesson from its tile for a free student', () => {
    renderProduction();
    fireEvent.click(tile('house-make-it-pump'));
    expect(location()).toBe(editorLink('house-make-it-pump'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
