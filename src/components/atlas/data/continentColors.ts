const FALLBACK_COLOR = '#2D2D32'

// --- HSL helpers (used at module scope to compute colors) ---

function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360
  const sn = s / 100
  const ln = l / 100
  const c = (1 - Math.abs(2 * ln - 1)) * sn
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = ln - c / 2
  let r = 0, g = 0, b = 0
  if (h < 60)       { r = c; g = x }
  else if (h < 120) { r = x; g = c }
  else if (h < 180) { g = c; b = x }
  else if (h < 240) { g = x; b = c }
  else if (h < 300) { r = x; b = c }
  else              { r = c; b = x }
  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

// Shortest-path hue interpolation (handles wrapping, e.g. 350° → 25°)
function lerpHue(a: number, b: number, t: number): number {
  let diff = b - a
  if (diff > 180) diff -= 360
  if (diff < -180) diff += 360
  return ((a + diff * t) % 360 + 360) % 360
}

// --- Contrast helper (adaptive lighten / darken) ---

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ]
}

function luminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b
}

// Shift a hex color lighter or darker to contrast against itself as a background.
export function getContrastColor(hex: string, amount = 0.45): string {
  const [r, g, b] = hexToRgb(hex)
  const lum = luminance(r, g, b)
  let nr: number, ng: number, nb: number
  if (lum > 140) {
    nr = Math.round(r * (1 - amount))
    ng = Math.round(g * (1 - amount))
    nb = Math.round(b * (1 - amount))
  } else {
    nr = Math.round(r + (255 - r) * amount)
    ng = Math.round(g + (255 - g) * amount)
    nb = Math.round(b + (255 - b) * amount)
  }
  const toHex2 = (v: number) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')
  return `#${toHex2(nr)}${toHex2(ng)}${toHex2(nb)}`
}

// --- Continent gradient definitions ---

interface Gradient {
  hStart: number; hEnd: number
  sStart: number; sEnd: number
  lStart: number; lEnd: number
  curve?: number  // power-curve exponent applied to t (< 1 = front-loaded, default 1 = linear)
}

const GRADIENTS: Record<string, Gradient> = {
  northAmerica: { hStart: 350, hEnd: 348, sStart: 55, sEnd: 52, lStart: 82, lEnd: 34, curve: 0.15 },
  southAmerica: { hStart: 8,   hEnd: 28,  sStart: 58, sEnd: 70, lStart: 50, lEnd: 38 },
  europe:       { hStart: 50,  hEnd: 38,  sStart: 65, sEnd: 60, lStart: 72, lEnd: 30 },
  africa:       { hStart: 105, hEnd: 150, sStart: 55, sEnd: 48, lStart: 68, lEnd: 22 },
  asia:         { hStart: 248, hEnd: 270, sStart: 55, sEnd: 45, lStart: 82, lEnd: 35 },
  oceania:      { hStart: 318, hEnd: 332, sStart: 60, sEnd: 48, lStart: 76, lEnd: 40 },
}

// --- Country lists in geographic order (north → south / regional sweep) ---

