import { PHASES } from '../phases';
import {
  buildCortexLessonSkeleton,
  cortexLessonTeacherNotes,
} from '../slides/cortex/buildDeck';
import type { Cell, Day, DayCells } from '../types';

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
const generateDayId = (): string => {
  const rand = Math.floor(Math.random() * 1e6)
    .toString(36)
    .padStart(4, '0');
  return `day-${Date.now().toString(36)}-${rand}`;
};

/**
 * Factory for a fresh Day.
 *
 * It carries the default deck: the Cortex lesson's five parts (Connection,
 * Showcase, Group Project, Individual Project, Present) before a focus is
 * chosen. Before Days had a default deck, `publishDay` attached one only when
 * already stored, so a Day taken straight from the plan list to "Go Live"
 * went out DECKLESS and the class fell back to the legacy phase board while
 * the teacher's own Present view showed slides. The default deck is content
 * slides only, so the cells stay empty; "Generate from Cortex" fills in the
 * Showcase, the Group Project and the interactive parts.
 *
 * The teacher's prep checklist goes to the Connect cell's rationale notes —
 * teacher-only text, never a slide.
 */
export const newBlankDay = (label?: string): Day => {
  const id = generateDayId();
  const cells = blankCells();
  cells.connectRegulate.rationale.notes = cortexLessonTeacherNotes();
  return {
    id,
    label: label?.trim() || 'Untitled Day',
    cells,
    deck: buildCortexLessonSkeleton(id),
  };
};
