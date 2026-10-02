import { z } from 'zod';
import { LOCAL_DEPTH_MAX, LOCAL_DEPTH_MIN } from '@/content/graph/localGraph';
import { TAG_FAMILIES, type TagFamily } from './nodeRoles';

/**
 * The Mind Map's settings panel, as data: its Filters, Display and Forces
 * for the global graph and the local graph, the colour groups both share,
 * and how they are kept in the browser.
 *
 * The defaults are Obsidian's stock settings, read from a vault that has
 * never changed them (`.obsidian/graph.json`) and from Obsidian's own code:
 *
 * | Setting               | Field             | Default | Range     |
 * |-----------------------|-------------------|---------|-----------|
 * | Center force          | forces.center     | 0.5187  | 0 to 1    |
 * | Repel force           | forces.repel      | 10      | 0 to 20   |
 * | Link force            | forces.link       | 1       | 0 to 1    |
 * | Link distance         | forces.linkDistance | 250   | 30 to 500 |
 * | Text fade threshold   | display.textFade  | 0       | −3 to 3   |
 * | Node size             | display.nodeSize  | 1       | 0.1 to 5  |
 * | Link thickness        | display.lineSize  | 1       | 0.1 to 5  |
 * | Arrows                | display.arrows    | off     |           |
 * | Tags                  | filters.tags      | off     |           |
 * | Attachments           | filters.curriculum | off    |           |
 * | Existing files only   | filters.existingOnly | off  |           |
 * | Orphans (global only) | filters.orphans   | on      |           |
 *
 * The local graph adds Depth (1, from 1 to 5), Incoming links (on),
 * Outgoing links (on) and Neighbor links (off), and has no Orphans switch.
 * The Atlas adds switches of its own: the tag families (all on), Guessed
 * links and Unconfirmed links (both on), and Link confidence (on), which
 * draws guessed lines dotted and unconfirmed ones dashed.
 *
 * The field names are the ones the settings panel edits
 * (`settings/SettingControls.tsx`) and the renderer's style takes
 * (`nodeSize`, `lineSize`, `arrows`, `confidence`), so the three can be
 * wired together without renaming.
 *
 * SLIDERS AND FORCES
 *
 * `forces` holds where the sliders sit, not what the simulation receives.
 * Obsidian maps them, and so does `mappedForces`:
 *
 * - centre and link force: (0.01^(1 − x) − 0.01) / 0.99, so the slider's
 *   0.5187 is a strength of 0.1 and 1 is 1;
 * - repel force: −x³, so 10 is −1000, and never weaker than −1;
 * - link distance: as it is.
 *
 * KEEPING THEM
 *
 * Everything is kept under one localStorage key, versioned so a future shape
 * can start clean. What is read back is checked field by field: a field that
 * is missing or broken takes its default and the rest are kept, and anything
 * that is not settings this module can read gives the defaults. The colour
 * groups are `null` until the owner edits them, meaning "the presets", so a
 * change to the presets reaches everyone who never customised them.
 *
 * Version 2 (1 October 2026) moved the presets onto the app's twelve
 * colours and gave groups names. Version 1 settings are still read, every
 * field as it was, with one change: groups that are exactly the old
 * presets (the same seven queries in the same order, in the old colours)
 * become `null`, so they take the new presets too. Groups the owner edited
 * in any way are kept as they are.
 *
 * The module is pure: storage is handed in, so it runs in node.
 */

/** Where the settings are kept. The key names a place, not a version. */
export const GRAPH_SETTINGS_KEY = 'ma-console-graph-settings-v1';
/** The shape's version, as it is written. */
export const GRAPH_SETTINGS_VERSION = 2;
/**
 * The versions that can be read: this one, and version 1 (the same shape,
 * from before the presets took the app's colours), which is brought up to
 * date as it is read. Anything else stored under the key is ignored.
 */
const READABLE_VERSIONS: readonly unknown[] = [1, GRAPH_SETTINGS_VERSION];

/* ── Sliders ────────────────────────────────────────────────────────────── */

export interface SliderRange {
  readonly min: number;
  readonly max: number;
  /**
   * The panel's step. Obsidian's sliders are continuous apart from link
   * distance (1) and text fade (0.1); these steps are fine enough to match.
   */
  readonly step: number;
}

/** Each slider's range, as Obsidian has them. */
export const SLIDER_RANGES = {
  center: { min: 0, max: 1, step: 0.001 },
  repel: { min: 0, max: 20, step: 0.01 },
  link: { min: 0, max: 1, step: 0.001 },
  linkDistance: { min: 30, max: 500, step: 1 },
  textFade: { min: -3, max: 3, step: 0.1 },
  nodeSize: { min: 0.1, max: 5, step: 0.01 },
  lineSize: { min: 0.1, max: 5, step: 0.01 },
  // The local walk's own limits (`localGraph.ts`), so the two never differ.
  depth: { min: LOCAL_DEPTH_MIN, max: LOCAL_DEPTH_MAX, step: 1 },
} as const satisfies Record<string, SliderRange>;

