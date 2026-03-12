import { Search } from 'lucide-react';
import {
  useAppState,
  useAppDispatch,
} from '@/components/atlas/context/AppContext';
import { useMusicSearch } from '@/components/atlas/hooks/useMusicSearch';

export function TopBar() {
  const { searchQuery } = useAppState();
  const dispatch = useAppDispatch();
  const search = useMusicSearch();

  const handleSearchSubmit = async () => {
    if (!searchQuery.trim()) return;
    const { results, parsed } = await search(searchQuery);
    dispatch({ type: 'SET_SEARCH_RESULTS', payload: results });
    if (parsed.city) {
      dispatch({
        type: 'EXECUTE_SEARCH',
        payload: {
          lat: parsed.city.lat,
          lng: parsed.city.lng,
          zoom: 8,
          year: parsed.year,
        },
      });
    } else if (parsed.year != null) {
      dispatch({ type: 'SET_YEAR', payload: parsed.year });
    }
  };

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') await handleSearchSubmit();
  };

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-40 flex items-start px-4 pb-2 pt-4">
      <div className="pointer-events-auto">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
          <input
            className="w-64 rounded-lg border border-zinc-700/50 bg-zinc-900/80 py-1.5 pl-8 pr-3 text-sm text-white backdrop-blur-xl transition-colors placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none"
            placeholder="Search (e.g. Rock LA 1960s)"
            type="text"
            value={searchQuery}
            onChange={(e) =>
              dispatch({ type: 'SET_SEARCH', payload: e.target.value })
            }
            onKeyDown={handleKeyDown}
          />
        </div>
      </div>
    </div>
  );
}
