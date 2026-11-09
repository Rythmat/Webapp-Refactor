import { describe, expect, it } from 'vitest';
import {
  buildReviewQueue,
  parseReviewKey,
  type ReviewSource,
} from '../reviewModel';

const source = (over: Partial<ReviewSource> = {}): ReviewSource => ({
  classroomId: 'c1',
  className: 'Jazz Band',
  assignments: [{ id: 'a1', title: 'Blues', kind: 'instructions' }],
  progress: () => [
    {
      enrollmentId: 'e1',
      status: 'done',
      updatedAt: '2026-11-08T10:00:00.000Z',
    },
    {
      enrollmentId: 'e2',
      status: 'in_progress',
      updatedAt: '2026-11-08T11:00:00.000Z',
    },
    {
      enrollmentId: 'e3',
      status: 'done',
      updatedAt: '2026-11-09T09:00:00.000Z',
    },
  ],
  names: { e1: 'Ana', e3: 'Theo' },
  ...over,
});

describe('buildReviewQueue', () => {
  it('lists turned-in work only, newest first', () => {
    const q = buildReviewQueue([source()], {});
    expect(q.map((i) => i.studentName)).toEqual(['Theo', 'Ana']);
    expect(q[0]).toMatchObject({
      key: 'c1/a1/e3',
      className: 'Jazz Band',
      assignmentTitle: 'Blues',
      reviewed: false,
    });
  });

  it('merges classes', () => {
    const q = buildReviewQueue(
      [source(), source({ classroomId: 'c2', className: 'Choir' })],
      {},
    );
    expect(new Set(q.map((i) => i.className))).toEqual(
      new Set(['Jazz Band', 'Choir']),
    );
    expect(q).toHaveLength(4);
  });

  it('keeps reviewed work reviewed until it is turned in again', () => {
    const q = buildReviewQueue([source()], {
      'c1/a1/e1': '2026-11-08T12:00:00.000Z', // after Ana turned it in
      'c1/a1/e3': '2026-11-09T08:00:00.000Z', // before Theo's last turn-in
    });
    expect(q.find((i) => i.enrollmentId === 'e1')?.reviewed).toBe(true);
    expect(q.find((i) => i.enrollmentId === 'e3')?.reviewed).toBe(false);
  });

  it('names a student it cannot find', () => {
    const q = buildReviewQueue([source({ names: {} })], {});
    expect(q[0].studentName).toBe('A student');
  });
});

describe('parseReviewKey', () => {
  it('reads its own keys and nothing else', () => {
    expect(parseReviewKey('c1/a1/e1')).toEqual({
      classroomId: 'c1',
      assignmentId: 'a1',
      enrollmentId: 'e1',
    });
    for (const bad of [null, '', 'c1/a1', 'c1//e1', 'a/b/c/d']) {
      expect(parseReviewKey(bad)).toBeNull();
    }
  });
});
