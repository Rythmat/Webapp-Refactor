import { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { useStore } from '@/daw/store';
import { trackEngineRegistry } from '@/daw/hooks/usePlaybackEngine';
import { SoundFontAdapter } from '@/daw/instruments/SoundFontAdapter';
import {
  GM_CATEGORIES,
  GM_PROGRAMS,
  getGMProgramsByCategory,
  type GMCategory,
} from '@/daw/instruments/gmPrograms';
import { PianoKeyboard } from '@/daw/oracle-synth/components/keyboard/PianoKeyboard';
import { useLiveChordColor } from '@/daw/hooks/useLiveChordColor';

// ── SoundFontView ────────────────────────────────────────────────────

interface SoundFontViewProps {
  trackId: string;
}

export function SoundFontView({ trackId }: SoundFontViewProps) {
  // The track is the source of truth for its GM sound: what's saved, exported,
  // synced to collaborators and restored on reload. The playback engine keeps
  // the live instrument in step with it.
  const currentProgram = useStore(
    (s) => s.tracks.find((t) => t.id === trackId)?.gmProgram ?? 0,
  );
  const updateTrack = useStore((s) => s.updateTrack);
  const [selectedCategory, setSelectedCategory] = useState<GMCategory>('Piano');
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [activeNotes, setActiveNotes] = useState<Set<number>>(new Set());
  const hwActiveNotes = useStore((s) => s.hwActiveNotes);
  const mergedNotes = useMemo(
    () => new Set([...activeNotes, ...hwActiveNotes]),
    [activeNotes, hwActiveNotes],
  );
  const chordColor = useLiveChordColor(mergedNotes);
  const [loading, setLoading] = useState(true);

  // Sync program from adapter on mount — wait for init to actually complete
  // (trackEngine.getInstrument() is only set after async init resolves)
  useEffect(() => {
    const state = trackEngineRegistry.get(trackId);
    const adapter =
      state?.trackEngine.getInstrument() instanceof SoundFontAdapter
        ? (state.trackEngine.getInstrument() as SoundFontAdapter)
        : null;
    if (adapter) {
      setLoading(false);
    } else {
      // Instrument might not be ready yet — poll until init completes
      const timer = setInterval(() => {
        const s = trackEngineRegistry.get(trackId);
        const a =
          s?.trackEngine.getInstrument() instanceof SoundFontAdapter
            ? (s.trackEngine.getInstrument() as SoundFontAdapter)
            : null;
        if (a) {
          setLoading(false);
          clearInterval(timer);
        }
      }, 200);
      return () => clearInterval(timer);
    }
  }, [trackId]);

  // Open the list on the saved sound's category (per track, and again if the
  // sound changes from elsewhere — undo, a collaborator, a preset).
  useEffect(() => {
    const prog = GM_PROGRAMS.find((p) => p.number === currentProgram);
    if (prog) setSelectedCategory(prog.category as GMCategory);
  }, [trackId, currentProgram]);

  const handleProgramChange = useCallback(
    (program: number) => {
      // Save it on the track (this is what reloads); switch the live
      // instrument right away too so the change is heard immediately.
      updateTrack(trackId, { gmProgram: program });
      const state = trackEngineRegistry.get(trackId);
      if (state?.instrument instanceof SoundFontAdapter) {
        state.instrument.setProgram(program);
      }
    },
    [trackId, updateTrack],
  );

  const handleNoteOn = useCallback(
    (note: number, velocity: number = 0.8) => {
      const state = trackEngineRegistry.get(trackId);
      if (state) state.trackEngine.noteOn(note, Math.round(velocity * 127));
      setActiveNotes((prev) => new Set(prev).add(note));
    },
    [trackId],
  );

  const handleNoteOff = useCallback(
    (note: number) => {
      const state = trackEngineRegistry.get(trackId);
      if (state) state.trackEngine.noteOff(note);
      setActiveNotes((prev) => {
        const next = new Set(prev);
        next.delete(note);
        return next;
      });
    },
    [trackId],
  );

  const currentProgramName =
    GM_PROGRAMS.find((p) => p.number === currentProgram)?.name ?? 'Unknown';
  const categoryPrograms = getGMProgramsByCategory(selectedCategory);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center gap-2">
        <Loader2
          size={14}
          className="animate-spin"
          style={{ color: 'var(--daw-text-3)' }}
        />
        <span className="text-xs" style={{ color: 'var(--daw-text-3)' }}>
          Loading SoundFont...
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Top bar */}
      <div
        className="flex shrink-0 items-center gap-4 border-b px-4 py-2"
        style={{ borderColor: 'var(--daw-hairline)' }}
      >
        {/* Category selector */}
        <div className="relative">
          <button
            onClick={() => setCategoryOpen((o) => !o)}
            className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
            style={{
              backgroundColor: 'var(--daw-surface-2)',
              color: 'var(--daw-text)',
              border: '1px solid var(--daw-hairline)',
            }}
          >
            {selectedCategory}
            <ChevronDown size={12} style={{ color: 'var(--daw-text-3)' }} />
          </button>

          {categoryOpen && (
            <div
              className="absolute left-0 top-full z-30 mt-1 max-h-[240px] overflow-hidden overflow-y-auto rounded-lg"
              style={{
                backgroundColor: 'var(--daw-surface-1)',
                border: '1px solid var(--daw-hairline)',
                minWidth: 160,
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              }}
            >
              {GM_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    setCategoryOpen(false);
                  }}
                  className="block w-full cursor-pointer px-4 py-2 text-left text-xs transition-colors"
                  style={{
                    backgroundColor:
                      cat === selectedCategory
                        ? 'var(--daw-surface-2)'
                        : 'transparent',
                    color:
                      cat === selectedCategory
                        ? 'var(--daw-text)'
                        : 'var(--daw-text-3)',
                    fontWeight: cat === selectedCategory ? 600 : 400,
                    border: 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (cat !== selectedCategory)
                      e.currentTarget.style.backgroundColor =
                        'var(--daw-surface-2)';
                  }}
                  onMouseLeave={(e) => {
                    if (cat !== selectedCategory)
                      e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Current program label */}
        <span
          className="text-xs font-medium"
          style={{ color: 'var(--daw-text)' }}
        >
          {currentProgramName}
        </span>
      </div>

      {/* Program list + Keyboard */}
      <div className="flex flex-1 overflow-hidden">
        {/* Program list */}
        <div
          className="shrink-0 overflow-y-auto"
          style={{
            width: 200,
            borderRight: '1px solid var(--daw-hairline)',
          }}
        >
          {categoryPrograms.map((prog) => (
            <button
              key={prog.number}
              onClick={() => handleProgramChange(prog.number)}
              className="block w-full cursor-pointer px-4 py-1.5 text-left text-xs transition-colors"
              style={{
                backgroundColor:
                  prog.number === currentProgram
                    ? 'var(--daw-surface-2)'
                    : 'transparent',
                color:
                  prog.number === currentProgram
                    ? 'var(--daw-text)'
                    : 'var(--daw-text-3)',
                fontWeight: prog.number === currentProgram ? 600 : 400,
                border: 'none',
              }}
              onMouseEnter={(e) => {
                if (prog.number !== currentProgram)
                  e.currentTarget.style.backgroundColor =
                    'var(--daw-surface-2)';
              }}
              onMouseLeave={(e) => {
                if (prog.number !== currentProgram)
                  e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {prog.name}
            </button>
          ))}
        </div>

        {/* Keyboard */}
        <div
          className="relative flex-1 overflow-hidden"
          style={{ minHeight: 100 }}
        >
          <div style={{ position: 'absolute', inset: 0 }}>
            <PianoKeyboard
              startNote={36}
              endNote={96}
              activeNotes={mergedNotes}
              activeColor={chordColor ?? undefined}
              onNoteOn={handleNoteOn}
              onNoteOff={handleNoteOff}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
