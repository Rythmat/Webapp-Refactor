import { useAppState, useAppDispatch } from '@/components/atlas/context/AppContext'

const MIN_YEAR = 1900
const MAX_YEAR = 2025
const TICKS = [1900, 1925, 1950, 1975, 2000, 2025]

export function Timeline() {
  const { currentYear } = useAppState()
  const dispatch = useAppDispatch()

  const pct = ((currentYear - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100

  return (
    <div className="h-14 bg-zinc-900/60 backdrop-blur-xl border-t border-zinc-800/50 px-6 flex items-center gap-4 shrink-0">
      {/* Year display */}
      <span className="text-sm font-medium text-teal-400 tabular-nums w-10">{currentYear}</span>

      {/* Slider area */}
      <div className="relative flex-1">
        {/* Tick labels */}
        <div className="flex justify-between text-[10px] text-zinc-500 mb-1 px-0.5">
          {TICKS.map((year) => (
            <span key={year}>{year}</span>
          ))}
        </div>

        {/* Track */}
        <div className="relative h-1 bg-zinc-700 rounded-full">
          {/* Filled portion */}
          <div
            className="absolute h-full bg-teal-500 rounded-full transition-[width] duration-75"
            style={{ width: `${pct}%` }}
          />
          {/* Thumb indicator */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-teal-400 rounded-full border-2 border-zinc-900 shadow-md transition-[left] duration-75"
            style={{ left: `calc(${pct}% - 6px)` }}
          />
        </div>

        {/* Invisible native range input */}
        <input
          type="range"
          min={MIN_YEAR}
          max={MAX_YEAR}
          value={currentYear}
          onChange={(e) => dispatch({ type: 'SET_YEAR', payload: Number(e.target.value) })}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
          style={{ top: '14px', height: '12px' }}
        />
      </div>
    </div>
  )
}
