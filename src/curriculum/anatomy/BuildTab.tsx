import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { WHITE_PILL } from '@/components/kit';
import { cn } from '@/components/utilities';
import { SegmentedControl } from '@/curriculum/guitar/layout/settingsControls';
import { GuitarScene } from './GuitarScene';
import { termCopy } from './anatomyCopy';
import { buildPose, poseFor } from './anatomyPose';
import type { AnatomyOption, BuildStep, ModelKind } from './anatomyTypes';
import {
  buildReducer,
  currentStep,
  isBuilt,
  placedParts,
  showHint,
  startBuild,
} from './buildGame';
import {
  compiledInstrument,
  describe,
  type CompiledModel,
} from './compileModel';

// ── Build it ───────────────────────────────────────────────────────────────
// The instrument in pieces over its own dashed outline. The card names a part;
// press it on the drawing and it flies home. A wrong press shakes and names
// what it was, so a miss still teaches something.

const CARD = 'rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-5';
const WHOLE = { x: 0, y: 0, scale: 1 };
/** How long a part stays lit after going home. */
const LIT_MS = 650;

const stepName = (model: CompiledModel, step: BuildStep) =>
  step.name ?? model.termById[step.term].name;

const nameOfPart = (model: CompiledModel, part: string) => {
  const step = model.buildOrder.find((s) => s.parts.includes(part));
  return step ? stepName(model, step) : part;
};

export function BuildTab({
  kind,
  options,
  onKindChange,
  leftHanded,
  onDone,
}: {
  kind: ModelKind;
  options: readonly AnatomyOption[];
  onKindChange: (kind: ModelKind) => void;
  leftHanded: boolean;
  onDone: (kind: ModelKind) => void;
}) {
  const model = compiledInstrument(kind, leftHanded);
  const [state, dispatch] = useReducer(
    buildReducer,
    model.buildOrder,
    startBuild,
  );

  // A new instrument starts over.
  const startedOn = useRef(kind);
  useEffect(() => {
    if (startedOn.current === kind) return;
    startedOn.current = kind;
    dispatch({ type: 'restart', order: model.buildOrder });
  }, [kind, model.buildOrder]);

  const step = currentStep(state);
  const built = isBuilt(state);
  const placed = useMemo(() => placedParts(state), [state]);

  // The part that just went home stays lit for a moment.
  const last = state.step > 0 ? state.order[state.step - 1] : null;
  const [litParts, setLitParts] = useState<readonly string[]>([]);
  useEffect(() => {
    if (!last) {
      setLitParts([]);
      return;
    }
    setLitParts(last.parts);
    const id = window.setTimeout(() => setLitParts([]), LIT_MS);
    return () => window.clearTimeout(id);
  }, [last]);

  // Finished, it is simply an instrument again: full ink, every part home.
  const pose = useMemo(
    () =>
      built && !litParts.length
        ? poseFor(model, 0, null)
        : buildPose(model, placed, litParts),
    [model, placed, litParts, built],
  );

  useEffect(() => {
    if (built) onDone(kind);
    // Once per finished build.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [built]);

  const other = options.find((option) => option.value !== kind);
  const copy = step ? termCopy(model.kind, step.term) : undefined;
  const wrongName = state.wrong ? nameOfPart(model, state.wrong.part) : null;

  return (
    <div className="flex flex-col gap-4" data-anatomy-build>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        {options.length > 1 && (
          <SegmentedControl
            label={model.noun}
            options={options}
            value={kind}
            onChange={onKindChange}
          />
        )}
        <p className="text-[0.8125rem] text-white/55" data-build-progress>
          {state.step} of {state.order.length} parts
        </p>
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div
          className="min-h-0 w-full"
          style={{
            aspectRatio: `${model.view.width} / ${model.view.height}`,
            maxHeight: 'calc(100dvh - 19.5rem)',
            minHeight: '20rem',
          }}
        >
          <GuitarScene
            key={model.kind + String(leftHanded)}
            model={model}
            pose={pose}
            camera={WHOLE}
            stagger={0}
            ghost
            onPressPart={
              built ? undefined : (part) => dispatch({ type: 'press', part })
            }
            inert={placed}
            pulsing={step && showHint(state) ? step.parts : []}
            shake={state.wrong}
            label={`${describe(model)} in pieces, ${state.step} of ${state.order.length} parts in place`}
          />
        </div>
        <div className={cn(CARD, 'self-start')} data-build-card>
          {built ? (
            <>
              <h3
                className="text-xl font-semibold"
                style={{ color: model.accent }}
              >
                Built
              </h3>
              <p className="mt-2 text-sm leading-5 text-white/85">
                {state.order.length} parts in {state.tries} tries
                {state.tries === state.order.length ? ', not one miss.' : '.'}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {other && (
                  <button
                    type="button"
                    className={WHITE_PILL}
                    onClick={() => onKindChange(other.value)}
                  >
                    Build the {other.label.toLowerCase()}
                  </button>
                )}
                <button
                  type="button"
                  className={
                    other
                      ? 'h-9 rounded-full border border-white/15 px-4 text-sm text-white/80 transition-colors hover:bg-white/[0.07]'
                      : WHITE_PILL
                  }
                  onClick={() => dispatch({ type: 'restart' })}
                >
                  Again
                </button>
              </div>
            </>
          ) : (
            step && (
              <>
                <p className="text-[0.75rem] uppercase tracking-[0.08em] text-white/45">
                  Find the
                </p>
                <h3
                  className="mt-1 text-xl font-semibold"
                  style={{ color: model.accent }}
                  data-build-target
                >
                  {stepName(model, step)}
                </h3>
                {copy && (
                  <p className="mt-3 text-sm leading-5 text-white/70">
                    {copy.what}
                  </p>
                )}
                <p
                  className="mt-3 min-h-5 text-sm leading-5 text-white/55"
                  aria-live="polite"
                >
                  {wrongName && `That’s the ${wrongName}.`}
                  {showHint(state) && ' It’s the part that’s pulsing.'}
                </p>
              </>
            )
          )}
        </div>
      </div>
    </div>
  );
}
