import React, { useState, useRef, useCallback, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Search, Play, Pause, Trash2, Music, Tag, X, Loader2, Library } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useReferenceLibrary } from '@/studio-daw/hooks/use-reference-library'
import { getEffectiveBPM, getEffectiveKey, type ReferenceTrack } from '@/studio-daw/types/reference-library'
import { GENRE_OPTIONS } from '@/studio-daw/components/AIPromptPanel'

interface ReferenceLibraryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (track: ReferenceTrack) => void
}

const ReferenceLibraryDialog: React.FC<ReferenceLibraryDialogProps> = ({
  open,
  onOpenChange,
  onSelect,
}) => {
  const { tracks, loading, applyFilters, remove } = useReferenceLibrary()
  const [searchQuery, setSearchQuery] = useState('')
  const [genreFilter, setGenreFilter] = useState('')
  const [playingId, setPlayingId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Refresh when dialog opens
  useEffect(() => {
    if (open) {
      applyFilters({ search: searchQuery, genre: genreFilter || undefined })
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = useCallback(() => {
    applyFilters({ search: searchQuery, genre: genreFilter || undefined })
  }, [searchQuery, genreFilter, applyFilters])

  const handleGenreChange = useCallback((genre: string) => {
    setGenreFilter(genre)
    applyFilters({ search: searchQuery, genre: genre || undefined })
  }, [searchQuery, applyFilters])

  const handlePlay = useCallback((track: ReferenceTrack) => {
    if (playingId === track.id) {
      audioRef.current?.pause()
      setPlayingId(null)
      return
    }

    if (audioRef.current) {
      audioRef.current.pause()
    }
    const audio = new Audio(track.storage_url)
    audio.onended = () => setPlayingId(null)
    audio.play()
    audioRef.current = audio
    setPlayingId(track.id)
  }, [playingId])

  const handleSelect = useCallback((track: ReferenceTrack) => {
    if (audioRef.current) {
      audioRef.current.pause()
      setPlayingId(null)
    }
    onSelect(track)
    onOpenChange(false)
  }, [onSelect, onOpenChange])

  const handleDelete = useCallback(async (track: ReferenceTrack) => {
    if (playingId === track.id) {
      audioRef.current?.pause()
      setPlayingId(null)
    }
    await remove(track.id, track.storage_path)
  }, [playingId, remove])

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      audioRef.current?.pause()
    }
  }, [])

  const formatDuration = (s: number) => {
    const min = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${min}:${sec.toString().padStart(2, '0')}`
  }

  // Unique genres from GENRE_OPTIONS for filter
  const genreCategories = GENRE_OPTIONS.reduce<Record<string, typeof GENRE_OPTIONS>>((acc, g) => {
    (acc[g.category] ??= []).push(g)
    return acc
  }, {})

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1e1e1e] border-[#444] text-white max-w-[800px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-white text-base font-bold flex items-center gap-2">
            <Library size={16} className="text-purple-400" />
            Reference Audio Library
          </DialogTitle>
          <DialogDescription className="text-white/40 text-xs">
            Browse and select saved reference tracks for generation.
          </DialogDescription>
        </DialogHeader>

        {/* Search + Filters */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search by name, genre, tags..."
                className="w-full pl-9 pr-3 py-2 bg-[#111] border border-[#444] rounded-md text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50"
              />
            </div>
            <select
              value={genreFilter}
              onChange={(e) => handleGenreChange(e.target.value)}
              className="px-3 py-2 bg-[#111] border border-[#444] rounded-md text-sm text-white focus:outline-none focus:border-purple-500/50"
            >
              <option value="">All Genres</option>
              {Object.entries(genreCategories).map(([cat, genres]) => (
                <optgroup key={cat} label={cat}>
                  {genres.map(g => (
                    <option key={g.id} value={g.id}>{g.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        </div>

        {/* Track List */}
        <div className="flex-1 overflow-y-auto space-y-2 min-h-0 py-2">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className="animate-spin text-white/30" />
            </div>
          )}

          {!loading && tracks.length === 0 && (
            <div className="text-center py-12">
              <Music size={32} className="mx-auto mb-3 text-white/15" />
              <p className="text-sm text-white/40">No reference tracks yet.</p>
              <p className="text-xs text-white/20 mt-1">Upload a reference audio file and save it to your library.</p>
            </div>
          )}

          {tracks.map(track => {
            const bpm = getEffectiveBPM(track)
            const key = getEffectiveKey(track)
            const isPlaying = playingId === track.id

            return (
              <div
                key={track.id}
                className="flex items-center gap-3 px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg hover:bg-white/8 transition-colors group"
              >
                {/* Play button */}
                <button
                  type="button"
                  onClick={() => handlePlay(track)}
                  className={cn(
                    "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all",
                    isPlaying
                      ? "bg-purple-500 text-white"
                      : "bg-white/10 text-white/40 hover:bg-white/20 hover:text-white"
                  )}
                >
                  {isPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
                </button>

                {/* Track info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{track.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-white/30">{formatDuration(track.duration_seconds)}</span>
                    {bpm && <span className="text-[10px] text-white/40">{Math.round(bpm)} BPM</span>}
                    {key && <span className="text-[10px] text-white/40">{key}</span>}
                    {track.genre && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-purple-500/10 border border-purple-500/20 rounded text-purple-400/70">
                        {GENRE_OPTIONS.find(g => g.id === track.genre)?.label || track.genre}
                      </span>
                    )}
                  </div>
                  {track.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {track.tags.map(tag => (
                        <span key={tag} className="text-[9px] px-1.5 py-0.5 bg-white/5 rounded text-white/30">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="sm"
                    onClick={() => handleSelect(track)}
                    className="h-7 px-3 text-[10px] bg-purple-500/20 border border-purple-500/40 text-purple-300 hover:bg-purple-500/30"
                  >
                    Select
                  </Button>
                  <button
                    type="button"
                    onClick={() => handleDelete(track)}
                    className="p-1.5 text-white/20 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ReferenceLibraryDialog
