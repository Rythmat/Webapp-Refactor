import './index.css';
import { Component, type ReactNode } from 'react'
import { AppProvider, useAppState } from '@/components/atlas/context/AppContext'
import { BaseGlobe } from '@/components/atlas/components/Globe'
import { TopBar } from '@/components/atlas/components/UI/TopBar'
import { DetailsCard } from '@/components/atlas/components/UI/DetailsCard'
import { SearchResults } from '@/components/atlas/components/UI/SearchResults'
import { AIInsightPanel } from '@/components/atlas/components/UI/AIInsightPanel'
import { RegionTimeline } from '@/components/atlas/components/UI/RegionTimeline'
import { ModulePicker } from '@/components/atlas/components/UI/ModulePicker'
import { EraPicker } from '@/components/atlas/components/UI/EraPicker'
import { ModuleProgressBar } from '@/components/atlas/components/UI/ModuleProgressBar'

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) { return { error } }
  render() {
    if (this.state.error) {
      return (
        <div className="h-screen w-screen flex items-center justify-center bg-red-950 text-white p-8">
          <div>
            <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
            <pre className="text-sm text-red-300 whitespace-pre-wrap">{this.state.error.message}</pre>
            <pre className="text-xs text-red-400 mt-2 whitespace-pre-wrap">{this.state.error.stack}</pre>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function AppLayout() {
  const { selectedLocation, searchResults, aiInsight, activeModule } = useAppState()
  const hasAI = aiInsight.status !== 'idle'

  return (
    <div className="h-screen w-screen flex flex-col bg-zinc-950 text-white overflow-hidden">
      <div className="flex-1 relative">
        <TopBar />
        <BaseGlobe />
        {searchResults.length > 0 && <SearchResults />}
        {hasAI && <AIInsightPanel />}
        {selectedLocation && searchResults.length === 0 && !hasAI && <DetailsCard />}
        {searchResults.length === 0 && !hasAI && !activeModule && <RegionTimeline />}
        {activeModule && <ModuleProgressBar />}
        <div className="absolute top-4 right-4 z-[1000] flex items-start gap-2">
          <EraPicker />
          <ModulePicker />
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AppLayout />
      </AppProvider>
    </ErrorBoundary>
  )
}
