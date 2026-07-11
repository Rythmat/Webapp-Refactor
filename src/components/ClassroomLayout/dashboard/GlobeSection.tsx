import { colord } from 'colord';
import { ArrowRight, Calendar, MapPin } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getEventCountryColor,
  getRecursiveArcsForEvent,
} from '@/components/atlas/data/eventConnections';
import { MUSIC_HISTORY } from '@/components/atlas/data/events';
import type { HistoricalEvent } from '@/components/atlas/types';
import {
  GlobeCdn,
  type GlobeArc,
  type GlobeMarker,
} from '@/components/ui/cobe-globe-cdn';
import { AtlasRoutes } from '@/constants/routes';

/** Convert an Atlas hex colour to cobe's 0–1 RGB triple. */
const rgb = (hex: string): [number, number, number] => {
  const { r, g, b } = colord(hex).toRgb();
  return [r / 255, g / 255, b / 255];
};

// Curated, landmark events — each verified to have influence flight paths.
const FEATURED_EVENT_IDS = [
  'evt-jazz-nola-1923',
  'evt-blues-memphis-1951',
  'evt-hiphop-nyc-1979',
  'evt-soundsystem-kingston-1956',
  'evt-reggae-kingston-1971',
  'evt-soul-memphis-1962',
  'evt-motown-detroit-1963',
  'evt-punk-london-1976',
  'evt-british-blues-london-1962',
  'evt-rnb-chicago-1955',
  'evt-diaspora-chicago-gospel-1932',
  'evt-afrobeats-lagos-2010',
  'evt-griot-timbuktu-1500',
  // Africa
  'evt-afrobeat-lagos-1971',
  'evt-highlife-accra-1958',
  'evt-juju-lagos-1978',
  'evt-soukous-kinshasa-1992',
  'evt-mbalax-dakar-1970',
  'evt-ethiojazz-addis-1969-mulatu',
  // Latin America & the Caribbean
  'evt-salsa-nyc-1971',
  'evt-samba-rio-1928',
  'evt-bossanova-rio-1962',
  'evt-tango-buenos-aires-1917',
  'evt-mambo-havana-1948',
  'evt-cumbia-barranquilla-1962',
  'evt-reggaeton-san-juan-2004',
  'evt-mariachi-mexicocity-1950',
  'evt-dancehall-kingston-1975',
  // Europe
  'evt-jazz-age-paris-1925',
  'evt-beatles-liverpool-1963',
  'evt-flamenco-seville-1600',
  'evt-fado-lisbon-1950',
  'evt-metal-helsinki-2006',
  // Asia
  'evt-kpop-global-2020',
  'evt-citypop-tokyo-1982',
  'evt-bollywood-mumbai-1935',
  'evt-carnatic-chennai-1800',
  'evt-qawwali-lahore-1985',
  // Middle East, North Africa & the Caucasus
  'evt-gnawa-marrakech-2000',
  'evt-rai-oran-1985',
  'evt-mugham-jazz-baku-1960',
  // United States
  'evt-funk-augusta-1970',
  'evt-techno-detroit-1985',
];

const EVENT_BY_ID = new Map(MUSIC_HISTORY.map((e) => [e.id, e]));
const FEATURED_EVENTS = FEATURED_EVENT_IDS.map((id) =>
  EVENT_BY_ID.get(id),
).filter((e): e is HistoricalEvent => Boolean(e));

// Match the main globe's pinned-event web, but cap dense hubs for legibility.
const MAX_ARCS = 40;

const coordKey = (lat: number, lng: number) =>
  `${lat.toFixed(3)},${lng.toFixed(3)}`;

const DEG = Math.PI / 180;

/** Great-circle central angle (radians) between two [lat, lng] points. */
const centralAngle = (
  [lat1, lng1]: [number, number],
  [lat2, lng2]: [number, number],
): number => {
  const p1 = lat1 * DEG;
  const p2 = lat2 * DEG;
  const dl = (lng2 - lng1) * DEG;
  const c =
    Math.sin(p1) * Math.sin(p2) + Math.cos(p1) * Math.cos(p2) * Math.cos(dl);
  return Math.acos(Math.min(1, Math.max(-1, c)));
};

/** Pick a global arc altitude so the event's LONGEST arc peaks well above the
 * globe (cobe has no per-arc height). Regional-only events stay low (~0.28);
 * far, intercontinental arcs get a high arch instead of clipping through. */
const arcHeightForAngle = (maxAngle: number): number =>
  Math.min(0.72, Math.max(0.28, 1.09 - 0.81 * Math.cos(maxAngle / 2)));

/** Build the globe's markers + arcs for one event — same arcs the main globe
 * draws when this event is pinned (`getRecursiveArcsForEvent`). */
