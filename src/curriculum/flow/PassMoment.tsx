import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { OUTLINE_PILL, WHITE_PILL_LG } from '@/components/kit/pills';
import { cn } from '@/components/utilities';
import type { StepFlow } from './useStepFlow';

// ── A pass, and on to what's next ──────────────────────────────────────────
// The third of the changes on an activity's stage, in the same wash as the other
// two: what was passed, the XP the server really granted for it, then the next step
// starts by itself. Next goes now, and Stay here keeps the result and its buttons.
// A section's end gets the same frame, with its Practice Track still on offer.

/** A section's end has its own line to read, and a choice in it. */
const SECTION_HOLD_MS = 6000;

function MomentFrame({
  name,
  accent,
  holdMs,
  primaryLabel,
  onPrimary,
  onStay,
  secondary,
  children,
}: {
  name: string;
  accent: string;
  holdMs: number;
  primaryLabel: string;
  onPrimary: () => void;
  onStay: () => void;
  secondary?: ReactNode;
  children: ReactNode;
}) {
  const reduced = useReducedMotion() ?? false;
  const primary = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    primary.current?.focus({ preventScroll: true });
  }, []);
  return (
    <motion.div
      {...{ [`data-${name}-moment`]: true }}
      className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-5 overflow-y-auto overflow-x-hidden bg-[#101012]/90 px-4 py-6 text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      {!reduced && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 opacity-70"
          style={{
            background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
          }}
          initial={{ x: '0%' }}
          animate={{ x: '400%' }}
          transition={{ duration: 1.1, ease: 'easeInOut' }}
        />
      )}
      <div role="status" className="relative flex flex-col items-center gap-2">
        {children}
      </div>
      <div className="relative flex w-full max-w-[34rem] flex-col items-center gap-3">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            data-moment-stay
            onClick={onStay}
            className={cn(OUTLINE_PILL, 'h-11 px-5 text-[0.9375rem]')}
          >
            Stay here
          </button>
          {secondary}
          <button
            ref={primary}
            type="button"
            data-moment-next
            onClick={onPrimary}
            className={cn(WHITE_PILL_LG, 'min-w-36')}
          >
            {primaryLabel}
          </button>
        </div>
        {/* How long until it goes by itself. */}
        {!reduced && (
          <span
            aria-hidden
            className="h-0.5 w-48 overflow-hidden rounded-full bg-white/15"
          >
            <motion.span
              data-moment-timer
              className="block h-full origin-left"
              style={{ backgroundColor: accent }}
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: holdMs / 1000, ease: 'linear' }}
            />
          </span>
        )}
      </div>
    </motion.div>
  );
}

/** The XP, once the server has said; it lands as a separate beat. */
function XpGained({ amount }: { amount: number }) {
  const reduced = useReducedMotion() ?? false;
  return (
    <motion.p
      key={amount}
      data-pass-xp={amount}
      className="text-[2.75rem] font-bold leading-none text-white"
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={
        reduced
          ? { duration: 0.2 }
          : { type: 'spring', stiffness: 420, damping: 24 }
      }
    >
      +{amount} XP
    </motion.p>
  );
}

export function PassMoment({
  flow,
  accent,
}: {
  flow: StepFlow;
  accent: string;
}) {
  const { pass } = flow;
  return (
    <AnimatePresence>
      {pass && (
        <MomentFrame
          name="pass"
          accent={accent}
          holdMs={pass.holdMs}
          primaryLabel="Next"
          onPrimary={flow.passNext}
          onStay={flow.passStay}
        >
          <p className="flex items-baseline gap-3 text-[2rem] font-bold leading-tight text-white">
            Passed
            {pass.score && (
              <span
                data-pass-score
                className="text-[1.0625rem] font-normal text-white/70"
              >
                {pass.score}
              </span>
            )}
          </p>
          {pass.earned > 0 && <XpGained amount={pass.earned} />}
          {pass.detail && (
            <p className="max-w-[34rem] text-[1.0625rem] leading-7 text-white/85">
              {pass.detail}
            </p>
          )}
          {pass.nextLabel && (
            <p className="text-[0.9375rem] text-white/70">
              Next: {pass.nextLabel}
            </p>
          )}
        </MomentFrame>
      )}
    </AnimatePresence>
  );
}

export interface SectionEnd {
  heading: string;
  blurb: string;
  continueLabel: string;
  onContinue: () => void;
  enterPracticeTrack?: () => void;
}

export function SectionMoment({
  end,
  flow,
  accent,
}: {
  /** A section's end, with another section to go on to; null otherwise. */
  end: SectionEnd | null;
  flow: StepFlow;
  accent: string;
}) {
  const [stayed, setStayed] = useState<string | null>(null);
  const heading = end?.heading ?? null;
  // After the pass that ended it has had its moment.
  const showing =
    !!end && flow.available && flow.status !== 'passed' && stayed !== heading;
  const continueRef = useRef(end?.onContinue);
  continueRef.current = end?.onContinue;
  const { blocked } = flow;

  useEffect(() => {
    if (!showing || blocked) return undefined;
    const timer = setTimeout(() => continueRef.current?.(), SECTION_HOLD_MS);
    return () => clearTimeout(timer);
  }, [blocked, showing]);

  return (
    <AnimatePresence>
      {showing && end && (
        <MomentFrame
          name="section"
          accent={accent}
          holdMs={SECTION_HOLD_MS}
          primaryLabel={end.continueLabel}
          onPrimary={end.onContinue}
          onStay={() => setStayed(end.heading)}
          secondary={
            end.enterPracticeTrack && (
              <button
                type="button"
                onClick={end.enterPracticeTrack}
                className={cn(OUTLINE_PILL, 'h-11 px-5 text-[0.9375rem]')}
              >
                Enter Practice Track
              </button>
            )
          }
        >
          <p className="text-[2rem] font-bold leading-tight text-white">
            {end.heading}
          </p>
          <p className="max-w-[34rem] text-[1.0625rem] leading-7 text-white/85">
            {end.blurb}
          </p>
        </MomentFrame>
      )}
    </AnimatePresence>
  );
}
