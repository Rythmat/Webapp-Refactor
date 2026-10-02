import { Hand } from 'lucide-react';
import { useId } from 'react';
import { GuitarTroubleshootList } from '@/learn/components/guitar/GuitarTroubleshootList';
import type { ResultModel } from './types';

// ── Result panel ───────────────────────────────────────────────────────────
// After a take, in the big visuals area above the TAB, at its own height and
// centred there (the TAB stays where it is below, now with the mistakes
// marked on it). The score and what it means in words, the
// feedback, the sub-scores, one suggested loop, and a line saying what the
// marks on the TAB mean. A take that couldn't be heard gets the things to
// try instead; a step the student counted gets the hand. Colour never says
// pass or fail on its own: nothing here is coloured at all.

const pct = (value: number) => `${Math.round(value * 100)}%`;

/** The marks on the TAB, by shape, as MistakeMarkersOverlay draws them. */
const MARK_LEGEND = '✗ missed · ≠ wrong · ◀ ▶ early or late';

/** "Passed" / "Not yet · 75% passes"; nothing for an unclear or counted take. */
function resultStatus(model: ResultModel, passMarkPct: number): string | null {
  const { result } = model;
  if (result.selfReported || result.unclear) return null;
  return result.passed ? 'Passed' : `Not yet · ${passMarkPct}% passes`;
}

/**
 * The result in one line for a screen reader to announce when it appears:
 * "62%. Not yet: 75% passes." The panel itself turns up in place of the
 * visuals, where nothing would otherwise say it arrived.
 */
export function resultSummary(model: ResultModel, passMarkPct: number): string {
  const heading =
    model.headingOverride?.replace(/^✓\s*/, '') ??
    pct(model.result.overallScore);
  const status = resultStatus(model, passMarkPct);
  return status ? `${heading}. ${status.replace(' · ', ': ')}.` : `${heading}.`;
}

export interface GuitarResultPanelProps {
  result: ResultModel;
  /** The step's pass mark, for "Not yet · 75% passes". */
  passMarkPct: number;
}

export function GuitarResultPanel({
  result: model,
  passMarkPct,
}: GuitarResultPanelProps) {
  const headingId = useId();
  const { result, headingOverride, feedback, suggestion, hasMistakes } = model;
  const selfReported = !!result.selfReported;
  const unclear = !!result.unclear;

  const status = resultStatus(model, passMarkPct);

  const scores = [
    {
      label: model.stepKind === 'chords' ? 'Chords' : 'Notes',
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
    <section
      aria-labelledby={headingId}
      data-guitar-result
      data-passed={result.passed}
      className="my-auto flex max-h-full min-h-0 gap-8 overflow-y-auto rounded-xl border border-white/[0.08] bg-[#151518] p-5 max-[639px]:flex-col max-[639px]:gap-4"
    >
      <div className="flex min-w-0 max-w-[420px] shrink-0 flex-col gap-2 max-[639px]:max-w-none">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h2
            id={headingId}
            className={
              headingOverride
                ? 'flex items-center gap-2 text-2xl font-normal leading-8 text-[#e8e8f0]'
                : 'text-5xl font-normal leading-[3.25rem] text-[#e8e8f0]'
            }
          >
            {selfReported && <Hand className="size-6 shrink-0 text-white/55" />}
            <ResultHeading
              text={headingOverride ?? pct(result.overallScore)}
              selfReported={selfReported}
            />
          </h2>
          {status && (
            <p data-guitar-result-status className="text-[15px] text-white/55">
              {status}
            </p>
          )}
        </div>
        {feedback && (
          <p className="text-[15px] leading-6 text-white/55">{feedback}</p>
        )}
      </div>

      {!selfReported && (
        <div
          data-guitar-result-extras
          className="flex min-w-0 flex-1 flex-col gap-3"
        >
          {unclear ? (
            <GuitarTroubleshootList onOpenSetup={model.onOpenSetup} />
          ) : (
            <>
              <dl className="flex flex-wrap gap-x-8 gap-y-2">
                {scores.map((score) => (
                  <div key={score.label} className="flex flex-col">
                    <dt className="text-xs uppercase tracking-[0.14em] text-white/45">
                      {score.label}
                    </dt>
                    <dd className="text-xl leading-7 text-[#e8e8f0]">
                      {pct(score.value)}
                    </dd>
                  </div>
                ))}
              </dl>
              {suggestion && (
                <div>
                  <button
                    type="button"
                    onClick={model.onSuggestion}
                    className="inline-flex h-9 items-center rounded-full border border-white/15 bg-white/[0.04] px-4 text-sm font-normal text-[#e8e8f0] transition-colors duration-150 hover:bg-white/[0.08] max-[639px]:h-11"
                  >
                    {suggestion.label}
                  </button>
                </div>
              )}
              {hasMistakes && (
                <p data-guitar-result-legend className="text-xs text-white/55">
                  Marked on the TAB: {MARK_LEGEND}. Tap a mark to loop its bar.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}

/**
 * The heading's text. "✓ Counted by you" keeps its tick for assistive tech
 * (and the name tests look for), but the eye gets the hand icon instead.
 */
function ResultHeading({
  text,
  selfReported,
}: {
  text: string;
  selfReported: boolean;
}) {
  if (selfReported && text.startsWith('✓ ')) {
    return (
      <>
        <span className="sr-only">✓ </span>
        {text.slice(2)}
      </>
    );
  }
  return <>{text}</>;
}
