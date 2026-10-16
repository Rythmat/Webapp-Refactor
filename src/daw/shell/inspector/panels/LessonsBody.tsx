import { ArrowRight, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/components/utilities';
import { StudioRoutes } from '@/constants/routes';
import { TUTORIAL_CATALOG } from '@/daw/components/Tutorial/tutorialCatalog';
import { useLessonAccess } from '@/daw/components/Tutorial/useLessonAccess';
import { openSession } from '@/daw/session/openSession';
import { useStore } from '@/daw/store';
import { Button } from '@/daw/ui/Button';
import { PremiumBadge } from '@/daw/ui/PremiumBadge';
import { FOCUS_RING, TRANSITION, TYPE_CLASS } from '@/daw/ui/styles';
import { useTutorialProgressStore } from '@/features/tutorials/useTutorialProgressStore';

// ── The Lessons panel (B4a) ────────────────────────────────────────────────
//
// The Production lessons, as the Studio's Production tab lists them, from
// inside the editor. A click opens the lesson through openSession, as the
// tab's `?tutorial=` link does: a new project with the lesson running, the
// work open now kept with a Restore, and a Premium lesson asks a free
// student to upgrade instead (owner decision 8; openSession shows the
// dialog). Not in a shared session, where it would replace the room's
// project. The lesson running now is marked.

export function LessonsBody() {
  const access = useLessonAccess();
  const completedAt = useTutorialProgressStore((s) => s.completedAt);
  const running = useStore((s) => s.activeTutorialId);
  const inRoom = useStore((s) => s.roomId !== null);
  const navigate = useNavigate();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className="min-h-0 flex-1 overflow-y-auto py-1"
        style={{ scrollbarWidth: 'thin' }}
      >
        {inRoom ? (
          <p className={cn(TYPE_CLASS.label, 'px-3 py-2 text-daw-text-3')}>
            Leave the shared session to start a lesson.
          </p>
        ) : null}
        <ul aria-label="Lessons">
          {TUTORIAL_CATALOG.map((lesson) => {
            const locked = access(lesson.id) === 'upgrade';
            const done = completedAt[lesson.id] != null;
            const now = running === lesson.id;
            return (
              <li key={lesson.id}>
                <button
                  type="button"
                  data-testid={`lesson-${lesson.id}`}
                  aria-current={now || undefined}
                  aria-disabled={inRoom || now || undefined}
                  onClick={() => {
                    if (inRoom || now) return;
                    void openSession(
                      { kind: 'tutorial', tutorialId: lesson.id },
                      { source: 'panel' },
                    );
                  }}
                  className={cn(
                    'flex w-full flex-col gap-1 border-b border-daw-hairline px-3 py-2.5 text-left',
                    now ? 'bg-daw-selected' : 'hover:bg-daw-hover',
                    inRoom ? 'cursor-default opacity-50' : null,
                    TRANSITION,
                    FOCUS_RING,
                  )}
                >
                  <span
                    className={cn(TYPE_CLASS.body, 'font-bold text-daw-text')}
                  >
                    {lesson.title}
                  </span>
                  <span className={cn(TYPE_CLASS.label, 'text-daw-text-2')}>
                    {lesson.subtitle}
                  </span>
                  <span
                    className={cn(
                      TYPE_CLASS.label,
                      'flex flex-wrap items-center gap-2 text-daw-text-3',
                    )}
                  >
                    {lesson.difficulty} · {lesson.estMinutes} min
                    {now ? (
                      <span className="text-daw-text">Running</span>
                    ) : null}
                    {done && !now ? (
                      <span className="inline-flex items-center gap-1">
                        <Check aria-hidden className="size-3.5" /> Done
                      </span>
                    ) : null}
                    {lesson.requiresPremium ? (
                      <PremiumBadge locked={locked} />
                    ) : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="shrink-0 border-t border-daw-hairline p-2">
        <Button
          className="w-full"
          onClick={() => navigate(StudioRoutes.production.definition)}
        >
          All lessons in the Studio
          <ArrowRight aria-hidden />
        </Button>
      </div>
    </div>
  );
}
