/**
 * GenreLessonContainerV2.tsx — The v2 genre curriculum container.
 *
 * Self-contained system. Shares only PianoRoll and PianoKeyboard
 * with the existing system. Everything else is ours.
 */

import { Hand } from 'lucide-react';
import {
  lazy,
  Suspense,
  useState,
  useMemo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
} from 'react';
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
import type { StaffLayout } from '@/components/notation/StaffView';
import { CurriculumRoutes, SettingsRoutes } from '@/constants/routes';
import { useUserRole } from '@/contexts/AuthContext/hooks/useUserRole';
import type { PlaybackEvent } from '@/contexts/PlaybackContext/helpers';
import DualStaffPianoRoll from '@/curriculum/components/DualStaffPianoRoll';
import GenrePianoRoll from '@/curriculum/components/GenrePianoRoll';
import { TabTheoryOverlay } from '@/curriculum/components/LearnTabView';
import {
  GUITAR_VISUALS_HEIGHT,
  GuitarLessonVisuals,
} from '@/curriculum/components/guitar';
import { useGuitarTabLayers } from '@/curriculum/components/guitar/GuitarLessonVisuals';
import {
  GuitarKeyIntro,
  GuitarSectionBCard,
  GuitarTheoryPanel,
  MusicMapOverlay,
  isSectionBCardDue,
} from '@/curriculum/components/guitar/theory';
import {
  GUITAR_ATLAS_BOOK_ONE,
  getGuitarShape,
  toBookKey,
} from '@/curriculum/data/guitar/bookOne';
import {
  currentEventForMidi,
  nextEventForMidi,
} from '@/curriculum/engine/noteGate';
import {
  lessonChordSymbols,
  placeLessonChords,
} from '@/curriculum/notation/lessonChordSymbols';
import { useMspModuleCompletion } from '@/features/classroom/msp';
import { useGuitarDisplaySettings } from '@/features/learn/useGuitarDisplaySettings';
import { sectionHasContent } from '@/features/practiceTracks/genre/buildGenrePracticeTrack';
import { openGenrePracticeTrack } from '@/features/practiceTracks/genre/openGenrePracticeTrack';
import { useSettingsStore } from '@/features/settings/useSettingsStore';
import type { MidiNoteEvent } from '@/hooks/music/useMidiInput';
import { ID_WINDOW_MAX_MS } from '@/learn/audio/guitar/GuitarChordSegmenter';
import {
  cancelScheduledGuitarNotes,
  guitarLessonVoice,
  loadGuitarVoice,
  playGuitarGuideNote,
  releaseGuitarVoice,
  strumGuitarChord,
} from '@/learn/audio/guitar/guitarVoice';
import {
  GUIDE_VELOCITY_SCALE,
  playGuideNote,
} from '@/learn/audio/practiceGuide';
import { useLessonVolume } from '@/learn/audio/useLessonVolume';
import { usePracticeSettings } from '@/learn/audio/usePracticeSettings';
import { LessonVolumeDial } from '@/learn/components/LessonVolumeDial';
import { MetronomeToggle } from '@/learn/components/MetronomeToggle';
import { GuitarInputChip } from '@/learn/components/guitar/GuitarInputChip';
import type { GuitarSetupStep } from '@/learn/components/guitar/GuitarInputSetup';
import {
  GuitarToneMenu,
  PREVIEW_MS as TONE_PREVIEW_MS,
} from '@/learn/components/guitar/GuitarToneMenu';
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
import { shapeNotes } from '@/lib/guitar/fretboard';
import type { FretPosition } from '@/lib/guitar/types';
import { colorForKeyMode } from '@/lib/modeColorShift';
import { useChordClef, type NotationStaves } from '@/lib/notation';
import {
  resolveStepContent,
  toPianoRollEvents,
  midiToPitchName,
  type GenreNoteEvent,
} from '../engine/genreGeneration/resolveStepContent';
import { stepSwing } from '../engine/genreGeneration/swing';
import {
  GuitarLoopStatus,
  GuitarPracticeNotes,
} from '../guitar/GuitarLoopStatus';
import {
  GuitarResultExtras,
  guitarResultHeading,
} from '../guitar/GuitarResultExtras';
import { useGuitarLessonEvaluation } from '../guitar/useGuitarLessonEvaluation';
import { BACKING_LEAD_SEC, useBackingTrack } from '../hooks/useBackingTrack';
import { useDemoPlayback } from '../hooks/useDemoPlayback';
import {
  selfReportedResult,
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
import {
  LoopSelectionOverlay,
  MistakeMarkersOverlay,
  SpeedTrainerControl,
  nextStepSuggestion,
  sliceStepForLoop,
  stepBarCount,
  stepPassMark,
  useBarreLoopingMs,
  useLessonPracticeTools,
} from '../practice';
import type { ActivitySectionId } from '../types/activity';
import type {
  ActivityFlowV2,
  ActivityStepV2,
  StyleSubProfile,
} from '../types/activity.v2';
import { flowInstrument } from '../utils/flowInstrument';
import { formatAccidentalsForDisplay } from '../utils/formatAccidentals';

// The guitar input setup (tuner, checks) loads when first opened.
const GuitarInputSetup = lazy(() =>
  import('@/learn/components/guitar/GuitarInputSetup').then((m) => ({
    default: m.GuitarInputSetup,
  })),
);

/** The first-run guitar setup opens by itself once per page session. */
let guitarSetupOffered = false;

/** Book One's keys are all major; Studio's detector leans on the key. */
const MAJOR_MODE_INTERVALS = [0, 2, 4, 5, 7, 9, 11];
/** An attack this close to a metronome click may be the click, heard. */
const CLICK_FILTER_MS = 60;
/** One TAB system with its rhythm stems, chord symbols and overlays. */
const GUITAR_TAB_HEIGHT = 320;

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

/**
 * What a section's Practice Track offers, in the student's terms. Named per
 * section rather than generically because what you get is genuinely different:
 * the Melody track hands you a scale to improvise on, the Bass track hands you
 * the changes and gets out of the way.
 */
function practiceOfferBlurb(section: ActivitySectionId): string {
  switch (section) {
    case 'A':
      return 'Take the groove into a Practice Track and improvise your own melodies over it — the scale lit up on the keyboard, and the take recorded if you want it.';
    case 'B':
      return 'Take the groove into a Practice Track and play the chords over bass and drums, at your own tempo, for as long as you like.';
    case 'C':
      return 'Take the groove into a Practice Track and build your own bass lines under the chords and drums.';
    default:
      return 'Take the groove into a Practice Track and play the whole part on a Rhodes over bass and drums.';
  }
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
  /**
   * The section whose Practice Track is being offered, right after its last
   * activity. Null the rest of the time — the offer is a step in the flow, not
   * a modal that can be opened.
   */
  const [practiceOffer, setPracticeOffer] = useState<ActivitySectionId | null>(
    null,
  );
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
  // Guitar practice tools. A looped (or speed-trainer) run passes through
  // 'preview' for a moment between passes; restartingPass keeps the loop on
  // screen and the preview card down meanwhile. Bumping practiceStartToken
  // starts practice after the next render, once a new loop is in state.
  const [restartingPass, setRestartingPass] = useState(false);
  const [practiceStartToken, setPracticeStartToken] = useState(0);
  const [reviewingMistakes, setReviewingMistakes] = useState(false);
  // Guitar detection trust: takes on this step that failed or couldn't be
  // heard, and "nothing heard for a while" during a wait-for-me take.
  const [guitarMisses, setGuitarMisses] = useState(0);
  const [silenceOffer, setSilenceOffer] = useState(false);
  // A tone-menu preview strum is sounding (the app, not the student).
  const [tonePreviewing, setTonePreviewing] = useState(false);
  // The guitar input setup, open at a step (null: closed).
  const [guitarSetupStep, setGuitarSetupStep] =
    useState<GuitarSetupStep | null>(null);

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
  /** The section after this one, for the offer's "continue" button. */
  const nextSectionName = useMemo(() => {
    const idx = flow.sections.findIndex((s) => s.id === activeSection);
    return idx >= 0 && idx < flow.sections.length - 1
      ? flow.sections[idx + 1].name
      : null;
  }, [flow.sections, activeSection]);

  // True when the current step has an engine-generated backing track (drums/bass/chords).
  // Used to suppress the metronome in Play Now mode — the drum track provides the pulse.
  const hasBackingParts =
    ((currentStep as ActivityStepV2).backing_parts?.engine_generates?.length ??
      0) > 0;

  // Guitar flows (The Guitar Atlas) run through this same container; the
  // instrument only changes the views, the sound and how input is heard.
  const isGuitar = flowInstrument(flow) === 'guitar';
  const guitarKey = useMemo(
    () => toBookKey(flow.params.defaultKey.split(' ')[0]) ?? 'C',
    [flow.params.defaultKey],
  );

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
    // Guitar follows the Atlas rule — keys are colours — so a major key
    // takes its own (ionian) colour, as on the key picker. Piano's 'major'
    // scale id has no entry here and keeps its existing fallback.
    const modeSlug = isGuitar
      ? 'ionian'
      : (SCALE_TO_MODE[flow.params.defaultScaleId ?? ''] ?? 'dorian');
    return colorForKeyMode(
      keyName,
      modeSlug as Parameters<typeof colorForKeyMode>[1],
    );
  }, [flow.params.defaultKey, flow.params.defaultScaleId, isGuitar]);

  // Demo playback hook
  const { playDemo, stopDemo, demoHighlightMidis, isPlayingDemo } =
    useDemoPlayback(keyRoot, tempo, isGuitar ? guitarLessonVoice : undefined);

  // "Hear it" on a chord box: the exact voicing, strummed, on the guitar voice.
  const handleHearShape = useCallback((frets: string) => {
    const notes = shapeNotes(frets);
    void loadGuitarVoice().then(() =>
      strumGuitarChord(
        notes.map((n) => n.midi),
        1.6,
        90,
        undefined,
        notes.map((n) => n.position),
      ),
    );
  }, []);

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
  const swing = stepSwing(resolvedStep as ActivityStepV2, flow.params.swing);
  const lessonTargetNotes = useMemo(
    () =>
      resolveStepContent(resolvedStep, {
        section: activeSection,
        keyRoot,
        tempo,
        timeSignature: [4, 4],
        tpb: 480,
        defaultScale: flow.params.defaultScale,
        genre: flow.genre,
        swing,
        instrument: flow.params.instrument,
      }) ?? [],
    [
      resolvedStep,
      activeSection,
      keyRoot,
      tempo,
      flow.params.defaultScale,
      flow.genre,
      swing,
      flow.params.instrument,
    ],
  );

  // ── Guitar practice tools: loop bars, speed trainer ─────────────────────
  // Guitar-only in v1 (the tools themselves are instrument-neutral). A loop
  // lives only in practice: the run plays the looped bars and restarts with a
  // count-in after each pass, which is scored silently for the speed trainer
  // and never recorded. Play Now always grades the whole step at its tempo.
  const barsInStep = stepBarCount({
    targetNotes: lessonTargetNotes,
    chordTargets: resolvedStep.chordTargets,
  });
  const practice = useLessonPracticeTools({
    baseTempo: tempo,
    barsInStep,
    chordTargets: resolvedStep.chordTargets,
    passes: resolvedStep.guitar?.musicMap?.passes,
    assessment: currentStep.assessment ?? 'pitch_only',
    resetKey: `${flow.params.defaultKey}|${activeSection}|${currentStep.tag}`,
  });
  const {
    setLoop: setPracticeLoop,
    clearLoop: clearPracticeLoop,
    setPad: setPracticePad,
    onPracticePass,
  } = practice;
  const practiceSlice = useMemo(
    () =>
      isGuitar && practice.loop
        ? sliceStepForLoop(
            {
              targetNotes: lessonTargetNotes,
              chordTargets: resolvedStep.chordTargets,
              chordSymbols: currentStep.chordSymbols,
            },
            practice.loop,
            { padBars: practice.padBars },
          )
        : null,
    [
      isGuitar,
      practice.loop,
      practice.padBars,
      lessonTargetNotes,
      resolvedStep.chordTargets,
      currentStep.chordSymbols,
    ],
  );
  /** The run repeats: bars are looped, or the speed trainer climbs the step. */
  const repeatPractice =
    isGuitar && (practice.loop !== null || (isIT && practice.ladder.enabled));
  /** The looped bars, while they are what the student is practising. */
  const loopSlice =
    practiceSlice && (activityState === 'practice' || restartingPass)
      ? practiceSlice
      : null;
  const targetNotes = loopSlice?.targetNotes ?? lessonTargetNotes;
  /** Practice plays at the speed trainer's tempo; Play Now at the step's. */
  const practiceTempo =
    isGuitar && isIT && practice.ladder.enabled
      ? practice.effectiveTempo
      : tempo;
  const runTempo = activityState === 'practice' ? practiceTempo : tempo;
  // What the guitar evaluation and visuals follow: the loop's chords while
  // looping, the step's otherwise.
  const guitarStep = useMemo(
    () =>
      loopSlice
        ? { ...resolvedStep, chordTargets: loopSlice.chordTargets }
        : resolvedStep,
    [loopSlice, resolvedStep],
  );
  const stepHasBarre = useMemo(
    () =>
      (resolvedStep.guitar?.shapeIds ?? []).some(
        (id) => !!getGuitarShape(id)?.barre,
      ),
    [resolvedStep.guitar],
  );
  const barreLoopingMs = useBarreLoopingMs(
    isGuitar && activityState === 'practice' && !!practice.loop && stepHasBarre,
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
    // A looped bar can end in rests; it still takes its whole bar.
    const contentBars = Math.max(
      Math.ceil(maxTick / 1920),
      loopSlice?.bars ?? 0,
    );
    // IT gets +1 bar for the count-in offset
    return Math.max(2, contentBars + (isIT ? 1 : 0));
  }, [targetNotes, isIT, loopSlice]);

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

  // Piano roll height — MEASURED, not estimated.
  //
  // This used to subtract a tally of hardcoded chrome heights from
  // `window.innerHeight` once at mount, then multiply by 1.5 so lanes reached
  // 18px. That overflowed the viewport on purpose and pushed the keyboard off
  // the bottom of the screen, which is the one thing a player always needs to
  // see. Three smaller faults came with it: `window.innerHeight` ignores the
  // TopRail and shell padding above us, the tally reserved 44px for a tempo bar
  // that only exists on in-time steps, and the empty dependency array meant
  // resizing the window changed nothing.
  //
  // Now the roll is a flex child that takes whatever is left once the pinned
  // header, tabs, keyboard and controls have taken theirs, and a ResizeObserver
  // reports what that actually came to. DualStaffPianoRoll fits its lanes into
  // that height, compressing to MIN_LANE_HEIGHT and no further; if the lanes
  // will not fit even then, the roll scrolls inside its own box rather than
  // pushing the page. So the keyboard stays put at every window size.
  const rollViewportRef = useRef<HTMLDivElement>(null);
  const [pianoRollMaxHeight, setPianoRollMaxHeight] = useState(360);

  // useLayoutEffect, not useEffect: the first measurement has to land before
  // paint, or the roll renders one frame at the placeholder height and visibly
  // jumps. Client-only app, so there is no SSR warning to worry about.
  useLayoutEffect(() => {
    const el = rollViewportRef.current;
    if (!el) return;
    // Round to whole pixels: sub-pixel jitter would otherwise re-run the lane
    // maths on every fractional layout change.
    const measure = (h: number) =>
      setPianoRollMaxHeight((prev) => {
        const next = Math.max(200, Math.round(h));
        return next === prev ? prev : next;
      });
    measure(el.getBoundingClientRect().height);
    const ro = new ResizeObserver(([entry]) => {
      measure(entry.contentRect.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // rowHeight is the TOTAL height handed to a single-stave PianoRoll — it
  // divides internally by lane count. 40px goes to the timeline header, so the
  // single-stave roll fills the same measured box the dual-stave one does.
  const rowHeight = Math.max(160, pianoRollMaxHeight - 40);

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
  // Which written note each held key is currently answering: midi → event.id.
  // Claimed on note-on, credited or dropped on note-off. Without this a
  // sustained note reads as "still outstanding" and pins the free-time gate at
  // its own onset, so the other hand's next note is refused until you let go.
  const heldEventIdsRef = useRef<Map<number, string>>(new Map());
  const [holdTick, setHoldTick] = useState(0);

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

  // Which written note a pressed key is answering. Free-time steps go through
  // the onset gate, which skips notes currently under a finger so a sustained
  // left hand cannot block the right; in-time steps take the next uncompleted
  // occurrence, because the playhead already enforces order. See noteGate.ts.
  const getCurrentEventForMidi = useCallback(
    (
      midi: number,
    ): { event: (typeof pianoRollEvents)[0]; index: number } | null =>
      isIT
        ? nextEventForMidi(pianoRollEvents, midi, completedEventIdsRef.current)
        : currentEventForMidi(
            pianoRollEvents,
            midi,
            completedEventIdsRef.current,
            new Set(heldEventIdsRef.current.values()),
          ),
    [pianoRollEvents, isIT],
  );

  // Track note-on start times (piano; guitar holds are the guitar hook's)
  useEffect(() => {
    if (isGuitar) return;
    for (const midi of activeMidis) {
      if (!noteHoldStartRef.current.has(midi)) {
        noteHoldStartRef.current.set(midi, performance.now());
        // Claim the note this key is answering at the moment it goes down.
        // Claiming here rather than on release is the whole fix: a claimed
        // note is in progress, so it steps out of the gate's way and the
        // other hand can carry on over the top of it.
        const claimed = getCurrentEventForMidi(midi);
        if (claimed) heldEventIdsRef.current.set(midi, claimed.event.id);
      }
    }
    // On note-off, credit the note this key claimed — not whatever the gate
    // happens to point at now, which may have moved on underneath it.
    let didComplete = false;
    for (const [midi] of noteHoldStartRef.current) {
      if (!activeMidis.includes(midi)) {
        const startMs = noteHoldStartRef.current.get(midi)!;
        const elapsedMs = performance.now() - startMs;
        const claimedId = heldEventIdsRef.current.get(midi);
        const event = claimedId
          ? pianoRollEvents.find((e) => e.id === claimedId)
          : getCurrentEventForMidi(midi)?.event;
        if (event) {
          const msPerTick = (60 / 100 / 480) * 1000;
          const requiredMs = event.durationTicks * msPerTick;
          if (elapsedMs >= requiredMs * 0.8) {
            completedEventIdsRef.current.add(event.id);
            didComplete = true;
          }
        }
        noteHoldStartRef.current.delete(midi);
        // Dropped whether or not it earned credit: a finger lifted too early
        // leaves the note outstanding again rather than half-done.
        heldEventIdsRef.current.delete(midi);
      }
    }
    if (didComplete) setHoldTick((t) => t + 1);
  }, [activeMidis, getCurrentEventForMidi, pianoRollEvents, isGuitar]);

  // Reset hold tracking on step change
  useEffect(() => {
    noteHoldStartRef.current.clear();
    completedEventIdsRef.current.clear();
    heldEventIdsRef.current.clear();
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

      // A note under a finger is the one it claimed on the way down. It has
      // left the gate by design, so ask the claim rather than the gate —
      // otherwise the ring would drop off the note being held.
      const isHeld = heldEventIdsRef.current.get(midi) === event.id;
      const currentTarget = getCurrentEventForMidi(midi);
      const isCurrentTarget = isHeld || currentTarget?.event.id === event.id;

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
    if (isGuitar || !isIT || !isActive) return;

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
  }, [activeMidis, isIT, activityState, pianoRollEvents, isGuitar]);

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

  // Where a guitar heard through the microphone lands in the music. An
  // acoustic guitar doesn't go through the app's output, so the student plays
  // it against what they hear: the playhead's moment (audio clock less the
  // output latency, as playbackTicks), taken at the note's attack time.
  const heardTicksAt = useCallback(
    (perfMs: number): number | null => {
      const context = Tone.getContext().rawContext as AudioContext;
      const deviceLatency = Math.min(
        MAX_DEVICE_LATENCY_SEC,
        Math.max(0, (context.outputLatency ?? 0) + (context.baseLatency ?? 0)),
      );
      const ticks = ticksAt(
        context.currentTime -
          (performance.now() - perfMs) / 1000 -
          deviceLatency -
          useSettingsStore.getState().outputLatencyMs / 1000,
      );
      return ticks == null ? null : ticks - COUNT_IN_OFFSET;
    },
    [ticksAt, COUNT_IN_OFFSET],
  );

  // ── MIDI input subscription (dongle connection — read-only) ──────────────

  const learnInput = useLearnInputStable();
  const {
    subscribeNoteOn,
    subscribeNoteOff,
    subscribeChord,
    guitar,
    start: startInput,
    stop: stopInput,
  } = learnInput;

  // Start MIDI listening on mount (must be called for hardware connection)
  useEffect(() => {
    startInput();
    return () => stopInput();
  }, [startInput, stopInput]);

  useEffect(() => {
    // Guitar input (MIDI guitar or microphone) goes to the guitar hook below.
    if (isGuitar) return;
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
  }, [subscribeNoteOn, subscribeNoteOff, keyRoot, soundingTicks, isGuitar]);

  // Guitar hears the student here instead: MIDI guitar and microphone notes,
  // and strummed chords judged by identity (Studio's chord detector).
  const bumpHoldTick = useCallback(() => setHoldTick((t) => t + 1), []);
  const guitarEval = useGuitarLessonEvaluation({
    enabled: isGuitar,
    step: guitarStep,
    events: pianoRollEvents,
    isIT,
    activityState,
    activityStateRef,
    resetKey: `${activityInstanceId}:${activeSection}:${stepIndex}`,
    countInOffset: COUNT_IN_OFFSET,
    currentTickRef,
    soundingTicks,
    heardTicksAt,
    completedEventIdsRef,
    onProgress: bumpHoldTick,
    subscribeNoteOn,
    subscribeNoteOff,
    subscribeChord,
    keyRoot,
    suppressInput: isPlayingDemo || tonePreviewing,
  });

  // ── Guitar input: what the engine listens for ──────────────────────────
  // Only while practising or performing, and never while the setup has the
  // engine for its own checks (it leaves the mode 'off' when it closes;
  // these run again then).
  const guitarSetupOpen = guitarSetupStep !== null;
  const guitarLive =
    isGuitar &&
    (activityState === 'practice' || activityState === 'performance');
  const guitarStepKind = guitarEval.stepKind;
  const guitarListening = guitar?.status === 'listening';
  useEffect(() => {
    if (!guitar || guitarSetupOpen) return;
    guitar.setEvaluationMode(guitarLive ? guitarStepKind : 'off');
  }, [guitar, guitarSetupOpen, guitarLive, guitarStepKind]);

  const expectedMidis = useMemo(
    () => [...new Set(targetNotes.map((n) => n.midi))].sort((a, b) => a - b),
    [targetNotes],
  );
  useEffect(() => {
    if (!guitar || guitarSetupOpen) return;
    guitar.setExpectedNotes(guitarLive ? expectedMidis : null);
    guitar.setKeyContext(keyRoot % 12, MAJOR_MODE_INTERVALS);
  }, [guitar, guitarSetupOpen, guitarLive, expectedMidis, keyRoot]);

  // The demo and a tone preview are the app playing, not the student.
  useEffect(() => {
    if (!guitar || guitarSetupOpen) return;
    guitar.setSuppressed(isPlayingDemo || tonePreviewing);
  }, [guitar, guitarSetupOpen, isPlayingDemo, tonePreviewing]);
  useEffect(() => {
    if (!tonePreviewing) return;
    const id = setTimeout(() => setTonePreviewing(false), TONE_PREVIEW_MS);
    return () => clearTimeout(id);
  }, [tonePreviewing]);

  // Metronome clicks heard through the microphone aren't the student: when
  // the setup found the mic hears the speakers, an attack on a click (as the
  // student hears it) needs more to count. With headphones there's nothing
  // to filter, and filtering would turn an unclear strum on the beat into a
  // missed one.
  const metronomeClicking =
    metronomeEnabled && isActive && isIT && !(isPerforming && hasBackingParts);
  useEffect(() => {
    if (!guitar) return;
    if (
      !metronomeClicking ||
      guitar.prefs.source !== 'audio' ||
      !guitar.prefs.bleedDetected
    ) {
      guitar.setClickFilter(null);
      return;
    }
    const inputLatencyMs = guitar.prefs.inputLatencyMs;
    guitar.setClickFilter((perfMs) => {
      const ticks = heardTicksAt(perfMs - inputLatencyMs);
      if (ticks === null) return false;
      const beats = ticks / 480;
      const offMs = (Math.abs(beats - Math.round(beats)) * 60_000) / runTempo;
      return offMs <= CLICK_FILTER_MS;
    });
    return () => guitar.setClickFilter(null);
  }, [guitar, metronomeClicking, heardTicksAt, runTempo]);

  /** The microphone hears the app's speakers: the practice guide is muted. */
  const guitarGuideMuted =
    !!guitar && guitar.prefs.source === 'audio' && guitar.prefs.bleedDetected;
  /**
   * In time, a strum near the end is only named when its listening window
   * closes: the take waits that long before it is scored.
   */
  const guitarGraceMs = isGuitar && guitarListening ? ID_WINDOW_MAX_MS : 0;

  // ── Handlers ──────────────────────────────────────────────────────────────

  const { userNotes: guitarUserNotes, buildPolicy: buildGuitarPolicy } =
    guitarEval;
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
      const playedNotes = isGuitar ? guitarUserNotes : userNotes;
      const adjustedUserNotes = isIT
        ? playedNotes.map((n) => ({ ...n, onset: n.onset - COUNT_IN_OFFSET }))
        : playedNotes;
      const result = assess(
        targetNotes,
        adjustedUserNotes,
        currentStep.assessment ?? 'pitch_only',
        [currentStep.tag],
        currentStep.successFeedback,
        tempo,
        isGuitar ? buildGuitarPolicy() : undefined,
      );
      setLastResult(result);
      setActivityState('complete');
      // After three takes that failed or couldn't be heard, the student may
      // count the step themselves: detection never blocks progress.
      if (isGuitar && !result.passed) setGuitarMisses((n) => n + 1);
      // "Couldn't hear that clearly" isn't a failed attempt: nothing is
      // recorded, the student sees what to check and tries again.
      if (result.unclear) return;
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
    isGuitar,
    guitarUserNotes,
    buildGuitarPolicy,
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
    const labels = loopSlice?.chordSymbols ?? currentStep.chordSymbols;
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
    loopSlice,
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
  /** On to the next section, or nowhere if this was the last one. */
  const advanceSection = useCallback(() => {
    const currentSectionIdx = flow.sections.findIndex(
      (s) => s.id === activeSection,
    );
    if (currentSectionIdx >= flow.sections.length - 1) return;
    setActiveSection(flow.sections[currentSectionIdx + 1].id);
    setStepIndex(0);
    setActivityState('preview');
    setUserNotes([]);
    setLastResult(null);
    setActiveMidis([]);
  }, [activeSection, flow, setActivityState]);

  /**
   * Into a section's Practice Track. Everything sounding here has to stop first:
   * the Studio drives its own transport, and a lesson backing left running would
   * play straight over it.
   */
  const enterPracticeTrack = useCallback(
    (sectionId: ActivitySectionId) => {
      stopDemo();
      stopBacking();
      stopTransport();
      Tone.getTransport().cancel();
      stopTickCounter();
      const url = openGenrePracticeTrack(flow, sectionId, {
        genreLabel: genreDisplayName,
        returnTo: `${CurriculumRoutes.genreLevel({ genre, level: String(level) })}?section=${sectionId}`,
        bpm: tempo,
      });
      if (url) navigate(url);
    },
    [
      flow,
      genre,
      genreDisplayName,
      level,
      navigate,
      stopBacking,
      stopDemo,
      stopTickCounter,
      tempo,
    ],
  );

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
      // The section's own Practice Track, offered before moving on: the groove
      // they have been playing over, with their part of it left to them. The
      // offer replaces the silent auto-advance, so `advanceSection` below is
      // what actually moves on, once they have answered it.
      if (sectionHasContent(currentSection)) {
        setPracticeOffer(activeSection);
        return;
      }
      advanceSection();
    }
  }, [
    advanceSection,
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

  // A step that names its own tempo opens at it.
  useEffect(() => {
    if (currentStep.tempo) handleTempoChange(currentStep.tempo);
  }, [currentStep, handleTempoChange]);

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
      // A guitar loop scores the pass silently and goes again.
      if (repeatPractice) {
        handlePracticeEndRef.current?.();
        return;
      }
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
    repeatPractice,
  ]);

  // ── IT completion timer ─────────────────────────────────────────────────
  // Ref to latest handleComplete so the timer always calls the current version
  const handleCompleteRef = useRef(handleComplete);
  handleCompleteRef.current = handleComplete;
  const handleStopPracticeRef = useRef<(() => void) | null>(null);
  const handlePracticeEndRef = useRef<(() => void) | null>(null);

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
    const msPerTick = (60 / runTempo / 480) * 1000;
    const totalMs = contentTicks * msPerTick + guitarGraceMs;

    console.log(
      '[IT Timer] Starting. Duration:',
      Math.round(totalMs),
      'ms, ticks:',
      contentTicks,
      'tempo:',
      runTempo,
    );

    itTimerRef.current = setTimeout(() => {
      console.log('[IT Timer] Fired! State:', activityStateRef.current);
      const state = activityStateRef.current;
      if (state === 'performance') {
        handleCompleteRef.current();
      } else if (state === 'practice') {
        // Practice IT complete — stop and return to preview (a guitar loop
        // scores the pass and goes again)
        handlePracticeEndRef.current?.();
      }
    }, totalMs);

    return () => {
      if (itTimerRef.current) {
        clearTimeout(itTimerRef.current);
        itTimerRef.current = null;
      }
    };
  }, [activityState, isIT, maxContentTick, runTempo, guitarGraceMs]); // NO handleComplete in deps

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

  // Guitar notes are scheduled on timers (the GM synth ignores scheduled
  // times), which Tone.getTransport().cancel() doesn't reach. Cancel them
  // whenever a practice run ends or the step/section/run changes.
  useEffect(() => {
    if (!isGuitar || activityState === 'practice') return;
    cancelScheduledGuitarNotes();
  }, [isGuitar, activityState, activityInstanceId, stepIndex, activeSection]);

  // The guitar voice loads without a gesture; start early so the first Demo
  // or Practice press doesn't wait on the soundfont.
  // Leaving the lesson frees the amp (its model runs while the rig lives).
  useEffect(() => {
    if (!isGuitar) return;
    void loadGuitarVoice();
    return releaseGuitarVoice;
  }, [isGuitar]);

  // ── Practice mode handlers ──────────────────────────────────────────────

  const handleStartPractice = useCallback(async () => {
    // Stop any audio that may be running from a prior state
    stopDemo();
    stopBacking();
    stopTransport();
    Tone.getTransport().cancel();

    await startTone();
    if (isGuitar) await loadGuitarVoice();
    else await startPianoSampler();

    // Reset state before starting — but don't activate yet for IT
    setActivityInstanceId((id) => id + 1);
    setUserNotes([]);
    setActiveMidis([]);
    noteHoldStartRef.current.clear();
    completedEventIdsRef.current.clear();
    setHoldTick(0);

    if (!isIT) {
      // OOT: no transport timing — activate immediately
      setRestartingPass(false);
      setActivityState('practice');
      return;
    }

    // IT: start Transport BEFORE activating piano roll playhead
    stopTransport();
    Tone.getTransport().position = 0;
    // The step's tempo, or the speed trainer's on a guitar loop.
    Tone.getTransport().bpm.value = practiceTempo;

    // Set up metronome synth + sequence at position 0 BEFORE Transport starts,
    // so beat 1 fires cleanly. The runningRef guard prevents the useEffect from
    // restarting when enabled flips true after setActivityState('practice').
    // Always call prepareMetronome — in practice mode no backing track runs,
    // so the metronome must always be primed here (including D activities).
    await prepareMetronome(practiceTempo);

    // Schedule target notes as an audio guide in practice mode.
    // Notes are offset by the count-in bar (COUNT_IN_OFFSET ticks) to align
    // with the piano roll playhead. Muted in Play Now (performance) mode so
    // the student plays without a guide.
    if (practiceNotePartRef.current) {
      practiceNotePartRef.current.stop();
      practiceNotePartRef.current.dispose();
      practiceNotePartRef.current = null;
    }
    // A guitar loop guides its own bars (the view switches to them once the
    // run starts).
    const guideNotes = practiceSlice?.targetNotes ?? targetNotes;
    // When the microphone hears the speakers, the guide would be scored as
    // the student: it stays quiet (headphones bring it back).
    if (guideNotes.length > 0 && !(isGuitar && guitarGuideMuted)) {
      const spt = 60 / (practiceTempo * 480); // seconds per tick
      // One guide event per onset: a guitar strums a chord's notes together
      // (low to high), where piano plays each note on its own.
      const onsets = new Map<
        number,
        {
          midis: number[];
          positions: (FretPosition | undefined)[];
          duration: number;
        }
      >();
      for (const n of guideNotes) {
        const group = onsets.get(n.onset) ?? {
          midis: [],
          positions: [],
          duration: 0,
        };
        group.midis.push(n.midi);
        group.positions.push(n.fretPosition);
        group.duration = Math.max(group.duration, n.duration);
        onsets.set(n.onset, group);
      }
      const noteEvents = isGuitar
        ? [...onsets].map(([onset, group]) => ({
            time: (onset + LEAD_IN_TICKS) * spt,
            midis: group.midis,
            // The book's strings, so the amp tone plucks where the TAB says.
            positions: group.positions.every(Boolean)
              ? (group.positions as FretPosition[])
              : undefined,
            durationSec: group.duration * spt,
          }))
        : guideNotes.map((n) => ({
            time: (n.onset + LEAD_IN_TICKS) * spt,
            midis: [n.midi],
            durationSec: n.duration * spt,
          }));
      const part = new Tone.Part(
        (
          time,
          value: {
            midis: number[];
            durationSec: number;
            positions?: FretPosition[];
          },
        ) => {
          if (!isGuitar) {
            playGuideNote(value.midis[0], value.durationSec, 80, time);
          } else if (value.midis.length > 1) {
            strumGuitarChord(
              value.midis,
              value.durationSec,
              80 * GUIDE_VELOCITY_SCALE,
              time,
              value.positions,
            );
          } else {
            playGuitarGuideNote(
              value.midis[0],
              value.durationSec,
              80,
              time,
              value.positions?.[0],
            );
          }
          // Drive keyboard highlight in sync with audio guide
          Tone.getDraw().schedule(() => {
            setPracticeHighlightMidis(
              (prev) => new Set([...prev, ...value.midis]),
            );
          }, time);
          Tone.getDraw().schedule(() => {
            setPracticeHighlightMidis((prev) => {
              const next = new Set(prev);
              for (const midi of value.midis) next.delete(midi);
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
    setRestartingPass(false);
    setActivityState('practice');
  }, [
    practiceTempo,
    practiceSlice,
    guitarGuideMuted,
    isIT,
    isGuitar,
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

  // ── Guitar practice passes ─────────────────────────────────────────────
  const handleStartPracticeRef = useRef(handleStartPractice);
  handleStartPracticeRef.current = handleStartPractice;

  // Starts practice after the next render, once a loop just set is in state —
  // unless the student has moved to another step or section meanwhile. A
  // start that fails lets go of the loop view, so the start card comes back.
  const stepKey = `${activeSection}:${stepIndex}`;
  const stepKeyRef = useRef(stepKey);
  stepKeyRef.current = stepKey;
  const pendingStartKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (practiceStartToken === 0) return;
    const requestedFor = pendingStartKeyRef.current;
    pendingStartKeyRef.current = null;
    if (requestedFor !== stepKeyRef.current) {
      setRestartingPass(false);
      return;
    }
    handleStartPracticeRef.current().catch((err: unknown) => {
      console.warn('[GenreLessonContainerV2] practice restart failed', err);
      setRestartingPass(false);
    });
  }, [practiceStartToken]);
  const requestPracticeStart = useCallback(() => {
    pendingStartKeyRef.current = stepKeyRef.current;
    setPracticeStartToken((t) => t + 1);
  }, []);
  // Leaving the step also ends a restart in flight.
  useEffect(() => {
    setRestartingPass(false);
  }, [stepKey, flow]);

  /** Between passes: stop this run, keep the loop up, start the next one. */
  const restartPractice = useCallback(() => {
    setRestartingPass(true);
    handleStopPractice();
    requestPracticeStart();
  }, [handleStopPractice, requestPracticeStart]);

  // A practice run that reaches its end goes back to the card — except a
  // guitar loop or speed-trainer run, which scores the pass silently for the
  // ladder and goes again. Practice passes never reach progress.
  const handlePracticeEnd = useCallback(() => {
    if (!repeatPractice) {
      handleStopPractice();
      return;
    }
    const played = isIT
      ? guitarUserNotes.map((n) => ({ ...n, onset: n.onset - COUNT_IN_OFFSET }))
      : guitarUserNotes;
    onPracticePass(
      assess(
        targetNotes,
        played,
        currentStep.assessment ?? 'pitch_only',
        [],
        '',
        practiceTempo,
        buildGuitarPolicy(),
      ),
    );
    restartPractice();
  }, [
    repeatPractice,
    handleStopPractice,
    isIT,
    guitarUserNotes,
    onPracticePass,
    assess,
    targetNotes,
    currentStep.assessment,
    practiceTempo,
    buildGuitarPolicy,
    restartPractice,
  ]);
  handlePracticeEndRef.current = handlePracticeEnd;

  // A loop set, changed or cleared mid-practice — or the speed trainer
  // switched or stepped while playing — restarts the run on the new material.
  const practiceRunKey = `${practice.loop ? `${practice.loop.startBar}-${practice.loop.endBar}` : '-'}|${practice.padBars}|${practice.ladder.enabled ? practiceTempo : 'off'}`;
  const practiceRunKeyRef = useRef(practiceRunKey);
  useEffect(() => {
    if (practiceRunKeyRef.current === practiceRunKey) return;
    practiceRunKeyRef.current = practiceRunKey;
    if (isGuitar && activityStateRef.current === 'practice') restartPractice();
  }, [practiceRunKey, isGuitar, restartPractice]);

  /** Leaving practice ends the loop: loops are for practice only. */
  const handleBackFromPractice = useCallback(() => {
    clearPracticeLoop();
    handleStopPractice();
  }, [clearPracticeLoop, handleStopPractice]);

  // ── Guitar input setup ─────────────────────────────────────────────────
  /** The setup takes the input for its checks, so a run stops first. */
  const openGuitarSetup = useCallback(
    (step?: GuitarSetupStep) => {
      if (activityStateRef.current === 'practice') handleBackFromPractice();
      else if (activityStateRef.current === 'performance') {
        stopDemo();
        stopTransport();
        Tone.getTransport().cancel();
        handleRetry();
      }
      setGuitarSetupStep(step ?? 'source');
    },
    [handleBackFromPractice, handleRetry, stopDemo, stopTransport],
  );

  /**
   * Before a guitar run, from the student's click: the first-run setup opens
   * instead (once a session), or the microphone switches on. MIDI guitar
   * needs neither. False when the setup opened instead of the run.
   */
  const guitarReadyToStart = useCallback((): boolean => {
    if (!guitar) return true;
    if (guitar.status === 'needs-setup' && !guitarSetupOffered) {
      guitarSetupOffered = true;
      setGuitarSetupStep('source');
      return false;
    }
    if (guitar.prefs.source === 'audio' && guitar.status === 'idle') {
      void guitar.enable();
    }
    return true;
  }, [guitar]);

  const playGuitarTestChord = useCallback(async () => {
    await loadGuitarVoice();
    const notes = shapeNotes('X-3-2-0-1-0'); // open C
    strumGuitarChord(
      notes.map((n) => n.midi),
      1.5,
      90,
      undefined,
      notes.map((n) => n.position),
    );
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }, []);

  /** Loop bars and practise them now (a mistake marker, a next step). */
  const practiceLoop = useCallback(
    (loop: { startBar: number; endBar: number }, pct?: number, pad?: 0 | 1) => {
      if (!guitarReadyToStart()) return;
      setReviewingMistakes(false);
      setPracticeLoop(loop, pct);
      if (pad !== undefined) setPracticePad(pad);
      requestPracticeStart();
    },
    [guitarReadyToStart, setPracticeLoop, setPracticePad, requestPracticeStart],
  );

  const guitarNextStep = useMemo(
    () =>
      isGuitar && lastResult
        ? nextStepSuggestion(lastResult, { bars: barsInStep, tempoPct: 100 })
        : null,
    [isGuitar, lastResult, barsInStep],
  );

  // ── Guitar detection trust ─────────────────────────────────────────────
  /** "Count it myself": a pass the student counts, marked as theirs. */
  const handleCountItMyself = useCallback(() => {
    stopTickCounter();
    stopBacking();
    stopTransport();
    Tone.getTransport().cancel();
    const result = selfReportedResult(currentStep.successFeedback);
    setLastResult(result);
    setActivityState('complete');
    setSilenceOffer(false);
    recordResult(currentStep.tag, result, {
      section: activeSection,
      key: flow.params.defaultKey,
      styleRef: currentStep.styleRef,
      stepsTotal: currentSection.steps.length,
      skillTags: [currentStep.tag],
    });
  }, [
    stopTickCounter,
    stopBacking,
    currentStep,
    setActivityState,
    recordResult,
    activeSection,
    flow.params.defaultKey,
    currentSection.steps.length,
  ]);

  // Wait for me: 20 s with nothing heard at all offers the setup and the
  // self-count instead of leaving the student stuck.
  const guitarHeardSomething =
    guitarEval.userNotes.length > 0 ||
    guitarEval.heardChord !== null ||
    guitarEval.unclearCount > 0;
  useEffect(() => {
    if (!isGuitar) return;
    setSilenceOffer(false);
    if (isIT || activityState !== 'performance' || guitarHeardSomething) {
      return;
    }
    const id = setTimeout(() => setSilenceOffer(true), 20_000);
    return () => clearTimeout(id);
  }, [isGuitar, isIT, activityState, guitarHeardSomething]);

  // A new step starts detection trust over; leaving the result ends the
  // mistake review.
  useEffect(() => {
    if (isGuitar) setGuitarMisses(0);
  }, [isGuitar, activeSection, stepIndex, flow]);
  useEffect(() => {
    if (isGuitar && activityState !== 'complete') setReviewingMistakes(false);
  }, [isGuitar, activityState]);

  // ── Guitar theory layers (display only, never graded) ──────────────────
  // The Beato-derived knowledge the guitar section adds: W/H step chips and
  // chord tones on the TAB, the Music Map's pattern chips and chord jobs.
  const tabTheoryLayers = useGuitarTabLayers({
    step: isGuitar ? guitarStep : null,
    keyCenter: isGuitar ? guitarKey : null,
    events: pianoRollEvents,
    countInOffset: isIT ? COUNT_IN_OFFSET : 0,
  });
  const showChordJobs = useGuitarDisplaySettings((s) => s.showChordJobs);
  const showRomanNumerals = useGuitarDisplaySettings(
    (s) => s.showRomanNumerals,
  );
  const dismissedTheoryNotes = useGuitarDisplaySettings(
    (s) => s.dismissedNotes,
  );
  const musicMapMeta = isGuitar ? resolvedStep.guitar?.musicMap : undefined;
  const musicMap = musicMapMeta
    ? GUITAR_ATLAS_BOOK_ONE[guitarKey].musicMaps[musicMapMeta.example - 1]
    : undefined;
  // Roman numerals are a teacher's setting.
  const role = useUserRole();
  const canShowRomanNumerals = role === 'teacher' || role === 'admin';
  // Entering Section B, once per key: the chords come from the scale.
  const sectionBCardDue =
    isGuitar &&
    activeSection === 'B' &&
    isSectionBCardDue(guitarKey, dismissedTheoryNotes);
  // It shows over the start card; practising, the step's notes are back.
  const sectionBCardShowing =
    sectionBCardDue && activityState === 'preview' && !restartingPass;
  // Where focus goes when the card closes (it took the pressed button).
  const stepTitleRef = useRef<HTMLDivElement>(null);

  // Drawn over the guitar TAB: the theory layers, bar picking for a loop
  // while practising the whole step, and the mistake markers after a take.
  const renderGuitarTabOverlay = useCallback(
    (layout: StaffLayout | null) => (
      <>
        <TabTheoryOverlay layout={layout} {...tabTheoryLayers} />
        {/* The map's chips span its bars: not over a looped slice */}
        {musicMap && musicMapMeta && !loopSlice && (
          <MusicMapOverlay
            layout={layout}
            keyCenter={guitarKey}
            map={musicMap}
            passes={musicMapMeta.passes}
            countInOffset={isIT ? COUNT_IN_OFFSET : 0}
            keyColor={keyColor}
            showChordJobs={showChordJobs}
            showRomanNumerals={canShowRomanNumerals && showRomanNumerals}
          />
        )}
        {activityState === 'practice' && !loopSlice && (
          <LoopSelectionOverlay
            layout={layout}
            bars={barsInStep}
            loop={practice.loop}
            onChange={(loop) => setPracticeLoop(loop)}
            padBars={practice.padBars}
            onPadChange={setPracticePad}
            keyColor={keyColor}
            countInOffset={isIT ? COUNT_IN_OFFSET : 0}
          />
        )}
        {reviewingMistakes && activityState === 'complete' && lastResult && (
          <MistakeMarkersOverlay
            layout={layout}
            outcomes={lastResult.outcomes ?? []}
            countInOffset={isIT ? COUNT_IN_OFFSET : 0}
            onLoopBar={(bar) =>
              practiceLoop({ startBar: bar, endBar: bar }, undefined, 1)
            }
          />
        )}
      </>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- COUNT_IN_OFFSET is a module-level constant
    [
      tabTheoryLayers,
      musicMap,
      musicMapMeta,
      guitarKey,
      showChordJobs,
      canShowRomanNumerals,
      showRomanNumerals,
      activityState,
      loopSlice,
      barsInStep,
      practice.loop,
      practice.padBars,
      setPracticeLoop,
      setPracticePad,
      keyColor,
      isIT,
      reviewingMistakes,
      lastResult,
      practiceLoop,
    ],
  );

  const handleStartPerformance = useCallback(async () => {
    // Stop ALL audio completely before assessment begins
    handleStopPractice();
    // Play Now grades the whole step at its own tempo: no guitar loop.
    if (isGuitar) {
      clearPracticeLoop();
      setRestartingPass(false);
    }
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
        swing,
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
    isGuitar,
    clearPracticeLoop,
  ]);

  // Guitar's Play Now: the first-run setup or the microphone first.
  const handleGuitarStartPerformance = useCallback(() => {
    if (guitarReadyToStart()) void handleStartPerformance();
  }, [guitarReadyToStart, handleStartPerformance]);

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
      {/* Header — breadcrumb and level/step share one line so the vertical
          budget goes to the piano roll and keyboard instead of chrome. */}
      <div
        style={{
          flexShrink: 0,
          padding: '8px 16px',
          borderBottom: '1px solid #333',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '4px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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
          <div
            style={{
              fontSize: '12px',
              color: '#888',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {flow.genre} Level {flow.level} · Step {stepIndex + 1} of{' '}
            {currentSection.steps.length}
          </div>
        </div>
        <div style={{ fontSize: '13px', color: '#888' }}>
          {currentStep.subsection}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div
            // Guitar: focus lands here when the Section B card closes.
            ref={isGuitar ? stepTitleRef : undefined}
            tabIndex={isGuitar ? -1 : undefined}
            style={{
              fontSize: '17px',
              fontWeight: 600,
              ...(isGuitar ? { outline: 'none' } : {}),
            }}
          >
            {currentStep.activity}
          </div>
          {resolvedStep.chordSymbols &&
            resolvedStep.chordSymbols.length > 0 && (
              <div
                style={{
                  fontSize: '14px',
                  color: keyColor,
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
      </div>

      {/* Guitar: about this key, and the step's theory notes */}
      {isGuitar && (
        <div
          data-guitar-theory
          className="flex flex-wrap items-start gap-x-4 gap-y-2"
          style={{ padding: '6px 16px', borderBottom: '1px solid #333' }}
        >
          <GuitarKeyIntro keyCenter={guitarKey} keyColor={keyColor} />
          {/* One idea at a time: the step's notes wait for the Section B card */}
          {!sectionBCardShowing && (
            <GuitarTheoryPanel
              className="min-w-0 flex-1"
              flow={flow}
              step={currentStep}
              keyCenter={guitarKey}
              keyColor={keyColor}
              includePractice={isPracticing}
              onHearShape={handleHearShape}
              allowRomanToggle={canShowRomanNumerals && activeSection !== 'A'}
            />
          )}
        </div>
      )}

      {/* Section tabs (from flow data, not hardcoded) and step navigation
          share one row — two full-width rows of chrome bought nothing that
          one does not, and the keyboard needs the pixels. */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          padding: '6px 16px',
          borderBottom: '1px solid #333',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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
                    style={{
                      fontSize: '11px',
                      marginLeft: '6px',
                      opacity: 0.7,
                    }}
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
          {/* The active section's Practice Track, always reachable once that
              section has content — so a student who moved on can come back to
              it, not only catch it on the way past. */}
          {sectionHasContent(currentSection) && (
            <button
              onClick={() => enterPracticeTrack(activeSection)}
              title={`Play over the ${currentSection.name} groove`}
              style={{
                padding: '6px 14px',
                border: '1px solid #7ecfcf',
                borderRadius: '8px',
                background: 'rgba(126,207,207,0.12)',
                color: '#7ecfcf',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              &#9834; Practice Track
            </button>
          )}
        </div>

        {/* Step navigation — clickable dots + arrows */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            // Guitar sections run to 46 steps; let the dots wrap. Wrapping
            // needs room to shrink, so guitar gives up the pinned width.
            flexShrink: isGuitar ? 1 : 0,
            flexWrap: isGuitar ? 'wrap' : undefined,
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

            // A guitar step the student counted themselves shows a hand, not
            // a tick: passed, and honest about how.
            const isSelfReported = isGuitar && !!result?.score.selfReported;
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
                  title={`${(step as ActivityStepV2).activity} ${isSelfReported ? '✓ Counted by you' : '✓ Passed'}`}
                  aria-label={
                    isSelfReported
                      ? `${(step as ActivityStepV2).activity}: counted by you`
                      : undefined
                  }
                >
                  {isSelfReported ? <Hand size={9} aria-hidden /> : '✓'}
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
      </div>

      {/* Tempo control — visible for IT activities. Only in-time steps pay for
          this row now; out-of-time steps used to reserve its height anyway. */}
      {isIT && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '6px 16px',
            background: 'rgba(255,255,255,0.03)',
            borderBottom: '1px solid #333',
            flexShrink: 0,
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
          {isGuitar && (
            <SpeedTrainerControl
              ladder={practice.ladder}
              text={practice.ladderText}
              onToggle={practice.toggleLadder}
              onReset={practice.resetLadder}
            />
          )}
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

      {/* Main content area — a bounded column. `minHeight: 0` is what lets the
          roll shrink instead of shoving the keyboard off the bottom: without
          it a flex child refuses to go below its content size. */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          padding: '8px 16px',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Piano Roll — takes the space the pinned rows leave. When even the
            floor lane height will not fit, this box scrolls; the page does not. */}
        <div
          ref={rollViewportRef}
          style={{
            flex: 1,
            minHeight: 0,
            // Guitar reads one TAB system at a time (a Music Map scrolls on to
            // its next line), so it stops at that height and leaves the rest
            // to the chord boxes, fretboard and theory notes.
            ...(isGuitar ? { maxHeight: GUITAR_TAB_HEIGHT } : {}),
            position: 'relative',
            overflowX: 'hidden',
            overflowY: 'auto',
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
              instrument={isGuitar ? 'guitar' : 'piano'}
              tabOverlay={isGuitar ? renderGuitarTabOverlay : undefined}
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
              playSpeed={runTempo}
              isPlaying={isActive && isIT}
              onPlayingChange={() => {}}
              playbackTicks={isIT ? playbackTicks : undefined}
              onTickChange={handleTickChange}
              activeMidis={isGuitar ? guitarEval.activeMidis : activeMidis}
              noteHoldMeta={
                isActive && !isIT
                  ? isGuitar
                    ? guitarEval.noteHoldMeta
                    : noteHoldMeta
                  : undefined
              }
              performanceMeta={
                isIT
                  ? isGuitar
                    ? guitarEval.performanceMeta
                    : performanceMeta
                  : undefined
              }
              keyRoot={keyRoot}
              keyColor={keyColor}
              userNotes={
                isActive ? (isGuitar ? guitarEval.userNotes : userNotes) : []
              }
              targetMidiSet={targetMidiSet}
              chordSymbols={chordSymbolsForStaff}
            />
          )}
          {/* Guitar, in the TAB's header strip (clear of the music): the
              loop while practising; with the mistakes marked, the result. */}
          {isGuitar && (isPracticing || restartingPass) && (
            <div
              className="absolute right-3 top-1 flex items-center"
              style={{ height: 30, zIndex: 31 }}
            >
              <GuitarLoopStatus
                loop={practice.loop}
                padBars={practice.padBars}
                passCount={practice.passCount}
                onPadChange={setPracticePad}
                onClear={clearPracticeLoop}
              />
            </div>
          )}
          {isGuitar && reviewingMistakes && activityState === 'complete' && (
            <div
              className="absolute right-3 top-1 flex items-center gap-3 text-[13px]"
              style={{ height: 30, zIndex: 31 }}
            >
              <span className="text-white/70">
                Tap a marked bar to loop it.
              </span>
              <button
                type="button"
                onClick={() => setReviewingMistakes(false)}
                className="rounded-full border border-white/25 px-3 py-1 text-white hover:bg-white/10"
              >
                Back to result
              </button>
            </div>
          )}
        </div>

        {/* Piano Keyboard — fixed height, range matches piano roll.
            Volume dial sits alongside on the right so it's always within
            reach during practice without crowding the header. */}
        <div
          style={{
            marginTop: '8px',
            // Guitar's chord boxes + fretboard wrap onto two rows at phone
            // width, so they get a minimum rather than a fixed height.
            ...(isGuitar
              ? { minHeight: GUITAR_VISUALS_HEIGHT }
              : { height: '120px' }),
            flexShrink: 0,
            display: 'flex',
            alignItems: 'stretch',
            gap: '12px',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            {isGuitar ? (
              <GuitarLessonVisuals
                step={guitarStep}
                events={pianoRollEvents}
                keyCenter={guitarKey}
                keyColor={keyColor}
                activityState={activityState}
                inTime={isIT}
                countInOffset={isIT ? COUNT_IN_OFFSET : 0}
                currentTickRef={currentTickRef}
                activeMidis={isActive ? guitarEval.activeMidis : []}
                demoHighlightMidis={demoHighlightMidis}
                isPlayingDemo={isPlayingDemo}
                practiceHighlightMidis={practiceHighlightMidis}
                targetMidiSet={targetMidiSet}
                noteHoldMeta={
                  isActive && !isIT ? guitarEval.noteHoldMeta : undefined
                }
                heardChord={guitarEval.heardChord}
                diagnostics={guitarEval.diagnostics}
                onHearShape={handleHearShape}
                showRomanNumerals={canShowRomanNumerals && showRomanNumerals}
                inputStatus={
                  guitar ? (
                    <GuitarInputChip
                      handle={guitar}
                      onOpenSetup={openGuitarSetup}
                    />
                  ) : undefined
                }
              />
            ) : (
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
            )}
          </div>

          {/* Metronome switch + volume — tempo has its own slider above */}
          {isGuitar && (
            <GuitarToneMenu
              inputActive={guitarListening}
              monitor={guitar?.prefs.monitorThroughAmp ?? false}
              onMonitorChange={(monitor) =>
                void guitar?.restart({ monitorThroughAmp: monitor })
              }
              onPreview={() => setTonePreviewing(true)}
            />
          )}
          <MetronomeToggle />
          <LessonVolumeDial />
        </div>

        {/* Practice mode controls — below keyboard, pinned alongside it so
            appearing mid-practice steals from the roll, never from the keys. */}
        {isGuitar && (isPracticing || restartingPass) && (
          <GuitarPracticeNotes
            handCareMs={barreLoopingMs}
            guideMuted={isIT && guitarGuideMuted}
          />
        )}
        {isPracticing && (
          <div
            style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center',
              padding: '8px 0',
              flexShrink: 0,
            }}
          >
            <button
              onClick={isGuitar ? handleBackFromPractice : handleStopPractice}
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
              onClick={
                isGuitar ? handleGuitarStartPerformance : handleStartPerformance
              }
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

        {/* Guitar: nothing heard for a while in a wait-for-me take */}
        {isGuitar && isPerforming && silenceOffer && (
          <div
            role="status"
            className="mt-2 flex flex-wrap items-center justify-center gap-3 text-[13px] text-white/80"
          >
            <span>Not hearing your guitar?</span>
            {guitar && (
              <button
                type="button"
                onClick={() => openGuitarSetup()}
                className="bg-transparent p-0 text-white underline"
              >
                Check the setup
              </button>
            )}
            <button
              type="button"
              onClick={handleCountItMyself}
              className="bg-transparent p-0 text-white underline"
            >
              Count it myself
            </button>
          </div>
        )}

        {/* Guitar, entering Section B once per key: chords from the scale */}
        {sectionBCardShowing && (
          <div
            className="absolute inset-x-0 top-0 flex items-start justify-center overflow-y-auto p-4"
            style={{
              height: `${pianoRollMaxHeight}px`,
              background: 'rgba(17,17,17,0.92)',
              // Over the TAB's header strip too: the card is the one thing
              // on screen until it's closed.
              zIndex: 35,
            }}
          >
            <GuitarSectionBCard
              className="w-full max-w-xl"
              flow={flow}
              keyCenter={guitarKey}
              keyColor={keyColor}
              onClose={() => stepTitleRef.current?.focus()}
            />
          </div>
        )}

        {/* Preview modal — covers only the piano roll, never the keyboard */}
        {activityState === 'preview' && !restartingPass && !sectionBCardDue && (
          <div
            style={{
              position: 'absolute',
              // 8px down and exactly as tall as the measured roll box, so the
              // overlay tracks the roll at any window size and still stops
              // short of the keyboard.
              top: '8px',
              left: 0,
              right: 0,
              height: `${pianoRollMaxHeight}px`,
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
              {/* Guitar: how this step listens, and the mark, up front */}
              {isGuitar && (
                <div
                  data-guitar-mode
                  className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1 text-[12px] text-white/80"
                >
                  <span className="font-semibold text-white">
                    {isIT ? 'Keep time' : 'Wait for me'}
                  </span>
                  <span aria-hidden>·</span>
                  <span>
                    Pass mark{' '}
                    {Math.round(
                      stepPassMark(currentStep.assessment ?? 'pitch_only') *
                        100,
                    )}
                    %
                  </span>
                </div>
              )}
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
                  onClick={() => {
                    if (!isGuitar || guitarReadyToStart()) {
                      void handleStartPractice();
                    }
                  }}
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
                  onClick={
                    isGuitar
                      ? handleGuitarStartPerformance
                      : handleStartPerformance
                  }
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
              {/* Guitar Music Maps: practise a part of the map on a loop */}
              {isGuitar &&
                resolvedStep.guitar?.musicMap &&
                practice.presets.length > 0 && (
                  <div
                    role="group"
                    aria-label="Practise a part"
                    className="mt-4 flex flex-wrap justify-center gap-2"
                  >
                    {practice.presets.map((preset) => (
                      <button
                        key={`${preset.id}-${preset.loop.startBar}`}
                        type="button"
                        onClick={() => practiceLoop(preset.loop, preset.pct)}
                        className="rounded-full border border-white/20 px-3 py-1 text-[12px] text-white/80 hover:bg-white/10"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                )}
            </div>
          </div>
        )}

        {/* Section complete — the Practice Track offer, before moving on. */}
        {practiceOffer && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(17,17,17,0.92)',
              zIndex: 45,
            }}
          >
            <div
              style={{
                maxWidth: '520px',
                width: '100%',
                padding: '32px',
                borderRadius: '16px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid #7ecfcf',
                textAlign: 'center',
              }}
            >
              <h2 style={{ fontSize: '26px', fontWeight: 600 }}>
                {currentSection.name} complete!
              </h2>
              <p
                style={{
                  fontSize: '14px',
                  color: '#aaa',
                  margin: '10px 0 24px',
                  lineHeight: 1.5,
                }}
              >
                {practiceOfferBlurb(currentSection.id)}
              </p>
              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  justifyContent: 'center',
                  flexWrap: 'wrap',
                }}
              >
                <button
                  onClick={() => {
                    const section = practiceOffer;
                    setPracticeOffer(null);
                    enterPracticeTrack(section);
                  }}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '24px',
                    border: 'none',
                    background: '#7ecfcf',
                    color: '#191919',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Enter Practice Track
                </button>
                <button
                  onClick={() => {
                    setPracticeOffer(null);
                    advanceSection();
                  }}
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
                  {nextSectionName
                    ? `Continue to ${nextSectionName}`
                    : 'Finish the level'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Assessment result modal */}
        {activityState === 'complete' && lastResult && !reviewingMistakes && (
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
                {(isGuitar && guitarResultHeading(lastResult)) || (
                  <>
                    {lastResult.passed ? '✓' : '✗'}{' '}
                    {Math.round(lastResult.overallScore * 100)}%
                  </>
                )}
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
              {isGuitar && (
                <GuitarResultExtras
                  result={lastResult}
                  stepKind={guitarEval.stepKind}
                  keyColor={keyColor}
                  next={guitarNextStep}
                  onNextStep={() =>
                    guitarNextStep &&
                    practiceLoop(guitarNextStep.loop, guitarNextStep.pct)
                  }
                  onShowMistakes={() => setReviewingMistakes(true)}
                  canCountItMyself={
                    !lastResult.passed && (guitarMisses >= 3 || silenceOffer)
                  }
                  onCountItMyself={handleCountItMyself}
                  onOpenSetup={guitar ? openGuitarSetup : undefined}
                />
              )}
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

        {guitar && guitarSetupStep !== null && (
          <Suspense fallback={null}>
            <GuitarInputSetup
              open
              initialStep={guitarSetupStep}
              onClose={() => setGuitarSetupStep(null)}
              handle={guitar}
              subscribeNoteOn={subscribeNoteOn}
              subscribeChord={subscribeChord}
              onPlayTestChord={playGuitarTestChord}
              outputLatencySec={outputLatencySecNow()}
            />
          </Suspense>
        )}
      </div>
    </div>
  );
}

/** What the output device reports now (after the context has resumed). */
function outputLatencySecNow(): number {
  const context = Tone.getContext().rawContext as AudioContext;
  return (context.outputLatency ?? 0) + (context.baseLatency ?? 0);
}

// ── Exported component with provider wrapper ─────────────────────────────────

const MAX_DEVICE_LATENCY_SEC = 0.5;

export function GenreLessonContainerV2(props: GenreLessonContainerV2Props) {
  // The input reads its instrument once, on mount: a new one remounts it.
  const instrument = flowInstrument(props.flow);
  return (
    <LearnInputProvider
      key={instrument}
      detectionMode="polyphonic"
      instrument={instrument}
    >
      <GenreLessonContainerV2Inner {...props} />
    </LearnInputProvider>
  );
}
