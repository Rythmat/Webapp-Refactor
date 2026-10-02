import { describe, expect, it } from 'vitest';
import { STOCK_FORCES } from '../layout/forceLayout';
import {
  centerForce,
  defaultGraphSettings,
  GRAPH_SETTINGS_KEY,
  GRAPH_SETTINGS_VERSION,
  type GraphSettings,
  linkDistance,
  linkForce,
  loadGraphSettings,
  mappedForces,
  MAX_GROUPS,
  parseGraphSettings,
  RETIRED_PRESET_GROUPS_KEY_COLOURS,
  RETIRED_PRESET_GROUPS_V1,
  repelForce,
  restoreGraphDefaults,
  saveGraphSettings,
  SLIDER_RANGES,
  sliderToStrength,
  STOCK_CENTER_SLIDER,
  strengthToSlider,
} from '../model/graphSettings';
import type { RenderFilters } from '../model/renderGraph';

/**
 * The settings panel's data: Obsidian's stock defaults, the slider-to-force
 * mappings, and storage that survives anything a browser can hand back.
 */

/**
 * `.obsidian/graph.json` from a vault whose graph settings were never
 * touched (the owner's creator-wiki vault, Obsidian 1.12.7), minus the
 * panel's collapse flags, its zoom and whether it was closed.
 */
const OBSIDIAN_STOCK = {
  search: '',
  showTags: false,
  showAttachments: false,
  hideUnresolved: false,
  showOrphans: true,
  colorGroups: [],
  showArrow: false,
  textFadeMultiplier: 0,
  nodeSizeMultiplier: 1,
  lineSizeMultiplier: 1,
  centerStrength: 0.518713248970312,
  repelStrength: 10,
  linkStrength: 1,
  linkDistance: 250,
};

/** Obsidian's local graph defaults, from its code (`localJumps` and the rest). */
const OBSIDIAN_LOCAL_STOCK = {
  localJumps: 1,
  localBacklinks: true,
  localForelinks: true,
  localInterlinks: false,
};

/** A storage that keeps what it is given, like localStorage. */
function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    data,
  };
}

/** A storage whose every call throws, like blocked site data. */
const refusingStorage = {
  getItem: (): string | null => {
    throw new Error('SecurityError');
  },
  setItem: (): void => {
    throw new Error('QuotaExceededError');
  },
};

