import { PHASES } from '../phases';
import {
  buildGeneralLessonDeck,
  generalLessonTeacherNotes,
} from '../slides/templates/generalLesson';
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
 * It now carries the default deck. Before, a Day had no deck until the teacher
 * opened the slide editor — and `publishDay` attaches a deck only when one is
 * already stored, so a Day taken straight from the plan list to "Go Live" went
 * out DECKLESS and the class fell back to the legacy phase board while the
 * teacher's own Present view showed slides. Whether a room saw slides depended
 * on invisible state.
 *
 * The prep checklist from the source deck's first slide goes to the Connect
 * cell's rationale notes — teacher-only text, never a slide.
 */
export const newBlankDay = (label?: string): Day => {
  const id = generateDayId();
  const cells = blankCells();
  cells.connectRegulate.rationale.notes = generalLessonTeacherNotes();
  return {
    id,
    label: label?.trim() || 'Untitled Day',
    cells,
    deck: buildGeneralLessonDeck(id),
  };
};
