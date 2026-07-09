/**
 * assignmentsLoop.test — end-to-end publish → assign → run → progress loop
 * exercised through the pure store helpers exported from the hook modules.
 * These are the functions the Sprint 3 REST swap will replace — testing them
 * pins the storage schema and the Rule 1 firewall belt.
 */
// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { newBlankDay } from '../plan/newBlankDay';
import {
  FORBIDDEN_SUBSTRINGS,
  findForbiddenSubstring,
} from '../publish/publishDay';
import {
  STORAGE_KEY as PUBLISHED_KEY,
  publishDayForUser,
  readPublishedStoreForUser,
  unpublishForUser,
} from '../publish/usePublishedDays';
import type { Cell, Day } from '../types';
import {
  STORAGE_KEY as ASSIGNMENTS_KEY,
  type AssignmentStore,
} from './assignmentsStore';
import {
  readProgressStoreForUser,
  recordMyResponseForUser,
  setMyProgressForUser,
} from './useAssignmentProgress';
import {
  createAssignmentForUser,
  readAssignmentStoreForUser,
} from './useAssignments';

const USER_ID = 'test-user';
const CLASSROOM_ID = 'classroom-test';
const ENROLLMENT_ID = 'local-preview';

const hydratedDay = (id?: string): Day => {
  const base = newBlankDay('Loop Test Day');
  const fill = (cell: Cell, label: string): Cell => ({
    ...cell,
    presentation: {
      ...cell.presentation,
      title: { en: `${label} title` },
      prompt: { en: `${label} prompt` },
      interactions: [
        {
          id: `ix-${label}`,
          type: 'text',
          question: { en: `question ${label}?` },
          shareable: true,
          text: { maxLen: 100 },
        },
      ],
    },
    rationale: {
      ...cell.rationale,
      notes: 'private teacher pacing notes',
      standards: ['MU:Cr1.1'],
      assessment: { en: 'rubric points' },
    },
  });
  return {
    ...base,
    id: id ?? base.id,
    cells: {
      connectRegulate: fill(base.cells.connectRegulate, 'connect'),
      groupPractice: fill(base.cells.groupPractice, 'practice'),
      creativeProjects: fill(base.cells.creativeProjects, 'create'),
      presentPerform: fill(base.cells.presentPerform, 'share'),
      respondReflectReset: fill(base.cells.respondReflectReset, 'reflect'),
    },
  };
};

const assertNoForbiddenKeys = (obj: unknown): void => {
  const walk = (v: unknown): void => {
    if (Array.isArray(v)) {
      v.forEach(walk);
      return;
    }
    if (v && typeof v === 'object') {
      for (const [key, val] of Object.entries(v)) {
        const lower = key.toLowerCase();
        for (const forbidden of FORBIDDEN_SUBSTRINGS) {
          expect(
            lower.includes(forbidden),
            `key "${key}" contains forbidden substring "${forbidden}"`,
          ).toBe(false);
        }
        walk(val);
      }
    }
  };
  walk(obj);
};

const getResolver = () => ({
  getPublishedDay: (publishedDayId: string) =>
    readPublishedStoreForUser(USER_ID).entries[publishedDayId],
});

beforeEach(() => {
  window.localStorage.clear();
});

describe('publishedDays store', () => {
  it('publishes a Day, stores a snapshot free of forbidden substrings, and keeps sourceRef', () => {
    const day = hydratedDay();
    const pd = publishDayForUser(USER_ID, {
      classroomId: CLASSROOM_ID,
      day,
    });

    const stored = readPublishedStoreForUser(USER_ID).entries[pd.id];
    expect(stored).toBeDefined();
    expect(stored!.sourceRef).toBe(day.id);
    expect(findForbiddenSubstring(stored!.snapshot)).toBeNull();

    const rawKey = `${PUBLISHED_KEY}:${USER_ID}`;
    const rawEnvelope = JSON.parse(window.localStorage.getItem(rawKey) ?? '{}');
    assertNoForbiddenKeys(rawEnvelope);
  });

  it('republishing the same Day upserts on (classroomId, sourceRef) — id stays stable', () => {
    const day = hydratedDay();
    const first = publishDayForUser(USER_ID, {
      classroomId: CLASSROOM_ID,
      day,
    });
    const second = publishDayForUser(USER_ID, {
      classroomId: CLASSROOM_ID,
      day,
    });

    expect(second.id).toBe(first.id);
    const store = readPublishedStoreForUser(USER_ID);
    expect(Object.keys(store.entries)).toHaveLength(1);
  });

  it('sends new id when the same day is published to a different classroom', () => {
    const day = hydratedDay();
    const a = publishDayForUser(USER_ID, {
      classroomId: 'classroom-a',
      day,
    });
    const b = publishDayForUser(USER_ID, {
      classroomId: 'classroom-b',
      day,
    });

    expect(a.id).not.toBe(b.id);
  });
});

