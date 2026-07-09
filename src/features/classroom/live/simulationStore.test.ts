// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { readEnrollmentStoreForUser } from '../enrollments/useEnrollments';
import type { PublishedDay } from '../publish/usePublishedDays';
import type { Interaction, InteractionType } from '../types';
import { readSessionsStoreForUser, startSessionForUser } from './sessionsStore';
import {
  autoRespondForUser,
  clearSimulationForUser,
  generatePlausibleResponse,
  readSimStoreForUser,
  seedStudentsForUser,
} from './simulationStore';

const USER_ID = 'test-user';
const CLASSROOM_ID = 'classroom-test';

const buildInteraction = (id: string, type: InteractionType): Interaction => ({
  id,
  type,
  question: { en: `Q ${id}` },
  shareable: true,
  ...(type === 'choice'
    ? {
        choice: {
          options: [{ en: 'a' }, { en: 'b' }, { en: 'c' }],
          multi: false,
        },
      }
    : {}),
  ...(type === 'atlas'
    ? {
        atlas: { module: 'learn', activityRef: 'act-1', expects: 'completion' },
      }
    : {}),
});

const buildPublishedDay = (interactions: Interaction[]): PublishedDay => ({
  id: 'pd-test',
  classroomId: CLASSROOM_ID,
  teacherId: USER_ID,
  sourceRef: 'day-src',
  publishedAt: '2026-07-08T10:00:00.000Z',
  snapshot: {
    dayId: 'day-src',
    label: 'Sim Day',
    cells: {
      connectRegulate: {
        presentation: {
          title: { en: 'C' },
          prompt: { en: 'p' },
          launchTiles: [],
          interactions,
        },
      },
      groupPractice: {
        presentation: {
          title: { en: 'P' },
          prompt: { en: 'p' },
          launchTiles: [],
        },
      },
      creativeProjects: {
        presentation: {
          title: { en: 'Cr' },
          prompt: { en: 'p' },
          launchTiles: [],
        },
      },
      presentPerform: {
        presentation: {
          title: { en: 'S' },
          prompt: { en: 'p' },
          launchTiles: [],
        },
      },
      respondReflectReset: {
        presentation: {
          title: { en: 'R' },
          prompt: { en: 'p' },
          launchTiles: [],
        },
      },
    },
  },
});

const startTestSession = () =>
  startSessionForUser(USER_ID, {
    classroomId: CLASSROOM_ID,
    publishedDayId: 'pd-test',
  });

beforeEach(() => {
  window.localStorage.clear();
});

describe('generatePlausibleResponse', () => {
  const cases: InteractionType[] = [
    'choice',
    'text',
    'number',
    'draw',
    'check-in',
    'atlas',
  ];
  it.each(cases)('produces a valid payload for kind=%s', (type) => {
    const ix = buildInteraction(`ix-${type}`, type);
    const payload = generatePlausibleResponse(ix, 3);
    expect(payload.kind).toBe(type);
    if (payload.kind === 'choice') {
      expect(Array.isArray(payload.choices)).toBe(true);
      expect(payload.choices.length).toBeGreaterThan(0);
    }
    if (payload.kind === 'text') {
      expect(typeof payload.text).toBe('string');
    }
    if (payload.kind === 'number') {
      expect(typeof payload.value).toBe('number');
    }
    if (payload.kind === 'draw') {
      expect(payload.strokes.length).toBeGreaterThan(0);
    }
    if (payload.kind === 'check-in') {
      expect(typeof payload.value).toBe('string');
      expect(payload.value.length).toBeGreaterThan(0);
    }
    if (payload.kind === 'atlas') {
      expect(typeof payload.activityRef).toBe('string');
    }
  });
});

