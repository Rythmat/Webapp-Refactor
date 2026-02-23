import { X, MapPin, Calendar, Sparkles, Loader2 } from 'lucide-react'
import { useAppState, useAppDispatch } from '@/components/atlas/context/AppContext'
import { useAIAnalysis } from '@/components/atlas/hooks/useAIAnalysis'
import { useMusicSearch } from '@/components/atlas/hooks/useMusicSearch'

export function SearchResults() {
  const { searchResults, searchQuery, pinnedEvent, aiInsight } = useAppState()
  const dispatch = useAppDispatch()
  const { analyze } = useAIAnalysis()
  const search = useMusicSearch()

  if (searchResults.length === 0) return null

  const close = () => {
    dispatch({ type: 'SET_SEARCH_RESULTS', payload: [] })
  }

  const handleDeepDive = () => {
    const { parsed } = search(searchQuery)
    analyze(searchQuery, parsed, searchResults)
  }

  const aiActive = aiInsight.status !== 'idle'

  return (
    <div className="absolute left-4 top-14 z-[1000] w-96 max-h-[calc(100%-6rem)] bg-zinc-900/85 backdrop-blur-xl border border-zinc-700/50 rounded-xl shadow-2xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/50 shrink-0">
        <p className="text-sm text-zinc-300">
          <span className="text-white font-medium">{searchResults.length}</span> result{searchResults.length !== 1 && 's'} for{' '}
          <span className="text-teal-400">"{searchQuery}"</span>
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDeepDive}
            disabled={aiActive}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              aiActive
                ? 'bg-teal-600/20 text-teal-400 cursor-default'
                : 'bg-teal-600/20 hover:bg-teal-600/40 text-teal-300'
            }`}
          >
            {aiActive ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Sparkles className="w-3 h-3" />
            )}
            Deep Dive
          </button>
          <button onClick={close} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Results list */}
      <div className="overflow-y-auto p-2 space-y-2">
        {searchResults.map((event) => {
          const isPinned = pinnedEvent?.id === event.id
          return (
            <button
              key={event.id}
              onClick={() => {
                if (isPinned) {
                  dispatch({ type: 'PIN_EVENT', payload: null })
                } else {
                  dispatch({ type: 'PIN_EVENT', payload: event })
                  dispatch({
                    type: 'EXECUTE_SEARCH',
                    payload: {
                      lat: event.location.lat,
                      lng: event.location.lng,
                      zoom: 8,
                      year: event.year,
                    },
                  })
                }
              }}
              className={`w-full text-left p-3 rounded-lg transition-colors ${
                isPinned
                  ? 'bg-teal-600/20 border border-teal-500/40'
                  : 'bg-zinc-800/40 hover:bg-zinc-800/70 border border-transparent'
              }`}
            >
              <h4 className="text-sm font-semibold text-white leading-snug">{event.title}</h4>

              <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-400">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> {event.year}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {event.location.city}, {event.location.country}
                </span>
              </div>

              <div className="flex flex-wrap gap-1 mt-2">
                {event.genre.map((g) => (
                  <span key={g} className="px-1.5 py-0.5 bg-teal-600/30 text-teal-300 text-[10px] rounded-full">
                    {g}
                  </span>
                ))}
              </div>

              <p className={`text-xs text-zinc-400 mt-2 ${isPinned ? '' : 'line-clamp-2'}`}>{event.description}</p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