describe('assignments store', () => {
  const publishForTest = () => {
    const day = hydratedDay();
    const pd = publishDayForUser(USER_ID, {
      classroomId: CLASSROOM_ID,
      day,
    });
    return { day, pd };
  };

  it('creates a kind=day assignment referencing a valid publishedDayId', () => {
    const { pd } = publishForTest();
    const assignment = createAssignmentForUser(
      USER_ID,
      {
        classroomId: CLASSROOM_ID,
        title: 'Warm-up assignment',
        kind: 'day',
        publishedDayId: pd.id,
      },
      getResolver(),
    );

    expect(assignment.publishedDayId).toBe(pd.id);
    expect(assignment.status).toBe('open');
  });

  it('creates a kind=instructions assignment', () => {
    const assignment = createAssignmentForUser(
      USER_ID,
      {
        classroomId: CLASSROOM_ID,
        title: 'Read chapter 1',
        kind: 'instructions',
        instructions: 'Read pages 1-10 by Friday.',
      },
      getResolver(),
    );

    expect(assignment.kind).toBe('instructions');
    expect(assignment.instructions).toBe('Read pages 1-10 by Friday.');
    expect(assignment.publishedDayId).toBeNull();
  });

  it('rejects kind=atlas at the store layer', () => {
    expect(() =>
      createAssignmentForUser(
        USER_ID,
        {
          classroomId: CLASSROOM_ID,
          title: 'x',
          kind: 'atlas',
        },
        getResolver(),
      ),
    ).toThrow(/not enabled/);
  });

  it('rejects kind=day without a publishedDayId', () => {
    expect(() =>
      createAssignmentForUser(
        USER_ID,
        {
          classroomId: CLASSROOM_ID,
          title: 'x',
          kind: 'day',
        },
        getResolver(),
      ),
    ).toThrow(/publishedDayId required/);
  });

  it('rejects kind=day when the publishedDay belongs to another classroom', () => {
    const day = hydratedDay();
    const pd = publishDayForUser(USER_ID, {
      classroomId: 'classroom-a',
      day,
    });

    expect(() =>
      createAssignmentForUser(
        USER_ID,
        {
          classroomId: 'classroom-b',
          title: 'x',
          kind: 'day',
          publishedDayId: pd.id,
        },
        getResolver(),
      ),
    ).toThrow(/different classroom/);
  });

  it('rejects kind=instructions without a non-empty body', () => {
    expect(() =>
      createAssignmentForUser(
        USER_ID,
        {
          classroomId: CLASSROOM_ID,
          title: 'x',
          kind: 'instructions',
          instructions: '   ',
        },
        getResolver(),
      ),
    ).toThrow(/instructions required/);
  });
});

describe('progress + responses', () => {
  const startLoop = () => {
    const day = hydratedDay();
    const pd = publishDayForUser(USER_ID, {
      classroomId: CLASSROOM_ID,
      day,
    });
    const assignment = createAssignmentForUser(
      USER_ID,
      {
        classroomId: CLASSROOM_ID,
        title: 'Loop',
        kind: 'day',
        publishedDayId: pd.id,
      },
      getResolver(),
    );
    return { pd, assignment };
  };

  it('runs the full loop: progress moves to done with an artifact', () => {
    const { assignment } = startLoop();

    setMyProgressForUser(USER_ID, {
      assignmentId: assignment.id,
      enrollmentId: ENROLLMENT_ID,
      status: 'in_progress',
    });
    recordMyResponseForUser(USER_ID, {
      assignmentId: assignment.id,
      enrollmentId: ENROLLMENT_ID,
      interactionId: 'ix-practice',
      payload: { kind: 'text', text: 'hello' },
    });
    setMyProgressForUser(USER_ID, {
      assignmentId: assignment.id,
      enrollmentId: ENROLLMENT_ID,
      status: 'done',
      artifactRef: {
        module: 'studio',
        deepLink: 'https://example/artifact',
      },
    });

    const store = readProgressStoreForUser(USER_ID);
    const row = store.progress[assignment.id]?.[ENROLLMENT_ID];
    expect(row?.status).toBe('done');
    expect(row?.artifactRef?.module).toBe('studio');
    expect(
      Object.keys(store.responses[assignment.id]?.[ENROLLMENT_ID] ?? {}),
    ).toHaveLength(1);
  });

  it('upserts responses per interactionId (no double-count on resubmit)', () => {
    const { assignment } = startLoop();

    recordMyResponseForUser(USER_ID, {
      assignmentId: assignment.id,
      enrollmentId: ENROLLMENT_ID,
      interactionId: 'ix-1',
      payload: { kind: 'text', text: 'first' },
    });
    recordMyResponseForUser(USER_ID, {
      assignmentId: assignment.id,
      enrollmentId: ENROLLMENT_ID,
      interactionId: 'ix-1',
      payload: { kind: 'text', text: 'second' },
    });

    const store = readProgressStoreForUser(USER_ID);
    const bag = store.responses[assignment.id]?.[ENROLLMENT_ID] ?? {};
    expect(Object.keys(bag)).toHaveLength(1);
    expect(bag['ix-1']).toEqual({ kind: 'text', text: 'second' });
  });

  it('unpublish cascade-closes open assignments referencing the removed publishedDay', () => {
    const { pd, assignment } = startLoop();

    unpublishForUser(USER_ID, pd.id);

    const rawKey = `${ASSIGNMENTS_KEY}:${USER_ID}`;
    const raw = JSON.parse(
      window.localStorage.getItem(rawKey) ?? '{}',
    ) as AssignmentStore;
    expect(raw.entries[assignment.id].status).toBe('closed');

    const readBack = readAssignmentStoreForUser(USER_ID);
    expect(readBack.entries[assignment.id].status).toBe('closed');
  });
});
