import { X, Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { useAppState } from '@/components/atlas/context/AppContext';
import { useAIAnalysis } from '@/components/atlas/hooks/useAIAnalysis';
import { useMusicSearch } from '@/components/atlas/hooks/useMusicSearch';
import { MarkdownRenderer } from './MarkdownRenderer';

export function AIInsightPanel() {
  const { aiInsight, searchQuery, searchResults } = useAppState();
  const { cancel, analyze } = useAIAnalysis();
  const search = useMusicSearch();

  if (aiInsight.status === 'idle') return null;

  const handleClose = () => {
    cancel();
  };

  const handleRetry = () => {
    const { parsed } = search(searchQuery);
    analyze(searchQuery, parsed, searchResults);
  };

  return (
    <div className="absolute left-4 top-14 z-[1000] flex max-h-[calc(100%-6rem)] w-[32rem] flex-col rounded-xl border border-zinc-700/50 bg-zinc-900/85 shadow-2xl backdrop-blur-xl">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-zinc-800/50 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <Sparkles className="size-4 shrink-0 text-teal-400" />
          <p className="truncate text-sm text-zinc-300">
            <span className="font-medium text-teal-400">
              "{aiInsight.query}"
            </span>
          </p>
          {aiInsight.status === 'streaming' && (
            <Loader2 className="size-3.5 shrink-0 animate-spin text-teal-400" />
          )}
        </div>
        <button
          className="ml-2 shrink-0 text-zinc-500 transition-colors hover:text-white"
          onClick={handleClose}
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Content */}
      <div className="overflow-y-auto p-4">
        {aiInsight.status === 'loading' && (
          <div className="flex items-center justify-center gap-3 py-12">
            <Loader2 className="size-5 animate-spin text-teal-400" />
            <span className="text-sm text-zinc-400">
              Researching the musical landscape...
            </span>
          </div>
        )}

        {(aiInsight.status === 'streaming' || aiInsight.status === 'done') && (
          <MarkdownRenderer content={aiInsight.content} />
        )}

        {aiInsight.status === 'error' && (
          <div className="flex flex-col items-center gap-3 py-12">
            <p className="text-center text-sm text-red-400">
              {aiInsight.error}
            </p>
            <button
              className="flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:bg-zinc-700"
              onClick={handleRetry}
            >
              <RefreshCw className="size-3.5" />
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
