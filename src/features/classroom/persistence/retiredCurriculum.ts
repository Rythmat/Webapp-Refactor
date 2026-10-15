/**
 * One-time, per-device removal of the retired curriculum.
 *
 * The canonical annual curriculum (24 themed monthly Units + their lesson-day
 * stubs) and every lesson authored under it were retired in favour of Cortex
 * lessons scheduled straight onto the calendar. Curriculum data lives only on
 * the device (`SERVER_CURRICULUM_ENABLED` is off), so each device purges its
 * own copy the first time it loads after the change.
 *
 * The marker is written — and read back — BEFORE the purge runs. If it cannot
 * be persisted (storage blocked), the purge is skipped: a purge that could not
 * remember having run would wipe the teacher's new lessons on every load.
 * Callers must only invoke this after their store has hydrated.
 */
export const RETIRED_CURRICULUM_MARKERS = {
  days: 'ma-teacher:retired-curriculum-purged:days',
  units: 'ma-teacher:retired-curriculum-purged:units',
} as const;

export const runRetiredCurriculumPurge = (
  marker: string,
  purge: () => void,
): void => {
  if (typeof window === 'undefined') return;
  try {
    if (window.localStorage.getItem(marker)) return;
    window.localStorage.setItem(marker, new Date().toISOString());
    if (!window.localStorage.getItem(marker)) return;
  } catch {
    return;
  }
  purge();
};
