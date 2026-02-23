import { Search } from 'lucide-react'
import { useAppState, useAppDispatch } from '@/components/atlas/context/AppContext'
import { useMusicSearch } from '@/components/atlas/hooks/useMusicSearch'

export function TopBar() {
  const { searchQuery } = useAppState()
  const dispatch = useAppDispatch()
  const search = useMusicSearch()

  const handleSearchSubmit = () => {
    if (!searchQuery.trim()) return
    const { results, parsed } = search(searchQuery)
    dispatch({ type: 'SET_SEARCH_RESULTS', payload: results })
    if (parsed.city) {
      dispatch({
        type: 'EXECUTE_SEARCH',
        payload: { lat: parsed.city.lat, lng: parsed.city.lng, zoom: 8, year: parsed.year },
      })
    } else if (parsed.year != null) {
      dispatch({ type: 'SET_YEAR', payload: parsed.year })
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearchSubmit()
  }

  return (
    <div className="absolute top-0 left-0 right-0 z-[1000] px-4 pt-4 pb-2 flex items-start pointer-events-none">
      <div className="flex items-start gap-4 pointer-events-auto">
        <h1 className="text-2xl font-semibold whitespace-nowrap pt-1">Atlas</h1>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search (e.g. Rock LA 1960s)"
              value={searchQuery}
              onChange={(e) => dispatch({ type: 'SET_SEARCH', payload: e.target.value })}
              onKeyDown={handleKeyDown}
              className="pl-8 pr-3 py-1.5 bg-zinc-900/80 backdrop-blur-xl border border-zinc-700/50 rounded-lg text-sm text-white placeholder-zinc-500 w-64 focus:outline-none focus:border-zinc-500 transition-colors"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
