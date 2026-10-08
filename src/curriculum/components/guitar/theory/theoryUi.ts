// ── Guitar theory UI: shared helpers ───────────────────────────────────────
// Small derivations the theory panels, cards and Music Map layers share: how
// a theory note is remembered as seen, which info notes come first, the
// key's chord family as chips, and the labels for Music Map pattern chips.
// All copy comes from theoryNotes.ts; nothing here writes theory prose.

import { hybridLabel } from '@/curriculum/data/guitar/bookOne';
import {
  chordName,
  chordRootName,
  chordSymbol,
  diatonicTriads,
  getGuitarCenter,
} from '@/curriculum/data/guitar/centers';
import {
  theoryStepsFor,
  type TheoryStep,
} from '@/curriculum/data/guitar/theoryConditions';
import {
  GUITAR_THEORY_NOTES,
  notesFor,
  stepPrefix,
  theoryString,
  type GuitarTheoryStringId,
  type ResolvedTheoryNote,
} from '@/curriculum/data/guitar/theoryNotes';
import type {
  GuitarCenterId,
  ScaleDegree,
} from '@/curriculum/data/guitar/types';
import type {
  ActivityFlowV2,
  ActivityStepV2,
} from '@/curriculum/types/activity.v2';
import { formatAccidentalsForDisplay } from '@/curriculum/utils/formatAccidentals';
import {
  romanNumeral,
  type DiatonicQuality,
  type GuitarSubsectionPrefix,
  type MapPattern,
  type MapPatternId,
  type TheoryNoteCondition,
} from '@/lib/guitar/theory';

/** ASCII chord or note text for display: 'Bb minor 7(b5)' → 'B♭ minor 7(♭5)'. */
export function displayText(ascii: string): string {
  return formatAccidentalsForDisplay(ascii).replace('(b5)', '(♭5)');
}

// ── Seen notes ─────────────────────────────────────────────────────────────

const NOTE_CONDITION: ReadonlyMap<string, TheoryNoteCondition> = new Map(
  GUITAR_THEORY_NOTES.map((note) => [note.id, note.when]),
);

/** Conditions that pick one step per key: their notes are seen once per key. */
const PER_KEY_CONDITIONS: ReadonlySet<TheoryNoteCondition> = new Set([
  'firstBarreStepInKey',
  'firstDrop3StepInKey',
]);

/**
 * The id a theory note is remembered by in useGuitarDisplaySettings'
 * dismissedNotes. Most notes auto-open once per device; the barre-care and
 * drop-3 muting tips belong to one step in every key, so they are remembered
 * per key ('b.barreCare@G').
 */
export function noteSeenId(noteId: string, key: GuitarCenterId): string {
  const when = NOTE_CONDITION.get(noteId);
  return when && PER_KEY_CONDITIONS.has(when) ? `${noteId}@${key}` : noteId;
}

/** The Section B entry card is shown once per key. */
export function sectionBCardSeenId(key: GuitarCenterId): string {
  return `card.sectionB@${key}`;
}

/** Whether the Section B card is still due for this key on this device. */
export function isSectionBCardDue(
  key: GuitarCenterId,
  dismissedNotes: readonly string[],
): boolean {
  return !dismissedNotes.includes(sectionBCardSeenId(key));
}

/**
 * b.barreCare, when the key's first barre step is the step Section B opens
 * on (B, D♭, E♭, B♭ and F start Section B with barre triads). The Section B
 * card then carries the hand-care note, and the step panel leaves it to the
 * card, so it shows once per key, on the first barre step, and never twice
 * on one screen. In the other keys the panel opens it on the barre step.
 */
export function sectionBCardBarreCare(
  flow: ActivityFlowV2,
  key: GuitarCenterId,
): ResolvedTheoryNote | null {
  const entry = flow.sections.find((s) => s.id === 'B')?.steps[0];
  if (!entry) return null;
  const steps = theoryStepsFor(flow);
  const step = steps.find((s) => s.id === activityId(entry));
  const prefix = step && stepPrefix(step.id);
  if (!step || !prefix) return null;
  return (
    notesFor(prefix, {
      center: getGuitarCenter(key),
      step,
      steps,
      settings: { accidentals: 'unicode' },
    }).intro.find((n) => n.id === 'b.barreCare') ?? null
  );
}

/**
 * Marks the Section B card seen for this key, and the hand-care note with it
 * where the card carries that note (it was read on the card).
 */
export function markSectionBCardSeen(
  dismissNote: (id: string) => void,
  flow: ActivityFlowV2,
  key: GuitarCenterId,
): void {
  dismissNote(sectionBCardSeenId(key));
  const barreCare = sectionBCardBarreCare(flow, key);
  if (barreCare) dismissNote(noteSeenId(barreCare.id, key));
}

/**
 * The (i) drawer order, most relevant first: notes whose condition picked
 * this step, map or shape come before the ones every step of the
 * subsection shows; list order otherwise.
 */
export function rankInfoNotes(
  notes: readonly ResolvedTheoryNote[],
): ResolvedTheoryNote[] {
  const specific = (n: ResolvedTheoryNote) =>
    NOTE_CONDITION.get(n.id) === 'always' ? 1 : 0;
  return notes
    .map((note, index) => ({ note, index }))
    .sort((a, b) => specific(a.note) - specific(b.note) || a.index - b.index)
    .map(({ note }) => note);
}

// ── Steps ──────────────────────────────────────────────────────────────────

/** 'B7.3: Arpeggiate…' → 'B7.3'. */
export function activityId(step: Pick<ActivityStepV2, 'activity'>): string {
  return step.activity.split(':')[0].trim();
}

