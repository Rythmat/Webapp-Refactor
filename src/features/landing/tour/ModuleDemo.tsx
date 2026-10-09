import { motion } from 'framer-motion';
import { Volume2, VolumeX } from 'lucide-react';
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentType,
  type CSSProperties,
} from 'react';
import { cn } from '@/components/utilities';
import { useInView } from '../motion/useInView';
import { TourCallout, TourCursor, type Point } from './TourCursor';
import { TourWindow } from './TourWindow';
import type { SceneProps } from './scenes/sceneTypes';
import type { TourScript } from './tourSteps';
import { useModuleTour } from './useModuleTour';
import { useTourSynth } from './useTourSynth';

/**
 * Fixed "design size" of the window; it is scaled to fit its column. The
 * scene fills it (the Studio's layout is drawn to exactly these sizes).
 */
const DESIGN = {
  desktop: { w: 1000, h: 560 },
  compact: { w: 680, h: 660 },
};
const COMPACT_BELOW = 640;
const MAX_SCALE = 1.15;
/** Room a bleed window leaves on screen: the sticky nav bar plus a little air. */
const BLEED_TOP_PX = 64 + 16;
/** A short window never shrinks a bleed demo below this share of its column. */
const BLEED_MIN_FILL = 0.6;

/**
 * One module's guided demo ("the product is the demo"): the live scene inside
 * a faux app window that plays itself — an animated cursor moves between real
 * UI targets with callouts — while the block is on screen, and hands over to
 * the visitor as soon as they click. Step pills + an aria-live caption sit
 * under the window. Reduced motion: no clock, no cursor, end state.
 *
 * Sound follows the visitor: any click in the demo turns it on; the scene's
 * Pause/Stop and the demo leaving the screen turn it off. The Sound toggle
 * under the window shows it and mutes it: muted, clicks leave it off until
 * the toggle, a Play or a played note turns it back on.
 *
 * `bleed`: the window fills its column edge to edge (flush, no width cap) and
 * the steps become a hairline row of bento boxes, the active one carrying the
 * step's progress. It never grows taller than the screen under the nav: on a
 * short, wide window it is centred in its column between hairlines instead.
 */
