/**
 * PathwayGlobePreview — embeds a globe *pathway* inside a slide as the
 * dashboard-style preview (see ClassroomLayout/dashboard/GlobeSection): a cobe
 * globe tracing the pathway's stops beside a card that steps through them (one
 * per full rotation). Events are resolved from MUSIC_HISTORY at render, so it
 * self-gates on 'events' like GlobeSection. Falls back to an unmarked globe +
 * pathway summary when a pathway has no resolvable events.
 *
 * Layout uses container queries so it adapts to whatever media slot it lands in
 * (side-by-side when wide, stacked when narrow) across editor / board / student.
 */
import { ArrowRight, Calendar, MapPin } from 'lucide-react';
import { Suspense, lazy, useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ROOTS_AND_ROUTES } from '@/components/ClassroomLayout/globe/data/rootsAndRoutes';
import { HISTORICAL_MODULES } from '@/components/atlas/data';
import type { HistoricalEvent } from '@/components/atlas/types';
import { AtlasRoutes } from '@/constants/routes';
import { ContentGate } from '@/content/ContentGate';
import { MUSIC_HISTORY } from '@/content/contentStore';
import { buildPathwayGlobeData } from './pathwayGlobeData';

const GlobeCdn = lazy(() =>
  import('@/components/ui/cobe-globe-cdn').then((m) => ({
    default: m.GlobeCdn,
  })),
);

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const pathwayTitle = (pathwayId: string): string =>
  HISTORICAL_MODULES.find((m) => m.id === pathwayId)?.title ??
  ROOTS_AND_ROUTES.find((r) => r.id === pathwayId)?.title ??
  'Pathway';

const pathwayDescription = (pathwayId: string): string | undefined =>
  HISTORICAL_MODULES.find((m) => m.id === pathwayId)?.description ??
  ROOTS_AND_ROUTES.find((r) => r.id === pathwayId)?.overview;

interface PathwayGlobePreviewProps {
  pathwayId: string;
  className?: string;
}

export const PathwayGlobePreview = ({
  pathwayId,
  className,
}: PathwayGlobePreviewProps) => (
  <ContentGate
    needs={['events']}
    fallback={<div className={`aspect-square w-full ${className ?? ''}`} />}
  >
    <PathwayGlobePreviewInner pathwayId={pathwayId} className={className} />
  </ContentGate>
);

const PathwayGlobePreviewInner = ({
  pathwayId,
  className,
}: PathwayGlobePreviewProps) => {
  const events = useMemo<HistoricalEvent[]>(() => {
    const module = HISTORICAL_MODULES.find((m) => m.id === pathwayId);
    if (!module) return [];
    const byId = new Map(MUSIC_HISTORY.map((e) => [e.id, e]));
    return module.eventIds
      .map((id) => byId.get(id))
      .filter((e): e is HistoricalEvent => Boolean(e));
  }, [pathwayId]);

  const [index, setIndex] = useState(0);
  const activeIndex = events.length ? index % events.length : 0;
  const advance = useCallback(() => {
    if (!prefersReducedMotion()) {
      setIndex((i) => (events.length ? (i + 1) % events.length : 0));
    }
  }, [events.length]);

  const { markers, arcs, arcHeight } = useMemo(
    () => buildPathwayGlobeData(events, activeIndex),
    [events, activeIndex],
  );

  const event = events[activeIndex];
  const href = `${AtlasRoutes.globe()}?pathway=${encodeURIComponent(pathwayId)}`;

  return (
    <div className={`flex w-full flex-col gap-3 ${className ?? ''}`}>
      {/* Globe on top (square, capped + centered). The inner box bleeds the
          canvas outward (GlobeSection technique) so tall arcs clear the edge. */}
      <div className="relative mx-auto aspect-square w-full max-w-md">
        <div className="absolute inset-[-10%]">
          <Suspense fallback={<div className="size-full" />}>
            <GlobeCdn
              markers={markers}
              arcs={arcs}
              arcHeight={arcHeight}
              onRotationComplete={events.length > 1 ? advance : undefined}
            />
          </Suspense>
        </div>
      </div>

      <div
        key={event?.id ?? pathwayId}
        className="flex min-w-0 animate-fade-in-bottom flex-col gap-2"
      >
        {event ? (
          <>
            <h3 className="text-lg font-semibold leading-snug text-white">
              {event.title}
            </h3>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/60">
              <span className="flex items-center gap-1.5">
                <Calendar className="size-4" />
                {event.year}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="size-4" />
                {event.location.city}, {event.location.country}
              </span>
            </div>
            {event.genre.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {event.genre.map((g) => (
                  <span
                    key={g}
                    className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-white/80"
                  >
                    {g}
                  </span>
                ))}
              </div>
            )}
            {event.description && (
              <p className="line-clamp-4 text-sm leading-relaxed text-white/70">
                {event.description}
              </p>
            )}
          </>
        ) : (
          <>
            <h3 className="text-lg font-semibold leading-snug text-white">
              {pathwayTitle(pathwayId)}
            </h3>
            {pathwayDescription(pathwayId) && (
              <p className="text-sm leading-relaxed text-white/70">
                {pathwayDescription(pathwayId)}
              </p>
            )}
          </>
        )}
        <Link
          to={href}
          className="inline-flex items-center gap-2 self-start rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 transition-colors hover:border-white/25 hover:bg-white/10 hover:text-white"
        >
          <span>View on Globe</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
};
