import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, Check, Info, Lock } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  CAPTION,
  ROW_TITLE,
  ICON_BUTTON,
  LIST_ROW,
  LIST_STRIPE,
  PAGE_TITLE,
  PANEL,
  TAB,
  TAB_ACTIVE,
} from '@/components/kit/libraryLook';
import { OUTLINE_PILL, WHITE_PILL } from '@/components/kit/pills';
import { lissajousPath } from '@/components/learn/sigil/sigilSpec';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/components/utilities';
import { ProfileRoutes } from '@/constants/routes';
import { FOCUS_RING } from '@/daw/ui/styles';
import {
  coursePercent,
  primaryLabel,
} from '@/features/learn/paths/courseProgress';
import { WheelStar } from '../sigil/WheelStar';
import { LessonThumb } from './LessonThumb';
import type { PathCourse, PathLevel, PathRow } from './types';

// ── A path page ────────────────────────────────────────────────────────────
// A sub category as a list, in Samply's library look (owner, 2026-11-10, in
// place of the discs on a sine wave): its title and description across the
// top, then its lessons as rows under each level, every other one a shade
// lighter. Pressing a row selects it (it lights, and the panel beside the
// list takes its name), and pressing it again opens it, so that nobody lands
// in a lesson by accident and a teacher can go straight to any stop. On a
// phone the panel sits at the foot of the screen.

/** A level's heading: its name, and what it teaches behind the (i). */
function LevelHeader({
  level,
  dim,
  onOpen,
}: {
  level: PathLevel;
  dim: boolean;
  onOpen: () => void;
}) {
  return (
    <div
      className="flex items-end justify-between gap-4 px-3 pb-2"
      data-path-level={level.id}
      data-level-dim={dim}
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className={cn(CAPTION, 'font-medium')}>{level.kicker}</span>
        <h2
          className={cn(
            'truncate text-[1.125rem] font-semibold leading-6',
            dim ? 'text-white/50' : 'text-white',
          )}
        >
          {level.title}
        </h2>
      </div>
      <button
        type="button"
        onClick={onOpen}
        aria-label={`${level.kicker}: what it teaches`}
        className={cn(ICON_BUTTON, 'size-8')}
      >
        <Info aria-hidden className="size-4" />
      </button>
    </div>
  );
}

