/**
 * GenreLessonContainerV2.tsx — The v2 genre curriculum container.
 *
 * Self-contained system. Shares only PianoRoll and PianoKeyboard
 * with the existing system. Everything else is ours.
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import * as Tone from 'tone';
import { startTone } from '@/audio/core/toneBridge';
import {
  triggerPianoAttack,
  triggerPianoRelease,
  startPianoSampler,
} from '@/audio/pianoSampler';
import { PianoKeyboard } from '@/components/PianoKeyboard';
import { ClefToggle } from '@/components/notation/ClefToggle';
import { CurriculumRoutes, SettingsRoutes } from '@/constants/routes';
import type { PlaybackEvent } from '@/contexts/PlaybackContext/helpers';
import DualStaffPianoRoll from '@/curriculum/components/DualStaffPianoRoll';
import GenrePianoRoll from '@/curriculum/components/GenrePianoRoll';
import {
  lessonChordSymbols,
  placeLessonChords,
} from '@/curriculum/notation/lessonChordSymbols';
import { useMspModuleCompletion } from '@/features/classroom/msp';
import { useSettingsStore } from '@/features/settings/useSettingsStore';
import type { MidiNoteEvent } from '@/hooks/music/useMidiInput';
import { playGuideNote } from '@/learn/audio/practiceGuide';
import { useLessonVolume } from '@/learn/audio/useLessonVolume';
import { usePracticeSettings } from '@/learn/audio/usePracticeSettings';
import { LessonVolumeDial } from '@/learn/components/LessonVolumeDial';
import { MetronomeToggle } from '@/learn/components/MetronomeToggle';
import {
  LearnInputProvider,
  useLearnInputStable,
} from '@/learn/context/LearnInputContext';
import {
  formatChord,
  parseChord,
  useChordNotation,
  type ChordContext,
  type ChordNotation,
} from '@/lib/chordNotation';
import { colorForKeyMode } from '@/lib/modeColorShift';
import { useChordClef, type NotationStaves } from '@/lib/notation';
import {
  resolveStepContent,
  toPianoRollEvents,
  midiToPitchName,
  type GenreNoteEvent,
} from '../engine/genreGeneration/resolveStepContent';
import { BACKING_LEAD_SEC, useBackingTrack } from '../hooks/useBackingTrack';
import { useDemoPlayback } from '../hooks/useDemoPlayback';
import {
  useGenreAssessment,
  type AssessmentResult,
} from '../hooks/useGenreAssessment';
import {
  useGenreProgress,
  type GlobeDongleData,
  type StudioDongleData,
  type ArcadeDongleData,
  type BackendDongleData,
} from '../hooks/useGenreProgress';
import { useMetronome } from '../hooks/useMetronome';
import type { ActivitySectionId } from '../types/activity';
import type {
  ActivityFlowV2,
  ActivityStepV2,
  StyleSubProfile,
} from '../types/activity.v2';
import { formatAccidentalsForDisplay } from '../utils/formatAccidentals';

// ── Props ────────────────────────────────────────────────────────────────────

interface GenreLessonContainerV2Props {
  flow: ActivityFlowV2;
  genre: string;
  level: number;
  initialSection?: ActivitySectionId;
  // Overrides for non-genre flows (e.g. Applied Theory Fundamentals) that
  // don't have a real entry in CurriculumRoutes.genre's overview/registry —
  // default behavior (derived from `genre`) is unchanged when omitted.
  overviewRoute?: string;
  displayName?: string;
  // Dongle callbacks — wire these when Globe/Studio/Arcade are ready
  onGlobeUpdate?: (data: GlobeDongleData) => void;
  onStudioUpdate?: (data: StudioDongleData) => void;
  onArcadeUpdate?: (data: ArcadeDongleData) => void;
  onBackendSync?: (data: BackendDongleData) => void;
}

// ── Activity state machine ───────────────────────────────────────────────────

type ActivityState = 'preview' | 'practice' | 'performance' | 'complete';

// ── Scale → mode slug mapping (for key center color) ────────────────────────

const SCALE_TO_MODE: Record<string, string> = {
  ionian: 'ionian',
  dorian: 'dorian',
  phrygian: 'phrygian',
  lydian: 'lydian',
  mixolydian: 'mixolydian',
  aeolian: 'aeolian',
  locrian: 'locrian',
  major_pentatonic: 'ionian',
  minor_pentatonic: 'dorian',
  blues: 'dorian',
  minor_blues: 'dorian',
  major_blues: 'ionian',
  harmonic_minor: 'aeolian',
  melodic_minor: 'aeolian',
};

// ── Key root parser ──────────────────────────────────────────────────────────

const KEY_MAP: Record<string, number> = {
  C: 60,
  'C#': 61,
  Db: 61,
  D: 62,
  'D#': 63,
  Eb: 63,
  E: 64,
  F: 65,
  'F#': 66,
  Gb: 66,
  G: 67,
  'G#': 68,
  Ab: 68,
  A: 69,
  'A#': 70,
  Bb: 70,
  B: 71,
};

function parseKeyRoot(keyName: string): number {
  return KEY_MAP[keyName] ?? 60;
}

// ── Chord symbols ────────────────────────────────────────────────────────────

/**
 * A step's hand-written chord symbol ('Dm7', 'Bb/D') in the chosen notation.
 * Hybrid shows it as written, as does a chord the notation can't write
 * ('Afunk9'), rather than the formatter's hybrid fallback ("5 funk9").
 */
function chordSymbolForDisplay(
  symbol: string,
  notation: ChordNotation,
  context: ChordContext,
): string {
  const written = formatAccidentalsForDisplay(symbol);
  if (notation === 'hybrid') return written;
  const spec = parseChord(symbol);
  if (!spec) return written;
  const formatted = formatChord(spec, notation, context);
  return formatted === formatChord(spec, 'hybrid', context)
    ? written
    : formatted;
}

// ── Inner component (needs LearnInputProvider wrapper) ────────────────────────

