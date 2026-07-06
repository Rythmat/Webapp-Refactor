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
import { PHASES, STUDENT_PHASE_LABELS, type PhaseKey } from './phases';
import type {
  Day,
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
  /** Reflect-phase reset checklist. Absent for other phases. */
  resetChecklist?: LocalizedText[];
}

export interface StudentDayView {
  dayId: string;
  language: StudentViewConfig['language'];
  agePreset: StudentViewConfig['agePreset'];
  phases: StudentPhaseView[];
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
    const view: StudentPhaseView = {
      phaseKey,
      label: STUDENT_PHASE_LABELS[phaseKey],
      title: cell.presentation.title,
      prompt: cell.presentation.prompt,
      launchTiles: cell.presentation.launchTiles.map((tile) => ({
        id: tile.id,
        module: tile.module,
        activityRef: tile.activityRef,
        ...(tile.label !== undefined ? { label: tile.label } : {}),
      })),
    };
    if (
      phaseKey === 'respondReflectReset' &&
      cell.presentation.resetChecklist !== undefined
    ) {
      view.resetChecklist = cell.presentation.resetChecklist;
    }
    return view;
  });

  return {
    dayId: day.id,
    language: config.language,
    agePreset: config.agePreset,
    phases,
  };
};
