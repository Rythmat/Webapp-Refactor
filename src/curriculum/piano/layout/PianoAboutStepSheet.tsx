import { lessonTitle } from '@/curriculum/guitar/layout/GuitarLessonHeader';
import { LessonInsightPanel } from '@/curriculum/guitar/layout/LessonInsightPanel';
import {
  INSIGHT_DIM,
  INSIGHT_TEXT,
  InsightCard,
} from '@/daw/components/Library/InsightCard';
import type { KeyDescription } from '@/lib/learn/keyDescription';

// ── PianoAboutStepSheet ────────────────────────────────────────────────────
// "About this step" on piano, in the Studio's Insight panel and cards: the
// step and its full instruction, the lesson's goal (when it has one), the
// step's chords, and the key in words, as the Theory overview tells it. It
// takes no key colour: nothing in it is "now".

export interface PianoAboutModel {
  /** The step's full activity line: "A1.1: Major Scale Ascending (Out of Time)". */
  activity: string;
  /** currentStep.direction: what to play. */
  instruction: string;
  /** The step's chords as the chord notation setting writes them. */
  chords: string[];
  /** The key, when the lesson can spell its mode. */
  key: KeyDescription | null;
  /** The lesson's goal, when it has one (Music Literacy Part 2). */
  goal?: string | null;
}

export interface PianoAboutStepSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  about: PianoAboutModel;
}

export function PianoAboutStepSheet({
  open,
  onOpenChange,
  about,
}: PianoAboutStepSheetProps) {
  const { instruction, chords, key, goal } = about;
  return (
    // The Studio's Insight (owner, 2026-10-26): its panel and its cards.
    <LessonInsightPanel
      open={open}
      onClose={() => onOpenChange(false)}
      name="about"
      title="About this step"
    >
      <InsightCard title={lessonTitle(about.activity)} data-about-step>
        {instruction && (
          <p data-about-instruction className={INSIGHT_TEXT}>
            {instruction}
          </p>
        )}
      </InsightCard>
      {goal && (
        <InsightCard title="The goal" data-about-goal>
          <p className={INSIGHT_TEXT}>{goal}</p>
        </InsightCard>
      )}
      {chords.length > 0 && (
        <InsightCard title="The chords" data-about-chords>
          <p className={INSIGHT_TEXT}>{chords.join(' → ')}</p>
        </InsightCard>
      )}
      {key && (
        <InsightCard title={`About ${key.title}`} data-about-key>
          {key.character && <p className={INSIGHT_TEXT}>{key.character}.</p>}
          <div className="flex flex-col gap-1">
            {key.signature && (
              <p className={INSIGHT_DIM}>
                The key of {key.title} {key.signature}.
              </p>
            )}
            {key.degrees && (
              <p className={INSIGHT_DIM}>Scale degrees: {key.degrees}</p>
            )}
            <p className={INSIGHT_DIM}>
              The notes of the scale: {key.notes.join(', ')}
            </p>
          </div>
        </InsightCard>
      )}
    </LessonInsightPanel>
  );
}
