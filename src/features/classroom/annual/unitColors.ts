/**
 * Per-unit color palette for the Annual Plan calendar bars.
 *
 * Keyed by the slug prefix that lives inside every runtime unit id
 * (`unit-<slug>-<rand>`) — the same pattern `AnnualPlanPage.suggestedCountFor`
 * already uses to look template stubs back up at render time. No schema
 * migration required.
 *
 * Tailwind classes follow the dark-theme translucent-fill + colored-border
 * pattern already established across the classroom UI (see the emerald live
 * pill and the amber preview banner on ClassroomHomePage). Matches the
 * reference calendar's Kanban-bar aesthetic without clashing on `#141416`.
 */

export interface UnitColor {
  /** Tailwind background class (translucent). */
  bg: string;
  /** Tailwind text class (light tint). */
  text: string;
  /** Tailwind border class. */
  border: string;
  /** Raw hex for anywhere we need an inline color. */
  hex: string;
}

export const UNIT_COLORS: Record<string, UnitColor> = {
  'aug-welcome': {
    bg: 'bg-orange-500/20',
    text: 'text-orange-100',
    border: 'border-orange-400/40',
    hex: '#f97316',
  },
  'sept-hhm': {
    bg: 'bg-pink-500/20',
    text: 'text-pink-100',
    border: 'border-pink-400/40',
    hex: '#ec4899',
  },
  'oct-indigenous-ddlm': {
    bg: 'bg-purple-500/20',
    text: 'text-purple-100',
    border: 'border-purple-400/40',
    hex: '#a855f7',
  },
  'nov-compassion': {
    bg: 'bg-teal-500/20',
    text: 'text-teal-100',
    border: 'border-teal-400/40',
    hex: '#14b8a6',
  },
  'dec-reflection': {
    bg: 'bg-blue-500/20',
    text: 'text-blue-100',
    border: 'border-blue-400/40',
    hex: '#3b82f6',
  },
  'jan-identity': {
    bg: 'bg-amber-500/20',
    text: 'text-amber-100',
    border: 'border-amber-400/40',
    hex: '#eab308',
  },
  'feb-black-history': {
    bg: 'bg-red-500/20',
    text: 'text-red-100',
    border: 'border-red-400/40',
    hex: '#ef4444',
  },
  'mar-womens-history': {
    bg: 'bg-rose-500/20',
    text: 'text-rose-100',
    border: 'border-rose-400/40',
    hex: '#f43f5e',
  },
  'apr-protest': {
    bg: 'bg-emerald-500/20',
    text: 'text-emerald-100',
    border: 'border-emerald-400/40',
    hex: '#22c55e',
  },
  'may-mothers-day': {
    bg: 'bg-violet-500/20',
    text: 'text-violet-100',
    border: 'border-violet-400/40',
    hex: '#8b5cf6',
  },
  // Genre units — muted tones distinct from heritage bars
  'sept-latin-music': {
    bg: 'bg-fuchsia-500/20',
    text: 'text-fuchsia-100',
    border: 'border-fuchsia-400/40',
    hex: '#d946ef',
  },
  'oct-blues-roots': {
    bg: 'bg-indigo-500/20',
    text: 'text-indigo-100',
    border: 'border-indigo-400/40',
    hex: '#6366f1',
  },
  'nov-jazz-foundations': {
    bg: 'bg-yellow-500/20',
    text: 'text-yellow-100',
    border: 'border-yellow-400/40',
    hex: '#eab308',
  },
  'dec-gospel-spirituals': {
    bg: 'bg-cyan-500/20',
    text: 'text-cyan-100',
    border: 'border-cyan-400/40',
    hex: '#06b6d4',
  },
  'jan-hiphop-culture': {
    bg: 'bg-orange-500/20',
    text: 'text-orange-100',
    border: 'border-orange-400/40',
    hex: '#f97316',
  },
  'feb-rnb-soul-funk': {
    bg: 'bg-purple-500/20',
    text: 'text-purple-100',
    border: 'border-purple-400/40',
    hex: '#a855f7',
  },
  'mar-rock-to-punk': {
    bg: 'bg-red-500/20',
    text: 'text-red-100',
    border: 'border-red-400/40',
    hex: '#ef4444',
  },
  'apr-reggae-afrobeat': {
    bg: 'bg-lime-500/20',
    text: 'text-lime-100',
    border: 'border-lime-400/40',
    hex: '#84cc16',
  },
  'may-country-americana': {
    bg: 'bg-amber-500/20',
    text: 'text-amber-100',
    border: 'border-amber-400/40',
    hex: '#f59e0b',
  },
  'may-electronic-music': {
    bg: 'bg-sky-500/20',
    text: 'text-sky-100',
    border: 'border-sky-400/40',
    hex: '#0ea5e9',
  },
  // Location units — darker/richer tones so they stand apart from genres.
  'oct-new-orleans': {
    bg: 'bg-emerald-600/25',
    text: 'text-emerald-100',
    border: 'border-emerald-500/45',
    hex: '#059669',
  },
  'nov-memphis': {
    bg: 'bg-rose-600/25',
    text: 'text-rose-100',
    border: 'border-rose-500/45',
    hex: '#e11d48',
  },
  'feb-detroit-motown': {
    bg: 'bg-slate-500/25',
    text: 'text-slate-100',
    border: 'border-slate-400/45',
    hex: '#64748b',
  },
  'mar-kingston': {
    bg: 'bg-green-600/25',
    text: 'text-green-100',
    border: 'border-green-500/45',
    hex: '#16a34a',
  },
};

const FALLBACK: UnitColor = {
  bg: 'bg-white/[0.04]',
  text: 'text-white/85',
  border: 'border-white/15',
  hex: '#ffffff',
};

export const colorForUnitId = (unitId: string): UnitColor => {
  for (const [slug, color] of Object.entries(UNIT_COLORS)) {
    if (unitId.startsWith(`unit-${slug}-`)) return color;
  }
  return FALLBACK;
};
