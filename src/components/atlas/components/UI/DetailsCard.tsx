import {
  X,
  ChevronDown,
  FileMusic,
  ChevronRight,
  Calendar,
  MapPin,
  Maximize2,
  Minimize2,
  GripVertical,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import { useNavigate } from 'react-router-dom';
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
  AtlasEyebrow,
  AtlasIconButton,
  AtlasPanel,
  AtlasPanelBody,
} from '@/components/atlas/components/UI/primitives';
import type { AtlasArtist } from '@/components/atlas/data/artists';
import { stateBoundariesData } from '@/components/atlas/data/loaders';
import { getCityById } from '@/components/atlas/data/lookups';
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
import type { HistoricalEvent } from '@/components/atlas/types';
import { eventPlaceName } from '@/components/atlas/utils/eventPlace';
import { getEventsForLocation } from '@/components/atlas/utils/getEventsForLocation';
import { SongRoutes } from '@/constants/routes';

/** The card's width to start with, and its limits when resized. */
const DEFAULT_WIDTH = 480;
const MIN_WIDTH = 280;
/** One Arrow-key step of the resize handle; Shift takes four. */
const RESIZE_STEP = 16;
const maxWidth = () =>
  typeof window === 'undefined'
    ? DEFAULT_WIDTH
    : Math.max(MIN_WIDTH, Math.round(window.innerWidth * 0.72));
const clampWidth = (w: number) =>
  Math.round(Math.min(Math.max(w, MIN_WIDTH), maxWidth()));

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
    <span className="flex items-center gap-3 text-xs text-atlas-text-2" id={id}>
      <span className="flex items-center gap-1">
        <Calendar aria-hidden className="size-3" /> {event.year}
      </span>
      <span className="flex items-center gap-1">
        <MapPin aria-hidden className="size-3" /> {eventPlaceName(event)}
      </span>
    </span>
  );
}

