import { Info } from 'lucide-react';
import { memo, useEffect, useId, useMemo, useRef, useState } from 'react';
import { cn } from '@/components/utilities';
import {
  GUITAR_ATLAS_BOOK_ONE,
  getGuitarShape,
} from '@/curriculum/data/guitar/bookOne';
import {
  theoryStepsFor,
  type TheoryStep,
} from '@/curriculum/data/guitar/theoryConditions';
import {
  notesFor,
  stepPrefix,
  type ResolvedTheoryNote,
} from '@/curriculum/data/guitar/theoryNotes';
import type { GuitarKeyName } from '@/curriculum/data/guitar/types';
import type {
  ActivityFlowV2,
  ActivityStepV2,
} from '@/curriculum/types/activity.v2';
import { useGuitarDisplaySettings } from '@/features/learn/useGuitarDisplaySettings';
import { GuitarTheoryToggles } from './GuitarTheoryToggles';
import { SameRootCompare } from './SameRootCompare';
import { InfoItem, NoteCard } from './noteParts';
import {
  CHANGE_PREFIXES,
  isSectionBCardDue,
  noteSeenId,
  rankInfoNotes,
  sectionBCardBarreCare,
  toTheoryStep,
} from './theoryUi';

// ── GuitarTheoryPanel ──────────────────────────────────────────────────────
// The guitar branch of the step description area. One idea at a time: at
// most one intro note opens by itself on a step — the first of the step's
// intro notes this device has not seen yet — so a subsection's notes open one
// per step, in order, from its first step. A note that has been shown, or
// closed, sits as a "Why?" link from then on. The rest waits in the (i)
// drawer, most relevant first. While the Section B card is due and carries
// the hand-care note, the panel leaves that note to the card. Focus follows
// the note: to it when opened, back to its "Why?" link when closed. Display
// only: nothing here changes grading.

const EMPTY: readonly ResolvedTheoryNote[] = [];

export interface GuitarTheoryPanelProps {
  flow: ActivityFlowV2;
  /** The step on screen. */
  step: ActivityStepV2;
  keyCenter: GuitarKeyName;
  /**
   * This key's steps in flow order, for the "first barre / drop 3 step in
   * this key" notes. Defaults to the flow's steps.
   */
  sectionSteps?: readonly TheoryStep[];
  /** Add the practice-tool notes (pt.*) to the (i) drawer. */
  includePractice?: boolean;
  /** Accents, and the B7 compare panel's boxes. */
  keyColor?: string;
  /** B7 steps: "Same root, four kinds" with Hear it. Omitted = no panel. */
  onHearShape?: (frets: string) => void;
  /** Offer the teacher setting "Show Roman numerals" beside the layer switches. */
  allowRomanToggle?: boolean;
  className?: string;
}

