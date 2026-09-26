import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentType,
} from 'react';
import { cn } from '@/components/utilities';
import { TourCallout, TourCursor, type Point } from './TourCursor';
import { TourWindow } from './TourWindow';
import type { SceneProps } from './scenes/sceneTypes';
import type { TourScript } from './tourSteps';
import { useModuleTour } from './useModuleTour';
import { useTourSynth } from './useTourSynth';

/** Fixed "design size" of the window; it is scaled to fit its column. */
const DESIGN = {
  desktop: { w: 1000, h: 600 },
  compact: { w: 680, h: 700 },
};
const COMPACT_BELOW = 640;
const MAX_SCALE = 1.15;

/**
 * One module's guided demo ("the product is the demo"): the live scene inside
 * a faux app window that plays itself — an animated cursor moves between real
 * UI targets with callouts — while the block is on screen, and hands over to
 * the visitor as soon as they click. Step pills + an aria-live caption sit
 * under the window. Reduced motion: no clock, no cursor, end state.
 */
export const ModuleDemo = ({
  tab,
  Scene,
  className,
}: {
  tab: TourScript;
  Scene: ComponentType<SceneProps>;
  className?: string;
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const tour = useModuleTour(tab, rootRef);
  const { state, step } = tour;
  const synth = useTourSynth();

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
  // (the TOC column leaves ~1110px on a full-width page).
  const scale = Math.min(MAX_SCALE, width / design.w);

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
      className={cn('flex flex-col gap-4', className)}
      onFocusCapture={onFocusCapture}
      onBlurCapture={onBlurCapture}
      data-status={
        state.status === 'playing' && state.pauses.length > 0
          ? 'paused'
          : state.status
      }
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
          <TourWindow
            path={tab.path}
            soundOn={synth.enabled}
            onToggleSound={() =>
              synth.enabled ? synth.disable() : void synth.enable()
            }
          >
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
                  onClick={() => {
                    setPillClicks((n) => n + 1);
                    tour.selectStep(i);
                  }}
                  className={cn(
                    'flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70',
                    active
                      ? 'border-white/20 bg-white/10 text-white'
                      : 'border-white/[0.08] text-white/50 hover:text-white',
                  )}
                >
                  <span
                    className="grid size-4 place-items-center rounded-full text-[10px] font-bold text-[#101012]"
                    style={{
                      background: active ? '#ffffff' : 'rgba(255,255,255,0.35)',
                    }}
                  >
                    {i + 1}
                  </span>
                  {s.label}
                </button>
              </li>
            );
          })}
        </ol>
        <p
          aria-live={state.status === 'playing' ? 'off' : 'polite'}
          className={cn(
            'text-sm text-white/60 md:ml-auto md:max-w-[40ch] md:text-right',
            showCursor && 'sr-only',
          )}
        >
          {step.callout}
        </p>
      </div>
    </div>
  );
};
