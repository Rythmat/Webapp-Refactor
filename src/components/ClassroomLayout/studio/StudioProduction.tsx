import {
  ArrowRight,
  Check,
  GraduationCap,
  Play,
  RotateCcw,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StudioRoutes } from '@/constants/routes';
import { UpgradeLessonDialog } from '@/daw/components/Tutorial/UpgradeLessonDialog';
import {
  courseLessons,
  courseProgress,
  TUTORIAL_CATALOG,
  TUTORIAL_COURSES,
  type CompletedLessons,
  type TutorialCatalogEntry,
  type TutorialCourse,
} from '@/daw/components/Tutorial/tutorialCatalog';
import { useLessonAccess } from '@/daw/components/Tutorial/useLessonAccess';
import { PremiumBadge } from '@/daw/ui/PremiumBadge';
import { useTutorialProgressStore } from '@/features/tutorials/useTutorialProgressStore';

/**
 * Production tab (`/studio/production`) — the step-by-step DAW lessons, from
 * their catalog (`tutorialCatalog.ts`: the tile copy without the steps, which
 * stay in the editor's chunk). A tile opens the editor on a fresh session
 * with that lesson running (`/studio?tutorial=<id>`); finished lessons
 * (tracked locally by `useTutorialProgressStore`) show as Completed and offer
 * a replay.
 *
 * The courses come first (Studio Basics, stop 4 of Start Here): the lessons
 * in their order, how far the student is, and Start or Continue, which opens
 * the first lesson not finished yet. Their lessons are free and open on the
 * course's demo song. The other lessons follow.
 *
 * The lessons with steps in Prism carry the Premium badge, and for a free
 * student their tile opens the upgrade prompt instead (owner decision 8).
 * While the student's plan loads, a tile opens the editor as before: its
 * boot waits for the plan and turns a free student away itself, so a
 * premium student is never stopped here. Both apply useLessonAccess.
 */

const editorLink = (id: string) =>
  `${StudioRoutes.editor.definition}?tutorial=${encodeURIComponent(id)}`;

export const StudioProduction = () => {
  const navigate = useNavigate();
  const completedAt = useTutorialProgressStore((s) => s.completedAt);
  const accessOf = useLessonAccess();
  const [upgradeFor, setUpgradeFor] = useState<string | null>(null);
  const open = (id: string) =>
    accessOf(id) === 'upgrade' ? setUpgradeFor(id) : navigate(editorLink(id));
  const others = TUTORIAL_CATALOG.filter((t) => !('course' in t));

  return (
    <section
      aria-label="Production Lessons"
      className="flex flex-col gap-4 md:gap-5"
    >
      <div className="flex items-center gap-2 md:gap-3">
        <GraduationCap className="h-7 w-7 text-white/85 md:h-8 md:w-8" />
        <h2 className="text-xl font-medium text-white md:text-2xl">
          Production Lessons
        </h2>
      </div>

      {TUTORIAL_COURSES.map((course) => (
        <CourseSection
          key={course.id}
          course={course}
          completedAt={completedAt}
          onOpen={open}
        />
      ))}

      <h3 className="mt-2 text-base font-medium text-white/85 md:text-lg">
        More lessons
      </h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-5 xl:grid-cols-4">
        {others.map((t) => (
          <LessonTile
            key={t.id}
            lesson={t}
            done={completedAt[t.id] != null}
            locked={accessOf(t.id) === 'upgrade'}
            onOpen={() => open(t.id)}
          />
        ))}
      </div>

      <UpgradeLessonDialog
        lessonId={upgradeFor}
        onClose={() => setUpgradeFor(null)}
      />
    </section>
  );
};

/**
 * A course: what it is, how far the student is, the way in (Start, Continue
 * at the first lesson not finished, or Start again once all are), and its
 * lessons in order.
 */
function CourseSection({
  course,
  completedAt,
  onOpen,
}: {
  course: TutorialCourse;
  completedAt: CompletedLessons;
  onOpen: (id: string) => void;
}) {
  const lessons = courseLessons(course);
  const progress = courseProgress(course, completedAt);
  const action = progress.complete
    ? 'Start again'
    : progress.done > 0
      ? 'Continue'
      : 'Start';
  const share = progress.total ? progress.done / progress.total : 0;

  return (
    <section
      aria-label={course.title}
      data-course={course.id}
      className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:gap-5 md:p-5"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="text-xs uppercase tracking-wider text-white/55">
            Course · {progress.total} lessons · Free
          </div>
          <h3 className="text-lg font-medium leading-tight text-white md:text-xl">
            {course.title}
          </h3>
          <p className="text-sm text-white/60">{course.description}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span
              role="img"
              aria-label={`${progress.done} of ${progress.total} lessons done`}
              className="h-1.5 w-32 overflow-hidden rounded-full bg-white/10 md:w-40"
            >
              <span
                className="block h-full rounded-full bg-white"
                style={{ width: `${share * 100}%` }}
              />
            </span>
            <span data-course-progress className="text-sm text-white/60">
              {progress.complete
                ? `All ${progress.total} lessons done`
                : `${progress.done} of ${progress.total} lessons done`}
              {progress.done > 0 && !progress.complete && (
                <span className="text-white/45">
                  {' · '}Next: {progress.next.title}
                </span>
              )}
            </span>
          </div>
        </div>
        <button
          type="button"
          data-course-action={course.id}
          aria-label={`${action} ${course.title}: ${progress.next.title}`}
          onClick={() => onOpen(progress.next.id)}
          className="flex shrink-0 items-center justify-center gap-2 self-start rounded-full bg-white px-5 py-2.5 font-semibold text-black transition-transform hover:scale-105 sm:self-center"
        >
          {progress.complete ? (
            <RotateCcw className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" fill="currentColor" />
          )}
          {action}
        </button>
      </div>

      <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4 xl:grid-cols-3">
        {lessons.map((t, i) => (
          <li key={t.id} className="flex">
            <LessonTile
              lesson={t}
              number={i + 1}
              done={completedAt[t.id] != null}
              locked={false}
              onOpen={() => onOpen(t.id)}
            />
          </li>
        ))}
      </ol>
    </section>
  );
}

function LessonTile({
  lesson: t,
  number,
  done,
  locked,
  onOpen,
}: {
  lesson: TutorialCatalogEntry;
  /** Its place in its course, from 1. */
  number?: number;
  done: boolean;
  locked: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      data-lesson-id={t.id}
      aria-haspopup={locked ? 'dialog' : undefined}
      onClick={onOpen}
      className="group flex w-full flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left transition-colors hover:border-white/25 hover:bg-white/[0.07]"
    >
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="uppercase tracking-wider text-white/55">
          {number !== undefined ? `Lesson ${number}` : t.difficulty} ·{' '}
          {t.estMinutes} min
        </span>
        <span className="flex items-center gap-2">
          {t.requiresPremium && <PremiumBadge locked={locked} />}
          {done && (
            <span className="flex items-center gap-1 text-emerald-400">
              <Check className="size-3.5" />
              Completed
            </span>
          )}
        </span>
      </div>
      <div className="min-w-0">
        <div className="text-base font-medium text-white">{t.title}</div>
        <div className="mt-1 text-sm text-white/55">{t.subtitle}</div>
      </div>
      <div className="mt-auto flex items-center gap-1.5 text-sm font-medium text-white/75 transition-colors group-hover:text-white">
        {done ? 'Replay lesson' : 'Start lesson'}
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
      </div>
    </button>
  );
}
