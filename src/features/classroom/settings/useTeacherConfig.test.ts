// @vitest-environment jsdom
/**
 * Per-classroom config (P1 task 7).
 *
 * The load-bearing assertions are the migration (a v1 flat blob must not be
 * discarded) and the global/override split — a middle-school section and a
 * college section must be able to disagree without one clobbering the other.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_CONFIG,
  SCHEMA_VERSION,
  STORAGE_KEY,
  resolveConfig,
  type TeacherConfigStore,
} from './useTeacherConfig';

const store = (over?: Partial<TeacherConfigStore>): TeacherConfigStore => ({
  schemaVersion: SCHEMA_VERSION,
  global: DEFAULT_CONFIG,
  byClassroom: {},
  ...over,
});

beforeEach(() => {
  window.localStorage.clear();
});

describe('storage key', () => {
  it('keeps the :v1 NAMESPACE so planBackup keeps finding it', () => {
    // planBackup.ts reads settings by key. Renaming to :v2 would silently drop
    // settings from every backup, with a success toast.
    expect(STORAGE_KEY).toBe('ma-teacher:settings:v1');
    expect(SCHEMA_VERSION).toBe(2);
  });
});

describe('resolveConfig', () => {
  it('returns global when the classroom has no overrides', () => {
    expect(resolveConfig(store(), 'class-a')).toEqual(DEFAULT_CONFIG);
  });

  it('returns global when no classroom is given at all', () => {
    const s = store({
      byClassroom: { 'class-a': { agePresetDefault: 'college' } },
    });
    expect(resolveConfig(s).agePresetDefault).toBe('high');
  });

  it('layers a classroom override on top of global', () => {
    const s = store({
      byClassroom: {
        'class-a': { agePresetDefault: 'middle', language: 'es' },
      },
    });
    const resolved = resolveConfig(s, 'class-a');
    expect(resolved.agePresetDefault).toBe('middle');
    expect(resolved.language).toBe('es');
    // Tenant-wide fields are untouched by a section override.
    expect(resolved.moduleUrls).toEqual(DEFAULT_CONFIG.moduleUrls);
  });

  it('keeps two sections independent', () => {
    const s = store({
      byClassroom: {
        'class-a': { agePresetDefault: 'middle' },
        'class-b': { agePresetDefault: 'college' },
      },
    });
    expect(resolveConfig(s, 'class-a').agePresetDefault).toBe('middle');
    expect(resolveConfig(s, 'class-b').agePresetDefault).toBe('college');
  });

  it('defaults language to en', () => {
    expect(DEFAULT_CONFIG.language).toBe('en');
  });
});
