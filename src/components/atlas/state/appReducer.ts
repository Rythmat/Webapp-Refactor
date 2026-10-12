import type { AppState, AppAction } from '@/components/atlas/types';

export const initialAppState: AppState = {
  selectedLocation: null,
  pinnedEvent: null,
  activeModule: null,
  activeTour: null,
  selectedEra: null,
  searchFlyTarget: null,
  visibleArcDirections: new Set(),
  detailsPanelWidth: null,
  globeRotating: false,
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
    default:
      return state;
  }
}
