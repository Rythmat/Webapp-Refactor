import { useState, useCallback, useEffect } from 'react'
import type { ReferenceTrack, ReferenceTrackUpdate, ReferenceLibraryFilters } from '@/studio-daw/types/reference-library'
import {
  fetchReferenceLibrary,
  updateReferenceTrack,
  deleteReferenceTrack,
} from '@/studio-daw/services/reference-library'

export function useReferenceLibrary() {
  const [tracks, setTracks] = useState<ReferenceTrack[]>([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState<ReferenceLibraryFilters>({})

  const refresh = useCallback(async (f?: ReferenceLibraryFilters) => {
    setLoading(true)
    try {
      const result = await fetchReferenceLibrary(f ?? filters)
      setTracks(result)
    } finally {
      setLoading(false)
    }
  }, [filters])

  const applyFilters = useCallback(async (newFilters: ReferenceLibraryFilters) => {
    setFilters(newFilters)
    setLoading(true)
    try {
      const result = await fetchReferenceLibrary(newFilters)
      setTracks(result)
    } finally {
      setLoading(false)
    }
  }, [])

  const update = useCallback(async (id: string, updates: ReferenceTrackUpdate) => {
    const updated = await updateReferenceTrack(id, updates)
    if (updated) {
      setTracks(prev => prev.map(t => t.id === id ? updated : t))
    }
    return updated
  }, [])

  const remove = useCallback(async (id: string, storagePath: string) => {
    const ok = await deleteReferenceTrack(id, storagePath)
    if (ok) {
      setTracks(prev => prev.filter(t => t.id !== id))
    }
    return ok
  }, [])

  // Load on mount
  useEffect(() => {
    refresh()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { tracks, loading, filters, refresh, applyFilters, update, remove }
}
