import { memo, useId, useMemo, useState } from 'react';
import { cn } from '@/components/utilities';
import {
  GUITAR_ATLAS_BOOK_ONE,
  getGuitarShape,
} from '@/curriculum/data/guitar/bookOne';
import { notesFor } from '@/curriculum/data/guitar/theoryNotes';
import type { GuitarKeyName } from '@/curriculum/data/guitar/types';
import type {
  ActivityFlowV2,
  ActivityStepV2,
} from '@/curriculum/types/activity.v2';
import { useGuitarDisplaySettings } from '@/features/learn/useGuitarDisplaySettings';
import { ChordFamilyStrip } from './ChordFamilyStrip';
import { SameRootCompare } from './SameRootCompare';
import {
  BlockLabel,
  COMPARE_SHEET_LOOK,
  DisclosureHeading,
  FAMILY_STRIP_SHEET_LOOK,
  InfoItem,
  NoteCard,
} from './noteParts';
import { activityId, stepTheoryNotes } from './theoryUi';

// ── GuitarStepNotes ────────────────────────────────────────────────────────
// A step's theory notes as the About this step sheet shows them, all of them
// at once and nothing opening by itself: the step's intro notes, open; the
// rest under "More notes", one line each until asked for; the practice tips
// while the student practises; and on 7th-chord arpeggio steps, "Same root,
// four kinds". Showing notes marks nothing seen; the sheet does that when it
// opens. Every sentence is authored in theoryNotes.ts. Display only.

/** Sheet ink: the sheet shows nothing "now", so no key colour. */
const INK = '#e8e8f0';

/** One block of the sheet; blocks are divided by hairlines. */
const BLOCK = 'flex flex-col py-5 first:pt-0 last:pb-0';

export interface GuitarStepNotesProps {
  flow: ActivityFlowV2;
  /** The step as the flow has it. */
  step: ActivityStepV2;
  keyCenter: GuitarKeyName;
  /** Add the practice tips (pt.*). */
  practising?: boolean;
  /** B7 steps: "Same root, four kinds" with Hear it. Omitted = no panel. */
  onHearShape?: (frets: string) => void;
  /** The compare panel's diagram ink. */
  keyColor?: string;
  /** Intro notes another block of the sheet shows (the Section B card's hand care). */
  exclude?: readonly string[];
  className?: string;
}

export const GuitarStepNotes = memo(function GuitarStepNotes({
  flow,
  step,
  keyCenter,
  practising = false,
  onHearShape,
  keyColor = INK,
  exclude,
  className,
}: GuitarStepNotesProps) {
  const moreId = useId();
  const tipsId = useId();
  const showRomanNumerals = useGuitarDisplaySettings(
    (s) => s.showRomanNumerals,
  );
  const notes = useMemo(
    () => stepTheoryNotes(flow, step, keyCenter, showRomanNumerals),
    [flow, step, keyCenter, showRomanNumerals],
  );

  const intro = notes.intro.filter((n) => !exclude?.includes(n.id));
  const tips = practising ? notes.practice : [];
  const shape =
    notes.prefix === 'B7' && notes.theoryStep.shapeIds.length === 1
      ? getGuitarShape(notes.theoryStep.shapeIds[0])
      : undefined;
  const compare = shape && onHearShape ? shape : undefined;
  // A new step starts with every "More notes" item closed.
  const stepKey = `${keyCenter}|${activityId(step)}`;

  if (!intro.length && !notes.info.length && !tips.length && !compare) {
    return null;
  }

  return (
    <div
      data-guitar-step-notes
      className={cn(
        'flex flex-col divide-y divide-white/[0.08] text-left',
        className,
      )}
    >
      {intro.length > 0 && (
        <div data-step-intro className={cn(BLOCK, 'gap-5')}>
          {intro.map((note) => (
            <NoteCard key={note.id} variant="sheet" note={note} />
          ))}
        </div>
      )}
      {notes.info.length > 0 && (
        <section aria-labelledby={moreId} className={cn(BLOCK, 'gap-2')}>
          <BlockLabel id={moreId}>More notes</BlockLabel>
          <ul aria-labelledby={moreId} className="flex flex-col">
            {notes.info.map((note) => (
              <InfoItem
                key={`${stepKey}|${note.id}`}
                variant="sheet"
                note={note}
              />
            ))}
          </ul>
        </section>
      )}
      {tips.length > 0 && (
        <section aria-labelledby={tipsId} className={cn(BLOCK, 'gap-4')}>
          <BlockLabel id={tipsId}>Practice tips</BlockLabel>
          {tips.map((note) => (
            <NoteCard key={note.id} variant="sheet" note={note} />
          ))}
        </section>
      )}
      {compare && (
        <div className={cn(BLOCK, COMPARE_SHEET_LOOK)}>
          <SameRootCompare
            chordShape={compare}
            keyCenter={keyCenter}
            keyColor={keyColor}
            onHearShape={onHearShape}
          />
        </div>
      )}
    </div>
  );
});

// ── GuitarKeyNotes ─────────────────────────────────────────────────────────
// "About {key} major": what GuitarKeyIntro says about the key (the note it
// changes, why the keys come in this order, its minor partner) and its chord
// family, as a block of the sheet that opens on request.

export interface GuitarKeyNotesProps {
  keyCenter: GuitarKeyName;
  /** The chord family's ink. */
  keyColor?: string;
  defaultOpen?: boolean;
  className?: string;
}

export const GuitarKeyNotes = memo(function GuitarKeyNotes({
  keyCenter,
  keyColor = INK,
  defaultOpen = false,
  className,
}: GuitarKeyNotesProps) {
  const [open, setOpen] = useState(defaultOpen);
  const headingId = useId();
  const bodyId = useId();
  const showRomanNumerals = useGuitarDisplaySettings(
    (s) => s.showRomanNumerals,
  );
  const center = GUITAR_ATLAS_BOOK_ONE[keyCenter];
  const notes = useMemo(() => {
    const all = notesFor('KEY', {
      center,
      settings: { accidentals: 'unicode' },
    });
    return [...all.intro, ...all.info];
  }, [center]);

  return (
    <section
      data-guitar-key-notes
      aria-labelledby={headingId}
      className={cn('flex flex-col text-left', className)}
    >
      <DisclosureHeading
        id={headingId}
        open={open}
        onToggle={() => setOpen(!open)}
        controls={bodyId}
      >
        About {center.displayName} major
      </DisclosureHeading>
      {open && (
        <div id={bodyId} className="flex flex-col gap-5 pt-2">
          {notes.map((note) => (
            <NoteCard key={note.id} variant="sheet" note={note} />
          ))}
          <div className={FAMILY_STRIP_SHEET_LOOK}>
            <ChordFamilyStrip
              keyCenter={keyCenter}
              keyColor={keyColor}
              showRomanNumerals={showRomanNumerals}
            />
          </div>
        </div>
      )}
    </section>
  );
});
