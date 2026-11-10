import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ChevronUp, Lock } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { OUTLINE_PILL, WHITE_PILL_LG } from '@/components/kit/pills';
import { lissajousPath } from '@/components/learn/sigil/sigilSpec';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/components/utilities';
import { ProfileRoutes } from '@/constants/routes';
import {
  coursePercent,
  primaryLabel,
} from '@/features/learn/paths/courseProgress';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { WheelStar } from '../sigil/WheelStar';
import { LessonDisc } from './LessonDisc';
import { waveAt, wavePath } from './pathGeometry';
import type { PathCourse, PathLevel, PathRow } from './types';
import './path.css';

// ── A path page ────────────────────────────────────────────────────────────
// A sub category as a walk: its description pinned on the left, its lessons as
// discs on a sine wave on the right. Pressing a disc selects it (its ring turns,
// its label lights and the card at the foot takes its name), and pressing it again
// opens it, so that nobody lands in a lesson by accident and a teacher can go
// straight to any stop. The logo floats over where the student is up to.

const ROW_REM = 7;
const DISC_REM = 4.75;
/** Where the wave's centre runs across the column. */
const CENTRE = '38%';
const AMPLITUDE_REM = 2.75;
const AMPLITUDE_PHONE_REM = 1.75;

const SPARKS = Array.from({ length: 10 }, (_, i) => {
  const angle = (i / 10) * Math.PI * 2;
  return {
    x: Math.cos(angle) * (22 + ((i * 17) % 26)),
    y: -18 - ((i * 23) % 46),
    delay: 0.6 + ((i * 7) % 10) / 30,
  };
});

/** Where the student is up to: a beam, its figure floating in it. */
function Marker({ accent, reduced }: { accent: string; reduced: boolean }) {
  return (
    <span
      aria-hidden
      data-path-marker
      className="pointer-events-none absolute bottom-full left-1/2 flex w-14 -translate-x-1/2 flex-col items-center"
    >
      <motion.span
        className="path-marker relative z-10 flex items-center justify-center"
        initial={reduced ? false : { opacity: 0, y: -18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          delay: 0.45,
          type: 'spring',
          stiffness: 170,
          damping: 13,
        }}
      >
        <Logo className="size-8" />
      </motion.span>
      {!reduced &&
        SPARKS.map((spark, i) => (
          <motion.span
            key={i}
            className="absolute bottom-0 left-1/2 size-1 rounded-full"
            style={{ backgroundColor: accent }}
            initial={{ opacity: 0, x: 0, y: 0 }}
            animate={{ opacity: [0, 1, 0], x: spark.x, y: spark.y }}
            transition={{ delay: spark.delay, duration: 1, ease: 'easeOut' }}
          />
        ))}
    </span>
  );
}

/** The ring round a selected disc, with an arc running round it. */
function SelectionRing({ accent }: { accent: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 120 96"
      className="pointer-events-none absolute inset-0 size-full overflow-visible"
      data-path-ring
    >
      <ellipse
        cx={60}
        cy={45}
        rx={66}
        ry={42}
        fill="none"
        stroke={accent}
        strokeOpacity={0.3}
        strokeWidth={2.5}
      />
      <ellipse
        className="path-ring-arc"
        cx={60}
        cy={45}
        rx={66}
        ry={42}
        fill="none"
        stroke={accent}
        strokeWidth={3.5}
        strokeLinecap="round"
        pathLength={100}
        strokeDasharray="34 66"
      />
    </svg>
  );
}

