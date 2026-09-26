/**
 * CurriculumRepository — the ONE seam every curriculum read and write passes
 * through.
 *
 * WHY A SEAM
 *
 * Curriculum data is spread across four stores with four hand-rolled copies of
 * the same localStorage idiom, each with its own `:changed` event and its own
 * `.bak` behaviour. P10 has to swap all of it for a server (`GET`/`PUT
 * /classrooms/:id/plan`). Without a seam that is a rewrite of every call site;
 * with one it is a second adapter behind a flag.
 *
 * DESIGN NOTES THAT MATTER
 *
 * 1. READS ARE SYNCHRONOUS. `idbMirror` deliberately preserves a synchronous
 *    `read()` so the existing hooks keep working. The repository does not
 *    "fix" that into async — doing so would turn ~27 call sites into promises
 *    for no benefit while local is still the only adapter.
 *
 * 2. HYDRATION IS OBSERVABLE (`isHydrated`). This is the sharp edge. Once a
 *    store migrates into IndexedDB, `idbMirror.clearLegacy()` frees the
 *    localStorage copy, so on every LATER load the synchronous read returns
 *    EMPTY until IDB hydrates. A surface that renders "No lessons yet" during
 *    that window is lying to a teacher about their own work. Callers must
 *    distinguish "empty" from "not loaded", which is what `isHydrated` is for.
 *
 * 3. BACKUP GOES THROUGH HERE, NOT THROUGH KEYS. `settings/planBackup.ts` used
 *    to read stores by localStorage key; the moment a store moved to IDB that
 *    produced a backup silently missing everything, with a success toast. The
 *    repository is the only thing that knows where each store actually lives.
 */
import type { ClassroomAnnualPlan } from '../annual/useAnnualPlan';
import type { Activity, Clo, LessonSeed, Theme } from '../content/types';
import type { Day } from '../types';

/** The teacher's personal (non-canonical) content banks. */
export interface TeacherLibrary {
  activities: Activity[];
  clos: Clo[];
  themes: Theme[];
  seeds: LessonSeed[];
}

export interface CurriculumRepository {
  // ── Days ────────────────────────────────────────────────────────────────
  listDays(classroomId: string): Day[];
  /** Days with no classroom. Surfaced in a tray; never auto-claimed. */
  listUnassignedDays(): Day[];
  /**
   * EVERY Day, unscoped. Exists for BACKUP ONLY.
   *
   * Scoping is the point of this store, so this is the one deliberate hole in
   * it — and it is deliberate because the alternative is worse: an export that
   * enumerates classrooms silently omits Days whose classroom has no annual
   * plan, or whose classroom was deleted. A backup that quietly drops work is
   * the failure this whole seam exists to prevent. Do not use it for UI.
   */
  listAllDaysForBackup(): Day[];
  getDay(dayId: string): Day | undefined;
  saveDay(day: Day, classroomId?: string): void;
  deleteDay(dayId: string): void;
  /** Clear one classroom's Days. Other classrooms and unassigned Days survive. */
  clearDays(classroomId: string): void;

  // ── Annual plan ─────────────────────────────────────────────────────────
  getAnnualPlan(classroomId: string): ClassroomAnnualPlan | undefined;
  saveAnnualPlan(plan: ClassroomAnnualPlan): void;

  // ── Saved (bookmarked) lessons ──────────────────────────────────────────
  listSavedLessons(): string[];
  putSavedLessons(ids: string[]): void;

  // ── Personal content warehouse ──────────────────────────────────────────
  getLibrary(): TeacherLibrary;
  putLibrary(library: TeacherLibrary): void;

  // ── Lifecycle ───────────────────────────────────────────────────────────
  /**
   * The ONLY cross-tab notification path. Replaces four separate
   * `<key>:changed` + `storage` listener pairs.
   */
  subscribe(listener: () => void): () => void;
  /** Resolves once every backing store has hydrated. Backup MUST await this. */
  ready(): Promise<void>;
  /** False while a store may still be reporting empty because IDB is loading. */
  isHydrated(): boolean;
}
