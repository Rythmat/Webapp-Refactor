import { isLaneId, type LaneId } from '@/components/atlas/data/laneIds';
import { findEra, eraWindow } from '@/components/atlas/data/musicalEras';
import {
  clampWindow,
  roundWindow,
  type TimeWindow,
} from '@/components/atlas/timeline/timeWindow';
import type { RegionId } from '@/components/atlas/types';

/**
 * How the Globe page is looking at things, as opposed to what it is looking
 * at (the stop, navigation/atlasStop.ts): which view, which lens, which years
 * and which branch of music's family tree.
 *
 * Frame params ride along with every stop — a click from one event to the
 * next keeps the view and the years — and change with `replace`, so moving the
 * timeline or switching a tab never adds a step to Back or the trail.
 *
 *   ?view=timeline&lens=regions&region=west-africa&from=1946&to=1979&lane=jazz
 *
 * Anything at its default stays off the URL. `?era=<id>` (lesson links, the
 * dashboard's era cards, slides) is read as that era's years and rewritten as
 * `from`/`to` (useWindowSync).
 */
export type AtlasView = 'map' | 'timeline';
export type AtlasLens = 'lineage' | 'regions' | 'pathways' | 'instruments';

export interface AtlasFrame {
  view: AtlasView;
  lens: AtlasLens;
  /** The region a regions lens has opened into its cities. */
  region: RegionId | null;
  /** The years shown; null is all of time (no filter). */
  window: TimeWindow | null;
  /**
   * The lane whose family is picked out (data/lineage.ts: it, what it came
   * from and what it became); null picks out none.
   */
  lane: LaneId | null;
}

export const DEFAULT_FRAME: AtlasFrame = {
  view: 'map',
  lens: 'lineage',
  region: null,
  window: null,
  lane: null,
};

export const FRAME_PARAM_KEYS = [
  'view',
  'lens',
  'region',
  'from',
  'to',
  'lane',
] as const;

const LENSES: readonly AtlasLens[] = [
  'lineage',
  'regions',
  'pathways',
  'instruments',
];
/**
 * A region id's shape. The regions lens checks it against data/regions.ts;
 * reading that table here would put it in the page's first download.
 */
const REGION_ID = /^[a-z]+(?:-[a-z]+)*$/;

const isLens = (v: string | null): v is AtlasLens =>
  !!v && (LENSES as readonly string[]).includes(v);

const year = (raw: string | null): number | null => {
  if (raw === null || raw.trim() === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
};

/** The window `from`/`to` name, else the era `era` names; null for neither. */
export function windowFromSearchParams(
  params: URLSearchParams,
): TimeWindow | null {
  const from = year(params.get('from'));
  const to = year(params.get('to'));
  if (from !== null && to !== null && to > from) {
    return roundWindow(clampWindow({ from, to }));
  }
  const eraRaw = params.get('era');
  const era = eraRaw ? findEra(eraRaw) : undefined;
  return era ? eraWindow(era) : null;
}

export function frameFromSearchParams(params: URLSearchParams): AtlasFrame {
  const view: AtlasView =
    params.get('view') === 'timeline' ? 'timeline' : 'map';
  const lensRaw = params.get('lens');
  const lens = isLens(lensRaw) ? lensRaw : 'lineage';
  const regionRaw = params.get('region');
  const region =
    lens === 'regions' && regionRaw && REGION_ID.test(regionRaw)
      ? (regionRaw as RegionId)
      : null;
  const laneRaw = params.get('lane');
  return {
    view,
    lens,
    region,
    window: windowFromSearchParams(params),
    lane: laneRaw && isLaneId(laneRaw) ? laneRaw : null,
  };
}

/**
 * Rewrite `params` with `patch` applied to the frame they address. Stop
 * params and anything else on the URL carry over; a frame value at its
 * default is removed, and so is `era` once the window is written. Switching
 * lens closes an opened region unless the patch names one.
 */
export function applyFrameToSearchParams(
  params: URLSearchParams,
  patch: Partial<AtlasFrame>,
): URLSearchParams {
  const current = frameFromSearchParams(params);
  const next = new URLSearchParams(params);
  const frame: AtlasFrame = { ...current, ...patch };
  if (patch.lens && patch.lens !== current.lens && !('region' in patch)) {
    frame.region = null;
  }

  const set = (key: string, value: string | null) => {
    if (value === null) next.delete(key);
    else next.set(key, value);
  };
  set('view', frame.view === DEFAULT_FRAME.view ? null : frame.view);
  set('lens', frame.lens === DEFAULT_FRAME.lens ? null : frame.lens);
  set('region', frame.lens === 'regions' ? frame.region : null);
  if ('window' in patch) {
    const w = frame.window ? roundWindow(frame.window) : null;
    set('from', w ? String(w.from) : null);
    set('to', w ? String(w.to) : null);
    next.delete('era');
  }
  set('lane', frame.lane);
  return next;
}