/** The thin line the discs sit on, filling as the student goes. */
function WaveLine({
  firstStop,
  count,
  amplitude,
  filled,
  accent,
  reduced,
}: {
  firstStop: number;
  count: number;
  amplitude: number;
  /** How many of its stops are behind the student. */
  filled: number;
  accent: string;
  reduced: boolean;
}) {
  const d = useMemo(
    () => wavePath(firstStop, count, amplitude, ROW_REM),
    [amplitude, count, firstStop],
  );
  const reach = count > 1 ? Math.min(1, filled / (count - 1)) : 0;
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute top-0"
      data-path-wave
      style={{
        left: `calc(${CENTRE} - ${amplitude}rem)`,
        width: `${amplitude * 2}rem`,
        height: `${count * ROW_REM}rem`,
        overflow: 'visible',
      }}
      viewBox={`0 0 ${amplitude * 2} ${count * ROW_REM}`}
    >
      <motion.path
        d={d}
        fill="none"
        stroke="rgb(255 255 255 / 0.14)"
        strokeWidth={0.07}
        initial={reduced ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, ease: 'easeInOut' }}
      />
      {reach > 0 && (
        <motion.path
          d={d}
          fill="none"
          stroke={accent}
          strokeWidth={0.1}
          initial={reduced ? false : { pathLength: 0 }}
          animate={{ pathLength: reach }}
          transition={{ delay: 0.3, duration: 0.9, ease: 'easeInOut' }}
        />
      )}
    </svg>
  );
}

/** A level's heading, sticking as its discs go by; it opens what it teaches. */
function LevelHeader({
  level,
  accent,
  dim,
  onOpen,
}: {
  level: PathLevel;
  accent: string;
  dim: boolean;
  onOpen: () => void;
}) {
  return (
    <div className="sticky top-3 z-20">
      <button
        type="button"
        onClick={onOpen}
        data-path-level={level.id}
        data-level-dim={dim}
        className={cn(
          'flex w-full flex-col items-center gap-0.5 rounded-2xl border border-b-4 bg-[#101012] px-4 py-2.5 text-center outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white/60',
          dim && 'border-white/10',
        )}
        style={dim ? undefined : { borderColor: accent }}
      >
        <span
          className="text-[0.6875rem] font-bold uppercase tracking-[0.12em]"
          style={{ color: dim ? 'rgb(255 255 255 / 0.4)' : accent }}
        >
          {level.kicker}
        </span>
        <span
          className={cn(
            'text-[0.9375rem]',
            dim ? 'text-white/45' : 'text-white',
          )}
        >
          {level.title}
        </span>
      </button>
    </div>
  );
}

