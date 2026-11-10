/**
 * A Studio tutorial done by the whole class, at the teacher's pace (owner,
 * 2026-11-10). Opened from a Group Project slide with `follow=1`, the lesson
 * follows the class's step:
 *
 *   - a student is moved onto the class's step whenever the teacher moves it,
 *     and cannot go past it: finishing the class's step says so to the
 *     teacher and waits;
 *   - the teacher, leading from inside the Studio (`lead=1`), moves the class
 *     by moving through the lesson.
 *
 * Opened any other way, nothing here does anything.
 */
import { useEffect, useRef, useState } from 'react';
import { useClassFollow } from '@/features/classroom/follow/classFollow';

export interface TutorialClassFollow {
  following: boolean;
  leading: boolean;
  /** The class's step, for a student; undefined when leading or free. */
  classStep: number | undefined;
  /** Done with the class's step: Next and the auto-advance wait. */
  holding: boolean;
  /** Finished the class's step and told the teacher. */
  waiting: boolean;
  doneCount: number;
  /** Next was pressed at the class's step: report it and wait. */
  holdAtClassStep: () => void;
}

export const useTutorialClassFollow = ({
  activeId,
  stepIndex,
  total,
  status,
  isLast,
  stepTitle,
  goTo,
}: {
  activeId: string | null;
  stepIndex: number;
  total: number;
  status: 'waiting' | 'done';
  isLast: boolean;
  stepTitle: string | undefined;
  goTo: (index: number) => void;
}): TutorialClassFollow => {
  const follow = useClassFollow(
    activeId ? `studio:tutorial:${activeId}` : undefined,
  );
  const classStep =
    follow.following && !follow.leading ? follow.step : undefined;
  const [waitingAt, setWaitingAt] = useState<number | null>(null);

  // Onto the class's step whenever the teacher moves it.
  const lastClassStep = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (classStep === undefined || classStep === lastClassStep.current) return;
    lastClassStep.current = classStep;
    setWaitingAt(null);
    if (activeId && classStep < total && classStep !== stepIndex)
      goTo(classStep);
  }, [classStep, activeId, total, stepIndex, goTo]);

  // Leading: the class goes where the teacher goes.
  const { lead, reportDone } = follow;
  useEffect(() => {
    if (!follow.following || !follow.leading || !activeId) return;
    lead(stepIndex, total, stepTitle);
  }, [
    follow.following,
    follow.leading,
    activeId,
    stepIndex,
    total,
    stepTitle,
    lead,
  ]);

  // A validated step detected done at the class's step: tell the teacher.
  useEffect(() => {
    if (
      classStep !== undefined &&
      status === 'done' &&
      stepIndex === classStep &&
      waitingAt !== stepIndex
    ) {
      setWaitingAt(stepIndex);
      reportDone(stepIndex);
    }
  }, [classStep, status, stepIndex, waitingAt, reportDone]);

  // The last step finishes the lesson as usual once the class is on it.
  const holding =
    classStep !== undefined &&
    stepIndex >= classStep &&
    !(isLast && classStep >= total - 1);

  return {
    following: follow.following,
    leading: follow.leading,
    classStep,
    holding,
    waiting: holding && waitingAt === stepIndex,
    doneCount: follow.doneCount,
    holdAtClassStep: () => {
      if (waitingAt === stepIndex) return;
      setWaitingAt(stepIndex);
      reportDone(stepIndex);
    },
  };
};
