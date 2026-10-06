import { ArrowRight, Check, GraduationCap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StudioRoutes } from '@/constants/routes';
import { TUTORIALS } from '@/daw/components/Tutorial/tutorials';
import { useTutorialProgressStore } from '@/features/tutorials/useTutorialProgressStore';

/**
 * Production tab (`/studio/production`) — the step-by-step DAW lessons from
 * `TUTORIALS`. A tile opens the editor on a fresh session with that lesson
 * running (`/studio/editor?tutorial=<id>`); finished lessons (tracked locally
 * by `useTutorialProgressStore`) show as Completed and offer a replay.
 */
export const StudioProduction = () => {
  const navigate = useNavigate();
  const completedAt = useTutorialProgressStore((s) => s.completedAt);

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
        {TUTORIALS.map((t) => {
          const done = completedAt[t.id] != null;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() =>
                navigate(
                  `${StudioRoutes.editor.definition}?tutorial=${encodeURIComponent(t.id)}`,
                )
              }
              className="group flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left transition-colors hover:border-white/25 hover:bg-white/[0.07]"
            >
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="uppercase tracking-wider text-white/55">
                  {t.difficulty} · {t.estMinutes} min
                </span>
                {done && (
                  <span className="flex items-center gap-1 text-emerald-400">
                    <Check className="size-3.5" />
                    Completed
                  </span>
                )}
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
    </section>
  );
};
