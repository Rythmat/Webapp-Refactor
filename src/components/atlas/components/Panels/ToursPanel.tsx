import {
  Calendar,
  ChevronLeft,
  FileMusic,
  GraduationCap,
  ChevronRight,
  LayoutList,
  MapPin,
  Route,
  X,
} from 'lucide-react';
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import { Link } from 'react-router-dom';
import {
  EventList,
  EventTilePicture,
  showTileFirst,
} from '@/components/atlas/components/UI/DetailsCard';
import {
  ATLAS_EYEBROW,
  ATLAS_FOCUS,
  ATLAS_ITEM_TITLE,
  ATLAS_PILL_ZONE,
  ATLAS_SEGMENT,
  AtlasIconButton,
  AtlasPanel,
  AtlasPanelBody,
} from '@/components/atlas/components/UI/primitives';
import type { GuidedTour, ResolvedTourStop } from '@/components/atlas/data';
import type { AtlasArtist } from '@/components/atlas/data/artists';
import { eventImage } from '@/components/atlas/data/eventImage';
import { guidesData } from '@/components/atlas/data/loaders';
import { getEventById } from '@/components/atlas/data/lookups';
import {
  learnHref,
  learnTitle,
  songHref,
  studioHref,
} from '@/components/atlas/data/tourLinks';
import { useLazyResource } from '@/components/atlas/hooks/useLazyResource';
import {
  scrollBehavior,
  usePrefersReducedMotion,
} from '@/components/atlas/hooks/useMediaQuery';
import { goToTourStop } from '@/components/atlas/hooks/useStartTour';
import { focusEvent } from '@/components/atlas/navigation/focusEvent';
import { useAtlasNavigate } from '@/components/atlas/navigation/useAtlasNavigate';
import {
  useAtlasDispatch,
  useAtlasSelector,
} from '@/components/atlas/state/atlasStore';
import type {
  HistoricalEvent,
  HistoricalModule,
  TourSong,
} from '@/components/atlas/types';
import { resolveStopEvent } from '@/components/atlas/utils/resolveStopEvent';
import { type AppIconComponent, AppIcons } from '@/components/icons/appIcons';
import { GENRE_COURSES } from '@/components/learn/genreCourses';
import { cn } from '@/lib/utils';
import { PanelLoading } from './PanelLoading';

/** The running journey: a pathway or a guided tour, by its id. */
export interface Journey {
  kind: 'pathway' | 'tour';
  id: string;
}

type Guides = NonNullable<ReturnType<typeof guidesData.peek>>;

/** A pathway's stops, in order, as far as the events know them. */
const pathwayStops = (mod: HistoricalModule): HistoricalEvent[] =>
  mod.eventIds
    .map((id) => getEventById(id))
    .filter((e): e is HistoricalEvent => !!e);

/** Each tour stop's event (an overview stop has none). */
const tourStopEvents = (
  tour: GuidedTour,
  stops: readonly ResolvedTourStop[],
): (HistoricalEvent | null)[] =>
  stops.map((stop, i) => resolveStopEvent(tour, stop, i));

/** "1903–1970", or one year. */
function yearSpan(events: readonly HistoricalEvent[]): string {
  if (events.length === 0) return '';
  const years = events.map((e) => e.year);
  const from = Math.min(...years);
  const to = Math.max(...years);
  return from === to ? `${from}` : `${from}–${to}`;
}

const stopCount = (n: number) => `${n} stop${n === 1 ? '' : 's'}`;

/** The first event with a picture of its own, else the first. */
const coverOf = (events: readonly (HistoricalEvent | null)[]) => {
  const known = events.filter((e): e is HistoricalEvent => !!e);
  return known.find((e) => eventImage(e, 'lane')) ?? known[0] ?? null;
};

/**
 * The Tours panel, in the Inspector (owner, 2026-11-09: pathways and guided
 * tours as one section, fitted to the Globe's cards): with none running, the
 * tours as tiles, by kind; with one running, its stops as the events card's
 * tiles, the current one open, and the steps along the head. A journey's
 * card replaces the old bar under the map.
 */
