import { ChevronLeft, ChevronRight, FileMusic, Route, X } from 'lucide-react';
import { useEffect, useMemo, type ReactNode, type RefObject } from 'react';
import { Link } from 'react-router-dom';
import {
  EventList,
  EventTilePicture,
  showTileFirst,
} from '@/components/atlas/components/UI/DetailsCard';
import {
  ATLAS_FOCUS,
  ATLAS_ITEM_TITLE,
  AtlasIconButton,
} from '@/components/atlas/components/UI/primitives';
import type { AtlasArtist } from '@/components/atlas/data/artists';
import { eventImage } from '@/components/atlas/data/eventImage';
import { songHref } from '@/components/atlas/data/tourLinks';
import {
  scrollBehavior,
  usePrefersReducedMotion,
} from '@/components/atlas/hooks/useMediaQuery';
import { useAtlasNavigate } from '@/components/atlas/navigation/useAtlasNavigate';
import { useAtlasDispatch } from '@/components/atlas/state/atlasStore';
import type { HistoricalEvent, TourSong } from '@/components/atlas/types';
import type { AppIconComponent } from '@/components/icons/appIcons';
import { cn } from '@/lib/utils';

/**
 * What the Tours panel and the Story panel share (owner, 2026-11-16: a
 * student's Story plays as a Music Atlas tour does): the tiles of the list,
 * and a journey's steps, words and stop tiles.
 */

/** "1903–1970", or one year. */
export function yearSpan(events: readonly HistoricalEvent[]): string {
  if (events.length === 0) return '';
  const years = events.map((e) => e.year);
  const from = Math.min(...years);
  const to = Math.max(...years);
  return from === to ? `${from}` : `${from}–${to}`;
}

export const stopCount = (n: number) => `${n} stop${n === 1 ? '' : 's'}`;

/** The first event with a picture of its own, else the first. */
export const coverOf = (events: readonly (HistoricalEvent | null)[]) => {
  const known = events.filter((e): e is HistoricalEvent => !!e);
  return known.find((e) => eventImage(e, 'lane')) ?? known[0] ?? null;
};

export function CloseButton({
  label = 'Close',
  onClose,
}: {
  label?: string;
  onClose: () => void;
}) {
  return (
    <AtlasIconButton aria-label={label} size="sm" onClick={onClose}>
      <X aria-hidden className="size-4" />
    </AtlasIconButton>
  );
}

/** A tile in a list of journeys. */
export interface TourRow {
  key: string;
  title: string;
  detail: string;
  cover: HistoricalEvent | null;
  meta: ReactNode;
  open: () => void;
}

