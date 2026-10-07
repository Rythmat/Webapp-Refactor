import { ArrowRight, Check, GraduationCap } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StudioRoutes } from '@/constants/routes';
import { UpgradeLessonDialog } from '@/daw/components/Tutorial/UpgradeLessonDialog';
import { TUTORIAL_CATALOG } from '@/daw/components/Tutorial/tutorialCatalog';
import { useLessonAccess } from '@/daw/components/Tutorial/useLessonAccess';
import { PremiumBadge } from '@/daw/ui/PremiumBadge';
import { useTutorialProgressStore } from '@/features/tutorials/useTutorialProgressStore';

/**
 * Production tab (`/studio/production`) — the step-by-step DAW lessons, from
 * their catalog (`tutorialCatalog.ts`: the tile copy without the steps, which
 * stay in the editor's chunk). A tile opens the editor on a fresh session
 * with that lesson running (`/studio/editor?tutorial=<id>`); finished lessons
 * (tracked locally by `useTutorialProgressStore`) show as Completed and offer
 * a replay.
 *
 * The lessons with steps in Prism carry the Premium badge, and for a free
 * student their tile opens the upgrade prompt instead (owner decision 8).
 * While the student's plan loads, a tile opens the editor as before: its
 * boot waits for the plan and turns a free student away itself, so a
 * premium student is never stopped here. Both apply useLessonAccess.
 */
export const StudioProduction = () => {
  const navigate = useNavigate();
  const completedAt = useTutorialProgressStore((s) => s.completedAt);
  const accessOf = useLessonAccess();
  const [upgradeFor, setUpgradeFor] = useState<string | null>(null);

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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-5 xl:grid-cols-4">
        {TUTORIAL_CATALOG.map((t) => {
          const done = completedAt[t.id] != null;
          const locked = accessOf(t.id) === 'upgrade';
          return (
            <button
              key={t.id}
              type="button"
              data-lesson-id={t.id}
              aria-haspopup={locked ? 'dialog' : undefined}
              onClick={() =>
                locked
                  ? setUpgradeFor(t.id)
                  : navigate(
                      `${StudioRoutes.editor.definition}?tutorial=${encodeURIComponent(t.id)}`,
                    )
              }
              className="group flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left transition-colors hover:border-white/25 hover:bg-white/[0.07]"
            >
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="uppercase tracking-wider text-white/55">
                  {t.difficulty} · {t.estMinutes} min
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
                <div className="text-base font-medium text-white">
                  {t.title}
                </div>
                <div className="mt-1 text-sm text-white/55">{t.subtitle}</div>
              </div>
              <div className="mt-auto flex items-center gap-1.5 text-sm font-medium text-white/75 transition-colors group-hover:text-white">
                {done ? 'Replay lesson' : 'Start lesson'}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </div>
            </button>
          );
        })}
      </div>

      <UpgradeLessonDialog
        lessonId={upgradeFor}
        onClose={() => setUpgradeFor(null)}
      />
    </section>
  );
};
