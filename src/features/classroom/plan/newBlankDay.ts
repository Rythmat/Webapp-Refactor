import { PHASES } from '../phases';
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

/** Factory for a fresh, blank Day. Caller passes an optional label. */
export const newBlankDay = (label?: string): Day => ({
  id: generateDayId(),
  label: label?.trim() || 'Untitled Day',
  cells: blankCells(),
});
