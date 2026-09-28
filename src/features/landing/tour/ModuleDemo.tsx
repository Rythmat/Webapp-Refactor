import { motion } from 'framer-motion';
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

/**
 * One module's guided demo ("the product is the demo"): the live scene inside
 * a faux app window that plays itself — an animated cursor moves between real
 * UI targets with callouts — while the block is on screen, and hands over to
 * the visitor as soon as they click. Step pills + an aria-live caption sit
 * under the window. Reduced motion: no clock, no cursor, end state.
 *
 * Sound follows the visitor: any click in the demo turns it on; the scene's
 * Pause/Stop and the demo leaving the screen turn it off.
 *
 * `bleed`: the window fills its column edge to edge (flush, no scale cap) and
 * the steps become a hairline row of bento boxes, the active one carrying the
 * step's progress.
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
  // Capture phase, so a Pause/Stop handler in the same click still wins.
  const onClickCapture = () => {
    if (!synth.audio.isEnabled()) void synth.enable();
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
  // (the TOC column leaves ~1110px on a full-width page). Bleed always fills
  // it — the landing frame bounds the column at ~1190px.
  const scale = bleed
    ? width / design.w
    : Math.min(MAX_SCALE, width / design.w);

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
  const caption = (className: string) => (
    <p
      aria-live={state.status === 'playing' ? 'off' : 'polite'}
      className={cn(
        'text-sm text-white/60',
        showCursor && !bleed ? 'sr-only' : className,
      )}
    >
      {step.callout}
    </p>
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
      data-sound={synth.enabled ? 'on' : 'off'}
    >
      <div
        ref={wrapperRef}
        className="relative w-full"
        style={{ height: design.h * scale }}
      >
        <div
          ref={stageRef}
          className="absolute left-0 top-0 origin-top-left"
          style={{
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
        <>
          <ol
            className="grid grid-cols-2 gap-px border-t border-white/[0.08] bg-white/[0.08] md:grid-cols-[repeat(var(--steps),minmax(0,1fr))]"
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
          {caption('border-t border-white/[0.08] px-6 py-5 md:px-10')}
        </>
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
          {caption('md:ml-auto md:max-w-[40ch] md:text-right')}
        </div>
      )}
    </div>
  );
};