describe('defaults', () => {
  it('are Obsidian’s stock global settings', () => {
    const { global, groups } = defaultGraphSettings();
    const asObsidian = {
      search: global.filters.search,
      showTags: global.filters.tags,
      showAttachments: global.filters.curriculum,
      hideUnresolved: global.filters.existingOnly,
      showOrphans: global.filters.orphans,
      colorGroups: groups ?? [],
      showArrow: global.display.arrows,
      textFadeMultiplier: global.display.textFade,
      nodeSizeMultiplier: global.display.nodeSize,
      lineSizeMultiplier: global.display.lineSize,
      centerStrength: global.forces.center,
      repelStrength: global.forces.repel,
      linkStrength: global.forces.link,
      linkDistance: global.forces.linkDistance,
    };
    expect({ ...asObsidian, centerStrength: 0 }).toEqual({
      ...OBSIDIAN_STOCK,
      centerStrength: 0,
    });
    // Obsidian computes it from 0.1 through the inverse of its curve.
    expect(asObsidian.centerStrength).toBeCloseTo(
      OBSIDIAN_STOCK.centerStrength,
      12,
    );
    expect(STOCK_CENTER_SLIDER).toBeCloseTo(0.5187, 4);
  });

  it('are Obsidian’s stock local settings', () => {
    const { local, global } = defaultGraphSettings();
    expect({
      localJumps: local.filters.depth,
      localBacklinks: local.filters.incoming,
      localForelinks: local.filters.outgoing,
      localInterlinks: local.filters.neighborLinks,
    }).toEqual(OBSIDIAN_LOCAL_STOCK);
    expect(local.forces).toEqual(global.forces);
    expect(local.display).toEqual(global.display);
    // Orphans is the global graph's switch alone.
    expect('orphans' in local.filters).toBe(false);
  });

  it('turn on the Atlas’s own switches', () => {
    const { global, local } = defaultGraphSettings();
    for (const filters of [global.filters, local.filters]) {
      expect(filters.tagFamilies).toEqual({
        genres: true,
        time: true,
        theory: true,
        instruments: true,
        regions: true,
      });
      expect(filters.guessed).toBe(true);
      expect(filters.unconfirmed).toBe(true);
    }
    expect(global.display.confidence).toBe(true);
  });

  it('use the presets for colour groups until they are edited', () => {
    expect(defaultGraphSettings().groups).toBeNull();
  });

  it('sit inside their sliders’ ranges', () => {
    const { global, local } = defaultGraphSettings();
    const values: Record<keyof typeof SLIDER_RANGES, number> = {
      center: global.forces.center,
      repel: global.forces.repel,
      link: global.forces.link,
      linkDistance: global.forces.linkDistance,
      textFade: global.display.textFade,
      nodeSize: global.display.nodeSize,
      lineSize: global.display.lineSize,
      depth: local.filters.depth,
    };
    for (const [name, value] of Object.entries(values)) {
      const range = SLIDER_RANGES[name as keyof typeof SLIDER_RANGES];
      expect(value, name).toBeGreaterThanOrEqual(range.min);
      expect(value, name).toBeLessThanOrEqual(range.max);
    }
    expect(SLIDER_RANGES.center).toMatchObject({ min: 0, max: 1 });
    expect(SLIDER_RANGES.repel).toMatchObject({ min: 0, max: 20 });
    expect(SLIDER_RANGES.link).toMatchObject({ min: 0, max: 1 });
    expect(SLIDER_RANGES.linkDistance).toEqual({ min: 30, max: 500, step: 1 });
    expect(SLIDER_RANGES.textFade).toEqual({ min: -3, max: 3, step: 0.1 });
    expect(SLIDER_RANGES.nodeSize).toMatchObject({ min: 0.1, max: 5 });
    expect(SLIDER_RANGES.lineSize).toMatchObject({ min: 0.1, max: 5 });
    expect(SLIDER_RANGES.depth).toEqual({ min: 1, max: 5, step: 1 });
  });

  it('are a fresh copy every time', () => {
    const one = defaultGraphSettings();
    one.global.filters.tags = true;
    one.global.filters.tagFamilies.time = false;
    expect(defaultGraphSettings().global.filters.tags).toBe(false);
    expect(defaultGraphSettings().global.filters.tagFamilies.time).toBe(true);
  });

  it('can be handed to the drawn graph as its filters', () => {
    const { global, local } = defaultGraphSettings();
    // Compile-time: the saved filters are render filters as they are.
    const g: RenderFilters = global.filters;
    const l: RenderFilters = local.filters;
    expect(g.tags).toBe(false);
    expect(l.orphans).toBeUndefined();
  });
});