function buildGlobeData(event: HistoricalEvent): {
  markers: GlobeMarker[];
  arcs: GlobeArc[];
  arcHeight: number;
} {
  const arcData = getRecursiveArcsForEvent(event.id).slice(0, MAX_ARCS);

  let maxAngle = 0;
  const arcs: GlobeArc[] = arcData.map((a) => {
    const from: [number, number] = [a.startLat, a.startLng];
    const to: [number, number] = [a.endLat, a.endLng];
    const angle = centralAngle(from, to);
    if (angle > maxAngle) maxAngle = angle;
    return { from, to, color: rgb(a.color) };
  });

  // Unique arc endpoints → small dots, coloured by the arc's origin colour.
  const endpoints = new Map<
    string,
    { location: [number, number]; color: [number, number, number] }
  >();
  for (const a of arcData) {
    const fromK = coordKey(a.startLat, a.startLng);
    if (!endpoints.has(fromK))
      endpoints.set(fromK, {
        location: [a.startLat, a.startLng],
        color: rgb(a.color),
      });
    const toK = coordKey(a.endLat, a.endLng);
    if (!endpoints.has(toK))
      endpoints.set(toK, {
        location: [a.endLat, a.endLng],
        color: rgb(a.color),
      });
  }

  const featuredKey = coordKey(event.location.lat, event.location.lng);
  const markers: GlobeMarker[] = [];
  let i = 0;
  for (const [k, ep] of endpoints) {
    if (k === featuredKey) continue; // featured rendered separately, labelled
    markers.push({
      id: `mp${i++}`,
      location: ep.location,
      label: '',
      color: ep.color,
      size: 0.022,
    });
  }
  // Featured event: larger, labelled with its city, coloured by its country.
  markers.push({
    id: 'mf',
    location: [event.location.lat, event.location.lng],
    label: event.location.city,
    color: rgb(getEventCountryColor(event)),
    size: 0.05,
  });

  return { markers, arcs, arcHeight: arcHeightForAngle(maxAngle) };
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Fisher–Yates shuffle (returns a new array). */
const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/**
 * Globe preview — a lightweight cobe teaser for the full Atlas globe. A featured
 * event advances once per full globe rotation; the globe draws that event's real
 * influence flight paths (matching the main globe). Home dashboard only.
 */
export const GlobeSection = () => {
  // Shuffle once per page load so the events (and their order) vary each visit.
  const [events] = useState(() => shuffle(FEATURED_EVENTS));
  const [index, setIndex] = useState(0);

  // Advance to the next event each time the globe completes a full rotation.
  const advance = useCallback(() => {
    if (!prefersReducedMotion()) {
      setIndex((i) => (i + 1) % events.length);
    }
  }, [events.length]);

  const event = events[index];
  const { markers, arcs, arcHeight } = useMemo(
    () =>
      event
        ? buildGlobeData(event)
        : { markers: [], arcs: [], arcHeight: 0.28 },
    [event],
  );

  if (!event) return null;

  return (
    <section aria-label="Pathways" className="flex flex-col gap-4 md:gap-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 md:gap-3">
          <img
            src="/icons/pathways-icon.svg"
            alt=""
            draggable={false}
            className="h-8 w-8 md:h-10 md:w-10"
          />
          <h2 className="text-xl font-medium text-white md:text-2xl">
            Pathways
          </h2>
        </div>
        <Link
          to={`${AtlasRoutes.root()}?tab=Pathways`}
          className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/80 transition-colors hover:border-white/25 hover:text-white md:text-base"
        >
          <span>View Pathways</span>
          <ArrowRight className="h-5 w-5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:items-center md:gap-8">
        {/* Outer box reserves the layout square; the inner box bleeds the
            canvas outward so tall arcs render past the edge without resizing
            any component or clipping. */}
        <div className="relative aspect-square w-full max-w-[420px] md:max-w-[480px]">
          <div className="absolute inset-[-10%]">
            <GlobeCdn
              markers={markers}
              arcs={arcs}
              arcHeight={arcHeight}
              onRotationComplete={advance}
            />
          </div>
        </div>

        <div
          key={event.id}
          className="flex min-w-0 flex-col gap-3 animate-fade-in-bottom"
        >
          <h3 className="text-xl font-semibold leading-snug text-white md:text-2xl">
            {event.title}
          </h3>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-base text-white/60 md:text-lg">
            <span className="flex items-center gap-1.5">
              <Calendar className="size-5" />
              {event.year}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="size-5" />
              {event.location.city}, {event.location.country}
            </span>
          </div>
          {event.genre.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {event.genre.map((g) => (
                <span
                  key={g}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-white/80"
                >
                  {g}
                </span>
              ))}
            </div>
          )}
          <p className="text-base leading-relaxed text-white/70 md:text-lg">
            {event.description}
          </p>
          <Link
            to={`${AtlasRoutes.globe()}?event=${encodeURIComponent(event.id)}`}
            className="inline-flex items-center gap-2 self-start rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 transition-colors hover:border-white/25 hover:bg-white/10 hover:text-white"
          >
            <span>View on Globe</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
};
