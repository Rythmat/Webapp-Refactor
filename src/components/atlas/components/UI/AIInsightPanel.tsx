import { X, Sparkles, Loader2, RefreshCw } from 'lucide-react'
import { useAppState } from '@/components/atlas/context/AppContext'
import { useAIAnalysis } from '@/components/atlas/hooks/useAIAnalysis'
import { useMusicSearch } from '@/components/atlas/hooks/useMusicSearch'
import { MarkdownRenderer } from './MarkdownRenderer'

export function AIInsightPanel() {
  const { aiInsight, searchQuery, searchResults } = useAppState()
  const { cancel, analyze } = useAIAnalysis()
  const search = useMusicSearch()

  if (aiInsight.status === 'idle') return null

  const handleClose = () => {
    cancel()
  }

  const handleRetry = () => {
    const { parsed } = search(searchQuery)
    analyze(searchQuery, parsed, searchResults)
  }

  return (
    <div className="absolute left-4 top-14 z-[1000] w-[32rem] max-h-[calc(100%-6rem)] bg-zinc-900/85 backdrop-blur-xl border border-zinc-700/50 rounded-xl shadow-2xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/50 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="w-4 h-4 text-teal-400 shrink-0" />
          <p className="text-sm text-zinc-300 truncate">
            <span className="text-teal-400 font-medium">"{aiInsight.query}"</span>
          </p>
          {aiInsight.status === 'streaming' && (
            <Loader2 className="w-3.5 h-3.5 text-teal-400 animate-spin shrink-0" />
          )}
        </div>
        <button
          onClick={handleClose}
          className="text-zinc-500 hover:text-white transition-colors shrink-0 ml-2"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="overflow-y-auto p-4">
        {aiInsight.status === 'loading' && (
          <div className="flex items-center gap-3 py-12 justify-center">
            <Loader2 className="w-5 h-5 text-teal-400 animate-spin" />
            <span className="text-zinc-400 text-sm">Researching the musical landscape...</span>
          </div>
        )}

        {(aiInsight.status === 'streaming' || aiInsight.status === 'done') && (
          <MarkdownRenderer content={aiInsight.content} />
        )}

        {aiInsight.status === 'error' && (
          <div className="flex flex-col items-center gap-3 py-12">
            <p className="text-red-400 text-sm text-center">{aiInsight.error}</p>
            <button
              onClick={handleRetry}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-lg transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
