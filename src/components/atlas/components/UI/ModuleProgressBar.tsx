import { useMemo } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useAppState, useAppDispatch } from '@/components/atlas/context/AppContext'
import { HISTORICAL_MODULES, CITIES, MUSIC_HISTORY } from '@/components/atlas/data'
import type { HistoricalEvent } from '@/components/atlas/types'

export function ModuleProgressBar() {
  const { activeModule } = useAppState()
  const dispatch = useAppDispatch()

  const mod = useMemo(
    () => activeModule ? HISTORICAL_MODULES.find(m => m.id === activeModule.moduleId) : null,
    [activeModule]
  )

  const events = useMemo(() => {
    if (!mod) return []
    return mod.eventIds
      .map(id => MUSIC_HISTORY.find(e => e.id === id))
      .filter((e): e is HistoricalEvent => !!e)
  }, [mod])

  if (!activeModule || !mod || events.length === 0) return null

  const { currentStep } = activeModule
  const total = events.length
  const current = events[currentStep]
  if (!current) return null

  const navigateToStep = (step: number) => {
    if (step < 0 || step >= total) return
    const event = events[step]
    if (!event) return
    dispatch({ type: 'MODULE_STEP', payload: step })
    dispatch({ type: 'PIN_EVENT', payload: event })
    dispatch({ type: 'EXECUTE_SEARCH', payload: { lat: event.location.lat, lng: event.location.lng, zoom: 10 } })
    const city = CITIES.find(c => c.name.toLowerCase() === event.location.city.toLowerCase())
    if (city) dispatch({ type: 'SELECT_LOCATION', payload: { type: 'city', id: city.id } })
  }

  const exit = () => dispatch({ type: 'EXIT_MODULE' })

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] w-[min(640px,calc(100%-2rem))]">
      <div className="bg-zinc-900/95 backdrop-blur-xl border border-teal-500/30 rounded-xl shadow-2xl px-4 py-3">
        {/* Header row: module title + step info + exit */}
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm leading-none">{mod.emoji}</span>
            <span className="text-[10px] text-teal-400/70 font-medium truncate">{mod.title}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] text-zinc-500">
              Step {currentStep + 1} of {total}
            </span>
            <button
              onClick={exit}
              className="text-zinc-500 hover:text-white transition-colors p-0.5"
              title="Exit journey"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Current event info */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="min-w-0">
            <h4 className="text-xs font-semibold text-white truncate">{current.title}</h4>
            <p className="text-[10px] text-zinc-400 mt-0.5">
              {current.location.city}, {current.location.country} &middot; {current.year}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => navigateToStep(currentStep - 1)}
              disabled={currentStep === 0}
              className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-700/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigateToStep(currentStep + 1)}
              disabled={currentStep === total - 1}
              className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-700/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dot progress bar */}
        <div className="flex items-center justify-center gap-1.5">
          {events.map((_, i) => (
            <button
              key={i}
              onClick={() => navigateToStep(i)}
              className={`rounded-full transition-all ${
                i === currentStep
                  ? 'w-2.5 h-2.5 bg-teal-400 shadow-[0_0_6px_rgba(45,212,191,0.5)]'
                  : i < currentStep
                    ? 'w-2 h-2 bg-teal-600 hover:bg-teal-500'
                    : 'w-2 h-2 bg-zinc-600 hover:bg-zinc-500'
              }`}
              title={events[i]?.title}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
