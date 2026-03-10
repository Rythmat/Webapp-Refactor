/**
 * PrismSuggestionModal — Phases 9-15, 17-18
 *
 * Modal UI for Prism chord suggestions. Shows suggested chord progressions
 * with color-coded pills, navigation between alternatives, preview playback,
 * and commit/cancel actions.
 *
 * Preview uses a standalone SoundFontAdapter routed to the master gain,
 * picking a GM program based on the right-clicked track's instrument type.
 * Guitar-fx and bass-fx tracks show a sound picker dropdown.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Square,
  RefreshCw,
  Check,
  X,
} from 'lucide-react';
import { useStore } from '@/daw/store';
import { SuggestionChordPill } from './SuggestionChordPill';
import { audioEngine } from '@/daw/audio/AudioEngine';
import { SoundFontAdapter } from '@/daw/instruments/SoundFontAdapter';
import { GM_PROGRAMS } from '@/daw/instruments/gmPrograms';
import type { InstrumentType } from '@/daw/store/tracksSlice';

// ── PrismLogo (inline) ────────────────────────────────────────────────────

function PrismLogo({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    >
      <path d="M12 4L5 18h14L12 4z" />
    </svg>
  );
}

// ── Style badge ────────────────────────────────────────────────────────────

function StyleBadge({
  style,
}: {
  style: { triadRatio: number; seventhRatio: number };
}) {
  let label = 'Mixed';
  if (style.triadRatio > 0.7) label = 'Triads';
  else if (style.seventhRatio > 0.5) label = 'Jazz (7ths)';
  else if (style.triadRatio > 0.5) label = 'Mostly Triads';

  return (
    <span
      className="rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wider"
      style={{
        backgroundColor: 'var(--color-surface-3)',
        color: 'var(--color-text-dim)',
      }}
    >
      Style: {label}
    </span>
  );
}

// ── Measure length picker ──────────────────────────────────────────────────

const MEASURE_OPTIONS = [1, 2, 4, 8];

function MeasurePicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <span
        className="text-[10px] uppercase tracking-wider"
        style={{ color: 'var(--color-text-dim)' }}
      >
        Measures:
      </span>
      {MEASURE_OPTIONS.map((n) => (
        <button
          key={n}
          onClick={() => onChange(n)}
          className="cursor-pointer rounded px-2 py-0.5 text-[11px] font-medium"
          style={{
            backgroundColor:
              value === n ? 'var(--color-accent)' : 'var(--color-surface-3)',
            color: value === n ? 'var(--color-bg)' : 'var(--color-text-dim)',
            border: 'none',
          }}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

// ── GM program helpers ────────────────────────────────────────────────────

const GUITAR_PROGRAMS = GM_PROGRAMS.filter(
  (p) => p.number >= 24 && p.number <= 31,
);
const BASS_PROGRAMS = GM_PROGRAMS.filter(
  (p) => p.number >= 32 && p.number <= 39,
);

function defaultGmProgram(
  instrument: InstrumentType,
  gmProgram?: number,
): number {
  switch (instrument) {
    case 'soundfont':
      return gmProgram ?? 0;
    case 'guitar-fx':
      return 27; // Electric Guitar (clean)
    case 'bass-fx':
      return 33; // Electric Bass (finger)
    case 'electric-piano':
      return 4;
    default:
      return 0; // Acoustic Grand Piano
  }
}

// ── Main Modal ─────────────────────────────────────────────────────────────

export function PrismSuggestionModal() {
  const isOpen = useStore((s) => s.prismSuggestOpen);
  const suggestions = useStore((s) => s.prismSuggestSets);
  const activeIdx = useStore((s) => s.prismSuggestActiveIdx);
  const measures = useStore((s) => s.prismSuggestMeasures);
  const insertTick = useStore((s) => s.prismSuggestInsertTick);
  const style = useStore((s) => s.prismSuggestStyle);
  const isPreviewPlaying = useStore((s) => s.prismSuggestPreviewPlaying);
  const trackId = useStore((s) => s.prismSuggestTrackId);
  const bpm = useStore((s) => s.bpm);

  const close = useStore((s) => s.closePrismSuggestion);
  const next = useStore((s) => s.nextPrismSuggestion);
  const prev = useStore((s) => s.prevPrismSuggestion);
  const setMeasures = useStore((s) => s.setPrismSuggestMeasures);
  const commit = useStore((s) => s.commitPrismSuggestion);
  const regenerate = useStore((s) => s.regeneratePrismSuggestions);
  const setPreviewPlaying = useStore((s) => s.setPrismSuggestPreviewPlaying);

  const previewTimersRef = useRef<number[]>([]);
  const [playingChordIdx, setPlayingChordIdx] = useState<number | null>(null);
  const activeNotesRef = useRef<number[]>([]);

  // Standalone preview adapter
  const previewAdapterRef = useRef<SoundFontAdapter | null>(null);
  const [previewProgram, setPreviewProgram] = useState(0);

  const activeSuggestion = suggestions[activeIdx] ?? null;
  const insertBar = Math.floor(insertTick / 1920) + 1;

  // Determine track instrument type
  const trackInfo = useMemo(() => {
    if (!trackId)
      return { instrument: 'none' as InstrumentType, gmProgram: undefined };
    const track = useStore.getState().tracks.find((t) => t.id === trackId);
    if (!track)
      return { instrument: 'none' as InstrumentType, gmProgram: undefined };
    return { instrument: track.instrument, gmProgram: track.gmProgram };
  }, [trackId]);

  const showSoundPicker =
    trackInfo.instrument === 'guitar-fx' || trackInfo.instrument === 'bass-fx';
  const soundPickerPrograms =
    trackInfo.instrument === 'guitar-fx'
      ? GUITAR_PROGRAMS
      : trackInfo.instrument === 'bass-fx'
        ? BASS_PROGRAMS
        : [];

  // Initialize standalone SoundFontAdapter when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const program = defaultGmProgram(trackInfo.instrument, trackInfo.gmProgram);
    setPreviewProgram(program);

    const adapter = new SoundFontAdapter(program);
    previewAdapterRef.current = adapter;

    adapter
      .init(audioEngine.getContext(), audioEngine.getMasterGain())
      .catch(() => {
        // Silent — synthReady guard in SoundFontAdapter prevents errors
      });

    return () => {
      adapter.allNotesOff();
      adapter.dispose();
      if (previewAdapterRef.current === adapter) {
        previewAdapterRef.current = null;
      }
    };
  }, [isOpen, trackInfo.instrument, trackInfo.gmProgram]);

  // Handle sound picker change
  const handleSoundChange = useCallback((newProgram: number) => {
    setPreviewProgram(newProgram);
    previewAdapterRef.current?.setProgram(newProgram);
  }, []);

  // Stop all preview notes
  const stopPreview = useCallback(() => {
    for (const t of previewTimersRef.current) clearTimeout(t);
    previewTimersRef.current = [];

    const adapter = previewAdapterRef.current;
    if (adapter) {
      for (const note of activeNotesRef.current) {
        try {
          adapter.noteOff(note);
        } catch {
          /* ignore */
        }
      }
    }
    activeNotesRef.current = [];
    setPlayingChordIdx(null);
    setPreviewPlaying(false);
  }, [setPreviewPlaying]);

  // Whole-note duration in ms
  const wholeNoteDuration = (4 * 60000) / bpm;

  // Preview a single chord (whole note)
  const previewChord = useCallback(
    (midi: number[]) => {
      stopPreview();
      const adapter = previewAdapterRef.current;
      if (!adapter) return;
      for (const note of midi) {
        try {
          adapter.noteOn(note, 80);
        } catch {
          /* ignore */
        }
      }
      activeNotesRef.current = [...midi];
      const timer = window.setTimeout(() => {
        for (const note of midi) {
          try {
            adapter.noteOff(note);
          } catch {
            /* ignore */
          }
        }
        activeNotesRef.current = [];
      }, wholeNoteDuration);
      previewTimersRef.current = [timer];
    },
    [stopPreview, wholeNoteDuration],
  );

  // Play full progression (each chord = whole note)
  const playProgression = useCallback(() => {
    if (!activeSuggestion || activeSuggestion.chords.length === 0) return;
    stopPreview();
    setPreviewPlaying(true);

    const adapter = previewAdapterRef.current;
    if (!adapter) return;

    const timers: number[] = [];

    activeSuggestion.chords.forEach((chord, i) => {
      const startMs = i * wholeNoteDuration;

      const onTimer = window.setTimeout(() => {
        // Stop previous chord
        for (const note of activeNotesRef.current) {
          try {
            adapter.noteOff(note);
          } catch {
            /* ignore */
          }
        }
        // Play this chord
        for (const note of chord.midi) {
          try {
            adapter.noteOn(note, 80);
          } catch {
            /* ignore */
          }
        }
        activeNotesRef.current = [...chord.midi];
        setPlayingChordIdx(i);
      }, startMs);
      timers.push(onTimer);
    });

    // Schedule stop after last chord
    const totalMs = activeSuggestion.chords.length * wholeNoteDuration;
    const stopTimer = window.setTimeout(() => {
      for (const note of activeNotesRef.current) {
        try {
          adapter.noteOff(note);
        } catch {
          /* ignore */
        }
      }
      activeNotesRef.current = [];
      setPlayingChordIdx(null);
      setPreviewPlaying(false);
    }, totalMs);
    timers.push(stopTimer);

    previewTimersRef.current = timers;
  }, [activeSuggestion, wholeNoteDuration, stopPreview, setPreviewPlaying]);

  // Cleanup on unmount or close
  useEffect(() => {
    if (!isOpen) stopPreview();
    return () => stopPreview();
  }, [isOpen, stopPreview]);

  // Stop preview when switching suggestions
  useEffect(() => {
    stopPreview();
  }, [activeIdx, stopPreview]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      // Don't handle if an input/select is focused
      const active = document.activeElement;
      if (
        active &&
        (active.tagName === 'INPUT' ||
          active.tagName === 'TEXTAREA' ||
          active.tagName === 'SELECT')
      )
        return;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          prev();
          break;
        case 'ArrowRight':
          e.preventDefault();
          next();
          break;
        case ' ':
          e.preventDefault();
          if (isPreviewPlaying) stopPreview();
          else playProgression();
          break;
        case 'Enter':
          e.preventDefault();
          commit();
          break;
        case 'Escape':
          e.preventDefault();
          close();
          break;
        case 'r':
        case 'R':
          e.preventDefault();
          regenerate();
          break;
        default:
          // 1-9 jump to suggestion
          if (e.key >= '1' && e.key <= '9') {
            const idx = parseInt(e.key) - 1;
            if (idx < suggestions.length) {
              useStore.setState({ prismSuggestActiveIdx: idx });
            }
          }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [
    isOpen,
    isPreviewPlaying,
    prev,
    next,
    commit,
    close,
    regenerate,
    playProgression,
    stopPreview,
    suggestions.length,
  ]);

  if (!isOpen || !activeSuggestion) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={close}
    >
      <div
        className="flex flex-col rounded-2xl"
        style={{
          width: 520,
          maxWidth: '90vw',
          backgroundColor: 'var(--color-surface)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.4)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center gap-2 px-5 py-3"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <PrismLogo size={18} />
          <span
            className="text-sm font-semibold"
            style={{ color: 'var(--color-text)' }}
          >
            Prism Suggestions
          </span>
          <span
            className="text-[10px]"
            style={{ color: 'var(--color-text-dim)' }}
          >
            Bar {insertBar}
          </span>
          {style && <StyleBadge style={style} />}
          <div className="flex-1" />
          <button
            onClick={close}
            className="flex cursor-pointer items-center justify-center rounded p-1"
            style={{
              color: 'var(--color-text-dim)',
              background: 'none',
              border: 'none',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Controls row ── */}
        <div
          className="flex items-center justify-between px-5 py-2"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <MeasurePicker value={measures} onChange={setMeasures} />

          <div className="flex items-center gap-2">
            {showSoundPicker && (
              <select
                value={previewProgram}
                onChange={(e) => handleSoundChange(Number(e.target.value))}
                className="cursor-pointer rounded px-2 py-1 text-[10px]"
                style={{
                  color: 'var(--color-text-dim)',
                  backgroundColor: 'var(--color-surface-2)',
                  border: '1px solid var(--color-border)',
                  outline: 'none',
                }}
              >
                {soundPickerPrograms.map((p) => (
                  <option key={p.number} value={p.number}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={regenerate}
              className="flex cursor-pointer items-center gap-1 rounded px-2 py-1 text-[10px]"
              style={{
                color: 'var(--color-text-dim)',
                background: 'var(--color-surface-2)',
                border: 'none',
              }}
              title="Re-roll (R)"
            >
              <RefreshCw size={12} />
              Re-roll
            </button>
          </div>
        </div>

        {/* ── Suggestion navigation ── */}
        <div className="flex items-center gap-2 px-5 py-2">
          <button
            onClick={prev}
            className="flex cursor-pointer items-center justify-center rounded p-1"
            style={{
              color: 'var(--color-text-dim)',
              background: 'var(--color-surface-2)',
              border: 'none',
            }}
            title="Previous (←)"
          >
            <ChevronLeft size={16} />
          </button>

          <div className="flex flex-1 flex-col items-center">
            <span
              className="text-[11px] font-medium"
              style={{ color: 'var(--color-text)' }}
            >
              {activeSuggestion.label}
            </span>
            <span
              className="text-[9px]"
              style={{ color: 'var(--color-text-dim)' }}
            >
              {activeIdx + 1} of {suggestions.length}
            </span>
          </div>

          <button
            onClick={next}
            className="flex cursor-pointer items-center justify-center rounded p-1"
            style={{
              color: 'var(--color-text-dim)',
              background: 'var(--color-surface-2)',
              border: 'none',
            }}
            title="Next (→)"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* ── Chord pills ── */}
        <div className="px-5 py-3">
          <div className="flex flex-wrap gap-2">
            {activeSuggestion.chords.map((chord, i) => {
              // Measure separator
              const chordsPerMeasure =
                activeSuggestion.chords.length / measures;
              const showDivider =
                i > 0 && chordsPerMeasure > 0 && i % chordsPerMeasure === 0;

              return (
                <div key={i} className="flex items-center gap-2">
                  {showDivider && (
                    <div
                      className="h-8"
                      style={{
                        width: 1,
                        backgroundColor: 'var(--color-border)',
                      }}
                    />
                  )}
                  <SuggestionChordPill
                    chord={chord}
                    isPlaying={playingChordIdx === i}
                    onClick={() => previewChord(chord.midi)}
                  />
                </div>
              );
            })}
          </div>

          {activeSuggestion.chords.length === 0 && (
            <div
              className="py-4 text-center text-xs"
              style={{ color: 'var(--color-text-dim)' }}
            >
              No suggestions available for this position. Try setting a key in
              the Prism panel first.
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderTop: '1px solid var(--color-border)' }}
        >
          {/* Preview controls */}
          <button
            onClick={isPreviewPlaying ? stopPreview : playProgression}
            className="flex cursor-pointer items-center gap-1.5 rounded px-3 py-1.5 text-[11px] font-medium"
            style={{
              color: isPreviewPlaying ? 'var(--color-bg)' : 'var(--color-text)',
              backgroundColor: isPreviewPlaying
                ? '#ef4444'
                : 'var(--color-surface-3)',
              border: 'none',
            }}
            title="Preview (Space)"
          >
            {isPreviewPlaying ? (
              <>
                <Square size={12} /> Stop
              </>
            ) : (
              <>
                <Play size={12} /> Preview
              </>
            )}
          </button>

          {/* Commit / Cancel */}
          <div className="flex items-center gap-2">
            <button
              onClick={close}
              className="cursor-pointer rounded px-3 py-1.5 text-[11px]"
              style={{
                color: 'var(--color-text-dim)',
                background: 'none',
                border: '1px solid var(--color-border)',
              }}
            >
              Cancel
            </button>
            <button
              onClick={commit}
              className="flex cursor-pointer items-center gap-1 rounded px-3 py-1.5 text-[11px] font-semibold"
              style={{
                color: 'var(--color-bg)',
                backgroundColor: 'var(--color-accent)',
                border: 'none',
              }}
              title="Commit (Enter)"
            >
              <Check size={12} />
              Commit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
