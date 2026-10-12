import { ChevronLeft, ChevronRight, MapPin, X } from 'lucide-react';
import { useMemo } from 'react';
import {
  ATLAS_FOCUS,
  ATLAS_ITEM_TITLE,
  ATLAS_SURFACE,
  AtlasEyebrow,
  AtlasIconButton,
} from '@/components/atlas/components/UI/primitives';
import { getTour, resolveTourStops } from '@/components/atlas/data';
import {
  useAtlasDispatch,
  useAtlasSelector,
} from '@/components/atlas/state/atlasStore';
import { resolveStopEvent } from '@/components/atlas/utils/resolveStopEvent';

/**
 * Bottom-centre bar that drives a place-based Guided Tour (region or city). Its
 * shell mirrors ModuleProgressBar, but the body foregrounds each stop's
 * hand-authored insight blurb. Flying + city highlighting happen via the same
 * EXECUTE_SEARCH / SELECT_LOCATION actions the rest of the globe uses.
 */
export function GuidedTourBar() {
  const activeTour = useAtlasSelector((s) => s.activeTour);
  const dispatch = useAtlasDispatch();

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
      <div className={`px-4 py-3 ${ATLAS_SURFACE}`}>
        {/* Header row: tour title + step info + exit */}
        <div className="mb-2 flex items-center justify-between gap-3">
          <AtlasEyebrow className="min-w-0 text-atlas-tour">
            <MapPin aria-hidden className="size-3.5 shrink-0" />
            <span className="truncate">
              {tour.title}
              <span className="font-normal normal-case tracking-normal text-atlas-text-2">
                {' '}
                · {tour.subtitle}
              </span>
            </span>
          </AtlasEyebrow>
          <div className="-mr-1.5 flex shrink-0 items-center gap-1">
            <span className="text-xs text-atlas-text-2">
              Stop {currentStep + 1} of {total}
            </span>
            <AtlasIconButton aria-label="Exit tour" size="sm" onClick={exit}>
              <X aria-hidden className="size-3.5" />
            </AtlasIconButton>
          </div>
        </div>

        {/* Current stop: title + authored insight */}
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h4 className={ATLAS_ITEM_TITLE}>{current.title}</h4>
            <p className="mt-1 text-xs leading-snug text-atlas-text/80">
              {current.blurb}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <AtlasIconButton
              aria-label="Previous stop"
              disabled={currentStep === 0}
              onClick={() => goToStep(currentStep - 1)}
            >
              <ChevronLeft aria-hidden className="size-4" />
            </AtlasIconButton>
            <AtlasIconButton
              aria-label="Next stop"
              disabled={currentStep === total - 1}
              onClick={() => goToStep(currentStep + 1)}
            >
              <ChevronRight aria-hidden className="size-4" />
            </AtlasIconButton>
          </div>
        </div>

        {/* Dot progress bar */}
        <div className="flex items-center justify-center gap-1.5">
          {stops.map((stop, i) => (
            <button
              key={i}
              aria-label={`Go to stop ${i + 1}: ${stop.title}`}
              // Current: larger and glowing. Visited: filled. Ahead: hollow.
              className={`rounded-full transition-all ${ATLAS_FOCUS} ${
                i === currentStep
                  ? 'size-2.5 bg-atlas-tour shadow-[0_0_6px_rgb(var(--atlas-tour)/0.5)]'
                  : i < currentStep
                    ? 'size-2 bg-atlas-tour/70 hover:bg-atlas-tour'
                    : 'size-2 border border-white/40 hover:border-white/70'
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
