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
    dispatch({ type: 'PIN_EVENT', payload: event });
    dispatch({
      type: 'EXECUTE_SEARCH',
      payload: { lat: event.location.lat, lng: event.location.lng, zoom: 10 },
    });
    const city = CITIES.find(
      (c) => c.name.toLowerCase() === event.location.city.toLowerCase(),
    );
    if (city)
      dispatch({
        type: 'SELECT_LOCATION',
        payload: { type: 'city', id: city.id },
      });
  };

  const exit = () => dispatch({ type: 'EXIT_MODULE' });

  return (
    <div className="absolute bottom-4 left-1/2 z-[1000] w-[min(640px,calc(100%-2rem))] -translate-x-1/2">
      <div className="rounded-xl border border-teal-500/30 bg-zinc-900/95 px-4 py-3 shadow-2xl backdrop-blur-xl">
        {/* Header row: module title + step info + exit */}
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-sm leading-none">{mod.emoji}</span>
            <span className="truncate text-[10px] font-medium text-teal-400/70">
              {mod.title}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-[10px] text-zinc-500">
              Step {currentStep + 1} of {total}
            </span>
            <button
              className="p-0.5 text-zinc-500 transition-colors hover:text-white"
              title="Exit journey"
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
            <p className="mt-0.5 text-[10px] text-zinc-400">
              {current.location.city}, {current.location.country} &middot;{' '}
              {current.year}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              className="rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-700/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
              disabled={currentStep === 0}
              onClick={() => navigateToStep(currentStep - 1)}
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              className="rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-700/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
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
              className={`rounded-full transition-all ${
                i === currentStep
                  ? 'size-2.5 bg-teal-400 shadow-[0_0_6px_rgba(45,212,191,0.5)]'
                  : i < currentStep
                    ? 'size-2 bg-teal-600 hover:bg-teal-500'
                    : 'size-2 bg-zinc-600 hover:bg-zinc-500'
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
