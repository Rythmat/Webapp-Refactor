import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useMemo } from 'react';
import {
  useAppState,
  useAppDispatch,
} from '@/components/atlas/context/AppContext';
import {
  HISTORICAL_MODULES,
  CITIES,
  MUSIC_HISTORY,
} from '@/components/atlas/data';
import type { HistoricalEvent } from '@/components/atlas/types';

export function ModuleProgressBar() {
  const { activeModule } = useAppState();
  const dispatch = useAppDispatch();

  const mod = useMemo(
    () =>
      activeModule
        ? HISTORICAL_MODULES.find((m) => m.id === activeModule.moduleId)
        : null,
    [activeModule],
  );

  const events = useMemo(() => {
    if (!mod) return [];
    return mod.eventIds
      .map((id) => MUSIC_HISTORY.find((e) => e.id === id))
      .filter((e): e is HistoricalEvent => !!e);
  }, [mod]);

  if (!activeModule || !mod || events.length === 0) return null;

  const { currentStep } = activeModule;
  const total = events.length;
  const current = events[currentStep];
  if (!current) return null;

  const navigateToStep = (step: number) => {
    if (step < 0 || step >= total) return;
    const event = events[step];
    if (!event) return;
    dispatch({ type: 'MODULE_STEP', payload: step });
    // SELECT_LOCATION resets pinnedEvent, so select the city BEFORE pinning —
    // otherwise the pin (and the focused card + camera offset) is wiped.
    const city = CITIES.find(
      (c) => c.name.toLowerCase() === event.location.city.toLowerCase(),
    );
    if (city)
      dispatch({
        type: 'SELECT_LOCATION',
        payload: { type: 'city', id: city.id },
      });
    dispatch({ type: 'PIN_EVENT', payload: event });
    dispatch({
      type: 'EXECUTE_SEARCH',
      payload: { lat: event.location.lat, lng: event.location.lng, zoom: 10 },
    });
  };

  const exit = () => dispatch({ type: 'EXIT_MODULE' });

  return (
    <div className="absolute bottom-4 left-1/2 z-[1000] w-[min(640px,calc(100%-2rem))] -translate-x-1/2">
      <div className="rounded-2xl border border-[#60a5fa66] bg-black/20 px-4 py-3 shadow-2xl backdrop-blur-md">
        {/* Header row: module title + step info + exit */}
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-sm leading-none">{mod.emoji}</span>
            <span className="truncate text-[10px] font-medium text-[#60a5fa]/70">
              {mod.title}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-[10px] text-white/40">
              Step {currentStep + 1} of {total}
            </span>
            <button
              aria-label="Exit pathway"
              className="p-0.5 text-white/40 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#60a5fa]"
              title="Exit pathway"
              onClick={exit}
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>

        {/* Current event info */}
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h4 className="truncate text-xs font-semibold text-white">
              {current.title}
            </h4>
            <p className="mt-0.5 text-[10px] text-white/60">
              {current.location.city}, {current.location.country} &middot;{' '}
              {current.year}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              aria-label="Previous stop"
              className="rounded-md p-1 text-white/60 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#60a5fa] disabled:cursor-not-allowed disabled:opacity-30"
              disabled={currentStep === 0}
              onClick={() => navigateToStep(currentStep - 1)}
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              aria-label="Next stop"
              className="rounded-md p-1 text-white/60 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#60a5fa] disabled:cursor-not-allowed disabled:opacity-30"
              disabled={currentStep === total - 1}
              onClick={() => navigateToStep(currentStep + 1)}
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>

        {/* Dot progress bar */}
        <div className="flex items-center justify-center gap-1.5">
          {events.map((_, i) => (
            <button
              key={i}
              aria-label={`Go to stop ${i + 1}: ${events[i]?.title ?? ''}`}
              className={`rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#60a5fa] ${
                i === currentStep
                  ? 'size-2.5 bg-[#60a5fa] shadow-[0_0_6px_rgba(96,165,250,0.5)]'
                  : i < currentStep
                    ? 'size-2 bg-[#60a5fa]/70 hover:bg-[#60a5fa]'
                    : 'size-2 bg-white/20 hover:bg-white/30'
              }`}
              title={events[i]?.title}
              onClick={() => navigateToStep(i)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
