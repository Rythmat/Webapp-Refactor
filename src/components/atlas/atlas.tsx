import './index.css';
import { Component, Suspense, lazy, type ReactNode } from 'react';
import { BaseGlobe } from '@/components/atlas/components/Globe';
import { ArtistPanel } from '@/components/atlas/components/UI/ArtistPanel';
import { AtlasToolbar } from '@/components/atlas/components/UI/AtlasToolbar';
import { DetailsCard } from '@/components/atlas/components/UI/DetailsCard';
import { GlobeSpinToggle } from '@/components/atlas/components/UI/GlobeSpinToggle';
import { GuidedTourBar } from '@/components/atlas/components/UI/GuidedTourBar';
import { ModuleProgressBar } from '@/components/atlas/components/UI/ModuleProgressBar';
import { RegionTimeline } from '@/components/atlas/components/UI/RegionTimeline';
import { SearchResultsPanel } from '@/components/atlas/components/UI/SearchResultsPanel';
import {
  ATLAS_HEADING,
  ATLAS_SURFACE,
} from '@/components/atlas/components/UI/primitives';
import {
  AtlasNavigationProvider,
  useAtlasParams,
  useAtlasStop,
} from '@/components/atlas/navigation/useAtlasNavigate';
import { useAtlasUrlSync } from '@/components/atlas/navigation/useAtlasUrlSync';
import {
  AtlasStoreProvider,
  useAtlasSelector,
} from '@/components/atlas/state/atlasStore';
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
function LeftPanel() {
  const stop = useAtlasStop();
  const showDetails = useAtlasSelector(
    (s) =>
      s.selectedLocation !== null &&
      (s.activeTour === null || s.pinnedEvent !== null),
  );
  if (stop.kind === 'artist') return <ArtistPanel name={stop.artist} />;
  if (stop.kind === 'search') return <SearchResultsPanel query={stop.query} />;
  return showDetails ? <DetailsCard /> : null;
}

function MindMap() {
  // Not a stop param, so it stays on the URL however the student explores.
  const open = useAtlasParams((params) => params.get('mindmap') === '1');
  if (!open) return null;
  return (
    <Suspense fallback={null}>
      <MindMapPanel />
    </Suspense>
  );
}

/**
 * The page's frame. It subscribes to two booleans and nothing else, so a
 * dispatch or a URL change re-renders only the pieces that read it — the
 * globe in particular.
 */
function AppLayout() {
  const inModule = useAtlasSelector((s) => s.activeModule !== null);
  const inTour = useAtlasSelector((s) => s.activeTour !== null);

  return (
    <div
      className="atlas-root flex h-full w-full flex-col overflow-hidden bg-atlas-page text-atlas-text"
      data-tab="globe"
    >
      <AtlasToolbar />
      <div className="relative flex-1">
        <BaseGlobe />
        <GlobeSpinToggle />
        <LeftPanel />
        {!inModule && !inTour && <RegionTimeline />}
        {inModule && <ModuleProgressBar />}
        {inTour && <GuidedTourBar />}
        <MindMap />
      </div>
      <AtlasUrlSync />
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
