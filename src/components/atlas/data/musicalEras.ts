export interface MusicalEra {
  id: string
  label: string
  yearStart: number
  yearEnd: number
  activeBg: string
  activeText: string
  activeBorder: string
}

export const MUSICAL_ERAS: MusicalEra[] = [
  { id: 'ancient',            label: 'Ancient & Medieval',    yearStart: 500,  yearEnd: 1399, activeBg: 'bg-amber-500/20',  activeText: 'text-amber-300',  activeBorder: 'border-amber-500/40' },
  { id: 'renaissance',        label: 'Renaissance & Baroque', yearStart: 1400, yearEnd: 1749, activeBg: 'bg-orange-500/20', activeText: 'text-orange-300', activeBorder: 'border-orange-500/40' },
  { id: 'classical-romantic',  label: 'Classical & Romantic',  yearStart: 1750, yearEnd: 1899, activeBg: 'bg-rose-500/20',   activeText: 'text-rose-300',   activeBorder: 'border-rose-500/40' },
  { id: 'early-modern',       label: 'Early Modern',          yearStart: 1900, yearEnd: 1945, activeBg: 'bg-violet-500/20', activeText: 'text-violet-300', activeBorder: 'border-violet-500/40' },
  { id: 'postwar',            label: 'Postwar & Revolution',  yearStart: 1946, yearEnd: 1979, activeBg: 'bg-blue-500/20',   activeText: 'text-blue-300',   activeBorder: 'border-blue-500/40' },
  { id: 'electronic-hiphop',  label: 'Electronic & Hip Hop',  yearStart: 1980, yearEnd: 1999, activeBg: 'bg-cyan-500/20',   activeText: 'text-cyan-300',   activeBorder: 'border-cyan-500/40' },
  { id: 'global-digital',     label: 'Global Digital',        yearStart: 2000, yearEnd: 2025, activeBg: 'bg-teal-500/20',   activeText: 'text-teal-300',   activeBorder: 'border-teal-500/40' },
]
