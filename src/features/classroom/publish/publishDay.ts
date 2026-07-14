/**
 * `publishDay` — the transform that turns a teacher's local Day into an
 * immutable, student-safe snapshot for the server.
 *
 * This is Rule 1 of the firewall in code form: rationale never enters the
 * output object. Only the `presentation` block of each Cell is dereferenced,
 * so teacher-only fields (assessment / standards / rationale / notes /
 * initiationStyle / cloRefs / impactTags / scaffoldLaneIds / createdBy /
 * localContext) are structurally absent from the returned snapshot.
 *
 * Matches the `DaySnapshot` schema in `docs/classroom-v2/openapi.yaml`. Once
 * the server-side `POST /classrooms/:id/publish` endpoint ships, a companion
 * `postPublishedDay(classroomId, snapshot)` wrapper will POST this shape.
 * For now, `publishDay` is a pure transform.
 */
import { PHASES, type PhaseKey } from '../phases';
import type {
  Cell,
  Day,
  Interaction,
  LaunchTile,
  LocalizedText,
} from '../types';

export interface CellSnapshot {
  presentation: {
    title: LocalizedText;
    prompt: LocalizedText;
    launchTiles: LaunchTile[];
    interactions?: Interaction[];
    resetChecklist?: LocalizedText[];
  };
}

export interface DaySnapshot {
  dayId: string;
  label: string;
  cells: Record<PhaseKey, CellSnapshot>;
}

const projectLaunchTile = (tile: LaunchTile): LaunchTile => ({
  id: tile.id,
  module: tile.module,
  activityRef: tile.activityRef,
  ...(tile.label !== undefined ? { label: tile.label } : {}),
});

const projectInteraction = (interaction: Interaction): Interaction => {
  // Whitelist copy — do NOT spread `interaction` in case future extensions
  // sneak teacher-only fields onto the Interaction type. Every field the
  // client emits is explicitly named here.
  const out: Interaction = {
    id: interaction.id,
    type: interaction.type,
    question: interaction.question,
    // Rule 2 belt: `check-in` is hard-`false` regardless of the source value.
    shareable: interaction.type === 'check-in' ? false : interaction.shareable,
  };
  if (interaction.choice) out.choice = interaction.choice;
  if (interaction.number) out.number = interaction.number;
  if (interaction.text) out.text = interaction.text;
  if (interaction.draw) out.draw = interaction.draw;
  if (interaction.checkIn) out.checkIn = interaction.checkIn;
  if (interaction.atlas) out.atlas = interaction.atlas;
  return out;
};

const projectCell = (cell: Cell): CellSnapshot => {
  const { presentation } = cell;
  const snapshot: CellSnapshot = {
    presentation: {
      title: presentation.title,
      prompt: presentation.prompt,
      launchTiles: presentation.launchTiles.map(projectLaunchTile),
    },
  };
  if (presentation.interactions?.length) {
    snapshot.presentation.interactions =
      presentation.interactions.map(projectInteraction);
  }
  if (presentation.resetChecklist?.length) {
    snapshot.presentation.resetChecklist = presentation.resetChecklist;
  }
  return snapshot;
};

/**
 * Transform a Day into a student-safe DaySnapshot ready for the server.
 *
 * Never reads `cell.rationale` — that's the load-bearing invariant. The
 * accompanying `publishDay.test.ts` proves it.
 */
export const publishDay = (day: Day): DaySnapshot => {
  const cells = {} as Record<PhaseKey, CellSnapshot>;
  for (const phaseKey of PHASES) {
    cells[phaseKey] = projectCell(day.cells[phaseKey]);
  }
  return {
    dayId: day.id,
    label: day.label,
    cells,
  };
};

export const FORBIDDEN_SUBSTRINGS = [
  'assessment',
  'rationale',
  'clo',
  'impact',
  'scaffold',
  'standard',
  'initiation',
  'createdby',
  'notes',
  'localcontext',
] as const;

/**
 * Belt-and-suspenders regex check on the stringified snapshot. Client uses
 * this only in tests; the server runs the same check inside `POST /publish`
 * per `docs/classroom-v2/backend-directions.md` §5 Rule 1.
 */
export const findForbiddenSubstring = (
  snapshot: DaySnapshot,
): string | null => {
  const serialized = JSON.stringify(snapshot).toLowerCase();
  for (const forbidden of FORBIDDEN_SUBSTRINGS) {
    if (serialized.includes(forbidden)) return forbidden;
  }
  return null;
};
