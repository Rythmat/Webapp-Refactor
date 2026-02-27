import React, { useState, useCallback, useRef } from 'react'
import { Upload, FileAudio, X, Loader2, Save, ChevronDown, Library, Wand2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { analyzeBuffer, type AudioAnalysis } from '@/studio-daw/audio/audio-analysis'
import { suggestGenres, type GenreSuggestion } from '@/studio-daw/audio/genre-heuristics'
import { uploadReferenceFile, saveReferenceTrack } from '@/studio-daw/services/reference-library'
import type { ReferenceTrack } from '@/studio-daw/types/reference-library'
import { supabase } from '@/studio-daw/integrations/supabase/client'

interface ReferenceAnalysisPanelProps {
  /** Currently selected reference file */
  referenceFile: File | null
  /** Called when the reference file changes (null = cleared) */
  onReferenceFileChange: (file: File | null) => void
  /** Called when analysis produces BPM/key/genre/mood/instruments that should auto-apply to generation params */
  onAutoApply?: (params: { bpm?: number; key?: string; genre?: string; mood?: string; instruments?: string[] }) => void
  /** Called when user clicks "Generate Similar" — triggers generation directly from analysis */
  onGenerateFromAnalysis?: (params: {
    bpm: number; key: string; genre: string; mood: string;
    instruments: string[]; duration: number; referenceFile: File;
  }) => void
  /** Whether generation is in progress */
  isGenerating?: boolean
  /** Called to open the library browser dialog */
  onOpenLibrary?: () => void
  /** When a library track is loaded, display its metadata */
  libraryTrack?: ReferenceTrack | null
  /** Called when library track is cleared */
  onClearLibraryTrack?: () => void
}

const ReferenceAnalysisPanel: React.FC<ReferenceAnalysisPanelProps> = ({
  referenceFile,
  onReferenceFileChange,
  onAutoApply,
  onGenerateFromAnalysis,
  isGenerating,
  onOpenLibrary,
  libraryTrack,
  onClearLibraryTrack,
}) => {
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<AudioAnalysis | null>(null)
  const [genreSuggestions, setGenreSuggestions] = useState<GenreSuggestion[]>([])
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null)
  const [editBpm, setEditBpm] = useState<string>('')
  const [editKey, setEditKey] = useState<string>('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [saveToLibrary, setSaveToLibrary] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [duration, setDuration] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback(async (file: File) => {
    onReferenceFileChange(file)
    setAnalyzing(true)
    setAnalysis(null)
    setGenreSuggestions([])
    setSelectedGenre(null)
    setSaved(false)
    setSaveName(file.name.replace(/\.[^.]+$/, ''))

    try {
      const arrayBuffer = await file.arrayBuffer()
      const audioContext = new AudioContext()
      const buffer = await audioContext.decodeAudioData(arrayBuffer)
      setDuration(buffer.duration)

      const result = await analyzeBuffer(buffer)
      setAnalysis(result)

      // Set editable values from detection
      setEditBpm(result.bpm != null ? String(Math.round(result.bpm)) : '')
      setEditKey(result.key || '')

      // Genre suggestions
      const suggestions = suggestGenres(result)
      setGenreSuggestions(suggestions)

      // Auto-select top genre if confidence > 0.6
      const top = suggestions[0]
      if (top && top.confidence > 0.6) {
        setSelectedGenre(top.genre.id)
      }

      // Auto-apply detected values
      onAutoApply?.({
        bpm: result.bpm != null ? Math.round(result.bpm) : undefined,
        key: result.key || undefined,
        genre: top && top.confidence > 0.6 ? top.genre.id : undefined,
        mood: result.moodHint || undefined,
        instruments: result.instruments?.length ? result.instruments : undefined,
      })
    } catch (err) {
      console.error('[ReferenceAnalysis] Failed:', err)
    } finally {
      setAnalyzing(false)
    }
  }, [onReferenceFileChange, onAutoApply])

  const handleClear = useCallback(() => {
    onReferenceFileChange(null)
    setAnalysis(null)
    setGenreSuggestions([])
    setSelectedGenre(null)
    setEditBpm('')
    setEditKey('')
    setTags([])
    setSaved(false)
    setSaveToLibrary(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [onReferenceFileChange])

  const handleAddTag = useCallback(() => {
    const tag = tagInput.trim()
    if (tag && !tags.includes(tag)) {
      setTags(prev => [...prev, tag])
    }
    setTagInput('')
  }, [tagInput, tags])

  const handleSaveToLibrary = useCallback(async () => {
    if (!referenceFile || saving) return

    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.warn('[ReferenceAnalysis] No authenticated user')
        return
      }

      // Upload file to storage
      const uploaded = await uploadReferenceFile(referenceFile, user.id, referenceFile.name)
      if (!uploaded) return

      // Save metadata to database
      await saveReferenceTrack({
        user_id: user.id,
        name: saveName || referenceFile.name,
        storage_path: uploaded.path,
        storage_url: uploaded.url,
        detected_bpm: analysis?.bpm ?? null,
        detected_key: analysis?.key ?? null,
        spectral_centroid: analysis?.spectralCentroid ?? null,
        rms_level: analysis?.rmsLevel ?? null,
        is_percussive: analysis?.isPercussive ?? false,
        duration_seconds: duration,
        user_bpm: editBpm ? parseFloat(editBpm) : null,
        user_key: editKey || null,
        genre: selectedGenre || null,
        tags,
      })

      setSaved(true)
    } catch (err) {
      console.error('[ReferenceAnalysis] Save failed:', err)
    } finally {
      setSaving(false)
    }
  }, [referenceFile, saving, saveName, analysis, duration, editBpm, editKey, selectedGenre, tags])

  // Show library track info (selected from library browser)
  if (libraryTrack) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-3 px-4 py-3 bg-white/5 border border-white/10 rounded-xl">
          <Library size={16} className="text-purple-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white truncate">{libraryTrack.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              {(libraryTrack.user_bpm ?? libraryTrack.detected_bpm) && (
                <span className="text-[10px] text-white/40">{Math.round(libraryTrack.user_bpm ?? libraryTrack.detected_bpm!)} BPM</span>
              )}
              {(libraryTrack.user_key ?? libraryTrack.detected_key) && (
                <span className="text-[10px] text-white/40">{libraryTrack.user_key ?? libraryTrack.detected_key}</span>
              )}
              {libraryTrack.genre && (
                <span className="text-[10px] text-purple-400/60">{libraryTrack.genre}</span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClearLibraryTrack}
            className="p-1 text-white/30 hover:text-white/60 hover:bg-white/10 rounded transition-colors"
          >
            <X size={14} />
          </button>
        </div>
        {libraryTrack.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 px-1">
            {libraryTrack.tags.map(tag => (
              <span key={tag} className="px-2 py-0.5 text-[9px] bg-white/5 border border-white/10 rounded-full text-white/40">{tag}</span>
            ))}
          </div>
        )}
      </div>
    )
  }

  // No file — show upload + library button
  if (!referenceFile) {
    return (
      <div className="space-y-2">
        <div className="flex gap-2">
          <label className="flex-1 flex items-center justify-center gap-2 py-4 border-2 border-dashed border-white/15 rounded-xl cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all">
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,.mp3,.wav,.ogg,.flac"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFileSelect(file)
              }}
              className="hidden"
            />
            <Upload size={16} className="text-white/30" />
            <span className="text-sm text-white/40">Upload audio to match its style</span>
          </label>
          {onOpenLibrary && (
            <button
              type="button"
              onClick={onOpenLibrary}
              className="flex items-center gap-1.5 px-4 border-2 border-dashed border-white/15 rounded-xl text-white/40 hover:border-purple-400/40 hover:text-purple-400 hover:bg-purple-500/5 transition-all"
            >
              <Library size={16} />
              <span className="text-sm">Library</span>
            </button>
          )}
        </div>
        <p className="text-[10px] text-white/30 ml-1">Upload or pick a reference track to match its style and feel.</p>
      </div>
    )
  }

  // File selected — show analysis
  return (
    <div className="space-y-3">
      {/* File info bar */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white/5 border border-white/10 rounded-xl">
        <FileAudio size={16} className="text-primary flex-shrink-0" />
        <span className="text-sm text-white truncate flex-1">{referenceFile.name}</span>
        <button
          type="button"
          onClick={handleClear}
          className="p-1 text-white/30 hover:text-white/60 hover:bg-white/10 rounded transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Analyzing spinner */}
      {analyzing && (
        <div className="flex items-center gap-2 px-2">
          <Loader2 size={14} className="animate-spin text-primary" />
          <span className="text-xs text-white/50">Analyzing audio...</span>
        </div>
      )}

      {/* Analysis results */}
      {analysis && !analyzing && (
        <>
          {/* BPM and Key chips (editable) */}
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg">
              <span className="text-[9px] text-white/30 uppercase font-semibold">BPM</span>
              <input
                type="number"
                value={editBpm}
                onChange={(e) => setEditBpm(e.target.value)}
                placeholder="—"
                className="w-12 bg-transparent text-sm text-white text-center focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg">
              <span className="text-[9px] text-white/30 uppercase font-semibold">Key</span>
              <input
                type="text"
                value={editKey}
                onChange={(e) => setEditKey(e.target.value)}
                placeholder="—"
                className="w-20 bg-transparent text-sm text-white text-center focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg">
              <span className="text-[9px] text-white/30 uppercase font-semibold">Energy</span>
              <span className="text-sm text-white">{Math.round(analysis.rmsLevel * 100)}%</span>
            </div>
            {analysis.isPercussive && (
              <span className="flex items-center px-3 py-1.5 bg-orange-500/10 border border-orange-500/20 rounded-lg text-[10px] text-orange-400 font-semibold">
                Percussive
              </span>
            )}
          </div>

          {/* Genre suggestions */}
          {genreSuggestions.length > 0 && (
            <div>
              <span className="text-[9px] text-white/30 uppercase tracking-wider font-semibold ml-1">Suggested Genres</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {genreSuggestions.map(({ genre, confidence }) => (
                  <button
                    key={genre.id}
                    type="button"
                    onClick={() => {
                      const next = selectedGenre === genre.id ? null : genre.id
                      setSelectedGenre(next)
                      onAutoApply?.({ genre: next || undefined })
                    }}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-semibold border transition-all",
                      selectedGenre === genre.id
                        ? "bg-purple-500/30 border-purple-400 text-purple-300 ring-1 ring-purple-400/50"
                        : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white/70"
                    )}
                  >
                    {genre.label} <span className="text-white/20 ml-1">{Math.round(confidence * 100)}%</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Detected Instruments */}
          {analysis.instruments?.length > 0 && (
            <div>
              <span className="text-[9px] text-white/30 uppercase tracking-wider font-semibold ml-1">Detected Instruments</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {analysis.instruments.map((inst) => (
                  <span
                    key={inst}
                    className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 border border-emerald-500/30 text-emerald-300"
                  >
                    {inst}
                  </span>
                ))}
              </div>
              <p className="text-[10px] text-white/25 ml-1 mt-1">Generated music will feature these instruments.</p>
            </div>
          )}

          {/* Mood */}
          {analysis.moodHint && (
            <div className="flex items-center gap-1.5 ml-1">
              <span className="text-[9px] text-white/30 uppercase tracking-wider font-semibold">Mood</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 border border-amber-500/25 text-amber-300">
                {analysis.moodHint}
              </span>
            </div>
          )}

          {/* Tags */}
          <div>
            <span className="text-[9px] text-white/30 uppercase tracking-wider font-semibold ml-1">Tags</span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {tags.map(tag => (
                <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-white/5 border border-white/10 rounded-full text-xs text-white/50">
                  {tag}
                  <button type="button" onClick={() => setTags(prev => prev.filter(t => t !== tag))} className="hover:text-white">
                    <X size={10} />
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag() }}}
                placeholder="Add tag..."
                className="w-20 px-2 py-0.5 bg-transparent text-xs text-white/50 focus:outline-none placeholder:text-white/20"
              />
            </div>
          </div>

          {/* Generate Similar Track — primary action */}
          {onGenerateFromAnalysis && (
            <button
              type="button"
              disabled={isGenerating}
              onClick={() => {
                if (!referenceFile) return
                onGenerateFromAnalysis({
                  bpm: editBpm ? parseInt(editBpm) : (analysis?.bpm ? Math.round(analysis.bpm) : 120),
                  key: editKey || analysis?.key || '',
                  genre: selectedGenre || genreSuggestions[0]?.genre.id || '',
                  mood: analysis?.moodHint || 'calm',
                  instruments: analysis?.instruments || [],
                  duration: Math.min(Math.max(Math.round(duration), 15), 240),
                  referenceFile,
                })
              }}
              className={cn(
                "w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all",
                isGenerating
                  ? "bg-white/10 text-white/40 cursor-not-allowed"
                  : "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg shadow-purple-500/20"
              )}
            >
              {isGenerating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 size={16} />
                  Generate Similar Track
                </>
              )}
            </button>
          )}

          {/* Save to Library toggle */}
          <div className="border-t border-white/10 pt-3">
            <button
              type="button"
              onClick={() => setSaveToLibrary(!saveToLibrary)}
              className="flex items-center gap-2 text-xs text-white/40 hover:text-white/60 transition-colors"
            >
              <Save size={12} />
              Save to Library
              <ChevronDown size={12} className={cn("transition-transform", saveToLibrary && "rotate-180")} />
            </button>
            {saveToLibrary && (
              <div className="mt-2 space-y-2">
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="Track name"
                  className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-primary/40"
                />
                <button
                  type="button"
                  onClick={handleSaveToLibrary}
                  disabled={saving || saved}
                  className={cn(
                    "w-full py-2 rounded-lg text-xs font-semibold transition-all",
                    saved
                      ? "bg-green-500/20 border border-green-500/40 text-green-400"
                      : "bg-purple-500/20 border border-purple-500/40 text-purple-300 hover:bg-purple-500/30"
                  )}
                >
                  {saving ? (
                    <span className="flex items-center justify-center gap-1.5">
                      <Loader2 size={12} className="animate-spin" /> Saving...
                    </span>
                  ) : saved ? (
                    'Saved to Library'
                  ) : (
                    'Save Reference Track'
                  )}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default ReferenceAnalysisPanel
