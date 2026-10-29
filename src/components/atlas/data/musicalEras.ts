/**
 * Each era's colour: the timeline's bands, the era rail and the event stage
 * tint by it, so colour on the Globe means "when". Tailwind's 500 shades of
 * the classes below; theme/tokens.ts makes them `--atlas-era-<id>` tokens.
 */
export const ERA_HEX = {
  ancient: '#f59e0b',
  renaissance: '#f97316',
  'classical-romantic': '#f43f5e',
  'early-modern': '#8b5cf6',
  postwar: '#3b82f6',
  'electronic-hiphop': '#06b6d4',
  'global-digital': '#14b8a6',
} as const;

export type EraId = keyof typeof ERA_HEX;

export interface MusicalEra {
  id: EraId;
  label: string;
  yearStart: number;
  yearEnd: number;
  /** The era's colour, from ERA_HEX. */
  color: string;
  activeBg: string;
  activeText: string;
  activeBorder: string;
}

export const MUSICAL_ERAS: MusicalEra[] = [
  {
    id: 'ancient',
    color: ERA_HEX['ancient'],
    label: 'Ancient & Medieval',
    yearStart: 500,
    yearEnd: 1399,
    activeBg: 'bg-amber-500/20',
    activeText: 'text-amber-300',
    activeBorder: 'border-amber-500/40',
  },
  {
    id: 'renaissance',
    color: ERA_HEX['renaissance'],
    label: 'Renaissance & Baroque',
    yearStart: 1400,
    yearEnd: 1749,
    activeBg: 'bg-orange-500/20',
    activeText: 'text-orange-300',
    activeBorder: 'border-orange-500/40',
  },
  {
    id: 'classical-romantic',
    color: ERA_HEX['classical-romantic'],
    label: 'Classical & Romantic',
    yearStart: 1750,
    yearEnd: 1899,
    activeBg: 'bg-rose-500/20',
    activeText: 'text-rose-300',
    activeBorder: 'border-rose-500/40',
  },
  {
    id: 'early-modern',
    color: ERA_HEX['early-modern'],
    label: 'Early Modern',
    yearStart: 1900,
    yearEnd: 1945,
    activeBg: 'bg-violet-500/20',
    activeText: 'text-violet-300',
    activeBorder: 'border-violet-500/40',
  },
  {
    id: 'postwar',
    color: ERA_HEX['postwar'],
    label: 'Postwar & Revolution',
    yearStart: 1946,
    yearEnd: 1979,
    activeBg: 'bg-blue-500/20',
    activeText: 'text-blue-300',
    activeBorder: 'border-blue-500/40',
  },
  {
    id: 'electronic-hiphop',
    color: ERA_HEX['electronic-hiphop'],
    label: 'Electronic & Hip Hop',
    yearStart: 1980,
    yearEnd: 1999,
    activeBg: 'bg-cyan-500/20',
    activeText: 'text-cyan-300',
    activeBorder: 'border-cyan-500/40',
  },
  {
    id: 'global-digital',
    color: ERA_HEX['global-digital'],
    label: 'Global Digital',
    yearStart: 2000,
    // Open-ended on purpose: the time window filters inclusively, so a hard
    // 2025 meant the first event dated 2026 would belong to no era at all and
    // vanish from every era filter.
    yearEnd: 2100,
    activeBg: 'bg-teal-500/20',
    activeText: 'text-teal-300',
    activeBorder: 'border-teal-500/40',
  },
];

/**
 * "1900–1945", or "2000–present" for the era still running.
 *
 * The current era's `yearEnd` is deliberately far in the future so that nothing
 * ever falls outside every era; that sentinel must not reach the screen.
 */
export const eraRangeLabel = (era: MusicalEra): string =>
  era.yearEnd >= new Date().getFullYear()
    ? `${era.yearStart}–present`
    : `${era.yearStart}–${era.yearEnd}`;

/** The era a year falls in; years before the first era count as its. */
export function eraOfYear(year: number): MusicalEra {
  return (
    MUSICAL_ERAS.find((e) => year >= e.yearStart && year <= e.yearEnd) ??
    (year < MUSICAL_ERAS[0].yearStart ? MUSICAL_ERAS[0] : MUSICAL_ERAS.at(-1)!)
  );
}

/** An era by its id or, ignoring case, its label; undefined for neither. */
export function findEra(idOrLabel: string): MusicalEra | undefined {
  const lower = idOrLabel.trim().toLowerCase();
  return MUSICAL_ERAS.find(
    (e) => e.id === idOrLabel || e.label.toLowerCase() === lower,
  );
}

/**
 * The years an era spans, as a time window: the running era ends this year,
 * not at its far-future sentinel.
 */
export function eraWindow(era: MusicalEra): { from: number; to: number } {
  return {
    from: era.yearStart,
    to: Math.min(era.yearEnd, new Date().getFullYear()),
  };
}
