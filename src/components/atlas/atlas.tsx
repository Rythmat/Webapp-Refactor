import './index.css';
import { Component, useEffect, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BaseGlobe } from '@/components/atlas/components/Globe';
import { DetailsCard } from '@/components/atlas/components/UI/DetailsCard';
import { GuidedTourBar } from '@/components/atlas/components/UI/GuidedTourBar';
import { ModuleProgressBar } from '@/components/atlas/components/UI/ModuleProgressBar';
import { RegionTimeline } from '@/components/atlas/components/UI/RegionTimeline';
import {
  AppProvider,
  useAppState,
  useAppDispatch,
} from '@/components/atlas/context/AppContext';
import {
  HISTORICAL_MODULES,
  MUSIC_HISTORY,
  MUSICAL_ERAS,
  getTour,
} from '@/components/atlas/data';
import { useStartPathway, useStartTour } from '@/components/atlas/hooks';
import { resolveEventRegion } from '@/components/atlas/utils/resolveEventRegion';

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
  const dispatch = useAppDispatch();
  const startPathway = useStartPathway();
  const startTour = useStartTour();
  const [searchParams] = useSearchParams();

  // Handle ?event=song-xxx URL parameter — select the event's region, pin the
  // event, and fly the camera to it.
  useEffect(() => {
    const eventId = searchParams.get('event');
    if (!eventId) return;
    const event = MUSIC_HISTORY.find((e) => e.id === eventId);
    if (!event) return;

    // Resolve the event to a selectable region + a camera target that frames it
    // (e.g. Honolulu → Hawaii state, flying to the state centroid).
    const { region, fly } = resolveEventRegion(event);
    // Clear any search results so the region's DetailsCard / RegionTimeline show.
    dispatch({ type: 'SET_SEARCH_RESULTS', payload: [] });
    // SELECT_LOCATION resets pinnedEvent, so it must run BEFORE PIN_EVENT.
    if (region) dispatch({ type: 'SELECT_LOCATION', payload: region });
    dispatch({ type: 'PIN_EVENT', payload: event });
    // Fly the camera to the selected region (or the event if unmatched).
    dispatch({ type: 'EXECUTE_SEARCH', payload: fly });
  }, [searchParams, dispatch]);

  // Handle ?pathway=<moduleId> URL parameter — auto-start a guided Pathway
  // (fly to its first stop + show the progress bar). GlobeController applies
  // the fly target once the globe reports ready, so this works on cold load.
  useEffect(() => {
    const pathwayId = searchParams.get('pathway');
    if (!pathwayId) return;
    if (!HISTORICAL_MODULES.some((m) => m.id === pathwayId)) return;
    startPathway(pathwayId);
  }, [searchParams, startPathway]);

  // Handle ?tour=<tourId> URL parameter — auto-start a place-based Guided Tour
  // (region or city): fly to its first stop and show the GuidedTourBar. Like
  // the pathway deep-link, the fly is applied once the globe reports ready.
  useEffect(() => {
    const tourId = searchParams.get('tour');
    if (!tourId || !getTour(tourId)) return;
    startTour(tourId);
  }, [searchParams, startTour]);

  // Handle ?era=<eraId> URL parameter — arm the timeline's era filter (set from
  // the dashboard's Eras tab). RegionTimeline filters its events to the era's
  // year range and shows the era label.
  useEffect(() => {
    const eraId = searchParams.get('era');
    if (!eraId || !MUSICAL_ERAS.some((e) => e.id === eraId)) return;
    dispatch({ type: 'SET_ERA', payload: eraId });
  }, [searchParams, dispatch]);

  return (
    <div
      className="atlas-root flex h-full w-full flex-col overflow-hidden bg-[#0d0b08] text-white"
      data-tab="globe"
    >
      <div className="relative flex-1">
        <BaseGlobe />
        {selectedLocation && (!activeTour || pinnedEvent) && <DetailsCard />}
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
