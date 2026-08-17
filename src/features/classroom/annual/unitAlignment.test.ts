import { describe, expect, it } from 'vitest';
import { newBlankDay } from '../plan/newBlankDay';
import { alignmentIsEmpty, buildUnitAlignment } from './unitAlignment';

const resolvers = {
  impactVisible: true,
  resolveClo: () => undefined,
  resolveActivity: () => undefined,
  cloLabel: (c: { id: string }) => c.id,
};

const dayWith = (over: {
  standards?: string[];
  cloRefs?: string[];
  activityRefs?: string[];
  impactTags?: string[];
}) => {
  const d = newBlankDay();
  d.cells.connectRegulate.rationale.standards = over.standards ?? [];
  d.cells.connectRegulate.rationale.cloRefs = over.cloRefs ?? [];
  d.cells.connectRegulate.rationale.activityRefs = over.activityRefs;
  d.cells.connectRegulate.rationale.impactTags = over.impactTags ?? [];
  return d;
};

describe('buildUnitAlignment', () => {
  it('tallies + sorts alignment across the unit days', () => {
    const days = [
      dayWith({ standards: ['MU:Cr1.1', 'MU:Pr4.2'], activityRefs: ['act-a'] }),
      dayWith({ standards: ['MU:Cr1.1'], activityRefs: ['act-a', 'act-b'] }),
    ];
    const a = buildUnitAlignment(days, resolvers);
    expect(a.dayCount).toBe(2);
    // MU:Cr1.1 appears twice → first, count 2.
    expect(a.standards[0]).toEqual({
      key: 'MU:Cr1.1',
      label: 'MU:Cr1.1',
      count: 2,
    });
    expect(a.standards.find((s) => s.key === 'MU:Pr4.2')?.count).toBe(1);
    expect(a.activities.find((x) => x.key === 'act-a')?.count).toBe(2);
  });

  it('gates IMPACT tags on impactVisible', () => {
    const days = [dayWith({ impactTags: ['Community'] })];
    expect(buildUnitAlignment(days, resolvers).impactTags).toHaveLength(1);
    expect(
      buildUnitAlignment(days, { ...resolvers, impactVisible: false })
        .impactTags,
    ).toHaveLength(0);
  });

  it('reports empty for blank days', () => {
    expect(alignmentIsEmpty(buildUnitAlignment([newBlankDay()], resolvers))).toBe(
      true,
    );
  });
});
