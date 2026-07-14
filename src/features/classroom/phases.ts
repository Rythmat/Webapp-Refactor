/**
 * Canonical five-phase enum for the IMPACT Music Pedagogy model that anchors
 * the Classroom feature. See docs/classroom-vision.md (forthcoming) and the
 * fresh-build brief for the pedagogical background.
 *
 * Internal keys use the pedagogical names (e.g. `groupPractice`); the labels
 * students see on the projected board are the friendlier `STUDENT_PHASE_LABELS`
 * below (`Practice` / `Practica`, etc.) so we never leak pedagogy jargon to
 * the student surface.
 *
 * Music Bridge attribution is internal-only per standing MOU; the name is not
 * referenced anywhere in this file's identifiers or in the labels shipped to
 * user-facing surfaces.
 */
import type { LocalizedText } from './types';

export const PHASES = [
  'connectRegulate',
  'groupPractice',
  'creativeProjects',
  'presentPerform',
  'respondReflectReset',
] as const;

export type PhaseKey = (typeof PHASES)[number];

/** Full internal display names for teacher-facing surfaces. */
export const PHASE_FULL_NAMES: Record<PhaseKey, string> = {
  connectRegulate: 'Connect / Regulate',
  groupPractice: 'Group Practice',
  creativeProjects: 'Creative Projects',
  presentPerform: 'Present / Perform',
  respondReflectReset: 'Respond / Reflect / Reset',
};

/**
 * Student-facing labels. These are the only phase labels that reach the
 * projected board via `buildStudentView`. Each carries an English label plus
 * a Spanish translation so the bilingual toggle can flip per field.
 */
export const STUDENT_PHASE_LABELS: Record<PhaseKey, LocalizedText> = {
  connectRegulate: { en: 'Connect', es: 'Conecta' },
  groupPractice: { en: 'Practice', es: 'Practica' },
  creativeProjects: { en: 'Create', es: 'Crea' },
  presentPerform: { en: 'Share', es: 'Comparte' },
  respondReflectReset: { en: 'Reflect', es: 'Reflexiona' },
};

/**
 * Teacher-facing default rationale scaffolding per phase. These defaults
 * populate a Cell's `rationale` block when a new Day is created so the teacher
 * has a starting point rather than a blank form. The full population — actual
 * Standards codes, Common Anchors, SEL competencies, therapeutic elements,
 * classroom-structure notes — comes from the seed content bundle described in
 * the fresh-build brief (`themes.seed.js` etc.) which is not yet in this repo.
 *
 * These placeholder arrays are intentionally empty so future content wiring
 * has a stable shape to fill; they must never leak to the student surface.
 */
export const PHASE_RATIONALE_DEFAULTS: Record<
  PhaseKey,
  {
    standards: string[];
    commonAnchors: string[];
    selCompetencies: string[];
    therapeuticElements: string[];
    classroomStructureNotes: string[];
  }
> = {
  connectRegulate: {
    standards: [],
    commonAnchors: [],
    selCompetencies: [],
    therapeuticElements: [],
    classroomStructureNotes: [],
  },
  groupPractice: {
    standards: [],
    commonAnchors: [],
    selCompetencies: [],
    therapeuticElements: [],
    classroomStructureNotes: [],
  },
  creativeProjects: {
    standards: [],
    commonAnchors: [],
    selCompetencies: [],
    therapeuticElements: [],
    classroomStructureNotes: [],
  },
  presentPerform: {
    standards: [],
    commonAnchors: [],
    selCompetencies: [],
    therapeuticElements: [],
    classroomStructureNotes: [],
  },
  respondReflectReset: {
    standards: [],
    commonAnchors: [],
    selCompetencies: [],
    therapeuticElements: [],
    classroomStructureNotes: [],
  },
};
