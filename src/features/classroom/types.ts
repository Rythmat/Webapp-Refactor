/**
 * Domain types for the Classroom feature's planning tree and per-cell
 * pedagogy blocks. Mirrors the model described in the fresh-build brief:
 *
 *   Year → Unit (monthly) → Week → Day → Cell (one per PhaseKey)
 *
 * Each Cell carries a student-facing `presentation` block (the only thing
 * that flows to the projected board via `buildStudentView`) and a teacher-only
 * `rationale` block (standards, CLOs, IMPACT tags, scaffolding, etc.) that is
 * structurally unreachable from any student surface.
 *
 * The distinction between the two blocks is the load-bearing invariant of the
 * feature. Adding a field on the wrong side is what the firewall test at
 * `buildStudentView.test.ts` exists to prevent.
 */
import type { PhaseKey } from './phases';

/**
 * Bilingual text with a required English string and an optional Spanish
 * translation. The board renders per-field with English fallback so a Cell
 * whose presentation hasn't been translated still displays legibly.
 */
export interface LocalizedText {
  en: string;
  es?: string;
}

/** Age presets adjust type scale, card density, and the register of system copy. */
export type AgePreset = 'middle' | 'high' | 'college';

/** Language modes for the student surface. */
export type StudentLanguage = 'en' | 'es' | 'both';

/**
 * Reference to an Atlas module activity. Presentation Mode's Launch tiles are
 * built from these — the URL itself is resolved at render time from tenant
 * config or the teacher's Atlas Resource Library, so we don't bake URLs into
 * the data model.
 */
export interface LaunchTile {
  id: string;
  module: 'globe' | 'learn' | 'studio' | 'arcade';
  /** Deep-link key resolved against tenant/teacher module config. */
  activityRef: string;
  /** Optional student-facing label; falls back to the module's default label. */
  label?: LocalizedText;
}

/**
 * Scaffolding lane — tenant-configurable per phase. Group Practice ships with
 * a single "All Students" lane by default; Creative Projects ships with role
 * templates (Ambassador, Performer, Producer, Collaborator). Renames are safe
 * because content is keyed by `id`; deleting a lane orphans its content with
 * a warning rather than destroying teacher work.
 */
export interface ScaffoldLane {
  id: string;
  name: string;
  /** 'track' = Group Practice lanes; 'role' = Creative Projects lanes. */
  kind: 'track' | 'role';
}

/**
 * A Cell's student-facing presentation content. This is the ONLY block of a
 * Cell that `buildStudentView` reads. Everything here reaches the board.
 */
export interface CellPresentation {
  title: LocalizedText;
  prompt: LocalizedText;
  launchTiles: LaunchTile[];
  /**
   * v2 addition — a phase can carry interactive prompts. Each Interaction is
   * projected on the Board / Focus view and answered by student devices in
   * either a live Session or an async assignment run. See
   * docs/classroom-v2/openapi.yaml `Interaction`.
   */
  interactions?: Interaction[];
  /**
   * Reflect-phase-only: the reset checklist rendered as tickable boxes. State
   * is deliberately ephemeral — nothing persists across sessions.
   */
  resetChecklist?: LocalizedText[];
}

/**
 * An interactive prompt attached to a Cell (Classroom v2). Answered by
 * students in either a live Session or an async assignment run. Response
 * payload shapes live at `InteractionResponse` below.
 *
 * `shareable` gates whether an answered response can be projected via the
 * anonymized share overlay. **`check-in` is always hard-`false`**: the
 * runtime `buildProjectorView` selector enforces Rule 2 of the firewall by
 * refusing to emit check-in payloads to the projector view.
 */
export interface Interaction {
  id: string;
  type: InteractionType;
  question: LocalizedText;
  shareable: boolean;
  choice?: { options: LocalizedText[]; multi: boolean };
  number?: { min?: number; max?: number };
  text?: { maxLen: number };
  draw?: { background?: 'blank' | 'staff' | 'keyboard' | 'grid' };
  checkIn?: { style: 'emoji' | 'scale' | 'word' };
  atlas?: {
    module: 'globe' | 'learn' | 'studio' | 'arcade';
    activityRef: string;
    expects: 'completion' | 'score' | 'artifact';
  };
}