const CONTINENT_COUNTRIES: Record<string, string[]> = {
  northAmerica: [
    'CAN', 'USA', 'MEX',
    'BHS', 'CUB', 'JAM', 'HTI', 'DOM', 'PRI', 'ATG', 'KNA', 'DMA', 'LCA', 'BRB', 'VCT', 'GRD', 'TTO',
    'GTM', 'BLZ', 'SLV', 'HND', 'NIC', 'CRI', 'PAN',
  ],
  southAmerica: [
    'COL', 'VEN', 'GUY', 'SUR', 'GUF',
    'ECU', 'PER', 'BRA', 'BOL', 'PRY', 'URY', 'CHL', 'ARG', 'FLK',
  ],
  europe: [
    'ISL', 'NOR', 'SWE', 'FIN',
    'EST', 'LVA', 'LTU', 'DNK', 'GBR', 'IRL',
    'NLD', 'BEL', 'LUX', 'DEU', 'POL',
    'FRA', 'CHE', 'AUT', 'CZE', 'SVK', 'LIE',
    'HUN', 'SVN', 'HRV', 'BIH', 'SRB', 'MNE', 'KOS',
    'MDA', 'UKR', 'BLR', 'RUS',
    'AND', 'ESP', 'PRT', 'MCO', 'ITA', 'SMR', 'VAT', 'MLT',
    'ROU', 'BGR', 'MKD', 'ALB', 'GRC',
    'CYP', 'CYN', 'ATF',
    'GEO', 'ARM', 'AZE',
  ],
  africa: [
    'MAR', 'DZA', 'TUN', 'LBY', 'EGY', 'ESH',
    'MRT', 'SEN', 'GMB', 'MLI', 'BFA', 'NER', 'TCD', 'SDN',
    'CPV', 'GNB', 'GIN', 'SLE', 'LBR', 'CIV', 'GHA', 'TGO', 'BEN', 'NGA',
    'SSD', 'ERI', 'DJI', 'ETH', 'SOM', 'SOL',
    'CMR', 'CAF', 'GNQ', 'GAB', 'COG', 'COD',
    'UGA', 'KEN', 'RWA', 'BDI',
    'TZA', 'MWI', 'MOZ', 'ZMB', 'ZWE',
    'AGO', 'NAM', 'BWA', 'SWZ', 'LSO', 'ZAF',
    'STP', 'COM', 'MDG', 'MUS', 'SYC',
  ],
  asia: [
    'KAZ', 'MNG',
    'KGZ', 'TKM', 'UZB', 'TJK',
    'TUR', 'SYR', 'IRQ', 'IRN', 'AFG',
    'LBN', 'ISR', 'PSE', 'JOR',
    'KWT', 'BHR', 'QAT', 'ARE', 'SAU', 'OMN', 'YEM',
    'PAK', 'IND', 'NPL', 'BTN', 'BGD', 'LKA', 'MDV',
    'CHN', 'PRK', 'KOR', 'JPN', 'TWN',
    'MMR', 'LAO', 'VNM', 'THA', 'KHM', 'PHL',
    'MYS', 'SGP', 'BRN', 'IDN', 'TLS',
  ],
  oceania: [
    'PLW', 'FSM', 'MHL', 'NRU', 'KIR',
    'PNG', 'SLB', 'TUV', 'WSM', 'TON', 'VUT', 'FJI',
    'NCL', 'AUS', 'NZL',
  ],
}

// --- Border country blending (hue shift toward neighboring continent) ---

const BORDER_BLENDS: Record<string, { toward: string; amount: number }> = {
  EGY: { toward: 'asia',    amount: 0.25 },
  MAR: { toward: 'europe',  amount: 0.20 },
  IDN: { toward: 'oceania', amount: 0.25 },
  TLS: { toward: 'oceania', amount: 0.30 },
  PNG: { toward: 'asia',    amount: 0.20 },
}

// --- Full color overrides (H, S, L) for countries outside their continent palette ---

const COLOR_OVERRIDES: Record<string, { h: number; s: number; l: number }> = {
  TUR: { h: 48, s: 62, l: 46 },   // warm amber
  GEO: { h: 45, s: 60, l: 40 },   // medium amber
  ARM: { h: 42, s: 58, l: 35 },   // deeper amber
  AZE: { h: 39, s: 56, l: 30 },   // darkest amber
  RUS: { h: 353, s: 28, l: 32 },  // purple-brown (#673A3F)
}

// --- Explicit lightness overrides for key countries ---

const LIGHTNESS_OVERRIDES: Record<string, number> = {
  USA: 60,
  MEX: 50,
}

// --- Compute unique color per country at module scope ---

const COUNTRY_COLORS: Record<string, string> = {}

for (const [continent, countries] of Object.entries(CONTINENT_COUNTRIES)) {
  const g = GRADIENTS[continent]
  const n = countries.length
  for (let i = 0; i < n; i++) {
    const iso = countries[i]

    // Full color override bypasses gradient entirely
    const co = COLOR_OVERRIDES[iso]
    if (co) {
      COUNTRY_COLORS[iso] = hslToHex(co.h, co.s, co.l)
      continue
    }

    const rawT = n === 1 ? 0.5 : i / (n - 1)
    const t = g.curve && rawT > 0 ? Math.pow(rawT, g.curve) : rawT
    let h = lerpHue(g.hStart, g.hEnd, t)
    const s = lerp(g.sStart, g.sEnd, t)
    const l = LIGHTNESS_OVERRIDES[iso] ?? lerp(g.lStart, g.lEnd, t)

    // Shift hue toward neighboring continent for border countries
    const blend = BORDER_BLENDS[iso]
    if (blend) {
      const neighborG = GRADIENTS[blend.toward]
      const neighborMidH = lerpHue(neighborG.hStart, neighborG.hEnd, 0.5)
      h = lerpHue(h, neighborMidH, blend.amount)
    }

    COUNTRY_COLORS[iso] = hslToHex(h, s, l)
  }
}

export function getCountryColor(iso: string): string {
  return COUNTRY_COLORS[iso] ?? FALLBACK_COLOR
}