/**
 * The theory layer's view of a lesson step: its entry in `steps` when it is
 * there (the flow's own copy), else read from the step itself (a resolved
 * copy the container made).
 */
export function toTheoryStep(
  flow: ActivityFlowV2,
  steps: readonly TheoryStep[],
  step: ActivityStepV2,
): TheoryStep {
  const id = activityId(step);
  const found = steps.find((s) => s.id === id);
  if (found) return found;
  const single = theoryStepsFor({
    ...flow,
    sections: [{ id: step.section, name: '', steps: [step] }],
  });
  return single[0];
}

/** One lesson step's theory notes, as the About this step sheet shows them. */
export interface StepTheoryNotes {
  prefix: GuitarSubsectionPrefix | null;
  theoryStep: TheoryStep;
  /** Shown expanded, in list order. */
  intro: ResolvedTheoryNote[];
  /** "More notes", most relevant first. */
  info: ResolvedTheoryNote[];
  /** The practice-tool tips (pt.*), for while the student practises. */
  practice: ResolvedTheoryNote[];
}

/** The notes for a step: the same notes, in the same order, as the theory panel. */
export function stepTheoryNotes(
  flow: ActivityFlowV2,
  step: ActivityStepV2,
  key: GuitarCenterId,
  showRomanNumerals = false,
): StepTheoryNotes {
  const steps = theoryStepsFor(flow);
  const theoryStep = toTheoryStep(flow, steps, step);
  const prefix = stepPrefix(theoryStep.id);
  if (!prefix) return { prefix, theoryStep, intro: [], info: [], practice: [] };
  const center = getGuitarCenter(key);
  const settings = { showRomanNumerals, accidentals: 'unicode' as const };
  const own = notesFor(prefix, { center, step: theoryStep, steps, settings });
  const practice = notesFor('PRACTICE', { center, settings });
  return {
    prefix,
    theoryStep,
    intro: own.intro,
    info: rankInfoNotes(own.info),
    practice: [...practice.info, ...practice.popover],
  };
}

// ── The key's chord family ─────────────────────────────────────────────────

export interface FamilyChip {
  degree: ScaleDegree;
  quality: DiatonicQuality;
  /** 'Dm', 'F♯m', 'B°'. */
  symbol: string;
  /** '2 min'; for 7, 'later as 7 min7(♭5)'. */
  hybrid: string;
  /** 'ii', 'vii°'. */
  roman: string;
  /** Spoken: 'Chord 2: D minor'. */
  ariaLabel: string;
  /** Chord 7: the diminished triad Book One leaves for the 7th chords. */
  later: boolean;
}

/**
 * Chips 1-7 of the key's chord family, as the Section B strip shows them. In
 * Book One the diminished 7 waits for the 7th chords; a mode plays it.
 */
export function familyChips(key: GuitarCenterId): FamilyChip[] {
  const center = getGuitarCenter(key);
  return diatonicTriads(center).map((quality, i) => {
    const degree = (i + 1) as ScaleDegree;
    const roman = romanNumeral(center, degree, quality);
    if (quality === 'dim' && center.mode !== 'ionian') {
      const root = displayText(chordRootName(center, degree));
      return {
        degree,
        quality,
        symbol: `${root}°`,
        hybrid: hybridLabel(degree, quality),
        roman,
        ariaLabel: `Chord ${degree}: ${root} diminished`,
        later: false,
      };
    }
    if (quality === 'dim') {
      const root = displayText(chordRootName(center, degree));
      const hybrid = `later as ${displayText(hybridLabel(degree, 'min7b5'))}`;
      return {
        degree,
        quality,
        symbol: `${root}°`,
        hybrid,
        roman,
        ariaLabel: `Chord ${degree}: ${root} diminished, ${hybrid}`,
        later: true,
      };
    }
    return {
      degree,
      quality,
      symbol: displayText(chordSymbol(center, degree, quality)),
      hybrid: hybridLabel(degree, quality),
      roman,
      ariaLabel: `Chord ${degree}: ${displayText(chordName(center, degree, quality))}`,
      later: false,
    };
  });
}

// ── Music Map patterns ─────────────────────────────────────────────────────

const PATTERN_CHIP: Readonly<Record<MapPatternId, GuitarTheoryStringId>> = {
  'two-five-one': 'chip.251',
  'turnaround-1625': 'chip.turnaround',
  'five-to-one': 'chip.fiveOne',
};

/** '2-5-1', 'Turnaround', '5 → 1'. */
export function patternChipText(id: MapPatternId): string {
  return theoryString(PATTERN_CHIP[id]);
}

/** The d3.* popover note a pattern chip opens. */
export function patternNoteId(pattern: MapPattern): string {
  if (pattern.id === 'turnaround-1625') return 'd3.turnaround';
  if (pattern.id === 'five-to-one') return 'd3.fiveOne';
  return pattern.wrapsRepeat ? 'd3.twoFiveOneWrap' : 'd3.twoFiveOne';
}

// ── Change badges ──────────────────────────────────────────────────────────

/**
 * Subsections whose steps change chords and have change notes (keep a finger
 * down, tricky change): the shared-note badges show on these.
 */
export const CHANGE_PREFIXES: ReadonlySet<GuitarSubsectionPrefix> = new Set([
  'B2',
  'B4',
  'B6',
  'B8',
  'D3',
]);

/** '2 shared notes', '1 shared note', 'No shared notes'. */
export function sharedNotesText(count: number): string {
  if (count === 0) return theoryString('badge.sharedNone');
  const text = theoryString('badge.shared', { n: count });
  return count === 1 ? text.replace(/notes$/, 'note') : text;
}