/** The curve the centre and link sliders run along (Obsidian's base). */
const CURVE = 0.01;

/** A centre or link slider position → the force's strength. */
export const sliderToStrength = (x: number): number =>
  (CURVE ** (1 - x) - CURVE) / (1 - CURVE);

/** A strength → the centre or link slider position that gives it. */
export const strengthToSlider = (strength: number): number =>
  1 - Math.log(strength * (1 - CURVE) + CURVE) / Math.log(CURVE);

/** The centre force's strength for a slider position. */
export const centerForce = sliderToStrength;
/** The link force's strength for a slider position. */
export const linkForce = sliderToStrength;
/**
 * The repel force's strength for a slider position: −x³, but never weaker
 * than −1. Obsidian's layout worker swaps any repulsion under 1 for 1, so the
 * slider's low end (below 1) still pushes nodes apart a little rather than
 * not at all.
 */
export const repelForce = (x: number): number => {
  const cube = x ** 3;
  return Math.abs(cube) < 1 ? -1 : -cube;
};
/** The link distance for a slider position: as it is. */
export const linkDistance = (x: number): number => x;

/**
 * The strengths a force layout receives. The fields match the layout's own
 * `LayoutForces` (`layout/forceLayout.ts`), so this can be passed to it.
 * They share their names with `GraphForceSettings`, which holds slider
 * positions: always go from one to the other through `mappedForces`.
 */
export interface MappedForces {
  center: number;
  repel: number;
  link: number;
  linkDistance: number;
}

/* ── The schema ─────────────────────────────────────────────────────────── */

/** A number in a range; anything else is the default. */
const num = (min: number, max: number, fallback: number) =>
  z.number().finite().min(min).max(max).catch(fallback);

/** A whole number in a range; anything else is the default. */
const int = (min: number, max: number, fallback: number) =>
  z.number().int().min(min).max(max).catch(fallback);

const bool = (fallback: boolean) => z.boolean().catch(fallback);

/** Obsidian's slider position for its stock centre strength of 0.1. */
export const STOCK_CENTER_SLIDER = strengthToSlider(0.1);

const forcesSchema = z.object({
  center: num(0, 1, STOCK_CENTER_SLIDER),
  repel: num(0, 20, 10),
  link: num(0, 1, 1),
  linkDistance: num(30, 500, 250),
});

const displaySchema = z.object({
  arrows: bool(false),
  textFade: num(-3, 3, 0),
  nodeSize: num(0.1, 5, 1),
  lineSize: num(0.1, 5, 1),
  confidence: bool(true),
});

const tagFamiliesSchema = z.object(
  Object.fromEntries(TAG_FAMILIES.map((f) => [f, bool(true)])) as Record<
    TagFamily,
    z.ZodCatch<z.ZodBoolean>
  >,
);

/**
 * The longest search or group query kept. The panel's fields stop typing
 * there too (`settings/SettingControls.tsx`).
 */
export const QUERY_MAX = 500;

const filterFields = {
  search: z.string().max(QUERY_MAX).catch(''),
  tags: bool(false),
  // Read on its own (`readFamilies`), so one bad family keeps the others.
  tagFamilies: z.unknown(),
  curriculum: bool(false),
  existingOnly: bool(false),
  guessed: bool(true),
  unconfirmed: bool(true),
};

const globalFiltersSchema = z.object({ ...filterFields, orphans: bool(true) });

const localFiltersSchema = z.object({
  ...filterFields,
  depth: int(LOCAL_DEPTH_MIN, LOCAL_DEPTH_MAX, LOCAL_DEPTH_MIN),
  incoming: bool(true),
  outgoing: bool(true),
  neighborLinks: bool(false),
});

/** One colour group: a query, a `#rrggbb` colour and, for a preset, a name. */
export interface GraphGroupSetting {
  readonly query: string;
  readonly color: string;
  readonly name?: string;
}

/** The longest group name kept. */
export const GROUP_NAME_MAX = 60;

const groupSchema = z.object({
  query: z.string().max(QUERY_MAX),
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
  // A name that cannot be read is dropped; the group is kept.
  name: z.string().max(GROUP_NAME_MAX).optional().catch(undefined),
});

/**
 * The presets before 1 October 2026, which version 1 settings may hold:
 * each query with its colour's red, green and blue bytes. They are kept
 * only to recognise stored groups nobody changed (`isRetiredPresets`), and
 * are never drawn.
 */
