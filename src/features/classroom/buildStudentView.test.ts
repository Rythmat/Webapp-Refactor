/**
 * Firewall acceptance test for `buildStudentView`.
 *
 * Constructs a Day with EVERY teacher-only rationale field populated with a
 * unique forbidden marker word, runs it through `buildStudentView`, and
 * asserts that the JSON-stringified output contains none of the forbidden
 * substrings. This is the load-bearing invariant of the Classroom feature:
 * anything a student can see must be a function of the presentation block
 * only, not the rationale block.
 *
 * Extending `buildStudentView` to emit a new field? Add coverage here.
 */
import { describe, expect, it } from 'vitest';
import { buildStudentView } from './buildStudentView';
import type { Cell, Day, StudentViewConfig } from './types';

const FORBIDDEN_SUBSTRINGS = [
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
];

const makeCell = (phaseLabel: string): Cell => ({
  presentation: {
    title: {
      en: `${phaseLabel} title (student-safe)`,
      es: `${phaseLabel} título`,
    },
    prompt: {
      en: `${phaseLabel} prompt to the class`,
      es: `${phaseLabel} pregunta a la clase`,
    },
    launchTiles: [
      {
        id: `${phaseLabel}-tile-1`,
        module: 'learn',
        activityRef: `curriculum:${phaseLabel.toLowerCase()}:demo`,
      },
    ],
  },
  rationale: {
    assessment: {
      en: 'ASSESSMENT: rubric points about accuracy',
      es: 'evaluación',
    },
    standards: ['STANDARDS: MU:Cr1.1'],
    commonAnchors: ['ANCHOR: Anchor Standard 1'],
    selCompetencies: ['SEL: Self-Awareness'],
    impactTags: ['IMPACT: Community'],
    cloRefs: ['CLO: I can identify tonal center'],
    notes: 'NOTES: private teacher note about pacing',
    initiationStyle: 'learn-to-apply',
    scaffoldLaneIds: ['SCAFFOLD: lane-advanced'],
    createdBy: 'CREATEDBY: teacher-abc-123',
    localContext:
      'LOCALCONTEXT: Denver Five Points jazz history, teacher-facing only',
  },
});

const makeDay = (): Day => ({
  id: 'day-firewall-test',
  label: 'Firewall Fixture Day',
  cells: {
    connectRegulate: makeCell('Connect'),
    groupPractice: makeCell('Practice'),
    creativeProjects: makeCell('Create'),
    presentPerform: makeCell('Share'),
    respondReflectReset: {
      ...makeCell('Reflect'),
      presentation: {
        ...makeCell('Reflect').presentation,
        resetChecklist: [
          { en: 'Chairs pushed in', es: 'Sillas en su lugar' },
          { en: 'Instruments returned', es: 'Instrumentos guardados' },
        ],
      },
    },
  },
});

const config: StudentViewConfig = { language: 'en', agePreset: 'high' };

describe('buildStudentView firewall', () => {
  it('emits none of the forbidden rationale substrings', () => {
    const view = buildStudentView(makeDay(), config);
    const serialized = JSON.stringify(view).toLowerCase();

    for (const forbidden of FORBIDDEN_SUBSTRINGS) {
      expect(
        serialized.includes(forbidden),
        `student view contains forbidden substring "${forbidden}"`,
      ).toBe(false);
    }
  });

  it('emits all five phases in canonical order', () => {
    const view = buildStudentView(makeDay(), config);
    expect(view.phases.map((p) => p.phaseKey)).toEqual([
      'connectRegulate',
      'groupPractice',
      'creativeProjects',
      'presentPerform',
      'respondReflectReset',
    ]);
  });

  it('emits presentation title and prompt for each phase', () => {
    const view = buildStudentView(makeDay(), config);
    for (const phase of view.phases) {
      expect(phase.title.en).toBeTruthy();
      expect(phase.prompt.en).toBeTruthy();
    }
  });

  it('emits student-facing phase labels (Connect / Practice / Create / Share / Reflect)', () => {
    const view = buildStudentView(makeDay(), config);
    expect(view.phases.map((p) => p.label.en)).toEqual([
      'Connect',
      'Practice',
      'Create',
      'Share',
      'Reflect',
    ]);
  });

  it('emits resetChecklist ONLY on the Reflect phase', () => {
    const view = buildStudentView(makeDay(), config);
    const reflect = view.phases.find(
      (p) => p.phaseKey === 'respondReflectReset',
    );
    const nonReflect = view.phases.filter(
      (p) => p.phaseKey !== 'respondReflectReset',
    );

    expect(reflect?.resetChecklist?.length).toBe(2);
    for (const phase of nonReflect) {
      expect(phase.resetChecklist).toBeUndefined();
    }
  });

  it('emits launchTiles with only id / module / activityRef / optional label', () => {
    const view = buildStudentView(makeDay(), config);
    for (const phase of view.phases) {
      for (const tile of phase.launchTiles) {
        const keys = Object.keys(tile).sort();
        // 'label' is optional; the fixture doesn't set it, so keys should be
        // exactly the mandatory three.
        expect(keys).toEqual(['activityRef', 'id', 'module']);
      }
    }
  });
});
