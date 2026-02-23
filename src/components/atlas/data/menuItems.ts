import type { CategoryTab, MenuItem } from '@/components/atlas/types'

export const SIDEBAR_ITEMS: MenuItem[] = [
  { id: 'home',    label: 'Home',    icon: 'Home' },
  { id: 'learn',   label: 'Learn',   icon: 'BookOpen' },
  { id: 'studio',  label: 'Studio',  icon: 'Music' },
  { id: 'atlas',   label: 'Atlas',   icon: 'Globe' },
  { id: 'library', label: 'Library', icon: 'Library' },
  { id: 'market',  label: 'Market',  icon: 'ShoppingBag' },
  { id: 'connect', label: 'Connect', icon: 'Users' },
]

export const CATEGORY_TABS: CategoryTab[] = [
  'Region',
  'Decade',
  'Genre',
  'Culture',
  'Musicians',
]

export const DECADES = [
  2020, 2010, 2000, 1990, 1980, 1970, 1960, 1950, 1940, 1930, 1920, 1910, 1900,
]

export const GEOJSON_URLS = {
  countries:
    'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson',
  admin1:
    'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_1_states_provinces.geojson',
} as const
