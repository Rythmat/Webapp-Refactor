import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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

// QWERTY → MIDI note mapping (C3 = 48)
const QWERTY_WHITE: Record<string, number> = {
  a: 48,
  s: 50,
  d: 52,
  f: 53,
  g: 55,
  h: 57,
  j: 59,
  k: 60,
  l: 62,
  ';': 64,
  "'": 65,
};
const QWERTY_BLACK: Record<string, number> = {
  w: 49,
  e: 51,
  t: 54,
  y: 56,
  u: 58,
  o: 61,
  p: 63,
};
const QWERTY_MAP: Record<string, number> = { ...QWERTY_WHITE, ...QWERTY_BLACK };

// ── SoundFontView ────────────────────────────────────────────────────

interface SoundFontViewProps {
  trackId: string;
}

export function SoundFontView({ trackId }: SoundFontViewProps) {
  const [currentProgram, setCurrentProgram] = useState(0);
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
  const heldKeysRef = useRef<Set<string>>(new Set());

  // Sync program from adapter on mount — wait for init to actually complete
  // (trackEngine.getInstrument() is only set after async init resolves)
  useEffect(() => {
    const state = trackEngineRegistry.get(trackId);
    const adapter =
      state?.trackEngine.getInstrument() instanceof SoundFontAdapter
        ? (state.trackEngine.getInstrument() as SoundFontAdapter)
        : null;
    if (adapter) {
      const pgm = adapter.getProgram();
      setCurrentProgram(pgm);
      setLoading(false);
      const prog = GM_PROGRAMS.find((p) => p.number === pgm);
      if (prog) setSelectedCategory(prog.category as GMCategory);
    } else {
      // Instrument might not be ready yet — poll until init completes
      const timer = setInterval(() => {
        const s = trackEngineRegistry.get(trackId);
        const a =
          s?.trackEngine.getInstrument() instanceof SoundFontAdapter
            ? (s.trackEngine.getInstrument() as SoundFontAdapter)
            : null;
        if (a) {
          const pgm = a.getProgram();
          setCurrentProgram(pgm);
          setLoading(false);
          const prog = GM_PROGRAMS.find((p) => p.number === pgm);
          if (prog) setSelectedCategory(prog.category as GMCategory);
          clearInterval(timer);
        }
      }, 200);
      return () => clearInterval(timer);
    }
  }, [trackId]);

  const handleProgramChange = useCallback(
    (program: number) => {
      const state = trackEngineRegistry.get(trackId);
      if (state?.instrument instanceof SoundFontAdapter) {
        state.instrument.setProgram(program);
        setCurrentProgram(program);
      }
    },
    [trackId],
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
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
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
      heldKeysRef.current.forEach((key) => {
        const note = QWERTY_MAP[key];
        if (note !== undefined) handleNoteOff(note);
      });
      heldKeysRef.current.clear();
    };
  }, [handleNoteOn, handleNoteOff]);

  const currentProgramName =
    GM_PROGRAMS.find((p) => p.number === currentProgram)?.name ?? 'Unknown';
  const categoryPrograms = getGMProgramsByCategory(selectedCategory);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center gap-2">
        <Loader2
          size={14}
          className="animate-spin"
          style={{ color: 'var(--color-text-dim)' }}
        />
        <span className="text-xs" style={{ color: 'var(--color-text-dim)' }}>
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
        style={{ borderColor: 'var(--color-border)' }}
      >
        {/* Category selector */}
        <div className="relative">
          <button
            onClick={() => setCategoryOpen((o) => !o)}
            className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
            style={{
              backgroundColor: 'var(--color-surface-2)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
            }}
          >
            {selectedCategory}
            <ChevronDown size={12} style={{ color: 'var(--color-text-dim)' }} />
          </button>

          {categoryOpen && (
            <div
              className="absolute left-0 top-full z-30 mt-1 max-h-[240px] overflow-hidden overflow-y-auto rounded-lg"
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
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
                        ? 'var(--color-surface-2)'
                        : 'transparent',
                    color:
                      cat === selectedCategory
                        ? 'var(--color-text)'
                        : 'var(--color-text-dim)',
                    fontWeight: cat === selectedCategory ? 600 : 400,
                    border: 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (cat !== selectedCategory)
                      e.currentTarget.style.backgroundColor =
                        'var(--color-surface-2)';
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
          style={{ color: 'var(--color-text)' }}
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
            borderRight: '1px solid var(--color-border)',
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
                    ? 'var(--color-surface-2)'
                    : 'transparent',
                color:
                  prog.number === currentProgram
                    ? 'var(--color-text)'
                    : 'var(--color-text-dim)',
                fontWeight: prog.number === currentProgram ? 600 : 400,
                border: 'none',
              }}
              onMouseEnter={(e) => {
                if (prog.number !== currentProgram)
                  e.currentTarget.style.backgroundColor =
                    'var(--color-surface-2)';
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