const RETIRED_PRESETS_V1: readonly (readonly [
  string,
  readonly [number, number, number],
])[] = [
  ['kind:song', [238, 236, 248]],
  ['kind:artist', [57, 135, 229]],
  ['kind:event', [217, 89, 38]],
  ['kind:place', [25, 158, 112]],
  ['kind:release OR kind:label OR kind:studio', [213, 81, 129]],
  ['is:tag', [68, 207, 110]],
  ['is:curriculum', [143, 155, 179]],
];

const byteHex = (bytes: readonly number[]) =>
  `#${bytes.map((b) => b.toString(16).padStart(2, '0')).join('')}`;

/** The retired presets as groups, `#rrggbb` (for tests and the migration). */
export const RETIRED_PRESET_GROUPS_V1: readonly GraphGroupSetting[] =
  RETIRED_PRESETS_V1.map(([query, rgb]) => ({ query, color: byteHex(rgb) }));

/**
 * The interim presets of 1 October 2026, which coloured each kind with one
 * of Prism's twelve key colours before the owner chose palette B: each
 * name and query with its colour's red, green and blue bytes. Like the
 * version 1 presets, they are kept only to recognise stored groups nobody
 * changed (`isRetiredPresets`), and are never drawn.
 */
const RETIRED_PRESETS_KEY_COLOURS: readonly (readonly [
  string,
  string,
  readonly [number, number, number],
])[] = [
  ['Songs', 'kind:song', [210, 64, 74]],
  ['Curriculum', 'is:curriculum', [255, 115, 72]],
  ['Events', 'kind:event', [254, 169, 42]],
  ['Year', 'kind:year OR kind:decade OR kind:era', [255, 203, 48]],
  ['Location', 'kind:place', [174, 213, 128]],
  ['Genre', 'kind:genre OR kind:subgenre OR kind:scene', [127, 199, 131]],
  ['Instruments', 'kind:instrument', [40, 166, 154]],
  ['Artists', 'kind:artist', [98, 180, 247]],
  ['Key', 'kind:key OR kind:mode OR kind:vibe', [120, 133, 203]],
  ['Records', 'kind:release', [157, 127, 206]],
  ['Studios & Labels', 'kind:studio OR kind:label', [199, 133, 211]],
  ['Chord Progressions', 'kind:progression', [248, 168, 197]],
];

/**
 * The interim key-colour presets as groups, `#rrggbb`, with their names
 * (for tests and the migration).
 */
export const RETIRED_PRESET_GROUPS_KEY_COLOURS: readonly GraphGroupSetting[] =
  RETIRED_PRESETS_KEY_COLOURS.map(([name, query, rgb]) => ({
    name,
    query,
    color: byteHex(rgb),
  }));

/**
 * Whether stored groups are exactly one set of retired presets, in the
 * same order and colours and with nothing else. A group may carry its
 * preset's name or none.
 */
function matchesRetired(
  groups: readonly GraphGroupSetting[],
  retired: readonly GraphGroupSetting[],
): boolean {
  return (
    groups.length === retired.length &&
    groups.every((group, i) => {
      const old = retired[i];
      return (
        group.query === old.query &&
        group.color.toLowerCase() === old.color &&
        (group.name === undefined || group.name === old.name)
      );
    })
  );
}

/**
 * Whether stored groups are exactly the retired presets: either the
 * version 1 presets or the interim key-colour presets, with the same
 * queries in the same order, in the same colours (in either case), and
 * nothing else. Any edit (a query, a colour, a name, an order, a group
 * added or deleted) makes them the owner's own.
 */
export function isRetiredPresets(
  groups: readonly GraphGroupSetting[],
): boolean {
  return (
    matchesRetired(groups, RETIRED_PRESET_GROUPS_V1) ||
    matchesRetired(groups, RETIRED_PRESET_GROUPS_KEY_COLOURS)
  );
}

/** The most colour groups kept. */
export const MAX_GROUPS = 64;

export type TagFamilySettings = Record<TagFamily, boolean>;
/** Where the force sliders sit (see `mappedForces` for the strengths). */
export type GraphForceSettings = z.output<typeof forcesSchema>;
export type GraphDisplaySettings = z.output<typeof displaySchema>;
export type GlobalFilterSettings = Omit<
  z.output<typeof globalFiltersSchema>,
  'tagFamilies'
> & { tagFamilies: TagFamilySettings };
export type LocalFilterSettings = Omit<
  z.output<typeof localFiltersSchema>,
  'tagFamilies'
> & { tagFamilies: TagFamilySettings };

export interface GlobalGraphSettings {
  filters: GlobalFilterSettings;
  display: GraphDisplaySettings;
  forces: GraphForceSettings;
}

