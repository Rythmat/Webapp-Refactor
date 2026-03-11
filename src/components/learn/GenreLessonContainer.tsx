/* eslint-disable import/order, react/jsx-sort-props, tailwindcss/classnames-order */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Tone from 'tone';
import { HeaderBar } from '../ClassroomLayout/HeaderBar';
import { NoteHold } from '@/components/Games/NoteHold';
import { PlayAlong } from '@/components/Games/PlayAlong';
import { LessonOverview } from '@/components/learn/LessonOverview';
import { PianoKeyboard } from '@/components/PianoKeyboard';
import type { NoteEvent } from '@/components/Games/PianoRollPlay';
import type { PlaybackEvent } from '@/contexts/PlaybackContext/helpers';
import {
  SLUG_TO_CURRICULUM_GENRE,
  CURRICULUM_TO_ENGINE_GENRE,
  type CurriculumGenreId,
} from '@/curriculum/bridge/genreIdMap';
import { getGCMEntry } from '@/curriculum/data/gcmHelpers';
import { getActivityFlow } from '@/curriculum/data/activityFlows';
import type {
  ActivityFlow,
  ActivitySection,
  ActivityStep,
} from '@/curriculum/types/activity';
import type { CurriculumLevelId } from '@/curriculum/types/curriculum';
import { usePrismModeChordsData, type PrismModeSlug } from '@/hooks/data';
import { usePrismStartContours } from '@/hooks/data/prism/usePrismStartContours';
import { useMidiInput } from '@/hooks/music/useMidiInput';
import { colorForKeyMode } from '@/lib/modeColorShift';
import { useNavigate } from 'react-router';
import { CurriculumRoutes } from '@/constants/routes';
import '@/components/learn/learn.css';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NOTE_DURATION_TICKS = 480;
const START_OVERLAY_NOTE_DURATION_SECONDS = 0.45;

/** Map GCM scale names to the closest diatonic PrismModeSlug */
const GCM_SCALE_TO_MODE: Record<string, PrismModeSlug> = {
  ionian: 'ionian',
  dorian: 'dorian',
  phrygian: 'phrygian',
  lydian: 'lydian',
  mixolydian: 'mixolydian',
  aeolian: 'aeolian',
  locrian: 'locrian',
  major_pentatonic: 'ionian',
  minor_pentatonic: 'aeolian',
  blues: 'aeolian',
  minor_blues: 'aeolian',
  major_blues: 'ionian',
  harmonic_minor: 'aeolian',
  melodic_minor: 'aeolian',
  altered_dominant: 'mixolydian',
  lydian_dominant: 'lydian',
  bebop_dominant: 'mixolydian',
  whole_tone: 'lydian',
  half_whole_diminished: 'locrian',
  half_whole_dim: 'locrian',
  whole_half_diminished: 'locrian',
  phrygian_dominant: 'phrygian',
};

const SECTION_LABELS: Record<string, string> = {
  A: 'Melody',
  B: 'Chords',
  C: 'Bass',
  D: 'Play-Along',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type GenreLessonContainerProps = {
  genreSlug: string;
  level: number;
};

type ActivityState = 'pending' | 'active' | 'completed';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BASE_C4 = 60;
const KEY_SEMITONES: Record<string, number> = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
};

function parseKeyRoot(defaultKey: string): { label: string; midi: number } {
  const parts = defaultKey.split(' ');
  const label = parts[0] ?? 'C';
  const semitone = KEY_SEMITONES[label] ?? 0;
  return { label, midi: BASE_C4 + semitone };
}

function buildScaleMidis(rootMidi: number, intervals: number[]): number[] {
  const midis = intervals.map((i) => rootMidi + i);
  const octave = rootMidi + 12;
  if (!midis.includes(octave)) midis.push(octave);
  return midis.sort((a, b) => a - b);
}

/** Convert a MIDI array to NoteEvent[] with quarter-note spacing */
function midiToEvents(midis: number[], prefix: string): NoteEvent[] {
  return midis.map((midi, idx) => ({
    id: `${prefix}-${idx}-${midi}`,
    pitchName: Tone.Frequency(midi, 'midi').toNote(),
    startTicks: idx * NOTE_DURATION_TICKS,
    durationTicks: NOTE_DURATION_TICKS,
  }));
}

