/**
 * `buildStudentView` — THE FIREWALL.
 *
 * This is the single, canonical selector that emits the data shape shown on
 * any student-facing surface (Presentation Mode's Board / Focus / Launch, and
 * in v2 the student device view of a live session). Everything a student can
 * see is a function of the output of this file. Anything not produced here is
 * structurally unreachable from student surfaces — not filtered out at render
 * time, but never included in the first place.
 *
 * Do not add fields here without adding coverage in `buildStudentView.test.ts`.
 * Adding a field that echoes teacher-only content — `assessment`, `rationale`,
 * `standards`, `clo`, `impact`, `scaffold`, `initiation`, `createdBy`, `notes`,
 * `localContext` — will break the forbidden-substring firewall test and MUST
 * be resolved before merging.
 *
 * See docs/classroom-vision.md (forthcoming) and the fresh-build brief §7 for
 * the pedagogical rationale.
 */
import { stripLegacySongSlug } from './legacySongSlug';
import { PHASES, STUDENT_PHASE_LABELS, type PhaseKey } from './phases';
import { projectDeck } from './publish/publishDay';
import type { SlideDeck } from './slides/types';
import type {
  Day,
  Interaction,
  LaunchTile,
  LocalizedText,
  StudentViewConfig,
} from './types';

export interface StudentPhaseView {
  phaseKey: PhaseKey;
  label: LocalizedText;
  title: LocalizedText;
  prompt: LocalizedText;
  launchTiles: LaunchTile[];
  /** Interactive prompts a student can respond to during this phase. */
  interactions?: Interaction[];
  /** Reflect-phase reset checklist. Absent for other phases. */
  resetChecklist?: LocalizedText[];
  /** "Song of the day" reference (typically Connect), resolved to artwork by
   *  the presentation surface. Absent when the phase has no song. */
  song?: { id: string };
}

/**
 * Whitelist-copy an Interaction so future extensions can't sneak a teacher-only
 * field through. Mirrors `publishDay.projectInteraction` — both sides of the
 * firewall keep the same shape.
 */
const projectInteractionForStudent = (
  interaction: Interaction,
): Interaction => {
  const out: Interaction = {
    id: interaction.id,
    type: interaction.type,
    question: interaction.question,
    // Rule 2 belt: check-in responses are teacher-only, so the client emits
    // shareable=false regardless of what the source Day claims.
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

export interface StudentDayView {
  dayId: string;
  language: StudentViewConfig['language'];
  agePreset: StudentViewConfig['agePreset'];
  phases: StudentPhaseView[];
  /** Interactive-slides deck (whitelist-projected); absent on legacy Days. */
  deck?: SlideDeck;
}

/**
 * Build the student-safe view of a Day.
 *
 * The output object contains ONLY:
 *   - Day identifier + render config (language + age preset)
 *   - For each of the 5 phases, in canonical order:
 *       phaseKey, label (LocalizedText), title, prompt, launchTiles, and
 *       (Reflect phase only) resetChecklist
 *
 * The output does NOT contain, at any depth, any of the Cell's rationale
 * fields — even if a teacher has populated them. The firewall is structural:
 * `rationale` is never dereferenced in the code below.
 */
export const buildStudentView = (
  day: Day,
  config: StudentViewConfig,
): StudentDayView => {
  const phases: StudentPhaseView[] = PHASES.map((phaseKey) => {
    const cell = day.cells[phaseKey];
    const { prompt, songId: legacySongId } = stripLegacySongSlug(
      cell.presentation.prompt,
    );
    // Prefer the structured field; fall back to a legacy slug recovered above.
    const song =
      cell.presentation.song ??
      (legacySongId ? { id: legacySongId } : undefined);
    const view: StudentPhaseView = {
      phaseKey,
      label: STUDENT_PHASE_LABELS[phaseKey],
      title: cell.presentation.title,
      prompt,
      launchTiles: cell.presentation.launchTiles.map((tile) => ({
        id: tile.id,
        module: tile.module,
        activityRef: tile.activityRef,
        ...(tile.label !== undefined ? { label: tile.label } : {}),
      })),
    };
    if (song) view.song = song;
    if (cell.presentation.interactions?.length) {
      view.interactions = cell.presentation.interactions.map(
        projectInteractionForStudent,
      );
    }
    if (
      phaseKey === 'respondReflectReset' &&
      cell.presentation.resetChecklist !== undefined
    ) {
      view.resetChecklist = cell.presentation.resetChecklist;
    }
    return view;
  });

  const view: StudentDayView = {
    dayId: day.id,
    language: config.language,
    agePreset: config.agePreset,
    phases,
  };
  if (day.deck) view.deck = projectDeck(day.deck);
  return view;
};
