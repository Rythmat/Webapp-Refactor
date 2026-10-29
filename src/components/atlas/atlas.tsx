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
import { SideRail } from '@/components/atlas/components/Frame/SideRail';
import {
  StageDock,
  useBottomBar,
} from '@/components/atlas/components/Frame/StageDock';
import { TopRail } from '@/components/atlas/components/Frame/TopRail';
import { AtlasGlobe } from '@/components/atlas/components/Globe';
import { AtlasMapProvider } from '@/components/atlas/components/Globe/mapHandle';
import {
  ATLAS_HEADING,
  ATLAS_SURFACE,
} from '@/components/atlas/components/UI/primitives';
import { useIsPhone } from '@/components/atlas/hooks/useMediaQuery';
import { PhoneZones } from '@/components/atlas/layout/AtlasZones';
import { InspectorRegion } from '@/components/atlas/layout/InspectorRegion';
import { FRAME_PX } from '@/components/atlas/layout/frameGeometry';
import { AtlasPortalContext } from '@/components/atlas/layout/portalRoot';
import {
  InspectorProvider,
  useInspectorState,
} from '@/components/atlas/layout/useInspector';
import { isTimelineView } from '@/components/atlas/navigation/atlasFrame';
import {
  AtlasNavigationProvider,
  useAtlasFrame,
} from '@/components/atlas/navigation/useAtlasNavigate';
import { useAtlasUrlSync } from '@/components/atlas/navigation/useAtlasUrlSync';
import {
  AtlasStoreProvider,
  useAtlasDispatch,
} from '@/components/atlas/state/atlasStore';
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
  return (
    <div className="pointer-events-none absolute inset-0">
      <PhoneZones bottom={bottom} inspector={slot} onInsets={onInsets} />
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

const DESKTOP_GRID: CSSProperties = {
  gridTemplateAreas: '"top top" "stage rail" "bottom bottom"',
  gridTemplateRows: `${FRAME_PX.top}px minmax(0, 1fr) ${FRAME_PX.bottom}px`,
  gridTemplateColumns: `minmax(0, 1fr) ${FRAME_PX.rail}px`,
};
const PHONE_GRID: CSSProperties = {
  gridTemplateAreas: '"top" "stage" "bottom"',
  gridTemplateRows: `${FRAME_PX.top}px minmax(0, 1fr) ${FRAME_PX.bottom}px`,
  gridTemplateColumns: 'minmax(0, 1fr)',
};

/**
 * The page's frame, the Studio's (owner, 2026-10-29): the top rail; the stage
 * card holding the map or the timeline, the Inspector over its right edge,
 * the dock under it and the era rail at its foot; the side rail of panels;
 * the bottom rail. It subscribes to nothing but the screen's size, so a
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
      style={isPhone ? PHONE_GRID : DESKTOP_GRID}
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
              <RiverView />
              {isPhone ? <PhoneOverlays /> : <InspectorRegion />}
            </div>
            {!isPhone && <StageDock />}
            <StageFoot />
          </main>
          {!isPhone && (
            <div className="min-h-0" style={{ gridArea: 'rail' }}>
              <SideRail />
            </div>
          )}
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
              <AppLayout />
            </AtlasMapProvider>
          </TimeCameraProvider>
        </AtlasNavigationProvider>
      </AtlasStoreProvider>
    </ErrorBoundary>
  );
}