/** Convert a MIDI array to NoteEvent[] with half-note spacing (for timing exercises) */
function midiToTimedEvents(midis: number[], prefix: string): NoteEvent[] {
  return midis.map((midi, idx) => ({
    id: `${prefix}-${idx}-${midi}`,
    pitchName: Tone.Frequency(midi, 'midi').toNote(),
    startTicks: idx * NOTE_DURATION_TICKS * 2,
    durationTicks: NOTE_DURATION_TICKS * 2,
  }));
}

/** Build arpeggiated chord events: play notes one at a time, then together */
function chordArpeggiate(notes: number[], prefix: string): NoteEvent[] {
  const events: NoteEvent[] = [];
  notes.forEach((note, idx) => {
    events.push(
      {
        id: `${prefix}-${idx}-${note}`,
        pitchName: Tone.Frequency(note, 'midi').toNote(),
        startTicks: idx * NOTE_DURATION_TICKS,
        durationTicks: NOTE_DURATION_TICKS,
      },
      {
        id: `${prefix}Joined-${idx}-${note}`,
        pitchName: Tone.Frequency(note, 'midi').toNote(),
        startTicks: (notes.length + 1) * NOTE_DURATION_TICKS,
        durationTicks: NOTE_DURATION_TICKS * 2,
      },
    );
  });
  return events;
}

/** Resolve a contour (1-based scale indices) through a scale to MIDI values */
function resolveContour(contour: number[], scale: number[]): number[] {
  return contour
    .map((value) => {
      if (value > 0) return scale[value - 1];
      if (value < 0) {
        const idx = scale.length + value;
        return idx >= 0 && idx < scale.length ? scale[idx] - 12 : undefined;
      }
      return undefined;
    })
    .filter((m): m is number => typeof m === 'number');
}

/**
 * Parse a step's tag and direction to determine what notes to generate.
 * Returns NoteEvent[] for the given step.
 */
