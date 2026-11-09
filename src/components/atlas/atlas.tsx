import './index.css';
import {
  Component,
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { BottomRail } from '@/components/atlas/components/Frame/BottomRail';
import {
  StageDock,
  useBottomBar,
} from '@/components/atlas/components/Frame/StageDock';
import { TopRail } from '@/components/atlas/components/Frame/TopRail';
import { AtlasGlobe } from '@/components/atlas/components/Globe';
import { AtlasMapProvider } from '@/components/atlas/components/Globe/mapHandle';
import { HoverLayer } from '@/components/atlas/components/Hover/HoverLayer';
import {
  ATLAS_HEADING,
  ATLAS_SURFACE,
} from '@/components/atlas/components/UI/primitives';
import { useIsPhone } from '@/components/atlas/hooks/useMediaQuery';
import { PhoneZones } from '@/components/atlas/layout/AtlasZones';
import { CardsLayer } from '@/components/atlas/layout/CardsLayer';
import { InspectorRegion } from '@/components/atlas/layout/InspectorRegion';
import { FRAME_PX } from '@/components/atlas/layout/frameGeometry';
import { IntroProvider, useIntro } from '@/components/atlas/layout/intro';
import { AtlasPortalContext } from '@/components/atlas/layout/portalRoot';
import {
  InspectorProvider,
  useInspectorState,
} from '@/components/atlas/layout/useInspector';
import {
  isRingView,
  isTimelineView,
} from '@/components/atlas/navigation/atlasFrame';
import {
  AtlasNavigationProvider,
  useAtlasFrame,
  useAtlasStopSelector,
} from '@/components/atlas/navigation/useAtlasNavigate';
import { useAtlasUrlSync } from '@/components/atlas/navigation/useAtlasUrlSync';
import {
  AtlasStoreProvider,
  useAtlasDispatch,
  useAtlasSelector,
} from '@/components/atlas/state/atlasStore';
import { StageSignalsProvider } from '@/components/atlas/state/stageSignals';
import { ATLAS_MS } from '@/components/atlas/theme/motion';
import { RIVER } from '@/components/atlas/theme/river';
import { TimeCameraProvider } from '@/components/atlas/timeline/TimeCamera';
import type { MapInsets } from '@/components/atlas/types';
import { cn } from '@/lib/utils';

// The timeline (the Eras and Regions & Cities views): its own chunk,
// fetched the first time the page shows it — or sooner, when the pointer
// heads for its view tab (River/prefetchRiver).
const TimeRiver = lazy(
  () => import('@/components/atlas/components/River/TimeRiver'),
);

// The era rail along the bottom: its own small chunk, a moment after the
// page — the map and the timeline come first.
const EraRail = lazy(() =>
  import('@/components/atlas/components/UI/EraRail').then((m) => ({
    default: m.EraRail,
  })),
);

// The Connections view (the ring): its own chunk, fetched the first time
// the page shows it, or when the pointer heads for its tab (prefetchRing).
const RingView = lazy(
  () => import('@/components/atlas/components/Ring/RingView'),
);

// The floating cards as a phone's strip: with the cards' own chunk.
const PhoneStrip = lazy(
  () => import('@/components/atlas/components/Cards/PhoneStrip'),
);

/** Whether the page is showing the timeline rather than the globe. */
const useTimelineView = () => useAtlasFrame(isTimelineView);

class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        // atlas-root for the tokens: this replaces the page that carries them.
        <div className="atlas-root flex min-h-0 w-full flex-1 items-center justify-center bg-atlas-page p-8 text-atlas-text">
          <div className={cn(ATLAS_SURFACE, 'max-w-lg p-6')}>
            <h1 className={`mb-3 ${ATLAS_HEADING}`}>Something went wrong</h1>
            <pre className="whitespace-pre-wrap text-sm text-atlas-danger">
              {this.state.error.message}
            </pre>
            {import.meta.env.DEV && (
              <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap text-xs text-atlas-text-2">
                {this.state.error.stack}
              </pre>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * The URL is the source of truth for what the globe shows — every param a
 * deep-link, bookmark, lesson link, or Back press can carry is applied here.
 *
 * A component of its own so the router subscription stops here instead of
 * re-rendering the page, and last in the tree so its effects run after every
 * panel's, as they did when the layout called the hook.
 */
function AtlasUrlSync() {
  useAtlasUrlSync();
  return null;
}

/**
 * A phone's map: the Inspector's panel in a bottom sheet, and the bar under
 * the map resting on it (layout/AtlasZones.tsx).
 */
function PhoneOverlays() {
  const dispatch = useAtlasDispatch();
  const { slot } = useInspectorState();
  const bottom = useBottomBar();
  // What the overlays cover of the map, for the MapLibre engine's padding
  // and framing (MapPadding, mapFraming.ts); nothing once they are gone.
  const onInsets = useCallback(
    (insets: MapInsets) =>
      dispatch({ type: 'SET_ZONE_INSETS', payload: { zone: 'phone', insets } }),
    [dispatch],
  );
  useEffect(
    () => () =>
      dispatch({
        type: 'SET_ZONE_INSETS',
        payload: { zone: 'phone', insets: null },
      }),
    [dispatch],
  );
  // The cards' strip: on the map, for the world or a stop (a journey has
  // its own bar), unless the viewer hid the cards.
  const timeline = useTimelineView();
  const hidden = useAtlasSelector((s) => s.cards.hidden);
  const journey = useAtlasStopSelector(
    (stop) => stop.kind === 'tour' || stop.kind === 'pathway',
  );
  const intro = useIntro();
  const strip =
    timeline || hidden || journey || intro === 'wait' ? null : (
      <Suspense fallback={null}>
        <PhoneStrip />
      </Suspense>
    );
  return (
    <div className="pointer-events-none absolute inset-0">
      <PhoneZones
        bottom={bottom}
        inspector={slot}
        strip={strip}
        onInsets={onInsets}
      />
    </div>
  );
}

/**
 * The ring over the globe (Connections), once the page has shown it: its
 * places grow out of the map and go back to it, so it stays up through the
 * morph out, then hides (inert). Kept mounted after, as the timeline is.
 */
function RingStage() {
  const ring = useAtlasFrame(isRingView);
  const [mounted, setMounted] = useState(ring);
  const [visible, setVisible] = useState(ring);
  if (ring && !mounted) setMounted(true);
  if (ring && !visible) setVisible(true);
  useEffect(() => {
    if (ring) return;
    const t = window.setTimeout(() => setVisible(false), ATLAS_MS.morph);
    return () => window.clearTimeout(t);
  }, [ring]);
  if (!mounted) return null;
  return (
    <div
      aria-hidden={!ring}
      className={cn(
        'absolute inset-0',
        !visible && 'invisible',
        !ring && 'pointer-events-none',
      )}
      {...(ring ? {} : { inert: '' })}
    >
      <Suspense fallback={null}>
        <RingView active={ring} />
      </Suspense>
    </div>
  );
}

/**
 * The timeline over the globe, once the page has shown it. Kept mounted
 * after, so switching back and forth keeps its place. Leaving it, its bands
 * draw back while its page fades and the globe comes up behind it; then it
 * hides (inert). The globe stays mounted under it the same way, its spin
 * paused (MapLibreGlobe).
 */
function RiverView() {
  const timeline = useTimelineView();
  const [mounted, setMounted] = useState(timeline);
  const [visible, setVisible] = useState(timeline);
  if (timeline && !mounted) setMounted(true);
  if (timeline && !visible) setVisible(true);
  useEffect(() => {
    if (timeline) return;
    const t = window.setTimeout(() => setVisible(false), RIVER.drawBackMs);
    return () => window.clearTimeout(t);
  }, [timeline]);
  if (!mounted) return null;
  return (
    <div
      aria-hidden={!timeline}
      className={cn(
        'absolute inset-0',
        !visible && 'invisible',
        !timeline && 'pointer-events-none',
      )}
      {...(timeline ? {} : { inert: '' })}
    >
      <Suspense fallback={null}>
        <TimeRiver active={timeline} />
      </Suspense>
    </div>
  );
}

/**
 * The map, fading back and settling to its size as the timeline leaves,
 * and receding as it comes.
 */
function MapStage({ children }: { children: ReactNode }) {
  const timeline = useTimelineView();
  return (
    <div
      className={cn(
        'absolute inset-0 transition-[opacity,scale] [transition-timing-function:var(--ease-out)]',
        timeline ? 'scale-[0.97] opacity-0' : 'scale-100 opacity-100',
      )}
      style={{ transitionDuration: `${RIVER.morphMs}ms` }}
    >
      {children}
    </div>
  );
}

/**
 * The event timeline along the stage's foot (UI/EraRail: the years, and the
 * stop's events on them), on every screen: below the map, so a phone's
 * sheet never covers it.
 */
function StageFoot() {
  return (
    <div className="relative h-3 shrink-0">
      <Suspense fallback={null}>
        <EraRail />
      </Suspense>
    </div>
  );
}

const FRAME_GRID: CSSProperties = {
  gridTemplateAreas: '"top" "stage" "bottom"',
  gridTemplateRows: `${FRAME_PX.top}px minmax(0, 1fr) ${FRAME_PX.bottom}px`,
  gridTemplateColumns: 'minmax(0, 1fr)',
};

/**
 * The page's frame, the Studio's (owner, 2026-10-29): the top rail; the stage
 * card holding the map or the timeline, the Inspector over its right edge,
 * the dock under it and the era rail at its foot; the bottom rail, with the
 * panels' icons. The app's navigation is at its left (ClassroomDashboard). It subscribes to nothing but the screen's size, so a
 * dispatch or a URL change re-renders only the pieces that read it — the
 * globe in particular.
 */
function AppLayout() {
  // The root, for the palette's and the popovers' portals (layout/portalRoot).
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const isPhone = useIsPhone();
  return (
    <div
      ref={setRoot}
      // isolate: the page's z-index layers (theme/layers.ts) order its own
      // pieces and never compete with the app around it.
      className="atlas-root relative isolate grid h-full min-h-0 w-full flex-1 overflow-hidden bg-atlas-page text-atlas-text"
      data-tab="globe"
      style={FRAME_GRID}
    >
      <AtlasPortalContext.Provider value={root}>
        <InspectorProvider>
          <h1 className="sr-only">Globe</h1>
          <div className="min-w-0" style={{ gridArea: 'top' }}>
            <TopRail />
          </div>
          <main
            aria-label="Map and timeline"
            className="relative mx-2 flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl bg-atlas-panel"
            style={{ gridArea: 'stage' }}
          >
            <div className="relative min-h-0 flex-1">
              <MapStage>
                <AtlasGlobe />
              </MapStage>
              <RingStage />
              <RiverView />
              {!isPhone && <CardsLayer />}
              {isPhone ? <PhoneOverlays /> : <InspectorRegion />}
              <HoverLayer />
            </div>
            {!isPhone && <StageDock />}
            <StageFoot />
          </main>
          <div className="min-w-0" style={{ gridArea: 'bottom' }}>
            <BottomRail />
          </div>
        </InspectorProvider>
        <AtlasUrlSync />
      </AtlasPortalContext.Provider>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AtlasStoreProvider>
        <AtlasNavigationProvider>
          <TimeCameraProvider>
            <AtlasMapProvider>
              <StageSignalsProvider>
                <IntroProvider>
                  <AppLayout />
                </IntroProvider>
              </StageSignalsProvider>
            </AtlasMapProvider>
          </TimeCameraProvider>
        </AtlasNavigationProvider>
      </AtlasStoreProvider>
    </ErrorBoundary>
  );
}
