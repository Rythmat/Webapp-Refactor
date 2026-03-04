import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useStore } from '@/daw/store';
import { trackEngineRegistry } from '@/daw/hooks/usePlaybackEngine';
import { SoundFontAdapter } from '@/daw/instruments/SoundFontAdapter';
import { PianoKeyboard } from '@/daw/oracle-synth/components/keyboard/PianoKeyboard';
import { PianoRoll } from '../PianoRoll/PianoRoll';
import { PresetBrowser } from './PresetBrowser';
import type { MidiNoteEvent } from '@prism/engine';
import { useLiveChordColor } from '@/daw/hooks/useLiveChordColor';

// QWERTY → MIDI note mapping (C3 = 48)
const QWERTY_WHITE: Record<string, number> = {
  a: 48, s: 50, d: 52, f: 53, g: 55, h: 57, j: 59,
  k: 60, l: 62, ';': 64, "'": 65,
};
const QWERTY_BLACK: Record<string, number> = {
  w: 49, e: 51, t: 54, y: 56, u: 58, o: 61, p: 63,
};
const QWERTY_MAP: Record<string, number> = { ...QWERTY_WHITE, ...QWERTY_BLACK };

// ── KeyboardView ────────────────────────────────────────────────────────

type ViewMode = 'keyboard' | 'pianoroll';

export function KeyboardView({ trackId }: { trackId: string }) {
  const [activeNotes, setActiveNotes] = useState<Set<number>>(new Set());
  const hwActiveNotes = useStore((s) => s.hwActiveNotes);
  const mergedNotes = useMemo(() => new Set([...activeNotes, ...hwActiveNotes]), [activeNotes, hwActiveNotes]);
  const activeColor = useLiveChordColor(mergedNotes);
  const [presetName, setPresetName] = useState('Studio Grand');
  const [browserOpen, setBrowserOpen] = useState(false);
  const [mode, setMode] = useState<ViewMode>('keyboard');
  const heldKeysRef = useRef<Set<string>>(new Set());

  // Piano roll data
  const track = useStore((s) => s.tracks.find((t) => t.id === trackId));
  const clip = track?.midiClips[0] ?? null;
  const updateMidiClipEvents = useStore((s) => s.updateMidiClipEvents);
  const updateTrack = useStore((s) => s.updateTrack);

  const handlePianoRollChange = useCallback(
    (newEvents: MidiNoteEvent[]) => {
      if (clip) updateMidiClipEvents(trackId, clip.id, newEvents);
    },
    [trackId, clip?.id, updateMidiClipEvents],
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

  // QWERTY keyboard events
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key.toLowerCase();
      const midiNote = QWERTY_MAP[key];
      if (midiNote !== undefined && !heldKeysRef.current.has(key)) {
        heldKeysRef.current.add(key);
        handleNoteOn(midiNote, 0.8);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const midiNote = QWERTY_MAP[key];
      if (midiNote !== undefined) {
        heldKeysRef.current.delete(key);
        handleNoteOff(midiNote);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      // Release any held notes
      heldKeysRef.current.forEach((key) => {
        const note = QWERTY_MAP[key];
        if (note !== undefined) handleNoteOff(note);
      });
      heldKeysRef.current.clear();
    };
  }, [handleNoteOn, handleNoteOff]);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Top bar */}
      <div
        className="flex items-center px-4 py-2 shrink-0 gap-4 border-b"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-dim)' }}>
          Instrument
        </span>

        {/* Preset selector */}
        <div
          className="flex items-center gap-1 rounded-lg px-3 py-1"
          style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
        >
          <button className="p-0.5 cursor-pointer" style={{ color: 'var(--color-text-dim)', background: 'none', border: 'none' }}>
            <ChevronLeft size={14} />
          </button>
          <span className="text-xs font-medium min-w-[100px] text-center" style={{ color: 'var(--color-text)' }}>
            {presetName}
          </span>
          <button className="p-0.5 cursor-pointer" style={{ color: 'var(--color-text-dim)', background: 'none', border: 'none' }}>
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Browse button */}
        <button
          onClick={() => setBrowserOpen((o) => !o)}
          className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-[10px] font-medium cursor-pointer transition-colors"
          style={{
            backgroundColor: browserOpen ? 'var(--color-accent)' : 'var(--color-surface-2)',
            color: browserOpen ? '#fff' : 'var(--color-text-dim)',
            border: '1px solid var(--color-border)',
          }}
        >
          <Search size={12} />
          Browse
        </button>

        <div className="flex-1" />

        {/* Mode toggle */}
        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-dim)' }}>
          Mode
        </span>
        <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
          <button
            onClick={() => setMode('keyboard')}
            className="px-3 py-1 text-[10px] font-medium cursor-pointer"
            style={{
              backgroundColor: mode === 'keyboard' ? 'var(--color-accent)' : 'var(--color-surface-2)',
              color: mode === 'keyboard' ? '#fff' : 'var(--color-text-dim)',
              border: 'none',
            }}
          >
            Keyboard
          </button>
          <button
            onClick={() => setMode('pianoroll')}
            className="px-3 py-1 text-[10px] font-medium cursor-pointer"
            style={{
              backgroundColor: mode === 'pianoroll' ? 'var(--color-accent)' : 'var(--color-surface-2)',
              color: mode === 'pianoroll' ? '#fff' : 'var(--color-text-dim)',
              border: 'none',
            }}
          >
            Piano Roll
          </button>
        </div>
      </div>

      {/* Main area */}
      {mode === 'keyboard' ? (
        <div className="relative overflow-hidden" style={{ height: 140 }}>
          <div style={{ position: 'absolute', inset: 0 }}>
            <PianoKeyboard
              startNote={36}
              endNote={96}
              activeNotes={mergedNotes}
              activeColor={activeColor ?? undefined}
              onNoteOn={handleNoteOn}
              onNoteOff={handleNoteOff}
            />
          </div>

          {/* Preset Browser Overlay */}
          {browserOpen && (
            <div className="absolute inset-0 z-20">
              <PresetBrowser
                onSelect={(preset) => {
                  setPresetName(preset.name);
                  if (preset.instrumentType) {
                    updateTrack(trackId, {
                      instrument: preset.instrumentType,
                      ...(preset.gmProgram !== undefined && { gmProgram: preset.gmProgram }),
                    });
                  }
                  // If already a SoundFont track, live-switch the program
                  if (preset.gmProgram !== undefined) {
                    const state = trackEngineRegistry.get(trackId);
                    if (state?.instrument instanceof SoundFontAdapter) {
                      state.instrument.setProgram(preset.gmProgram);
                    }
                  }
                  setBrowserOpen(false);
                }}
                onClose={() => setBrowserOpen(false)}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-hidden">
          {clip && track ? (
            <PianoRoll
              events={clip.events}
              clipStartTick={clip.startTick}
              clipColor={track.color}
              onChange={handlePianoRollChange}
            />
          ) : (
            <div
              className="flex items-center justify-center h-full text-xs"
              style={{ color: 'var(--color-text-dim)' }}
            >
              No MIDI clips on this track
            </div>
          )}
        </div>
      )}
    </div>
  );
}
