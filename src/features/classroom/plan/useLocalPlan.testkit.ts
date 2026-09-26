/**
 * TEST-ONLY: run the plan store's read+migrate path directly, without React.
 * Not imported by application code.
 */
import { localCurriculumRepository } from '../persistence/localCurriculumRepository';
import type { Day } from '../types';

export const readPlanForTest = (): {
  schemaVersion: number;
  days: Record<string, Day>;
} => {
  const days: Record<string, Day> = {};
  for (const d of [
    ...localCurriculumRepository.listUnassignedDays(),
    ...allScopedDays(),
  ]) {
    days[d.id] = d;
  }
  return { schemaVersion: 2, days };
};

/** Every Day that carries a classroom, across all classrooms. */
const allScopedDays = (): Day[] => {
  const seen = new Map<string, Day>();
  // The repository intentionally exposes no "all days" read — scoping is the
  // point. For tests we union the known classrooms out of the raw mirror.
  const raw = localCurriculumRepository as unknown as {
    listDays: (cid: string) => Day[];
  };
  for (const cid of TEST_CLASSROOM_IDS) {
    for (const d of raw.listDays(cid)) seen.set(d.id, d);
  }
  return [...seen.values()];
};

/** Classroom ids the plan fixtures use. */
export const TEST_CLASSROOM_IDS = ['class-a', 'class-b'];
