/**
 * useTeacherConfig — local-first teacher/tenant config for the Classroom
 * feature (`ma-teacher:settings:v1`). Same localStorage + same-tab-broadcast +
 * schemaVersion idiom as useLocalPlan/useAnnualPlan.
 *
 * Consumed by: resolveModuleUrl (moduleUrls), applySeedToDay (localContextMode
 * / tenantLocalContext), the Standards Alignment summary (impactVisible), and
 * Presentation Mode's default age preset.
 */
import { useCallback, useEffect, useState } from 'react';

export const STORAGE_KEY = 'ma-teacher:settings:v1';
export const SCHEMA_VERSION = 1;

export type AtlasModule = 'globe' | 'learn' | 'studio' | 'arcade';
export type LocalContextMode = 'show' | 'hide' | 'replace';
export type AgePreset = 'middle' | 'high' | 'college';

export interface TeacherConfig {
  schemaVersion: number;
  moduleUrls: Record<AtlasModule, string>;
  impactVisible: boolean;
  localContextMode: LocalContextMode;
  tenantLocalContext: string;
  agePresetDefault: AgePreset;
}

export const DEFAULT_CONFIG: TeacherConfig = {
  schemaVersion: SCHEMA_VERSION,
  moduleUrls: { globe: '', learn: '', studio: '', arcade: '' },
  impactVisible: true,
  localContextMode: 'show',
  tenantLocalContext: '',
  agePresetDefault: 'high',
};

const isBrowser = typeof window !== 'undefined';

const readConfig = (): TeacherConfig => {
  if (!isBrowser) return DEFAULT_CONFIG;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw) as Partial<TeacherConfig>;
    if (parsed?.schemaVersion !== SCHEMA_VERSION) {
      window.localStorage.setItem(`${STORAGE_KEY}.bak`, raw);
      return DEFAULT_CONFIG;
    }
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      moduleUrls: { ...DEFAULT_CONFIG.moduleUrls, ...parsed.moduleUrls },
    };
  } catch {
    return DEFAULT_CONFIG;
  }
};

const writeConfig = (config: TeacherConfig): void => {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(new Event(`${STORAGE_KEY}:changed`));
  } catch {
    // Quota / privacy mode — no-op.
  }
};

export interface UseTeacherConfig {
  config: TeacherConfig;
  setConfig: (patch: Partial<TeacherConfig>) => void;
}

export const useTeacherConfig = (): UseTeacherConfig => {
  const [config, setState] = useState<TeacherConfig>(readConfig);

  useEffect(() => {
    if (!isBrowser) return;
    const onChange = () => setState(readConfig());
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

  const setConfig = useCallback((patch: Partial<TeacherConfig>) => {
    const next = { ...readConfig(), ...patch };
    writeConfig(next);
    setState(next);
  }, []);

  return { config, setConfig };
};