export default function ToursPanel({
  journey,
  onClose,
}: {
  /** The running pathway or tour, or null for the list. */
  journey: Journey | null;
  onClose: () => void;
}) {
  const guides = useLazyResource(guidesData);
  if (guides.status === 'error') {
    return (
      <AtlasPanel
        actions={<CloseButton onClose={onClose} />}
        as="div"
        title="Tours"
      >
        <p className="px-4 pb-4 text-sm text-atlas-text-2" role="alert">
          The tours didn’t load.{' '}
          <button
            className={`rounded-full font-bold text-atlas-text underline underline-offset-2 ${ATLAS_FOCUS}`}
            type="button"
            onClick={guides.retry}
          >
            Try again
          </button>
        </p>
      </AtlasPanel>
    );
  }
  if (!guides.data) return <PanelLoading title="Tours" />;
  const data = guides.data;
  const mod =
    journey?.kind === 'pathway' ? data.getModuleById(journey.id) : undefined;
  if (mod) return <RunningPathway mod={mod} onClose={onClose} />;
  const tour = journey?.kind === 'tour' ? data.getTour(journey.id) : undefined;
  if (tour) {
    return <RunningTour guides={data} tour={tour} onClose={onClose} />;
  }
  return <TourList guides={data} onClose={onClose} />;
}

