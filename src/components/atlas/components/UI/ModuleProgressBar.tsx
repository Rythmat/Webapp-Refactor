import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useMemo } from 'react';
import {
  ATLAS_FOCUS,
  ATLAS_ITEM_TITLE,
  ATLAS_SURFACE,
  AtlasEyebrow,
  AtlasIconButton,
} from '@/components/atlas/components/UI/primitives';
import { guidesData } from '@/components/atlas/data/loaders';
import { getEventById } from '@/components/atlas/data/lookups';
import { useLazyResource } from '@/components/atlas/hooks/useLazyResource';
import { focusEvent } from '@/components/atlas/navigation/focusEvent';
import {
  useAtlasDispatch,
  useAtlasSelector,
} from '@/components/atlas/state/atlasStore';
import type { HistoricalEvent } from '@/components/atlas/types';
import { eventPlaceName } from '@/components/atlas/utils/eventPlace';

export function ModuleProgressBar() {
  const activeModule = useAtlasSelector((s) => s.activeModule);
  const dispatch = useAtlasDispatch();

  // Loaded already: a pathway starts only once the pathways have.
  const guides = useLazyResource(guidesData, !!activeModule).data;
  const moduleId = activeModule?.moduleId;
  const mod = useMemo(
    () => guides?.getModuleById(moduleId),
    [guides, moduleId],
  );

  const events = useMemo(() => {
    if (!mod) return [];
    return mod.eventIds
      .map((id) => getEventById(id))
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
    focusEvent(dispatch, event);
  };

  const exit = () => dispatch({ type: 'EXIT_MODULE' });

  return (
    // The bottom zone places it (layout/AtlasZones.tsx).
    <div className="w-full">
      <div className={`px-4 py-3 ${ATLAS_SURFACE}`}>
        {/* Header row: module title + step info + exit */}
        <div className="mb-2 flex items-center justify-between gap-3">
          <AtlasEyebrow className="min-w-0 text-atlas-accent">
            <span aria-hidden className="text-sm leading-none">
              {mod.emoji}
            </span>
            <span className="truncate">{mod.title}</span>
          </AtlasEyebrow>
          <div className="-mr-1.5 flex shrink-0 items-center gap-1">
            <span className="text-xs text-atlas-text-2">
              Step {currentStep + 1} of {total}
            </span>
            <AtlasIconButton aria-label="Exit pathway" size="sm" onClick={exit}>
              <X aria-hidden className="size-3.5" />
            </AtlasIconButton>
          </div>
        </div>

        {/* Current event info */}
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h4 className={`truncate ${ATLAS_ITEM_TITLE}`}>{current.title}</h4>
            <p className="mt-0.5 text-xs text-atlas-text-2">
              {eventPlaceName(current)}, {current.location.country} &middot;{' '}
              {current.year}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <AtlasIconButton
              aria-label="Previous stop"
              disabled={currentStep === 0}
              onClick={() => navigateToStep(currentStep - 1)}
            >
              <ChevronLeft aria-hidden className="size-4" />
            </AtlasIconButton>
            <AtlasIconButton
              aria-label="Next stop"
              disabled={currentStep === total - 1}
              onClick={() => navigateToStep(currentStep + 1)}
            >
              <ChevronRight aria-hidden className="size-4" />
            </AtlasIconButton>
          </div>
        </div>

        {/* Dot progress bar */}
        <div className="flex items-center justify-center gap-1.5">
          {events.map((_, i) => (
            <button
              key={i}
              aria-label={`Go to stop ${i + 1}: ${events[i]?.title ?? ''}`}
              // Current: larger and glowing. Visited: filled. Ahead: hollow.
              className={`rounded-full transition-all ${ATLAS_FOCUS} ${
                i === currentStep
                  ? 'size-2.5 bg-atlas-accent shadow-[0_0_6px_rgb(var(--atlas-accent)/0.5)]'
                  : i < currentStep
                    ? 'size-2 bg-atlas-accent/70 hover:bg-atlas-accent'
                    : 'size-2 border border-white/40 hover:border-white/70'
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
