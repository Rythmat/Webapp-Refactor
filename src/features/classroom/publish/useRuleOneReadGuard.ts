/**
 * Rule 1 on the READ path — fail soft, never blank the lesson.
 *
 * The WRITE path (`publishDayToClassroom` / `publishDayForUser`) throws on a
 * forbidden key: a leak must never be persisted. The read path must do the
 * opposite. A teacher standing in front of a class must never be blocked by a
 * stray key in a snapshot published by an older build — stripping the key
 * protects the student, blocking the lesson protects nobody.
 *
 * So every student-facing surface funnels its snapshot through one of these
 * hooks, renders the sanitized value, and reports what was dropped to
 * telemetry. A `snapshot_keys_stripped` event is never expected in a healthy
 * system; one means some publish path's projection is incomplete.
 *
 * Consumers: `live/LiveSessionPage`, `live/ProjectorPage`,
 * `assignments/AssignmentDayRunner`, `PresentationMode`.
 */
import { useEffect, useMemo } from 'react';
import { trackSnapshotKeysStripped } from '@/telemetry';
import type { Day } from '../types';
import { migrateSnapshot } from './migrateSnapshot';
import { sanitizeSnapshot } from './publishDay';
import type { PublishedDay } from './usePublishedDays';

/** Which surface reported the strip. */
export type RuleOneSurface =
  | 'live-session'
  | 'projector'
  | 'assignment-runner'
  | 'presentation-mode'
  /** The teacher's own live dashboard — also a snapshot reader. */
  | 'teacher-dashboard';

interface GuardContext {
  classroomId?: string;
  publishedDayId?: string;
}

/**
 * Report a non-empty strip list exactly once per distinct result, without
 * re-firing on every render. `paths` are dot-paths, never values — the whole
 * point is that the offending CONTENT does not travel.
 */
const useReportStripped = (
  surface: RuleOneSurface,
  stripped: string[],
  ctx: GuardContext,
): void => {
  const key = stripped.join('|');
  const { classroomId, publishedDayId } = ctx;
  useEffect(() => {
    if (!key) return;
    trackSnapshotKeysStripped(surface, key.split('|'), {
      ...(classroomId ? { classroomId } : {}),
      ...(publishedDayId ? { publishedDayId } : {}),
    });
  }, [surface, key, classroomId, publishedDayId]);
};

/**
 * Normalize and sanitize a stored `PublishedDay` before any surface reads it:
 * bring an out-of-date snapshot to the current shape (re-projecting from
 * `sourceDay` when the caller has it), then strip any forbidden key.
 *
 * Returns the SAME object reference when nothing changed — the common case —
 * so downstream memoization is unaffected.
 *
 * `sourceDay` is optional on purpose. Only the authoring teacher's browser
 * holds the Day; a student surface passes nothing and gets case 3 (render the
 * stored shape as-is). See `migrateSnapshot.ts`.
 */
export interface SanitizedPublishedDay {
  /** The snapshot-safe record to render. Undefined when there is none. */
  day: PublishedDay | undefined;
  /**
   * Dot-paths of any teacher-only keys removed on the way through. Non-empty
   * means the lesson was REPAIRED to render — surfaces show
   * `SnapshotRepairBadge` so the degradation is never silent.
   */
  stripped: string[];
}

export const useSanitizedPublishedDay = (
  publishedDay: PublishedDay | undefined,
  surface: RuleOneSurface,
  classroomId?: string,
  sourceDay?: Day,
): SanitizedPublishedDay => {
  const { day, stripped } = useMemo(() => {
    if (!publishedDay) return { day: undefined, stripped: [] as string[] };
    const result = migrateSnapshot(publishedDay.snapshot, sourceDay);
    if (result.snapshot === publishedDay.snapshot) {
      return { day: publishedDay, stripped: result.stripped };
    }
    return {
      day: { ...publishedDay, snapshot: result.snapshot },
      stripped: result.stripped,
    };
  }, [publishedDay, sourceDay]);

  useReportStripped(surface, stripped, {
    ...(classroomId ? { classroomId } : {}),
    ...(day ? { publishedDayId: day.id } : {}),
  });

  return { day, stripped };
};

/**
 * Sanitize an already-projected student view (the `buildStudentView` path used
 * by Presentation Mode, which reads the teacher's local Day rather than a
 * published snapshot). Same contract: strip, render, report.
 */
export const useSanitizedStudentView = <T>(
  view: T,
  surface: RuleOneSurface,
  ctx: GuardContext = {},
): { view: T; stripped: string[] } => {
  const { value, stripped } = useMemo(() => {
    const result = sanitizeSnapshot(view);
    return result.stripped.length === 0
      ? { value: view, stripped: [] as string[] }
      : { value: result.snapshot, stripped: result.stripped };
  }, [view]);

  useReportStripped(surface, stripped, ctx);

  return { view: value, stripped };
};
