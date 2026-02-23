import { createContext, useContext, useReducer, type ReactNode, type Dispatch } from 'react'
import type { AppState, AppAction } from '@/components/atlas/types'

const initialAIInsight: AppState['aiInsight'] = {
  query: '',
  content: '',
  status: 'idle',
}

const initialState: AppState = {
  currentYear: 2025,
  selectedDecades: [],
  selectedRegions: [],
  selectedNations: [],
  selectedSubdivisions: [],
  selectedCities: [],
  selectedLocation: null,
  globeAltitude: 2.5,
  activeTab: 'Region',
  searchQuery: '',
  isSearchOpen: false,
  searchResults: [],
  pinnedEvent: null,
  activeModule: null,
  selectedEra: null,
  searchFlyTarget: null,
  aiInsight: initialAIInsight,
}

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_YEAR':
      return { ...state, currentYear: action.payload }
    case 'TOGGLE_DECADE': {
      const decade = action.payload
      const has = state.selectedDecades.includes(decade)
      return {
        ...state,
        selectedDecades: has
          ? state.selectedDecades.filter((d) => d !== decade)
          : [...state.selectedDecades, decade],
      }
    }
    case 'TOGGLE_REGION': {
      const region = action.payload
      const has = state.selectedRegions.includes(region)
      return {
        ...state,
        selectedRegions: has
          ? state.selectedRegions.filter((r) => r !== region)
          : [...state.selectedRegions, region],
      }
    }
    case 'TOGGLE_NATION': {
      const nation = action.payload
      const has = state.selectedNations.includes(nation)
      return {
        ...state,
        selectedNations: has
          ? state.selectedNations.filter((n) => n !== nation)
          : [...state.selectedNations, nation],
      }
    }
    case 'TOGGLE_SUBDIVISION': {
      const sub = action.payload
      const has = state.selectedSubdivisions.includes(sub)
      return {
        ...state,
        selectedSubdivisions: has
          ? state.selectedSubdivisions.filter((s) => s !== sub)
          : [...state.selectedSubdivisions, sub],
      }
    }
    case 'TOGGLE_CITY': {
      const cityId = action.payload
      const has = state.selectedCities.includes(cityId)
      return {
        ...state,
        selectedCities: has
          ? state.selectedCities.filter((c) => c !== cityId)
          : [...state.selectedCities, cityId],
      }
    }
    case 'SELECT_LOCATION':
      return { ...state, selectedLocation: action.payload, pinnedEvent: null }
    case 'SET_ALTITUDE':
      return { ...state, globeAltitude: action.payload }
    case 'SET_TAB':
      return { ...state, activeTab: action.payload }
    case 'SET_SEARCH':
      return { ...state, searchQuery: action.payload }
    case 'SET_SEARCH_OPEN':
      return { ...state, isSearchOpen: action.payload }
    case 'SET_SEARCH_RESULTS':
      return { ...state, searchResults: action.payload, pinnedEvent: null }
    case 'PIN_EVENT':
      return { ...state, pinnedEvent: action.payload }
    case 'EXECUTE_SEARCH':
      return {
        ...state,
        currentYear: action.payload.year ?? state.currentYear,
        searchFlyTarget:
          action.payload.lat != null && action.payload.lng != null
            ? { lat: action.payload.lat, lng: action.payload.lng, zoom: action.payload.zoom ?? 8 }
            : null,
      }
    case 'CLEAR_FLY_TARGET':
      return { ...state, searchFlyTarget: null }
    case 'START_MODULE':
      return { ...state, activeModule: { moduleId: action.payload.moduleId, currentStep: 0 } }
    case 'MODULE_STEP':
      if (!state.activeModule) return state
      return { ...state, activeModule: { ...state.activeModule, currentStep: action.payload } }
    case 'EXIT_MODULE':
      return { ...state, activeModule: null }
    case 'AI_INSIGHT_START':
      return {
        ...state,
        aiInsight: { query: action.payload, content: '', status: 'loading' },
      }
    case 'AI_INSIGHT_CHUNK':
      return {
        ...state,
        aiInsight: {
          ...state.aiInsight,
          content: state.aiInsight.content + action.payload,
          status: 'streaming',
        },
      }
    case 'AI_INSIGHT_DONE':
      return {
        ...state,
        aiInsight: { ...state.aiInsight, status: 'done' },
      }
    case 'AI_INSIGHT_ERROR':
      return {
        ...state,
        aiInsight: { ...state.aiInsight, status: 'error', error: action.payload },
      }
    case 'SET_ERA':
      return { ...state, selectedEra: action.payload, pinnedEvent: null }
    case 'AI_INSIGHT_CLEAR':
      return { ...state, aiInsight: initialAIInsight }
    default:
      return state
  }
}

const AppContext = createContext<AppState>(initialState)
const DispatchContext = createContext<Dispatch<AppAction>>(() => {})

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState)
  return (
    <AppContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>
        {children}
      </DispatchContext.Provider>
    </AppContext.Provider>
  )
}

export function useAppState() {
  return useContext(AppContext)
}

export function useAppDispatch() {
  return useContext(DispatchContext)
}
