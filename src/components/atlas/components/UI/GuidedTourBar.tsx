import { ChevronLeft, ChevronRight, MapPin, X } from 'lucide-react';
import { useMemo } from 'react';
import {
  useAppState,
  useAppDispatch,
} from '@/components/atlas/context/AppContext';
import { getTour, resolveTourStops } from '@/components/atlas/data';
import { resolveStopEvent } from '@/components/atlas/utils/resolveStopEvent';

/**
 * Bottom-centre bar that drives a place-based Guided Tour (region or city). Its
 * shell mirrors ModuleProgressBar, but the body foregrounds each stop's
 * hand-authored insight blurb. Flying + city highlighting happen via the same
 * EXECUTE_SEARCH / SELECT_LOCATION actions the rest of the globe uses.
 */
export function GuidedTourBar() {
  const { activeTour } = useAppState();
  const dispatch = useAppDispatch();

  const tour = useMemo(
    () => (activeTour ? getTour(activeTour.tourId) : undefined),
    [activeTour],
  );
  const stops = useMemo(() => (tour ? resolveTourStops(tour) : []), [tour]);

  if (!activeTour || !tour || stops.length === 0) return null;

  const { currentStep } = activeTour;
  const total = stops.length;
  const current = stops[currentStep];
  if (!current) return null;

  const goToStep = (step: number) => {
    if (step < 0 || step >= total || !tour) return;
    const stop = stops[step];
    if (!stop) return;
    dispatch({ type: 'TOUR_STEP', payload: step });
    dispatch({
      type: 'EXECUTE_SEARCH',
      payload: { lat: stop.lat, lng: stop.lng, zoom: stop.zoom },
    });
    // Highlight the city on a city stop; clear the selection on overview stops.
    dispatch({
      type: 'SELECT_LOCATION',
      payload: stop.cityId ? { type: 'city', id: stop.cityId } : null,
    });
    // Pin the stop's representative event so its card opens fully (after
    // SELECT_LOCATION, which resets pinnedEvent). Overview stops pin nothing.
    const event = resolveStopEvent(tour, stop, step);
    if (event) dispatch({ type: 'PIN_EVENT', payload: event });
  };

  const exit = () => dispatch({ type: 'EXIT_TOUR' });

  return (
    <div className="absolute bottom-4 left-1/2 z-[1000] w-[min(640px,calc(100%-2rem))] -translate-x-1/2">
      <div className="rounded-2xl border border-[#7ecfcf66] bg-black/20 px-4 py-3 shadow-2xl backdrop-blur-md">
        {/* Header row: tour title + step info + exit */}
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-1.5">
            <MapPin className="size-3.5 shrink-0 text-[#7ecfcf]" />
            <span className="truncate text-[10px] font-medium text-[#7ecfcf]/80">
              {tour.title}
              <span className="text-[#7ecfcf]/50"> · {tour.subtitle}</span>
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-[10px] text-white/40">
              Stop {currentStep + 1} of {total}
            </span>
            <button
              aria-label="Exit tour"
              className="p-0.5 text-white/40 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7ecfcf]"
              title="Exit tour"
              onClick={exit}
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>

        {/* Current stop: title + authored insight */}
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-white">
              {current.title}
            </h4>
            <p className="mt-1 text-xs leading-snug text-white/70">
              {current.blurb}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1 pt-0.5">
            <button
              aria-label="Previous stop"
              className="rounded-md p-1 text-white/60 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7ecfcf] disabled:cursor-not-allowed disabled:opacity-30"
              disabled={currentStep === 0}
              onClick={() => goToStep(currentStep - 1)}
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              aria-label="Next stop"
              className="rounded-md p-1 text-white/60 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7ecfcf] disabled:cursor-not-allowed disabled:opacity-30"
              disabled={currentStep === total - 1}
              onClick={() => goToStep(currentStep + 1)}
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>

        {/* Dot progress bar */}
        <div className="flex items-center justify-center gap-1.5">
          {stops.map((stop, i) => (
            <button
              key={i}
              aria-label={`Go to stop ${i + 1}: ${stop.title}`}
              className={`rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7ecfcf] ${
                i === currentStep
                  ? 'size-2.5 bg-[#7ecfcf] shadow-[0_0_6px_rgba(126,207,207,0.5)]'
                  : i < currentStep
                    ? 'size-2 bg-[#7ecfcf]/70 hover:bg-[#7ecfcf]'
                    : 'size-2 bg-white/20 hover:bg-white/30'
              }`}
              title={stop.title}
              onClick={() => goToStep(i)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
