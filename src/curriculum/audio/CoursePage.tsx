import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, Check, ChevronRight } from 'lucide-react';
import { Fragment, useEffect, useMemo, useState } from 'react';
import {
  Navigate,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom';
import { WHITE_PILL_LG } from '@/components/kit/pills';
import { RequirePremium } from '@/components/ui/RequirePremium';
import { cn } from '@/components/utilities';
import { LearnRoutes } from '@/constants/routes';
import { useChooseAudio } from '@/features/learn/useInstrumentStore';
import { useTutorialProgressStore } from '@/features/tutorials/useTutorialProgressStore';
import { colorForKeyMode } from '@/lib/modeColorShift';
import {
  audioLessonRoute,
  audioModule,
  courseRows,
  type AudioModule,
  type CourseRow,
} from './catalog';
import { rowPercent } from './lab/audioProgress';
import { LessonDisc } from './player/LessonDisc';

// ── A course's page ────────────────────────────────────────────────────────
// Its lessons as a path of discs: a finished one is a coin, the next glows with
// its card under it, and Anatomy hangs off the lesson that uses it. Every stop
// stays open, so that a teacher can go straight to any of them. Coming back from
// a finish, that lesson's disc turns over as the path moves on.

const rowBlurb = (row: CourseRow) => {
  if (row.kind === 'guided') return row.lesson.blurb;
  if (row.kind === 'lab') {
    return row.topics.map((topic) => topic.title).join(', ');
  }
  return '';
};

function rowRoute(module: AudioModule, row: CourseRow) {
  return audioLessonRoute(module, row.lesson);
}

function Path({ module }: { module: AudioModule }) {
  const navigate = useNavigate();
  const location = useLocation();
  const reduced = useReducedMotion() ?? false;
  const accent = colorForKeyMode(module.accentKey);
  const rows = useMemo(() => courseRows(module), [module]);
  const completedAt = useTutorialProgressStore((s) => s.completedAt);
  const percents = rows.map((row) => rowPercent(completedAt, module, row));

  // A lesson just finished: it reads as it was for a moment, then turns over.
  const justFinished = (location.state as { justFinished?: string } | null)
    ?.justFinished;
  const [settling, setSettling] = useState(
    reduced ? null : (justFinished ?? null),
  );
  useEffect(() => {
    if (!justFinished) return undefined;
    navigate(location.pathname, { replace: true, state: null });
    const timer = setTimeout(() => setSettling(null), 650);
    return () => clearTimeout(timer);
    // Once, on arriving.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isDone = (row: CourseRow, i: number) =>
    percents[i] >= 100 && row.lesson.id !== settling;
  const countsToward = (row: CourseRow) =>
    row.kind === 'guided' || row.kind === 'lab';
  const nextIndex = rows.findIndex(
    (row, i) => countsToward(row) && !isDone(row, i),
  );

  return (
    <div
      className="h-full overflow-y-auto bg-[#101012] px-4 pb-16 pt-4 md:px-8"
      data-course-page={module.id}
    >
      <div className="mx-auto flex w-full max-w-xl flex-col">
        <button
          type="button"
          onClick={() => navigate(LearnRoutes.audio())}
          className="flex w-fit items-center gap-2 rounded-full py-1.5 pr-3 text-[0.9375rem] text-white/70 outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-white/50"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Audio
        </button>
        <h1 className="mt-4 text-[1.75rem] font-bold leading-tight text-white">
          {module.title}
        </h1>
        <p className="mt-1 text-[0.9375rem] text-white/60">
          {module.access === 'free' ? 'Free. ' : ''}
          {rows.filter(countsToward).length} lessons
        </p>

        <ol className="mt-10 flex flex-col items-center">
          {rows.map((row, i) => {
            const done = isDone(row, i);
            const next = i === nextIndex;
            const started = percents[i] > 0 && !done;
            const open = () => navigate(rowRoute(module, row));
            return (
              <Fragment key={row.lesson.id}>
                {i > 0 && (
                  <li
                    aria-hidden
                    className="h-8 w-px"
                    style={{
                      backgroundColor: isDone(rows[i - 1], i - 1)
                        ? accent
                        : 'rgb(255 255 255 / 0.15)',
                    }}
                  />
                )}
                <li
                  className="relative flex w-full flex-col items-center"
                  data-course-row={row.lesson.id}
                  data-row-state={done ? 'done' : next ? 'next' : 'todo'}
                >
                  <button
                    type="button"
                    onClick={open}
                    aria-label={`${row.lesson.title}${done ? ', finished' : next ? ', next' : ''}`}
                    className="flex flex-col items-center gap-2 rounded-2xl p-1 outline-none transition-transform hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-white/60 motion-reduce:hover:scale-100"
                  >
                    <motion.span
                      key={done ? 'done' : 'not'}
                      initial={
                        done && row.lesson.id === justFinished && !reduced
                          ? { rotateX: -80, scale: 1.12 }
                          : false
                      }
                      animate={{ rotateX: 0, scale: 1 }}
                      transition={{
                        type: 'spring',
                        stiffness: 220,
                        damping: 12,
                      }}
                      style={
                        next
                          ? { filter: `drop-shadow(0 0 1rem ${accent}88)` }
                          : undefined
                      }
                    >
                      <LessonDisc
                        ratio={row.lesson.ratio}
                        accent={accent}
                        state={done ? 'done' : next ? 'next' : 'todo'}
                      />
                    </motion.span>
                    {!next && (
                      <span
                        className={cn(
                          'text-[0.9375rem] font-bold',
                          done ? 'text-white' : 'text-white/70',
                        )}
                      >
                        {row.lesson.title}
                        {started && (
                          <span className="ml-2 font-normal text-white/50">
                            {percents[i]}%
                          </span>
                        )}
                      </span>
                    )}
                  </button>

                  {row.kind === 'guided' && row.side && (
                    <div className="absolute left-[calc(50%+3.75rem)] top-3 flex items-center max-sm:left-[calc(50%+3.25rem)]">
                      <span
                        aria-hidden
                        className="h-px w-6 border-t border-dashed border-white/25 max-sm:w-3"
                      />
                      <button
                        type="button"
                        onClick={() => row.side && navigate(row.side.route)}
                        className="flex items-center gap-1 rounded-full border border-white/15 px-3 py-1.5 text-left text-[0.8125rem] text-white/85 outline-none transition-colors hover:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-white/60"
                      >
                        {row.side.title}
                        <ChevronRight
                          className="size-3.5 shrink-0"
                          aria-hidden
                        />
                      </button>
                    </div>
                  )}

                  {next && (
                    <motion.div
                      initial={reduced ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        delay: justFinished ? 0.7 : 0,
                        duration: 0.3,
                      }}
                      className="mt-2 flex w-full flex-col items-center gap-3 rounded-2xl border p-5 text-center"
                      style={{
                        borderColor: `${accent}77`,
                        boxShadow: `0 0 2.5rem -1rem ${accent}`,
                      }}
                      data-start-card
                    >
                      <h2 className="text-lg font-bold text-white">
                        {row.lesson.title}
                      </h2>
                      {rowBlurb(row) && (
                        <p className="text-[0.9375rem] leading-6 text-white/70">
                          {rowBlurb(row)}
                        </p>
                      )}
                      <button
                        type="button"
                        className={WHITE_PILL_LG}
                        onClick={open}
                      >
                        {percents[i] > 0 ? 'Continue' : 'Start'}
                      </button>
                    </motion.div>
                  )}
                </li>
              </Fragment>
            );
          })}
        </ol>
        {nextIndex < 0 && (
          <p
            className="mt-8 flex items-center justify-center gap-2 text-[0.9375rem] text-white/70"
            data-course-done
          >
            <Check className="size-4" style={{ color: accent }} aria-hidden />
            Every lesson here is finished.
          </p>
        )}
      </div>
    </div>
  );
}

/** /learn/audio/:module. Anything but a course goes back to the section. */
export function CoursePage() {
  useChooseAudio();
  const params = useParams<{ module: string }>();
  const module = audioModule(params.module);
  if (!module?.shelf) return <Navigate replace to={LearnRoutes.audio()} />;
  const path = <Path module={module} />;
  return module.access === 'free' ? (
    path
  ) : (
    <RequirePremium>{path}</RequirePremium>
  );
}
