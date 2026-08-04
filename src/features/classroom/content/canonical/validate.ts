/**
 * Referential-integrity validation for the canonical content banks. Pure —
 * returns an error list (empty = clean). Run as a dev-only load guard and by
 * the vitest suite. Asserts the counts + zero dangling refs + no legacy module
 * survives normalization.
 */
import { PHASES } from '../../phases';
import type { Activity, Clo, LessonSeed, Theme } from '../types';

export interface ContentBanks {
  ACTIVITIES: Activity[];
  CLOS: Clo[];
  LESSON_SEEDS: LessonSeed[];
  THEMES: Theme[];
}

const VALID_MODULES = new Set(['globe', 'learn', 'studio', 'arcade']);

const findDupes = (ids: string[]): string[] => {
  const seen = new Set<string>();
  const dup = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) dup.add(id);
    seen.add(id);
  }
  return [...dup];
};

export const contentCounts = (banks: ContentBanks) => ({
  activities: banks.ACTIVITIES.length,
  clos: banks.CLOS.length,
  themes: banks.THEMES.length,
  seeds: banks.LESSON_SEEDS.length,
  daySeeds: banks.LESSON_SEEDS.filter((s) => s.kind === 'day').length,
  activitySeeds: banks.LESSON_SEEDS.filter((s) => s.kind === 'activity').length,
});

export const validateContent = (banks: ContentBanks): string[] => {
  const { ACTIVITIES, CLOS, LESSON_SEEDS, THEMES } = banks;
  const errors: string[] = [];

  const activityIds = new Set(ACTIVITIES.map((a) => a.id));
  const themeIds = new Set(THEMES.map((t) => t.id));
  const seedIds = new Set(LESSON_SEEDS.map((s) => s.id));

  // Unique ids per bank.
  const banksToCheck: Array<[string, string[]]> = [
    ['activity', ACTIVITIES.map((a) => a.id)],
    ['clo', CLOS.map((c) => c.id)],
    ['seed', LESSON_SEEDS.map((s) => s.id)],
    ['theme', THEMES.map((t) => t.id)],
  ];
  for (const [label, ids] of banksToCheck) {
    const d = findDupes(ids);
    if (d.length) errors.push(`duplicate ${label} ids: ${d.join(', ')}`);
  }

  // Every calendar month 1–12 has a theme.
  for (let m = 1; m <= 12; m += 1) {
    if (!THEMES.some((t) => t.month === m)) {
      errors.push(`missing month theme for month ${m}`);
    }
  }

  // theme ↔ seed bijection (both directions).
  for (const s of LESSON_SEEDS) {
    if (!themeIds.has(s.themeId)) {
      errors.push(`seed ${s.id} references missing theme ${s.themeId}`);
    }
  }
  for (const t of THEMES) {
    for (const sid of t.seedIds) {
      if (!seedIds.has(sid)) {
        errors.push(`theme ${t.id} references missing seed ${sid}`);
      }
    }
  }

  // clo → source resolvability.
  for (const c of CLOS) {
    if (c.id.startsWith('clo-learn-')) {
      const aid = c.id.slice('clo-learn-'.length);
      if (!activityIds.has(aid)) {
        errors.push(`clo ${c.id} references missing activity ${aid}`);
      }
    } else if (c.id.startsWith('clo-seed-')) {
      const rest = c.id.slice('clo-seed-'.length);
      const phase = PHASES.find((p) => rest.endsWith(`-${p}`));
      if (!phase) {
        errors.push(`clo ${c.id} has an unparseable phase suffix`);
      } else {
        const sid = rest.slice(0, rest.length - phase.length - 1);
        if (!seedIds.has(sid)) {
          errors.push(`clo ${c.id} references missing seed ${sid}`);
        }
      }
    }
  }

  // No legacy/unknown atlas module survives normalization.
  for (const a of ACTIVITIES) {
    for (const r of a.atlasResources) {
      if (!VALID_MODULES.has(r.module)) {
        errors.push(`activity ${a.id} has non-canonical module "${r.module}"`);
      }
    }
  }
  for (const s of LESSON_SEEDS) {
    if (s.kind === 'day') {
      for (const phase of PHASES) {
        for (const r of s.template[phase].atlasResources) {
          if (!VALID_MODULES.has(r.module)) {
            errors.push(`seed ${s.id}/${phase} has non-canonical module "${r.module}"`);
          }
        }
      }
    }
  }

  return errors;
};
