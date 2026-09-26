/**
 * useTeacherConfig — local-first teacher/tenant config for the Classroom
 * feature. Same localStorage + same-tab-broadcast + schemaVersion idiom as
 * useLocalPlan/useAnnualPlan.
 *
 * SCHEMA v2 splits the config in two:
 *   - `global`      — tenant-wide settings (module URLs, local-context policy).
 *   - `byClassroom` — per-section overrides for the settings that genuinely
 *                     differ between a middle-school and a college section.
 *
 * Only the fields that make sense per section are overridable. Module URLs are
 * a tenant deployment detail and stay global; age preset, language and the
 * IMPACT toggle are per section, which is exactly what `AgePreset`
 * (middle/high/college) is for.
 *
 * The KEY keeps its `:v1` namespace deliberately. In this repo the `:vN` in a
 * key is a namespace and the schema version lives in the blob; renaming it to
 * `:v2` would silently drop this store from `planBackup.ts`'s `PLAIN_KEYS`,
 * which reads by key — the precise silent-omission failure that module exists
 * to prevent.
 *
 * Consumed by: resolveModuleUrl (moduleUrls), applySeedToDay (localContextMode
 * / tenantLocalContext), the Standards Alignment summary (impactVisible), and
 * the age preset on Presentation Mode / Preview / the deck editor.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { migrateStoredValue } from '@/lib/local-store/migrations';
import type { StudentLanguage } from '../types';

export const STORAGE_KEY = 'ma-teacher:settings:v1';
export const SCHEMA_VERSION = 2;

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
  /**
   * The teacher's working language for this section. Added in v2: the calendar
   * kept its language in component state, so it reset to English on every
   * navigation.
   */
  language: StudentLanguage;
}

/** The subset a single classroom may override. */
export type ClassroomConfigOverrides = Partial<
  Pick<TeacherConfig, 'agePresetDefault' | 'language' | 'impactVisible'>
>;

export interface TeacherConfigStore {
  schemaVersion: number;
  global: TeacherConfig;
  byClassroom: Record<string, ClassroomConfigOverrides>;
}

export const DEFAULT_CONFIG: TeacherConfig = {
  schemaVersion: SCHEMA_VERSION,
  moduleUrls: { globe: '', learn: '', studio: '', arcade: '' },
  impactVisible: true,
  localContextMode: 'show',
  tenantLocalContext: '',
  agePresetDefault: 'high',
  language: 'en',
};

const EMPTY_STORE: TeacherConfigStore = {
  schemaVersion: SCHEMA_VERSION,
  global: DEFAULT_CONFIG,
  byClassroom: {},
};

/** v1 was a FLAT TeacherConfig; v2 nests it under `global`. */
const CONFIG_MIGRATIONS = [
  {
    from: 1,
    to: 2,
    describe: 'settings v1→v2: split global vs per-classroom',
    migrate: (value: unknown): TeacherConfigStore => ({
      schemaVersion: 2,
      global: {
        ...DEFAULT_CONFIG,
        ...(value as Partial<TeacherConfig>),
        schemaVersion: 2,
      },
      byClassroom: {},
    }),
  },
];

const isBrowser = typeof window !== 'undefined';

const readStore = (): TeacherConfigStore => {
  if (!isBrowser) return EMPTY_STORE;
  const { value } = migrateStoredValue<TeacherConfigStore>({
    key: STORAGE_KEY,
    targetVersion: SCHEMA_VERSION,
    steps: CONFIG_MIGRATIONS,
    fallback: EMPTY_STORE,
  });
  return {
    schemaVersion: SCHEMA_VERSION,
    global: {
      ...DEFAULT_CONFIG,
      ...value?.global,
      moduleUrls: {
        ...DEFAULT_CONFIG.moduleUrls,
        ...value?.global?.moduleUrls,
      },
      schemaVersion: SCHEMA_VERSION,
    },
    byClassroom: value?.byClassroom ?? {},
  };
};

/** Global config merged with one classroom's overrides. */
export const resolveConfig = (
  store: TeacherConfigStore,
  classroomId?: string,
): TeacherConfig =>
  classroomId && store.byClassroom[classroomId]
    ? { ...store.global, ...store.byClassroom[classroomId] }
    : store.global;

const writeStore = (store: TeacherConfigStore): void => {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    window.dispatchEvent(new Event(`${STORAGE_KEY}:changed`));
  } catch {
    // Quota / privacy mode — no-op.
  }
};

export interface UseTeacherConfig {
  /** Global config merged with this classroom's overrides. */
  config: TeacherConfig;
  /** Write a TENANT-WIDE setting (module URLs, local-context policy). */
  setConfig: (patch: Partial<TeacherConfig>) => void;
  /**
   * Write a PER-SECTION override. No-op without a classroomId — a global
   * settings surface has no section to override.
   */
  setClassroomConfig: (patch: ClassroomConfigOverrides) => void;
  /** Which fields this classroom currently overrides. */
  overrides: ClassroomConfigOverrides;
}

/**
 * @param classroomId  Resolves per-section overrides. Omit on genuinely global
 *   surfaces (e.g. `LaunchTile`, which only reads tenant module URLs and sits
 *   four component layers below anything that knows a classroom).
 */
export const useTeacherConfig = (classroomId?: string): UseTeacherConfig => {
  const [store, setStore] = useState<TeacherConfigStore>(readStore);

  useEffect(() => {
    if (!isBrowser) return;
    const onChange = () => setStore(readStore());
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

  const config = useMemo(
    () => resolveConfig(store, classroomId),
    [store, classroomId],
  );

  const setConfig = useCallback((patch: Partial<TeacherConfig>) => {
    const current = readStore();
    const next: TeacherConfigStore = {
      ...current,
      global: { ...current.global, ...patch, schemaVersion: SCHEMA_VERSION },
    };
    writeStore(next);
    setStore(next);
  }, []);

  const setClassroomConfig = useCallback(
    (patch: ClassroomConfigOverrides) => {
      if (!classroomId) return;
      const current = readStore();
      const next: TeacherConfigStore = {
        ...current,
        byClassroom: {
          ...current.byClassroom,
          [classroomId]: { ...current.byClassroom[classroomId], ...patch },
        },
      };
      writeStore(next);
      setStore(next);
    },
    [classroomId],
  );

  return {
    config,
    setConfig,
    setClassroomConfig,
    overrides: (classroomId && store.byClassroom[classroomId]) || {},
  };
};