describe('slider mappings', () => {
  it('map centre and link force along Obsidian’s curve', () => {
    expect(centerForce(0.5187)).toBeCloseTo(0.1, 3);
    expect(centerForce(OBSIDIAN_STOCK.centerStrength)).toBeCloseTo(0.1, 12);
    expect(centerForce(1)).toBeCloseTo(1, 12);
    expect(centerForce(0)).toBeCloseTo(0, 12);
    expect(linkForce(1)).toBeCloseTo(1, 12);
    expect(linkForce(0.5187)).toBeCloseTo(0.1, 3);
    expect(sliderToStrength(0.5)).toBeCloseTo((0.1 - 0.01) / 0.99, 12);
  });

  it('runs the curve both ways', () => {
    for (const strength of [0, 0.01, 0.1, 0.37, 1]) {
      expect(sliderToStrength(strengthToSlider(strength))).toBeCloseTo(
        strength,
        12,
      );
    }
  });

  it('cubes the repel slider: 10 is −1000', () => {
    expect(repelForce(10)).toBe(-1000);
    expect(repelForce(20)).toBe(-8000);
    expect(repelForce(1)).toBe(-1);
  });

  it('never repels more weakly than −1, as Obsidian does', () => {
    // Obsidian's worker: any repulsion under 1 is replaced by 1.
    expect(repelForce(0)).toBe(-1);
    expect(repelForce(0.5)).toBe(-1);
    expect(repelForce(0.99)).toBe(-1);
    expect(repelForce(1.5)).toBeCloseTo(-3.375, 12);
  });

  it('passes link distance through: 250 is 250', () => {
    expect(linkDistance(250)).toBe(250);
    expect(linkDistance(30)).toBe(30);
  });

  it('gives the layout Obsidian’s stock forces by default', () => {
    const forces = mappedForces(defaultGraphSettings().global.forces);
    expect(forces.center).toBeCloseTo(STOCK_FORCES.center, 12);
    expect(forces.repel).toBe(STOCK_FORCES.repel);
    expect(forces.link).toBeCloseTo(STOCK_FORCES.link, 12);
    expect(forces.linkDistance).toBe(STOCK_FORCES.linkDistance);
  });
});

