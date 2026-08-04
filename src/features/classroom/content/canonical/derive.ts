/**
 * In-memory derivation for the canonical content bank:
 *   - deriveActivityBank: 81 base activities + 15 seed anchors → 96 (all unique).
 *   - deriveCanonicalCLOs: one learning CLO per activity (`clo-learn-<id>`) +
 *     one per NON-EMPTY day-seed phase (`clo-seed-<seedId>-<phase>`).
 * Nothing here is persisted; statement-voice enduring understandings stay on
 * Themes and are never walked into the CLO bank.
 */
import { PHASES } from '../../phases';
import type {
  Activity,
  ActivityLessonSeed,
  Clo,
  CloAxes,
  DayLessonSeed,
} from '../types';
import {
  normalizeActivity,
  withCloIds,
  type RawActivity,
} from './normalize';

export const deriveActivityBank = (
  rawActivities: RawActivity[],
  activitySeeds: ActivityLessonSeed[],
): Activity[] => {
  const base = rawActivities.map((a) => withCloIds(normalizeActivity(a)));
  const anchors = activitySeeds.map((s) => s.anchor.activity); // already has cloIds
  return [...base, ...anchors];
};

const hasAnyAxis = (c: CloAxes): boolean =>
  Boolean(c.awarenessOfFeeling || c.awarenessOfTechnique || c.awarenessOfContext);

export const deriveCanonicalCLOs = (
  activities: Activity[],
  daySeeds: DayLessonSeed[],
): Clo[] => {
  const out: Clo[] = [];

  // (1) one learning CLO per activity (covers the 81 base + 15 anchors).
  for (const a of activities) {
    out.push({
      id: `clo-learn-${a.id}`,
      type: 'learning',
      phase: a.phase,
      ...a.clos,
      source: 'canonical',
      createdBy: null,
      createdAt: a.createdAt,
    });
  }

  // (2) per-phase day-seed CLOs — skip empty `cloText {}`.
  for (const s of daySeeds) {
    for (const phase of PHASES) {
      const ct = s.template[phase].cloText;
      if (!hasAnyAxis(ct)) continue;
      out.push({
        id: `clo-seed-${s.id}-${phase}`,
        type: 'learning',
        phase,
        ...ct,
        source: 'canonical',
        createdBy: null,
        createdAt: s.createdAt,
      });
    }
  }

  return out;
};