export const ModuleDemo = ({
  tab,
  Scene,
  bleed,
  className,
}: {
  tab: TourScript;
  Scene: ComponentType<SceneProps>;
  bleed?: boolean;
  className?: string;
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const tour = useModuleTour(tab, rootRef);
  const { state, step } = tour;
  const synth = useTourSynth();

  // ── Sound ──────────────────────────────────────────────────────────────
  // Capture phase, so a Pause/Stop handler in the same click still wins. The
  // Sound toggle's own clicks are its alone (a mute must not wake it first).
  const soundRef = useRef<HTMLButtonElement>(null);
  const onClickCapture = (e: React.MouseEvent) => {
    if (!soundRef.current?.contains(e.target as Node)) synth.wake();
  };
  const toggleSound = () => {
    if (synth.enabled) synth.mute();
    else void synth.enable();
  };
  // Its own on-screen test (any part visible), not the tour's 35%: a click
  // can land on a barely visible demo, and leaving the screen still mutes it.
  const onScreen = useInView(rootRef);
  const { disable } = synth;
  useEffect(() => {
    if (!onScreen || tour.hidden) disable();
  }, [onScreen, tour.hidden, disable]);

  // ── Stage scaling ──────────────────────────────────────────────────────
  const [width, setWidth] = useState(DESIGN.desktop.w);
  const [viewportHeight, setViewportHeight] = useState(() =>
    typeof window === 'undefined' ? Infinity : window.innerHeight,
  );
  useEffect(() => {
    if (!bleed) return;
    const onResize = () => setViewportHeight(window.innerHeight);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [bleed]);
  useLayoutEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth || DESIGN.desktop.w);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const compact = width < COMPACT_BELOW;
  const design = compact ? DESIGN.compact : DESIGN.desktop;
  // Fills its column: shrinks freely, grows a little past the design size
  // (the TOC column leaves ~1110px on a full-width page). Bleed fills it too
  // (up to ~1720px in the landing frame), but no taller than the screen.
  const fill = width / design.w;
  const scale = bleed
    ? Math.min(
        fill,
        Math.max(
          fill * BLEED_MIN_FILL,
          (viewportHeight - BLEED_TOP_PX) / design.h,
        ),
      )
    : Math.min(MAX_SCALE, fill);
  /** Bleed only: the side gap when the screen's height, not the column, sets the size. */
  const inset = bleed ? Math.max(0, (width - design.w * scale) / 2) : 0;

  // ── Cursor target ──────────────────────────────────────────────────────
  // The callout anchors to the step's target; the cursor also follows it
  // when a scene moves `data-tour-target` for a later click in the step
  // (each move clicks again).
  const [point, setPoint] = useState<Point | null>(null);
  const [cursor, setCursor] = useState<Point | null>(null);
  const [moves, setMoves] = useState(0);
  const showCursor = state.status === 'playing' && !compact && !tour.reduce;
  // The observer's callback can run after the next step's commit and before
  // this effect re-runs; the scene's moves then belong to the new step.
  const stepRef = useRef(step);
  stepRef.current = step;
  useEffect(() => {
    const stage = stageRef.current;
    if (!showCursor || !stage) return;
    let current: Element | null = null;
    const locate = () => {
      const el = stage.querySelector<HTMLElement>(
        `[data-tour-target="${step.target}"]`,
      );
      if (!el) return null;
      const s = stage.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      const at = {
        x: (r.left - s.left + r.width / 2) / scale,
        y: (r.top - s.top + r.height / 2) / scale,
      };
      return { el, at };
    };
    const measure = () => {
      const found = locate();
      if (!found) return;
      current = found.el;
      setPoint(found.at);
      setCursor(found.at);
    };
    const follow = () => {
      if (stepRef.current !== step) return;
      const found = locate();
      if (!found || !current || found.el === current) return;
      current = found.el;
      setCursor(found.at);
      setMoves((n) => n + 1);
    };
    const timers = [120, 700].map((ms) => window.setTimeout(measure, ms));
    const observer = new MutationObserver(follow);
    observer.observe(stage, {
      subtree: true,
      attributeFilter: ['data-tour-target'],
    });
    return () => {
      timers.forEach(clearTimeout);
      observer.disconnect();
    };
  }, [showCursor, step, scale, compact]);

  // Every step-pill click (the current step's too) lets the scene reset.
  const [pillClicks, setPillClicks] = useState(0);
  const selectStep = (i: number) => {
    setPillClicks((n) => n + 1);
    tour.selectStep(i);
  };
  const stepNumber = (i: number, active: boolean) => (
    <span
      className={cn(
        'grid shrink-0 place-items-center rounded-full text-[#101012]',
        bleed ? 'size-5 text-[11px]' : 'size-4 text-[10px]',
      )}
      style={{
        background: active ? '#ffffff' : 'rgba(255,255,255,0.35)',
      }}
    >
      {i + 1}
    </span>
  );
  // The cursor's callout narrates while it plays, so the caption hides then —
  // except bleed's caption row, which stays so the page below doesn't jump.
  // Shown, it is as tall as the longest callout (hidden copies share its
  // cell): the Sound toggle narrows it, and the page below mustn't jump from
  // step to step.
  const caption = (className: string) => (
    <div
      className={cn(
        'grid text-sm',
        showCursor && !bleed ? 'sr-only' : className,
      )}
    >
      {tab.steps.map((s) => (
        <span key={s.id} className="invisible col-start-1 row-start-1">
          {s.callout}
        </span>
      ))}
      <p
        aria-live={state.status === 'playing' ? 'off' : 'polite'}
        className="col-start-1 row-start-1 text-white/60"
      >
        {step.callout}
      </p>
    </div>
  );
  // Always shown, under the window so it never covers the scene: bleed's
  // last bento box (phones: the end of the caption's row), else a pill at the
  // end of the caption's line. Hover only where it can hover: a tap's sticky
  // hover would light a muted toggle as if it were on.
  const soundOn = synth.enabled;
  const soundIcon = bleed ? 'size-4 shrink-0 md:size-5' : 'size-3.5';
  const soundToggle = (
    <button
      ref={soundRef}
      type="button"
      onClick={toggleSound}
      aria-pressed={soundOn}
      aria-label={soundOn ? 'Mute demo sound' : 'Turn on demo sound'}
      className={cn(
        'flex shrink-0 items-center gap-1.5 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70',
        soundOn
          ? 'text-white'
          : 'text-white/50 [@media(hover:hover)]:hover:text-white',
        bleed
          ? cn(
              'col-start-2 row-start-2 border-t border-white/[0.08] px-6 text-sm focus-visible:ring-inset md:row-start-1 md:flex-col md:items-start md:gap-3 md:border-l md:border-t-0 md:px-8 md:py-6 md:text-[15px]',
              soundOn
                ? 'md:bg-white/[0.05]'
                : '[@media(hover:hover)]:md:hover:bg-white/[0.02]',
            )
          : cn(
              'ml-auto rounded-full border px-3 py-1.5 text-xs',
              soundOn ? 'border-white/20 bg-white/10' : 'border-white/[0.08]',
            ),
      )}
    >
      {soundOn ? (
        <Volume2 className={soundIcon} />
      ) : (
        <VolumeX className={soundIcon} />
      )}
      Sound
    </button>
  );

  // Keyboard focus inside the demo pauses it (pointer clicks don't).
  const onFocusCapture = (e: React.FocusEvent) => {
    if ((e.target as Element).matches?.(':focus-visible'))
      tour.dispatch({ type: 'PAUSE', reason: 'focus' });
  };
  const onBlurCapture = (e: React.FocusEvent) => {
    if (!rootRef.current?.contains(e.relatedTarget as Node | null))
      tour.dispatch({ type: 'RESUME', reason: 'focus' });
  };

  const mode: SceneProps['mode'] =
    state.status === 'static'
      ? 'static'
      : state.status === 'user'
        ? 'user'
        : 'auto';

  return (
    <div
      ref={rootRef}
      className={cn('flex flex-col', !bleed && 'gap-4', className)}
      onClickCapture={onClickCapture}
      onFocusCapture={onFocusCapture}
      onBlurCapture={onBlurCapture}
      data-status={
        state.status === 'playing' && state.pauses.length > 0
          ? 'paused'
          : state.status
      }
      data-sound={soundOn ? 'on' : 'off'}
    >
      <div
        ref={wrapperRef}
        className="relative w-full"
        style={{ height: design.h * scale }}
      >
        {inset > 0 && (
          // Hairlines mark the window's edges when it doesn't reach the column's.
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 border-x border-white/[0.08]"
            style={{ left: inset - 1, right: inset - 1 }}
          />
        )}
        <div
          ref={stageRef}
          className="absolute top-0 origin-top-left"
          style={{
            left: inset,
            width: design.w,
            height: design.h,
            transform: `scale(${scale})`,
          }}
        >
          <TourWindow flush={bleed}>
            <div className="absolute inset-0">
              <Scene
                stepIndex={state.step}
                mode={mode}
                visible={tour.visible}
                compact={compact}
                onUserAction={tour.onUserAction}
                playNotes={synth.playFromGesture}
                stepProgress={tour.stepProgress}
                audio={synth.audio}
                soundOn={soundOn}
                resetKey={pillClicks}
                goToStep={selectStep}
              />
            </div>
          </TourWindow>
          {showCursor && (
            <>
              <TourCallout
                point={point}
                stage={design}
                text={step.callout}
                id={step.id}
              />
              <TourCursor
                point={cursor}
                clickKey={step.click ? `${step.id}:${moves}` : null}
              />
            </>
          )}
        </div>
      </div>

      {bleed ? (
        <div className="grid grid-cols-[minmax(0,1fr)_auto] border-t border-white/[0.08]">
          <ol
            className="col-span-2 grid grid-cols-2 gap-px bg-white/[0.08] md:col-span-1 md:grid-cols-[repeat(var(--steps),minmax(0,1fr))]"
            style={{ '--steps': tab.steps.length } as CSSProperties}
            aria-label={`${tab.label} demo steps`}
          >
            {tab.steps.map((s, i) => {
              const active = i === state.step;
              // Odd count: the last box spans the 2-col mobile row.
              const spanLast =
                i === tab.steps.length - 1 && tab.steps.length % 2 === 1;
              return (
                <li
                  key={s.id}
                  className={cn(
                    'bg-[#101012]',
                    spanLast && 'col-span-2 md:col-span-1',
                  )}
                >
                  <button
                    type="button"
                    aria-current={active ? 'step' : undefined}
                    onClick={() => selectStep(i)}
                    className={cn(
                      'relative flex h-full w-full flex-col items-start gap-3 px-6 py-5 text-left text-[15px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/70 md:px-8 md:py-6',
                      active
                        ? 'bg-white/[0.05] text-white'
                        : 'text-white/50 hover:bg-white/[0.02] hover:text-white',
                    )}
                  >
                    {active && (
                      <motion.span
                        aria-hidden
                        className="absolute inset-x-0 top-0 h-px origin-left bg-white/70"
                        style={{ scaleX: tour.stepProgress }}
                      />
                    )}
                    {stepNumber(i, active)}
                    {s.label}
                  </button>
                </li>
              );
            })}
          </ol>
          {soundToggle}
          {caption(
            'col-start-1 row-start-2 border-t border-white/[0.08] px-6 py-5 md:col-span-2 md:px-10',
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <ol
            className="flex flex-wrap gap-1.5"
            aria-label={`${tab.label} demo steps`}
          >
            {tab.steps.map((s, i) => {
              const active = i === state.step;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    aria-current={active ? 'step' : undefined}
                    onClick={() => selectStep(i)}
                    className={cn(
                      'flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70',
                      active
                        ? 'border-white/20 bg-white/10 text-white'
                        : 'border-white/[0.08] text-white/50 hover:text-white',
                    )}
                  >
                    {stepNumber(i, active)}
                    {s.label}
                  </button>
                </li>
              );
            })}
          </ol>
          <div className="flex items-center gap-3 md:ml-auto">
            {caption('min-w-0 flex-1 md:max-w-[40ch] md:text-right')}
            {soundToggle}
          </div>
        </div>
      )}
    </div>
  );
};