function CloseButton({
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

/** A running journey's corner: back to every tour, and its end. */
function JourneyActions({
  ending,
  onClose,
}: {
  ending: string;
  onClose: () => void;
}) {
  const navigate = useAtlasNavigate();
  return (
    <>
      <AtlasIconButton
        aria-label="All tours"
        size="sm"
        title="All tours"
        onClick={() =>
          navigate.go({ kind: 'home' }, { frame: { panel: 'tours' } })
        }
      >
        <LayoutList aria-hidden className="size-4" />
      </AtlasIconButton>
      <CloseButton label={ending} onClose={onClose} />
    </>
  );
}

/* ── The list ────────────────────────────────────────────────────────────── */

const KINDS = [
  {
    id: 'genre',
    label: 'Genre',
    detail: 'A style followed across the world, by Learn’s genres',
  },
  { id: 'region', label: 'Region', detail: 'A region and its music cities' },
  { id: 'city', label: 'City', detail: 'A city through its eras' },
] as const;
type Kind = (typeof KINDS)[number]['id'];

interface Row {
  key: string;
  title: string;
  detail: string;
  cover: HistoricalEvent | null;
  meta: ReactNode;
  open: () => void;
}

/** A run of tiles under a heading (a Learn genre), or none. */
interface Group {
  key: string;
  heading: string | null;
  rows: Row[];
}

/** The Learn genres a tour leads to, by Learn's names. */
const learnNames = (slugs: readonly string[] | undefined) =>
  (slugs ?? []).map(learnTitle).filter((t): t is string => !!t);

/**
 * Genre tours under Learn's genres, in Learn's order (owner, 2026-11-09):
 * each by the first genre it teaches; any Learn doesn't teach, last.
 */
function byLearnGenre(
  modules: readonly HistoricalModule[],
  row: (mod: HistoricalModule) => Row,
): Group[] {
  const groups: Group[] = GENRE_COURSES.map((course) => ({
    key: course.slug,
    heading: course.title,
    rows: modules.filter((m) => m.learnGenres?.[0] === course.slug).map(row),
  }));
  const taught = new Set(GENRE_COURSES.map((c) => c.slug));
  groups.push({
    key: 'world',
    heading: 'World traditions',
    rows: modules.filter((m) => !taught.has(m.learnGenres?.[0] ?? '')).map(row),
  });
  return groups.filter((g) => g.rows.length > 0);
}

/**
 * Every tour, a tile each as the events card's, one kind at a time: the
 * genre tours under Learn's genres, the region tours, the city tours.
 */
function TourList({
  guides,
  onClose,
}: {
  guides: Guides;
  onClose: () => void;
}) {
  const navigate = useAtlasNavigate();
  const [kind, setKind] = useState<Kind>('genre');
  const groups = useMemo((): Group[] => {
    const toMap = { frame: { view: 'map' as const } };
    if (kind === 'genre') {
      return byLearnGenre(guides.HISTORICAL_MODULES, (mod) => {
        const stops = pathwayStops(mod);
        return {
          key: mod.id,
          title: mod.title,
          detail: mod.description,
          cover: coverOf(stops),
          meta: (
            <>
              <Meta icon={Route}>{stopCount(stops.length)}</Meta>
              {stops.length > 0 && (
                <Meta icon={Calendar}>{yearSpan(stops)}</Meta>
              )}
            </>
          ),
          open: () =>
            navigate.go({ kind: 'pathway', pathwayId: mod.id }, toMap),
        };
      });
    }
    const rows = guides.GUIDED_TOURS.filter((tour) => tour.kind === kind).map(
      (tour): Row => {
        const stops = guides.resolveTourStops(tour);
        const genres = learnNames(tour.learnGenres);
        return {
          key: tour.id,
          title: tour.title,
          detail: tour.subtitle,
          cover: coverOf(tourStopEvents(tour, stops)),
          meta: (
            <>
              <Meta icon={MapPin}>{stopCount(stops.length)}</Meta>
              {genres.length > 0 && (
                <Meta icon={GraduationCap}>{genres.join(' · ')}</Meta>
              )}
            </>
          ),
          open: () => navigate.go({ kind: 'tour', tourId: tour.id }, toMap),
        };
      },
    );
    return [{ key: kind, heading: null, rows }];
  }, [guides, kind, navigate]);
  const count = groups.reduce((n, g) => n + g.rows.length, 0);
  const subtitle = KINDS.find((k) => k.id === kind)?.detail;
  return (
    <AtlasPanel
      actions={<CloseButton onClose={onClose} />}
      as="div"
      header={<KindChoice value={kind} onChange={setKind} />}
      subtitle="Hear it on the Globe, learn it, then make it in the Studio"
      title="Tours"
    >
      <AtlasPanelBody className="px-4 pb-3">
        <p className="mt-3 text-xs text-atlas-text-2">
          {count} · {subtitle}
        </p>
        {groups.map((group) => (
          <section key={group.key} aria-label={group.heading ?? undefined}>
            {group.heading && (
              <h4 className={cn(ATLAS_EYEBROW, 'mb-2 mt-4')}>
                {group.heading}
              </h4>
            )}
            <ul className={cn('space-y-2', !group.heading && 'mt-2')}>
              {group.rows.map((row) => (
                <li key={row.key}>
                  <TourTile row={row} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </AtlasPanelBody>
    </AtlasPanel>
  );
}

function TourTile({ row }: { row: Row }) {
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

function Meta({
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

/**
 * Which tours the list shows: three choices in a pill, one of them on (a
 * radio group, so arrow keys move between them), as the Layers panel's.
 */
function KindChoice({
  value,
  onChange,
}: {
  value: Kind;
  onChange: (kind: Kind) => void;
}) {
  const id = useId();
  return (
    <div
      aria-label="Which tours"
      className={cn(ATLAS_PILL_ZONE, 'mt-3')}
      id={id}
      role="radiogroup"
      onKeyDown={(e) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        e.preventDefault();
        const i = KINDS.findIndex((k) => k.id === value);
        const step = e.key === 'ArrowRight' ? 1 : -1;
        const next = KINDS[(i + step + KINDS.length) % KINDS.length];
        onChange(next.id);
        (
          e.currentTarget.querySelector(
            `[data-value="${next.id}"]`,
          ) as HTMLElement | null
        )?.focus();
      }}
    >
      {KINDS.map((kind) => {
        const on = kind.id === value;
        return (
          <button
            key={kind.id}
            aria-checked={on}
            aria-current={on ? 'page' : undefined}
            className={ATLAS_SEGMENT}
            data-value={kind.id}
            role="radio"
            tabIndex={on ? 0 : -1}
            type="button"
            onClick={() => onChange(kind.id)}
          >
            {kind.label}
          </button>
        );
      })}
    </div>
  );
}

/* ── A journey under way ─────────────────────────────────────────────────── */

/** Brings the current stop's tile to the top of the list, story first. */
function useShowCurrent(
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
function StopEvents({
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
function StopWords({
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
        <p className="mt-1 text-sm leading-relaxed text-atlas-text/80">
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

/** The tour's last step: learn the style in Learn, then make it in the Studio. */
const FINALE = 'Learn & make';

/**
 * Where the tour leads once its stops are done (owner, 2026-11-09): each
 * Learn genre it teaches, as a course in Learn and a track in the Studio.
 */
function LearnAndMake({
  tourId,
  genres,
}: {
  tourId: string;
  genres: readonly string[];
}) {
  const taught = genres
    .map((slug) => ({ slug, title: learnTitle(slug) }))
    .filter((g): g is { slug: string; title: string } => !!g.title)
    .slice(0, 2);
  if (taught.length === 0) return null;
  return (
    <div className="mt-3">
      <h4 className={ATLAS_ITEM_TITLE}>Now learn it, then make it</h4>
      <p className="mt-1 text-sm leading-relaxed text-atlas-text/80">
        You’ve heard where it came from. Take the course in Learn, then build a
        track of your own in the Studio.
      </p>
      <ul className="mt-3 space-y-2">
        {taught.map((g) => (
          <li key={g.slug} className="grid grid-cols-2 gap-2">
            <FinaleLink
              icon={AppIcons.learn}
              label={`Learn ${g.title}`}
              detail="The course in Learn"
              to={learnHref(g.slug)}
            />
            <FinaleLink
              icon={AppIcons.studio}
              label={`Make ${g.title}`}
              detail="A track in the Studio"
              to={studioHref(g.slug, tourId)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function FinaleLink({
  icon: Icon,
  label,
  detail,
  to,
}: {
  icon: AppIconComponent;
  label: string;
  detail: string;
  to: string;
}) {
  return (
    <Link
      className={cn(
        'flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.04] p-3 transition-colors [box-shadow:var(--daw-shadow-float)] hover:bg-white/[0.08]',
        ATLAS_FOCUS,
      )}
      to={to}
    >
      <Icon aria-hidden className="size-5 shrink-0" />
      <span className="min-w-0">
        <span className={cn('block truncate', ATLAS_ITEM_TITLE)}>{label}</span>
        <span className="block truncate text-xs text-atlas-text-2">
          {detail}
        </span>
      </span>
    </Link>
  );
}

/** Whether a tour ends on Learn & make: it teaches a genre Learn has. */
const hasFinale = (genres: readonly string[] | undefined) =>
  (genres ?? []).some((slug) => learnTitle(slug) !== null);

/**
 * A genre tour under way: its steps along the head, back and on, the stop's
 * own words, and its stops as the events card's tiles, the current one open
 * (its story, video and influences). Choosing a tile steps there. After the
 * last stop, Learn & make.
 */
function RunningPathway({
  mod,
  onClose,
}: {
  mod: HistoricalModule;
  onClose: () => void;
}) {
  const dispatch = useAtlasDispatch();
  const step = useAtlasSelector((s) =>
    s.activeModule?.moduleId === mod.id ? s.activeModule.currentStep : 0,
  );
  const stops = useMemo(() => pathwayStops(mod), [mod]);
  const finale = hasFinale(mod.learnGenres) ? FINALE : undefined;
  const [atFinale, setAtFinale] = useState(false);
  const currentId = atFinale ? undefined : stops[step]?.id;
  const cardRef = useRef<HTMLDivElement>(null);
  useShowCurrent(cardRef, currentId);

  const goTo = (i: number) => {
    if (finale && i === stops.length) {
      setAtFinale(true);
      return;
    }
    setAtFinale(false);
    const event = stops[i];
    if (!event || i === step) return;
    dispatch({ type: 'MODULE_STEP', payload: i });
    focusEvent(dispatch, event);
  };
  const words = mod.steps?.[mod.eventIds.indexOf(stops[step]?.id ?? '')];

  return (
    <AtlasPanel
      ref={cardRef}
      actions={<JourneyActions ending="End the tour" onClose={onClose} />}
      as="div"
      eyebrow="Genre tour"
      header={
        stops.length > 0 && (
          <>
            <Steps
              current={atFinale ? stops.length : step}
              finale={finale}
              titles={stops.map((e) => e.title)}
              onStep={goTo}
            />
            {atFinale ? (
              <LearnAndMake genres={mod.learnGenres ?? []} tourId={mod.id} />
            ) : (
              <StopWords songs={words?.songs} text={words?.lead} />
            )}
          </>
        )
      }
      subtitle={[stopCount(stops.length), yearSpan(stops)]
        .filter(Boolean)
        .join(' · ')}
      title={mod.title}
    >
      <StopEvents
        currentId={currentId}
        events={stops}
        onChoose={(id) => goTo(stops.findIndex((e) => e.id === id))}
      />
    </AtlasPanel>
  );
}

/**
 * A guided tour under way: its steps along the head, the current stop's
 * own words under them, and its stops' events as the events card's tiles,
 * the current one open. An overview stop has no event: its words alone.
 * After the last stop, Learn & make.
 */
function RunningTour({
  guides,
  tour,
  onClose,
}: {
  guides: Guides;
  tour: GuidedTour;
  onClose: () => void;
}) {
  const dispatch = useAtlasDispatch();
  const step = useAtlasSelector((s) =>
    s.activeTour?.tourId === tour.id ? s.activeTour.currentStep : 0,
  );
  const stops = useMemo(() => guides.resolveTourStops(tour), [guides, tour]);
  const stopEvents = useMemo(() => tourStopEvents(tour, stops), [tour, stops]);
  // Each event once, in stop order (two stops may share one).
  const events = useMemo(() => {
    const seen = new Set<string>();
    return stopEvents.filter((e): e is HistoricalEvent => {
      if (!e || seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    });
  }, [stopEvents]);
  const finale = hasFinale(tour.learnGenres) ? FINALE : undefined;
  const [atFinale, setAtFinale] = useState(false);
  const current = stops[step];
  const currentId = atFinale ? undefined : stopEvents[step]?.id;
  const cardRef = useRef<HTMLDivElement>(null);
  useShowCurrent(cardRef, currentId);

  const goTo = (i: number) => {
    if (finale && i === stops.length) {
      setAtFinale(true);
      return;
    }
    setAtFinale(false);
    if (i < 0 || i >= stops.length || i === step) return;
    goToTourStop(dispatch, tour, stops, i);
  };

  return (
    <AtlasPanel
      ref={cardRef}
      actions={<JourneyActions ending="End the tour" onClose={onClose} />}
      as="div"
      eyebrow={tour.kind === 'region' ? 'Region tour' : 'City tour'}
      header={
        stops.length > 0 && (
          <>
            <Steps
              current={atFinale ? stops.length : step}
              finale={finale}
              titles={stops.map((s) => s.title)}
              onStep={goTo}
            />
            {atFinale ? (
              <LearnAndMake genres={tour.learnGenres ?? []} tourId={tour.id} />
            ) : (
              current && (
                <StopWords
                  songs={current.songs}
                  text={current.blurb}
                  title={current.title}
                />
              )
            )}
          </>
        )
      }
      subtitle={`${tour.subtitle} · ${stopCount(stops.length)}`}
      title={tour.title}
    >
      {events.length > 0 && (
        <StopEvents
          currentId={currentId}
          events={events}
          onChoose={(id) => goTo(stopEvents.findIndex((e) => e?.id === id))}
        />
      )}
    </AtlasPanel>
  );
}

/**
 * The steps, one segment each (passed and current lit), with back and on,
 * and the tour's Learn & make at the end when it has one. A segment goes to
 * its stop.
 */
function Steps({
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