function GenreLessonContainerV2Inner({
  flow,
  genre,
  level,
  initialSection,
  overviewRoute,
  displayName,
  onGlobeUpdate,
  onStudioUpdate,
  onArcadeUpdate,
  onBackendSync,
}: GenreLessonContainerV2Props) {
  const navigate = useNavigate();
  // Shown in the tempo bar: how far the student's output (Bluetooth headphones)
  // runs behind, so the backing can be brought back in line from the activity.
  const outputLatencyMs = useSettingsStore((s) => s.outputLatencyMs);
  const genreDisplayName =
    displayName ?? genre.charAt(0).toUpperCase() + genre.slice(1);

  // ── State ────────────────────────────────────────────────────────────────
  const [activeSection, setActiveSection] = useState<ActivitySectionId>(
    initialSection ?? 'A',
  );
  const [stepIndex, setStepIndex] = useState(0);
  const [_activityState, _setActivityState] =
    useState<ActivityState>('preview');
  const activityStateRef = useRef<ActivityState>('preview');
  const [tempo, setTempo] = useState(flow.params.tempoRange[0]);
  const [userNotes, setUserNotes] = useState<GenreNoteEvent[]>([]);
  const [lastResult, setLastResult] = useState<AssessmentResult | null>(null);
  const [activeMidis, setActiveMidis] = useState<number[]>([]);
  const [activityInstanceId, setActivityInstanceId] = useState(0);
  const [practiceHighlightMidis, setPracticeHighlightMidis] = useState<
    Set<number>
  >(new Set());

  // Keep ref and state in sync
  const setActivityState = useCallback((s: ActivityState) => {
    activityStateRef.current = s;
    _setActivityState(s);
  }, []);

  const activityState = _activityState;

  // Tick counter refs
  const currentTickRef = useRef(0);
  const tickIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Guard against PianoRoll firing onPlayingChange(false) during reset
  const playStartedAtRef = useRef(0);
  // Guard against multiple completions in IT mode
  const hasStartedRef = useRef(false);
  // Practice-mode melody rendering — target notes played as audio guide
  const practiceNotePartRef = useRef<Tone.Part | null>(null);

  // Drag refs for tempo control
  const dragStartY = useRef(0);
  const dragStartTempo = useRef(tempo);

  // ── Derived data ──────────────────────────────────────────────────────────

  const currentSection = useMemo(
    () => flow.sections.find((s) => s.id === activeSection)!,
    [flow, activeSection],
  );

  const currentStep = useMemo(
    () => currentSection.steps[stepIndex] as ActivityStepV2,
    [currentSection, stepIndex],
  );

  const isIT =
    currentStep.assessment === 'pitch_order_timing' ||
    currentStep.assessment === 'pitch_order_timing_duration';
  const isPerforming = activityState === 'performance';
  const isPracticing = activityState === 'practice';
  const isActive = isPerforming || isPracticing;
  // True when the current step has an engine-generated backing track (drums/bass/chords).
  // Used to suppress the metronome in Play Now mode — the drum track provides the pulse.
  const hasBackingParts =
    ((currentStep as ActivityStepV2).backing_parts?.engine_generates?.length ??
      0) > 0;

  // Key from flow params — no GCM dependency
  const keyRoot = useMemo(() => {
    const keyName = flow.params.defaultKey.split(' ')[0];
    return parseKeyRoot(keyName);
  }, [flow.params.defaultKey]);

  // Chord symbols follow the chord notation setting; Roman numbers from the key.
  const chordNotation = useChordNotation();
  const chordContext = useMemo<ChordContext>(
    () => ({
      keyRootPc: keyRoot % 12,
      mode: SCALE_TO_MODE[flow.params.defaultScaleId ?? ''] ?? null,
    }),
    [keyRoot, flow.params.defaultScaleId],
  );

  // Key color from app's color system — mode-shifted to match Music Atlas key center colors
  const keyColor = useMemo(() => {
    const keyName = flow.params.defaultKey.split(' ')[0];
    const modeSlug =
      SCALE_TO_MODE[flow.params.defaultScaleId ?? ''] ?? 'dorian';
    return colorForKeyMode(
      keyName,
      modeSlug as Parameters<typeof colorForKeyMode>[1],
    );
  }, [flow.params.defaultKey, flow.params.defaultScaleId]);

  // Demo playback hook
  const { playDemo, stopDemo, demoHighlightMidis, isPlayingDemo } =
    useDemoPlayback(keyRoot, tempo);

  // Progress hook — needed here for variant rotation before targetNotes
  const { assess } = useGenreAssessment();
  const { progress, recordResult, recordSectionComplete, getSectionProgress } =
    useGenreProgress(genre, level, {
      onGlobeUpdate,
      onStudioUpdate,
      onArcadeUpdate,
      onBackendSync,
    });

  // Classroom app-route bridge: inert unless this lesson was opened from a live
  // slide. Fires once when the launched section completes.
  const { reportCompletion } = useMspModuleCompletion();

  // Variant rotation — cycle through variants by attempt count
  const attemptCount = progress.completedSteps[currentStep.tag]?.attempts ?? 0;
  const activeVariant = currentStep.variants
    ? currentStep.variants[attemptCount % currentStep.variants.length]
    : null;
  const resolvedStep = activeVariant
    ? {
        ...currentStep,
        targetNotes: activeVariant.targetNotes,
        ...(activeVariant.chordSymbols
          ? { chordSymbols: activeVariant.chordSymbols }
          : {}),
      }
    : currentStep;

  // Notes from resolver
  if (
    import.meta.env.DEV &&
    (currentStep.variants || currentStep.tag.includes('performance'))
  ) {
    console.log(
      '[VARIANT DEBUG]',
      'tag:',
      currentStep.tag,
      '| hasVariants:',
      !!currentStep.variants,
      '| variantCount:',
      currentStep.variants?.length,
      '| attemptCount:',
      attemptCount,
      '| activeVariantId:',
      activeVariant?.variantId,
      '| resolvedCount:',
      resolvedStep.targetNotes?.length,
    );
  }
  const targetNotes = useMemo(
    () =>
      resolveStepContent(resolvedStep, {
        section: activeSection,
        keyRoot,
        tempo,
        timeSignature: [4, 4],
        tpb: 480,
        defaultScale: flow.params.defaultScale,
      }) ?? [],
    [resolvedStep, activeSection, keyRoot, tempo, flow.params.defaultScale],
  );

  // For IT activities, offset all notes by 1 bar to create a genuine count-in
  const COUNT_IN_OFFSET = 1920; // one bar at 4/4
  /** Lead time given to every transport start, so the graph is ready. */
  const TRANSPORT_LEAD_SEC = 0.1;
  /** A little past the start, so the first read is a real tick, not a null. */
  const PLAYHEAD_SETTLE_MS = 60;
  // In time, the student's bar 1 arrives two bars after transport start: the
  // piano roll's own count-in bar (its playhead starts a bar early) plus the
  // one-bar note offset above. Audio scheduled on the transport — the practice
  // guide and the Play Now backing track — must start its bar 1 there.
  const LEAD_IN_TICKS = COUNT_IN_OFFSET * 2;

  // Convert to PianoRoll format (with IT count-in offset)
  const pianoRollEvents = useMemo(() => {
    const events = toPianoRollEvents(targetNotes, keyColor, keyRoot);
    if (!isIT) return events;
    // Shift all note onsets forward by one bar for count-in space
    return events.map((e) => ({
      ...e,
      startTicks: e.startTicks + COUNT_IN_OFFSET,
    }));
  }, [targetNotes, isIT, keyColor, keyRoot]);

  // Compute bars needed for PianoRoll
  const requiredBars = useMemo(() => {
    if (targetNotes.length === 0) return 2;
    const maxTick = Math.max(...targetNotes.map((n) => n.onset + n.duration));
    const contentBars = Math.ceil(maxTick / 1920);
    // IT gets +1 bar for the count-in offset
    return Math.max(2, contentBars + (isIT ? 1 : 0));
  }, [targetNotes, isIT]);

  // Which clef the notation view writes on. A melody reads in the treble clef
  // whatever register it dips into — letting the grand-staff split decide from
  // pitch drops a low phrase into the bass clef mid-line. Chords follow the
  // clef the student picks, which changes the drawing and nothing else: the
  // same keys read in either clef, and reading both is worth practising.
  // Play-Along tags its notes by hand, so it keeps the grand staff and the
  // split those tags drive.
  const [chordClef, setChordClef] = useChordClef();
  const isChordSection = activeSection === 'B';

  // A step that gives both hands a role is a two-hand part: the roll splits
  // into LH and RH lanes, so the staff is a grand staff. Not just the D
  // section — a Section B voicing with LH bass under RH chords is two hands
  // too, and used to draw on whichever single clef the toggle happened to say.
  const isDualStaff = useMemo(
    () =>
      !!resolvedStep.instrument_config &&
      resolvedStep.instrument_config.hand_config !== 'open' &&
      resolvedStep.instrument_config.lh_role !== 'open' &&
      resolvedStep.instrument_config.rh_role !== 'open',
    [resolvedStep.instrument_config],
  );

  const notationStaves = useMemo((): NotationStaves | undefined => {
    // The split wins over every section default and over the clef preference.
    if (isDualStaff) return 'grand';
    if (activeSection === 'A') return 'treble';
    if (activeSection === 'C') return 'bass';
    if (isChordSection) return chordClef;
    return undefined;
  }, [isDualStaff, activeSection, isChordSection, chordClef]);

  // Shown on every chord step so the control doesn't flicker in and out, but
  // inert on two-hand steps where there is no single-clef reading to choose.
  const clefToggle = isChordSection ? (
    <ClefToggle
      clef={chordClef}
      onChange={setChordClef}
      disabled={isDualStaff}
    />
  ) : undefined;

  // Auto-fit note range from target notes
  const noteRange = useMemo(() => {
    // Section C = Bass — cap the top at C4 (MIDI 60) so the keyboard renders low
    const isBassSection = activeSection === 'C';
    const keyboardMaxCap = isBassSection ? 60 : Infinity;

    if (!targetNotes.length) {
      return isBassSection ? { min: 36, max: 60 } : { min: 48, max: 72 }; // C2-C4 for bass, C3-C5 default
    }

    const midis = targetNotes.map((n) => n.midi);
    const rawMin = Math.min(...midis);
    const rawMax = Math.max(...midis);

    // Pad 3 semitones above and below
    const paddedMin = rawMin - 3;
    const paddedMax = Math.min(rawMax + 3, keyboardMaxCap);

    // Never less than one octave (12 semitones)
    const range = paddedMax - paddedMin;
    if (range < 12) {
      const center = Math.floor((paddedMin + paddedMax) / 2);
      return { min: center - 6, max: Math.min(center + 6, keyboardMaxCap) };
    }

    return { min: paddedMin, max: paddedMax };
  }, [targetNotes, activeSection]);

  // Convert MIDI range to octave numbers for PianoKeyboard
  const startOctave = Math.floor(noteRange.min / 12) - 1;
  const endOctave = Math.floor(noteRange.max / 12) - 1;

  // Piano roll container height
  const PIANO_ROLL_HEIGHT = 400;
  // rowHeight is the TOTAL height passed to PianoRoll — it divides internally by lane count
  // Subtract ~40px for timeline header and padding
  const rowHeight = PIANO_ROLL_HEIGHT - 40;

  // Static piano roll height for dual stave — computed once on mount at 90% of available space.
  // Not reactive to resize: avoids layout thrashing and prevents the preview modal from
  // covering the keyboard demo during playback.
  //
  // The 1.5x multiplier is deliberate, not decorative: DualStaffPianoRoll scales its lane
  // height up to TARGET_LANE_HEIGHT (18px) and no further — below that ceiling, note rows
  // are cramped and hard to read; at or above it, they're not. Without the multiplier, a
  // typical two-hand chord+melody step (~30 chromatic lanes across both staves) lands
  // around 12px/lane. 1.5x lands it at exactly 18px/lane — legible, not oversized. The
  // container scrolls (Main content area is overflow-y: auto), so on shorter viewports this
  // trades some scrolling for a piano roll that's actually usable, which is the right trade.
  const pianoRollMaxHeight = useMemo(() => {
    const HEADER = 82; // breadcrumb + title + step counter
    const SECTION_TABS = 48; // A/B/C/D tabs row
    const STEP_NAV = 38; // dot progress nav row
    const TEMPO_BAR = 44; // always reserve even when hidden (IT-only bar)
    const SECTION_PADDING = 16; // 8px top + 8px bottom of piano section container
    const KEYBOARD = 128; // 120px keyboard + 8px margin-top
    const PRACTICE_CONTROLS = 64; // Back / Demo / Perform bar
    const overhead =
      HEADER +
      SECTION_TABS +
      STEP_NAV +
      TEMPO_BAR +
      SECTION_PADDING +
      KEYBOARD +
      PRACTICE_CONTROLS;
    const base = Math.max(
      200,
      Math.floor((window.innerHeight - overhead) * 0.9),
    );
    return Math.floor(base * 1.5);
  }, []); // empty deps — computed once at mount

  // Keyboard highlights
  const keyboardPlayingNotes: PlaybackEvent[] = useMemo(
    () =>
      targetNotes.map((n, i) => ({
        id: `kb_${i}`,
        type: 'note' as const,
        midi: n.midi,
        time: 0,
        duration: 1,
        velocity: n.velocity ?? 80,
      })),
    [targetNotes],
  );

  // Target MIDI set for correct/wrong detection
  const targetMidiSet = useMemo(
    () => new Set(targetNotes.map((n) => n.midi)),
    [targetNotes],
  );

  // Keyboard color — priority: wrong (gray) > correct (keyColor) > preview (keyColor)
  const keyboardActiveColor = useMemo(() => {
    if (activityState === 'preview') return keyColor;
    if (activityState === 'practice' || activityState === 'performance') {
      if (activeMidis.length === 0) return keyColor;
      const anyWrong = activeMidis.some((m) => !targetMidiSet.has(m));
      return anyWrong ? '#aaaaaa' : keyColor;
    }
    return null;
  }, [activityState, activeMidis, targetMidiSet, keyColor]);

  // ── Real-time note hold tracking (sequential) ───────────────────────────
  // Track by EVENT INDEX, not MIDI number — so repeated pitches are sequential
  const noteHoldStartRef = useRef<Map<number, number>>(new Map()); // midi → wall-clock ms
  const completedEventIdsRef = useRef<Set<string>>(new Set()); // event.id
  // The next expected event index for each MIDI pitch
  const nextEventForMidiRef = useRef<Map<number, number>>(new Map()); // midi → pianoRollEvents index
  const [holdTick, setHoldTick] = useState(0);

  // Build a sequential map: for each MIDI, which event indices use that pitch (in order)
  const midiToEventIndices = useMemo(() => {
    const map = new Map<number, number[]>();
    pianoRollEvents.forEach((event, idx) => {
      const midi = event.midi ?? 0;
      const list = map.get(midi) ?? [];
      list.push(idx);
      map.set(midi, list);
    });
    return map;
  }, [pianoRollEvents]);

  // Animation loop — runs at ~60fps while any note is held
  useEffect(() => {
    if (!isActive) return;
    if (activeMidis.length === 0) return;

    let rafId: number;
    const animate = () => {
      setHoldTick((t) => t + 1);
      rafId = requestAnimationFrame(animate);
    };
    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [activityState, activeMidis.length]);

  // Get the current target event for a MIDI pitch (next uncompleted one).
  // OOT: enforces sequential order — only events at the earliest uncompleted
  // onset are eligible, so you can't skip ahead by playing a later note.
  const getCurrentEventForMidi = useCallback(
    (
      midi: number,
    ): { event: (typeof pianoRollEvents)[0]; index: number } | null => {
      const indices = midiToEventIndices.get(midi);
      if (!indices) return null;

      if (!isIT) {
        // Find the minimum onset among all uncompleted events (the current onset group)
        let minOnset = Infinity;
        for (const ev of pianoRollEvents) {
          if (!completedEventIdsRef.current.has(ev.id)) {
            const onset = ev.startTicks;
            if (onset < minOnset) minOnset = onset;
          }
        }
        if (minOnset === Infinity) return null;
        // Only match events belonging to that onset group
        for (const idx of indices) {
          const ev = pianoRollEvents[idx];
          if (
            !completedEventIdsRef.current.has(ev.id) &&
            ev.startTicks === minOnset
          ) {
            return { event: ev, index: idx };
          }
        }
        return null;
      }

      // IT: original behavior — next uncompleted event for this pitch
      for (const idx of indices) {
        const ev = pianoRollEvents[idx];
        if (!completedEventIdsRef.current.has(ev.id)) {
          return { event: ev, index: idx };
        }
      }
      return null;
    },
    [midiToEventIndices, pianoRollEvents, isIT],
  );

  // Track note-on start times
  useEffect(() => {
    for (const midi of activeMidis) {
      if (!noteHoldStartRef.current.has(midi)) {
        noteHoldStartRef.current.set(midi, performance.now());
      }
    }
    // On note-off, check if held long enough for the NEXT uncompleted event
    let didComplete = false;
    for (const [midi] of noteHoldStartRef.current) {
      if (!activeMidis.includes(midi)) {
        const startMs = noteHoldStartRef.current.get(midi)!;
        const elapsedMs = performance.now() - startMs;
        const target = getCurrentEventForMidi(midi);
        if (target) {
          const msPerTick = (60 / 100 / 480) * 1000;
          const requiredMs = target.event.durationTicks * msPerTick;
          if (elapsedMs >= requiredMs * 0.8) {
            completedEventIdsRef.current.add(target.event.id);
            didComplete = true;
          }
        }
        noteHoldStartRef.current.delete(midi);
      }
    }
    if (didComplete) setHoldTick((t) => t + 1);
  }, [activeMidis, getCurrentEventForMidi]);

  // Reset hold tracking on step change
  useEffect(() => {
    noteHoldStartRef.current.clear();
    completedEventIdsRef.current.clear();
    nextEventForMidiRef.current.clear();
  }, [stepIndex, activeSection]);

  // Compute noteHoldMeta with real-time progress — per event, not per MIDI
  const noteHoldMeta = useMemo(() => {
    void holdTick;
    const now = performance.now();
    const meta: Record<
      string,
      {
        isCompleted: boolean;
        isCurrentChord: boolean;
        holdProgress: number;
        isHeld?: boolean;
      }
    > = {};

    pianoRollEvents.forEach((event) => {
      const midi = event.midi ?? 0;
      const isCompleted = completedEventIdsRef.current.has(event.id);

      // Only highlight the NEXT uncompleted event for this MIDI pitch
      const currentTarget = getCurrentEventForMidi(midi);
      const isCurrentTarget = currentTarget?.event.id === event.id;
      const isHeld = activeMidis.includes(midi) && isCurrentTarget;

      let holdProgress = 0;
      if (isCompleted) {
        holdProgress = 1;
      } else if (isHeld) {
        const startMs = noteHoldStartRef.current.get(midi);
        if (startMs != null) {
          const elapsedMs = now - startMs;
          const msPerTick = (60 / 100 / 480) * 1000;
          const requiredMs = event.durationTicks * msPerTick;
          holdProgress = Math.min(1, elapsedMs / requiredMs);
        }
      }

      meta[event.id] = {
        isCompleted,
        isCurrentChord: isCurrentTarget || isCompleted,
        holdProgress,
        isHeld,
      };
    });
    return meta;
  }, [pianoRollEvents, activeMidis, holdTick, getCurrentEventForMidi]);

  // ── IT performance tracking ─────────────────────────────────────────────
  // performanceMeta tracks real-time note blocks for IT mode
  const performanceMetaRef = useRef<
    Record<string, { startTick: number; endTick?: number }>
  >({});

  const performanceMeta = useMemo(() => {
    // Recompute on holdTick for live updates
    void holdTick;
    return { ...performanceMetaRef.current };
  }, [holdTick]);

  // Track IT note-on/note-off into performanceMeta
  // (MIDI subscription already populates userNotes — here we map to event IDs)
  useEffect(() => {
    if (!isIT || !isActive) return;

    for (const midi of activeMidis) {
      // Find matching piano roll event for this MIDI
      const matchingEvent = pianoRollEvents.find(
        (e) =>
          (e.midi ?? 0) === midi &&
          e.startTicks <= currentTickRef.current + 120 &&
          e.startTicks + e.durationTicks >= currentTickRef.current - 120 &&
          !performanceMetaRef.current[e.id]?.endTick,
      );
      if (matchingEvent && !performanceMetaRef.current[matchingEvent.id]) {
        performanceMetaRef.current[matchingEvent.id] = {
          startTick: currentTickRef.current,
        };
        setHoldTick((t) => t + 1); // force recompute
      }
    }

    // Note-off: set endTick for released notes
    for (const [id, meta] of Object.entries(performanceMetaRef.current)) {
      if (meta.endTick != null) continue;
      const event = pianoRollEvents.find((e) => e.id === id);
      if (!event) continue;
      const midi = event.midi ?? 0;
      if (!activeMidis.includes(midi)) {
        performanceMetaRef.current[id] = {
          ...meta,
          endTick: currentTickRef.current,
        };
        setHoldTick((t) => t + 1);
      }
    }
  }, [activeMidis, isIT, activityState, pianoRollEvents]);

  // Reset performanceMeta on step change
  useEffect(() => {
    performanceMetaRef.current = {};
  }, [stepIndex, activeSection]);

  // ── Hooks (assess, progress, variant resolution moved above targetNotes) ──

  const { startBacking, stopBacking, initSF2 } = useBackingTrack(tempo);
  const [instrumentsLoading, setInstrumentsLoading] = useState(false);

  // Lesson volume — shared across every lesson surface so theory/technique
  // activities and genre lessons stay in sync. The store applies the value
  // to the piano sampler internally; we read volumeDb here to retune the
  // metronome synth on top of that.
  const { volumeDb: lessonVolumeDb } = useLessonVolume();

  // Shared Learn metronome switch — the same control the theory activities use,
  // so turning the click off stays off as you move between surfaces.
  const { metronomeEnabled } = usePracticeSettings();

  const { setBpm, prepare: prepareMetronome } = useMetronome({
    bpm: tempo,
    // Disable metronome in Play Now (performance) mode when a backing track is running —
    // the drum track provides the pulse. Practice mode always gets the metronome.
    enabled:
      metronomeEnabled &&
      isActive &&
      isIT &&
      !(isPerforming && hasBackingParts),
    // Track the dial directly. The synth's intrinsic level + the velocity
    // attack values inside useMetronome already balance it relative to the
    // piano sampler — adding extra attenuation here made the click inaudible.
    volumeDb: lessonVolumeDb,
  });

  // ── Tick counter ──────────────────────────────────────────────────────────

  const stopTickCounter = useCallback(() => {
    if (tickIntervalRef.current) {
      clearInterval(tickIntervalRef.current);
      tickIntervalRef.current = null;
    }
    currentTickRef.current = 0;
  }, []);

  // Clean up tick counter on unmount
  useEffect(() => {
    return () => stopTickCounter();
  }, [stopTickCounter]);

  /**
   * Audio-clock second the transport is scheduled to begin, or null when it is
   * not running. Every start goes through startTransport so this is always set
   * before the playhead can ask a question about a time near the beginning.
   */
  const transportStartRef = useRef<number | null>(null);

  /**
   * Start the transport and remember when it will actually begin.
   *
   * `leadSeconds` buys the audio graph a moment to be ready. It is the same for
   * every path on purpose: practice, Play Now with a backing track and Play Now
   * with only a metronome used to start with three different lead times and
   * three different sleeps before the playhead was switched on, so the amount
   * of margin the playhead got depended on which button was pressed. The
   * metronome-only path had none at all, which is what made its playhead sit on
   * beat 1 while the count had already begun.
   */
  const noteTransportStart = useCallback((leadSeconds: number) => {
    const startAt = Tone.now() + leadSeconds;
    transportStartRef.current = startAt;
    return startAt;
  }, []);

  const startTransport = useCallback(
    (leadSeconds = TRANSPORT_LEAD_SEC) => {
      const startAt = noteTransportStart(leadSeconds);
      Tone.getTransport().start(startAt);
      return startAt;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- TRANSPORT_LEAD_SEC is a render-stable constant
    [noteTransportStart],
  );

  /** Stop the transport and forget when it started, so no stale read survives. */
  const stopTransport = useCallback(() => {
    Tone.getTransport().stop();
    transportStartRef.current = null;
  }, []);

  /** Wait until the transport has begun, plus a frame, before the playhead reads it. */
  const waitForTransport = useCallback(async () => {
    const startAt = transportStartRef.current;
    const remaining = startAt === null ? 0 : startAt - Tone.now();
    const ms = Math.max(0, remaining * 1000) + PLAYHEAD_SETTLE_MS;
    await new Promise((resolve) => setTimeout(resolve, ms));
  }, []);

  const ticksAt = useCallback((time: number): number | null => {
    const transport = Tone.getTransport();
    if (transport.state !== 'started') return null;

    // Before the transport begins there is no honest position for this moment.
    // Answering 0 would be a lie the playhead cannot tell from a real tick 0 a
    // count-in bar later, and it would sit at the start for however long the
    // output latency happens to be.
    const startedAt = transportStartRef.current;
    if (startedAt === null || time < startedAt) return null;

    let ticks: number;
    try {
      ticks = (transport.getTicksAtTime(time) / transport.PPQ) * 480;
    } catch {
      // Tone throws for a time outside its recorded history.
      return null;
    }
    return Number.isFinite(ticks) ? ticks : null;
  }, []);

  const playbackTicks = useCallback((): number | null => {
    const context = Tone.getContext().rawContext as AudioContext;
    // Browsers can report a stale device latency after an output switch; a
    // real one is well under half a second, so cap it rather than let a bogus
    // value park the playhead before the run.
    const deviceLatency = Math.min(
      MAX_DEVICE_LATENCY_SEC,
      Math.max(0, (context.outputLatency ?? 0) + (context.baseLatency ?? 0)),
    );
    return ticksAt(
      context.currentTime -
        deviceLatency -
        useSettingsStore.getState().outputLatencyMs / 1000,
    );
  }, [ticksAt]);

  // Where a note played right now lands in the music: it sounds from the audio
  // clock's "now", travels to the speakers alongside the backing track, and so
  // reaches the student's ear beside it. Hits are stamped and scored here, not
  // at the playhead — a player with output latency presses early so that what
  // they hear of themselves lands on the beat, and that's the playing to judge.
  const soundingTicks = useCallback((): number | null => {
    const context = Tone.getContext().rawContext as AudioContext;
    const ticks = ticksAt(context.currentTime);
    // Into the piano roll's space, where its own count-in bar puts tick 0 one
    // bar after the transport starts — that's how user notes are stored.
    return ticks == null ? null : ticks - COUNT_IN_OFFSET;
  }, [ticksAt, COUNT_IN_OFFSET]);

  // ── MIDI input subscription (dongle connection — read-only) ──────────────

  const {
    subscribeNoteOn,
    subscribeNoteOff,
    start: startInput,
    stop: stopInput,
  } = useLearnInputStable();

  // Start MIDI listening on mount (must be called for hardware connection)
  useEffect(() => {
    startInput();
    return () => stopInput();
  }, [startInput, stopInput]);

  useEffect(() => {
    const unsubOn = subscribeNoteOn((event: MidiNoteEvent) => {
      const state = activityStateRef.current;
      if (state !== 'performance' && state !== 'practice') return;
      if (event.velocity === 0) return;

      // Track active MIDI for keyboard highlight (both practice + performance)
      setActiveMidis((prev) =>
        prev.includes(event.number) ? prev : [...prev, event.number],
      );

      // Play audio — piano sampler, sustains until note-off
      const noteName = midiToPitchName(event.number, keyRoot);
      void triggerPianoAttack(noteName, event.velocity);

      // Capture notes for visual rendering (both practice + performance).
      const hitTick = soundingTicks() ?? currentTickRef.current;
      setUserNotes((prev) => [
        ...prev,
        {
          midi: event.number,
          onset: Math.max(0, hitTick),
          duration: 0,
          velocity: event.velocity,
        },
      ]);
    });

    const unsubOff = subscribeNoteOff((event: MidiNoteEvent) => {
      const state = activityStateRef.current;
      if (state !== 'performance' && state !== 'practice') return;

      // Release piano sound
      const noteName = midiToPitchName(event.number, keyRoot);
      void triggerPianoRelease(noteName);

      // Remove from active MIDI (both practice + performance)
      setActiveMidis((prev) => prev.filter((m) => m !== event.number));

      // Update note duration (both practice + performance)
      const releaseTick = soundingTicks() ?? currentTickRef.current;
      setUserNotes((prev) =>
        prev.map((n) =>
          n.midi === event.number && n.duration === 0
            ? { ...n, duration: releaseTick - n.onset }
            : n,
        ),
      );
    });

    return () => {
      unsubOn();
      unsubOff();
    };
  }, [subscribeNoteOn, subscribeNoteOff, keyRoot, soundingTicks]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleComplete = useCallback(() => {
    // Guard: don't complete if no meaningful time has elapsed. IT-only —
    // OOT completion is already gated by actually satisfying each note's
    // hold-duration requirement (completedEventIdsRef), so a fast pentatonic
    // run or short arpeggio can legitimately finish in under a second. Blocking
    // that here silently ate the completion with no retry path, leaving the
    // activity stuck in 'performance' with no popup (see bug report).
    const elapsed = Date.now() - playStartedAtRef.current;
    if (isIT && elapsed < 1000) return;

    const doComplete = () => {
      stopTickCounter();
      stopBacking();
      stopTransport();
      Tone.getTransport().cancel();
      // For IT, shift user note onsets back by COUNT_IN_OFFSET to align with target onsets
      const adjustedUserNotes = isIT
        ? userNotes.map((n) => ({ ...n, onset: n.onset - COUNT_IN_OFFSET }))
        : userNotes;
      const result = assess(
        targetNotes,
        adjustedUserNotes,
        currentStep.assessment ?? 'pitch_only',
        [currentStep.tag],
        currentStep.successFeedback,
        tempo,
      );
      setLastResult(result);
      setActivityState('complete');
      recordResult(currentStep.tag, result, {
        section: activeSection,
        key: flow.params.defaultKey,
        styleRef: currentStep.styleRef,
        stepsTotal: currentSection.steps.length,
        skillTags: [currentStep.tag],
      });
    };

    // Complete immediately — state must change before next render
    // to prevent PianoRoll from restarting the animation loop
    doComplete();
  }, [
    targetNotes,
    userNotes,
    currentStep,
    activeSection,
    flow,
    isIT,
    currentSection,
    assess,
    recordResult,
    setActivityState,
    stopTickCounter,
    stopBacking,
    tempo,
  ]);

  // Max tick = end of last note (with COUNT_IN_OFFSET for IT)
  const maxContentTick = useMemo(() => {
    if (!targetNotes.length) return 1920;
    const maxRaw = Math.max(...targetNotes.map((n) => n.onset + n.duration));
    return isIT ? maxRaw + COUNT_IN_OFFSET : maxRaw;
  }, [targetNotes, isIT]);

  // Chord symbols above the staff, from the step's own symbols. They sit on
  // the same timeline as the notes, so in time they carry the count-in offset
  // too. The notes come along because a step with more chords than bars — two
  // inside one bar of voice leading — has to place them against the music
  // rather than against the barlines. Written through the shared formatter, so
  // they read the same here as on a song chart and follow the Jazz/Roman
  // switcher.
  const chordSymbolsForStaff = useMemo(() => {
    const labels = currentStep.chordSymbols;
    if (!labels?.length) return undefined;
    const contentBars = Math.max(1, requiredBars - (isIT ? 1 : 0));
    const onsets = [...new Set(targetNotes.map((n) => n.onset))].sort(
      (a, b) => a - b,
    );
    const contentEndTick = targetNotes.length
      ? Math.max(...targetNotes.map((n) => n.onset + n.duration))
      : undefined;
    return lessonChordSymbols(
      placeLessonChords(labels, {
        bars: contentBars,
        ticksPerBar: 1920,
        onsets,
        ...(contentEndTick !== undefined ? { contentEndTick } : {}),
        startTick: isIT ? COUNT_IN_OFFSET : 0,
      }),
      chordNotation,
      chordContext,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- COUNT_IN_OFFSET is a module-level constant
  }, [
    currentStep,
    requiredBars,
    isIT,
    targetNotes,
    chordNotation,
    chordContext,
  ]);

  // Simple tick sync — no completion logic here
  const handleTickChange = useCallback((tick: number) => {
    currentTickRef.current = tick;
  }, []);

  // In time, the playhead reads the transport: its position at the moment the
  // student hears it (the audio clock less the output latency the browser
  // reports, and less any extra set in Settings ▸ Audio for Bluetooth
  // headphones). It can't drift from the backing track, metronome or practice
  // guide, and scoring follows what the student hears.
  const handleNext = useCallback(() => {
    stopTickCounter();
    if (stepIndex < currentSection.steps.length - 1) {
      setStepIndex((i) => i + 1);
      setActivityState('preview');
      setUserNotes([]);
      setLastResult(null);
      setActiveMidis([]);
      currentTickRef.current = 0;
    } else {
      // Section complete — fire dongle
      recordSectionComplete(
        activeSection,
        flow.params.defaultKey,
        currentStep.styleRef as StyleSubProfile,
      );
      // Classroom app-route completion (no-op unless launched from a slide).
      reportCompletion();
      // Move to next section if available
      const currentSectionIdx = flow.sections.findIndex(
        (s) => s.id === activeSection,
      );
      if (currentSectionIdx < flow.sections.length - 1) {
        setActiveSection(flow.sections[currentSectionIdx + 1].id);
        setStepIndex(0);
        setActivityState('preview');
        setUserNotes([]);
        setLastResult(null);
        setActiveMidis([]);
      }
    }
  }, [
    stepIndex,
    currentSection,
    activeSection,
    flow,
    currentStep,
    recordSectionComplete,
    reportCompletion,
    setActivityState,
    stopTickCounter,
  ]);

  const handleRetry = useCallback(() => {
    stopTickCounter();
    stopBacking();
    setActivityInstanceId((id) => id + 1);
    setActivityState('preview');
    setUserNotes([]);
    setLastResult(null);
    setActiveMidis([]);
    setHoldTick(0);
    currentTickRef.current = 0;
    performanceMetaRef.current = {};
    noteHoldStartRef.current.clear();
    completedEventIdsRef.current.clear();
    playStartedAtRef.current = 0;
    hasStartedRef.current = false;
    if (itTimerRef.current) {
      clearTimeout(itTimerRef.current);
      itTimerRef.current = null;
    }
  }, [setActivityState, stopTickCounter, stopBacking]);

  const handleTempoChange = useCallback(
    (newTempo: number) => {
      const clamped = Math.max(40, Math.min(200, newTempo));
      setTempo(clamped);
      setBpm(clamped);
    },
    [setBpm],
  );

  const handleSectionChange = useCallback(
    (sectionId: ActivitySectionId) => {
      stopDemo();
      stopBacking();
      stopTransport();
      Tone.getTransport().cancel();
      if (itTimerRef.current) {
        clearTimeout(itTimerRef.current);
        itTimerRef.current = null;
      }
      stopTickCounter();
      setActiveSection(sectionId);
      setStepIndex(0);
      setActivityState('preview');
      setUserNotes([]);
      setLastResult(null);
      setActiveMidis([]);
    },
    [setActivityState, stopTickCounter, stopDemo, stopBacking],
  );

  // ── OOT auto-completion detection ─────────────────────────────────────────

  useEffect(() => {
    if (activityState !== 'performance' && activityState !== 'practice') return;
    if (isIT) return;
    if (currentStep.assessment !== 'pitch_only') return;
    if (targetNotes.length === 0) return;

    // Check if ALL events have been completed (sequential, per-event)
    const allCompleted =
      pianoRollEvents.length > 0 &&
      pianoRollEvents.every((e) => completedEventIdsRef.current.has(e.id));

    if (!allCompleted) return;

    if (activityState === 'performance') {
      handleComplete();
    } else if (activityState === 'practice') {
      // Practice complete — stop everything, return to preview
      stopDemo();
      stopTransport();
      Tone.getTransport().cancel();
      setActivityState('preview');
      setUserNotes([]);
      setActiveMidis([]);
      completedEventIdsRef.current.clear();
      noteHoldStartRef.current.clear();
    }
  }, [
    holdTick,
    activityState,
    currentStep.assessment,
    targetNotes,
    handleComplete,
    stopDemo,
    setActivityState,
    isIT,
    pianoRollEvents,
  ]);

  // ── IT completion timer ─────────────────────────────────────────────────
  // Ref to latest handleComplete so the timer always calls the current version
  const handleCompleteRef = useRef(handleComplete);
  handleCompleteRef.current = handleComplete;
  const handleStopPracticeRef = useRef<(() => void) | null>(null);

  const itTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Only for IT performance or practice mode
    if (
      (activityState !== 'performance' && activityState !== 'practice') ||
      !isIT
    ) {
      if (itTimerRef.current) {
        clearTimeout(itTimerRef.current);
        itTimerRef.current = null;
      }
      return;
    }

    // Calculate content duration in ms
    const contentTicks = maxContentTick + 1920; // +1 bar for PianoRoll's built-in count-in
    const msPerTick = (60 / tempo / 480) * 1000;
    const totalMs = contentTicks * msPerTick;

    console.log(
      '[IT Timer] Starting. Duration:',
      Math.round(totalMs),
      'ms, ticks:',
      contentTicks,
      'tempo:',
      tempo,
    );

    itTimerRef.current = setTimeout(() => {
      console.log('[IT Timer] Fired! State:', activityStateRef.current);
      const state = activityStateRef.current;
      if (state === 'performance') {
        handleCompleteRef.current();
      } else if (state === 'practice') {
        // Practice IT complete — stop and return to preview
        handleStopPracticeRef.current?.();
      }
    }, totalMs);

    return () => {
      if (itTimerRef.current) {
        clearTimeout(itTimerRef.current);
        itTimerRef.current = null;
      }
    };
  }, [activityState, isIT, maxContentTick, tempo]); // NO handleComplete in deps

  // ── Keyboard shortcuts for step navigation ──────────────────────────────

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (activityState !== 'preview') return;
      if (
        e.key === 'ArrowRight' &&
        stepIndex < currentSection.steps.length - 1
      ) {
        setStepIndex((i) => i + 1);
      }
      if (e.key === 'ArrowLeft' && stepIndex > 0) {
        setStepIndex((i) => i - 1);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [activityState, stepIndex, currentSection.steps.length]);

  // ── Reset on flow change ───────────────────────────────────────────────

  useEffect(() => {
    setActiveSection(initialSection ?? 'A');
    setStepIndex(0);
    setActivityState('preview');
    setUserNotes([]);
    setLastResult(null);
    setActiveMidis([]);
    stopTickCounter();
    setTempo(flow.params.tempoRange[0]);
  }, [flow, setActivityState, stopTickCounter]);

  // ── Practice mode handlers ──────────────────────────────────────────────

  const handleStartPractice = useCallback(async () => {
    // Stop any audio that may be running from a prior state
    stopDemo();
    stopBacking();
    stopTransport();
    Tone.getTransport().cancel();

    await startTone();
    await startPianoSampler();

    // Reset state before starting — but don't activate yet for IT
    setActivityInstanceId((id) => id + 1);
    setUserNotes([]);
    setActiveMidis([]);
    noteHoldStartRef.current.clear();
    completedEventIdsRef.current.clear();
    setHoldTick(0);

    if (!isIT) {
      // OOT: no transport timing — activate immediately
      setActivityState('practice');
      return;
    }

    // IT: start Transport BEFORE activating piano roll playhead
    stopTransport();
    Tone.getTransport().position = 0;
    Tone.getTransport().bpm.value = tempo;

    // Set up metronome synth + sequence at position 0 BEFORE Transport starts,
    // so beat 1 fires cleanly. The runningRef guard prevents the useEffect from
    // restarting when enabled flips true after setActivityState('practice').
    // Always call prepareMetronome — in practice mode no backing track runs,
    // so the metronome must always be primed here (including D activities).
    await prepareMetronome();

    // Schedule target notes as an audio guide in practice mode.
    // Notes are offset by the count-in bar (COUNT_IN_OFFSET ticks) to align
    // with the piano roll playhead. Muted in Play Now (performance) mode so
    // the student plays without a guide.
    if (practiceNotePartRef.current) {
      practiceNotePartRef.current.stop();
      practiceNotePartRef.current.dispose();
      practiceNotePartRef.current = null;
    }
    if (targetNotes.length > 0) {
      const spt = 60 / (tempo * 480); // seconds per tick
      const noteEvents = targetNotes.map((n) => ({
        time: (n.onset + LEAD_IN_TICKS) * spt,
        midi: n.midi,
        durationSec: n.duration * spt,
      }));
      const part = new Tone.Part(
        (time, value: { midi: number; durationSec: number }) => {
          playGuideNote(value.midi, value.durationSec, 80, time);
          // Drive keyboard highlight in sync with audio guide
          Tone.getDraw().schedule(() => {
            setPracticeHighlightMidis((prev) => new Set([...prev, value.midi]));
          }, time);
          Tone.getDraw().schedule(() => {
            setPracticeHighlightMidis((prev) => {
              const next = new Set(prev);
              next.delete(value.midi);
              return next;
            });
          }, time + value.durationSec);
        },
        noteEvents,
      );
      part.start(0);
      practiceNotePartRef.current = part;
    }

    startTransport();

    // Let the transport actually begin before the playhead starts asking it
    // where it is; ticksAt answers null until then, so the playhead would hold.
    await waitForTransport();
    setActivityState('practice');
  }, [
    tempo,
    isIT,
    targetNotes,
    prepareMetronome,
    setActivityState,
    stopDemo,
    stopBacking,
  ]);

  const handleStopPractice = useCallback(() => {
    stopTransport();
    Tone.getTransport().position = 0;
    // Dispose practice melody guide part
    if (practiceNotePartRef.current) {
      practiceNotePartRef.current.stop();
      practiceNotePartRef.current.dispose();
      practiceNotePartRef.current = null;
    }
    setPracticeHighlightMidis(new Set());
    setActivityState('preview');
  }, [setActivityState]);
  handleStopPracticeRef.current = handleStopPractice;

  const handleStartPerformance = useCallback(async () => {
    // Stop ALL audio completely before assessment begins
    handleStopPractice();
    stopDemo();
    stopBacking();
    stopTransport();
    Tone.getTransport().cancel();
    Tone.getTransport().position = 0;

    // Reset state BEFORE starting — but don't set 'performance' yet
    // (that triggers the piano roll playhead, which must wait for audio)
    setActivityInstanceId((id) => id + 1);
    setUserNotes([]);
    setLastResult(null);
    setActiveMidis([]);
    setHoldTick(0);
    currentTickRef.current = 0;
    performanceMetaRef.current = {};
    noteHoldStartRef.current.clear();
    completedEventIdsRef.current.clear();
    hasStartedRef.current = false;

    // Start backing track FIRST — audio must be running before playhead starts
    const hasBackingParts =
      ((currentStep as ActivityStepV2).backing_parts?.engine_generates
        ?.length ?? 0) > 0;
    if (hasBackingParts) {
      setInstrumentsLoading(true);
      await initSF2();
      setInstrumentsLoading(false);

      await startBacking(
        resolvedStep as ActivityStepV2,
        keyRoot,
        flow.level,
        (resolvedStep as ActivityStepV2).styleRef ?? 'l1a',
        targetNotes,
        undefined, // no metronome in Play Now with backing track — drums provide the pulse
        flow.genre,
        isIT ? LEAD_IN_TICKS : 0, // backing bar 1 = the student's bar 1
      );

      // startBacking starts the transport itself; record the same lead so
      // ticksAt knows when it begins, then wait for it like every other path.
      noteTransportStart(BACKING_LEAD_SEC);
      await waitForTransport();
      playStartedAtRef.current = Date.now();
      setActivityState('performance');
    } else if (isIT) {
      // Non-backing-track IT path (metronome only):
      // prepare() sets up synth + sequence + loop.start(0) WITHOUT touching Transport.
      // Transport was already stopped + cancelled at the top of this function.
      // Starting Transport AFTER prepare() means beat 1 fires cleanly at position 0
      // with no double-scheduling (the stop/restart that caused the double-click).
      await prepareMetronome();
      startTransport();
      await waitForTransport();
      playStartedAtRef.current = Date.now();
      setActivityState('performance');
    } else {
      // Non-IT, non-backing-track (OOT steps): no metronome needed.
      playStartedAtRef.current = Date.now();
      setActivityState('performance');
    }
  }, [
    setActivityState,
    handleStopPractice,
    stopDemo,
    stopBacking,
    startBacking,
    initSF2,
    prepareMetronome,
    isIT,
    currentStep,
    keyRoot,
    requiredBars,
    flow,
  ]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#111',
        color: '#eee',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          borderBottom: '1px solid #333',
        }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '6px',
            }}
          >
            <button
              type="button"
              onClick={() => navigate('/learn')}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                fontSize: '11px',
                color: 'var(--color-text-dim)',
                cursor: 'pointer',
                fontFamily: 'inherit',
                opacity: 0.7,
              }}
              className="hover:opacity-100 transition-opacity"
            >
              Courses
            </button>
            <span
              style={{
                fontSize: '11px',
                color: 'var(--color-text-dim)',
                opacity: 0.4,
              }}
            >
              ›
            </span>
            <button
              type="button"
              onClick={() =>
                navigate(overviewRoute ?? CurriculumRoutes.genre({ genre }))
              }
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                fontSize: '11px',
                color: 'var(--color-text-dim)',
                cursor: 'pointer',
                fontFamily: 'inherit',
                opacity: 0.7,
              }}
              className="hover:opacity-100 transition-opacity"
            >
              {genreDisplayName}
            </button>
          </div>
          <div style={{ fontSize: '14px', color: '#888', marginBottom: '2px' }}>
            {currentStep.subsection}
          </div>
          <div style={{ fontSize: '18px', fontWeight: 600 }}>
            {currentStep.activity}
          </div>
          {resolvedStep.chordSymbols &&
            resolvedStep.chordSymbols.length > 0 && (
              <div
                style={{
                  fontSize: '14px',
                  color: keyColor,
                  marginTop: '2px',
                  fontWeight: 600,
                }}
              >
                {resolvedStep.chordSymbols
                  .map((symbol) =>
                    chordSymbolForDisplay(symbol, chordNotation, chordContext),
                  )
                  .join(' → ')}
              </div>
            )}
        </div>
        <div style={{ textAlign: 'right', fontSize: '13px', color: '#888' }}>
          <div>
            {flow.genre} Level {flow.level}
          </div>
          <div>
            Step {stepIndex + 1} of {currentSection.steps.length}
          </div>
        </div>
      </div>

      {/* Section tabs — from flow data, not hardcoded */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          padding: '8px 16px',
          borderBottom: '1px solid #333',
        }}
      >
        {flow.sections.map((section) => {
          const isSectionActive = section.id === activeSection;
          const sectionProg = getSectionProgress(section.id);
          return (
            <button
              key={section.id}
              onClick={() => handleSectionChange(section.id)}
              style={{
                padding: '6px 14px',
                border: isSectionActive
                  ? '2px solid #4a9eff'
                  : '1px solid #555',
                borderRadius: '8px',
                background: isSectionActive ? '#1a3a5c' : '#222',
                color: isSectionActive ? '#4a9eff' : '#aaa',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: isSectionActive ? 600 : 400,
              }}
            >
              {section.id} {section.name}
              {sectionProg.percentage > 0 && sectionProg.percentage < 100 && (
                <span
                  style={{ fontSize: '11px', marginLeft: '6px', opacity: 0.7 }}
                >
                  {sectionProg.percentage}%
                </span>
              )}
              {sectionProg.percentage === 100 && (
                <span style={{ marginLeft: '6px', fontSize: '12px' }}>
                  &#10003;
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Step navigation — clickable dots + arrows */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '6px 16px',
        }}
      >
        {/* Previous arrow */}
        <button
          onClick={() => {
            if (stepIndex > 0) {
              stopDemo();
              stopBacking();
              stopTransport();
              Tone.getTransport().cancel();
              if (itTimerRef.current) {
                clearTimeout(itTimerRef.current);
                itTimerRef.current = null;
              }
              stopTickCounter();
              setStepIndex((i) => i - 1);
              setActivityState('preview');
              setUserNotes([]);
              setLastResult(null);
              setActiveMidis([]);
            }
          }}
          disabled={stepIndex === 0}
          style={{
            background: 'none',
            border: 'none',
            color: stepIndex === 0 ? '#333' : '#888',
            fontSize: '18px',
            cursor: stepIndex === 0 ? 'default' : 'pointer',
            padding: '0 4px',
          }}
        >
          ‹
        </button>

        {/* Clickable progress dots */}
        {currentSection.steps.map((step, i) => {
          const stepTag = (step as ActivityStepV2).tag;
          const result = progress.completedSteps[stepTag];
          const isPassed = result?.score.passed ?? false;
          const isAttempted = !!result;
          const isCurrent = i === stepIndex;

          const handleDotClick = () => {
            stopDemo();
            stopBacking();
            stopTransport();
            Tone.getTransport().cancel();
            if (itTimerRef.current) {
              clearTimeout(itTimerRef.current);
              itTimerRef.current = null;
            }
            stopTickCounter();
            setStepIndex(i);
            setActivityState('preview');
            setUserNotes([]);
            setLastResult(null);
            setActiveMidis([]);
          };

          if (isPassed) {
            return (
              <button
                key={i}
                onClick={handleDotClick}
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  border: `1.5px solid ${keyColor}`,
                  background: `${keyColor}22`,
                  color: keyColor,
                  fontSize: '10px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  flexShrink: 0,
                  lineHeight: 1,
                }}
                title={`${(step as ActivityStepV2).activity} ✓ Passed`}
              >
                ✓
              </button>
            );
          }

          return (
            <button
              key={i}
              onClick={handleDotClick}
              style={{
                width: isCurrent ? '24px' : '10px',
                height: '10px',
                borderRadius: '5px',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
                backgroundColor: isAttempted
                  ? '#555'
                  : isCurrent
                    ? '#fff'
                    : '#333',
                flexShrink: 0,
                padding: 0,
              }}
              title={`${(step as ActivityStepV2).activity}${isAttempted ? ' — attempted' : ''}`}
            />
          );
        })}

        <span style={{ color: '#666', fontSize: '12px', marginLeft: '6px' }}>
          {stepIndex + 1}/{currentSection.steps.length}
        </span>

        {/* Next arrow */}
        <button
          onClick={() => {
            if (stepIndex < currentSection.steps.length - 1) {
              stopDemo();
              stopBacking();
              stopTransport();
              Tone.getTransport().cancel();
              if (itTimerRef.current) {
                clearTimeout(itTimerRef.current);
                itTimerRef.current = null;
              }
              stopTickCounter();
              setStepIndex((i) => i + 1);
              setActivityState('preview');
              setUserNotes([]);
              setLastResult(null);
              setActiveMidis([]);
            }
          }}
          disabled={stepIndex === currentSection.steps.length - 1}
          style={{
            background: 'none',
            border: 'none',
            color:
              stepIndex === currentSection.steps.length - 1 ? '#333' : '#888',
            fontSize: '18px',
            cursor:
              stepIndex === currentSection.steps.length - 1
                ? 'default'
                : 'pointer',
            padding: '0 4px',
          }}
        >
          ›
        </button>
      </div>

      {/* Tempo control — visible for IT activities */}
      {isIT && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '6px 16px',
            background: 'rgba(255,255,255,0.03)',
            borderBottom: '1px solid #333',
          }}
        >
          <span style={{ fontSize: '14px', color: '#888' }}>&#9833;=</span>
          <input
            type="number"
            value={tempo}
            min={40}
            max={200}
            onChange={(e) => handleTempoChange(Number(e.target.value))}
            onMouseDown={(e) => {
              dragStartY.current = e.clientY;
              dragStartTempo.current = tempo;
            }}
            onMouseMove={(e) => {
              if (e.buttons !== 1) return;
              const delta = dragStartY.current - e.clientY;
              handleTempoChange(dragStartTempo.current + Math.round(delta / 2));
            }}
            style={{
              width: '60px',
              background: 'transparent',
              border: '1px solid #555',
              borderRadius: '4px',
              color: '#eee',
              textAlign: 'center',
              fontSize: '14px',
              fontWeight: 600,
              padding: '2px 4px',
            }}
          />
          <span style={{ fontSize: '12px', color: '#888' }}>BPM</span>
          <button
            type="button"
            onClick={() => navigate(`${SettingsRoutes.root()}/audio`)}
            title="Backing track not lining up with what you hear? Bluetooth headphones delay sound — calibrate it here."
            style={{
              marginLeft: 'auto',
              background: 'transparent',
              border: 'none',
              color: '#888',
              fontSize: '12px',
              textDecoration: 'underline',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            Audio timing{outputLatencyMs > 0 ? ` · ${outputLatencyMs} ms` : ''}
          </button>
        </div>
      )}

      {/* Main content area */}
      <div
        style={{
          flex: 1,
          padding: '8px 16px',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Piano Roll — fixed height for single stave; viewport-fitted for dual stave */}
        <div
          style={{
            height: isDualStaff ? pianoRollMaxHeight : PIANO_ROLL_HEIGHT,
            minHeight: '200px',
            position: 'relative',
            flexShrink: 0,
            overflow: 'hidden',
          }}
        >
          {isDualStaff ? (
            <DualStaffPianoRoll
              key={`roll-${activityInstanceId}`}
              handConfig={resolvedStep.instrument_config!.hand_config}
              containerHeight={pianoRollMaxHeight}
              events={pianoRollEvents}
              bars={requiredBars}
              beatsPerBar={4}
              leadInTicks={LEAD_IN_TICKS}
              staves={notationStaves}
              notationToggle={clefToggle}
              subdivision={isIT ? 4 : 1}
              rowHeight={rowHeight}
              inTime={isIT}
              playSpeed={tempo}
              isPlaying={isActive && isIT}
              onPlayingChange={() => {}}
              playbackTicks={isIT ? playbackTicks : undefined}
              onTickChange={handleTickChange}
              activeMidis={activeMidis}
              noteHoldMeta={isActive && !isIT ? noteHoldMeta : undefined}
              performanceMeta={isIT ? performanceMeta : undefined}
              keyRoot={keyRoot}
              keyColor={keyColor}
              userNotes={isActive ? userNotes : []}
              targetMidiSet={targetMidiSet}
              chordSymbols={chordSymbolsForStaff}
            />
          ) : (
            <GenrePianoRoll
              key={`roll-${activityInstanceId}`}
              events={pianoRollEvents}
              bars={requiredBars}
              beatsPerBar={4}
              leadInTicks={LEAD_IN_TICKS}
              staves={notationStaves}
              notationToggle={clefToggle}
              subdivision={isIT ? 4 : 1}
              rowHeight={rowHeight}
              midiRangeMin={noteRange.min}
              midiRangeMax={noteRange.max}
              inTime={isIT}
              playSpeed={tempo}
              isPlaying={isActive && isIT}
              onPlayingChange={() => {}}
              playbackTicks={isIT ? playbackTicks : undefined}
              onTickChange={handleTickChange}
              activeMidis={activeMidis}
              noteHoldMeta={isActive && !isIT ? noteHoldMeta : undefined}
              performanceMeta={isIT ? performanceMeta : undefined}
              keyRoot={keyRoot}
              keyColor={keyColor}
              userNotes={isActive ? userNotes : []}
              targetMidiSet={targetMidiSet}
              chordSymbols={chordSymbolsForStaff}
            />
          )}
        </div>

        {/* Piano Keyboard — fixed height, range matches piano roll.
            Volume dial sits alongside on the right so it's always within
            reach during practice without crowding the header. */}
        <div
          style={{
            marginTop: '8px',
            height: '120px',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'stretch',
            gap: '12px',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <PianoKeyboard
              showOctaveStart
              activeWhiteKeyColor={keyboardActiveColor ?? keyColor}
              activeBlackKeyColor={keyboardActiveColor ?? keyColor}
              endC={endOctave + 1}
              startC={startOctave}
              playingNotes={
                // Priority: demo > user MIDI > practice Tone.Part > static preview
                // When demo is playing, ONLY show demo highlights (gaps = empty keyboard)
                demoHighlightMidis.size > 0
                  ? [...demoHighlightMidis].map((midi, i) => ({
                      id: `demo_${i}`,
                      type: 'note' as const,
                      midi,
                      time: 0,
                      duration: 1,
                      velocity: 80,
                    }))
                  : isPlayingDemo
                    ? [] // demo is playing but between notes — show nothing
                    : isActive && activeMidis.length > 0
                      ? activeMidis.map((midi, i) => ({
                          id: `active_${i}`,
                          type: 'note' as const,
                          midi,
                          time: 0,
                          duration: 1,
                          velocity: 80,
                        }))
                      : isPracticing && practiceHighlightMidis.size > 0
                        ? [...practiceHighlightMidis].map((midi, i) => ({
                            id: `practice_${i}`,
                            type: 'note' as const,
                            midi,
                            time: 0,
                            duration: 1,
                            velocity: 80,
                          }))
                        : keyboardPlayingNotes
              }
              enableMidiInterface
            />
          </div>

          {/* Metronome switch + volume — tempo has its own slider above */}
          <MetronomeToggle />
          <LessonVolumeDial />
        </div>

        {/* Practice mode controls — below keyboard */}
        {isPracticing && (
          <div
            style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center',
              padding: '12px 0',
              marginTop: '8px',
            }}
          >
            <button
              onClick={handleStopPractice}
              style={{
                padding: '10px 20px',
                borderRadius: '20px',
                border: '1px solid #444',
                background: '#2a2a2a',
                color: '#fff',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              ← Back
            </button>
            <button
              onClick={() => void playDemo(targetNotes)}
              disabled={isPlayingDemo}
              style={{
                padding: '10px 20px',
                borderRadius: '20px',
                border: '1px solid #444',
                background: isPlayingDemo ? '#1a1a1a' : '#2a2a2a',
                color: isPlayingDemo ? '#666' : '#fff',
                fontSize: '14px',
                cursor: isPlayingDemo ? 'default' : 'pointer',
              }}
            >
              {isPlayingDemo ? '◼ Playing...' : '▶ Demo'}
            </button>
            <button
              onClick={handleStartPerformance}
              style={{
                padding: '10px 24px',
                borderRadius: '20px',
                border: 'none',
                background: keyColor,
                color: '#000',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              I'm Ready — Perform ▶
            </button>
          </div>
        )}

        {/* Preview modal — covers only the piano roll, never the keyboard */}
        {activityState === 'preview' && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: `${isDualStaff ? pianoRollMaxHeight : PIANO_ROLL_HEIGHT}px`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(17,17,17,0.88)',
              // Above the roll's note layers (z-0..20) but below its header
              // strip (z-30), so the piano-roll/notation toggle stays
              // clickable while "Ready to start?" is up. The assessment modal
              // below stays at 40 and covers the header too.
              zIndex: 25,
            }}
          >
            <div
              style={{
                maxWidth: '480px',
                width: '100%',
                padding: '32px',
                borderRadius: '16px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid #444',
                textAlign: 'center',
              }}
            >
              <h2
                style={{
                  fontSize: '22px',
                  fontWeight: 600,
                  marginBottom: '12px',
                }}
              >
                Ready to start?
              </h2>
              <p
                style={{
                  fontSize: '14px',
                  color: '#aaa',
                  marginBottom: '24px',
                  lineHeight: 1.5,
                }}
              >
                {currentStep.direction}
              </p>
              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  justifyContent: 'center',
                }}
              >
                <button
                  onClick={() => {
                    void playDemo(targetNotes);
                  }}
                  disabled={isPlayingDemo}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '24px',
                    border: '1px solid #444',
                    background: isPlayingDemo ? '#1a1a1a' : '#2a2a2a',
                    color: isPlayingDemo ? '#666' : '#fff',
                    fontSize: '14px',
                    cursor: isPlayingDemo ? 'default' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {isPlayingDemo ? '◼ Playing...' : '▶ Demo'}
                </button>
                <button
                  onClick={() => void handleStartPractice()}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '24px',
                    border: '1px solid #555',
                    background: 'transparent',
                    color: '#eee',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Practice
                </button>
                <button
                  onClick={handleStartPerformance}
                  disabled={instrumentsLoading}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '24px',
                    border: 'none',
                    background: instrumentsLoading ? '#555' : keyColor,
                    color: instrumentsLoading ? '#999' : '#111',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: instrumentsLoading ? 'default' : 'pointer',
                  }}
                >
                  {instrumentsLoading ? 'Loading instruments...' : 'Play Now'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Assessment result modal */}
        {activityState === 'complete' && lastResult && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(17,17,17,0.92)',
              zIndex: 40,
            }}
          >
            <div
              style={{
                maxWidth: '480px',
                width: '100%',
                padding: '32px',
                borderRadius: '16px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid #444',
                textAlign: 'center',
              }}
            >
              <h2
                style={{
                  fontSize: '28px',
                  fontWeight: 600,
                  marginBottom: '8px',
                }}
              >
                {lastResult.passed ? '✓' : '✗'}{' '}
                {Math.round(lastResult.overallScore * 100)}%
              </h2>
              <p
                style={{
                  fontSize: '14px',
                  color: '#aaa',
                  marginBottom: '24px',
                  lineHeight: 1.5,
                }}
              >
                {lastResult.feedbackText}
              </p>
              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  justifyContent: 'center',
                }}
              >
                <button
                  onClick={handleRetry}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '24px',
                    border: '1px solid #555',
                    background: 'transparent',
                    color: '#eee',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Try Again
                </button>
                <button
                  onClick={handleNext}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '24px',
                    border: 'none',
                    background: '#4a9eff',
                    color: '#111',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {stepIndex < currentSection.steps.length - 1
                    ? 'Next'
                    : 'Section Complete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Exported component with provider wrapper ─────────────────────────────────

const MAX_DEVICE_LATENCY_SEC = 0.5;

export function GenreLessonContainerV2(props: GenreLessonContainerV2Props) {
  return (
    <LearnInputProvider detectionMode="polyphonic">
      <GenreLessonContainerV2Inner {...props} />
    </LearnInputProvider>
  );
}
