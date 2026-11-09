import { useEffect, useMemo, useState } from 'react';
import { useFrettedInstrument } from '@/components/guitar/frettedInstrumentContext';
import { GuitarSectionBCard } from '@/curriculum/components/guitar/theory/GuitarSectionBCard';
import {
  GuitarKeyNotes,
  GuitarStepNotes,
} from '@/curriculum/components/guitar/theory/GuitarStepNotes';
import {
  activityId,
  isSectionBCardDue,
  markSectionBCardSeen,
  noteSeenId,
  sectionBCardBarreCare,
  stepTheoryNotes,
} from '@/curriculum/components/guitar/theory/theoryUi';
import {
  INSIGHT_TEXT,
  InsightCard,
} from '@/daw/components/Library/InsightCard';
import { useGuitarDisplaySettings } from '@/features/learn/useGuitarDisplaySettings';
import { LessonInsightPanel } from './LessonInsightPanel';
import type { TheoryModel } from './types';

// ── GuitarAboutStepSheet ───────────────────────────────────────────────────
// "About this step", in the Studio's Insight panel and cards: everything
// the lesson explains about the step, on request only. In order: the full instruction; on Section B steps, "Chords
// come from the scale" (open while it is new for the key); the step's intro
// notes, open; "More notes"; the practice tips while practising; "Same
// root, four kinds" on B7; and "About {key} major". Opening the sheet marks
// what it shows as seen, which clears the button's dot; showing it (or
// rendering the sheet closed) marks nothing.

/** The sheet shows nothing "now": its diagrams and chips take no key colour. */
const INK = '#e8e8f0';

export interface GuitarAboutStepSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  theory: TheoryModel;
  /** The step's full instruction (currentStep.direction). */
  instruction: string;
}

/** 'A1.1: Major Scale Ascending (Out of Time)' → 'Major Scale Ascending'. */
function stepTitle(activity: string): string {
  return activity
    .replace(/^[^:]*:\s*/, '')
    .replace(/\s*\((?:Out of|In) Time\)\s*$/, '');
}

export function GuitarAboutStepSheet({
  open,
  onOpenChange,
  theory,
  instruction,
}: GuitarAboutStepSheetProps) {
  const onUkulele = useFrettedInstrument().id === 'ukulele';
  return (
    // The Studio's Insight (owner, 2026-10-26): its panel and its cards.
    <LessonInsightPanel
      open={open}
      onClose={() => onOpenChange(false)}
      name="about"
      title="About this step"
    >
      {/* Mounted while open only: a new step, or a new opening, starts over */}
      {onUkulele ? (
        // The theory notes describe guitar grips and strings: a ukulele
        // step shows its instruction alone.
        <InsightCard title={stepTitle(theory.step.activity)} data-about-step>
          {instruction && (
            <p data-about-instruction className={INSIGHT_TEXT}>
              {instruction}
            </p>
          )}
        </InsightCard>
      ) : (
        <AboutStep
          key={`${theory.keyCenter}|${activityId(theory.step)}`}
          theory={theory}
          instruction={instruction}
        />
      )}
    </LessonInsightPanel>
  );
}

function AboutStep({
  theory,
  instruction,
}: {
  theory: TheoryModel;
  instruction: string;
}) {
  const { flow, step, keyCenter, sectionId } = theory;
  const dismissNote = useGuitarDisplaySettings((s) => s.dismissNote);
  const showRomanNumerals = useGuitarDisplaySettings(
    (s) => s.showRomanNumerals,
  );
  const onSectionB = sectionId === 'B';

  // What was new as the sheet opened stays open while it is read, though
  // opening marks it seen straight away.
  const [cardWasDue] = useState(
    () =>
      onSectionB &&
      isSectionBCardDue(
        keyCenter,
        useGuitarDisplaySettings.getState().dismissedNotes,
      ),
  );
  // Hand care, once on the sheet, never twice. In keys whose Section B opens
  // with barres, the Section B block carries it while the block is new, and
  // the step's notes leave it out; once the block has been read, the step's
  // own notes carry it and the block leaves it out.
  const barreCare = useMemo(
    () =>
      onSectionB ? (sectionBCardBarreCare(flow, keyCenter)?.id ?? null) : null,
    [onSectionB, flow, keyCenter],
  );
  const stepHasBarreCare = useMemo(
    () =>
      !!barreCare &&
      stepTheoryNotes(flow, step, keyCenter).intro.some(
        (note) => note.id === barreCare,
      ),
    [barreCare, flow, step, keyCenter],
  );
  const blockHasBarreCare = cardWasDue || !stepHasBarreCare;
  const heldByCard = blockHasBarreCare ? barreCare : null;

  // Opening is reading: the step's intro notes and the Section B block are
  // seen from now on.
  useEffect(() => {
    const { intro } = stepTheoryNotes(flow, step, keyCenter, showRomanNumerals);
    for (const note of intro) dismissNote(noteSeenId(note.id, keyCenter));
    if (onSectionB) markSectionBCardSeen(dismissNote, flow, keyCenter);
    // Once per opening (and per step while open), not per setting change.
  }, []);

  return (
    <>
      <InsightCard title={stepTitle(step.activity)} data-about-step>
        {instruction && (
          <p data-about-instruction className={INSIGHT_TEXT}>
            {instruction}
          </p>
        )}
      </InsightCard>
      {onSectionB && (
        <InsightCard>
          <GuitarSectionBCard
            variant="section"
            defaultOpen={cardWasDue}
            withBarreCare={blockHasBarreCare}
            flow={flow}
            keyCenter={keyCenter}
            keyColor={INK}
          />
        </InsightCard>
      )}
      <InsightCard>
        <GuitarStepNotes
          flow={flow}
          step={step}
          keyCenter={keyCenter}
          practising={theory.practising}
          onHearShape={theory.onHearShape}
          keyColor={INK}
          exclude={heldByCard ? [heldByCard] : undefined}
        />
      </InsightCard>
      <InsightCard>
        <GuitarKeyNotes keyCenter={keyCenter} keyColor={INK} />
      </InsightCard>
    </>
  );
}

/**
 * The "About this step" button's unseen dot: the step has intro notes not
 * yet seen on this device, or the Section B content is due for this key.
 */
export function useAboutStepNews(theory: TheoryModel): boolean {
  const { flow, step, keyCenter, sectionId } = theory;
  const onUkulele = useFrettedInstrument().id === 'ukulele';
  const dismissedNotes = useGuitarDisplaySettings((s) => s.dismissedNotes);
  const showRomanNumerals = useGuitarDisplaySettings(
    (s) => s.showRomanNumerals,
  );
  const intro = useMemo(
    () =>
      onUkulele
        ? []
        : stepTheoryNotes(flow, step, keyCenter, showRomanNumerals).intro,
    [onUkulele, flow, step, keyCenter, showRomanNumerals],
  );
  if (onUkulele) return false;
  if (sectionId === 'B' && isSectionBCardDue(keyCenter, dismissedNotes)) {
    return true;
  }
  return intro.some(
    (note) => !dismissedNotes.includes(noteSeenId(note.id, keyCenter)),
  );
}
