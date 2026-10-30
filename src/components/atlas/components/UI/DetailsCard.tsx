import {
  X,
  ChevronDown,
  FileMusic,
  Calendar,
  MapPin,
  Maximize2,
  Minimize2,
  Music,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { StackedBar } from '@/components/atlas/components/Cards/charts/StackedBar';
import {
  ArtistChips,
  TitleWithArtists,
} from '@/components/atlas/components/UI/ArtistLinks';
import { EventInfluence } from '@/components/atlas/components/UI/EventInfluence';
import { EventVideo } from '@/components/atlas/components/UI/EventVideo';
import { GenreBadge } from '@/components/atlas/components/UI/GenreBadge';
import {
  ATLAS_FOCUS,
  ATLAS_ITEM_TITLE,
  AtlasIconButton,
  AtlasPanel,
  AtlasPanelBody,
} from '@/components/atlas/components/UI/primitives';
import type { AtlasArtist } from '@/components/atlas/data/artists';
import { eventImage } from '@/components/atlas/data/eventImage';
import { stateBoundariesData } from '@/components/atlas/data/loaders';
import { getCityById } from '@/components/atlas/data/lookups';
import { MUSICAL_ERAS } from '@/components/atlas/data/musicalEras';
import { songIdForEvent } from '@/components/atlas/data/songEventAliases';
import { useEscapeLayer } from '@/components/atlas/hooks/useEscapeLayer';
import { useLazyResource } from '@/components/atlas/hooks/useLazyResource';
import {
  scrollBehavior,
  usePrefersReducedMotion,
} from '@/components/atlas/hooks/useMediaQuery';
import {
  useVirtualRows,
  VIRTUALIZE_OVER,
} from '@/components/atlas/hooks/useVirtualRows';
import { useAtlasZone } from '@/components/atlas/layout/zoneContext';
import { useAtlasNavigate } from '@/components/atlas/navigation/useAtlasNavigate';
import {
  useAtlasDispatch,
  useAtlasSelector,
} from '@/components/atlas/state/atlasStore';
import { eraSplit } from '@/components/atlas/stats/eraSplit';
import { ERA_BG } from '@/components/atlas/theme/eraClasses';
import { inWindow } from '@/components/atlas/timeline/timeWindow';
import type { HistoricalEvent } from '@/components/atlas/types';
import { eventPlaceName } from '@/components/atlas/utils/eventPlace';
import { getEventsForLocation } from '@/components/atlas/utils/getEventsForLocation';
import { SongRoutes } from '@/constants/routes';

/**
 * Back to the chart this event was made from.
 *
 * The song library's globe icon goes one way; this is the return trip. A song
 * event's id IS `song-<songId>`, or names its song in `songEventAliases.ts`
 * (a second recording with its own pin), so the link needs no lookup — which
 * matters, because the atlas route only hydrates globe events. Reading the
 * song library here to confirm the chart exists would mean pulling a 3.3MB
 * bundle to decide whether to draw an icon; `songEventLinks.test.ts` guards
 * the mapping instead.
 */
const LeadSheetButton = ({ event }: { event: HistoricalEvent }) => {
  const navigate = useNavigate();
  const songId = songIdForEvent(event.id);
  if (!songId) return null;
  return (
    <AtlasIconButton
      aria-label="Open the lead sheet"
      size="xs"
      onClick={() => navigate(SongRoutes.song({ songId }))}
    >
      <FileMusic aria-hidden className="size-3.5" />
    </AtlasIconButton>
  );
};

/** An event's year and city, the line under its title. */
function EventMeta({ event, id }: { event: HistoricalEvent; id?: string }) {
  return (
    <span
      className="flex min-w-0 items-center gap-3 text-xs text-atlas-text-2"
      id={id}
    >
      <span className="flex shrink-0 items-center gap-1">
        <Calendar aria-hidden className="size-3" /> {event.year}
      </span>
      <span className="flex min-w-0 items-center gap-1">
        <MapPin aria-hidden className="size-3 shrink-0" />
        <span className="truncate">{eventPlaceName(event)}</span>
      </span>
    </span>
  );
}

const ERA_LABEL = new Map(MUSICAL_ERAS.map((e) => [e.id, e.label]));

/** A tile's picture: the event's own, or a quiet stand-in of the same shape. */
function EventTilePicture({ event }: { event: HistoricalEvent }) {
  const src = eventImage(event, 'lane');
  return src ? (
    <img
      alt=""
      className="aspect-video w-24 shrink-0 rounded-xl object-cover"
      decoding="async"
      loading="lazy"
      src={src}
    />
  ) : (
    <span
      aria-hidden
      className="flex aspect-video w-24 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-atlas-text-3"
    >
      <Music className="size-4" />
    </span>
  );
}

/** The events by era in the years shown, as one bar; none when there are none. */
function HeaderEras({ events }: { events: readonly HistoricalEvent[] }) {
  const w = useAtlasSelector((s) => s.timeWindow);
  const eras = useMemo(
    () => eraSplit(events.map((e) => e.year).filter((y) => inWindow(w, y))),
    [events, w],
  );
  if (eras.length === 0) return null;
  return (
    <div className="mt-3">
      <StackedBar
        label="Events by era"
        segments={eras.map((e) => ({
          key: e.id,
          count: e.count,
          className: ERA_BG[e.id],
          label: ERA_LABEL.get(e.id) ?? e.id,
        }))}
      />
    </div>
  );
}

function EventList({
  events,
  expandedEvents,
  enlarged,
  canEnlarge,
  pinnedEventId,
  sequenceActive,
  onToggle,
  onEnlarge,
  onShrink,
  onNavigateToEvent,
  onSelectArtist,
  onVideoPlay,
}: {
  events: HistoricalEvent[];
  expandedEvents: Set<string>;
  enlarged: boolean;
  /** Whether Enlarge is on offer: not in the Inspector's fixed card. */
  canEnlarge: boolean;
  pinnedEventId?: string;
  sequenceActive: boolean;
  onToggle: (id: string) => void;
  onEnlarge: (event: HistoricalEvent) => void;
  onShrink: () => void;
  onNavigateToEvent: (event: HistoricalEvent) => void;
  onSelectArtist: (artist: AtlasArtist) => void;
  onVideoPlay: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const idBase = useId();

  // While enlarged, only the focused card is in the page; the rest unmount
  // (a country can list hundreds). The focused card keeps its element and
  // its place in this same list, and React leaves an element where it is
  // when its siblings come and go, so the video's <iframe> is never
  // reparented — a moved iframe reloads, and the video would stop. Only an
  // expanded card has a video, and Enlarge expands just the one it shows.
  const shown = useMemo(
    () => (enlarged ? events.filter((e) => expandedEvents.has(e.id)) : events),
    [enlarged, events, expandedEvents],
  );
  // Expanded cards stay rendered when scrolled away, so a playing video
  // keeps playing.
  const keep = useMemo(
    () => shown.flatMap((e, i) => (expandedEvents.has(e.id) ? [i] : [])),
    [shown, expandedEvents],
  );
  const itemKey = useCallback((i: number) => shown[i]?.id ?? i, [shown]);
  const list = useVirtualRows({
    count: shown.length,
    enabled: !enlarged && shown.length > VIRTUALIZE_OVER,
    scrollRef,
    listRef,
    estimateSize: 84,
    gap: 8,
    getItemKey: itemKey,
    keep,
  });

  if (events.length === 0) {
    return (
      <div className="border-t border-atlas-panel-border px-4 py-3">
        <p className="text-sm text-atlas-text-2">No events found</p>
      </div>
    );
  }

  return (
    <AtlasPanelBody ref={scrollRef} className="px-4 pb-3">
      <div
        ref={listRef}
        className={
          enlarged ? '' : list.virtual ? 'relative mt-3' : 'mt-3 space-y-2'
        }
        style={list.virtual ? { height: list.totalSize } : undefined}
        {...list.listProps}
      >
        {list.rows.map(({ index, top }) => {
          const event = shown[index];
          const isExpanded = expandedEvents.has(event.id);
          const focused = enlarged && isExpanded;
          // The pinned event of an active sequence (Pathway / tour step) shows
          // its influence chains inline + open, decoupled from the globe arcs
          // (so the simplified globe stays clean).
          const isPinnedStep = sequenceActive && event.id === pinnedEventId;
          return (
            // The row is not itself a control: its toggle is a button of its
            // own (stretched over the row, so a click anywhere on the row
            // still opens it), beside the artist links, the lead-sheet and
            // Enlarge buttons and the open card's contents, which sit above
            // that stretch. No control inside another.
            <div
              key={event.id}
              ref={list.measureElement}
              data-event-id={event.id}
              data-index={index}
              style={
                list.virtual
                  ? {
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${top}px)`,
                    }
                  : undefined
              }
              // A floating tile: the column's cards, smaller, with its picture
              // (owner, 2026-10-30); the open one shows its video instead.
              className={`group relative isolate w-full rounded-2xl border text-left transition-colors [box-shadow:var(--daw-shadow-float)] ${focused ? 'p-4' : 'p-2'} ${
                isExpanded
                  ? 'border-white/30 bg-white/[0.06]'
                  : 'border-white/10 bg-white/[0.04] hover:bg-white/[0.08]'
              }`}
            >
              <div className="flex items-start gap-3">
                {!isExpanded && <EventTilePicture event={event} />}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h4
                      className={`${ATLAS_ITEM_TITLE} ${focused ? 'text-lg' : ''}`}
                      id={`${idBase}-${index}-title`}
                    >
                      <TitleWithArtists
                        event={event}
                        onSelectArtist={onSelectArtist}
                      />
                    </h4>
                    <div className="relative z-10 -mr-1 -mt-0.5 flex shrink-0 items-center gap-0.5">
                      <LeadSheetButton event={event} />
                      {canEnlarge && (
                        <AtlasIconButton
                          aria-label={focused ? 'Shrink' : 'Enlarge'}
                          size="xs"
                          onClick={() => {
                            if (focused) onShrink();
                            else onEnlarge(event);
                          }}
                        >
                          {focused ? (
                            <Minimize2 aria-hidden className="size-4" />
                          ) : (
                            <Maximize2 aria-hidden className="size-3.5" />
                          )}
                        </AtlasIconButton>
                      )}
                    </div>
                  </div>
                  {enlarged ? (
                    <EventMeta event={event} />
                  ) : (
                    <button
                      aria-controls={
                        isExpanded ? `${idBase}-${index}-body` : undefined
                      }
                      aria-expanded={isExpanded}
                      aria-labelledby={`${idBase}-${index}-title ${idBase}-${index}-meta`}
                      className={`mt-1 flex w-full items-center gap-3 rounded-full text-left after:absolute after:inset-0 after:rounded-2xl ${ATLAS_FOCUS}`}
                      data-row-control
                      type="button"
                      onClick={() => onToggle(event.id)}
                    >
                      <EventMeta event={event} id={`${idBase}-${index}-meta`} />
                      <ChevronDown
                        aria-hidden
                        className={`ml-auto mr-1 size-3.5 shrink-0 text-atlas-text-2 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </button>
                  )}
                </div>
              </div>
              {isExpanded && (
                <div className="relative z-10" id={`${idBase}-${index}-body`}>
                  <p
                    className={`mt-2 leading-relaxed text-atlas-text/80 ${focused ? 'text-base' : 'text-sm'}`}
                  >
                    {event.description}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {event.genre.map((g) => (
                      <GenreBadge key={g} genre={g} />
                    ))}
                  </div>
                  <ArtistChips event={event} onSelectArtist={onSelectArtist} />
                  <EventVideo
                    event={event}
                    onPlay={onVideoPlay}
                    className={`rounded-2xl border border-atlas-panel-border ${focused ? 'mx-auto mt-4 max-w-2xl' : 'mt-3'}`}
                  />
                  <EventInfluence
                    event={event}
                    onNavigate={onNavigateToEvent}
                    defaultOpen={isPinnedStep}
                    affectsGlobe={!isPinnedStep}
                    className={
                      focused
                        ? 'mt-4 grid gap-x-8 gap-y-3 border-t border-atlas-panel-border pt-4 sm:grid-cols-2 [&>div]:min-w-0'
                        : undefined
                    }
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </AtlasPanelBody>
  );
}

export function DetailsCard() {
  const selectedLocation = useAtlasSelector((s) => s.selectedLocation);
  const pinnedEvent = useAtlasSelector((s) => s.pinnedEvent);
  const sequenceActive = useAtlasSelector(
    (s) => s.activeModule !== null || s.activeTour !== null,
  );
  const dispatch = useAtlasDispatch();
  const navigate = useAtlasNavigate();
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const zone = useAtlasZone();
  // The Inspector is a card of a fixed size (owner, 2026-10-30); on a phone,
  // Enlarge is the sheet at full height.
  const canEnlarge = zone.kind !== 'inspector';
  const [enlarged, setEnlarged] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  // Escape leaves Enlarge first; the next one closes the card (the
  // Inspector's layer, under this one).
  useEscapeLayer(enlarged, () => setEnlarged(false));

  // The pinned event is always in the list. resolveEventRegion.test.ts proves
  // that for the bundled data, but production reads CDN-published content that
  // no test has seen — and an event missing from its own panel is precisely
  // the "I clicked the pill and nothing happened" bug.
  //
  // A state's list places towns CITIES doesn't name by the state outlines,
  // which load on demand: until they have, the list is null and the card says
  // it is loading. (Navigating to an event waits for them, so a pinned event
  // never arrives before its list.)
  const outlines = useLazyResource(
    stateBoundariesData,
    selectedLocation?.type === 'state',
  );
  const awaitingOutlines =
    selectedLocation?.type === 'state' && outlines.status !== 'ready';
  const listed = useMemo(
    () => (awaitingOutlines ? null : getEventsForLocation(selectedLocation)),
    [awaitingOutlines, selectedLocation],
  );
  const events = useMemo(() => {
    if (!listed) return [];
    if (!pinnedEvent || listed.some((e) => e.id === pinnedEvent.id)) {
      return listed;
    }
    return [...listed, pinnedEvent].sort((a, b) => a.year - b.year);
  }, [listed, pinnedEvent]);

  // Collapse all events + exit enlarge when the location changes; auto-expand a
  // lone event. Keyed on the location's own list, NOT `events`: that one also
  // changes whenever the pin does, and would collapse the card (and drop out
  // of enlarge mode) on every click inside it.
  useEffect(() => {
    if (!listed) return;
    setEnlarged(false);
    if (listed.length === 1) {
      setExpandedEvents(new Set([listed[0].id]));
    } else {
      setExpandedEvents(new Set());
    }
  }, [selectedLocation, listed]);

  // Expand only the pinned event (timeline click / deep-link / sequence step),
  // and scroll that event into view so it reads fully.
  useEffect(() => {
    if (!pinnedEvent) return;
    setExpandedEvents(new Set([pinnedEvent.id]));
    const id = pinnedEvent.id;
    const raf = requestAnimationFrame(() => {
      cardRef.current
        ?.querySelector(`[data-event-id="${id}"]`)
        ?.scrollIntoView({
          // Its description first: the card is short.
          block: 'start',
          behavior: scrollBehavior(reducedMotion),
        });
    });
    return () => cancelAnimationFrame(raf);
  }, [pinnedEvent]);

  if (!selectedLocation) return null;

  const close = () => navigate.home();

  // Every change of what the card shows goes through the URL, so each one is a
  // step in the trail and a spot someone can bookmark.
  const navigateToEvent = (event: HistoricalEvent) => navigate.toEvent(event);
  const selectArtist = (artist: AtlasArtist) => navigate.toArtist(artist.name);

  // Opening a card is visiting that event; closing it returns to the place.
  // The expanded set follows from the pin (see the pinnedEvent effect above).
  const toggleEvent = (id: string) => {
    if (expandedEvents.has(id)) {
      navigate.toPlace(selectedLocation);
      return;
    }
    navigate.toEvent(id);
  };

  // Enlarge the panel, focused on an event. If it's the event already playing,
  // don't re-navigate (that would re-pin it, resetting the arcs); just grow the
  // panel so the video keeps playing uninterrupted.
  const enlargeEvent = (event: HistoricalEvent) => {
    if (pinnedEvent?.id !== event.id) navigate.toEvent(event);
    setExpandedEvents(new Set([event.id]));
    setEnlarged(true);
    // On a phone, Enlarge is the sheet at full height.
    if (zone.kind === 'sheet') zone.setSnap('full');
  };

  const city =
    selectedLocation.type === 'city'
      ? getCityById(selectedLocation.id)
      : undefined;
  const heading =
    selectedLocation.type === 'country'
      ? { title: selectedLocation.name, place: undefined }
      : selectedLocation.type === 'state'
        ? {
            title: selectedLocation.name,
            place: selectedLocation.country ?? 'United States',
          }
        : city
          ? { title: city.name, place: city.country }
          : { title: 'City not found', place: undefined };
  const counted = listed
    ? `${events.length} event${events.length === 1 ? '' : 's'}`
    : undefined;
  const subtitle = [heading.place, counted].filter(Boolean).join(' · ');

  return (
    <AtlasPanel
      ref={cardRef}
      actions={
        <AtlasIconButton aria-label="Close details" size="sm" onClick={close}>
          <X aria-hidden className="size-4" />
        </AtlasIconButton>
      }
      as="div"
      // The region's colours, explained: its events by era, in the years shown.
      header={!enlarged && <HeaderEras events={events} />}
      // On its own (no zone to fill), Enlarge widens the card itself.
      style={
        enlarged ? { width: 'min(66vw, 900px)' } : { width: 'min(30rem, 100%)' }
      }
      subtitle={subtitle || undefined}
      title={heading.title}
    >
      {awaitingOutlines && (
        <div className="border-t border-atlas-panel-border px-4 py-3">
          {outlines.status === 'error' ? (
            <p className="text-sm text-atlas-text-2" role="alert">
              This state’s events didn’t load.{' '}
              <button
                className={`rounded-full font-bold text-atlas-text underline underline-offset-2 ${ATLAS_FOCUS}`}
                type="button"
                onClick={outlines.retry}
              >
                Try again
              </button>
            </p>
          ) : (
            <p className="text-sm text-atlas-text-2" role="status">
              Loading events…
            </p>
          )}
        </div>
      )}
      {!awaitingOutlines && (
        <EventList
          events={events}
          expandedEvents={expandedEvents}
          enlarged={enlarged}
          canEnlarge={canEnlarge}
          pinnedEventId={pinnedEvent?.id}
          sequenceActive={sequenceActive}
          onToggle={toggleEvent}
          onEnlarge={enlargeEvent}
          onShrink={() => setEnlarged(false)}
          onNavigateToEvent={navigateToEvent}
          onSelectArtist={selectArtist}
          onVideoPlay={() => dispatch({ type: 'OPEN_INFLUENCE_ARCS' })}
        />
      )}
    </AtlasPanel>
  );
}
