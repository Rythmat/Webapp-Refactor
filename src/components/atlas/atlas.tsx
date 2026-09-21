import './index.css';
import { Component, type ReactNode } from 'react';
import { BaseGlobe } from '@/components/atlas/components/Globe';
import { ArtistPanel } from '@/components/atlas/components/UI/ArtistPanel';
import { AtlasToolbar } from '@/components/atlas/components/UI/AtlasToolbar';
import { DetailsCard } from '@/components/atlas/components/UI/DetailsCard';
import { GuidedTourBar } from '@/components/atlas/components/UI/GuidedTourBar';
import { ModuleProgressBar } from '@/components/atlas/components/UI/ModuleProgressBar';
import { RegionTimeline } from '@/components/atlas/components/UI/RegionTimeline';
import { SearchResultsPanel } from '@/components/atlas/components/UI/SearchResultsPanel';
import {
  AppProvider,
  useAppState,
} from '@/components/atlas/context/AppContext';
import { useAtlasStop } from '@/components/atlas/navigation/useAtlasNavigate';
import { useAtlasUrlSync } from '@/components/atlas/navigation/useAtlasUrlSync';

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
        <div className="flex h-screen w-screen items-center justify-center bg-[#0d0b08] p-8 text-white">
          <div className="max-w-lg rounded-2xl border border-[#f26255]/30 bg-[#f26255]/10 p-6 backdrop-blur-md">
            <h1 className="mb-3 text-2xl font-medium text-white">
              Something went wrong
            </h1>
            <pre className="whitespace-pre-wrap text-sm text-white/80">
              {this.state.error.message}
            </pre>
            <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap text-xs text-white/50">
              {this.state.error.stack}
            </pre>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppLayout() {
  const { selectedLocation, activeModule, activeTour, pinnedEvent } =
    useAppState();
  const stop = useAtlasStop();
  // The URL is the source of truth for what the globe shows — every param a
  // deep-link, bookmark, lesson link, or Back press can carry is applied here.
  useAtlasUrlSync();

  // The left panel follows the stop: an artist or a search has its own panel;
  // otherwise the selected region's details card.
  const sidePanel =
    stop.kind === 'artist' ? (
      <ArtistPanel name={stop.artist} />
    ) : stop.kind === 'search' ? (
      <SearchResultsPanel query={stop.query} />
    ) : selectedLocation && (!activeTour || pinnedEvent) ? (
      <DetailsCard />
    ) : null;

  return (
    <div
      className="atlas-root flex h-full w-full flex-col overflow-hidden bg-[#0d0b08] text-white"
      data-tab="globe"
    >
      <AtlasToolbar />
      <div className="relative flex-1">
        <BaseGlobe />
        {sidePanel}
        {!activeModule && !activeTour && <RegionTimeline />}
        {activeModule && <ModuleProgressBar />}
        {activeTour && <GuidedTourBar />}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AppLayout />
      </AppProvider>
    </ErrorBoundary>
  );
}
