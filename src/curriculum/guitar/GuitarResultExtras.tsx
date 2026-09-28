import type { AssessmentResult } from '@/curriculum/hooks/useGenreAssessment';
import { outcomeMistake, type NextStepSuggestion } from '@/curriculum/practice';
import type { GuitarSetupStep } from '@/learn/components/guitar/GuitarInputSetup';
import { GuitarTroubleshootList } from '@/learn/components/guitar/GuitarTroubleshootList';
import type { GuitarStepKind } from './useGuitarLessonEvaluation';

// ── Guitar result extras ───────────────────────────────────────────────────
// What the guitar result modal adds under the score: the sub-scores, "Show
// mistakes", one concrete next step, the troubleshooting list when the take
// couldn't be heard, and "Count it myself" once detection has had its turns.
// The modal itself (score, feedback, Try Again / Next) stays the lesson's.

/** The modal heading for a guitar take, where it differs from the score. */
export function guitarResultHeading(result: AssessmentResult): string | null {
  if (result.unclear) return "Couldn't hear that clearly";
  if (result.selfReported) return '✓ Counted by you';
  return null;
}

/** Whether the take has anything "Show mistakes" would mark. */
export function hasMarkedMistakes(result: AssessmentResult): boolean {
  return (result.outcomes ?? []).some((o) => {
    const kind = outcomeMistake(o);
    return kind !== null && kind !== 'unclear';
  });
}

const pct = (value: number) => `${Math.round(value * 100)}%`;

export interface GuitarResultExtrasProps {
  result: AssessmentResult;
  stepKind: GuitarStepKind;
  keyColor: string;
  next: NextStepSuggestion | null;
  onNextStep: () => void;
  onShowMistakes: () => void;
  /** Offer the self-count (after repeated unclear or failed takes). */
  canCountItMyself: boolean;
  onCountItMyself: () => void;
  onOpenSetup?: (step: GuitarSetupStep) => void;
}

export function GuitarResultExtras({
  result,
  stepKind,
  keyColor,
  next,
  onNextStep,
  onShowMistakes,
  canCountItMyself,
  onCountItMyself,
  onOpenSetup,
}: GuitarResultExtrasProps) {
  if (result.selfReported) return null;

  const scores = [
    {
      label: stepKind === 'chords' ? 'Chords' : 'Notes',
      value: result.pitchAccuracy,
    },
    ...(result.timingAccuracy !== null
      ? [{ label: 'Timing', value: result.timingAccuracy }]
      : []),
    ...(result.durationAccuracy !== null
      ? [{ label: 'Length', value: result.durationAccuracy }]
      : []),
  ];

  return (
    <div
      data-guitar-result-extras
      className="mb-5 flex flex-col items-center gap-3 text-left"
    >
      {result.unclear ? (
        <GuitarTroubleshootList onOpenSetup={onOpenSetup} />
      ) : (
        <dl className="flex flex-wrap justify-center gap-x-5 gap-y-1 text-[13px]">
          {scores.map((score) => (
            <div key={score.label} className="flex items-baseline gap-1.5">
              <dt className="text-white/60">{score.label}</dt>
              <dd className="font-semibold text-white">{pct(score.value)}</dd>
            </div>
          ))}
        </dl>
      )}

      {!result.unclear && (hasMarkedMistakes(result) || next) && (
        <div className="flex flex-wrap justify-center gap-2">
          {hasMarkedMistakes(result) && (
            <button
              type="button"
              onClick={onShowMistakes}
              className="rounded-full border border-white/25 px-4 py-1.5 text-[13px] text-white hover:bg-white/10"
            >
              Show mistakes
            </button>
          )}
          {next && (
            <button
              type="button"
              onClick={onNextStep}
              className="rounded-full px-4 py-1.5 text-[13px] font-semibold text-black"
              style={{ background: keyColor }}
            >
              {next.label}
            </button>
          )}
        </div>
      )}

      {canCountItMyself && (
        <button
          type="button"
          onClick={onCountItMyself}
          className="bg-transparent p-0 text-[13px] text-white/70 underline hover:text-white"
        >
          Count it myself
        </button>
      )}
    </div>
  );
}