export type InteractionType =
  | 'choice'
  | 'text'
  | 'number'
  | 'draw'
  | 'check-in'
  | 'atlas';

/**
 * Discriminated payload for a single student response. Persistence is on the
 * server via `POST /classrooms/:id/sessions/:sessionId/responses`; the same
 * shape covers both live and async assignment paths.
 */
export type InteractionResponsePayload =
  | { kind: 'choice'; choices: number[] }
  | { kind: 'text'; text: string }
  | { kind: 'number'; value: number }
  | { kind: 'draw'; strokes: Array<Record<string, unknown>> }
  | { kind: 'check-in'; value: string }
  | {
      kind: 'atlas';
      module: Interaction['type'] extends 'atlas' ? string : string;
      activityRef: string;
      result: Record<string, unknown>;
    };

export interface InteractionResponse {
  id: string;
  interactionId: string;
  enrollmentId: string;
  sessionId?: string;
  assignmentId?: string;
  payload: InteractionResponsePayload;
  createdAt: string;
}

/**
 * A Cell's teacher-only rationale. NEVER reaches the board.
 * Every field on this interface is a forbidden substring in the firewall test.
 */
export interface CellRationale {
  assessment: LocalizedText | null;
  /** Standards codes (e.g. National Core Arts Standards MU:Cr1.1). */
  standards: string[];
  /** Common Anchor tags. */
  commonAnchors: string[];
  /** SEL competency tags (Self-Awareness, Self-Management, ...). */
  selCompetencies: string[];
  /** IMPACT values tags (Music Bridge internal-only attribution). */
  impactTags: string[];
  /** Content Learning Objectives — student-voice ("I can…"). */
  cloRefs: string[];
  /** Free-form teacher notes. */
  notes: string;
  /** How a Group Practice or Creative Projects activity is initiated. */
  initiationStyle?:
    | 'learn-to-apply'
    | 'try-it-first'
    | 'join-the-expert'
    | 'self-guided'
    | 'hybrid';
  /** Which scaffold lanes this Cell targets (by ScaffoldLane.id). */
  scaffoldLaneIds: string[];
  /** Attribution — teacher userId who authored this Cell content. */
  createdBy: string | null;
  /**
   * Denver-anchored or teacher-supplied local example context. Teacher-facing
   * only, clearly labeled in the editor as local example content, and
   * tenant-controllable: show, hide, or replace.
   */
  localContext: string | null;
}

/**
 * A Day's five Cells, keyed by PhaseKey. A Day always contains exactly the
 * five canonical phases; a Cell may be empty (both title.en === '' and
 * prompt.en === '') but the key always exists.
 */
export type DayCells = Record<PhaseKey, Cell>;

export interface Cell {
  presentation: CellPresentation;
  rationale: CellRationale;
}

export interface Day {
  id: string;
  /** Human date (YYYY-MM-DD) or a teacher-authored label like "Day 1". */
  label: string;
  cells: DayCells;
}

export interface Week {
  id: string;
  label: string;
  days: Day[];
}

/**
 * Reference to a Theme from the Theme Bank. Themes are attached at the Unit
 * level and surface in the Unit editor via the "This Month" panel; not part
 * of the student-facing surface.
 */
export interface ThemeRef {
  themeId: string;
}

export interface Unit {
  id: string;
  label: string;
  /** Month index 0-11, matching Date.getMonth(). */
  monthIndex: number;
  theme: ThemeRef | null;
  weeks: Week[];
}

export interface Year {
  id: string;
  label: string;
  units: Unit[];
}

/**
 * Rendering config passed to `buildStudentView`. Age and language modes drive
 * type scale and per-field language resolution on the student surface.
 */
export interface StudentViewConfig {
  language: StudentLanguage;
  agePreset: AgePreset;
}
