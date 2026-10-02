import { KEY_OF_COLORS } from '@/constants/theme';

/**
 * Recharts styling for the telemetry pages, in the landing's palette: white
 * hairline grids and white/45 axes on #101012, a #141416 tooltip like the
 * landing's dropdown, and series colours drawn from the key-center palette
 * (the only colour the landing uses) rather than stock Tailwind hues.
 */
export const CHART_SERIES = {
  blue: KEY_OF_COLORS.Db,
  green: KEY_OF_COLORS.B,
  amber: KEY_OF_COLORS.D,
  red: KEY_OF_COLORS.C,
  violet: KEY_OF_COLORS.Eb,
} as const;

export const chartGridProps = {
  stroke: 'rgba(255,255,255,0.08)',
  strokeDasharray: '3 3',
} as const;

export const chartAxisProps = {
  stroke: 'rgba(255,255,255,0.12)',
  tick: { fill: 'rgba(255,255,255,0.45)', fontSize: 12 },
  tickLine: false,
} as const;

export const chartTooltipProps = {
  contentStyle: {
    backgroundColor: '#141416',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12,
    boxShadow: '0 24px 60px -12px rgba(0,0,0,0.7)',
  },
  labelStyle: { color: 'rgba(255,255,255,0.55)' },
  itemStyle: { color: '#e8e8f0' },
  cursor: { fill: 'rgba(255,255,255,0.04)', stroke: 'rgba(255,255,255,0.12)' },
} as const;

export const chartLegendProps = {
  wrapperStyle: { color: 'rgba(255,255,255,0.55)', fontSize: 13 },
} as const;
