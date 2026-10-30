import { useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  PROMPT_PILL,
  PROMPT_PILL_OFF,
  PROMPT_PILL_ON,
} from '@/components/promptBox/PromptBoxParts';
import { cn } from '@/components/utilities';
import { SegmentedControl } from '@/curriculum/guitar/layout/settingsControls';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { GuitarScene } from './GuitarScene';
import { TermDetail, TermList } from './TermPanels';
import { cameraFor, poseFor } from './anatomyPose';
import type { AnatomyOption, ModelKind } from './anatomyTypes';
import { frameFor, labelsScale, layoutCallouts } from './callouts';
import { compiledInstrument, describe } from './compileModel';

// ── Explore ────────────────────────────────────────────────────────────────
// The instrument comes apart when the lesson opens and holds there. The slider
// scrubs it by hand. Choosing a word reassembles everything else and lifts that
// part clear, and switching instruments flies one apart and assembles the other.

const OPENING_STAGGER = 0.045;
const MOVE_STAGGER = 0.012;
const SWAP_STAGGER = 0.02;
/** How long the outgoing guitar flies apart before the next one comes in. */
const SWAP_MS = 340;
/** Past "apart", for a guitar flying off or coming in. */
const OFFSTAGE = 1.3;
/** A label's size on screen, in rem. */
const LABEL_REM = 0.8125;

// Styled by hand: left to the browser, the empty track's colour depends on the
// accent's (white beside a red, dark beside a green).
const SLIDER_CSS = `
.anatomy-slider { appearance: none; -webkit-appearance: none; height: 1.125rem; background: transparent; border-radius: 9999px; outline: none; }
.anatomy-slider::-webkit-slider-runnable-track { height: 0.375rem; border-radius: 9999px; background: linear-gradient(to right, var(--slider-accent) var(--slider-fill), rgba(255,255,255,0.14) var(--slider-fill)); }
.anatomy-slider::-moz-range-track { height: 0.375rem; border-radius: 9999px; background: rgba(255,255,255,0.14); }
.anatomy-slider::-moz-range-progress { height: 0.375rem; border-radius: 9999px; background: var(--slider-accent); }
.anatomy-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 1.125rem; height: 1.125rem; margin-top: -0.375rem; border-radius: 9999px; border: 0; background: var(--slider-accent); }
.anatomy-slider::-moz-range-thumb { width: 1.125rem; height: 1.125rem; border-radius: 9999px; border: 0; background: var(--slider-accent); }
.anatomy-slider:focus-visible { box-shadow: 0 0 0 2px rgba(255,255,255,0.4); }
`;