export interface LocalGraphSettings {
  filters: LocalFilterSettings;
  display: GraphDisplaySettings;
  forces: GraphForceSettings;
}

export interface GraphSettings {
  version: typeof GRAPH_SETTINGS_VERSION;
  global: GlobalGraphSettings;
  local: LocalGraphSettings;
  /** The colour groups, or null for the presets. */
  groups: GraphGroupSetting[] | null;
}

export type GraphMode = 'global' | 'local';

/* ── Reading ────────────────────────────────────────────────────────────── */

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** `value` as an object to read fields from; anything else reads as empty. */
const fields = (value: unknown): Record<string, unknown> =>
  isRecord(value) ? value : {};

const readFamilies = (value: unknown): TagFamilySettings =>
  tagFamiliesSchema.parse(fields(value));

const readForces = (value: unknown): GraphForceSettings =>
  forcesSchema.parse(fields(value));

const readDisplay = (value: unknown): GraphDisplaySettings =>
  displaySchema.parse(fields(value));

function readGlobal(value: unknown): GlobalGraphSettings {
  const mode = fields(value);
  const filters = globalFiltersSchema.parse(fields(mode.filters));
  return {
    filters: { ...filters, tagFamilies: readFamilies(filters.tagFamilies) },
    display: readDisplay(mode.display),
    forces: readForces(mode.forces),
  };
}

function readLocal(value: unknown): LocalGraphSettings {
  const mode = fields(value);
  const filters = localFiltersSchema.parse(fields(mode.filters));
  return {
    filters: { ...filters, tagFamilies: readFamilies(filters.tagFamilies) },
    display: readDisplay(mode.display),
    forces: readForces(mode.forces),
  };
}

/** The groups kept, without any that are broken; null for the presets. */
function readGroups(value: unknown): GraphGroupSetting[] | null {
  if (!Array.isArray(value)) return null;
  return value.slice(0, MAX_GROUPS).flatMap((group) => {
    const parsed = groupSchema.safeParse(group);
    return parsed.success ? [parsed.data] : [];
  });
}

/**
 * Stored settings (already parsed from JSON) → the settings, every broken
 * or missing field at its default. Version 1 settings are brought up to
 * this version; anything else that is not this version's settings gives
 * the defaults.
 */
export function parseGraphSettings(value: unknown): GraphSettings {
  if (!isRecord(value) || !READABLE_VERSIONS.includes(value.version)) {
    return defaultGraphSettings();
  }
  const groups = readGroups(value.groups);
  return {
    version: GRAPH_SETTINGS_VERSION,
    global: readGlobal(value.global),
    local: readLocal(value.local),
    // Untouched retired presets (version 1's, or the interim key-colour
    // ones) become today's presets.
    groups: groups && isRetiredPresets(groups) ? null : groups,
  };
}

/** Obsidian's stock settings, as a fresh copy the caller may change. */
export function defaultGraphSettings(): GraphSettings {
  return {
    version: GRAPH_SETTINGS_VERSION,
    global: readGlobal({}),
    local: readLocal({}),
    groups: null,
  };
}

/**
 * "Restore default settings": the mode's filters, display and forces go
 * back to stock, and the colour groups back to the presets. The other
 * mode's settings are kept.
 */
export function restoreGraphDefaults(
  settings: GraphSettings,
  mode: GraphMode,
): GraphSettings {
  const defaults = defaultGraphSettings();
  return mode === 'global'
    ? { ...settings, global: defaults.global, groups: null }
    : { ...settings, local: defaults.local, groups: null };
}

/** The strengths the force layout receives for a mode's force sliders. */
export function mappedForces(forces: GraphForceSettings): MappedForces {
  return {
    center: centerForce(forces.center),
    repel: repelForce(forces.repel),
    link: linkForce(forces.link),
    linkDistance: linkDistance(forces.linkDistance),
  };
}

/* ── Storage ────────────────────────────────────────────────────────────── */

/** The part of `localStorage` this module uses, handed in by the caller. */
export interface SettingsStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/**
 * The kept settings, or the defaults when there are none, they cannot be
 * read, or the storage itself refuses (a private window, blocked site data).
 */
export function loadGraphSettings(
  storage: Pick<SettingsStorage, 'getItem'> | null | undefined,
): GraphSettings {
  try {
    const raw = storage?.getItem(GRAPH_SETTINGS_KEY) ?? null;
    return raw === null
      ? defaultGraphSettings()
      : parseGraphSettings(JSON.parse(raw));
  } catch {
    return defaultGraphSettings();
  }
}

/** Keep the settings. False when the storage refuses; the page carries on. */
export function saveGraphSettings(
  storage: Pick<SettingsStorage, 'setItem'> | null | undefined,
  settings: GraphSettings,
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(GRAPH_SETTINGS_KEY, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}
