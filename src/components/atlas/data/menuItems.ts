// Served via jsDelivr (CDN, CORS-friendly, aggressively cached) instead of
// raw.githubusercontent.com, which rate-limits and returns non-JSON error
// bodies under load — the source of "Failed to load globe: Unexpected ... JSON".
export const GEOJSON_URLS = {
  countries:
    'https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/ne_110m_admin_0_countries.geojson',
  admin1:
    'https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/ne_50m_admin_1_states_provinces.geojson',
} as const;