function buildStepEvents(
  step: ActivityStep,
  scaleMidis: number[],
  triads: number[][],
  contours: number[][],
  activityColor: string,
  prefix: string,
): NoteEvent[] {
  const tag = step.tag.toLowerCase();
  const dir = step.direction.toLowerCase();
  const section = step.section;
  const isTimed =
    step.assessment === 'pitch_order_timing' ||
    step.assessment === 'pitch_order_timing_duration';
  const toEvents = isTimed ? midiToTimedEvents : midiToEvents;

  // Ascending scale
  if (
    tag.includes('ascending') &&
    !tag.includes('descending') &&
    !tag.includes('asc_desc')
  ) {
    return applyColor(toEvents(scaleMidis, prefix), activityColor);
  }

  // Descending scale
  if (
    tag.includes('descending') &&
    !tag.includes('ascending') &&
    !tag.includes('asc_desc')
  ) {
    return applyColor(
      toEvents([...scaleMidis].reverse(), prefix),
      activityColor,
    );
  }

  // Ascending & descending
  if (
    tag.includes('asc_desc') ||
    (tag.includes('ascending') && tag.includes('descending'))
  ) {
    const upDown = [...scaleMidis, ...[...scaleMidis].reverse()];
    return applyColor(toEvents(upDown, prefix), activityColor);
  }

  // Contour / phrase
  if (
    tag.includes('contour') ||
    tag.includes('phrase') ||
    tag.includes('melody')
  ) {
    if (contours.length > 0) {
      const contourIdx = Math.floor(Math.random() * contours.length);
      const resolved = resolveContour(contours[contourIdx], scaleMidis);
      if (resolved.length > 0) {
        return applyColor(toEvents(resolved, prefix), activityColor);
      }
    }
    // Fallback: ascending scale
    return applyColor(toEvents(scaleMidis, prefix), activityColor);
  }

  // Arpeggio
  if (tag.includes('arpeggio') || tag.includes('arpeggiate')) {
    // Try to extract chord number from tag (e.g., "chord_1_arpeggio")
    const chordMatch = tag.match(/chord[_\s]*(\d)/);
    const chordIdx = chordMatch ? parseInt(chordMatch[1]) - 1 : 0;
    const chord = triads[chordIdx] ?? triads[0] ?? scaleMidis.slice(0, 3);
    return applyColor(chordArpeggiate(chord, prefix), activityColor);
  }

  // Section B (Chords) — chord holds or progressions
  if (section === 'B' || tag.includes('chord')) {
    // Try to find which chord from the tag
    const chordMatch = tag.match(/chord[_\s]*(\d)/);
    if (chordMatch) {
      const chordIdx = parseInt(chordMatch[1]) - 1;
      const chord = triads[chordIdx] ?? triads[0];
      if (chord) return applyColor(toEvents(chord, prefix), activityColor);
    }
    // Default: play first 4 triads sequentially
    const chordSeq = triads.slice(0, 4).flat();
    if (chordSeq.length > 0) {
      return applyColor(toEvents(chordSeq, prefix), activityColor);
    }
    return applyColor(toEvents(scaleMidis, prefix), activityColor);
  }

  // Section C (Bass) — root notes
  if (section === 'C' || tag.includes('bass')) {
    const roots = triads
      .slice(0, 4)
      .map((chord) => chord[0])
      .filter(Boolean);
    if (roots.length > 0) {
      return applyColor(toEvents(roots as number[], prefix), activityColor);
    }
    return applyColor(toEvents(scaleMidis.slice(0, 4), prefix), activityColor);
  }

  // Section D (Play-Along) — longer sequences
  if (section === 'D') {
    // Combine melody contour with chords
    if (contours.length > 0) {
      const resolved = resolveContour(contours[0], scaleMidis);
      if (resolved.length > 0) {
        return applyColor(toEvents(resolved, prefix), activityColor);
      }
    }
    return applyColor(toEvents(scaleMidis, prefix), activityColor);
  }

  // Direction-based fallbacks
  if (dir.includes('going up') || dir.includes('ascending')) {
    return applyColor(toEvents(scaleMidis, prefix), activityColor);
  }
  if (dir.includes('going down') || dir.includes('descending')) {
    return applyColor(
      toEvents([...scaleMidis].reverse(), prefix),
      activityColor,
    );
  }
  if (dir.includes('up and down')) {
    const upDown = [...scaleMidis, ...[...scaleMidis].reverse()];
    return applyColor(toEvents(upDown, prefix), activityColor);
  }

  // Ultimate fallback: ascending scale
  return applyColor(toEvents(scaleMidis, prefix), activityColor);
}

function applyColor(events: NoteEvent[], color: string): NoteEvent[] {
  return events.map((e) => ({ ...e, color }));
}

