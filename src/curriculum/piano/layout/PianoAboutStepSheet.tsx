import { lessonTitle } from '@/curriculum/guitar/layout/GuitarLessonHeader';
import { GuitarSheet } from '@/curriculum/guitar/layout/settingsControls';
import type { KeyDescription } from '@/lib/learn/keyDescription';

// ── PianoAboutStepSheet ────────────────────────────────────────────────────
// "About this step" on piano, in guitar's sheet: the full instruction, the
// lesson's goal (when it has one), the step's chords, and the key in words,
// as the Theory overview tells it. Like
// guitar's sheet it takes no key colour: nothing in it is "now".

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

const HEADING =
  'pb-2 text-xs font-normal uppercase tracking-[0.14em] text-white/45';

export function PianoAboutStepSheet({
  open,
  onOpenChange,
  about,
}: PianoAboutStepSheetProps) {
  const { instruction, chords, key, goal } = about;
  return (
    <GuitarSheet
      open={open}
      onOpenChange={onOpenChange}
      modal
      name="about"
      eyebrow="About this step"
      title={lessonTitle(about.activity)}
      width={440}
    >
      <div className="flex flex-col divide-y divide-white/[0.08] text-left [&>*:first-child]:pt-0 [&>*:last-child]:pb-0 [&>*]:py-5">
        {instruction && (
          <p data-about-instruction className="text-[15px] leading-6">
            {instruction}
          </p>
        )}
        {goal && (
          <section data-about-goal>
            <h3 className={HEADING}>The goal</h3>
            <p className="text-[15px] leading-6">{goal}</p>
          </section>
        )}
        {chords.length > 0 && (
          <section data-about-chords>
            <h3 className={HEADING}>The chords</h3>
            <p className="text-[15px] leading-6">{chords.join(' → ')}</p>
          </section>
        )}
        {key && (
          <section data-about-key>
            <h3 className={HEADING}>About {key.title}</h3>
            <div className="flex flex-col gap-2 text-[15px] leading-6">
              {key.character && (
                <p className="text-white/70">{key.character}.</p>
              )}
              {key.signature && (
                <p>
                  The key of {key.title} {key.signature}.
                </p>
              )}
              {key.degrees && <p>Scale degrees: {key.degrees}</p>}
              <p>The notes of the scale: {key.notes.join(', ')}</p>
            </div>
          </section>
        )}
      </div>
    </GuitarSheet>
  );
}
