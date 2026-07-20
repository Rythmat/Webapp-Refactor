/**
 * `useLocalPlan` — local-first persistence for the teacher's plan.
 *
 * Per the fresh-build brief §10, v1 stores everything in localStorage under
 * `ma-teacher:plan:v1`. The teacher's Days live in the browser; nothing hits
 * the server until v2's Supabase schema ships. A `schemaVersion` field guards
 * against future migration.
 *
 * Small runtime footprint on purpose — a single JSON blob, one useState, and
 * a subscribe hook that keeps every mounted consumer in sync via a
 * `storage` event listener + a broadcast function for same-tab updates.
 */
import { useCallback, useEffect, useState } from 'react';
import type { Day } from '../types';

export const STORAGE_KEY = 'ma-teacher:plan:v1';
export const SCHEMA_VERSION = 1;

export interface Plan {
  schemaVersion: number;
  days: Record<string, Day>;
}

const EMPTY_PLAN: Plan = { schemaVersion: SCHEMA_VERSION, days: {} };

const isBrowser = typeof window !== 'undefined';

const readPlan = (): Plan => {
  if (!isBrowser) return EMPTY_PLAN;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_PLAN;
    const parsed = JSON.parse(raw) as Plan;
    if (parsed?.schemaVersion !== SCHEMA_VERSION) {
      // Migration hook. For now, unknown versions reset to empty and preserve
      // the raw string under a `.bak` key so a later migration can recover.
      window.localStorage.setItem(`${STORAGE_KEY}.bak`, raw);
      return EMPTY_PLAN;
    }
    return {
      schemaVersion: SCHEMA_VERSION,
      days: parsed.days ?? {},
    };
  } catch {
    return EMPTY_PLAN;
  }
};

const writePlan = (plan: Plan): void => {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
    // Broadcast to same-tab subscribers (the native `storage` event doesn't
    // fire in the tab that wrote the change).
    window.dispatchEvent(new Event(`${STORAGE_KEY}:changed`));
  } catch {
    // Quota / privacy mode — silently no-op. In-memory state stays consistent.
  }
};

export interface UseLocalPlan {
  plan: Plan;
  getDay: (dayId: string) => Day | undefined;
  saveDay: (day: Day) => void;
  deleteDay: (dayId: string) => void;
  listDays: () => Day[];
}

export const useLocalPlan = (): UseLocalPlan => {
  const [plan, setPlan] = useState<Plan>(readPlan);

  // Subscribe to same-tab + cross-tab writes so any consumer stays in sync.
  useEffect(() => {
    if (!isBrowser) return;
    const onChange = () => setPlan(readPlan());
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) onChange();
    };
    window.addEventListener(`${STORAGE_KEY}:changed`, onChange);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(`${STORAGE_KEY}:changed`, onChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const getDay = useCallback((dayId: string) => plan.days[dayId], [plan.days]);

  const saveDay = useCallback((day: Day) => {
    const current = readPlan();
    const next: Plan = {
      ...current,
      days: { ...current.days, [day.id]: day },
    };
    writePlan(next);
    setPlan(next);
  }, []);

  const deleteDay = useCallback((dayId: string) => {
    const current = readPlan();
    if (!(dayId in current.days)) return;
    const nextDays = { ...current.days };
    delete nextDays[dayId];
    const next: Plan = { ...current, days: nextDays };
    writePlan(next);
    setPlan(next);
  }, []);

  const listDays = useCallback(() => Object.values(plan.days), [plan.days]);

  return { plan, getDay, saveDay, deleteDay, listDays };
};
