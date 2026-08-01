/**
 * Structural integrity tests for the canonical Annual Plan template.
 * Guards against:
 *   - Volume regression (exactly 240 stubs — 24 Units × 10 lesson days each).
 *   - Depth regression — every Unit must have exactly 10 stubs so each
 *     scheduled school day has a lesson plan.
 *   - Unit-kind imbalance (10 heritage + 10 genre + 4 location).
 *   - Broken references — every `songId` and `globeEventId` must exist in
 *     the real Music Atlas song library / MUSIC_HISTORY array.
 *   - Missing themes — every `themeId` must resolve inside the theme bank.
 */
import { describe, expect, it } from 'vitest';
// The BUNDLED set on purpose, not the hydrated MUSIC_HISTORY: this asserts the
// integrity of the authored source data, which is also the CDN fallback. The
// equivalent check against PUBLISHED content is the API's publish firewall in
// services/content/validate-release.ts.
import { BUNDLED_MUSIC_HISTORY } from '@/components/atlas/data/events';
// The BUNDLED library, matching BUNDLED_MUSIC_HISTORY above: this asserts the
// integrity of the authored source data, which is also the CDN fallback.
import { BUNDLED_SONGS } from '@/curriculum/data/songs/bundled';
import { THEMES } from '../content/themes';
import {
  CANONICAL_ANNUAL_TEMPLATE,
  type UnitTemplate,
} from './curriculumTemplate';

const ALL_UNITS: UnitTemplate[] = [
  ...CANONICAL_ANNUAL_TEMPLATE.autumn.units,
  ...CANONICAL_ANNUAL_TEMPLATE.spring.units,
];

const ALL_STUBS = ALL_UNITS.flatMap((u) => u.dayStubs);

describe('curriculum template — volume', () => {
  it('has exactly 240 total stubs (24 Units × 10 lesson days)', () => {
    expect(ALL_STUBS.length).toBe(240);
  });

  it('has 24 total units', () => {
    expect(ALL_UNITS.length).toBe(24);
  });
});

describe('curriculum template — Unit depth', () => {
  it('every Unit has exactly 10 lesson-day stubs', () => {
    const misshapen = ALL_UNITS.filter((u) => u.dayStubs.length !== 10);
    if (misshapen.length > 0) {
      // eslint-disable-next-line no-console
      console.error(
        `Units with != 10 stubs:\n  ${misshapen
          .map((u) => `${u.slug} (${u.dayStubs.length})`)
          .join('\n  ')}`,
      );
    }
    expect(misshapen).toEqual([]);
  });
});

describe('curriculum template — unit kind mix', () => {
  const byKind = (k: 'heritage' | 'genre' | 'location') =>
    ALL_UNITS.filter((u) => (u.kind ?? 'heritage') === k);

  it('has 10 heritage units', () => {
    expect(byKind('heritage')).toHaveLength(10);
  });

  it('has 10 genre units', () => {
    expect(byKind('genre')).toHaveLength(10);
  });

  it('has 4 location units', () => {
    expect(byKind('location')).toHaveLength(4);
  });
});

describe('curriculum template — themes', () => {
  it('every unit theme resolves in the theme bank', () => {
    const themeIds = new Set(THEMES.map((t) => t.id));
    for (const u of ALL_UNITS) {
      expect(themeIds.has(u.themeId)).toBe(true);
    }
  });
});

describe('curriculum template — stub integrity', () => {
  it('every stub has a slug and a label', () => {
    for (const s of ALL_STUBS) {
      expect(s.slug.length).toBeGreaterThan(0);
      expect(s.label.length).toBeGreaterThan(0);
    }
  });

  it('every stub has non-empty phaseSeeds for all five phases', () => {
    for (const s of ALL_STUBS) {
      expect(s.phaseSeeds.connectRegulate?.en).toBeTruthy();
      expect(s.phaseSeeds.groupPractice?.en).toBeTruthy();
      expect(s.phaseSeeds.creativeProjects?.en).toBeTruthy();
      expect(s.phaseSeeds.presentPerform?.en).toBeTruthy();
      expect(s.phaseSeeds.respondReflectReset?.en).toBeTruthy();
    }
  });

  it('slugs are unique across the entire template', () => {
    const slugs = ALL_STUBS.map((s) => s.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe('curriculum template — song references resolve', () => {
  it('every stub songId (when present) exists in the song library', () => {
    const missing: string[] = [];
    for (const s of ALL_STUBS) {
      if (!s.songId) continue;
      if (!BUNDLED_SONGS[s.songId]) missing.push(`${s.slug} → ${s.songId}`);
    }
    // Log the failing ones so authors can fix the ids.
    if (missing.length > 0) {
      // Emit them to the failure output for easy grep.
      // eslint-disable-next-line no-console
      console.error(
        `Unknown song ids referenced by stubs:\n  ${missing.join('\n  ')}`,
      );
    }
    expect(missing).toEqual([]);
  });
});

describe('curriculum template — globe event references resolve', () => {
  const knownEventIds = new Set(BUNDLED_MUSIC_HISTORY.map((e) => e.id));

  it('every globeEventId (when present) exists in MUSIC_HISTORY', () => {
    const missing: string[] = [];
    for (const s of ALL_STUBS) {
      for (const eid of s.globeEventIds ?? []) {
        if (!knownEventIds.has(eid)) missing.push(`${s.slug} → ${eid}`);
      }
    }
    if (missing.length > 0) {
      // eslint-disable-next-line no-console
      console.error(
        `Unknown globe event ids referenced by stubs:\n  ${missing.join('\n  ')}`,
      );
    }
    expect(missing).toEqual([]);
  });
});
