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
  aheadMeansDone = false,
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
  /**
   * For a player whose Next can't be held (the Globe's tour card): a student
   * moving on from the class's step has finished it, so that is reported
   * as they're brought back.
   */
  aheadMeansDone?: boolean;
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

  // Leading: the class goes where the teacher goes.
  const { lead, reportDone } = follow;

  // Never past the class: a jump ahead (a section tab, a skip) comes back.
  useEffect(() => {
    if (classStep === undefined || position <= classStep) return;
    if (aheadMeansDone && waitingAt !== classStep) {
      setWaitingAt(classStep);
      reportDone(classStep);
    }
    goToRef.current(classStep);
  }, [classStep, position, aheadMeansDone, waitingAt, reportDone]);
  // A leader opened mid-activity (Present coming back to the Group Practice
  // slide's Studio) first goes to where the class is, rather than taking the
  // class back to its own first step.
  const joined = useRef(false);
  const classAt = follow.step;
  useEffect(() => {
    if (!on || !follow.leading) return;
    if (!joined.current) {
      joined.current = true;
      if (classAt !== undefined && classAt !== position && classAt < total) {
        goToRef.current(classAt);
        return;
      }
    }
    lead(position, total, title);
    // `classAt` is read once, as the leader joins.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
