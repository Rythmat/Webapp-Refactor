/**
 * A Studio tutorial done by the whole class, at the teacher's pace (owner,
 * 2026-11-10): the shared lockstep (`useStepFollow`) over the lesson's
 * steps, plus one Studio rule. A validated step is finished when the Studio
 * detects it (not when Next is pressed), so that is when the teacher hears
 * of it. Opened any other way, nothing here does anything.
 */
import { useEffect } from 'react';
import {
  useStepFollow,
  type StepFollow,
} from '@/features/classroom/follow/useStepFollow';

export const useTutorialClassFollow = ({
  activeId,
  stepIndex,
  total,
  status,
  stepTitle,
  goTo,
}: {
  activeId: string | null;
  stepIndex: number;
  total: number;
  status: 'waiting' | 'done';
  stepTitle: string | undefined;
  goTo: (index: number) => void;
}): StepFollow => {
  const follow = useStepFollow({
    ref: activeId ? `studio:tutorial:${activeId}` : undefined,
    position: stepIndex,
    total,
    ...(stepTitle ? { title: stepTitle } : {}),
    goTo,
    active: Boolean(activeId),
  });

  // A validated step detected done at the class's step: tell the teacher.
  const { classStep, finishStep } = follow;
  useEffect(() => {
    if (classStep !== undefined && status === 'done' && stepIndex === classStep)
      finishStep();
  }, [classStep, status, stepIndex, finishStep]);

  return follow;
};
