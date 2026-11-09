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
  TUTORIAL_CATALOG,
  TUTORIAL_COURSES,
} from '@/daw/components/Tutorial/tutorialCatalog';
import { useTutorialProgressStore } from '@/features/tutorials/useTutorialProgressStore';
import { StudioProduction } from '../StudioProduction';

/**
 * The Production tab's Premium lessons (owner decision 8, audit ia-flows-14):
 * the four Prism lessons wear a Premium chip, and for a free student their
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

const PREMIUM_LESSONS = [
  'make-first-track',
  'jazz-color-your-chords',
  'edm-design-the-drop',
  'rnb-mix-and-polish',
];
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
  it('lists every lesson, with a 12 px Premium chip on the four Prism ones', () => {
    renderProduction();
    for (const lesson of TUTORIAL_CATALOG) {
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
    const lessonTile = tile('make-first-track');
    expect(lessonTile).toHaveAttribute('aria-haspopup', 'dialog');
    fireEvent.click(lessonTile);

    const dialog = await screen.findByRole('dialog', { name: UPGRADE_TITLE });
    expect(dialog).toHaveTextContent(
      '“Make your first track” has steps in Prism',
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
    fireEvent.click(tile('edm-design-the-drop'));
    await screen.findByRole('dialog', { name: UPGRADE_TITLE });
    expect(telemetry.trackPaywallViewed).toHaveBeenCalledTimes(2);
  });

  it('takes a free student to the plans from the prompt', async () => {
    renderProduction();
    fireEvent.click(tile('rnb-mix-and-polish'));
    const dialog = await screen.findByRole('dialog', { name: UPGRADE_TITLE });
    fireEvent.click(within(dialog).getByRole('button', { name: 'See plans' }));
    expect(location()).toBe(ProfileRoutes.plan.definition);
  });

  it('never treats a student as free while the subscription loads', () => {
    premium.state = { isPremium: false, isLoading: true };
    renderProduction();
    expect(tile('jazz-color-your-chords')).not.toHaveAttribute('aria-haspopup');
    fireEvent.click(tile('jazz-color-your-chords'));
    // The editor's boot waits for the subscription and decides there.
    expect(location()).toBe(editorLink('jazz-color-your-chords'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens every lesson for a premium student, Premium chip and all', () => {
    premium.state = { isPremium: true, isLoading: false };
    renderProduction();
    for (const id of PREMIUM_LESSONS) {
      expect(within(tile(id)).getByText('Premium')).toBeInTheDocument();
    }
    fireEvent.click(tile('make-first-track'));
    expect(location()).toBe(editorLink('make-first-track'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('still marks a finished Premium lesson as Completed', () => {
    premium.state = { isPremium: true, isLoading: false };
    act(() =>
      useTutorialProgressStore.getState().markComplete('make-first-track'),
    );
    renderProduction();
    const lessonTile = tile('make-first-track');
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

// ── The Studio Basics course, first on the tab ─────────────────────────────
// Stop 4 of Start Here: its nine free lessons in order, how far the student
// is, and Start or Continue, which opens the first lesson not finished.

const COURSE = TUTORIAL_COURSES[0];
const courseSection = () =>
  document.querySelector<HTMLElement>('[data-course="studio-basics"]')!;
const courseAction = () =>
  courseSection().querySelector<HTMLButtonElement>('[data-course-action]')!;
const finish = (...ids: string[]) =>
  act(() => {
    for (const id of ids) useTutorialProgressStore.getState().markComplete(id);
  });

describe('the Studio Basics course on the Production tab', () => {
  it('comes first, its nine lessons in order, then the other lessons', () => {
    renderProduction();
    const section = courseSection();
    expect(within(section).getByText('Studio Basics')).toBeInTheDocument();
    const tiles = Array.from(
      section.querySelectorAll<HTMLElement>('[data-lesson-id]'),
    );
    expect(tiles.map((t) => t.dataset.lessonId)).toEqual(COURSE.lessonIds);
    expect(
      tiles.map((t) => t.querySelector('.text-base')?.textContent),
    ).toEqual([
      'Your Tracks',
      'Add a Track',
      'Record',
      'The Piano Roll',
      'Insight',
      'The Score',
      'The Lead Sheet',
      'Loop and Repeat',
      'Save and Export',
    ]);
    expect(tiles[2]).toHaveTextContent('Lesson 3');
    // Free: no Premium chip, no upgrade prompt for a free student.
    for (const tile of tiles)
      expect(within(tile).queryByText('Premium')).toBeNull();
    // It sits above every other lesson.
    const first = document.querySelector('[data-lesson-id]');
    expect(first?.getAttribute('data-lesson-id')).toBe(COURSE.lessonIds[0]);
    expect(
      section.compareDocumentPosition(tile('make-first-track')) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('starts at lesson 1 on the demo song’s link', () => {
    renderProduction();
    expect(courseSection()).toHaveTextContent('0 of 9 lessons done');
    expect(courseAction()).toHaveTextContent('Start');
    fireEvent.click(courseAction());
    expect(location()).toBe(editorLink('studio-basics-your-tracks'));
  });

  it('continues at the first lesson not finished', () => {
    finish('studio-basics-your-tracks', 'studio-basics-add-a-track');
    renderProduction();
    expect(courseSection()).toHaveTextContent('2 of 9 lessons done');
    expect(courseSection()).toHaveTextContent('Next: Record');
    expect(courseAction()).toHaveTextContent('Continue');
    expect(
      within(tile('studio-basics-add-a-track')).getByText('Completed'),
    ).toBeInTheDocument();
    fireEvent.click(courseAction());
    expect(location()).toBe(editorLink('studio-basics-record'));
  });

  it('is done when every lesson is, and starts again at lesson 1', () => {
    finish(...COURSE.lessonIds);
    renderProduction();
    expect(courseSection()).toHaveTextContent('All 9 lessons done');
    expect(courseAction()).toHaveTextContent('Start again');
    fireEvent.click(courseAction());
    expect(location()).toBe(editorLink('studio-basics-your-tracks'));
  });

  it('opens any of its lessons from its tile, for a free student too', () => {
    renderProduction();
    fireEvent.click(tile('studio-basics-score'));
    expect(location()).toBe(editorLink('studio-basics-score'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
