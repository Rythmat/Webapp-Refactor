import { describe, expect, it } from 'vitest';
import { selectResumeActivityIndex } from './resume';

describe('selectResumeActivityIndex', () => {
  const activities = [
    { activityInstanceId: 'a1' },
    { activityInstanceId: 'a2' },
    { activityInstanceId: 'a3' },
  ];

  it('resumes current activity when not completed', () => {
    const idx = selectResumeActivityIndex({
      activities,
      progress: {
        currentActivityInstanceId: 'a2',
        progressByActivityInstanceId: {
          a1: { status: 'COMPLETED', attempts: 1, updatedAt: '2026-02-23T00:00:00.000Z' },
          a2: { status: 'IN_PROGRESS', attempts: 1, updatedAt: '2026-02-23T00:01:00.000Z' },
        },
      },
    });

    expect(idx).toBe(1);
  });

  it('falls back to first not-started when current is completed', () => {
    const idx = selectResumeActivityIndex({
      activities,
      progress: {
        currentActivityInstanceId: 'a2',
        progressByActivityInstanceId: {
          a1: { status: 'COMPLETED', attempts: 1, updatedAt: '2026-02-23T00:00:00.000Z' },
          a2: { status: 'COMPLETED', attempts: 1, updatedAt: '2026-02-23T00:01:00.000Z' },
        },
      },
    });

    expect(idx).toBe(2);
  });

  it('returns -1 when all activities are completed', () => {
    const idx = selectResumeActivityIndex({
      activities,
      progress: {
        currentActivityInstanceId: null,
        progressByActivityInstanceId: {
          a1: { status: 'COMPLETED', attempts: 1, updatedAt: '2026-02-23T00:00:00.000Z' },
          a2: { status: 'COMPLETED', attempts: 1, updatedAt: '2026-02-23T00:01:00.000Z' },
          a3: { status: 'COMPLETED', attempts: 1, updatedAt: '2026-02-23T00:02:00.000Z' },
        },
      },
    });

    expect(idx).toBe(-1);
  });
});
