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

// --- Search fly target ---
export interface FlyTarget {
  lat: number;
  lng: number;
  zoom: number;
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
export interface GlobeLayers {
  /** Countries in their continent's colours; off, the land is one plain grey. */
  countryColors: boolean;
  /** US and Canada state outlines, once the camera is close enough. */
  states: boolean;
  /** A column on each music city. */
  cities: boolean;
  /** An artist's moments, as points, while their panel is open. */
  artistPoints: boolean;
  /** A pinned event's influence arcs (directions as visibleArcDirections). */
  arcs: boolean;
}

// --- App State ---
export interface AppState {
  selectedLocation: SelectedLocation | null;
  pinnedEvent: HistoricalEvent | null;
  activeModule: ModuleProgress | null;
  activeTour: TourProgress | null;
  selectedEra: string | null;
  searchFlyTarget: FlyTarget | null;
  /** Which influence arc directions are visible on the globe */
  visibleArcDirections: Set<'upstream' | 'downstream'>;
  /**
   * Rendered width (px) of the DetailsCard while it shows an expanded event, or
   * null. The globe shifts right by half of this so the region clears the card.
   */
  detailsPanelWidth: number | null;
  /**
   * Height (px) of the phone bottom sheet over the globe's lower part, or
   * null. The globe shifts up by half of this so the region clears the sheet.
   */
  sheetOcclusion: number | null;
  /**
   * True while the globe is spinning. Only ever set by the user, from the spin
   * control on the globe page — nothing starts it automatically.
   */
  globeRotating: boolean;
  /** Which of the globe's layers are drawn. Per viewer, kept in localStorage. */
  layers: GlobeLayers;
  /**
   * True while the camera is close enough for state outlines (BaseGlobe's
   * altitude band), so the legend lists them only when they can show.
   */
  statesInView: boolean;
  /** Whether the legend card is open; null until the viewer chooses (open on desktop, closed on phones). */
  legendOpen: boolean | null;
  /** Whether the Layers popover is open. */
  layersOpen: boolean;
}

export type AppAction =
  | { type: 'SELECT_LOCATION'; payload: SelectedLocation | null }
  | { type: 'PIN_EVENT'; payload: HistoricalEvent | null }
  | {
      type: 'EXECUTE_SEARCH';
      payload: { lat?: number; lng?: number; zoom?: number };
    }
  | { type: 'CLEAR_FLY_TARGET' }
  | { type: 'SET_GLOBE_ROTATING'; payload: boolean }
  | { type: 'START_MODULE'; payload: { moduleId: string } }
  | { type: 'MODULE_STEP'; payload: number }
  | { type: 'EXIT_MODULE' }
  | { type: 'START_TOUR'; payload: { tourId: string } }
  | { type: 'TOUR_STEP'; payload: number }
  | { type: 'EXIT_TOUR' }
  | { type: 'SET_ERA'; payload: string | null }
  | { type: 'SET_DETAILS_PANEL_WIDTH'; payload: number | null }
  | { type: 'SET_SHEET_OCCLUSION'; payload: number | null }
  | { type: 'TOGGLE_ARC_DIRECTION'; payload: 'upstream' | 'downstream' }
  | { type: 'OPEN_INFLUENCE_ARCS' }
  | { type: 'SET_LAYER'; payload: { layer: keyof GlobeLayers; on: boolean } }
  | { type: 'SET_STATES_IN_VIEW'; payload: boolean }
  | { type: 'SET_LEGEND_OPEN'; payload: boolean }
  | { type: 'SET_LAYERS_OPEN'; payload: boolean };
