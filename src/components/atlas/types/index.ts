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
  | 'oceania'

// --- Data models ---
export interface City {
  id: string
  name: string
  country: string
  subdivision: string
  region: RegionId
  coordinates: [number, number]
  genres: string[]
  description: string
  activeDecades: number[]
}

export interface Region {
  id: RegionId
  label: string
  center: [number, number]
  zoom: number
  altitude: number
}

export interface HistoricalEvent {
  id: string
  year: number
  location: { lat: number; lng: number; city: string; country: string }
  genre: string[]
  title: string
  description: string
  tags: string[]
}

// --- UI types ---
export type CategoryTab = 'Region' | 'Decade' | 'City' | 'Genre' | 'Culture' | 'Musicians'

export interface MenuItem {
  id: string
  label: string
  icon: string
}

// --- Selection (discriminated union) ---
export type SelectedLocation =
  | { type: 'country'; name: string; iso: string }
  | { type: 'state'; name: string; country?: string }
  | { type: 'city'; id: string }

// --- Search fly target ---
export interface FlyTarget {
  lat: number
  lng: number
  zoom: number
}

// --- Historical Journey Modules ---
export interface HistoricalModule {
  id: string
  title: string
  description: string
  emoji: string
  eventIds: string[]    // ordered event IDs forming the journey
}

export interface ModuleProgress {
  moduleId: string
  currentStep: number   // 0-indexed
}

// --- AI Insight ---
export interface AIInsight {
  query: string
  content: string
  status: 'idle' | 'loading' | 'streaming' | 'done' | 'error'
  error?: string
}

// --- App State ---
export interface AppState {
  currentYear: number
  selectedDecades: number[]
  selectedRegions: RegionId[]
  selectedNations: string[]
  selectedSubdivisions: string[]
  selectedCities: string[]
  selectedLocation: SelectedLocation | null
  globeAltitude: number
  activeTab: CategoryTab
  searchQuery: string
  isSearchOpen: boolean
  searchResults: HistoricalEvent[]
  pinnedEvent: HistoricalEvent | null
  activeModule: ModuleProgress | null
  selectedEra: string | null
  searchFlyTarget: FlyTarget | null
  aiInsight: AIInsight
}

export type AppAction =
  | { type: 'SET_YEAR'; payload: number }
  | { type: 'TOGGLE_DECADE'; payload: number }
  | { type: 'TOGGLE_REGION'; payload: RegionId }
  | { type: 'TOGGLE_NATION'; payload: string }
  | { type: 'TOGGLE_SUBDIVISION'; payload: string }
  | { type: 'TOGGLE_CITY'; payload: string }
  | { type: 'SELECT_LOCATION'; payload: SelectedLocation | null }
  | { type: 'SET_ALTITUDE'; payload: number }
  | { type: 'SET_TAB'; payload: CategoryTab }
  | { type: 'SET_SEARCH'; payload: string }
  | { type: 'SET_SEARCH_OPEN'; payload: boolean }
  | { type: 'SET_SEARCH_RESULTS'; payload: HistoricalEvent[] }
  | { type: 'PIN_EVENT'; payload: HistoricalEvent | null }
  | { type: 'EXECUTE_SEARCH'; payload: { year?: number; lat?: number; lng?: number; zoom?: number } }
  | { type: 'CLEAR_FLY_TARGET' }
  | { type: 'AI_INSIGHT_START'; payload: string }
  | { type: 'AI_INSIGHT_CHUNK'; payload: string }
  | { type: 'AI_INSIGHT_DONE' }
  | { type: 'AI_INSIGHT_ERROR'; payload: string }
  | { type: 'START_MODULE'; payload: { moduleId: string } }
  | { type: 'MODULE_STEP'; payload: number }
  | { type: 'EXIT_MODULE' }
  | { type: 'AI_INSIGHT_CLEAR' }
  | { type: 'SET_ERA'; payload: string | null }
