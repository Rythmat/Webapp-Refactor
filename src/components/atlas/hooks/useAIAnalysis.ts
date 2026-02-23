import { useRef, useCallback } from 'react'
import { useAppDispatch } from '@/components/atlas/context/AppContext'
import { streamAIAnalysis, getCachedInsight, setCachedInsight } from '@/components/atlas/services/aiAnalysis'
import type { ParsedQuery } from '@/components/atlas/hooks/useMusicSearch'
import type { HistoricalEvent } from '@/components/atlas/types'

export function useAIAnalysis() {
  const dispatch = useAppDispatch()
  const abortRef = useRef<AbortController | null>(null)
  const contentRef = useRef('')
  const rafId = useRef<number>(0)
  const pendingText = useRef('')

  const analyze = useCallback(
    (query: string, parsed: ParsedQuery, localResults: HistoricalEvent[]) => {
      // Abort any in-flight request
      abortRef.current?.abort()
      abortRef.current = new AbortController()
      contentRef.current = ''
      pendingText.current = ''

      // Check cache
      const cached = getCachedInsight(query)
      if (cached) {
        dispatch({ type: 'AI_INSIGHT_START', payload: query })
        dispatch({ type: 'AI_INSIGHT_CHUNK', payload: cached })
        dispatch({ type: 'AI_INSIGHT_DONE' })
        return
      }

      dispatch({ type: 'AI_INSIGHT_START', payload: query })

      streamAIAnalysis(
        {
          query,
          city: parsed.city?.name,
          year: parsed.year,
          genres: parsed.genres,
          localResults: localResults.slice(0, 5).map((e) => ({
            title: e.title,
            year: e.year,
            genre: e.genre,
          })),
        },
        // onChunk — batch via requestAnimationFrame to avoid excessive re-renders
        (text) => {
          contentRef.current += text
          pendingText.current += text
          if (!rafId.current) {
            rafId.current = requestAnimationFrame(() => {
              dispatch({ type: 'AI_INSIGHT_CHUNK', payload: pendingText.current })
              pendingText.current = ''
              rafId.current = 0
            })
          }
        },
        // onDone
        () => {
          // Flush any remaining text
          if (pendingText.current) {
            cancelAnimationFrame(rafId.current)
            dispatch({ type: 'AI_INSIGHT_CHUNK', payload: pendingText.current })
            pendingText.current = ''
            rafId.current = 0
          }
          dispatch({ type: 'AI_INSIGHT_DONE' })
          setCachedInsight(query, contentRef.current)
        },
        // onError
        (error) => {
          dispatch({ type: 'AI_INSIGHT_ERROR', payload: error })
        },
        abortRef.current.signal,
      )
    },
    [dispatch],
  )

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    if (rafId.current) {
      cancelAnimationFrame(rafId.current)
      rafId.current = 0
    }
    dispatch({ type: 'AI_INSIGHT_CLEAR' })
  }, [dispatch])

  return { analyze, cancel }
}
