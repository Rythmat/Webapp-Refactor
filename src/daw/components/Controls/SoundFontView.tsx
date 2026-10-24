import { useState, useEffect, useCallback, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { useStore } from '@/daw/store';
import { trackEngineRegistry } from '@/daw/hooks/usePlaybackEngine';
import { SoundFontAdapter } from '@/daw/instruments/SoundFontAdapter';
import {
  GM_CATEGORIES,
  getGMProgramsByCategory,
} from '@/daw/instruments/gmPrograms';
import { DockKeyboard } from './DockKeyboard';
import { useLiveChordColor } from '@/daw/hooks/useLiveChordColor';
import { useSoundingNotes } from '@/daw/hooks/useSoundingNotes';
import { SoundBrowser, type SoundCategory } from './SoundBrowser';

/** The 128 GM programs by category, for the sound column. */
const GM_SOUND_CATEGORIES: readonly SoundCategory[] = GM_CATEGORIES.map(
  (category) => ({
    id: category,
    label: category,
    sounds: getGMProgramsByCategory(category).map((p) => ({
      id: String(p.number),
      label: p.name,
    })),
  }),
);

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
  const [activeNotes, setActiveNotes] = useState<Set<number>>(new Set());
  const hwActiveNotes = useStore((s) => s.hwActiveNotes);
  // The keys hold down what the track sounds, the timeline's notes too.
  const sounding = useSoundingNotes(trackId);
  const mergedNotes = useMemo(
    () => new Set([...activeNotes, ...hwActiveNotes, ...sounding]),
    [activeNotes, hwActiveNotes, sounding],
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
    <SoundBrowser
      label="Instruments sounds"
      categories={GM_SOUND_CATEGORIES}
      selectedId={String(currentProgram)}
      onPick={(id) => handleProgramChange(Number(id))}
      data-testid="soundfont-view"
    >
      <div className="absolute inset-0">
        {/* Soundtrap's dock piano (2026-10-22): ‹ Octave ›, then the keys
            with the computer keyboard's letters on them. */}
        <DockKeyboard
          activeNotes={mergedNotes}
          activeColor={chordColor ?? undefined}
          onNoteOn={handleNoteOn}
          onNoteOff={handleNoteOff}
        />
      </div>
    </SoundBrowser>
  );
}
