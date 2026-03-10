import './index.css';
import { Component, type ReactNode } from 'react';
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
} from '@/components/atlas/context/AppContext';

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
  const hasAI = aiInsight.status !== 'idle';

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
