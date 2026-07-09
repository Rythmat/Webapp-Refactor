/**
 * Content-bank hooks. Today these return static seed data; when the
 * server-side content endpoints ship they'll fan out to fetchers with the
 * same signature, so callers won't need to change.
 *
 * The `useMemo` at each layer is defensive — filter arguments cause
 * recomputes only when they actually change, not on every render.
 */
import { useMemo } from 'react';
import type { PhaseKey } from '../phases';
import { ACTIVITIES } from './activities';
import { ANTHEMS } from './anthems';
import { CLOS } from './clos';
import { LESSON_SEEDS } from './seeds';
import { THEMES } from './themes';
import type { Activity, Anthem, Clo, LessonSeed, Theme } from './types';

export interface ThemeBank {
  themes: Theme[];
  byId: (id: string) => Theme | undefined;
  byMonth: (month: number) => Theme | undefined;
}

export const useThemeBank = (): ThemeBank =>
  useMemo(
    () => ({
      themes: THEMES,
      byId: (id) => THEMES.find((t) => t.id === id),
      byMonth: (month) => THEMES.find((t) => t.month === month),
    }),
    [],
  );

export interface ActivityBankFilter {
  phase?: PhaseKey;
  themeId?: string;
  cloId?: string;
}

export interface ActivityBank {
  activities: Activity[];
  byId: (id: string) => Activity | undefined;
}

export const useActivityBank = (filter?: ActivityBankFilter): ActivityBank => {
  const phase = filter?.phase;
  const themeId = filter?.themeId;
  const cloId = filter?.cloId;

  return useMemo(() => {
    let activities = ACTIVITIES;
    if (phase) activities = activities.filter((a) => a.phase === phase);
    if (themeId)
      activities = activities.filter((a) => a.themeIds.includes(themeId));
    if (cloId) activities = activities.filter((a) => a.cloRefs.includes(cloId));
    const byId = (id: string) => ACTIVITIES.find((a) => a.id === id);
    return { activities, byId };
  }, [phase, themeId, cloId]);
};

export interface CloBank {
  clos: Clo[];
  byId: (id: string) => Clo | undefined;
  byDomain: (domain: Clo['domain']) => Clo[];
}

export const useCloBank = (): CloBank =>
  useMemo(
    () => ({
      clos: CLOS,
      byId: (id) => CLOS.find((c) => c.id === id),
      byDomain: (domain) => CLOS.filter((c) => c.domain === domain),
    }),
    [],
  );

export interface LessonSeedBank {
  seeds: LessonSeed[];
  byId: (id: string) => LessonSeed | undefined;
  byThemeId: (themeId: string) => LessonSeed[];
}

export const useLessonSeedBank = (): LessonSeedBank =>
  useMemo(
    () => ({
      seeds: LESSON_SEEDS,
      byId: (id) => LESSON_SEEDS.find((s) => s.id === id),
      byThemeId: (themeId) => LESSON_SEEDS.filter((s) => s.themeId === themeId),
    }),
    [],
  );

export interface AnthemBank {
  anthems: Anthem[];
  byId: (id: string) => Anthem | undefined;
  byThemeId: (themeId: string) => Anthem[];
}

export const useAnthemBank = (): AnthemBank =>
  useMemo(
    () => ({
      anthems: ANTHEMS,
      byId: (id) => ANTHEMS.find((a) => a.id === id),
      byThemeId: (themeId) =>
        ANTHEMS.filter((a) => a.themeIds.includes(themeId)),
    }),
    [],
  );
