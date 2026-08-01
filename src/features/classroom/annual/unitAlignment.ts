/**
 * buildUnitAlignment — pure aggregator for the per-unit Standards Alignment
 * summary. Walks a unit's Days' cell rationale (teacher-only) and tallies the
 * standards, Common Anchors, SEL competencies, CLOs, and activities the unit
 * actually touches, phase by phase. IMPACT tags are gated by config so a
 * tenant that hides IMPACT never surfaces it here either.
 *
 * Coverage-oriented (counts), not mastery — a per-goal mastery grid lands once
 * assignment scores exist (v3). Standards are kept as codes (e.g. MU:Cr1.1) so
 * a CASE GUID can attach later for LMS/Google-Classroom interoperability.
 */
import type { Activity, Clo } from '../content/types';
import { PHASES } from '../phases';
import type { Day } from '../types';

export interface AlignmentCount {
  key: string;
  label: string;
  count: number;
}

export interface UnitAlignment {
  dayCount: number;
  standards: AlignmentCount[];
  commonAnchors: AlignmentCount[];
  selCompetencies: AlignmentCount[];
  clos: AlignmentCount[];
  activities: AlignmentCount[];
  impactTags: AlignmentCount[];
}

export interface AlignmentResolvers {
  impactVisible: boolean;
  resolveClo: (id: string) => Clo | undefined;
  resolveActivity: (id: string) => Activity | undefined;
  cloLabel: (clo: Clo) => string;
}

const tally = (items: string[] | undefined, map: Map<string, number>): void => {
  for (const item of items ?? []) {
    map.set(item, (map.get(item) ?? 0) + 1);
  }
};

const toCounts = (
  map: Map<string, number>,
  label: (key: string) => string,
): AlignmentCount[] =>
  [...map.entries()]
    .map(([key, count]) => ({ key, label: label(key), count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));

export const buildUnitAlignment = (
  days: Day[],
  resolvers: AlignmentResolvers,
): UnitAlignment => {
  const standards = new Map<string, number>();
  const commonAnchors = new Map<string, number>();
  const selCompetencies = new Map<string, number>();
  const clos = new Map<string, number>();
  const activities = new Map<string, number>();
  const impactTags = new Map<string, number>();

  for (const day of days) {
    for (const phase of PHASES) {
      const r = day.cells[phase].rationale;
      tally(r.standards, standards);
      tally(r.commonAnchors, commonAnchors);
      tally(r.selCompetencies, selCompetencies);
      tally(r.cloRefs, clos);
      tally(r.activityRefs, activities);
      if (resolvers.impactVisible) tally(r.impactTags, impactTags);
    }
  }

  return {
    dayCount: days.length,
    standards: toCounts(standards, (k) => k),
    commonAnchors: toCounts(commonAnchors, (k) => k),
    selCompetencies: toCounts(selCompetencies, (k) => k),
    clos: toCounts(clos, (id) => {
      const c = resolvers.resolveClo(id);
      return c ? resolvers.cloLabel(c) : id;
    }),
    activities: toCounts(
      activities,
      (id) => resolvers.resolveActivity(id)?.title.en ?? id,
    ),
    impactTags: toCounts(impactTags, (k) => k),
  };
};

/** Total distinct alignment items — a quick "is there anything to show" gate. */
export const alignmentIsEmpty = (a: UnitAlignment): boolean =>
  a.standards.length === 0 &&
  a.commonAnchors.length === 0 &&
  a.selCompetencies.length === 0 &&
  a.clos.length === 0 &&
  a.activities.length === 0 &&
  a.impactTags.length === 0;
