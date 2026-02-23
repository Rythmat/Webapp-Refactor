import { useState, useRef, useEffect } from 'react'
import { Clock, X } from 'lucide-react'
import { useAppState, useAppDispatch } from '@/components/atlas/context/AppContext'
import { MUSICAL_ERAS } from '@/components/atlas/data'

export function EraPicker() {
  const { selectedEra } = useAppState()
  const dispatch = useAppDispatch()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const activeEra = selectedEra ? MUSICAL_ERAS.find((e) => e.id === selectedEra) : null

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const selectEra = (eraId: string | null) => {
    dispatch({ type: 'SET_ERA', payload: eraId })
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
          activeEra
            ? `${activeEra.activeBg} ${activeEra.activeText} ${activeEra.activeBorder}`
            : 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700/80 border border-zinc-700/50'
        }`}
      >
        <Clock className="w-3.5 h-3.5" />
        {activeEra ? activeEra.label : 'Era'}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 w-56 bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/50 rounded-xl shadow-2xl z-50">
          <div className="p-3 border-b border-zinc-700/50 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Musical Era</h3>
            <button onClick={() => setOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="p-2 space-y-0.5">
            <button
              onClick={() => selectEra(null)}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                !selectedEra
                  ? 'bg-white/10 text-white'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/70'
              }`}
            >
              All Eras
            </button>
            {MUSICAL_ERAS.map((era) => (
              <button
                key={era.id}
                onClick={() => selectEra(era.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  selectedEra === era.id
                    ? `${era.activeBg} ${era.activeText}`
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/70'
                }`}
              >
                <span>{era.label}</span>
                <span className="text-[10px] text-zinc-500 ml-1.5">
                  {era.yearStart}–{era.yearEnd}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
