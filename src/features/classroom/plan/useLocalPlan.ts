/**
 * `useLocalPlan` — the React binding over the curriculum repository's Day
 * operations.
 *
 * Storage no longer lives here. Days sit behind
 * `persistence/localCurriculumRepository`, which owns the key, the v1→v2
 * migration and the IndexedDB mirror. This module is now a subscription plus a
 * stable callback surface, so P10 can swap the adapter without touching any of
 * the ~12 consumers.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  PLAN_KEY,
  PLAN_SCHEMA_VERSION,
  localCurriculumRepository as repo,
} from '../persistence/localCurriculumRepository';
import type { Day } from '../types';

/**
 * Re-exported for `settings/planBackup.ts` and tests. The KEY keeps its `:v1`
 * namespace: in this repo `:vN` is a namespace and the schema version lives in
 * the blob.
 */
export const STORAGE_KEY = PLAN_KEY;
export const SCHEMA_VERSION = PLAN_SCHEMA_VERSION;

export interface Plan {
  schemaVersion: number;
  days: Record<string, Day>;
}

export interface UseLocalPlan {
  plan: Plan;
  getDay: (dayId: string) => Day | undefined;
  saveDay: (day: Day) => void;
  deleteDay: (dayId: string) => void;
  /**
   * Remove every authored Day IN ONE CLASSROOM (e.g. "Reset to canonical
   * template"). Published snapshots + live sessions are a separate store and
   * are unaffected.
   *
   * `classroomId` is REQUIRED. It used to wipe the global bucket, so a reset in
   * one section deleted every other section's lessons. Unassigned Days are
   * preserved too — the tray exists to rescue them, and a reset in an unrelated
   * classroom must not be what finally destroys them.
   */
  clearAllDays: (classroomId: string) => void;
  /** Days belonging to `classroomId`. Never returns another classroom's Days. */
  listDays: (classroomId: string) => Day[];
  /** Days with no classroom — surfaced in the Lessons tray, never auto-claimed. */
  listUnassignedDays: () => Day[];
  /**
   * False while IndexedDB is still hydrating, when a synchronous read can
   * report EMPTY for a store that is not. Surfaces must show "loading", not
   * "no lessons yet" — telling a teacher their work is gone is the worst
   * possible lie to tell during a hydration window.
   */
  isHydrated: boolean;
}

/**
 * @param classroomId  When given, `saveDay` STAMPS this classroom onto any Day
 *   that does not already carry one. This is the single chokepoint that keeps
 *   new Days scoped — putting the stamp in each of the ~6 creation sites would
 *   mean the next new site silently creates an unassigned Day. Omit it on
 *   read-only consumers.
 */
/**
 * @param classroomId  When given, `saveDay` STAMPS this classroom onto any Day
 *   that does not already carry one — the single chokepoint that keeps new Days
 *   scoped. Omit it on read-only consumers.
 */
export const useLocalPlan = (classroomId?: string): UseLocalPlan => {
  // A version counter, not the data: the repository is the source of truth and
  // its reads are synchronous, so re-rendering is all this needs to do.
  const [, bump] = useState(0);

  useEffect(() => repo.subscribe(() => bump((n) => n + 1)), []);

  const getDay = useCallback((dayId: string) => repo.getDay(dayId), []);

  const saveDay = useCallback(
    (day: Day) => repo.saveDay(day, classroomId),
    [classroomId],
  );

  const deleteDay = useCallback((dayId: string) => repo.deleteDay(dayId), []);

  const clearAllDays = useCallback((cid: string) => repo.clearDays(cid), []);

  const listDays = useCallback((cid: string) => repo.listDays(cid), []);

  const listUnassignedDays = useCallback(() => repo.listUnassignedDays(), []);

  return {
    plan: { schemaVersion: SCHEMA_VERSION, days: {} },
    getDay,
    saveDay,
    deleteDay,
    clearAllDays,
    listDays,
    listUnassignedDays,
    isHydrated: repo.isHydrated(),
  };
};
