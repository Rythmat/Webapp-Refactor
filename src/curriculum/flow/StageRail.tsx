import { motion, useReducedMotion } from 'framer-motion';
import { Check } from 'lucide-react';
import { Fragment } from 'react';
import { cn } from '@/components/utilities';
import { FLOW_STAGES, type FlowStage } from './stepFlow';
import type { StepFlow } from './useStepFlow';

// ── Where an activity is up to ─────────────────────────────────────────────
// Three linked pills, the current one filling with the key's colour. Pressing one
// goes there, and from then on the student's driving.

const LABEL: Record<FlowStage, string> = {
  demo: 'Demo',
  practice: 'Practice',
  perform: 'Perform',
};

export function StageRail({
  flow,
  accent,
}: {
  flow: StepFlow;
  accent: string;
}) {
  const reduced = useReducedMotion() ?? false;
  if (!flow.available) return null;
  const at = flow.stage ? FLOW_STAGES.indexOf(flow.stage) : -1;
  const press = (stage: FlowStage) => {
    if (stage === 'demo') flow.run.demo.play();
    if (stage === 'practice') flow.run.practise();
    if (stage === 'perform') flow.run.playNow();
  };
  return (
    <div
      className="flex flex-wrap items-center gap-x-3 gap-y-1.5"
      data-stage-rail
    >
      <div
        role="group"
        aria-label="Stages of this activity"
        className="flex items-center gap-1 sm:gap-1.5"
      >
        {FLOW_STAGES.map((stage, i) => {
          const current = i === at;
          const done = i < at;
          return (
            <Fragment key={stage}>
              {i > 0 && (
                <span
                  aria-hidden
                  className="h-px w-2 overflow-hidden bg-white/15 sm:w-6"
                >
                  <motion.span
                    className="block h-full origin-left"
                    style={{ backgroundColor: accent }}
                    initial={false}
                    animate={{ scaleX: i <= at ? 1 : 0 }}
                    transition={{
                      duration: reduced ? 0 : 0.4,
                      ease: 'easeOut',
                    }}
                  />
                </span>
              )}
              <button
                type="button"
                data-stage={stage}
                data-stage-state={current ? 'current' : done ? 'done' : 'todo'}
                aria-current={current ? 'step' : undefined}
                aria-label={`Go to ${LABEL[stage]}`}
                onClick={() => press(stage)}
                className={cn(
                  'relative inline-flex h-8 items-center gap-1.5 overflow-hidden rounded-full border px-3 text-[0.8125rem] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white/60',
                  current
                    ? 'border-transparent font-bold text-[#101012]'
                    : 'border-white/15 text-white/70 hover:bg-white/[0.05]',
                )}
              >
                {current && (
                  <motion.span
                    aria-hidden
                    layoutId={reduced ? undefined : 'stage-rail-fill'}
                    className="absolute inset-0"
                    style={{ backgroundColor: accent }}
                    transition={{
                      type: 'spring',
                      stiffness: 320,
                      damping: 30,
                    }}
                  />
                )}
                <span className="relative flex items-center gap-1.5">
                  {done && (
                    <Check
                      className="size-3.5 max-sm:hidden"
                      style={{ color: accent }}
                      strokeWidth={3}
                      aria-hidden
                    />
                  )}
                  {LABEL[stage]}
                </span>
              </button>
            </Fragment>
          );
        })}
      </div>
      {flow.held && (
        <p
          role="status"
          className="text-[0.8125rem] text-white/70"
          data-flow-held
        >
          Didn’t catch anything. Practice again, or go on to Perform.
        </p>
      )}
      {flow.needsStart && (
        <p className="text-[0.8125rem] text-white/60" data-flow-needs-start>
          Press Demo to begin.
        </p>
      )}
    </div>
  );
}
