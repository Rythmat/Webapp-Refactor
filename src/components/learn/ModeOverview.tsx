import { ArrowRight } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useSearchParams } from 'react-router-dom';
import { HeaderBar } from '@/components/ClassroomLayout/HeaderBar';
import { HomeGlow } from '@/components/ClassroomLayout/home/HomeGlow';
import { KeyWheel } from '@/components/common/KeyWheel';
import {
  GO_PILL,
  GO_PILL_ENABLED,
} from '@/components/promptBox/PromptBoxParts';
import { cn } from '@/components/utilities';
import { LearnRoutes } from '@/constants/routes';
import { type PrismModeSlug } from '@/hooks/data/prism';
import { useProgressSummary } from '@/hooks/data/progress';
import { useElementSize } from '@/hooks/useElementSize';
import { parentOf } from '@/lib/learn/scalePitches';
import { colorForKeyMode } from '@/lib/modeColorShift';
import { keyLabelToUrlParam, urlParamToKeyLabel } from '@/lib/musicKeyUrl';
import { getChordScales } from './chordScaleData';
import { getNoteSpelling } from './noteSpellingLookup';
import { WheelStar } from './sigil/WheelStar';
import type { NoteOrder } from './sigil/sigilGeometry';
import { sigilFor } from './sigil/sigilSpec';
import './learn.css';

// ── A mode's page: the key wheel, its star inside (owner, 2026-10-26) ─────
// /learn/keyboard/lydian, /learn/guitar/ionian …: the Studio's colour-wheel
// circle of fifths, and in its middle the mode's star (its notes, joined in
// thirds, as its Theory tile draws it). A wedge chooses the key: the notes
// glide round to it, the key's wedges light, the page glows its colour.
// Wheel and star go round in one of two orders: fifths (the wheel's own,
// each note under its wedge: the scale a run of neighbours, its tonic's
// place in the run its brightness) or chromatic, a semitone a step (the
// scale's shape on the keyboard, the wedges relettered C D♭ D …). The page
// opens chromatic and morphs on its own into fifths, the notes gliding to
// their wedges; choosing a key turns it chromatic and back to fifths. The
// chromatic order keeps the chosen key on its fifths wedge, the other notes
// closing round it a semitone a step, so the key holds still while the rest
// move (owner, 2026-10-26). In either, the scale's wedges are the mode's
// colour and the rest grey. Under reduced motion it stays in fifths. Start
// opens the chosen key's lesson; keys with piano progress saved get a
// Continue chip. The key is in the URL
// (?key=g), so Back returns to it.

/**
 * The same page on another instrument (guitar). Without it, the piano
 * page's routes and resume chips.
 */
export type ModeOverviewVariant = {
  /** Where a key goes. */
  lessonRoute: (keyLabel: string) => string;
  /** A line under the title. */
  subtitle?: string;
};

type ModeOverviewProps = {
  mode: PrismModeSlug;
  variant?: ModeOverviewVariant;
};

/** The twelve key centers by pitch class, spelled as the lessons spell
 *  them, in circle-of-fifths order. */
const KEYS: readonly { label: string; pc: number }[] = [
  { label: 'C', pc: 0 },
  { label: 'G', pc: 7 },
  { label: 'D', pc: 2 },
  { label: 'A', pc: 9 },
  { label: 'E', pc: 4 },
  { label: 'B', pc: 11 },
  { label: 'F♯', pc: 6 },
  { label: 'D♭', pc: 1 },
  { label: 'A♭', pc: 8 },
  { label: 'E♭', pc: 3 },
  { label: 'B♭', pc: 10 },
  { label: 'F', pc: 5 },
];
const keyOf = (pc: number) => KEYS.find((k) => k.pc === pc)?.label ?? 'C';

/** The wheel's size, in px: by the page's, within reason. */
/** How long the page's chromatic star shows before it morphs into fifths. */
const MORPH_AFTER_MS = 900;
/** A key chosen: the glide to chromatic, a beat there, then back. */
const ROUND_TRIP_MS = 1400;
const WHEEL_MIN = 240;
const WHEEL_MAX = 520;
type Resume = { completedCount: number; totalCount: number | null };