function EventList({
  events,
  expandedEvents,
  enlarged,
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
    estimateSize: 66,
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
      {!enlarged && (
        <AtlasEyebrow as="p" className="mb-2 mt-3">
          {events.length} event{events.length !== 1 && 's'}
        </AtlasEyebrow>
      )}
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
              className={`group relative isolate w-full rounded-2xl border text-left transition-colors ${focused ? 'p-4' : 'p-2.5'} ${
                isExpanded
                  ? 'border-white/30 bg-white/[0.06]'
                  : 'border-atlas-panel-border bg-white/[0.03] hover:bg-white/[0.06]'
              }`}
            >
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
                    className={`ml-auto mr-1 size-3.5 text-atlas-text-2 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  />
                </button>
              )}
              {isExpanded && (
                <div className="relative z-10" id={`${idBase}-${index}-body`}>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {event.genre.map((g) => (
                      <GenreBadge key={g} genre={g} />
                    ))}
                  </div>
                  <ArtistChips event={event} onSelectArtist={onSelectArtist} />
                  <p
                    className={`mt-2 leading-relaxed text-atlas-text/80 ${focused ? 'text-base' : 'text-sm'}`}
                  >
                    {event.description}
                  </p>
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
  const [collapsed, setCollapsed] = useState(false);
  const [enlarged, setEnlarged] = useState(false);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const cardRef = useRef<HTMLDivElement>(null);
  const zone = useAtlasZone();
  const inSheet = zone.kind === 'sheet';
  const reducedMotion = usePrefersReducedMotion();

  // While dragging, the width is written straight to the card's style and
  // React hears about it once, on release: re-rendering the card and its event
  // list on every move is what made the drag stutter. The globe still
  // follows along, through the ResizeObserver below. Pointer events, so a
  // finger or a pen drags it as well as a mouse.
  //
  // Listened for on the window, not with setPointerCapture on the handle:
  // with capture the drag ran at 12 fps instead of 17, and the slowed page
  // kept twice the long tasks afterwards (measureGlobe, 4x CPU). Touch and
  // pen pointers are captured to the handle by the browser anyway.
  const onDragStart = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (e.button > 0) return;
    e.preventDefault();
    const card = cardRef.current;
    if (!card) return;
    const startX = e.clientX;
    const startWidth = card.getBoundingClientRect().width;
    let next = startWidth;
    const onMove = (mv: globalThis.PointerEvent) => {
      next = clampWidth(startWidth + mv.clientX - startX);
      card.style.width = `${next}px`;
    };
    const onUp = () => {
      setWidth(Math.round(next));
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }, []);

  // The same handle from the keyboard: Arrow keys step it, Shift steps
  // further, Home and End go to the narrowest and widest.
  const onResizeKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? RESIZE_STEP * 4 : RESIZE_STEP;
    const next =
      e.key === 'ArrowLeft'
        ? width - step
        : e.key === 'ArrowRight'
          ? width + step
          : e.key === 'Home'
            ? MIN_WIDTH
            : e.key === 'End'
              ? maxWidth()
              : null;
    if (next === null) return;
    e.preventDefault();
    setWidth(clampWidth(next));
  };

  // Escape leaves Enlarge first; the next one closes the card (the left
  // zone's layer, under this one).
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
  // un-collapse the card, and scroll that event into view so it reads fully.
  useEffect(() => {
    if (!pinnedEvent) return;
    setExpandedEvents(new Set([pinnedEvent.id]));
    setCollapsed(false);
    const id = pinnedEvent.id;
    const raf = requestAnimationFrame(() => {
      cardRef.current
        ?.querySelector(`[data-event-id="${id}"]`)
        ?.scrollIntoView({
          block: 'nearest',
          behavior: scrollBehavior(reducedMotion),
        });
    });
    return () => cancelAnimationFrame(raf);
  }, [pinnedEvent]);

  // Report the card's occluding width to the globe while an event is expanded so
  // it can shift the region clear of the card. The ResizeObserver tracks drag-
  // resize + enlarge, and delivers at most once per frame; only the globe's
  // offset subscribes to the width, so a report re-renders nothing else.
  // Cleanup clears it (unmount / nothing pinned). In the phone's bottom sheet
  // the card covers no side of the globe, so it reports nothing.
  useEffect(() => {
    const el = cardRef.current;
    if (!el || !pinnedEvent || inSheet) {
      dispatch({ type: 'SET_DETAILS_PANEL_WIDTH', payload: null });
      return;
    }
    const report = () =>
      dispatch({
        type: 'SET_DETAILS_PANEL_WIDTH',
        payload: el.getBoundingClientRect().width,
      });
    report();
    const ro = new ResizeObserver(report);
    ro.observe(el);
    return () => {
      ro.disconnect();
      dispatch({ type: 'SET_DETAILS_PANEL_WIDTH', payload: null });
    };
  }, [dispatch, pinnedEvent, selectedLocation, inSheet]);

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
      ? {
          title: selectedLocation.name,
          subtitle: `ISO: ${selectedLocation.iso}`,
        }
      : selectedLocation.type === 'state'
        ? {
            title: selectedLocation.name,
            subtitle: selectedLocation.country ?? 'United States',
          }
        : city
          ? { title: city.name, subtitle: city.country }
          : { title: 'City not found', subtitle: undefined };

  return (
    <AtlasPanel
      ref={cardRef}
      actions={
        <>
          {/* In the phone sheet, the sheet's own heights do this. */}
          {!enlarged && !inSheet && (
            <AtlasIconButton
              aria-label={collapsed ? 'Expand details' : 'Collapse details'}
              size="sm"
              title={collapsed ? 'Expand' : 'Collapse'}
              onClick={() => setCollapsed((c) => !c)}
            >
              <ChevronRight
                aria-hidden
                className={`size-4 transition-transform ${collapsed ? 'rotate-0' : 'rotate-90'}`}
              />
            </AtlasIconButton>
          )}
          <AtlasIconButton aria-label="Close details" size="sm" onClick={close}>
            <X aria-hidden className="size-4" />
          </AtlasIconButton>
        </>
      }
      as="div"
      edge={
        // Resize handle on the right edge (not while enlarged): drag it, or
        // focus it and use the Arrow keys.
        !enlarged && (
          <div
            aria-label="Resize the details panel"
            aria-orientation="vertical"
            aria-valuemax={maxWidth()}
            aria-valuemin={MIN_WIDTH}
            aria-valuenow={width}
            className={`absolute right-0 top-0 z-10 flex h-full w-3 cursor-ew-resize touch-none items-center justify-center rounded-r-2xl opacity-0 transition-opacity hover:opacity-100 focus-visible:opacity-100 active:opacity-100 ${ATLAS_FOCUS}`}
            role="separator"
            tabIndex={0}
            onKeyDown={onResizeKey}
            onPointerDown={onDragStart}
          >
            <GripVertical aria-hidden className="size-3 text-atlas-text-2" />
          </div>
        )
      }
      header={
        city &&
        !enlarged && (
          <>
            {/* A town events make a city of has no description of its own. */}
            {city.description && (
              <p className="mt-3 text-sm leading-relaxed text-atlas-text/80">
                {city.description}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {city.genres.map((genre) => (
                <GenreBadge key={genre} genre={genre} />
              ))}
            </div>
            <p className="mt-3 text-sm text-atlas-text-2">
              Active: {city.activeDecades.map((d) => `${d}s`).join(', ')}
            </p>
          </>
        )
      }
      // The zone caps the height (above the bottom bar) and the width (what
      // the right column leaves).
      style={{
        width: enlarged ? 'min(66vw, 900px)' : `min(${width}px, 100vw - 2rem)`,
      }}
      subtitle={heading.subtitle}
      title={heading.title}
    >
      {!collapsed && awaitingOutlines && (
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
      {!collapsed && !awaitingOutlines && (
        <EventList
          events={events}
          expandedEvents={expandedEvents}
          enlarged={enlarged}
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
