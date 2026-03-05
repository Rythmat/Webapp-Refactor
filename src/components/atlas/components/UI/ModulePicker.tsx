import { Route, X } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import {
  useAppState,
  useAppDispatch,
} from '@/components/atlas/context/AppContext';
import {
  HISTORICAL_MODULES,
  CITIES,
  MUSIC_HISTORY,
} from '@/components/atlas/data';

export function ModulePicker() {
  const { activeModule } = useAppState();
  const dispatch = useAppDispatch();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const startModule = (moduleId: string) => {
    const mod = HISTORICAL_MODULES.find((m) => m.id === moduleId);
    if (!mod) return;
    dispatch({ type: 'START_MODULE', payload: { moduleId } });

    // Navigate to the first event
    const firstEvent = MUSIC_HISTORY.find((e) => e.id === mod.eventIds[0]);
    if (firstEvent) {
      dispatch({ type: 'PIN_EVENT', payload: firstEvent });
      dispatch({
        type: 'EXECUTE_SEARCH',
        payload: {
          lat: firstEvent.location.lat,
          lng: firstEvent.location.lng,
          zoom: 10,
        },
      });
      const city = CITIES.find(
        (c) => c.name.toLowerCase() === firstEvent.location.city.toLowerCase(),
      );
      if (city)
        dispatch({
          type: 'SELECT_LOCATION',
          payload: { type: 'city', id: city.id },
        });
    }
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
          activeModule
            ? 'border border-teal-500/30 bg-teal-600/30 text-teal-300'
            : 'border border-zinc-700/50 bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700/80'
        }`}
        onClick={() => setOpen(!open)}
      >
        <Route className="size-3.5" />
        Journeys
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 max-h-96 w-80 overflow-y-auto rounded-xl border border-zinc-700/50 bg-zinc-900/95 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-zinc-700/50 p-3">
            <h3 className="text-sm font-semibold text-white">
              Historical Journeys
            </h3>
            <button
              className="text-zinc-500 transition-colors hover:text-white"
              onClick={() => setOpen(false)}
            >
              <X className="size-3.5" />
            </button>
          </div>
          <div className="space-y-1 p-2">
            {HISTORICAL_MODULES.map((mod) => (
              <button
                key={mod.id}
                className={`w-full rounded-lg p-2.5 text-left transition-colors ${
                  activeModule?.moduleId === mod.id
                    ? 'border border-teal-500/30 bg-teal-600/20'
                    : 'border border-transparent hover:bg-zinc-800/70'
                }`}
                onClick={() => startModule(mod.id)}
              >
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 text-base leading-none">
                    {mod.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-semibold text-white">
                      {mod.title}
                    </h4>
                    <p className="mt-0.5 text-[10px] leading-snug text-zinc-400">
                      {mod.description}
                    </p>
                    <p className="mt-1 text-[10px] text-zinc-500">
                      {mod.eventIds.length} stops
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
