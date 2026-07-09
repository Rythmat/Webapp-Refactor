/**
 * Rule 1 — Publish-time firewall test.
 *
 * `publishDay(day)` MUST return a snapshot whose stringified output contains
 * none of the forbidden substrings — even when the source Day's rationale is
 * populated with every one of those substrings verbatim. This is the
 * load-bearing structural invariant behind SPEC v2 §4 "the firewall moves
 * to publish time."
 */
import { describe, expect, it } from 'vitest';
import type { Cell, Day, Interaction } from '../types';
import {
  FORBIDDEN_SUBSTRINGS,
  findForbiddenSubstring,
  publishDay,
} from './publishDay';

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

const withInteractions = (cell: Cell, interactions: Interaction[]): Cell => ({
  ...cell,
  presentation: {
    ...cell.presentation,
    interactions,
  },
});

const makeDay = (): Day => ({
  id: 'day-firewall-publish-test',
  label: 'Firewall Publish Fixture',
  cells: {
    connectRegulate: makeCell('Connect'),
    groupPractice: withInteractions(makeCell('Practice'), [
      {
        id: 'ix-practice-1',
        type: 'choice',
        question: { en: 'Which instrument do you hear?' },
        shareable: true,
        choice: {
          options: [{ en: 'Guitar' }, { en: 'Piano' }, { en: 'Drums' }],
          multi: false,
        },
      },
    ]),
    creativeProjects: makeCell('Create'),
    presentPerform: makeCell('Share'),
    respondReflectReset: {
      ...makeCell('Reflect'),
      presentation: {
        ...makeCell('Reflect').presentation,
        interactions: [
          {
            id: 'ix-reflect-checkin',
            type: 'check-in',
            question: { en: 'How are you feeling?' },
            shareable: true, // Deliberately set true — projector must still refuse.
            checkIn: { style: 'emoji' },
          },
        ],
        resetChecklist: [
          { en: 'Chairs pushed in', es: 'Sillas en su lugar' },
          { en: 'Instruments returned', es: 'Instrumentos guardados' },
        ],
      },
    },
  },
});

describe('publishDay firewall (Rule 1)', () => {
  it('emits none of the forbidden rationale substrings in the persisted snapshot', () => {
    const snapshot = publishDay(makeDay());
    const match = findForbiddenSubstring(snapshot);
    expect(
      match,
      match === null
        ? undefined
        : `snapshot contains forbidden substring "${match}"`,
    ).toBeNull();
  });

  it('is exhaustive: every FORBIDDEN_SUBSTRING is checked against the same source', () => {
    const snapshot = publishDay(makeDay());
    const serialized = JSON.stringify(snapshot).toLowerCase();
    for (const forbidden of FORBIDDEN_SUBSTRINGS) {
      expect(
        serialized.includes(forbidden),
        `snapshot contains forbidden substring "${forbidden}"`,
      ).toBe(false);
    }
  });

  it('preserves the presentation title/prompt for every phase', () => {
    const snapshot = publishDay(makeDay());
    for (const phase of Object.values(snapshot.cells)) {
      expect(phase.presentation.title.en).toBeTruthy();
      expect(phase.presentation.prompt.en).toBeTruthy();
    }
  });

  it('carries launch tiles through with exactly the whitelisted keys', () => {
    const snapshot = publishDay(makeDay());
    for (const phase of Object.values(snapshot.cells)) {
      for (const tile of phase.presentation.launchTiles) {
        const keys = Object.keys(tile).sort();
        expect(keys).toEqual(['activityRef', 'id', 'module']);
      }
    }
  });

  it('carries interactions through with exactly the shape we emitted (choice)', () => {
    const snapshot = publishDay(makeDay());
    const practice = snapshot.cells.groupPractice;
    expect(practice.presentation.interactions).toHaveLength(1);
    const ix = practice.presentation.interactions![0];
    expect(ix.type).toBe('choice');
    expect(ix.choice?.options.length).toBe(3);
    expect(ix.shareable).toBe(true);
  });

  it('force-overrides shareable=false on any check-in interaction', () => {
    const snapshot = publishDay(makeDay());
    const reflect = snapshot.cells.respondReflectReset;
    const checkIn = reflect.presentation.interactions?.find(
      (i) => i.type === 'check-in',
    );
    expect(checkIn?.shareable).toBe(false);
  });

  it('carries resetChecklist through only on the Reflect phase', () => {
    const snapshot = publishDay(makeDay());
    const reflect = snapshot.cells.respondReflectReset;
    expect(reflect.presentation.resetChecklist?.length).toBe(2);
    for (const phaseKey of [
      'connectRegulate',
      'groupPractice',
      'creativeProjects',
      'presentPerform',
    ] as const) {
      expect(
        snapshot.cells[phaseKey].presentation.resetChecklist,
      ).toBeUndefined();
    }
  });
});
