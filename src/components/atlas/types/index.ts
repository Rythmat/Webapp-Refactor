import type { TimeWindow } from '@/components/atlas/timeline/timeWindow';

// --- Region IDs (18 regions) ---
export type RegionId =
  | 'north-america'
  | 'central-america'
  | 'south-america'
  | 'north-europe'
  | 'west-europe'
  | 'east-europe'
  | 'north-asia'
  | 'central-asia'
  | 'west-asia'
  | 'east-asia'
  | 'south-asia'
  | 'southeast-asia'
  | 'north-africa'
  | 'central-africa'
  | 'west-africa'
  | 'east-africa'
  | 'south-africa'
  | 'oceania';

// --- Data models ---
export interface City {
  id: string;
  name: string;
  country: string;
  subdivision: string;
  region: RegionId;
  coordinates: [number, number];
  genres: string[];
  description: string;
  activeDecades: number[];
}

export interface Region {
  id: RegionId;
  label: string;
  center: [number, number];
  zoom: number;
  altitude: number;
}

/** Where an event is pinned: its coordinates, and its city and country as written. */
export interface EventLocation {
  lat: number;
  lng: number;
  city: string;
  country: string;
}

export interface HistoricalEvent {
  id: string;
  year: number;
  location: EventLocation;
  genre: string[];
  title: string;
  description: string;
  tags: string[];
  videoId?: string;
}

// --- Selection (discriminated union) ---
export type SelectedLocation =
  | { type: 'country'; name: string; iso: string }
  | { type: 'state'; name: string; country?: string }
  | { type: 'city'; id: string };

/**
 * How much of the map, in px from each edge, the page's overlays cover (the
 * layout measures it: layout/AtlasZones.tsx). The MapLibre engine keeps the
 * map's centre, and frames its flights, in what is left.
 */
export interface MapInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * The zones that stand over the map, each reporting what it covers: the
 * Inspector, the floating cards and, on a phone, the sheet and its bar.
 */
export type MapZone = 'inspector' | 'cards' | 'phone';

// --- Search fly target ---
/**
 * What a flight frames: the map fits a country's or a state's outline,
 * centres a city with the region around it, and fits a set of points
 * (components/Globe/mapFraming.ts).
 */
export type FlyFrame =
  /** A country's or a US/Canada state's outline. */
  | { kind: 'region'; place: SelectedLocation }
  /**
   * A city (`cityId` when it is one of the map's), centred at a street-map
   * zoom, which the map compresses to its own (capFrameZoom;
   * navigation/flyFrames.ts).
   */
  | { kind: 'city'; zoom: number; cityId?: string }
  /** Every one of these points: an artist's events. */
  | { kind: 'points'; points: { lat: number; lng: number }[] };

export interface FlyTarget {
  lat: number;
  lng: number;
  zoom: number;
  frame?: FlyFrame;
}

// --- Historical Pathway Modules ---
export interface HistoricalModule {
  id: string;
  title: string;
  description: string;
  emoji: string;
  eventIds: string[]; // ordered event IDs forming the pathway
}

export interface ModuleProgress {
  moduleId: string;
  currentStep: number; // 0-indexed
}

// --- Guided Tours (place-based region/city tours) ---
export interface TourProgress {
  tourId: string;
  currentStep: number; // 0-indexed
}

// --- Globe layers (the Layers control) ---
/** What the globe draws; each one the viewer can switch off. */
/** The viewer's choices for the floating cards (state/cardsStorage.ts). */
export interface CardPrefs {
  /** The floating card hidden (the bottom rail's Cards pill). */
  hidden: boolean;
}

/**
 * What colours the land: how much music each country holds in the years
 * shown (lit from dark), its continent's colour, or one plain dark.
 */
export type LandColor = 'music' | 'continent' | 'plain';

export interface GlobeLayers {
  landColor: LandColor;
  /** US and Canada state outlines, once the camera is close enough. */
  states: boolean;
  /** The music cities. */
  cities: boolean;
  /** An artist's moments, as points, while their panel is open. */
  artistPoints: boolean;
  /** A pinned event's influence arcs (directions as visibleArcDirections). */
  arcs: boolean;
}

/** The layers a switch turns on and off (all but the land's colour). */
export type LayerSwitch = Exclude<keyof GlobeLayers, 'landColor'>;

// --- App State ---
export interface AppState {
  selectedLocation: SelectedLocation | null;
  pinnedEvent: HistoricalEvent | null;
  activeModule: ModuleProgress | null;
  activeTour: TourProgress | null;
  /**
   * The years in view (timeline/timeWindow.ts): the timeline's window and the
   * filter the map and its bottom bar apply. Null is all of time. Mirrored to
   * the URL's `from`/`to` (navigation/useWindowSync.ts).
   */
  timeWindow: TimeWindow | null;
  searchFlyTarget: FlyTarget | null;
  /** Which influence arc directions are visible on the globe */
  visibleArcDirections: Set<'upstream' | 'downstream'>;
  /**
   * True while the globe is spinning. Only ever set by the user, from the spin
   * control on the globe page — nothing starts it automatically.
   */
  globeRotating: boolean;
  /** Which of the globe's layers are drawn. Per viewer, kept in localStorage. */
  layers: GlobeLayers;
  /** The floating cards' state. Per viewer, kept in localStorage. */
  cards: CardPrefs;
  /** What each zone covers of the map, as it last reported (SET_ZONE_INSETS). */
  zoneInsets: Partial<Record<MapZone, MapInsets>>;
  /**
   * What the page's overlays cover of the map: the zones' insets combined,
   * the deepest on each edge (combineInsets).
   */
  mapInsets: MapInsets;
}

export type AppAction =
  | { type: 'SELECT_LOCATION'; payload: SelectedLocation | null }
  | { type: 'PIN_EVENT'; payload: HistoricalEvent | null }
  | {
      type: 'EXECUTE_SEARCH';
      payload: { lat?: number; lng?: number; zoom?: number; frame?: FlyFrame };
    }
  | { type: 'CLEAR_FLY_TARGET' }
  | { type: 'SET_GLOBE_ROTATING'; payload: boolean }
  | { type: 'START_MODULE'; payload: { moduleId: string } }
  | { type: 'MODULE_STEP'; payload: number }
  | { type: 'EXIT_MODULE' }
  | { type: 'START_TOUR'; payload: { tourId: string } }
  | { type: 'TOUR_STEP'; payload: number }
  | { type: 'EXIT_TOUR' }
  | { type: 'SET_WINDOW'; payload: TimeWindow | null }
  | { type: 'TOGGLE_ARC_DIRECTION'; payload: 'upstream' | 'downstream' }
  | { type: 'OPEN_INFLUENCE_ARCS' }
  | { type: 'SET_LAYER'; payload: { layer: LayerSwitch; on: boolean } }
  | { type: 'SET_LAND_COLOR'; payload: LandColor }
  | { type: 'SET_CARD_PREFS'; payload: Partial<CardPrefs> }
  | {
      type: 'SET_ZONE_INSETS';
      payload: { zone: MapZone; insets: MapInsets | null };
    }
  /** The combined insets at once, skipping the zones (tests). */
  | { type: 'SET_MAP_INSETS'; payload: MapInsets };
