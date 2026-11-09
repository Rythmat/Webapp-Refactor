/**
 * Writing approaches in the console's editors — bass lines, comping, parts:
 * the menu's pattern (2A 1B…) laid in before a goal, one item a step long
 * each, the last ending where the goal starts — round the loop's end when
 * the goal is near its start — in place of whatever was in those steps; an
 * item ringing into them ends where they start. An approach laid before an
 * item that is itself an approach makes that item a goal too: a chain.
 */

import {
  patternSteps,
  type ApproachMotion,
  type ApproachScale,
  type ApproachStep,
} from '@/curriculum/engine/approach/approach';
import {
  quartersToTime,
  timeToQuarters,
} from '@/curriculum/engine/bassLines/bassLine';
import type { TimeSignature } from '@/curriculum/engine/bassLines/harmony';

export interface ApproachChoice {
  pattern: string;
  motion: ApproachMotion;
  /** For diatonic approaches: the key's scale, or the goal chord's. */
  scale: ApproachScale;
}

/** What the editors' notes and hits have in common. */
export interface ApproachItem {
  _id: number;
  /** bar:beat:sixteenth. */
  time: string;
  /** Quarters. */
  dur: number;
  velocity: number;
  approach?: ApproachStep;
  goal?: boolean;
}

/** An approach's step as the choice writes it. */
export const stepOf = (choice: ApproachChoice, step: number): ApproachStep => ({
  step,
  motion: choice.motion,
  ...(choice.motion === 'diatonic' && choice.scale === 'goal'
    ? { scale: 'goal' as const }
    : {}),
});

export function applyApproach<T extends ApproachItem>(
  items: readonly T[],
  goalId: number,
  choice: ApproachChoice,
  /** Each approach item's length, in quarters. */
  stepQ: number,
  /** The loop's length, in quarters. */
  lineQ: number,
  ts: TimeSignature,
  /** A new item of this editor: its own fields around the shared ones. */
  make: (shared: Omit<ApproachItem, '_id'>, goal: T) => T,
): T[] {
  const goal = items.find((n) => n._id === goalId);
  if (!goal) return [...items];
  const goalQ = timeToQuarters(goal.time, ts);
  const steps = patternSteps(choice.pattern);
  const span = steps.length * stepQ;
  const wrap = (q: number) => ((q % lineQ) + lineQ) % lineQ;
  // How far before the goal an item starts, round the loop.
  const before = (q: number) => wrap(goalQ - q);
  const kept = items
    .filter((n) => {
      if (n._id === goalId) return true;
      const b = before(timeToQuarters(n.time, ts));
      return !(b > 1e-9 && b <= span + 1e-9);
    })
    .map((n) => {
      const marked = n._id === goalId && n.approach ? { ...n, goal: true } : n;
      // An item ringing into the approach (the goal itself, in a short loop)
      // ends where it starts: one at a time.
      const toStart = wrap(goalQ - span - timeToQuarters(n.time, ts));
      return toStart > 1e-9 && marked.dur > toStart + 1e-9
        ? { ...marked, dur: toStart }
        : marked;
    });
  const laid = steps.map((step, k) =>
    make(
      {
        time: quartersToTime(wrap(goalQ - (steps.length - k) * stepQ), ts),
        dur: stepQ,
        velocity: goal.velocity ?? 0.8,
        approach: stepOf(choice, step),
      },
      goal,
    ),
  );
  return [...kept, ...laid].sort(
    (a, b) => timeToQuarters(a.time, ts) - timeToQuarters(b.time, ts),
  );
}

/**
 * An approach's label: its steps from the goal, + above and − below, d when
 * diatonic, ◎ when it's a goal itself: '+2', '−1d◎'.
 */
export const approachLabel = (item: {
  approach?: ApproachStep;
  goal?: boolean;
}) => {
  const a = item.approach!;
  return `${a.step > 0 ? '+' : '−'}${Math.abs(a.step)}${a.motion === 'diatonic' ? 'd' : ''}${item.goal ? '◎' : ''}`;
};

/** An approach in words, for its tooltip. */
export const approachHint = (item: {
  approach?: ApproachStep;
  goal?: boolean;
}) => {
  const a = item.approach!;
  const away = Math.abs(a.step);
  return `Approach: ${away} ${a.motion === 'chromatic' ? 'half step' : 'scale step'}${away === 1 ? '' : 's'} ${a.step > 0 ? 'above' : 'below'} its goal${a.motion === 'diatonic' ? (a.scale === 'goal' ? ', in the goal chord’s scale' : ', in the key') : ''}${item.goal ? '; a goal too' : ''}`;
};