export function ModeOverview({ mode, variant }: ModeOverviewProps) {
  const navigate = useNavigate();
  // Server progress is the piano lessons'; another instrument doesn't resume
  // from it.
  const { data: progressSummary } = useProgressSummary(!variant);
  const [hoverPc, setHoverPc] = useState<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const { width } = useElementSize(rootRef);
  // Large, the star inside it; the page's width on a phone.
  const wheelSize = Math.round(
    Math.min(WHEEL_MAX, Math.max(WHEEL_MIN, width * 0.86 || 0)),
  );
  const displayName = getChordScales(mode)?.modeName ?? mode;

  // The chosen key, from ?key= (C by default).
  const [searchParams, setSearchParams] = useSearchParams();
  const keyParam = searchParams.get('key');
  const key =
    KEYS.find((k) => keyLabelToUrlParam(k.label) === keyParam) ?? KEYS[0];
  // Wheel and star's order: chromatic as the page opens, then fifths after
  // a beat; each key chosen turns them chromatic and back. Fifths
  // throughout under reduced motion.
  const reduce = useMemo(
    () =>
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
    [],
  );
  const [order, setOrder] = useState<NoteOrder>(
    reduce ? 'fifths' : 'chromatic',
  );
  const backToFifths = useRef<number | undefined>(undefined);
  const fifthsAfter = (ms: number) => {
    window.clearTimeout(backToFifths.current);
    backToFifths.current = window.setTimeout(() => setOrder('fifths'), ms);
  };
  useEffect(() => {
    if (!reduce) fifthsAfter(MORPH_AFTER_MS);
    return () => window.clearTimeout(backToFifths.current);
    // Once, as the page opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const setParam = (name: string, value: string) =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set(name, value);
        return next;
      },
      { replace: true },
    );
  // A wedge chooses its key: chromatic round it, then back to fifths.
  const choose = (pc: number) => {
    if (pc !== key.pc) setParam('key', keyLabelToUrlParam(keyOf(pc)));
    if (reduce) return;
    setOrder('chromatic');
    fifthsAfter(ROUND_TRIP_MS);
  };

  const accent = colorForKeyMode(key.label, mode);
  const spec = useMemo(() => {
    const found = sigilFor({ mode });
    return found?.kind === 'scale' ? { ...found, accent } : found;
  }, [mode, accent]);
  // The keys of this mode with piano progress saved, by lowercase root.
  const resumeByKey = useMemo(() => {
    const map = new Map<string, Resume & { updatedAtMs: number }>();
    if (variant) return map;
    progressSummary?.lessons.forEach((lesson) => {
      if (!lesson.lessonId.startsWith('mode-lesson-flow')) return;
      // v1 = pre Bass/Play-Along removal, v2 = current (Overview/Melody/Chords
      // only, see ACTIVITY_FLOW_LESSON_VERSION in ActivityFlow.tsx). Both are
      // "resume where you left off"-eligible; older/unknown versions are not.
      if (lesson.lessonVersion !== 1 && lesson.lessonVersion !== 2) return;
      let lessonMode = lesson.mode ?? null;
      let lessonRoot = lesson.root ?? null;
      const activity = lesson.currentActivityInstanceId?.split('::');
      if ((!lessonMode || !lessonRoot) && activity && activity.length >= 5) {
        lessonMode = lessonMode ?? activity[3];
        lessonRoot = lessonRoot ?? activity[4];
      }
      if (
        (!lessonMode || !lessonRoot) &&
        lesson.lessonId.startsWith('mode-lesson-flow__')
      ) {
        const scoped = lesson.lessonId.split('__');
        if (scoped.length >= 3) {
          lessonRoot = lessonRoot ?? urlParamToKeyLabel(scoped[1]);
          lessonMode = lessonMode ?? scoped[2];
        }
      }
      if (lessonMode?.toLowerCase() !== mode.toLowerCase()) return;
      const root = lessonRoot?.toLowerCase();
      if (!root || (lesson.completedCount ?? 0) <= 0) return;
      const updatedAtMs = new Date(lesson.updatedAt).getTime() || 0;
      const existing = map.get(root);
      if (existing && existing.updatedAtMs > updatedAtMs) return;
      map.set(root, {
        completedCount: lesson.completedCount ?? 0,
        totalCount: lesson.totalCount ?? null,
        updatedAtMs,
      });
    });
    return map;
  }, [mode, progressSummary?.lessons, variant]);

  const lessonRouteFor = (keyLabel: string) =>
    variant
      ? variant.lessonRoute(keyLabel)
      : LearnRoutes.keyboardLesson({
          mode,
          key: keyLabelToUrlParam(keyLabel),
        });

  // The key's notes, lit on the wheel in fifths.
  const inKey =
    spec?.kind === 'scale'
      ? spec.pcs.map((pc) => (pc + key.pc) % 12)
      : undefined;
  // The colour dots: the root, and the root of the scale it's a mode of
  // (C Lydian: C, and G, as Lydian is G major's fourth mode).
  const parent = useMemo(() => parentOf(mode), [mode]);
  const parentAbove = parent ? (12 - parent.above) % 12 : 0;
  const marked = [0, parentAbove];
  // "4th mode of G major", or a scale's "from E♭ major".
  const ordinal = (n: number) =>
    `${n}${n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'}`;
  const parentKey = parent
    ? `${keyOf((key.pc + parentAbove) % 12)} ${parent.name}`
    : null;
  const parentName =
    parent && parent.above
      ? parent.mode
        ? `${ordinal(parent.mode)} mode of ${parentKey}`
        : `from ${parentKey}`
      : null;
  // The hole in the wheel's middle (KeyWheel's inner radius, 46 of 180).
  const hole = (wheelSize * 92) / 180;
  const resumes = KEYS.filter((k) => resumeByKey.has(k.label.toLowerCase()));

  return (
    <div
      ref={rootRef}
      className="learn-root relative isolate flex min-h-full flex-col"
      data-mode={mode}
    >
      {/* The page glows the chosen key's colour, easing as it changes. */}
      <HomeGlow colors={[accent, accent]} />
      <HeaderBar
        title={displayName}
        onBack={() => navigate(-1)}
        showProfile={false}
      />
      {variant?.subtitle && (
        // Under the title: HeaderBar's padding plus its back button and gap
        // (3rem). HeaderBar's own subtitle sits beside the title and spills
        // out of the bar at phone width.
        <p className="-mt-3 pl-16 pr-4 text-sm text-white/60 sm:pl-[4.5rem] lg:pl-[5.5rem]">
          {variant.subtitle}
        </p>
      )}

      <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center gap-5 px-4 py-6">
        <p className="text-[0.6875rem] uppercase tracking-[0.18em] text-white/45">
          Choose a key center
        </p>
        <div
          className="relative"
          style={{ width: wheelSize, height: wheelSize }}
        >
          <KeyWheel
            selectedPc={hoverPc ?? key.pc}
            mode={mode}
            size={wheelSize}
            onSelectPc={choose}
            onHoverPc={setHoverPc}
            inScalePcs={inKey}
            scaleColor={accent}
            order={order}
            chromaticAnchor={key.pc}
            ariaLabel={`${displayName}: choose a key center`}
          />
          {/* The star, in the wheel's hole; the wedges stay clickable. */}
          {spec?.kind === 'scale' && (
            <div
              data-mode-art
              className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{ width: hole, height: hole }}
            >
              <WheelStar
                pcs={spec.pcs}
                tonic={key.pc}
                stars={spec.stars}
                marked={marked}
                order={order}
                anchor={key.pc}
                accent={accent}
                label={`${key.label} ${displayName}`}
              />
            </div>
          )}
        </div>

        {/* The key chosen (by a click, not a hover), its notes, its shape. */}
        <div data-wheel-center className="flex flex-col items-center gap-1">
          <span className="text-2xl leading-tight" style={{ color: accent }}>
            {key.label} {displayName}
          </span>
          <span className="text-sm text-white/60">
            {getNoteSpelling(mode, key.label)?.join(' ')}
          </span>
          {spec?.kind === 'scale' && (
            <span className="mt-1 text-[0.6875rem] uppercase tracking-[0.18em] text-white/40">
              {spec.stats} · {spec.strip.join(' ')}
              {parentName ? ` · ${parentName}` : ''}
            </span>
          )}
        </div>

        <button
          type="button"
          data-start-key={key.label}
          onClick={() => navigate(lessonRouteFor(key.label))}
          className={cn(GO_PILL, GO_PILL_ENABLED, 'h-10 bg-white/[0.04] px-5')}
        >
          <span
            aria-hidden
            className="size-2 rounded-full"
            style={{ background: accent }}
          />
          Start {key.label} {displayName}
          <ArrowRight aria-hidden className="size-4" />
        </button>

        {resumes.length > 0 && (
          <div className="flex max-w-md flex-wrap justify-center gap-2">
            {resumes.map(({ label }) => {
              const resume = resumeByKey.get(label.toLowerCase())!;
              return (
                <button
                  key={label}
                  type="button"
                  data-resume-key={label}
                  onClick={() => navigate(lessonRouteFor(label))}
                  className="flex items-center gap-2 rounded-full border border-white/10 px-3.5 py-1.5 text-sm text-white/80 transition-colors duration-150 hover:bg-white/[0.06] hover:text-white"
                >
                  <span
                    aria-hidden
                    className="size-2 rounded-full"
                    style={{ background: colorForKeyMode(label, mode) }}
                  />
                  Continue {label} {displayName}
                  {resume.totalCount != null && (
                    <span className="text-white/50">
                      {resume.completedCount}/{resume.totalCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
