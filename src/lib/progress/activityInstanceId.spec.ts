import { describe, expect, it } from 'vitest';
import { buildActivityInstanceId } from './activityInstanceId';

describe('buildActivityInstanceId', () => {
  it('is deterministic for lesson/activity/mode/root', () => {
    expect(
      buildActivityInstanceId({
        lessonId: 'mode-lesson-flow',
        lessonVersion: 1,
        activityDefId: 'asc-pa',
        mode: 'ionian',
        root: 'C',
      }),
    ).toBe('mode-lesson-flow::v1::asc-pa::ionian::c');
  });
});