export const GuitarTheoryPanel = memo(function GuitarTheoryPanel({
  flow,
  step,
  keyCenter,
  sectionSteps,
  includePractice = false,
  keyColor = 'var(--color-text-dim, #9a9aab)',
  onHearShape,
  allowRomanToggle = false,
  className,
}: GuitarTheoryPanelProps) {
  const headingId = useId();
  const drawerId = useId();
  const sectionRef = useRef<HTMLElement>(null);
  /** Where focus goes after the next render: the open note, or a "Why?" link. */
  const focusNext = useRef<{ card: true } | { why: string } | null>(null);
  const dismissedNotes = useGuitarDisplaySettings((s) => s.dismissedNotes);
  const dismissNote = useGuitarDisplaySettings((s) => s.dismissNote);
  const showRomanNumerals = useGuitarDisplaySettings(
    (s) => s.showRomanNumerals,
  );

  const center = GUITAR_ATLAS_BOOK_ONE[keyCenter];
  const steps = useMemo(
    () => sectionSteps ?? theoryStepsFor(flow),
    [flow, sectionSteps],
  );
  const theoryStep = useMemo(
    () => toTheoryStep(flow, steps, step),
    [flow, steps, step],
  );
  const prefix = stepPrefix(theoryStep.id);

  const notes = useMemo(() => {
    if (!prefix) return { intro: EMPTY, info: EMPTY };
    const settings = { showRomanNumerals, accidentals: 'unicode' as const };
    const own = notesFor(prefix, { center, step: theoryStep, steps, settings });
    const practice = includePractice
      ? notesFor('PRACTICE', { center, settings })
      : null;
    return {
      intro: own.intro,
      info: rankInfoNotes([
        ...own.info,
        ...(practice ? [...practice.info, ...practice.popover] : []),
      ]),
    };
  }, [prefix, center, theoryStep, steps, showRomanNumerals, includePractice]);

  // The Section B card carries hand care in keys whose barres start on its
  // step; until it is closed, the panel must not open the same note too.
  const cardBarreCare = useMemo(
    () => sectionBCardBarreCare(flow, keyCenter)?.id ?? null,
    [flow, keyCenter],
  );
  const heldByCard =
    cardBarreCare && isSectionBCardDue(keyCenter, dismissedNotes)
      ? cardBarreCare
      : null;

  // The note that opens by itself is picked when the step is entered and
  // then held for it, although it is marked seen straight away.
  const stepKey = `${keyCenter}|${theoryStep.id}`;
  const candidate =
    notes.intro.find(
      (n) =>
        n.id !== heldByCard &&
        !dismissedNotes.includes(noteSeenId(n.id, keyCenter)),
    )?.id ?? null;
  const [entered, setEntered] = useState<{
    stepKey: string;
    autoId: string | null;
  } | null>(null);
  const autoId = entered?.stepKey === stepKey ? entered.autoId : candidate;
  useEffect(() => {
    // Only the first pick on a step counts: marking it seen changes the
    // candidate, which must not replace it.
    setEntered((prev) =>
      prev?.stepKey === stepKey ? prev : { stepKey, autoId: candidate },
    );
  }, [stepKey, candidate]);
  useEffect(() => {
    if (entered?.autoId) dismissNote(noteSeenId(entered.autoId, keyCenter));
  }, [entered, dismissNote, keyCenter]);

  // One note open at a time; the student's choice holds for this step.
  const [chosen, setChosen] = useState<{
    stepKey: string;
    openId: string | null;
  } | null>(null);
  const openId = chosen?.stepKey === stepKey ? chosen.openId : autoId;
  // The (i) drawer starts closed on every step.
  const [drawerStep, setDrawerStep] = useState<string | null>(null);
  const drawerOpen = drawerStep === stepKey;
  const setDrawerOpen = (on: boolean) => setDrawerStep(on ? stepKey : null);

  // A note read through its "Why?" link has been seen too.
  const openNote = (id: string | null) => {
    if (id) dismissNote(noteSeenId(id, keyCenter));
    setChosen({ stepKey, openId: id });
  };
  const whyOpen = (id: string) => {
    openNote(id);
    focusNext.current = { card: true };
  };
  const closeNote = (id: string) => {
    dismissNote(noteSeenId(id, keyCenter));
    openNote(null);
    focusNext.current = { why: id };
  };

  // The button that was pressed leaves the page (the link becomes the note,
  // the note becomes the link), so focus moves with it instead of dropping
  // to the page.
  useEffect(() => {
    const target = focusNext.current;
    if (!target) return;
    focusNext.current = null;
    const root = sectionRef.current;
    const el =
      'card' in target
        ? root?.querySelector<HTMLElement>('[data-open-intro]')
        : root?.querySelector<HTMLElement>(`[data-why="${target.why}"]`);
    el?.focus();
  });

  const shape =
    prefix === 'B7' && theoryStep.shapeIds.length === 1
      ? getGuitarShape(theoryStep.shapeIds[0])
      : undefined;
  const changes =
    !!prefix && CHANGE_PREFIXES.has(prefix) && theoryStep.shapeIds.length > 1;
  const isMap = prefix === 'D3' && theoryStep.mapExample !== null;

  if (!prefix) return null;
  const hasToggles = isMap || changes || allowRomanToggle;
  const compare = shape && onHearShape ? shape : undefined;
  if (
    notes.intro.length === 0 &&
    notes.info.length === 0 &&
    !compare &&
    !hasToggles
  ) {
    return null;
  }

  const open = notes.intro.find((n) => n.id === openId);
  const collapsed = notes.intro.filter((n) => n.id !== openId);

  return (
    <section
      ref={sectionRef}
      data-guitar-theory-panel
      aria-labelledby={headingId}
      className={cn('flex flex-col gap-2 text-left', className)}
      style={{ color: 'var(--color-text, #e8e8f0)' }}
    >
      <h3 id={headingId} className="sr-only">
        Theory notes
      </h3>
      {open && (
        <NoteCard
          note={open}
          keyColor={keyColor}
          onClose={() => closeNote(open.id)}
        />
      )}
      {(collapsed.length > 0 || notes.info.length > 0) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {collapsed.map((note) => (
            <button
              key={note.id}
              type="button"
              data-why={note.id}
              onClick={() => whyOpen(note.id)}
              className="rounded-full px-2 py-0.5 text-xs hover:bg-white/10"
              style={{
                border: '1px solid var(--color-border, rgba(255,255,255,0.12))',
                color: 'var(--color-text-dim, #9a9aab)',
              }}
            >
              Why?{' '}
              <span style={{ color: 'var(--color-text, #e8e8f0)' }}>
                {note.title}
              </span>
            </button>
          ))}
          {notes.info.length > 0 && (
            <button
              type="button"
              aria-expanded={drawerOpen}
              aria-controls={drawerId}
              onClick={() => setDrawerOpen(!drawerOpen)}
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs hover:bg-white/10"
              style={{
                border: '1px solid var(--color-border, rgba(255,255,255,0.12))',
                color: 'var(--color-text-dim, #9a9aab)',
              }}
            >
              <Info aria-hidden className="h-3.5 w-3.5" />
              More notes ({notes.info.length})
            </button>
          )}
        </div>
      )}
      {drawerOpen && (
        <ul
          id={drawerId}
          aria-label="More notes"
          className="flex flex-col gap-0.5 rounded-lg p-1.5"
          style={{
            border: '1px solid var(--color-border, rgba(255,255,255,0.12))',
          }}
        >
          {notes.info.map((note) => (
            <InfoItem key={`${stepKey}|${note.id}`} note={note} />
          ))}
        </ul>
      )}
      {hasToggles && (
        <GuitarTheoryToggles
          jobs={isMap}
          shared={changes}
          roman={allowRomanToggle}
          keyColor={keyColor}
        />
      )}
      {compare && (
        <SameRootCompare
          chordShape={compare}
          keyCenter={keyCenter}
          keyColor={keyColor}
          onHearShape={onHearShape}
        />
      )}
    </section>
  );
});