export function ExploreTab({
  kind,
  options,
  onKindChange,
  term,
  onTermChange,
  leftHanded,
  labels,
  onLabelsChange,
}: {
  kind: ModelKind;
  options: readonly AnatomyOption[];
  onKindChange: (kind: ModelKind) => void;
  term: string | null;
  onTermChange: (term: string | null) => void;
  leftHanded: boolean;
  labels: boolean;
  onLabelsChange: (labels: boolean) => void;
}) {
  const reduceMotion = useReducedMotion();
  const narrow = !useMediaQuery('(min-width: 640px)');
  const [explode, setExplode] = useState(1);
  const [hoveredTerm, setHoveredTerm] = useState<string | null>(null);

  // The guitar on stage lags the chosen one while the old one flies off.
  const [staged, setStaged] = useState(kind);
  const leaving = staged !== kind;
  const firstScene = useRef(true);
  useEffect(() => {
    if (!leaving) return;
    if (reduceMotion) {
      setStaged(kind);
      return;
    }
    const id = window.setTimeout(() => setStaged(kind), SWAP_MS);
    return () => window.clearTimeout(id);
  }, [leaving, kind, reduceMotion]);

  const model = compiledInstrument(staged, leftHanded);
  const chosen = term ? (model.termById[term] ?? null) : null;

  // The drawing's scale on screen, for the labels' size.
  const stage = useRef<HTMLDivElement | null>(null);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = stage.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) =>
      setStageSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      }),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const frame = useMemo(
    () => frameFor(model.view, stageSize),
    [model.view, stageSize],
  );
  const labelSize = useMemo(() => {
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    return stageSize.width > 0
      ? (LABEL_REM * rem * frame.width) / stageSize.width
      : 0.82;
  }, [stageSize.width, frame.width]);

  const pose = useMemo(
    () =>
      leaving
        ? poseFor(model, OFFSTAGE, null)
        : poseFor(model, explode, chosen?.id ?? null),
    [model, leaving, explode, chosen?.id],
  );
  const showLabels = labels && !narrow && !leaving;
  const camera = useMemo(
    () =>
      cameraFor(
        model,
        chosen,
        pose,
        showLabels
          ? labelsScale(model.view, frame, model.terms, labelSize)
          : null,
      ),
    [model, chosen, pose, showLabels, frame, labelSize],
  );

  // A guitar enters from assembled on first opening (so it comes apart), and
  // from offstage after a swap (so it comes together).
  const initialPose = useMemo(() => {
    if (reduceMotion) return undefined;
    const from = firstScene.current ? 0 : OFFSTAGE;
    return poseFor(model, from, null);
    // Once per scene.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model]);
  const staggerRef = useRef(OPENING_STAGGER);
  useEffect(() => {
    firstScene.current = false;
  }, []);

  const visibleCallouts = useMemo(() => {
    if (leaving) return [];
    if (showLabels) {
      return layoutCallouts(model, model.terms, pose, camera, labelSize, frame);
    }
    const shown = chosen ?? (hoveredTerm ? model.termById[hoveredTerm] : null);
    if (narrow || !shown) return [];
    return layoutCallouts(model, [shown], pose, camera, labelSize, frame);
  }, [
    model,
    leaving,
    showLabels,
    chosen,
    hoveredTerm,
    narrow,
    pose,
    camera,
    labelSize,
    frame,
  ]);

  useEffect(() => {
    if (!term) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onTermChange(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [term, onTermChange]);

  const select = (next: string) => {
    staggerRef.current = MOVE_STAGGER;
    onTermChange(next === term ? null : next);
  };

  const hoveredPart =
    hoveredTerm && !chosen
      ? (model.termById[hoveredTerm]?.parts[0] ?? null)
      : null;

  return (
    <div className="flex flex-col gap-4" data-anatomy-explore>
      <style>{SLIDER_CSS}</style>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        {options.length > 1 && (
          <SegmentedControl
            label={model.noun}
            options={options}
            value={kind}
            onChange={(next) => {
              staggerRef.current = SWAP_STAGGER;
              onKindChange(next);
            }}
          />
        )}
        <label className="flex min-w-56 flex-1 items-center gap-3 text-[0.8125rem] text-white/55">
          <span>Assembled</span>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(explode * 100)}
            aria-label={`How far apart the ${model.noun} is`}
            className="anatomy-slider min-w-0 flex-1 cursor-pointer"
            style={
              {
                '--slider-accent': model.accent,
                '--slider-fill': `${Math.round(explode * 100)}%`,
              } as React.CSSProperties
            }
            onChange={(event) => {
              staggerRef.current = 0;
              if (term) onTermChange(null);
              setExplode(Number(event.target.value) / 100);
            }}
          />
          <span>Apart</span>
        </label>
        {!narrow && (
          <button
            type="button"
            aria-pressed={labels}
            className={cn(
              PROMPT_PILL,
              labels ? PROMPT_PILL_ON : PROMPT_PILL_OFF,
            )}
            onClick={() => onLabelsChange(!labels)}
          >
            Labels
          </button>
        )}
      </div>

      {/* With labels on the drawing is the chart: it takes the whole width. */}
      <div
        className={cn(
          'grid gap-5',
          !showLabels && 'lg:grid-cols-[minmax(0,1fr)_19rem]',
        )}
      >
        <div
          ref={stage}
          className="min-h-0 w-full transition-opacity duration-300"
          style={{
            aspectRatio: `${model.view.width} / ${model.view.height}`,
            maxHeight: 'calc(100dvh - 19.5rem)',
            minHeight: narrow ? undefined : '20rem',
            opacity: leaving ? 0 : 1,
          }}
        >
          <GuitarScene
            key={model.kind + String(leftHanded)}
            model={model}
            pose={pose}
            camera={camera}
            frame={frame}
            initialPose={initialPose}
            stagger={staggerRef.current}
            callouts={visibleCallouts}
            onPressPart={(part) => {
              const id = model.termOfPart[part];
              if (id) select(id);
            }}
            onPressCanvas={() => {
              if (term) onTermChange(null);
            }}
            onPressCallout={select}
            onHoverPart={(part) => {
              setHoveredTerm(part ? (model.termOfPart[part] ?? null) : null);
            }}
            hoveredPart={hoveredPart}
            label={`Exploded diagram of ${describe(model)}`}
          />
        </div>
        <div className="flex flex-col gap-5">
          <TermDetail model={model} term={chosen} />
          <TermList
            model={model}
            selected={chosen?.id ?? null}
            onSelect={select}
            onHover={setHoveredTerm}
          />
        </div>
      </div>
    </div>
  );
}