/** Extract contours from API response */
function extractContours(value: unknown): number[][] {
  if (!value) return [];
  const results: number[][] = [];
  const isNumbers = (v: unknown): v is number[] =>
    Array.isArray(v) &&
    v.every((n) => typeof n === 'number' && Number.isFinite(n));
  const pushIfNumbers = (maybe: unknown) => {
    if (isNumbers(maybe)) {
      results.push(maybe);
      return true;
    }
    return false;
  };
  if (pushIfNumbers(value)) return results;
  if (Array.isArray(value)) {
    value.forEach((item) => {
      if (!pushIfNumbers(item) && Array.isArray(item)) {
        item.forEach((inner) => pushIfNumbers(inner));
      }
    });
  } else if (typeof value === 'object') {
    Object.values(value as Record<string, unknown>).forEach((v) => {
      if (Array.isArray(v)) v.forEach((item) => pushIfNumbers(item));
    });
  }
  return results;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const GenreLessonContainer = ({
  genreSlug,
  level,
}: GenreLessonContainerProps) => {
  const navigate = useNavigate();

  // --- Genre / GCM resolution ---
  const genreId = SLUG_TO_CURRICULUM_GENRE[genreSlug] as
    | CurriculumGenreId
    | undefined;
  const displayName = genreId ? CURRICULUM_TO_ENGINE_GENRE[genreId] : genreSlug;
  const levelId = `L${level}` as CurriculumLevelId;

  const gcmEntry = useMemo(() => {
    if (!genreId) return null;
    try {
      return getGCMEntry(genreId, levelId);
    } catch {
      return null;
    }
  }, [genreId, levelId]);

  const keyRoot = useMemo(
    () => parseKeyRoot(gcmEntry?.global.defaultKey ?? 'C major'),
    [gcmEntry],
  );

  const scaleMidis = useMemo(() => {
    const intervals = gcmEntry?.melody.scale.intervals ?? [
      0, 2, 4, 5, 7, 9, 11,
    ];
    return buildScaleMidis(keyRoot.midi, intervals);
  }, [gcmEntry, keyRoot.midi]);

  const modeSlug: PrismModeSlug = useMemo(() => {
    const scaleName = gcmEntry?.melody.scale.name ?? 'ionian';
    return GCM_SCALE_TO_MODE[scaleName] ?? 'ionian';
  }, [gcmEntry]);

  const activityColor = useMemo(
    () => colorForKeyMode(keyRoot.label, modeSlug),
    [keyRoot.label, modeSlug],
  );

  // --- Data hooks ---
  const { data: contourData } = usePrismStartContours();
  const availableContours = useMemo(
    () => extractContours(contourData?.contours),
    [contourData],
  );

  const chordsQuery = usePrismModeChordsData(modeSlug);
  const triads = useMemo(() => {
    const raw = chordsQuery.data?.chords?.triads;
    if (!raw || !Array.isArray(raw)) return [];
    return raw.map((arr: number[]) => arr.map((i: number) => i + keyRoot.midi));
  }, [chordsQuery.data, keyRoot.midi]);

  // --- Activity flow loading ---
  const [flow, setFlow] = useState<ActivityFlow | null>(null);
  const [flowLoading, setFlowLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setFlowLoading(true);
    getActivityFlow(genreSlug, level).then((result) => {
      if (!cancelled) {
        setFlow(result);
        setFlowLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [genreSlug, level]);

  // --- Section & step navigation ---
  const [currentSectionIdx, setCurrentSectionIdx] = useState(0);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [activityState, setActivityState] = useState<ActivityState>('active');
  const [startSignal, setStartSignal] = useState(0);
  const [activityInstanceId, setActivityInstanceId] = useState(0);
  const [lessonComplete, setLessonComplete] = useState(false);
  const [startOverlayStep, setStartOverlayStep] = useState(0);
  const midiTriggeredRef = useRef(false);

  const sections = flow?.sections ?? [];
  const currentSection: ActivitySection | undefined =
    sections[currentSectionIdx];
  const currentStep: ActivityStep | undefined =
    currentSection?.steps[currentStepIdx];
  const totalSteps = currentSection?.steps.length ?? 0;

  const stepKey = useCallback(
    (sectionIdx: number, stepIdx: number) => `${sectionIdx}:${stepIdx}`,
    [],
  );

  // Reset when flow/genre/level changes
  useEffect(() => {
    setCurrentSectionIdx(0);
    setCurrentStepIdx(0);
    setCompletedSteps(new Set());
    setActivityState('active');
    setLessonComplete(false);
    midiTriggeredRef.current = false;
  }, [flow]);

  // --- Determine component & events for current step ---
  const StepComponent: typeof NoteHold | typeof PlayAlong | null =
    useMemo(() => {
      if (!currentStep) return null;
      if (!currentStep.assessment) return null;
      if (
        currentStep.assessment === 'pitch_only' ||
        currentStep.assessment === 'pitch_order'
      ) {
        return NoteHold;
      }
      return PlayAlong;
    }, [currentStep]);

  const usesOverlay = StepComponent === NoteHold || StepComponent === PlayAlong;

  const currentEvents = useMemo(() => {
    if (!currentStep) return [];
    return buildStepEvents(
      currentStep,
      scaleMidis,
      triads,
      availableContours,
      activityColor,
      `step-${currentSectionIdx}-${currentStepIdx}`,
    );
  }, [
    currentStep,
    scaleMidis,
    triads,
    availableContours,
    activityColor,
    currentSectionIdx,
    currentStepIdx,
  ]);

  // --- Start overlay piano animation ---
  const startOverlaySequence = useMemo(
    () =>
      [...currentEvents]
        .sort((a, b) => a.startTicks - b.startTicks)
        .map((event) => ({
          event,
          midi: typeof event.midi === 'number' ? event.midi : null,
        }))
        .filter(
          (item): item is { event: NoteEvent; midi: number } =>
            item.midi !== null,
        ),
    [currentEvents],
  );

  useEffect(() => {
    const showOverlay = usesOverlay && activityState === 'pending';
    if (!showOverlay || startOverlaySequence.length === 0) {
      setStartOverlayStep(0);
      return;
    }
    const intervalId = window.setInterval(() => {
      setStartOverlayStep((prev) => (prev + 1) % startOverlaySequence.length);
    }, 600);
    return () => window.clearInterval(intervalId);
  }, [usesOverlay, activityState, startOverlaySequence]);

  const startOverlayNotes = useMemo<PlaybackEvent[]>(() => {
    if (startOverlaySequence.length === 0) return [];
    const now = Date.now();
    const cappedIdx = Math.min(
      startOverlayStep,
      startOverlaySequence.length - 1,
    );
    const item = startOverlaySequence[cappedIdx];
    return [
      {
        id: `start-${item.event.id}-${cappedIdx}`,
        type: 'note',
        midi: item.midi,
        time: now,
        duration: START_OVERLAY_NOTE_DURATION_SECONDS,
        velocity: 1,
        color: item.event.color,
      },
    ];
  }, [startOverlaySequence, startOverlayStep]);

  const { startC: overlayStartC, endC: overlayEndC } = useMemo(() => {
    if (startOverlaySequence.length === 0) return { startC: 3, endC: 4 };
    const midiValues = startOverlaySequence.map((item) => item.midi);
    const minOctave = Math.floor(Math.min(...midiValues) / 12);
    const maxOctave = Math.floor(Math.max(...midiValues) / 12);
    return { startC: minOctave, endC: Math.max(maxOctave, minOctave + 1) };
  }, [startOverlaySequence]);

  // --- Set pending state when switching to an interactive step ---
  useEffect(() => {
    if (!currentStep) return;
    if (usesOverlay) {
      setActivityState('pending');
    } else {
      setActivityState('active');
    }
    setStartOverlayStep(0);
    setStartSignal(0);
  }, [currentStep, currentSectionIdx, currentStepIdx, usesOverlay]);

  // --- Navigation handlers ---
  const handleStartActivity = () => {
    setActivityState('active');
    setStartSignal((v) => v + 1);
  };

  const markCurrentComplete = useCallback(() => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      next.add(stepKey(currentSectionIdx, currentStepIdx));
      return next;
    });
  }, [currentSectionIdx, currentStepIdx, stepKey]);

  const advanceToNext = useCallback(() => {
    markCurrentComplete();

    // Next step in section
    if (currentStepIdx < totalSteps - 1) {
      setCurrentStepIdx((i) => i + 1);
      setActivityInstanceId((id) => id + 1);
      return;
    }

    // Next section
    if (currentSectionIdx < sections.length - 1) {
      setCurrentSectionIdx((i) => i + 1);
      setCurrentStepIdx(0);
      setActivityInstanceId((id) => id + 1);
      return;
    }

    // All done
    setLessonComplete(true);
  }, [
    currentStepIdx,
    totalSteps,
    currentSectionIdx,
    sections.length,
    markCurrentComplete,
  ]);

  const handleContinue = useCallback(() => {
    advanceToNext();
  }, [advanceToNext]);

  const handleActivityCompleteChange = useCallback(
    (isComplete: boolean) => {
      if (!isComplete || !usesOverlay) return;
      setActivityState('completed');
    },
    [usesOverlay],
  );

  const handleRestartActivity = useCallback(() => {
    setStartSignal(0);
    setActivityInstanceId((id) => id + 1);
    if (usesOverlay) {
      setActivityState('pending');
    } else {
      setActivityState('active');
    }
  }, [usesOverlay]);

  const goToSection = useCallback((idx: number) => {
    setCurrentSectionIdx(idx);
    setCurrentStepIdx(0);
    setActivityInstanceId((id) => id + 1);
  }, []);

  // --- MIDI input to advance/start ---
  const handleMidiActivity = useCallback(() => {
    if (lessonComplete) {
      if (midiTriggeredRef.current) return;
      midiTriggeredRef.current = true;
      navigate(CurriculumRoutes.genre({ genre: genreSlug }));
      return;
    }
    if (activityState === 'pending') {
      handleStartActivity();
      return;
    }
    if (activityState === 'completed') {
      handleContinue();
    }
  }, [activityState, lessonComplete, handleContinue, navigate, genreSlug]);

  const { startListening, stopListening } = useMidiInput(undefined, {
    onNoteOn: handleMidiActivity,
  });

  useEffect(() => {
    const stop = startListening();
    return () => {
      if (typeof stop === 'function') {
        stop();
        return;
      }
      stopListening();
    };
  }, [startListening, stopListening]);

  // --- Render state ---
  const showStartOverlay = usesOverlay && activityState === 'pending';
  const showCompletionOverlay = usesOverlay && activityState === 'completed';

  // --- Error / loading states ---
  if (!genreId || !gcmEntry) {
    return (
      <div
        className="learn-root p-8"
        style={{ color: 'var(--color-text-dim)' }}
      >
        Genre not found: {genreSlug}
      </div>
    );
  }

  if (flowLoading) {
    return (
      <div
        className="learn-root flex min-h-screen w-full flex-col"
        style={{
          backgroundColor: 'var(--color-bg)',
          color: 'var(--color-text)',
        }}
      >
        <HeaderBar title="Lesson" onBack={() => navigate(-1)} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-sm" style={{ color: 'var(--color-text-dim)' }}>
            Loading activity flow...
          </div>
        </div>
      </div>
    );
  }

  if (!flow) {
    return (
      <div
        className="learn-root p-8"
        style={{ color: 'var(--color-text-dim)' }}
      >
        Activity flow not found for {genreSlug} level {level}
      </div>
    );
  }

  // --- Lesson complete screen ---
  if (lessonComplete) {
    return (
      <div
        className="learn-root flex min-h-screen w-full flex-col"
        style={{
          backgroundColor: 'var(--color-bg)',
          color: 'var(--color-text)',
        }}
      >
        <HeaderBar title="Lesson" onBack={() => navigate(-1)} />
        <div className="flex min-h-[60vh] items-center justify-center p-4">
          <div
            className="w-full max-w-3xl rounded-2xl p-6 glass-panel"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--color-border)',
              boxShadow: 'var(--glass-shadow)',
            }}
          >
            <div className="flex flex-col items-center gap-2 text-center">
              <h1
                className="text-2xl font-semibold"
                style={{ color: 'var(--color-text)' }}
              >
                Great work!
              </h1>
              <p className="text-sm" style={{ color: 'var(--color-text-dim)' }}>
                You completed the {displayName} Level {level} lesson.
              </p>
            </div>
            <div className="mt-6 grid gap-4">
              <button
                type="button"
                onClick={() =>
                  navigate(CurriculumRoutes.genre({ genre: genreSlug }))
                }
                className="rounded-xl px-4 py-3 text-left text-sm font-semibold transition-colors duration-150 glass-panel-sm"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text)',
                }}
              >
                Back to {displayName} Overview
              </button>
              {level < 3 && (
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      CurriculumRoutes.genreLevel({
                        genre: genreSlug,
                        level: String(level + 1),
                      }),
                    )
                  }
                  className="rounded-xl px-4 py-3 text-left text-sm font-semibold transition-colors duration-150 glass-panel-sm"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text)',
                  }}
                >
                  Continue to Level {level + 1}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Main lesson UI ---
  return (
    <div
      className="learn-root flex min-h-screen w-full flex-col"
      style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
    >
      <HeaderBar title="Lesson" onBack={() => navigate(-1)} />

      {/* Info bar */}
      <div
        className="glass-panel-sm flex items-center justify-between px-4 py-3"
        style={{
          borderBottom: '1px solid var(--color-border)',
          background: 'rgba(255,255,255,0.03)',
        }}
      >
        <div className="text-sm" style={{ color: 'var(--color-text-dim)' }}>
          {currentStep?.activity ?? ''}
        </div>
        <div className="text-sm" style={{ color: 'var(--color-text-dim)' }}>
          Step {currentStepIdx + 1} of {totalSteps}
        </div>
        <div className="text-sm" style={{ color: 'var(--color-text-dim)' }}>
          <span
            className="font-semibold"
            style={{ color: 'var(--color-text)' }}
          >
            {displayName}
          </span>{' '}
          <span
            className="font-semibold"
            style={{ color: 'var(--color-text)' }}
          >
            Level {level}
          </span>
        </div>
      </div>

      {/* Section navigation tabs */}
      <div
        className="flex gap-2 px-4 py-2"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        {sections.map((section, idx) => {
          const isActive = idx === currentSectionIdx;
          const sectionStepCount = section.steps.length;
          const completedCount = section.steps.filter((_, stepIdx) =>
            completedSteps.has(stepKey(idx, stepIdx)),
          ).length;
          const isComplete =
            completedCount === sectionStepCount && sectionStepCount > 0;

          return (
            <button
              key={section.id}
              onClick={() => goToSection(idx)}
              className="glass-panel-sm rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-150"
              style={{
                background: isActive
                  ? 'rgba(126, 207, 207, 0.12)'
                  : isComplete
                    ? 'rgba(74, 255, 74, 0.08)'
                    : 'rgba(255,255,255,0.03)',
                border: isActive
                  ? '1px solid var(--color-accent)'
                  : '1px solid var(--color-border)',
                color: isActive
                  ? 'var(--color-accent)'
                  : isComplete
                    ? '#4aff4a'
                    : 'var(--color-text-dim)',
                cursor: 'pointer',
              }}
            >
              {SECTION_LABELS[section.id] ?? section.name}
              {isComplete && (
                <span style={{ marginLeft: '6px' }}>&#10003;</span>
              )}
              {completedCount > 0 && !isComplete && (
                <span
                  style={{ fontSize: '11px', marginLeft: '6px', opacity: 0.7 }}
                >
                  {Math.round((completedCount / sectionStepCount) * 100)}%
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Step progress dots */}
      {currentSection && (
        <div className="flex items-center gap-1 px-4 py-2">
          {currentSection.steps.map((_, i) => {
            const isStepDone = completedSteps.has(
              stepKey(currentSectionIdx, i),
            );
            const isCurrent = i === currentStepIdx;
            return (
              <div
                key={i}
                style={{
                  width: isCurrent ? '24px' : '16px',
                  height: '6px',
                  borderRadius: '3px',
                  background: isStepDone
                    ? '#4aff4a'
                    : isCurrent
                      ? 'var(--color-accent)'
                      : 'rgba(255,255,255,0.1)',
                  transition: 'all 0.2s',
                }}
              />
            );
          })}
          <span
            className="ml-2 text-xs"
            style={{ color: 'var(--color-text-dim)' }}
          >
            {currentStepIdx + 1}/{totalSteps}
          </span>
        </div>
      )}

      {/* Activity area */}
      <div className="flex-1 p-3 sm:p-4">
        {currentStep && StepComponent ? (
          /* Interactive step: NoteHold or PlayAlong */
          <div className="flex flex-col gap-4">
            <div className="relative">
              <div
                className={
                  showCompletionOverlay || showStartOverlay
                    ? 'pointer-events-none opacity-30 blur-sm transition duration-300'
                    : 'transition duration-300'
                }
              >
                <StepComponent
                  key={`step-${currentSectionIdx}-${currentStepIdx}-${activityInstanceId}`}
                  activityColor={activityColor}
                  events={currentEvents}
                  isActive={activityState === 'active'}
                  onActivityCompleteChange={handleActivityCompleteChange}
                  startSignal={startSignal}
                  startMessage={currentStep.direction}
                />
              </div>

              {/* Start overlay */}
              {showStartOverlay && (
                <div
                  className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center px-4"
                  style={{
                    background: 'rgba(25,25,25,0.8)',
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  <div
                    className="w-full max-w-lg rounded-2xl px-8 py-6 text-center glass-panel"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-text)',
                    }}
                  >
                    <h3 className="text-2xl font-semibold">Ready to start?</h3>
                    <p
                      className="mt-2 text-sm"
                      style={{ color: 'var(--color-text-dim)' }}
                    >
                      {currentStep.direction}
                    </p>
                    {startOverlayNotes.length > 0 && (
                      <div className="mt-4">
                        <p
                          className="mb-2 text-xs uppercase tracking-wide"
                          style={{
                            color: 'var(--color-text-dim)',
                            letterSpacing: '1px',
                          }}
                        >
                          Note sequence
                        </p>
                        <PianoKeyboard
                          className="mx-auto"
                          startC={overlayStartC}
                          endC={overlayEndC}
                          playingNotes={startOverlayNotes}
                          activeWhiteKeyColor={activityColor}
                          activeBlackKeyColor={activityColor}
                          enableClick={false}
                          useContextNotes={false}
                        />
                      </div>
                    )}
                    <div className="mt-6 flex justify-center">
                      <button
                        type="button"
                        onClick={handleStartActivity}
                        className="rounded-full px-6 py-2 text-sm font-semibold transition-colors duration-150"
                        style={{
                          background: 'var(--color-accent)',
                          color: '#191919',
                        }}
                      >
                        Start
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Completion overlay */}
              {showCompletionOverlay && (
                <div className="absolute inset-0 flex items-center justify-center px-4">
                  <div
                    className="rounded-2xl px-8 py-6 text-center glass-panel"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-text)',
                    }}
                  >
                    <h3 className="text-2xl font-semibold">
                      {StepComponent === PlayAlong
                        ? 'Nice work!'
                        : 'Great job!'}
                    </h3>
                    <p
                      className="mt-2 text-sm"
                      style={{ color: 'var(--color-text-dim)' }}
                    >
                      {StepComponent === PlayAlong
                        ? 'You finished the play-along. Continue when ready, or restart to practice again.'
                        : 'You completed the sequence. Continue when ready, or restart to practice again.'}
                    </p>
                    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                      <button
                        type="button"
                        onClick={handleContinue}
                        className="rounded-full px-6 py-2 text-sm font-semibold transition-colors duration-150"
                        style={{
                          background: 'var(--color-accent)',
                          color: '#191919',
                        }}
                      >
                        Continue
                      </button>
                      <button
                        type="button"
                        onClick={handleRestartActivity}
                        className="rounded-full px-6 py-2 text-sm font-semibold transition-colors duration-150"
                        style={{
                          border: '1px solid var(--color-border)',
                          color: 'var(--color-text)',
                        }}
                      >
                        Restart
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : currentStep ? (
          /* Direction-only step (no assessment) */
          <div
            className="glass-panel rounded-2xl p-6"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div
              className="mb-2 text-xs uppercase tracking-wide"
              style={{ color: 'var(--color-text-dim)', letterSpacing: '1px' }}
            >
              {currentStep.subsection}
            </div>
            <h3
              className="mb-4 text-lg font-semibold"
              style={{ color: 'var(--color-text)' }}
            >
              {currentStep.activity}
            </h3>
            <p
              className="mb-6 text-sm leading-relaxed"
              style={{ color: 'var(--color-text-dim)' }}
            >
              {currentStep.direction}
            </p>
            {currentStep.styleRef && (
              <p
                className="mb-4 text-xs italic"
                style={{ color: 'var(--color-text-dim)' }}
              >
                Style ref: {currentStep.styleRef}
              </p>
            )}
            <button
              type="button"
              onClick={handleContinue}
              className="rounded-full px-6 py-2 text-sm font-semibold transition-colors duration-150"
              style={{ background: 'var(--color-accent)', color: '#191919' }}
            >
              Mark Complete & Continue
            </button>
          </div>
        ) : (
          /* First step: show LessonOverview */
          <LessonOverview
            mode={modeSlug}
            rootMidi={keyRoot.midi}
            onStartLesson={() => {
              if (sections.length > 0 && sections[0].steps.length > 0) {
                setCurrentSectionIdx(0);
                setCurrentStepIdx(0);
              }
            }}
          />
        )}
      </div>
    </div>
  );
};
