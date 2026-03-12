import { X, MapPin, Calendar, Sparkles, Loader2 } from 'lucide-react';
import {
  useAppState,
  useAppDispatch,
} from '@/components/atlas/context/AppContext';
import { useAIAnalysis } from '@/components/atlas/hooks/useAIAnalysis';
import { useMusicSearch } from '@/components/atlas/hooks/useMusicSearch';

export function SearchResults() {
  const { searchResults, searchQuery, pinnedEvent, aiInsight } = useAppState();
  const dispatch = useAppDispatch();
  const { analyze } = useAIAnalysis();
  const search = useMusicSearch();

  if (searchResults.length === 0) return null;

  const close = () => {
    dispatch({ type: 'SET_SEARCH_RESULTS', payload: [] });
  };

  const handleDeepDive = async () => {
    const { parsed } = await search(searchQuery);
    analyze(searchQuery, parsed, searchResults);
  };

  const aiActive = aiInsight.status !== 'idle';

  return (
    <div className="absolute left-4 top-14 z-[1000] flex max-h-[calc(100%-6rem)] w-96 flex-col rounded-xl border border-zinc-700/50 bg-zinc-900/85 shadow-2xl backdrop-blur-xl">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-zinc-800/50 px-4 py-3">
        <p className="text-sm text-zinc-300">
          <span className="font-medium text-white">{searchResults.length}</span>{' '}
          result{searchResults.length !== 1 && 's'} for{' '}
          <span className="text-teal-400">"{searchQuery}"</span>
        </p>
        <div className="flex items-center gap-2">
          <button
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
              aiActive
                ? 'cursor-default bg-teal-600/20 text-teal-400'
                : 'bg-teal-600/20 text-teal-300 hover:bg-teal-600/40'
            }`}
            disabled={aiActive}
            onClick={handleDeepDive}
          >
            {aiActive ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Sparkles className="size-3" />
            )}
            Deep Dive
          </button>
          <button
            className="text-zinc-500 transition-colors hover:text-white"
            onClick={close}
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* Results list */}
      <div className="space-y-2 overflow-y-auto p-2">
        {searchResults.map((event) => {
          const isPinned = pinnedEvent?.id === event.id;
          return (
            <button
              key={event.id}
              className={`w-full rounded-lg p-3 text-left transition-colors ${
                isPinned
                  ? 'border border-teal-500/40 bg-teal-600/20'
                  : 'border border-transparent bg-zinc-800/40 hover:bg-zinc-800/70'
              }`}
              onClick={() => {
                if (isPinned) {
                  dispatch({ type: 'PIN_EVENT', payload: null });
                } else {
                  dispatch({ type: 'PIN_EVENT', payload: event });
                  dispatch({
                    type: 'EXECUTE_SEARCH',
                    payload: {
                      lat: event.location.lat,
                      lng: event.location.lng,
                      zoom: 8,
                      year: event.year,
                    },
                  });
                }
              }}
            >
              <h4 className="text-sm font-semibold leading-snug text-white">
                {event.title}
              </h4>

              <div className="mt-1.5 flex items-center gap-3 text-xs text-zinc-400">
                <span className="flex items-center gap-1">
                  <Calendar className="size-3" /> {event.year}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="size-3" /> {event.location.city},{' '}
                  {event.location.country}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap gap-1">
                {event.genre.map((g) => (
                  <span
                    key={g}
                    className="rounded-full bg-teal-600/30 px-1.5 py-0.5 text-[10px] text-teal-300"
                  >
                    {g}
                  </span>
                ))}
              </div>

              <p
                className={`mt-2 text-xs text-zinc-400 ${isPinned ? '' : 'line-clamp-2'}`}
              >
                {event.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