export function TourTile({ row }: { row: TourRow }) {
  return (
    <button
      className={cn(
        'flex w-full items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-2 text-left transition-colors [box-shadow:var(--daw-shadow-float)] hover:bg-white/[0.08]',
        ATLAS_FOCUS,
      )}
      type="button"
      onClick={row.open}
    >
      {row.cover ? (
        <EventTilePicture event={row.cover} />
      ) : (
        <span
          aria-hidden
          className="flex aspect-video w-24 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-atlas-text-3"
        >
          <Route className="size-4" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className={cn('block', ATLAS_ITEM_TITLE)}>{row.title}</span>
        <span className="mt-0.5 line-clamp-2 text-xs text-atlas-text-2">
          {row.detail}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-atlas-text-2">
          {row.meta}
        </span>
      </span>
    </button>
  );
}

export function Meta({
  icon: Icon,
  children,
}: {
  icon: AppIconComponent;
  children: ReactNode;
}) {
  return (
    <span className="flex items-center gap-1">
      <Icon aria-hidden className="size-3" />
      {children}
    </span>
  );
}

/** Brings the current stop's tile to the top of the list, story first. */
export function useShowCurrent(
  cardRef: RefObject<HTMLDivElement | null>,
  currentId: string | undefined,
) {
  const reducedMotion = usePrefersReducedMotion();
  useEffect(() => {
    if (!currentId) return;
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => {
        const tile = cardRef.current?.querySelector<HTMLElement>(
          `[data-event-id="${currentId}"]`,
        );
        if (tile) showTileFirst(tile, scrollBehavior(reducedMotion));
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [cardRef, currentId, reducedMotion]);
}

/** A journey's stops as the events card's tiles, `currentId` open. */
export function StopEvents({
  events,
  currentId,
  onChoose,
}: {
  events: HistoricalEvent[];
  currentId: string | undefined;
  onChoose: (eventId: string) => void;
}) {
  const dispatch = useAtlasDispatch();
  const navigate = useAtlasNavigate();
  const expanded = useMemo(
    () => new Set(currentId ? [currentId] : []),
    [currentId],
  );
  return (
    <EventList
      canEnlarge={false}
      enlarged={false}
      events={events}
      expandedEvents={expanded}
      pinnedEventId={currentId}
      sequenceActive
      onEnlarge={() => undefined}
      onNavigateToEvent={(event) => navigate.toEvent(event)}
      onSelectArtist={(artist: AtlasArtist) => navigate.toArtist(artist.name)}
      onShrink={() => undefined}
      onToggle={onChoose}
      onVideoPlay={() => dispatch({ type: 'OPEN_INFLUENCE_ARCS' })}
    />
  );
}

/**
 * The current stop's own words under the steps: its title (a tour's stop has
 * one; a genre tour's is its event's, on the tile below), what happens there
 * and the line on to the next stop, and Learn's songs from it.
 */
export function StopWords({
  title,
  text,
  songs,
}: {
  title?: string;
  text?: string;
  songs?: readonly TourSong[];
}) {
  if (!title && !text && !songs?.length) return null;
  return (
    <div className="mt-3">
      {title && <h4 className={ATLAS_ITEM_TITLE}>{title}</h4>}
      {text && (
        <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-atlas-text/80">
          {text}
        </p>
      )}
      {songs && songs.length > 0 && (
        <ul
          aria-label="Play it in Learn"
          className="mt-2 flex flex-wrap gap-1.5"
        >
          {songs.map((song) => (
            <li key={song.id}>
              <Link
                className={cn(
                  'inline-flex h-7 max-w-full items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 text-xs text-atlas-text transition-colors hover:bg-white/[0.08]',
                  ATLAS_FOCUS,
                )}
                title={`Play ${song.title} by ${song.artist} in Learn`}
                to={songHref(song.id)}
              >
                <FileMusic aria-hidden className="size-3.5 shrink-0" />
                <span className="truncate">
                  {song.title}
                  <span className="text-atlas-text-2"> · {song.artist}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * The steps, one segment each (passed and current lit), with back and on,
 * and the tour's Learn & make at the end when it has one. A segment goes to
 * its stop.
 */
export function Steps({
  titles,
  current,
  finale,
  onStep,
}: {
  titles: readonly string[];
  current: number;
  /** The last step's name, after the stops. */
  finale?: string;
  onStep: (i: number) => void;
}) {
  const all = finale ? [...titles, finale] : titles;
  const total = all.length;
  const atFinale = !!finale && current === titles.length;
  return (
    <div className="mt-3 flex items-center gap-2">
      <AtlasIconButton
        aria-label="Previous stop"
        disabled={current === 0}
        size="sm"
        onClick={() => onStep(current - 1)}
      >
        <ChevronLeft aria-hidden className="size-4" />
      </AtlasIconButton>
      <div className="min-w-0 flex-1">
        <ol aria-label="Stops" className="flex items-center gap-1">
          {all.map((title, i) => (
            <li
              key={i}
              className={i === titles.length ? 'flex-[1.5]' : 'flex-1'}
            >
              <button
                aria-current={i === current ? 'step' : undefined}
                aria-label={
                  i === titles.length ? title : `Stop ${i + 1}: ${title}`
                }
                className={cn(
                  'block h-3 w-full rounded-full py-1 bg-clip-content transition-colors',
                  ATLAS_FOCUS,
                  i === current
                    ? 'bg-white'
                    : i < current
                      ? 'bg-white/60 hover:bg-white/80'
                      : 'bg-white/15 hover:bg-white/30',
                )}
                title={title}
                type="button"
                onClick={() => onStep(i)}
              />
            </li>
          ))}
        </ol>
        <p className="mt-1 text-xs text-atlas-text-2">
          {atFinale ? finale : `Stop ${current + 1} of ${titles.length}`}
        </p>
      </div>
      <AtlasIconButton
        aria-label={
          finale && current === titles.length - 1 ? finale : 'Next stop'
        }
        disabled={current === total - 1}
        size="sm"
        onClick={() => onStep(current + 1)}
      >
        <ChevronRight aria-hidden className="size-4" />
      </AtlasIconButton>
    </div>
  );
}
