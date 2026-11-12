import { PHASES, type PhaseKey } from '../phases';
import {
  buildCortexLessonSkeleton,
  cortexLessonTeacherNotes,
  cortexSkeletonInteractions,
} from '../slides/cortex/buildDeck';
import type { Cell, Day, DayCells, Interaction } from '../types';

/** A blank cell — presentation is empty LocalizedText; rationale is empty defaults. */
const blankCell = (): Cell => ({
  presentation: {
    title: { en: '' },
    prompt: { en: '' },
    launchTiles: [],
  },
  rationale: {
    assessment: null,
    standards: [],
    commonAnchors: [],
    selCompetencies: [],
    impactTags: [],
    cloRefs: [],
    notes: '',
    scaffoldLaneIds: [],
    createdBy: null,
    localContext: null,
  },
});

const blankCells = (): DayCells => {
  const cells = {} as DayCells;
  for (const phaseKey of PHASES) {
    cells[phaseKey] = blankCell();
  }
  return cells;
};

/** Deterministic-ish id from timestamp + random suffix. Not cryptographic. */
export const generateDayId = (): string => {
  const rand = Math.floor(Math.random() * 1e6)
    .toString(36)
    .padStart(4, '0');
  return `day-${Date.now().toString(36)}-${rand}`;
};

/**
 * Factory for a fresh Day.
 *
 * It carries the default deck: the lesson's six sections (Connect, Showcase,
 * Group Project, Individual Project, Present, Reflect) before a focus is
 * chosen. Before Days had a default deck, `publishDay` attached one only when
 * already stored, so a Day taken straight from the plan list to "Go Live"
 * went out DECKLESS and the class fell back to the legacy phase board while
 * the teacher's own Present view showed slides. Its Connect check-in and
 * Reflect exit question live in the cells; they are starter interactions
 * (`isStarterInteraction`), so the cells still count as empty for seeding.
 * "Generate from Cortex" fills in the Showcase and the Group Project.
 *
 * The teacher's prep checklist goes to the Connect cell's rationale notes —
 * teacher-only text, never a slide.
 *
 * `id` is for a lesson that must have the same id everywhere (the Office's
 * built-in lessons); every other caller lets it be generated.
 */
export const newBlankDay = (
  label?: string,
  id: string = generateDayId(),
): Day => {
  const cells = blankCells();
  cells.connectRegulate.rationale.notes = cortexLessonTeacherNotes();
  for (const [phase, interactions] of Object.entries(
    cortexSkeletonInteractions(id),
  ) as [PhaseKey, Interaction[]][]) {
    cells[phase].presentation.interactions = interactions;
  }
  return {
    id,
    label: label?.trim() || 'Untitled Day',
    cells,
    deck: buildCortexLessonSkeleton(id),
  };
};
