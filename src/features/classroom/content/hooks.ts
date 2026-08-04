/**
 * Content-bank hooks. Return the canonical (derived) content MERGED with the
 * teacher's personal content (badged `source:'personal'`). When the server-side
 * content endpoints ship they'll fan out to fetchers with the same signature,
 * so callers won't need to change.
 */
import { useMemo } from 'react';
import type { PhaseKey } from '../phases';
import { ACTIVITIES } from './activities';
import { ANTHEMS } from './anthems';
import { CLOS } from './clos';
import { LESSON_SEEDS } from './seeds';
import { THEMES } from './themes';
import type { Activity, Anthem, Clo, LessonSeed, Theme } from './types';
import { usePersonalContent } from './usePersonalContent';

export interface ThemeBank {
  themes: Theme[];
  byId: (id: string) => Theme | undefined;
  byMonth: (month: number) => Theme | undefined;
}

export const useThemeBank = (): ThemeBank => {
  const { themes: personal } = usePersonalContent();
  return useMemo(() => {
    const themes = [...THEMES, ...personal];
    return {
      themes,
      byId: (id) => themes.find((t) => t.id === id),
      byMonth: (month) => themes.find((t) => t.month === month),
    };
  }, [personal]);
};

export interface ActivityBankFilter {
  phase?: PhaseKey;
  cloId?: string;
}

export interface ActivityBank {
  activities: Activity[];
  byId: (id: string) => Activity | undefined;
}

export const useActivityBank = (filter?: ActivityBankFilter): ActivityBank => {
  const phase = filter?.phase;
  const cloId = filter?.cloId;
  const { activities: personal } = usePersonalContent();

  return useMemo(() => {
    const all = [...ACTIVITIES, ...personal];
    let activities = all;
    if (phase) activities = activities.filter((a) => a.phase === phase);
    if (cloId) activities = activities.filter((a) => a.cloIds.includes(cloId));
    const byId = (id: string) => all.find((a) => a.id === id);
    return { activities, byId };
  }, [phase, cloId, personal]);
};

export interface CloBank {
  clos: Clo[];
  byId: (id: string) => Clo | undefined;
  byPhase: (phase: PhaseKey) => Clo[];
  byType: (type: Clo['type']) => Clo[];
}

export const useCloBank = (): CloBank => {
  const { clos: personal } = usePersonalContent();
  return useMemo(() => {
    const clos = [...CLOS, ...personal];
    return {
      clos,
      byId: (id) => clos.find((c) => c.id === id),
      byPhase: (phase) =>
        clos.filter((c) => c.type === 'learning' && c.phase === phase),
      byType: (type) => clos.filter((c) => c.type === type),
    };
  }, [personal]);
};

export interface LessonSeedBank {
  seeds: LessonSeed[];
  byId: (id: string) => LessonSeed | undefined;
  byThemeId: (themeId: string) => LessonSeed[];
}

export const useLessonSeedBank = (): LessonSeedBank => {
  const { seeds: personal } = usePersonalContent();
  return useMemo(() => {
    const seeds = [...LESSON_SEEDS, ...personal];
    return {
      seeds,
      byId: (id) => seeds.find((s) => s.id === id),
      byThemeId: (themeId) => seeds.filter((s) => s.themeId === themeId),
    };
  }, [personal]);
};

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
