import type { PhaseKey } from '../../phases';
import type { CellRationale, LocalizedText } from '../../types';
import type { GroupRole } from './types';

/**
 * The teacher's side of a Cortex lesson: for each part, the Activity Bank
 * activity it is, the CLOs it works on, the national standards it meets and
 * how it is assessed. This is the Daily Plan Template in the owner's Pedagogy
 * Knowledge Base ("Lesson Planning Templates", read 2026-11-10):
 *
 *   Process step   Activity              CLO        Standards        Assessment
 *   Connect        check-in              Feeling    Cn10.0           observation notes
 *   Showcase       listen for the style  Feeling,   Re7.1, Cn11.0    what they heard
 *                  + its history         Context
 *   Group          (by role)             Technique  Pr4.2 (+ more)   skill rubric
 *   Create         producing             Technique, Cr2.1, Cn11.0    draft audio
 *                                        Context
 *   Present        perform for audience  Technique  Pr6.1            video evidence
 *   Reflect        exit ticket + reset   Feeling    Re9.1            reflection form
 *
 * All of it lives in the cells' rationale, which never reaches a student
 * (`publishDay` drops every rationale key). Nothing here is on a slide.
 */

export interface PartRationale {
  /** Activity Bank ids (`content/canonical/raw/activities.ts`). */
  activityRefs: string[];
  /** National Core Arts Standards codes. */
  standards: string[];
  assessment: LocalizedText;
}

/** The canonical learning CLO of an Activity Bank activity. */
export const cloOf = (activityId: string): string => `clo-learn-${activityId}`;

const GROUP: Readonly<Record<GroupRole, PartRationale>> = {
  // Producers learn a style's sound together in the Studio.
  producer: {
    activityRefs: ['stylistic-technique', 'group-practicing'],
    standards: ['MU:Pr4.2.E.8a', 'MU:Cr1.1.E.8a'],
    assessment: {
      en: 'Skill rubric; the tutorial steps each student finished with the class.',
      es: 'Rúbrica de habilidades; los pasos del tutorial que cada estudiante terminó con la clase.',
    },
  },
  // Performers play the music together.
  performer: {
    activityRefs: ['instrumental-technique', 'group-performance'],
    standards: ['MU:Pr4.2.E.8a', 'MU:Pr6.1.E.8a'],
    assessment: {
      en: 'Skill rubric; the lesson steps each student finished with the class.',
      es: 'Rúbrica de habilidades; los pasos de la lección que cada estudiante terminó con la clase.',
    },
  },
  // Promoters trace the music's places and history.
  promoter: {
    activityRefs: ['historical-connections', 'cultural-connections'],
    standards: ['MU:Cn11.0.E.8a', 'MU:Re7.1.E.8a'],
    assessment: {
      en: 'The places each student visited with the class; the connections they found.',
      es: 'Los lugares que cada estudiante visitó con la clase; las conexiones que encontró.',
    },
  },
};

/** Each part's rationale, by the phase cell it lives in. */
export const lessonRationale = (
  role: GroupRole,
): Readonly<Record<PhaseKey, PartRationale>> => ({
  // Connect and the Showcase share the first phase.
  connectRegulate: {
    activityRefs: [
      'community-check-in',
      'listen-for-style',
      'historical-connections',
    ],
    standards: ['MU:Cn10.0.E.8a', 'MU:Re7.1.E.8a', 'MU:Cn11.0.E.8a'],
    assessment: {
      en: 'Observation notes on the check-in; the words students heard in the song.',
      es: 'Notas de observación del registro de emociones; las palabras que los estudiantes escucharon en la canción.',
    },
  },
  groupPractice: GROUP[role],
  creativeProjects: {
    activityRefs: ['producing'],
    standards: ['MU:Cr2.1.E.8a', 'MU:Cn11.0.E.8a'],
    assessment: {
      en: 'Draft audio: the student’s Studio project.',
      es: 'Audio en borrador: el proyecto del estudiante en el Studio.',
    },
  },
  presentPerform: {
    activityRefs: ['perform-for-audience'],
    standards: ['MU:Pr6.1.E.8a'],
    assessment: {
      en: 'Video or recording of the featured project.',
      es: 'Video o grabación del proyecto destacado.',
    },
  },
  respondReflectReset: {
    activityRefs: ['self-reflection-planning', 'reset-the-space'],
    standards: ['MU:Re9.1.E.8a'],
    assessment: {
      en: 'Reflection: each student’s exit answer, saved.',
      es: 'Reflexión: la respuesta de salida de cada estudiante, guardada.',
    },
  },
});

const union = (a: readonly string[], b: readonly string[]): string[] => [
  ...new Set([...a, ...b]),
];

/**
 * A cell's rationale with a part's added: the teacher's own entries kept,
 * the lesson's joined to them, and the assessment filled only where the
 * teacher left it empty.
 */
export const withPartRationale = (
  rationale: CellRationale,
  part: PartRationale,
): CellRationale => ({
  ...rationale,
  activityRefs: union(rationale.activityRefs ?? [], part.activityRefs),
  cloRefs: union(rationale.cloRefs, part.activityRefs.map(cloOf)),
  standards: union(rationale.standards, part.standards),
  assessment:
    rationale.assessment && rationale.assessment.en.trim() !== ''
      ? rationale.assessment
      : part.assessment,
});