describe('reading what was kept', () => {
  const kept = (): GraphSettings => {
    const s = defaultGraphSettings();
    s.global.filters.tags = true;
    s.global.filters.search = 'kind:song';
    s.global.forces.repel = 12;
    s.local.filters.depth = 3;
    s.local.display.arrows = true;
    s.groups = [{ query: 'kind:artist', color: '#3987e5' }];
    return s;
  };

  it('keeps settings through a save and a load', () => {
    const storage = memoryStorage();
    expect(saveGraphSettings(storage, kept())).toBe(true);
    expect(storage.data.has(GRAPH_SETTINGS_KEY)).toBe(true);
    expect(GRAPH_SETTINGS_KEY).toBe('ma-console-graph-settings-v1');
    expect(loadGraphSettings(storage)).toEqual(kept());
  });

  it('gives the defaults for nothing kept, or no storage', () => {
    expect(loadGraphSettings(memoryStorage())).toEqual(defaultGraphSettings());
    expect(loadGraphSettings(null)).toEqual(defaultGraphSettings());
    expect(loadGraphSettings(undefined)).toEqual(defaultGraphSettings());
  });

  it('gives the defaults when what was kept is corrupt', () => {
    for (const raw of ['{not json', '42', 'null', '"text"', '[]', '{}']) {
      const storage = memoryStorage({ [GRAPH_SETTINGS_KEY]: raw });
      expect(loadGraphSettings(storage), raw).toEqual(defaultGraphSettings());
    }
  });

  it('gives the defaults for another version', () => {
    const other = { ...kept(), version: GRAPH_SETTINGS_VERSION + 1 };
    expect(parseGraphSettings(other)).toEqual(defaultGraphSettings());
  });

  it('gives the defaults when the storage refuses', () => {
    expect(loadGraphSettings(refusingStorage)).toEqual(defaultGraphSettings());
    expect(saveGraphSettings(refusingStorage, kept())).toBe(false);
    expect(saveGraphSettings(null, kept())).toBe(false);
  });

  it('mends a broken field and keeps the rest', () => {
    const raw = JSON.parse(JSON.stringify(kept()));
    raw.global.forces.repel = 'abc';
    raw.global.forces.linkDistance = 9000;
    raw.global.display.nodeSize = null;
    raw.local.filters.depth = 2.5;
    raw.local.filters.tagFamilies = { time: false, genres: 'yes' };
    raw.global.filters.tagFamilies = 'all';
    raw.global.filters.search = 7;
    raw.local.display = 'big';
    const read = parseGraphSettings(raw);
    expect(read.global.forces.repel).toBe(10);
    expect(read.global.forces.linkDistance).toBe(250);
    expect(read.global.display.nodeSize).toBe(1);
    expect(read.local.filters.depth).toBe(1);
    expect(read.local.filters.tagFamilies).toEqual({
      genres: true,
      time: false,
      theory: true,
      instruments: true,
      regions: true,
    });
    expect(read.global.filters.tagFamilies.genres).toBe(true);
    expect(read.global.filters.search).toBe('');
    expect(read.local.display).toEqual(defaultGraphSettings().local.display);
    // The fields that were fine are kept.
    expect(read.global.filters.tags).toBe(true);
    expect(read.local.filters.incoming).toBe(true);
    expect(read.groups).toEqual(kept().groups);
  });

  it('drops fields it does not know', () => {
    const raw = JSON.parse(JSON.stringify(kept()));
    raw.global.forces.gravity = 3;
    raw.extra = true;
    const read = parseGraphSettings(raw) as unknown as Record<string, unknown>;
    expect(read.extra).toBeUndefined();
    expect(
      (read.global as { forces: Record<string, unknown> }).forces.gravity,
    ).toBeUndefined();
  });

  it('keeps the readable colour groups and drops the rest', () => {
    const raw = JSON.parse(JSON.stringify(kept()));
    raw.groups = [
      { query: 'kind:song', color: '#EEECF8' },
      { query: 'kind:artist', color: 'blue' },
      { query: 42, color: '#ffffff' },
      'kind:event',
      { query: '', color: '#199e70' },
    ];
    expect(parseGraphSettings(raw).groups).toEqual([
      { query: 'kind:song', color: '#EEECF8' },
      { query: '', color: '#199e70' },
    ]);
    raw.groups = 'presets';
    expect(parseGraphSettings(raw).groups).toBeNull();
    raw.groups = Array.from({ length: 100 }, () => ({
      query: 'is:tag',
      color: '#44cf6e',
    }));
    expect(parseGraphSettings(raw).groups).toHaveLength(MAX_GROUPS);
    // An emptied list stays empty: the owner deleted every group.
    raw.groups = [];
    expect(parseGraphSettings(raw).groups).toEqual([]);
  });

  it('turns untouched retired presets into the presets, and keeps edited ones', () => {
    const raw = JSON.parse(JSON.stringify(kept()));
    // The interim key-colour presets, with or without their names.
    raw.groups = RETIRED_PRESET_GROUPS_KEY_COLOURS.map((g) => ({ ...g }));
    expect(parseGraphSettings(raw).groups).toBeNull();
    raw.groups = RETIRED_PRESET_GROUPS_KEY_COLOURS.map(({ query, color }) => ({
      query,
      color: color.toUpperCase(),
    }));
    expect(parseGraphSettings(raw).groups).toBeNull();
    // Version 1's presets.
    raw.groups = RETIRED_PRESET_GROUPS_V1.map((g) => ({ ...g }));
    expect(parseGraphSettings({ ...raw, version: 1 }).groups).toBeNull();
    // One colour changed: the owner's own groups, kept as they are.
    const edited = RETIRED_PRESET_GROUPS_KEY_COLOURS.map((g) => ({ ...g }));
    edited[0] = { ...edited[0], color: '#123456' };
    raw.groups = edited;
    expect(parseGraphSettings(raw).groups).toEqual(edited);
    // One group fewer: also the owner's own.
    raw.groups = RETIRED_PRESET_GROUPS_KEY_COLOURS.slice(1);
    expect(parseGraphSettings(raw).groups).toHaveLength(11);
  });
});

describe('restore default settings', () => {
  it('resets the mode it is asked for and the groups, and keeps the other mode', () => {
    const s = defaultGraphSettings();
    s.global.forces.repel = 3;
    s.global.filters.tags = true;
    s.local.filters.depth = 4;
    s.groups = [];
    const global = restoreGraphDefaults(s, 'global');
    expect(global.global).toEqual(defaultGraphSettings().global);
    expect(global.local.filters.depth).toBe(4);
    expect(global.groups).toBeNull();
    const local = restoreGraphDefaults(s, 'local');
    expect(local.local).toEqual(defaultGraphSettings().local);
    expect(local.global.forces.repel).toBe(3);
    // The original is untouched.
    expect(s.groups).toEqual([]);
  });
});
