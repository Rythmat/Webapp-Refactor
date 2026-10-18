import { ArrowRight } from 'lucide-react';
import {
  circleOfFifths,
  type MissingChoice,
} from '@/curriculum/engine/musicLiteracy/choices';

// ── First, choose ──────────────────────────────────────────────────────────
// A Part 2 step that plays in the student's key, mode or chords waits until
// they've chosen them (choices.ts missingChoices): one friendly line and a
// link to the step that chooses.

/** The circle's twelve colors, as a little wheel. */
const WHEEL = `conic-gradient(from -15deg, ${circleOfFifths('major')
  .map((key) => key.color)
  .join(', ')}, ${circleOfFifths('major')[0].color})`;

const COPY: Record<
  MissingChoice['choice'],
  { heading: string; line: string; go: string }
> = {
  key: {
    heading: 'First, choose your color',
    line: 'This step plays in your key.',
    go: 'Choose your color',
  },
  mode: {
    heading: 'First, choose major or minor',
    line: 'This step sounds different in each.',
    go: 'Choose major or minor',
  },
  progression: {
    heading: 'First, choose your chords',
    line: 'This step plays the chords you pick.',
    go: 'Choose your chords',
  },
};

/** The words for a missing choice: the gate's heading and its link. */
export const gateCopy = (missing: MissingChoice) => COPY[missing.choice];

export interface ChoiceGateProps {
  missing: MissingChoice;
  /** Open the step that makes the choice; null when the lesson has none. */
  onGo: (() => void) | null;
}

export function ChoiceGate({ missing, onGo }: ChoiceGateProps) {
  const copy = COPY[missing.choice];
  return (
    <section
      aria-label={copy.heading}
      data-literacy-gate={missing.choice}
      className="flex min-h-[280px] flex-1 flex-col items-center justify-center gap-4 rounded-xl border border-white/[0.08] bg-white/[0.03] p-8 text-center"
    >
      <span
        aria-hidden
        className="size-14 rounded-full"
        style={{ background: WHEEL }}
      />
      <h2 className="text-[28px] font-normal leading-9 text-[#e8e8f0]">
        {copy.heading}
      </h2>
      <p className="text-[15px] text-white/55">{copy.line}</p>
      {onGo && (
        <button
          type="button"
          onClick={onGo}
          className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-7 text-base font-medium text-[#101012] transition-opacity hover:opacity-90"
        >
          {copy.go}
          <ArrowRight className="size-4" />
        </button>
      )}
    </section>
  );
}