describe('seedStudentsForUser', () => {
  it('mints N active enrollments and records them in the sim bucket', () => {
    const session = startTestSession();
    const { createdEnrollmentIds } = seedStudentsForUser(
      USER_ID,
      session.sessionId,
      {
        classroomId: CLASSROOM_ID,
        count: 5,
      },
    );
    expect(createdEnrollmentIds).toHaveLength(5);
    const store = readEnrollmentStoreForUser(USER_ID);
    for (const id of createdEnrollmentIds) {
      expect(store.entries[id].status).toBe('active');
      expect(store.entries[id].displayName.startsWith('Sim Student ')).toBe(
        true,
      );
    }
    const sim = readSimStoreForUser(USER_ID);
    expect(sim.bySession[session.sessionId]).toEqual(createdEnrollmentIds);
  });

  it('appends without overwriting on a second seed', () => {
    const session = startTestSession();
    const a = seedStudentsForUser(USER_ID, session.sessionId, {
      classroomId: CLASSROOM_ID,
      count: 2,
    });
    const b = seedStudentsForUser(USER_ID, session.sessionId, {
      classroomId: CLASSROOM_ID,
      count: 3,
    });
    const sim = readSimStoreForUser(USER_ID);
    expect(sim.bySession[session.sessionId]).toEqual([
      ...a.createdEnrollmentIds,
      ...b.createdEnrollmentIds,
    ]);
  });
});

describe('autoRespondForUser', () => {
  it('dispatches responses for each (enrollment × interaction) pair', () => {
    const session = startTestSession();
    const { createdEnrollmentIds } = seedStudentsForUser(
      USER_ID,
      session.sessionId,
      {
        classroomId: CLASSROOM_ID,
        count: 3,
      },
    );
    const interactions = [
      buildInteraction('ix-text', 'text'),
      buildInteraction('ix-choice', 'choice'),
    ];
    const publishedDay = buildPublishedDay(interactions);
    const { dispatched } = autoRespondForUser(USER_ID, {
      sessionId: session.sessionId,
      phaseKey: 'connectRegulate',
      publishedDay,
      enrollmentIds: createdEnrollmentIds,
    });
    expect(dispatched).toBe(3 * 2);
    const responses =
      readSessionsStoreForUser(USER_ID).responses[session.sessionId];
    expect(Object.keys(responses ?? {})).toHaveLength(3);
    for (const eid of createdEnrollmentIds) {
      expect(Object.keys(responses![eid] ?? {})).toHaveLength(2);
    }
  });

  it('is a no-op when the phase has no interactions', () => {
    const session = startTestSession();
    const publishedDay = buildPublishedDay([]);
    const { dispatched } = autoRespondForUser(USER_ID, {
      sessionId: session.sessionId,
      phaseKey: 'connectRegulate',
      publishedDay,
      enrollmentIds: ['enr-a'],
    });
    expect(dispatched).toBe(0);
  });
});

describe('clearSimulationForUser', () => {
  it('hard-deletes seeded enrollments and prunes their response bags', () => {
    const session = startTestSession();
    const { createdEnrollmentIds } = seedStudentsForUser(
      USER_ID,
      session.sessionId,
      {
        classroomId: CLASSROOM_ID,
        count: 2,
      },
    );
    const interactions = [buildInteraction('ix-text', 'text')];
    const publishedDay = buildPublishedDay(interactions);
    autoRespondForUser(USER_ID, {
      sessionId: session.sessionId,
      phaseKey: 'connectRegulate',
      publishedDay,
      enrollmentIds: createdEnrollmentIds,
    });
    const { removedEnrollmentIds } = clearSimulationForUser(
      USER_ID,
      session.sessionId,
    );
    expect(removedEnrollmentIds).toEqual(createdEnrollmentIds);
    const enrollments = readEnrollmentStoreForUser(USER_ID);
    for (const id of createdEnrollmentIds) {
      expect(enrollments.entries[id]).toBeUndefined();
    }
    const responses =
      readSessionsStoreForUser(USER_ID).responses[session.sessionId];
    expect(responses ?? {}).toEqual({});
    const sim = readSimStoreForUser(USER_ID);
    expect(sim.bySession[session.sessionId]).toBeUndefined();
  });
});
