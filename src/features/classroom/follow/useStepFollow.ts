/**
 * Lockstep for any activity that runs as steps (owner, 2026-11-10): a Studio
 * tutorial, a Learn lesson, a Globe tour. The player says where it is
 * (`position`, 0-based, out of `total`) and how to go somewhere (`goTo`);
 * this keeps it on the class's step:
 *
 *   - a student is moved onto the class's step whenever the teacher moves it,
 *     and pulled back if they jump past it;
 *   - at the class's step, finishing is reported to the teacher and the
 *     player holds (`holding`) until the teacher moves on;
 *   - the teacher, leading from inside the activity, moves the class by
 *     moving through it.
 *
 * A tab not opened to follow the class gets `following: false` and nothing
 * here touches it.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useClassFollow } from './classFollow';

export interface StepFollow {
  following: boolean;
  leading: boolean;
  /** The class's step, for a student; undefined when leading or free. */
  classStep: number | undefined;
  /** At (or past) the class's step: the player must not move on by itself. */
  holding: boolean;
  /** Finished the class's step and told the teacher. */
  waiting: boolean;
  /** Students finished the class's step (the teacher's tab). */
  doneCount: number;
  /** The student finished the class's step: tell the teacher, then wait. */
  finishStep: () => void;
}

export const useStepFollow = ({
  ref,
  position,
  total,
  title,
  goTo,
  active = true,
}: {
  /** The activity's ref; the launch's own by default. */
  ref?: string;
  position: number;
  total: number;
  /** The step's short name, for the room and the teacher's control. */
  title?: string;
  goTo: (step: number) => void;
  /** False while the player isn't running yet (no lesson loaded). */
  active?: boolean;
}): StepFollow => {
  const follow = useClassFollow(ref);
  const on = follow.following && active;
  const classStep = on && !follow.leading ? follow.step : undefined;
  const [waitingAt, setWaitingAt] = useState<number | null>(null);

  // Onto the class's step whenever the teacher moves it.
  const goToRef = useRef(goTo);
  goToRef.current = goTo;
  const lastClassStep = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (classStep === undefined || classStep === lastClassStep.current) return;
    lastClassStep.current = classStep;
    setWaitingAt(null);
    if (classStep < total && classStep !== position) goToRef.current(classStep);
  }, [classStep, total, position]);

  // Never past the class: a jump ahead (a section tab, a skip) comes back.
  useEffect(() => {
    if (classStep !== undefined && position > classStep)
      goToRef.current(classStep);
  }, [classStep, position]);

  // Leading: the class goes where the teacher goes.
  const { lead, reportDone } = follow;
  useEffect(() => {
    if (!on || !follow.leading) return;
    lead(position, total, title);
  }, [on, follow.leading, position, total, title, lead]);

  const finishStep = useCallback(() => {
    if (waitingAt === position) return;
    setWaitingAt(position);
    reportDone(position);
  }, [waitingAt, position, reportDone]);

  // The last step finishes as usual once the class is on it.
  const holding =
    classStep !== undefined &&
    position >= classStep &&
    !(classStep >= total - 1 && position >= total - 1);

  return {
    following: on,
    leading: follow.leading,
    classStep,
    holding,
    waiting: classStep !== undefined && waitingAt === position,
    doneCount: follow.doneCount,
    finishStep,
  };
};
