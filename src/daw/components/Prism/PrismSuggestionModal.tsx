/**
 * PrismSuggestionModal — Phases 9-15, 17-18
 *
 * Modal UI for Prism chord suggestions. Shows suggested chord progressions
 * with color-coded pills, navigation between alternatives, preview playback,
 * and commit/cancel actions.
 *
 * Preview uses a standalone SoundFontAdapter routed to the master gain,
 * picking a GM program based on the right-clicked track's instrument type.
 * An Audio track with a guitar or bass amp (audioSource) shows a sound
 * picker dropdown.
 */

import { audioSourceOf, type AudioSource } from '@/daw/audio/audioSource';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Square,
  RefreshCw,
  Check,
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
import { Button } from '@/daw/ui/Button';
import { Chip } from '@/daw/ui/Chip';
import { DawDialog } from '@/daw/ui/DawDialog';
import { IconButton } from '@/daw/ui/IconButton';
import { Segmented } from '@/daw/ui/Segmented';
import { Select } from '@/daw/ui/Select';
import { TYPE_CLASS } from '@/daw/ui/styles';

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

  return <Chip>Style: {label}</Chip>;
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
    <div className="flex items-center gap-2">
      <span className={TYPE_CLASS.micro} style={{ color: 'var(--daw-text-3)' }}>
        Measures
      </span>
      <Segmented
        label="Measures"
        options={MEASURE_OPTIONS.map((n) => ({
          value: String(n),
          label: String(n),
        }))}
        value={String(value)}
        onValueChange={(next) => onChange(Number(next))}
      />
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
  gmProgram: number | undefined,
  source: AudioSource,
): number {
  // An Audio track previews as what it records (audioSource).
  if (source === 'guitar') return 27; // Electric Guitar (clean)
  if (source === 'bass') return 33; // Electric Bass (finger)
  // An Instruments track previews its own program; else the grand piano.
  return instrument === 'soundfont' ? (gmProgram ?? 0) : 0;
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
      return {
        instrument: 'none' as InstrumentType,
        gmProgram: undefined,
        source: 'other' as AudioSource,
      };
    const track = useStore.getState().tracks.find((t) => t.id === trackId);
    if (!track)
      return {
        instrument: 'none' as InstrumentType,
        gmProgram: undefined,
        source: 'other' as AudioSource,
      };
    return {
      instrument: track.instrument,
      gmProgram: track.gmProgram,
      source: audioSourceOf(track),
    };
  }, [trackId]);

  const showSoundPicker =
    trackInfo.source === 'guitar' || trackInfo.source === 'bass';
  const soundPickerPrograms =
    trackInfo.source === 'guitar'
      ? GUITAR_PROGRAMS
      : trackInfo.source === 'bass'
        ? BASS_PROGRAMS
        : [];

  // Initialize standalone SoundFontAdapter when modal opens. Before the first
  // audio gesture there is no engine: getContext() would throw and the route
  // error page would replace the editor. The effect runs again once audio
  // starts. (Don't init the engine from here: init() isn't idempotent and
  // would build a second master chain.)
  useEffect(() => {
    if (!isOpen || !audioReady || !audioEngine.getIsInitialized()) return;

    const program = defaultGmProgram(
      trackInfo.instrument,
      trackInfo.gmProgram,
      trackInfo.source,
    );
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
  const visible = isOpen && activeSuggestion !== null;
  // Focus is inside the dialog while it is open, so its keys are bound to it.
  const dialogRef = useRef<HTMLDivElement>(null);
  // Enter and Space press the button that has focus (Cancel, Re-roll), as
  // on any button, rather than committing or previewing.
  const onOwnButton = (e: KeyboardEvent) =>
    e.target instanceof HTMLButtonElement &&
    !!dialogRef.current?.contains(e.target);
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
    { active: visible, element: dialogRef },
  );

  if (!isOpen || !activeSuggestion) return null;

  return (
    <DawDialog
      open
      onOpenChange={(next) => !next && close()}
      size="md"
      data={{ 'data-testid': 'prism-suggestions' }}
      contentRef={dialogRef}
      title="Prism Suggestions"
      description={
        <span className="flex flex-wrap items-center gap-2">
          Bar {insertBar}
          {style && <StyleBadge style={style} />}
        </span>
      }
      footer={
        <>
          <Button
            className="mr-auto"
            onClick={isPreviewPlaying ? stopPreview : playProgression}
            title="Preview (Space)"
          >
            {isPreviewPlaying ? <Square /> : <Play />}
            {isPreviewPlaying ? 'Stop' : 'Preview'}
          </Button>
          <Button onClick={close}>Cancel</Button>
          <Button variant="primary" onClick={commit} title="Commit (Enter)">
            <Check />
            Commit
          </Button>
        </>
      }
    >
      {/* ── Controls row ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
        <MeasurePicker value={measures} onChange={setMeasures} />
        <div className="flex items-center gap-2">
          {showSoundPicker && (
            <Select
              label="Preview sound"
              options={soundPickerPrograms.map((p) => ({
                value: String(p.number),
                label: p.name,
              }))}
              value={String(previewProgram)}
              onValueChange={(next) => handleSoundChange(Number(next))}
              className="w-44"
            />
          )}
          <Button onClick={regenerate} title="Re-roll (R)">
            <RefreshCw />
            Re-roll
          </Button>
        </div>
      </div>

      {/* ── Suggestion navigation ── */}
      <div className="flex items-center gap-2 py-2">
        <IconButton
          label="Previous suggestion"
          icon={<ChevronLeft />}
          onClick={prev}
        />
        <div className="flex flex-1 flex-col items-center">
          <span
            className={`${TYPE_CLASS.body} font-bold`}
            style={{ color: 'var(--daw-text)' }}
          >
            {activeSuggestion.label}
          </span>
          <span
            className={TYPE_CLASS.label}
            style={{ color: 'var(--daw-text-3)' }}
          >
            {activeIdx + 1} of {suggestions.length}
          </span>
        </div>
        <IconButton
          label="Next suggestion"
          icon={<ChevronRight />}
          onClick={next}
        />
      </div>

      {/* ── Chord pills ── */}
      <div className="py-3">
        <div className="flex flex-wrap gap-2">
          {activeSuggestion.chords.map((chord, i) => {
            // Measure separator
            const chordsPerMeasure = activeSuggestion.chords.length / measures;
            const showDivider =
              i > 0 && chordsPerMeasure > 0 && i % chordsPerMeasure === 0;

            return (
              <div key={i} className="flex items-center gap-2">
                {showDivider && (
                  <div
                    className="h-8"
                    style={{ width: 1, backgroundColor: 'var(--daw-hairline)' }}
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
            className={`py-4 text-center ${TYPE_CLASS.body}`}
            style={{ color: 'var(--daw-text-3)' }}
          >
            No suggestions available for this position. Try setting a key in the
            Prism panel first.
          </div>
        )}
      </div>
    </DawDialog>
  );
}
