// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTutorialProgressStore } from '@/features/tutorials/useTutorialProgressStore';
import type { LabLesson } from '../../catalog';
import {
  audioStepId,
  labPercent,
  resumePoint,
  useAudioProgress,
} from '../audioProgress';

type Handlers = { onSuccess?: () => void; onError?: () => void };
const updateProgress = vi.fn<(body: unknown, handlers: Handlers) => void>();
const awardStep = vi.fn();
const awardLesson = vi.fn();
vi.mock('@/hooks/data/progress/useUpdateActivityProgress', () => ({
  useUpdateActivityProgress: () => ({ mutate: updateProgress }),
}));
vi.mock('@/hooks/data/experience/useAwardExperience', () => ({
  useAwardLessonActivityExperience: () => ({ mutate: awardStep }),
  useAwardLessonCompletionExperience: () => ({ mutate: awardLesson }),
}));

const topic = (id: string) => ({ id, title: id, tab: id, sub: id });
const UNIT: LabLesson = {
  kind: 'lab',
  id: 'unit',
  title: 'Unit',
  ratio: [1, 2],
  topics: [topic('one'), topic('two')],
};
const STEPS = ['hear', 'predict', 'reveal', 'try'] as const;
const step = (topicId: string, id: (typeof STEPS)[number]) =>
  audioStepId('m', 'unit', topicId, id);

describe('a student’s progress through a unit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useTutorialProgressStore.setState({ completedAt: {} });
  });

  const hook = () => renderHook(() => useAudioProgress('m', UNIT)).result;

  it('sends a finished step to the server, all under the one lesson', () => {
    const result = hook();
    act(() => result.current.stepDone('two', 'hear'));
    expect(updateProgress.mock.calls[0][0]).toMatchObject({
      activityInstanceId: 'audio:m:unit:two:hear',
      lessonId: 'audio:m:unit',
      activityDefId: 'two:hear',
      lessonVersion: 1,
      status: 'COMPLETED',
    });
  });

  it('keeps the student’s progress when the server turns it away', () => {
    const result = hook();
    updateProgress.mockImplementationOnce((_, h) => h.onError?.());
    act(() => result.current.stepDone('one', 'hear'));
    expect(result.current.percent).toBe(13);
    expect(awardStep).not.toHaveBeenCalled();
  });

  it('awards XP only once the server has accepted a step', () => {
    const result = hook();
    act(() => result.current.stepDone('one', 'hear'));
    expect(awardStep).not.toHaveBeenCalled();
    act(() => updateProgress.mock.calls[0][1].onSuccess?.());
    expect(awardStep).toHaveBeenCalledWith('audio:m:unit:one:hear');
    expect(awardLesson).not.toHaveBeenCalled();
  });

  it('doesn’t send a step twice', () => {
    const result = hook();
    act(() => result.current.stepDone('one', 'hear'));
    act(() => result.current.stepDone('one', 'hear'));
    expect(updateProgress).toHaveBeenCalledTimes(1);
  });

  it('awards the lesson once, on the last step of its last topic', () => {
    const result = hook();
    updateProgress.mockImplementation((_, h) => h.onSuccess?.());
    for (const id of STEPS) act(() => result.current.stepDone('one', id));
    for (const id of STEPS.slice(0, 3)) {
      act(() => result.current.stepDone('two', id));
    }
    expect(awardLesson).not.toHaveBeenCalled();
    act(() => result.current.stepDone('two', 'try'));
    expect(awardLesson).toHaveBeenCalledTimes(1);
    expect(awardLesson).toHaveBeenCalledWith('audio:m:unit');
    expect(result.current.percent).toBe(100);
  });

  it('counts a unit’s steps across its topics, and no one else’s', () => {
    expect(labPercent({}, 'm', UNIT)).toBe(0);
    expect(labPercent({ [step('two', 'try')]: 1 }, 'm', UNIT)).toBe(13);
    expect(
      labPercent({ [audioStepId('m', 'x', 'two', 'try')]: 1 }, 'm', UNIT),
    ).toBe(0);
  });

  it('resumes at the first step still to do, or the start once all are done', () => {
    expect(resumePoint({}, 'm', UNIT)).toEqual({
      topicId: 'one',
      step: 'hear',
    });
    const first = Object.fromEntries(STEPS.map((id) => [step('one', id), 1]));
    expect(resumePoint(first, 'm', UNIT)).toEqual({
      topicId: 'two',
      step: 'hear',
    });
    expect(
      resumePoint({ ...first, [step('two', 'hear')]: 1 }, 'm', UNIT),
    ).toEqual({ topicId: 'two', step: 'predict' });
    const all = Object.fromEntries(
      ['one', 'two'].flatMap((t) => STEPS.map((id) => [step(t, id), 1])),
    );
    expect(resumePoint(all, 'm', UNIT)).toEqual({
      topicId: 'one',
      step: 'hear',
    });
  });
});
