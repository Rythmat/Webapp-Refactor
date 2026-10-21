import { useMemo } from 'react';
import type { FingeringTimeline } from '@/lib/learn/pianoFingering';
import type { FingeringCursor } from './handFrames';

/**
 * The hands and finger numbers an activity's keyboard shows, as the lesson
 * around it (ActivityFlow) hands them down. The lesson knows the demo, the
 * look before a run and the graded take; during practice it leaves `cursor`
 * null, and the activity points the hands at the notes it lights as due.
 */
export interface ActivityFingering {
  timeline: FingeringTimeline;
  cursor: FingeringCursor | null;
  hands: boolean;
  numbers: boolean;
}

/** The keyboard's fingering for an activity: its cursor, or the notes due. */
export function useActivityKeyboardFingering(
  fingering: ActivityFingering | undefined,
  due: ReadonlyMap<number, unknown>,
  keyColor: string,
) {
  const dueMidis = useMemo(() => new Set(due.keys()), [due]);
  return useMemo(
    () =>
      fingering
        ? {
            timeline: fingering.timeline,
            cursor: fingering.cursor ?? {
              kind: 'due' as const,
              midis: dueMidis,
            },
            hands: fingering.hands,
            numbers: fingering.numbers,
            keyColor,
          }
        : undefined,
    [fingering, dueMidis, keyColor],
  );
}
