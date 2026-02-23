import { useState, useRef, useEffect } from 'react'
import { Route, X } from 'lucide-react'
import { useAppState, useAppDispatch } from '@/components/atlas/context/AppContext'
import { HISTORICAL_MODULES, CITIES, MUSIC_HISTORY } from '@/components/atlas/data'

export function ModulePicker() {
  const { activeModule } = useAppState()
  const dispatch = useAppDispatch()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const startModule = (moduleId: string) => {
    const mod = HISTORICAL_MODULES.find(m => m.id === moduleId)
    if (!mod) return
    dispatch({ type: 'START_MODULE', payload: { moduleId } })

    // Navigate to the first event
    const firstEvent = MUSIC_HISTORY.find(e => e.id === mod.eventIds[0])
    if (firstEvent) {
      dispatch({ type: 'PIN_EVENT', payload: firstEvent })
      dispatch({ type: 'EXECUTE_SEARCH', payload: { lat: firstEvent.location.lat, lng: firstEvent.location.lng, zoom: 10 } })
      const city = CITIES.find(c => c.name.toLowerCase() === firstEvent.location.city.toLowerCase())
      if (city) dispatch({ type: 'SELECT_LOCATION', payload: { type: 'city', id: city.id } })
    }
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
          activeModule
            ? 'bg-teal-600/30 text-teal-300 border border-teal-500/30'
            : 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700/80 border border-zinc-700/50'
        }`}
      >
        <Route className="w-3.5 h-3.5" />
        Journeys
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/50 rounded-xl shadow-2xl z-50">
          <div className="p-3 border-b border-zinc-700/50 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Historical Journeys</h3>
            <button onClick={() => setOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="p-2 space-y-1">
            {HISTORICAL_MODULES.map((mod) => (
              <button
                key={mod.id}
                onClick={() => startModule(mod.id)}
                className={`w-full text-left p-2.5 rounded-lg transition-colors ${
                  activeModule?.moduleId === mod.id
                    ? 'bg-teal-600/20 border border-teal-500/30'
                    : 'hover:bg-zinc-800/70 border border-transparent'
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-base leading-none mt-0.5">{mod.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-semibold text-white">{mod.title}</h4>
                    <p className="text-[10px] text-zinc-400 mt-0.5 leading-snug">{mod.description}</p>
                    <p className="text-[10px] text-zinc-500 mt-1">{mod.eventIds.length} stops</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
