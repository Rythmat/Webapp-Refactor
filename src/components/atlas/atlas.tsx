import './index.css';
import {
  Component,
  Suspense,
  lazy,
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AtlasGlobe } from '@/components/atlas/components/Globe';
import { SHOWS_OSM_DATA } from '@/components/atlas/components/Globe/basemapConfig';
import { ArtistPanel } from '@/components/atlas/components/UI/ArtistPanel';
import { AtlasToolbar } from '@/components/atlas/components/UI/AtlasToolbar';
import { DetailsCard } from '@/components/atlas/components/UI/DetailsCard';
import { GuidedTourBar } from '@/components/atlas/components/UI/GuidedTourBar';
import { MapControls } from '@/components/atlas/components/UI/MapControls';
import { MapCredit } from '@/components/atlas/components/UI/MapCredit';
import { ModuleProgressBar } from '@/components/atlas/components/UI/ModuleProgressBar';
import { RegionTimeline } from '@/components/atlas/components/UI/RegionTimeline';
import { SearchResultsPanel } from '@/components/atlas/components/UI/SearchResultsPanel';
import {
  ATLAS_HEADING,
  ATLAS_SURFACE,
} from '@/components/atlas/components/UI/primitives';
import { useIsPhone } from '@/components/atlas/hooks/useMediaQuery';
import {
  DesktopZones,
  PhoneZones,
  type BottomBarSlot,
  type LeftPanelSlot,
} from '@/components/atlas/layout/AtlasZones';
import { AtlasPortalContext } from '@/components/atlas/layout/portalRoot';
import { stopKey } from '@/components/atlas/navigation/atlasStop';
import {
  AtlasNavigationProvider,
  useAtlasNavigate,
  useAtlasParams,
  useAtlasStop,
} from '@/components/atlas/navigation/useAtlasNavigate';
import { useAtlasUrlSync } from '@/components/atlas/navigation/useAtlasUrlSync';
import {
  AtlasStoreProvider,
  useAtlasDispatch,
  useAtlasSelector,
} from '@/components/atlas/state/atlasStore';
import type { MapInsets } from '@/components/atlas/types';
import { cn } from '@/lib/utils';

// A Cortex lesson's Promoter mind map (`?mindmap=1`), loaded only when asked.
const MindMapPanel = lazy(
  () => import('@/components/atlas/components/MindMap/MindMapPanel'),
);

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
        <div className="atlas-root flex h-screen w-screen items-center justify-center bg-atlas-page p-8 text-atlas-text">
          <div
            className={cn(ATLAS_SURFACE, 'max-w-lg border-atlas-danger/40 p-6')}
          >
            <h1 className={`mb-3 ${ATLAS_HEADING}`}>Something went wrong</h1>
            <pre className="whitespace-pre-wrap text-sm text-atlas-danger">
              {this.state.error.message}
            </pre>
            <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap text-xs text-atlas-text-2">
              {this.state.error.stack}
            </pre>
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
 * The left panel follows the stop: an artist or a search has its own panel;
 * otherwise the selected region's details card.
 */
function useLeftPanel(): LeftPanelSlot | null {
  const navigate = useAtlasNavigate();
  const stop = useAtlasStop();
  const place = useAtlasSelector((s) =>
    s.selectedLocation !== null &&
    (s.activeTour === null || s.pinnedEvent !== null)
      ? s.selectedLocation
      : null,
  );
  return useMemo(() => {
    const onClose = navigate.home;
    if (stop.kind === 'artist') {
      return {
        key: stopKey(stop),
        node: <ArtistPanel name={stop.artist} />,
        onClose,
      };
    }
    if (stop.kind === 'search') {
      return {
        key: stopKey(stop),
        node: <SearchResultsPanel query={stop.query} />,
        onClose,
      };
    }
    if (!place) return null;
    return {
      key: stopKey({ kind: 'place', place }),
      node: <DetailsCard />,
      onClose,
    };
  }, [navigate, stop, place]);
}

/** A Cortex lesson's mind map, when the URL asks for it. */
function useMindMap(): ReactNode | null {
  // Not a stop param, so it stays on the URL however the student explores.
  const open = useAtlasParams((params) => params.get('mindmap') === '1');
  return useMemo(
    () =>
      open ? (
        <Suspense fallback={null}>
          <MindMapPanel />
        </Suspense>
      ) : null,
    [open],
  );
}

const TIMELINE: BottomBarSlot = {
  label: 'timeline',
  maxWidth: 800,
  node: <RegionTimeline />,
};
const PATHWAY: BottomBarSlot = {
  label: 'pathway',
  maxWidth: 640,
  node: <ModuleProgressBar />,
};
const TOUR: BottomBarSlot = {
  label: 'tour',
  maxWidth: 640,
  node: <GuidedTourBar />,
};

/** The bottom bar: a pathway's or a tour's progress, else the timeline. */
function useBottomBar(): BottomBarSlot {
  const inModule = useAtlasSelector((s) => s.activeModule !== null);
  const inTour = useAtlasSelector((s) => s.activeTour !== null);
  return inTour ? TOUR : inModule ? PATHWAY : TIMELINE;
}

const CONTROLS = <MapControls />;
/** The map's OpenStreetMap credit, when it draws OpenStreetMap's data. */
const CREDIT = SHOWS_OSM_DATA ? <MapCredit /> : null;

/**
 * Everything over the globe, placed in its zone (layout/AtlasZones.tsx): a
 * grid on desktop, a bottom sheet on phones.
 */
function AtlasOverlays() {
  const isPhone = useIsPhone();
  const dispatch = useAtlasDispatch();
  const onSheetOcclusion = useCallback(
    (px: number | null) =>
      dispatch({ type: 'SET_SHEET_OCCLUSION', payload: px }),
    [dispatch],
  );
  // What the overlays cover of the map, for the MapLibre engine's padding
  // and framing (MapPadding, mapFraming.ts).
  const onInsets = useCallback(
    (insets: MapInsets) =>
      dispatch({ type: 'SET_MAP_INSETS', payload: insets }),
    [dispatch],
  );
  const zones = {
    left: useLeftPanel(),
    right: useMindMap(),
    controls: CONTROLS,
    bottom: useBottomBar(),
    credit: CREDIT,
    onInsets,
  };
  return isPhone ? (
    <PhoneZones {...zones} onSheetOcclusion={onSheetOcclusion} />
  ) : (
    <DesktopZones {...zones} />
  );
}

/**
 * The page's frame. It subscribes to nothing, so a dispatch or a URL change
 * re-renders only the pieces that read it — the globe in particular.
 */
function AppLayout() {
  // The root, for the palette's and the popovers' portals (layout/portalRoot).
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  return (
    <div
      ref={setRoot}
      // isolate: the page's z-index layers (theme/layers.ts) order its own
      // pieces and never compete with the app around it.
      className="atlas-root isolate flex h-full w-full flex-col overflow-hidden bg-atlas-page text-atlas-text"
      data-tab="globe"
    >
      <AtlasPortalContext.Provider value={root}>
        <AtlasToolbar />
        <div className="relative flex-1">
          <AtlasGlobe />
          <AtlasOverlays />
        </div>
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
          <AppLayout />
        </AtlasNavigationProvider>
      </AtlasStoreProvider>
    </ErrorBoundary>
  );
}
