import type {
  AppState,
  AppAction,
  GlobeLayers,
} from '@/components/atlas/types';

/** Every layer on: the globe as it has always looked. */
export const DEFAULT_LAYERS: GlobeLayers = {
  countryColors: true,
  states: true,
  cities: true,
  artistPoints: true,
  arcs: true,
};

export const initialAppState: AppState = {
  selectedLocation: null,
  pinnedEvent: null,
  activeModule: null,
  activeTour: null,
  selectedEra: null,
  searchFlyTarget: null,
  visibleArcDirections: new Set(),
  detailsPanelWidth: null,
  sheetOcclusion: null,
  globeRotating: false,
  layers: DEFAULT_LAYERS,
  statesInView: false,
  legendOpen: false,
  layersOpen: false,
  mapTouched: false,
  mapInsets: { top: 0, right: 0, bottom: 0, left: 0 },
};

/**
 * The Globe page's state transitions. The store in atlasStore.ts runs every
 * action through this, so it stays the single source of truth.
 */
export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SELECT_LOCATION':
      return { ...state, selectedLocation: action.payload, pinnedEvent: null };
    case 'SET_DETAILS_PANEL_WIDTH':
      return state.detailsPanelWidth === action.payload
        ? state
        : { ...state, detailsPanelWidth: action.payload };
    case 'SET_SHEET_OCCLUSION':
      return state.sheetOcclusion === action.payload
        ? state
        : { ...state, sheetOcclusion: action.payload };
    case 'SET_GLOBE_ROTATING':
      return state.globeRotating === action.payload
        ? state
        : { ...state, globeRotating: action.payload };
    case 'PIN_EVENT':
      return {
        ...state,
        pinnedEvent: action.payload,
        visibleArcDirections: new Set(),
      };
    case 'EXECUTE_SEARCH':
      return {
        ...state,
        searchFlyTarget:
          action.payload.lat != null && action.payload.lng != null
            ? {
                lat: action.payload.lat,
                lng: action.payload.lng,
                zoom: action.payload.zoom ?? 8,
                ...(action.payload.frame
                  ? { frame: action.payload.frame }
                  : {}),
              }
            : null,
      };
    case 'CLEAR_FLY_TARGET':
      return { ...state, searchFlyTarget: null };
    case 'START_MODULE':
      return {
        ...state,
        activeModule: { moduleId: action.payload.moduleId, currentStep: 0 },
      };
    case 'MODULE_STEP':
      if (!state.activeModule) return state;
      return {
        ...state,
        activeModule: { ...state.activeModule, currentStep: action.payload },
      };
    case 'EXIT_MODULE':
      return { ...state, activeModule: null };
    case 'START_TOUR':
      return {
        ...state,
        activeTour: { tourId: action.payload.tourId, currentStep: 0 },
        // A tour and a module are mutually exclusive.
        activeModule: null,
      };
    case 'TOUR_STEP':
      if (!state.activeTour) return state;
      return {
        ...state,
        activeTour: { ...state.activeTour, currentStep: action.payload },
      };
    case 'EXIT_TOUR':
      return { ...state, activeTour: null };
    case 'SET_ERA':
      return { ...state, selectedEra: action.payload, pinnedEvent: null };
    case 'TOGGLE_ARC_DIRECTION': {
      const next = new Set(state.visibleArcDirections);
      if (next.has(action.payload)) next.delete(action.payload);
      else next.add(action.payload);
      return { ...state, visibleArcDirections: next };
    }
    case 'OPEN_INFLUENCE_ARCS':
      return {
        ...state,
        visibleArcDirections: new Set(['upstream', 'downstream']),
      };
    case 'SET_LAYER': {
      const { layer, on } = action.payload;
      return state.layers[layer] === on
        ? state
        : { ...state, layers: { ...state.layers, [layer]: on } };
    }
    case 'SET_STATES_IN_VIEW':
      return state.statesInView === action.payload
        ? state
        : { ...state, statesInView: action.payload };
    case 'SET_LEGEND_OPEN':
      return state.legendOpen === action.payload
        ? state
        : { ...state, legendOpen: action.payload };
    case 'SET_LAYERS_OPEN':
      return state.layersOpen === action.payload
        ? state
        : { ...state, layersOpen: action.payload };
    case 'MAP_TOUCHED':
      return state.mapTouched ? state : { ...state, mapTouched: true };
    case 'SET_MAP_INSETS': {
      const was = state.mapInsets;
      const now = action.payload;
      return was.top === now.top &&
        was.right === now.right &&
        was.bottom === now.bottom &&
        was.left === now.left
        ? state
        : { ...state, mapInsets: now };
    }
    default:
      return state;
  }
}
