import { findEra, eraWindow } from '@/components/atlas/data/musicalEras';
import { REGIONS } from '@/components/atlas/data/regions';
import { isStreamId, type StreamId } from '@/components/atlas/data/streamIds';
import {
  clampWindow,
  roundWindow,
  type TimeWindow,
} from '@/components/atlas/timeline/timeWindow';
import type { RegionId } from '@/components/atlas/types';

/**
 * How the Globe page is looking at things, as opposed to what it is looking
 * at (the stop, navigation/atlasStop.ts): which view, which lens, which years
 * and which streams.
 *
 * Frame params ride along with every stop — a click from one event to the
 * next keeps the view and the years — and change with `replace`, so moving the
 * timeline or switching a tab never adds a step to Back or the trail.
 *
 *   ?view=timeline&lens=regions&region=west-africa&from=1946&to=1979&streams=roots,beats
 *
 * Anything at its default stays off the URL. `?era=<id>` (lesson links, the
 * dashboard's era cards, slides) is read as that era's years and rewritten as
 * `from`/`to` (useWindowSync).
 */
export type AtlasView = 'map' | 'timeline';
export type AtlasLens = 'streams' | 'regions' | 'pathways' | 'instruments';

export interface AtlasFrame {
  view: AtlasView;
  lens: AtlasLens;
  /** The region a regions lens has opened into its cities. */
  region: RegionId | null;
  /** The years shown; null is all of time (no filter). */
  window: TimeWindow | null;
  /** The streams kept; empty is all of them. */
  streams: StreamId[];
}

export const DEFAULT_FRAME: AtlasFrame = {
  view: 'map',
  lens: 'streams',
  region: null,
  window: null,
  streams: [],
};

export const FRAME_PARAM_KEYS = [
  'view',
  'lens',
  'region',
  'from',
  'to',
  'streams',
] as const;

const LENSES: readonly AtlasLens[] = [
  'streams',
  'regions',
  'pathways',
  'instruments',
];
const REGION_IDS = new Set<string>(REGIONS.map((r) => r.id));

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
  const lens = isLens(lensRaw) ? lensRaw : 'streams';
  const regionRaw = params.get('region');
  const region =
    lens === 'regions' && regionRaw && REGION_IDS.has(regionRaw)
      ? (regionRaw as RegionId)
      : null;
  const streams = (params.get('streams') ?? '')
    .split(',')
    .filter(isStreamId)
    .filter((s, i, all) => all.indexOf(s) === i);
  return {
    view,
    lens,
    region,
    window: windowFromSearchParams(params),
    streams,
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
  set('streams', frame.streams.length ? frame.streams.join(',') : null);
  return next;
}