export function PathPage({ course }: { course: PathCourse }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const reduced = useReducedMotion() ?? false;
  const wide = useMediaQuery('(min-width: 640px)');
  const amplitude = wide ? AMPLITUDE_REM : AMPLITUDE_PHONE_REM;
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
  // The key in hand: the whole path takes its colour, as the key wheel's page does.
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

  // Up and Down walk the path.
  const discRefs = useRef(new Map<string, HTMLButtonElement>());
  const walk = (event: KeyboardEvent, index: number) => {
    const step =
      event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0;
    const target = step ? rows[index + step] : undefined;
    if (!target) return;
    event.preventDefault();
    setChosen(target.id);
    discRefs.current.get(target.id)?.focus();
  };

  // Arriving on a stop further down, it's brought into view.
  const arrivedOn = useRef(selected?.id);
  useEffect(() => {
    const id = arrivedOn.current;
    if (id && id !== rows[0]?.id) {
      discRefs.current.get(id)?.scrollIntoView?.({ block: 'center' });
    }
    // Once, on arriving.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The way back to the selection, once it's scrolled away.
  const scroller = useRef<HTMLDivElement>(null);
  const [away, setAway] = useState(false);
  useEffect(() => {
    const el = selected ? discRefs.current.get(selected.id) : null;
    const root = scroller.current;
    if (!el || !root || typeof IntersectionObserver === 'undefined') {
      return undefined;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setAway(!entry.isIntersecting),
      { root },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [selected]);

  const progress = coursePercent(course);

  // How far the student has reached: the levels beyond it wait, dimmed.
  const reachedLevel = nextRow
    ? levels.findIndex((level) => level.id === nextRow.levelId)
    : levels.length - 1;

  let stopCursor = 0;

  return (
    <div
      ref={scroller}
      className="h-full overflow-y-auto bg-[#101012] px-4 pb-6 pt-4 md:px-8"
      data-path-page={course.id}
      style={{ '--path-accent': accent } as CSSProperties}
    >
      <div className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-8">
        {/* The description, pinned while the path goes by. */}
        <motion.aside
          className="flex flex-col gap-3 self-start lg:sticky lg:top-3"
          initial={reduced ? false : { opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          data-path-card
        >
          <button
            type="button"
            onClick={() => navigate(course.back.to)}
            className="flex w-fit items-center gap-2 rounded-full py-1 pr-3 text-[0.9375rem] text-white/70 outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-white/50"
          >
            <ArrowLeft className="size-4" aria-hidden />
            {course.back.label}
          </button>
          <div className="flex flex-col gap-3 rounded-2xl border border-white/15 p-4 sm:p-6">
            {figure ? (
              <div className="flex items-center gap-4 sm:gap-6">
                <div className="size-24 shrink-0 sm:size-36" data-path-star>
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
                <div className="flex min-w-0 flex-col gap-1">
                  <span
                    className="text-lg leading-tight sm:text-2xl"
                    style={{ color: figure.accent }}
                    data-path-key
                  >
                    {figure.label}
                  </span>
                  {figure.notes && (
                    <span className="text-sm text-white/60" data-path-notes>
                      {figure.notes.join(' ')}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <svg
                aria-hidden
                viewBox="-44 -44 88 88"
                className="size-12 sm:size-20"
                data-path-figure
              >
                <circle
                  r={42}
                  fill="none"
                  stroke="rgb(255 255 255 / 0.15)"
                  strokeWidth={1}
                />
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
            )}
            <h1 className="text-[1.25rem] font-bold leading-tight text-white sm:text-[1.5rem]">
              {course.title}
            </h1>
            <p className="text-[0.9375rem] leading-6 text-white/70">
              {course.description}
            </p>
            <p className="flex flex-wrap gap-x-4 gap-y-1 text-[0.8125rem] text-white/85">
              {course.stats.map((stat) => (
                <span key={stat}>{stat}</span>
              ))}
            </p>
            {progress > 0 && (
              <div
                role="progressbar"
                aria-label="Progress through this path"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress}
                className="h-1.5 overflow-hidden rounded-full bg-white/[0.1]"
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
          </div>
        </motion.aside>

        <div className="flex min-w-0 flex-col">
          {levels.map((level, levelIndex) => {
            const inLevel = rows.filter((row) => row.levelId === level.id);
            const firstStop = stopCursor;
            stopCursor += inLevel.length;
            const filled = inLevel.filter(isDone).length;
            return (
              <section key={level.id} className="flex flex-col">
                <LevelHeader
                  level={level}
                  accent={accent}
                  dim={levelIndex > reachedLevel}
                  onOpen={() => setOpenLevel(level)}
                />
                <ol
                  className="relative mt-10"
                  style={{ height: `${inLevel.length * ROW_REM}rem` }}
                >
                  <WaveLine
                    firstStop={firstStop}
                    count={inLevel.length}
                    amplitude={amplitude}
                    filled={filled}
                    accent={accent}
                    reduced={reduced}
                  />
                  {inLevel.map((row, i) => {
                    const stop = firstStop + i;
                    const finished = isDone(row);
                    const isNext = row.id === nextRow?.id;
                    const isSelected = row.id === selected?.id;
                    const offset = waveAt(stop) * amplitude;
                    const rowFigure = isSelected ? figure : row.figure;
                    const rowAccent = rowFigure?.accent ?? course.accent;
                    return (
                      <li
                        key={row.id}
                        className="absolute inset-x-0 flex items-center"
                        style={{
                          top: `${i * ROW_REM}rem`,
                          height: `${ROW_REM}rem`,
                        }}
                        data-course-row={row.id}
                        data-row-state={
                          finished ? 'done' : isNext ? 'next' : 'todo'
                        }
                        data-row-selected={isSelected}
                      >
                        <motion.button
                          type="button"
                          ref={(el) => {
                            if (el) discRefs.current.set(row.id, el);
                            else discRefs.current.delete(row.id);
                          }}
                          aria-label={`${row.title}${
                            finished ? ', finished' : isNext ? ', next' : ''
                          }${row.locked ? ', locked' : ''}${
                            row.soon ? ', coming soon' : ''
                          }`}
                          aria-pressed={isSelected}
                          onClick={() => press(row)}
                          onKeyDown={(event) => walk(event, stop)}
                          className="group absolute flex items-center gap-3 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                          style={{
                            left: `calc(${CENTRE} + ${offset}rem - ${DISC_REM / 2}rem)`,
                          }}
                          initial={
                            reduced ? false : { opacity: 0, y: 18, scale: 0.8 }
                          }
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{
                            delay: Math.min(stop, 14) * 0.05,
                            type: 'spring',
                            stiffness: 240,
                            damping: 20,
                          }}
                        >
                          <motion.span
                            className={cn(
                              'relative block shrink-0',
                              row.soon && 'opacity-40',
                            )}
                            style={{ width: `${DISC_REM}rem` }}
                            whileHover={reduced ? undefined : { y: -3 }}
                            whileTap={
                              reduced ? undefined : { y: 2, scale: 0.95 }
                            }
                            transition={{
                              type: 'spring',
                              stiffness: 420,
                              damping: 24,
                            }}
                          >
                            {isSelected && <SelectionRing accent={rowAccent} />}
                            <motion.span
                              key={finished ? 'done' : 'not'}
                              className="block"
                              initial={
                                finished && row.id === justFinished && !reduced
                                  ? { rotateX: -80, scale: 1.12 }
                                  : false
                              }
                              animate={{ rotateX: 0, scale: 1 }}
                              transition={{
                                type: 'spring',
                                stiffness: 220,
                                damping: 12,
                              }}
                            >
                              <LessonDisc
                                ratio={row.ratio}
                                accent={rowAccent}
                                state={
                                  finished ? 'done' : isNext ? 'next' : 'todo'
                                }
                                size={DISC_REM}
                                figure={rowFigure}
                                selected={isSelected}
                              />
                            </motion.span>
                            {row.locked && (
                              <Lock
                                aria-hidden
                                className="absolute left-1/2 top-[38%] size-4 -translate-x-1/2 -translate-y-1/2 text-white/80"
                              />
                            )}
                            {isNext && (
                              <Marker accent={rowAccent} reduced={reduced} />
                            )}
                          </motion.span>
                          <span
                            className={cn(
                              'max-w-[9.5rem] text-left text-[0.9375rem] leading-5 transition-colors',
                              isSelected
                                ? 'font-bold text-white'
                                : finished
                                  ? 'text-white/80'
                                  : 'text-white/55 group-hover:text-white/85',
                            )}
                            style={
                              isSelected ? { color: rowAccent } : undefined
                            }
                          >
                            {row.title}
                            {row.percent > 0 && !finished && row.tracked && (
                              <span className="ml-1.5 text-[0.8125rem] font-normal text-white/50">
                                {row.percent}%
                              </span>
                            )}
                          </span>
                        </motion.button>
                      </li>
                    );
                  })}
                </ol>
              </section>
            );
          })}

          {course.upNext && (
            <div
              className="mt-2 flex flex-col gap-1 rounded-2xl border border-white/15 p-5"
              data-up-next
            >
              <p className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-white/50">
                Up next
              </p>
              <h2 className="text-[1.0625rem] font-bold text-white">
                {course.upNext.title}
              </h2>
              <p className="text-[0.9375rem] leading-6 text-white/70">
                {course.upNext.blurb}
              </p>
              <button
                type="button"
                className={cn(OUTLINE_PILL, 'mt-2 h-10 w-fit px-5')}
                onClick={() => {
                  if (course.upNext) navigate(course.upNext.to);
                }}
              >
                Jump ahead
              </button>
            </div>
          )}

          {/* The selection's card, stuck to the foot of the path. */}
          {selected && (
            <div className="sticky bottom-0 z-30 mt-4 pb-1" data-start-card>
              <span
                aria-hidden
                className="pointer-events-none absolute -inset-x-24 -bottom-16 -top-20 -z-10"
                style={{
                  background: `radial-gradient(closest-side, ${accent}3d, transparent)`,
                }}
              />
              <AnimatePresence>
                {away && (
                  <motion.button
                    type="button"
                    aria-label={`Back to ${selected.title}`}
                    data-path-back
                    onClick={() =>
                      discRefs.current.get(selected.id)?.scrollIntoView({
                        block: 'center',
                        behavior: reduced ? 'auto' : 'smooth',
                      })
                    }
                    className="absolute -top-12 left-0 flex size-10 items-center justify-center rounded-full border border-white/20 bg-[#1b1b1f] text-white outline-none hover:bg-[#26262b] focus-visible:ring-2 focus-visible:ring-white/60"
                    initial={reduced ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduced ? undefined : { opacity: 0, y: 8 }}
                    transition={{ duration: 0.16 }}
                  >
                    <ChevronUp className="size-5" aria-hidden />
                  </motion.button>
                )}
              </AnimatePresence>
              <div className="flex flex-col gap-2 rounded-2xl border border-white/15 bg-[#1b1b1f] p-3 text-center shadow-xl sm:gap-3 sm:p-4">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={selected.id}
                    initial={reduced ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduced ? undefined : { opacity: 0, y: -4 }}
                    transition={{ duration: 0.14 }}
                    className="flex flex-col gap-1"
                  >
                    <h2 className="text-[1.0625rem] font-bold text-white">
                      {selected.title}
                    </h2>
                    {selected.blurb && (
                      <p className="text-[0.875rem] leading-5 text-white/65 max-sm:hidden">
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
                      'grid gap-1',
                      selected.options.length > 8
                        ? 'grid-cols-6'
                        : 'grid-cols-1 sm:grid-cols-2',
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
                          'h-8 min-w-0 truncate rounded-full px-2 text-[0.8125rem] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white/60',
                          i === optionIndex
                            ? 'bg-white font-bold text-[#101012]'
                            : 'text-white/75 hover:bg-white/[0.08]',
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
                  className={cn(
                    WHITE_PILL_LG,
                    'w-full disabled:opacity-40',
                    selected.id === nextRow?.id &&
                      !selected.locked &&
                      'path-sheen',
                  )}
                  onClick={() =>
                    open(selected, option?.route ?? selected.route)
                  }
                >
                  {primaryLabel(selected, selected.id === nextRow?.id)}
                </button>
                {selected.side && (
                  <button
                    type="button"
                    className={cn(OUTLINE_PILL, 'h-8 w-full sm:h-9')}
                    onClick={() => {
                      if (selected.side) navigate(selected.side.route);
                    }}
                  >
                    {selected.side.title}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog
        open={openLevel != null}
        onOpenChange={(next) => {
          if (!next) setOpenLevel(null);
        }}
      >
        <DialogContent className="max-w-96 rounded-2xl border-white/10 bg-[#1b1b1f] p-7 text-white">
          <p
            className="text-center text-[0.6875rem] font-bold uppercase tracking-[0.12em]"
            style={{ color: accent }}
          >
            {openLevel?.kicker}
          </p>
          <DialogTitle className="text-center text-lg font-bold text-white">
            {openLevel?.title}
          </DialogTitle>
          <ul className="flex list-disc flex-col gap-2 border-t border-white/15 pl-5 pt-4 text-[0.9375rem] leading-6 text-white/85">
            {openLevel?.goals.map((goal) => <li key={goal}>{goal}</li>)}
          </ul>
        </DialogContent>
      </Dialog>
    </div>
  );
}
