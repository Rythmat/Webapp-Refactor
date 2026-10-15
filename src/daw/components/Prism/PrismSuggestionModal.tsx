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
import { PRISM_SCOPE } from '@/daw/commands/keymaps';
import { useKeymap } from '@/daw/commands/registry';
import { useStore } from '@/daw/store';
import { PPQ, ticksPerBar, timeSignatureOf } from '@/daw/time/timeModel';
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
        backgroundColor: 'var(--daw-hover)',
        color: 'var(--daw-text-3)',
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
        style={{ color: 'var(--daw-text-3)' }}
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
              value === n ? 'var(--daw-selected)' : 'var(--daw-hover)',
            color: value === n ? 'var(--daw-text)' : 'var(--daw-text-3)',
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
    case 'bass-electric':
      return 33; // Electric Bass (finger)
    default:
      return 0; // Acoustic Grand Piano
  }
}

// ── Main Modal ─────────────────────────────────────────────────────────────

/**
 * `audioReady` is the editor's audio-started flag (useAudioEngine's isReady).
 * The modal can open before the first audio gesture, for example when a
 * student's first action is right-clicking the timeline, so the preview
 * player waits for it rather than asking an engine that doesn't exist yet.
 */
export function PrismSuggestionModal({
  audioReady = true,
}: {
  audioReady?: boolean;
}) {
  const isOpen = useStore((s) => s.prismSuggestOpen);
  const suggestions = useStore((s) => s.prismSuggestSets);
  const activeIdx = useStore((s) => s.prismSuggestActiveIdx);
  const measures = useStore((s) => s.prismSuggestMeasures);
  const insertTick = useStore((s) => s.prismSuggestInsertTick);
  const style = useStore((s) => s.prismSuggestStyle);
  const isPreviewPlaying = useStore((s) => s.prismSuggestPreviewPlaying);
  const trackId = useStore((s) => s.prismSuggestTrackId);
  const bpm = useStore((s) => s.bpm);
  const barTicks = useStore((s) => ticksPerBar(timeSignatureOf(s)));

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
  const insertBar = Math.floor(insertTick / barTicks) + 1;

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

  // Initialize standalone SoundFontAdapter when modal opens. Before the first
  // audio gesture there is no engine: getContext() would throw and the route
  // error page would replace the editor. The effect runs again once audio
  // starts. (Don't init the engine from here: init() isn't idempotent and
  // would build a second master chain.)
  useEffect(() => {
    if (!isOpen || !audioReady || !audioEngine.getIsInitialized()) return;

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
  }, [isOpen, audioReady, trackInfo.instrument, trackInfo.gmProgram]);

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

  // A bar of the project's metre, in ms: what each chord is heard for
  const wholeNoteDuration = (barTicks / PPQ) * (60000 / bpm);

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

  // Keys (the prism scope): a modal dialog in the key precedence, so while
  // it is up no key reaches the editor behind it: R re-rolls here and never
  // records, the arrows browse suggestions instead of nudging a clip, Space
  // previews instead of playing the song, and Delete can't remove a clip
  // nobody can see. Save and undo still go through, and browser shortcuts
  // still work: a modified key is never prevented here.
  const overlayRef = useRef<HTMLDivElement>(null);
  const visible = isOpen && activeSuggestion !== null;
  // Enter and Space press the button that has focus (Cancel, Re-roll), as
  // on any button, rather than committing or previewing.
  const onOwnButton = (e: KeyboardEvent) =>
    e.target instanceof HTMLButtonElement &&
    !!overlayRef.current?.contains(e.target);
  useKeymap(
    PRISM_SCOPE.id,
    {
      'prism.previous': () => prev(),
      'prism.next': () => next(),
      'prism.pick': (e) => {
        const idx = parseInt(e.key, 10) - 1;
        if (idx < suggestions.length) {
          useStore.setState({ prismSuggestActiveIdx: idx });
        }
      },
      'prism.preview': (e) => {
        if (onOwnButton(e)) return false;
        if (isPreviewPlaying) stopPreview();
        else playProgression();
      },
      'prism.reroll': () => regenerate(),
      'prism.commit': (e) => {
        if (onOwnButton(e)) return false;
        commit();
      },
      'prism.close': () => close(),
    },
    { active: visible },
  );

  if (!isOpen || !activeSuggestion) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
      }}
      onClick={close}
    >
      <div
        className="flex flex-col rounded-2xl"
        style={{
          width: 520,
          maxWidth: '90vw',
          backgroundColor: 'var(--daw-surface-1)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.4)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center gap-2 px-5 py-3"
          style={{ borderBottom: '1px solid var(--daw-hairline)' }}
        >
          <PrismLogo size={18} />
          <span
            className="text-sm font-semibold"
            style={{ color: 'var(--daw-text)' }}
          >
            Prism Suggestions
          </span>
          <span className="text-[10px]" style={{ color: 'var(--daw-text-3)' }}>
            Bar {insertBar}
          </span>
          {style && <StyleBadge style={style} />}
          <div className="flex-1" />
          <button
            onClick={close}
            className="flex cursor-pointer items-center justify-center rounded p-1"
            style={{
              color: 'var(--daw-text-3)',
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
          style={{ borderBottom: '1px solid var(--daw-hairline)' }}
        >
          <MeasurePicker value={measures} onChange={setMeasures} />

          <div className="flex items-center gap-2">
            {showSoundPicker && (
              <select
                value={previewProgram}
                onChange={(e) => handleSoundChange(Number(e.target.value))}
                className="cursor-pointer rounded px-2 py-1 text-[10px]"
                style={{
                  color: 'var(--daw-text-3)',
                  backgroundColor: 'var(--daw-surface-2)',
                  border: '1px solid var(--daw-hairline)',
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
                color: 'var(--daw-text-3)',
                background: 'var(--daw-surface-2)',
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
              color: 'var(--daw-text-3)',
              background: 'var(--daw-surface-2)',
              border: 'none',
            }}
            title="Previous (←)"
          >
            <ChevronLeft size={16} />
          </button>

          <div className="flex flex-1 flex-col items-center">
            <span
              className="text-[11px] font-medium"
              style={{ color: 'var(--daw-text)' }}
            >
              {activeSuggestion.label}
            </span>
            <span className="text-[9px]" style={{ color: 'var(--daw-text-3)' }}>
              {activeIdx + 1} of {suggestions.length}
            </span>
          </div>

          <button
            onClick={next}
            className="flex cursor-pointer items-center justify-center rounded p-1"
            style={{
              color: 'var(--daw-text-3)',
              background: 'var(--daw-surface-2)',
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
                        backgroundColor: 'var(--daw-hairline)',
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
              style={{ color: 'var(--daw-text-3)' }}
            >
              No suggestions available for this position. Try setting a key in
              the Prism panel first.
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderTop: '1px solid var(--daw-hairline)' }}
        >
          {/* Preview controls */}
          <button
            onClick={isPreviewPlaying ? stopPreview : playProgression}
            className="flex cursor-pointer items-center gap-1.5 rounded px-3 py-1.5 text-[11px] font-medium"
            style={{
              color: isPreviewPlaying ? 'var(--daw-bg)' : 'var(--daw-text)',
              backgroundColor: isPreviewPlaying
                ? '#ef4444'
                : 'var(--daw-hover)',
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
                color: 'var(--daw-text-3)',
                background: 'none',
                border: '1px solid var(--daw-hairline)',
              }}
            >
              Cancel
            </button>
            <button
              onClick={commit}
              className="flex cursor-pointer items-center gap-1 rounded px-3 py-1.5 text-[11px] font-semibold"
              style={{
                color: 'var(--daw-on-primary)',
                backgroundColor: 'var(--daw-primary)',
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