export function PathPage({ course }: { course: PathCourse }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const reduced = useReducedMotion() ?? false;
  const { rows, levels } = course;

  // A lesson just finished: it reads as it was for a moment, then turns over.
  const justFinished = (location.state as { justFinished?: string } | null)
    ?.justFinished;
  const [settling, setSettling] = useState(
    reduced ? null : (justFinished ?? null),
  );
  useEffect(() => {
    if (!justFinished) return undefined;
    navigate(`${location.pathname}${location.search}`, {
      replace: true,
      state: null,
    });
    const timer = setTimeout(() => setSettling(null), 650);
    return () => clearTimeout(timer);
    // Once, on arriving.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isDone = useCallback(
    (row: PathRow) => row.tracked && row.percent >= 100 && row.id !== settling,
    [settling],
  );
  const nextIndex = rows.findIndex((row) => row.tracked && !isDone(row));
  const nextRow = nextIndex >= 0 ? rows[nextIndex] : null;

  const asked = params.get('select');
  const [chosen, setChosen] = useState<string | null>(
    rows.some((row) => row.id === asked) ? asked : null,
  );
  const selected =
    rows.find((row) => row.id === chosen) ?? nextRow ?? rows[0] ?? null;

  const [optionIndex, setOptionIndex] = useState(0);
  useEffect(() => setOptionIndex(0), [selected?.id]);
  const option = selected?.options?.[optionIndex];
  // The key in hand: the page takes its colour, as the key wheel's page does.
  const figure = option?.figure ?? selected?.figure;
  const accent = figure?.accent ?? course.accent;

  const [openLevel, setOpenLevel] = useState<PathLevel | null>(null);

  const open = useCallback(
    (row: PathRow, route = row.route) => {
      if (row.soon) return;
      navigate(row.locked ? ProfileRoutes.plan() : route);
    },
    [navigate],
  );

  const press = (row: PathRow) => {
    if (selected?.id === row.id) open(row, option?.route ?? row.route);
    else setChosen(row.id);
  };

  // Up and Down walk the list.
  const rowRefs = useRef(new Map<string, HTMLButtonElement>());
  const walk = (event: KeyboardEvent, index: number) => {
    const step =
      event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0;
    const target = step ? rows[index + step] : undefined;
    if (!target) return;
    event.preventDefault();
    setChosen(target.id);
    rowRefs.current.get(target.id)?.focus();
  };

  // Arriving on a stop further down, it's brought into view.
  const arrivedOn = useRef(selected?.id);
  useEffect(() => {
    const id = arrivedOn.current;
    if (id && id !== rows[0]?.id) {
      rowRefs.current.get(id)?.scrollIntoView?.({ block: 'center' });
    }
    // Once, on arriving.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const progress = coursePercent(course);

  // How far the student has reached: the levels beyond it wait, dimmed.
  const reachedLevel = nextRow
    ? levels.findIndex((level) => level.id === nextRow.levelId)
    : levels.length - 1;

  let rowCursor = 0;

  return (
    <div
      className="h-full overflow-y-auto bg-[#101012] px-4 pb-6 pt-6 md:px-8"
      data-path-page={course.id}
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        {/* The sub category: what it is, and how far through it. */}
        <header className="flex flex-col gap-4" data-path-card>
          <button
            type="button"
            onClick={() => navigate(course.back.to)}
            className={cn(
              CAPTION,
              'flex w-fit items-center gap-1.5 rounded-full font-medium hover:text-white',
              FOCUS_RING,
            )}
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            {course.back.label}
          </button>
          <div className="flex items-center gap-4 sm:gap-5">
            <svg
              aria-hidden
              viewBox="-44 -44 88 88"
              className="size-16 shrink-0 rounded-xl bg-[#1b1b1f] ring-1 ring-inset ring-white/[0.08] sm:size-20"
              data-path-figure
            >
              <motion.path
                d={lissajousPath(course.ratio, 0, 30)}
                fill="none"
                stroke={accent}
                strokeWidth={1.5}
                initial={reduced ? false : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: 0.1, duration: 1.1, ease: 'easeInOut' }}
              />
            </svg>
            <div className="flex min-w-0 flex-col gap-1">
              <h1 className={cn(PAGE_TITLE, 'max-sm:text-[1.75rem]')}>
                {course.title}
              </h1>
              <p className="flex flex-wrap gap-x-3 gap-y-0.5 text-[0.75rem] leading-4 text-white/50">
                {course.stats.map((stat) => (
                  <span key={stat}>{stat}</span>
                ))}
                {progress > 0 && <span>{progress}% done</span>}
              </p>
            </div>
          </div>
          <p className="max-w-[40rem] text-[0.875rem] leading-5 text-white/50">
            {course.description}
          </p>
          {progress > 0 && (
            <div
              role="progressbar"
              aria-label="Progress through this path"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
              className="h-1 max-w-[40rem] overflow-hidden rounded-full bg-white/[0.08]"
            >
              <motion.span
                className="block h-full rounded-full"
                style={{ backgroundColor: accent }}
                initial={reduced ? false : { width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ delay: 0.3, duration: 0.7, ease: 'easeOut' }}
              />
            </div>
          )}
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-8">
          <div className="flex min-w-0 flex-col gap-8">
            {levels.map((level, levelIndex) => {
              const inLevel = rows.filter((row) => row.levelId === level.id);
              const firstRow = rowCursor;
              rowCursor += inLevel.length;
              return (
                <section key={level.id} className="flex flex-col">
                  <LevelHeader
                    level={level}
                    dim={levelIndex > reachedLevel}
                    onOpen={() => setOpenLevel(level)}
                  />
                  <ol className="flex flex-col">
                    {inLevel.map((row, i) => {
                      const index = firstRow + i;
                      const finished = isDone(row);
                      const isNext = row.id === nextRow?.id;
                      const isSelected = row.id === selected?.id;
                      const rowFigure = isSelected ? figure : row.figure;
                      const rowAccent = rowFigure?.accent ?? course.accent;
                      const line = row.soon
                        ? 'Coming soon'
                        : isNext
                          ? 'Up next'
                          : (row.blurb ?? (row.locked ? 'Locked' : ''));
                      return (
                        <li
                          key={row.id}
                          className={LIST_STRIPE}
                          data-course-row={row.id}
                          data-row-state={
                            finished ? 'done' : isNext ? 'next' : 'todo'
                          }
                          data-row-selected={isSelected}
                        >
                          <button
                            type="button"
                            ref={(el) => {
                              if (el) rowRefs.current.set(row.id, el);
                              else rowRefs.current.delete(row.id);
                            }}
                            aria-label={`${row.title}${
                              finished ? ', finished' : isNext ? ', next' : ''
                            }${row.locked ? ', locked' : ''}${
                              row.soon ? ', coming soon' : ''
                            }`}
                            aria-pressed={isSelected}
                            onClick={() => press(row)}
                            onKeyDown={(event) => walk(event, index)}
                            className={cn(
                              LIST_ROW,
                              isSelected &&
                                'bg-white/[0.08] hover:bg-white/[0.08]',
                            )}
                            style={
                              isSelected
                                ? { boxShadow: `inset 0 0 0 1px ${rowAccent}` }
                                : undefined
                            }
                          >
                            <motion.span
                              key={finished ? 'done' : 'not'}
                              className="block shrink-0"
                              initial={
                                finished && row.id === justFinished && !reduced
                                  ? { scale: 1.25 }
                                  : false
                              }
                              animate={{ scale: 1 }}
                              transition={{
                                type: 'spring',
                                stiffness: 320,
                                damping: 14,
                              }}
                            >
                              <LessonThumb
                                ratio={row.ratio}
                                figure={rowFigure}
                                accent={rowAccent}
                                lit={finished || isNext || isSelected}
                                done={finished}
                                locked={row.locked}
                                className="size-11"
                              />
                            </motion.span>
                            <span className="flex min-w-0 flex-1 flex-col">
                              <span
                                className={cn(
                                  ROW_TITLE,
                                  row.soon && 'text-white/50',
                                )}
                              >
                                {row.title}
                              </span>
                              {line && (
                                <span
                                  className={cn(
                                    CAPTION,
                                    'flex items-center gap-1.5 truncate',
                                  )}
                                >
                                  {isNext && (
                                    <span
                                      aria-hidden
                                      className="size-1.5 shrink-0 rounded-full"
                                      style={{ backgroundColor: rowAccent }}
                                    />
                                  )}
                                  <span className="truncate">{line}</span>
                                </span>
                              )}
                            </span>
                            <span
                              className={cn(
                                CAPTION,
                                'flex shrink-0 items-center gap-1',
                              )}
                            >
                              {finished ? (
                                <>
                                  <Check aria-hidden className="size-3.5" />
                                  Done
                                </>
                              ) : row.locked ? (
                                <Lock aria-hidden className="size-3.5" />
                              ) : row.percent > 0 && row.tracked ? (
                                `${row.percent}%`
                              ) : null}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                </section>
              );
            })}

            {course.upNext && (
              <div
                className={cn(PANEL, 'flex flex-col gap-1 p-4')}
                data-up-next
              >
                <p className={cn(CAPTION, 'font-medium')}>Up next</p>
                <h2 className="text-[1rem] font-semibold leading-6 text-white">
                  {course.upNext.title}
                </h2>
                <p className="text-[0.875rem] leading-5 text-white/50">
                  {course.upNext.blurb}
                </p>
                <button
                  type="button"
                  className={cn(OUTLINE_PILL, 'mt-2 w-fit')}
                  onClick={() => {
                    if (course.upNext) navigate(course.upNext.to);
                  }}
                >
                  Jump ahead
                </button>
              </div>
            )}
          </div>

          {/* The selection: beside the list, or at the foot on a phone. */}
          {selected && (
            <aside
              className="sticky bottom-0 z-30 pb-1 lg:bottom-auto lg:top-4 lg:self-start lg:pb-0"
              data-start-card
            >
              <div
                className={cn(
                  PANEL,
                  'flex flex-col gap-3 p-4 max-lg:bg-[#1b1b1f] max-lg:shadow-xl',
                )}
              >
                <div className="flex items-center gap-4 max-lg:hidden">
                  {figure ? (
                    <div className="size-24 shrink-0" data-path-star>
                      <WheelStar
                        pcs={figure.pcs}
                        tonic={figure.tonic}
                        stars={figure.stars}
                        marked={figure.marked}
                        order="fifths"
                        anchor={figure.tonic}
                        accent={figure.accent}
                        label={figure.label}
                      />
                    </div>
                  ) : (
                    <LessonThumb
                      ratio={selected.ratio}
                      accent={accent}
                      lit
                      done={isDone(selected)}
                      locked={selected.locked}
                      className="size-24 rounded-xl"
                    />
                  )}
                  {figure && (
                    <div className="flex min-w-0 flex-col gap-1">
                      <span
                        className="text-[1.125rem] font-semibold leading-6"
                        style={{ color: figure.accent }}
                        data-path-key
                      >
                        {figure.label}
                      </span>
                      {figure.notes && (
                        <span className={CAPTION} data-path-notes>
                          {figure.notes.join(' ')}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={selected.id}
                    initial={reduced ? false : { opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduced ? undefined : { opacity: 0, y: -4 }}
                    transition={{ duration: 0.14 }}
                    className="flex flex-col gap-1"
                  >
                    <h2 className="text-[1.125rem] font-semibold leading-6 text-white">
                      {selected.title}
                    </h2>
                    {selected.blurb && (
                      <p className="text-[0.875rem] leading-5 text-white/50 max-lg:hidden">
                        {selected.blurb}
                      </p>
                    )}
                  </motion.div>
                </AnimatePresence>
                {selected.options && selected.options.length > 1 && (
                  <div
                    role="radiogroup"
                    aria-label={selected.optionsLabel ?? 'Choose'}
                    className={cn(
                      'grid gap-0.5',
                      selected.options.length > 8
                        ? 'grid-cols-6'
                        : 'grid-cols-2',
                    )}
                    data-path-options
                  >
                    {selected.options.map((choice, i) => (
                      <button
                        key={choice.label}
                        type="button"
                        role="radio"
                        aria-checked={i === optionIndex}
                        onClick={() => setOptionIndex(i)}
                        className={cn(
                          TAB,
                          'min-w-0 justify-center truncate px-2',
                          i === optionIndex && TAB_ACTIVE,
                        )}
                      >
                        {choice.label}
                      </button>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  disabled={selected.soon}
                  className={cn(WHITE_PILL, 'w-full disabled:opacity-40')}
                  onClick={() =>
                    open(selected, option?.route ?? selected.route)
                  }
                >
                  {primaryLabel(selected, selected.id === nextRow?.id)}
                </button>
                {selected.side && (
                  <button
                    type="button"
                    className={cn(OUTLINE_PILL, 'w-full')}
                    onClick={() => {
                      if (selected.side) navigate(selected.side.route);
                    }}
                  >
                    {selected.side.title}
                  </button>
                )}
              </div>
            </aside>
          )}
        </div>
      </div>

      <Dialog
        open={openLevel != null}
        onOpenChange={(next) => {
          if (!next) setOpenLevel(null);
        }}
      >
        <DialogContent className="max-w-96 rounded-xl border-white/[0.06] bg-[#1b1b1f] p-6 text-white">
          <p className={cn(CAPTION, 'text-center font-medium')}>
            {openLevel?.kicker}
          </p>
          <DialogTitle className="text-center text-[1.125rem] font-semibold text-white">
            {openLevel?.title}
          </DialogTitle>
          <ul className="flex list-disc flex-col gap-2 border-t border-white/[0.08] pl-5 pt-4 text-[0.875rem] leading-5 text-white/70">
            {openLevel?.goals.map((goal) => <li key={goal}>{goal}</li>)}
          </ul>
        </DialogContent>
      </Dialog>
    </div>
  );
}
