import {
  isGenreChipId,
  type GenreChipId,
} from '@/components/atlas/data/genreChipIds';
import { findEra, eraWindow } from '@/components/atlas/data/musicalEras';
import {
  clampWindow,
  roundWindow,
  type TimeWindow,
} from '@/components/atlas/timeline/timeWindow';

/**
 * How the Globe page is looking at things, as opposed to what it is looking
 * at (the stop, navigation/atlasStop.ts): which view, which lens, which
 * places are opened into their parts, which years, which genres and which
 * panel the Inspector shows.
 *
 * Frame params ride along with every stop — a click from one event to the
 * next keeps the view and the years — and change with `replace`, so moving the
 * timeline or switching a tab never adds a step to Back or the trail.
 *
 *   ?view=timeline&open=americas,north-america&from=1946&to=1979&genres=blues-jazz&panel=layers
 *
 * Anything at its default stays off the URL. `?era=<id>` (lesson links, the
 * dashboard's era cards, slides) is read as that era's years and rewritten as
 * `from`/`to` (useWindowSync).
 */
export type AtlasView = 'map' | 'ring' | 'timeline';
/**
 * What the timeline's lanes are: places (Explore, Eras, Regions & Cities),
 * pathways (music's family tree and the journeys through it), instruments.
 */
export type AtlasLens = 'places' | 'pathways' | 'instruments';

/**
 * The Inspector's panels, one per icon on the side rail (owner, 2026-10-29:
 * the Globe in the Studio's frame): the stop's details, the pathways, the
 * world's instruments, the map's layers, a lesson's mind map. (The legend
 * is a floating card now; an old `panel=legend` link opens it: CardsLayer.)
 */
export const INSPECTOR_PANELS = [
  'details',
  'pathways',
  'instruments',
  'layers',
  'mindmap',
] as const;
export type InspectorPanelId = (typeof INSPECTOR_PANELS)[number];

/**
 * The panel the student chose: one of them, `none` (they closed it), or null
 * (nothing chosen: the stop decides, layout/inspectorModel.ts).
 */
export type AtlasPanelChoice = InspectorPanelId | 'none' | null;

const isPanelChoice = (v: string | null): v is InspectorPanelId | 'none' =>
  v === 'none' || (INSPECTOR_PANELS as readonly string[]).includes(v ?? '');

export interface AtlasFrame {
  view: AtlasView;
  lens: AtlasLens;
  /**
   * Places opened into their parts on the timeline: continents into
   * regions, regions into cities (data/placeTree.ts).
   */
  open: string[];
  /** The years shown; null is all of time (no filter). */
  window: TimeWindow | null;
  /** The genre chips picked (data/genreChips.ts); none keeps every event. */
  genres: GenreChipId[];
  /** The Inspector's panel, as the student chose it. */
  panel: AtlasPanelChoice;
}

/** The map's view: the stage shows the globe (Explore). */
export const isMapView = (frame: Pick<AtlasFrame, 'view'>): boolean =>
  frame.view === 'map';

/**
 * The ring's view (Connections): the places in a circle, their links as
 * chords, over the map it grew out of.
 */
export const isRingView = (frame: Pick<AtlasFrame, 'view'>): boolean =>
  frame.view === 'ring';

/** The timeline's view: the river (Eras, Regions & Cities). */
export const isTimelineView = (frame: Pick<AtlasFrame, 'view'>): boolean =>
  frame.view === 'timeline';

export const DEFAULT_FRAME: AtlasFrame = {
  view: 'map',
  lens: 'places',
  open: [],
  window: null,
  genres: [],
  panel: null,
};

export const FRAME_PARAM_KEYS = [
  'view',
  'lens',
  'open',
  'from',
  'to',
  'genres',
  'panel',
] as const;

const LENSES: readonly AtlasLens[] = ['places', 'pathways', 'instruments'];

const isLens = (v: string | null): v is AtlasLens =>
  !!v && (LENSES as readonly string[]).includes(v);

/**
 * A place id's shape: a continent or region slug. The timeline checks it
 * against data/placeTree.ts; reading that here would put it in the page's
 * first download.
 */
const PLACE_ID = /^[a-z]+(?:-[a-z]+)*$/;
const isPlaceId = (v: string): v is string => PLACE_ID.test(v);

const list = <T extends string>(
  raw: string | null,
  keep: (v: string) => v is T,
): T[] =>
  (raw ?? '')
    .split(',')
    .filter(keep)
    .filter((v, i, all) => all.indexOf(v) === i);

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
  const raw = params.get('view');
  const view: AtlasView = raw === 'timeline' || raw === 'ring' ? raw : 'map';
  const lensRaw = params.get('lens');
  return {
    view,
    lens: isLens(lensRaw) ? lensRaw : 'places',
    open: list(params.get('open'), isPlaceId),
    window: windowFromSearchParams(params),
    genres: list(params.get('genres'), isGenreChipId),
    panel: isPanelChoice(params.get('panel'))
      ? (params.get('panel') as InspectorPanelId | 'none')
      : null,
  };
}

/**
 * Rewrite `params` with `patch` applied to the frame they address. Stop
 * params and anything else on the URL carry over; a frame value at its
 * default is removed, and so is `era` once the window is written.
 */
export function applyFrameToSearchParams(
  params: URLSearchParams,
  patch: Partial<AtlasFrame>,
): URLSearchParams {
  const frame: AtlasFrame = { ...frameFromSearchParams(params), ...patch };
  const next = new URLSearchParams(params);
  const set = (key: string, value: string | null) => {
    if (value === null) next.delete(key);
    else next.set(key, value);
  };
  set('view', frame.view === DEFAULT_FRAME.view ? null : frame.view);
  set('lens', frame.lens === DEFAULT_FRAME.lens ? null : frame.lens);
  set('open', frame.open.length ? frame.open.join(',') : null);
  if ('window' in patch) {
    const w = frame.window ? roundWindow(frame.window) : null;
    set('from', w ? String(w.from) : null);
    set('to', w ? String(w.to) : null);
    next.delete('era');
  }
  set('genres', frame.genres.length ? frame.genres.join(',') : null);
  set('panel', frame.panel);
  return next;
}
