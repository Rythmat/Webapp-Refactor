import { ArrowRight } from 'lucide-react';
import { PROMPT_SURFACE } from '@/components/promptBox/PromptBoxParts';
import { cn } from '@/components/utilities';
import {
  circleOfFifths,
  type MissingChoice,
} from '@/curriculum/engine/musicLiteracy/choices';

// ── First, choose ──────────────────────────────────────────────────────────
// A Part 2 step that plays in the student's key, mode or chords waits until
// they've chosen them (choices.ts missingChoices): one friendly line and a
// link to the step that chooses (the gate's, for the key and the mode). Its
// heading and its button in Title Case, the line in a sentence.

/** The circle's twelve colors, as a little wheel. */
const WHEEL = `conic-gradient(from -15deg, ${circleOfFifths('major')
  .map((key) => key.color)
  .join(', ')}, ${circleOfFifths('major')[0].color})`;

const COPY: Record<
  MissingChoice['choice'],
  { heading: string; line: string; go: string }
> = {
  key: {
    heading: 'First, Choose Your Key',
    line: 'This step plays in your key.',
    go: 'Choose Your Key',
  },
  mode: {
    heading: 'First, Choose Major or Minor',
    line: 'This step sounds different in each.',
    go: 'Choose Major or Minor',
  },
  progression: {
    heading: 'First, Choose the Chords',
    line: 'This step plays the chords you pick.',
    go: 'Choose the Chords',
  },
};

/** A progression of one chosen chord: "a chord", not "the chords". */
const ONE_CHORD = {
  heading: 'First, Choose a Chord',
  line: 'This step plays the chord you pick.',
  go: 'Choose a Chord',
};

/**
 * The words for a missing choice: its heading and its link. A progression
 * says "a chord" when its step picks just one (`chords`, its distinct count).
 */
export const gateCopy = (missing: MissingChoice, chords?: number) =>
  missing.choice === 'progression' && chords === 1
    ? ONE_CHORD
    : COPY[missing.choice];

export interface ChoiceGateProps {
  missing: MissingChoice;
  /** How many different chords the progression's step picks, if known. */
  chords?: number;
  /** Open the step that makes the choice; null when the lesson has none. */
  onGo: (() => void) | null;
}

export function ChoiceGate({ missing, chords, onGo }: ChoiceGateProps) {
  const copy = gateCopy(missing, chords);
  return (
    <section
      aria-label={copy.heading}
      data-literacy-gate={missing.choice}
      className={cn(
        PROMPT_SURFACE,
        'flex min-h-[280px] flex-1 flex-col items-center justify-center gap-4 p-8 text-center',
      )}
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
