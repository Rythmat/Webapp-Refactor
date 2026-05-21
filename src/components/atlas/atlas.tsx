import './index.css';
import { Component, useEffect, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BaseGlobe } from '@/components/atlas/components/Globe';
import { AIInsightPanel } from '@/components/atlas/components/UI/AIInsightPanel';
import { DetailsCard } from '@/components/atlas/components/UI/DetailsCard';
import { EraPicker } from '@/components/atlas/components/UI/EraPicker';
import { ModulePicker } from '@/components/atlas/components/UI/ModulePicker';
import { ModuleProgressBar } from '@/components/atlas/components/UI/ModuleProgressBar';
import { RegionTimeline } from '@/components/atlas/components/UI/RegionTimeline';
import { SearchResults } from '@/components/atlas/components/UI/SearchResults';
import { TopBar } from '@/components/atlas/components/UI/TopBar';
import {
  AppProvider,
  useAppState,
  useAppDispatch,
} from '@/components/atlas/context/AppContext';
import { MUSIC_HISTORY } from '@/components/atlas/data';

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
        <div className="flex h-screen w-screen items-center justify-center bg-red-950 p-8 text-white">
          <div>
            <h1 className="mb-4 text-2xl font-bold">Something went wrong</h1>
            <pre className="whitespace-pre-wrap text-sm text-red-300">
              {this.state.error.message}
            </pre>
            <pre className="mt-2 whitespace-pre-wrap text-xs text-red-400">
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
  const { selectedLocation, searchResults, aiInsight, activeModule } =
    useAppState();
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  const hasAI = aiInsight.status !== 'idle';

  // Handle ?event=song-xxx URL parameter — pin event and fly to location
  useEffect(() => {
    const eventId = searchParams.get('event');
    if (!eventId) return;
    const event = MUSIC_HISTORY.find((e) => e.id === eventId);
    if (event) {
      // Show the event in search results panel
      dispatch({ type: 'SET_SEARCH_RESULTS', payload: [event] });
      // Pin it so it's highlighted
      dispatch({ type: 'PIN_EVENT', payload: event });
      // Fly the camera to the event location
      dispatch({
        type: 'EXECUTE_SEARCH',
        payload: {
          lat: event.location.lat,
          lng: event.location.lng,
          zoom: 6,
        },
      });
    }
  }, [searchParams, dispatch]);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-zinc-950 text-white">
      <div className="relative flex-1">
        <TopBar />
        <BaseGlobe />
        {searchResults.length > 0 && <SearchResults />}
        {hasAI && <AIInsightPanel />}
        {selectedLocation && searchResults.length === 0 && !hasAI && (
          <DetailsCard />
        )}
        {searchResults.length === 0 && !hasAI && !activeModule && (
          <RegionTimeline />
        )}
        {activeModule && <ModuleProgressBar />}
        <div className="absolute right-4 top-4 z-[1000] flex items-start gap-2">
          <EraPicker />
          <ModulePicker />
        </div>
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
