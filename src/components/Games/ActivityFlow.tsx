/* eslint-disable import/order, no-duplicate-imports, react-hooks/exhaustive-deps, react-hooks/rules-of-hooks, sonarjs/no-collapsible-if, react/jsx-sort-props, tailwindcss/classnames-order */
import {
  PROMPT_PILL,
  PROMPT_PILL_OFF,
  PROMPT_PILL_ON,
} from '@/components/promptBox/PromptBoxParts';
import { cn } from '@/components/utilities';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Tone from 'tone';
import { usePrismStartContours } from '@/hooks/data/prism/usePrismStartContours';
import { NoteHold } from './NoteHold';
import { PlayAlong } from './PlayAlong';
import { PLAY_ALONG_PASS_RATIO, type PlayAlongResult } from './playAlongGrade';
import { LessonTabStrip } from '@/curriculum/guitar/layout/LessonTabStrip';
import { TheoryLessonLayout, TheoryResultPanel } from './TheoryLessonLayout';
import {
  Primary,
  Secondary,
  type Zones,
} from '@/curriculum/guitar/layout/GuitarActionBar';
import { GuitarSectionCompletePanel } from '@/curriculum/guitar/layout/GuitarSectionCompletePanel';
import type {
  BarState,
  NavOutlineSection,
  NavStep,
  SectionCompleteModel,
} from '@/curriculum/guitar/layout/types';
import type { ActivitySectionId } from '@/curriculum/types/activity';
import { useSettingsStore } from '@/features/settings/useSettingsStore';
import { usePracticeSettings } from '@/learn/audio/usePracticeSettings';
import { useFingeringDisplay } from '@/features/learn/usePianoDisplaySettings';
import type { ActivityFingering } from '@/learn/fingering/activityFingering';
import type { FingeringCursor } from '@/learn/fingering/handFrames';
import { buildFingeringTimeline } from '@/lib/learn/pianoFingering';
import { describeKey } from '@/lib/learn/keyDescription';
import { activityPayoff } from './activityPayoff';
import type { LessonOrigin } from '@/lib/learn/lessonOrigin';
// import { BoardChoiceGame } from "./BoardChoiceGame";
// import { ChordPressGame } from "./ChordPressGame";
import { LessonOverview } from '@/components/learn/LessonOverview';
import { PrismModeSlug, usePrismModeChordsData } from '@/hooks/data';
import { useNavigate } from 'react-router';
import { LearnRoutes, SettingsRoutes, StudioRoutes } from '@/constants/routes';
import { keyLabelToUrlParam } from '@/lib/musicKeyUrl';
import { useMidiInput } from '@/hooks/music/useMidiInput';
import { useAuthToken } from '@/contexts/AuthContext/hooks/useAuthToken';
import type { PlaybackEvent } from '@/contexts/PlaybackContext/helpers';
import {
  releaseAllPianoNotes,
  startPianoSampler,
  triggerPianoAttackRelease,
} from '@/audio/pianoSampler';
import {
  pitchNameToMidi,
  THEORY_ACTIVITY_BPM,
  type NoteEvent,
} from './PianoRollPlay';
import {
  chordArpeggioThenHold,
  chordsInOrder,
  midiSequenceToEvents,
  midiSequenceToMixedArticulation,
  midiSequenceToStoccatoEvents,
  midiSequenceToWholeNotes,
  timedSequenceToEvents,
  timedSequenceToMixedArticulation,
  timedSequenceToStoccatoEvents,
} from './content/noteSequences';
import {
  progressionChart,
  THEORY_BAR_TICKS,
  theoryProgressionsFor,
} from '@/lib/learn/theoryChordProgressions';
import {
  getBluesPhrases,
  transposeBluesPhrase,
} from '@/lib/learn/bluesPhrases';
import { getScaleLesson, spellScaleChord } from '@/lib/learn/scaleLessons';
import { colorForKeyMode } from '@/lib/modeColorShift';
import {
  selectMelodyPhrases,
  type MelodyPhrases,
} from './content/melodyConstraints';
import { getChordScales } from '@/components/learn/chordScaleData';
import {
  lessonChordSymbols,
  type LessonChordSymbol,
} from '@/curriculum/notation/lessonChordSymbols';
import { useChordNotation, type ChordContext } from '@/lib/chordNotation';
import {
  buildPitchClassSpellingMap,
  spelledMidiNoteName,
} from '@/components/learn/noteSpellingLookup';
import { Env } from '@/constants/env';
import { buildActivityInstanceId } from '@/lib/progress/activityInstanceId';
import { selectResumeActivityIndex } from '@/lib/progress/resume';
import type { ProgressActivityPatch } from '@/lib/progress/types';
import {
  useLessonProgress,
  useUpdateActivityProgress,
  useUpdateLessonState,
} from '@/hooks/data/progress';
import {
  useAwardLessonActivityExperience,
  useAwardLessonCompletionExperience,
} from '@/hooks/data/experience/useAwardExperience';
import {
  trackActivityCompleted,
  trackActivityStarted,
  trackLessonCompleted,
  trackLessonStarted,
} from '@/telemetry/hooks/useTelemetryProduct';

type FlowActivityProps = {
  events?: NoteEvent[];
  onContinue?: () => void;
  onActivityCompleteChange?: (isComplete: boolean) => void;
  /** Play-along only: the score of every finished run, pass or fail. */
  onRunGraded?: (result: PlayAlongResult) => void;
  activityColor?: string;
  isActive?: boolean;
  startSignal?: number;
  startMessage?: string;
  /** Practice-mode scaffolding: show every target note on the keyboard. */
  showTargetKeys?: boolean;
  /** Lesson spelling map (noteSpellingLookup) for piano-roll lane labels. */
  noteSpelling?: Map<number, string>;
  /** Chord symbols above the staff in notation view; chord activities only. */
  chordSymbols?: readonly LessonChordSymbol[];
  /**
   * Sound the target notes as the playhead reaches them (Practice mode). Off in
   * Play Now, where the student proves the notes unaided.
   */
  playTargetNotes?: boolean;
  /** On the one-page lesson screen: just the roll and the keys. */
  bare?: boolean;
  /** The step's notes, or the demo, lit on the keyboard before a run. */
  previewNotes?: PlaybackEvent[] /** Hands and finger numbers over the keys. */;
  fingering?: ActivityFingering;
};

type ActivityFlowProps = {
  scaleMidis?: number[];
  onComplete?: () => void;
  labelChange?: (newLabel: string[]) => void;
  rootKey: string;
  rootMidi: number;
  mode?: PrismModeSlug;
  /** The chapter to open at (`?section=O|A|B`); unset resumes. */
  startAtSection?: string;
  /** Set when the lesson was opened from a song in the Studio. */
  origin?: LessonOrigin | null;
};
type ActivityState = 'pending' | 'active' | 'completed';

const DEFAULT_SCALE: number[] = [60, 62, 64, 65, 67, 69, 71, 72];
const NOTE_DURATION_TICKS = 480;
const CHROMATIC_KEYS = [
  'C',
  'D♭',
  'D',
  'E♭',
  'E',
  'F',
  'F♯',
  'G',
  'A♭',
  'A',
  'B♭',
  'B',
] as const;
const START_OVERLAY_NOTE_DURATION_SECONDS = 0.6;

type SectionId = 'O' | 'A' | 'B';

/** One activity as the flow builds it, before it gets its ids and events. */
type FlowSequenceItem = {
  key: string;
  label: string;
  Component: (props: FlowActivityProps) => JSX.Element;
  seq: NoteEvent[];
  direction: string;
  section: SectionId;
  chordSymbols?: readonly LessonChordSymbol[];
};

type ActivityDefinition = {
  activityDefId: string;
  activityInstanceId: string;
  key: string;
  label: string;
  Component: (props: FlowActivityProps) => JSX.Element;
  events: NoteEvent[];
  direction: string;
  section: SectionId;
  /** Chord symbols for the staff, when the activity is a chord activity. */
  chordSymbols?: readonly LessonChordSymbol[];
};

const SECTION_LABELS: Record<string, string> = {
  O: 'Overview',
  A: 'Melody',
  B: 'Chords',
};

const ACTIVITY_FLOW_LESSON_ID = 'mode-lesson-flow';
const ACTIVITY_FLOW_LESSON_VERSION = 2;

// The 7 diatonic mode slugs (from src/daw/prism-engine/data/modes.ts MODE_NAMES).
// Practice Track generation is diatonic-only for now, so Studio hand-off CTAs
// (Melody-complete interstitial, end-of-lesson "Open Practice Track" button)
// are gated on this.
const DIATONIC_MODE_SLUGS = new Set([
  'lydian',
  'ionian',
  'mixolydian',
  'dorian',
  'aeolian',
  'phrygian',
  'locrian',
]);

/**
 * Liveness heartbeat for lesson resume. Was 3s; see the checkpoint effect for
 * why that was pure overhead. Real checkpoints happen on activity start, on
 * completion, and on tab hide / unload.
 */
const CHECKPOINT_INTERVAL_MS = 60_000;

const ChordLoadingStep: (props: FlowActivityProps) => JSX.Element = ({
  startMessage,
}) => (
  <div
    className="rounded-xl p-6 text-center glass-panel-sm"
    style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid var(--color-border)',
    }}
  >
    <div className="text-sm" style={{ color: 'var(--color-text-dim)' }}>
      {startMessage ?? 'Loading chord exercises...'}
    </div>
  </div>
);

/**
 * A chord figure moves as one unit, down an octave while its top note is
 * above C6 — the 5–7 chords of a high key would otherwise climb past it
 * (chord-bass register rule).
 */
const inChordRegister = (figure: number[][]): number[][] => {
  const top = Math.max(...figure.flat());
  const shift = top > 84 ? -12 * Math.ceil((top - 84) / 12) : 0;
  return shift ? figure.map((chord) => chord.map((m) => m + shift)) : figure;
};

const isNumberArray = (value: unknown): value is number[] =>
  Array.isArray(value) &&
  value.every((n) => typeof n === 'number' && Number.isFinite(n));

const extractContours = (value: unknown): number[][] => {
  if (!value) return [];
  const results: number[][] = [];

  const pushIfNumbers = (maybe: unknown) => {
    if (isNumberArray(maybe)) {
      results.push(maybe);
      return true;
    }
    return false;
  };

  const inspectCollection = (collection: unknown) => {
    if (!Array.isArray(collection)) return;
    collection.forEach((item) => {
      if (pushIfNumbers(item)) return;
      if (Array.isArray(item)) {
        item.forEach((inner) => pushIfNumbers(inner));
      }
    });
  };

  if (pushIfNumbers(value)) {
    return results;
  }

  if (Array.isArray(value)) {
    inspectCollection(value);
    return results;
  }

  if (typeof value === 'object') {
    inspectCollection(Object.values(value));
  }

  return results;
};

/** The Overview's tabs, as their pills and the lesson's subtitle name them. */
const OVERVIEW_TAB_LABELS = {
  scale: 'Scale',
  triads: 'Triads',
  sevenths: '7th Chords',
  inversions: 'Inversions',
} as const;

export const ActivityFlow = ({
  scaleMidis,
  onComplete,
  labelChange,
  rootKey,
  rootMidi,
  mode,
  startAtSection,
  origin = null,
}: ActivityFlowProps) => {
  const navigate = useNavigate();
  const authToken = useAuthToken();
  // The bar's tempo (play-along steps) and the settings sheet's audio timing.
  const { resolveTempo, setTempoBpm } = usePracticeSettings();
  const outputLatencyMs = useSettingsStore((st) => st.outputLatencyMs);
  const modeLabel = mode ?? 'mode';
  // Practice Tracks (Studio hand-off CTAs) are only available for the 7
  // diatonic modes for now — see DIATONIC_MODE_SLUGS.
  const isDiatonicMode = DIATONIC_MODE_SLUGS.has(
    (modeLabel ?? '').toLowerCase(),
  );
  // The pentatonic and blues scales: melody chapters only, no chords, and a
  // Practice Track over their own progression.
  const scaleLesson = getScaleLesson(modeLabel.toLowerCase());
  const hasPracticeTrack = isDiatonicMode || scaleLesson !== null;
  // The two blues scales don't generate their melodies — they play a written
  // line, in its own rhythm. See lib/learn/bluesPhrases.
  const writtenPhrases = getBluesPhrases(modeLabel);
  const activityColor = useMemo(
    () => colorForKeyMode(rootKey, mode),
    [rootKey, mode],
  );
  const pcSpellingMap = useMemo(
    () => buildPitchClassSpellingMap(mode as string, rootKey, scaleMidis ?? []),
    [mode, rootKey, scaleMidis],
  );
  const lessonKeyScope = useMemo(
    () => `${keyLabelToUrlParam(rootKey)}:${modeLabel}`,
    [rootKey, modeLabel],
  );
  const lessonId = useMemo(
    () =>
      `${ACTIVITY_FLOW_LESSON_ID}__${keyLabelToUrlParam(rootKey).toLowerCase()}__${modeLabel.toLowerCase()}`,
    [rootKey, modeLabel],
  );
  const lessonVersion = ACTIVITY_FLOW_LESSON_VERSION;

  // const [overviewReady, setOverviewReady] = useState(false);
  const { data: contourData } = usePrismStartContours();
  const availableContours = useMemo(() => {
    const raw = contourData?.contours;
    return extractContours(raw);
  }, [contourData]);

  const chordsQuery = usePrismModeChordsData(scaleLesson ? undefined : mode);
  // A disabled query stays pending, so a scale lesson (which never asks for
  // chords) must not wait on it.
  const chordsPending = !scaleLesson && chordsQuery.isPending;
  const chordResponse = chordsQuery.data;
  // const modeChords: PrismModeChordDataMap | undefined = chordResponse?.chords;
  // The scale's own chords, stacked in thirds from each degree: Chords
  // shows from these while the API's are loading, or if it never sends any
  // (owner, 2026-10-26: Chords must always be there). Not for a scale
  // lesson, which teaches no chords.
  const localChords = useMemo(() => {
    const seven = (scaleMidis ?? []).slice(0, 7);
    if (scaleLesson || seven.length < 7) return { triads: [], tetrads: [] };
    const stack = (size: number) =>
      seven.map((_, degree) =>
        Array.from({ length: size }, (_, k) => {
          const step = degree + 2 * k;
          return seven[step % 7] + 12 * Math.floor(step / 7);
        }),
      );
    return { triads: stack(3), tetrads: stack(4) };
  }, [scaleMidis, scaleLesson]);

  const triads = useMemo(() => {
    const raw = chordResponse?.chords?.triads;
    if (!raw || !Array.isArray(raw) || raw.length === 0) {
      return localChords.triads;
    }
    return raw.map((arr) => arr.map((i) => i + rootMidi));
  }, [chordResponse, rootMidi, localChords]);

  const tetrads = useMemo(() => {
    const raw = chordResponse?.chords?.tetrads;
    if (!raw || !Array.isArray(raw) || raw.length === 0) {
      return localChords.tetrads;
    }
    return raw.map((arr) => arr.map((i) => i + rootMidi));
  }, [chordResponse, rootMidi, localChords]);

  // Chord symbols for the staff. The mode's chord-scale table already names
  // every degree the way the formatter reads it ("1 maj", "6 min"), so the
  // symbol is written from the degree rather than guessed from the pitches,
  // and follows the Jazz/Roman switcher like everywhere else in the app.
  const chordNotation = useChordNotation();
  const chordContext: ChordContext = {
    keyRootPc: typeof rootMidi === 'number' ? rootMidi % 12 : null,
    mode: (mode as string) ?? null,
  };
  const degreeLabels = getChordScales(mode as string)?.triads;

  const buildFlowDefinitions = (
    scale: number[],
    phrases?: MelodyPhrases | null,
    chordTriads: number[][] = [],
    includeChordPlaceholder = false,
    chordSevenths: number[][] = [],
  ): ActivityDefinition[] => {
    const scopeId = (id: string) => `${lessonKeyScope}:${id}`;
    const applyActivityColor = (
      seq: NoteEvent[],
      spelling: Map<number, string> = pcSpellingMap,
    ) =>
      seq.map((event) => {
        const midi = pitchNameToMidi(event.pitchName);
        return {
          ...event,
          pitchName:
            typeof midi === 'number'
              ? spelledMidiNoteName(midi, spelling)
              : event.pitchName,
          id: event.id.startsWith(`${lessonKeyScope}:`)
            ? event.id
            : scopeId(event.id),
          color: event.color ?? activityColor,
        };
      });
    const ascending = scale;
    const descending = [...scale].reverse();
    const ascendDescend = [...ascending, ...descending];
    const modeTitle =
      getChordScales(mode as string)?.modeName ?? (mode as string);
    const chordHoldEvents = midiSequenceToEvents(ascending, 'chord-hold');
    const overviewItem = {
      key: 'lesson-overview',
      label: `${rootKey} ${modeTitle} Overview`,
      Component: () => (
        <LessonOverview
          activeTab={overviewTabRef.current}
          showTitle={false}
          mode={mode as PrismModeSlug}
          rootKey={rootKey}
          rootMidi={rootMidi}
        />
      ),
      seq: [] as NoteEvent[],
      direction: `Overview of ${rootKey} ${modeTitle}.`,
      section: 'O' as SectionId,
    };
    // Already resolved to MIDI and constrained by the `melodyPhrases` memo
    // below — see content/melodyConstraints.ts.

    // Typed up front: the first entries carry no chord symbols, and an
    // inferred type would then reject the chord activities that do.
    const sequences: FlowSequenceItem[] = [
      overviewItem,
      {
        key: 'asc-nh',
        label: `${rootKey} ${modeTitle} Ascend • Hold`,
        Component: NoteHold,
        seq: applyActivityColor(chordHoldEvents),
        direction: `Hold the notes of the ${rootKey} ${modeTitle} scale.`,
        section: 'A' as SectionId,
      },
      {
        key: 'asc-pa',
        label: `${rootKey} ${modeTitle} Ascend • Play Along`,
        Component: PlayAlong,
        seq: applyActivityColor(midiSequenceToEvents(ascending, 'asc-pa')),
        direction: 'In a steady tempo, play the notes of the scale going up',
        section: 'A' as SectionId,
      },
      {
        key: 'desc-nh',
        label: `${rootKey} ${modeTitle} Descend • Hold`,
        Component: NoteHold,
        seq: applyActivityColor(midiSequenceToEvents(descending, 'desc-nh')),
        direction: 'Play the notes of the scale going down (to the left).',
        section: 'A' as SectionId,
      },
      {
        key: 'desc-pa',
        label: `${rootKey} ${modeTitle} Descend • Play Along`,
        Component: PlayAlong,
        seq: applyActivityColor(midiSequenceToEvents(descending, 'desc-pa')),
        direction: 'In a steady tempo, play the notes of the scale going down',
        section: 'A' as SectionId,
      },
      {
        key: 'ascdesc-nh',
        label: `${rootKey} ${modeTitle} Ascend + Descend • Hold`,
        Component: NoteHold,
        seq: applyActivityColor(
          midiSequenceToEvents(ascendDescend, 'ascdesc-nh'),
        ),
        direction: 'Play the notes of the scale going up and down.',
        section: 'A' as SectionId,
      },
      {
        key: 'ascdesc-pa',
        label: `${rootKey} ${modeTitle} Ascend + Descend • Play Along`,
        Component: PlayAlong,
        seq: applyActivityColor(
          midiSequenceToEvents(ascendDescend, 'ascdesc-pa'),
        ),
        direction:
          'In a steady tempo, play the notes of the scale going up and down.',
        section: 'A' as SectionId,
      },
    ];

    //////////////////ACTIVITIES 2-3 ?4?
    // A phrase never carries across an In Time activity: the short phrase ends
    // at its Play Along, the long phrase is separate material, and the three
    // articulation exercises share a third phrase so that only the touch
    // changes between them.
    //
    // The blues scales play a written line and keep its rhythm; every other
    // lesson lays its generated phrase out in even notes. Both arrive here as
    // the same three slots, so the seven activities below are written once.
    const phraseEvents = (
      slot: 'short' | 'long' | 'articulation',
      prefix: string,
      touch: 'as-written' | 'staccato' | 'mixed' = 'as-written',
    ): NoteEvent[] => {
      if (writtenPhrases) {
        const written = transposeBluesPhrase(writtenPhrases[slot], rootMidi);
        if (touch === 'staccato')
          return timedSequenceToStoccatoEvents(written, prefix);
        if (touch === 'mixed')
          return timedSequenceToMixedArticulation(written, prefix);
        return timedSequenceToEvents(written, prefix);
      }
      const generated = phrases?.[slot] ?? [];
      if (touch === 'staccato')
        return midiSequenceToStoccatoEvents(generated, prefix);
      if (touch === 'mixed')
        return midiSequenceToMixedArticulation(generated, prefix);
      return midiSequenceToEvents(generated, prefix);
    };

    if (writtenPhrases || phrases) {
      sequences.push(
        {
          key: `contour-1-nh`,
          label: `${rootKey} ${modeTitle} Musical Contour • Hold`,
          Component: NoteHold,
          seq: applyActivityColor(phraseEvents('short', `contour-1-nh`)),
          direction: `Play this short melodic phrase in ${rootKey} ${modeTitle}`,
          section: 'A' as SectionId,
        },
        {
          key: `contour-1-pa`,
          label: `${rootKey} ${modeTitle} Musical Contour • Play Along`,
          Component: PlayAlong,
          seq: applyActivityColor(phraseEvents('short', `contour-1-pa`)),
          direction: `In a steady tempo, play this short melodic phrase in ${rootKey} ${modeTitle}`,
          section: 'A' as SectionId,
        },
        {
          key: `contour-2-nh`,
          label: `${rootKey} ${modeTitle} Melodic Phrase • Hold`,
          Component: NoteHold,
          seq: applyActivityColor(phraseEvents('long', `contour-2-nh`)),
          direction: `Play this longer melodic phrase in ${rootKey} ${modeTitle}`,
          section: 'A' as SectionId,
        },
        {
          key: `contour-2-pa`,
          label: `${rootKey} ${modeTitle} Melodic Phrase • Play Along`,
          Component: PlayAlong,
          seq: applyActivityColor(phraseEvents('long', `contour-2-pa`)),
          direction: `In a steady tempo, play this longer melodic phrase in ${rootKey} ${modeTitle}`,
          section: 'A' as SectionId,
        },
        {
          key: `contour-1-stac-pa`,
          label: `${rootKey} ${modeTitle} Musical Contour (Staccato) • Play Along`,
          Component: PlayAlong,
          seq: applyActivityColor(
            phraseEvents('articulation', `contour-1-stac-pa`, 'staccato'),
          ),
          direction: `In a steady tempo, play this short melodic phrase in ${rootKey} ${modeTitle} with short articulations (“staccato”).`,
          section: 'A' as SectionId,
        },
        {
          key: `contour-1-lega-pa`,
          label: `${rootKey} ${modeTitle} Musical Contour (Legato) • Play Along`,
          Component: PlayAlong,
          seq: applyActivityColor(
            phraseEvents('articulation', `contour-1-lega-pa`),
          ),
          direction: `In a steady tempo, play this short melodic phrase in ${rootKey} ${modeTitle} with long articulations (“legato”).`,
          section: 'A' as SectionId,
        },
        {
          key: `contour-1-mix-pa`,
          label: `${rootKey} ${modeTitle} Musical Contour (Mixed Articulation) • Play Along`,
          Component: PlayAlong,
          seq: applyActivityColor(
            phraseEvents('articulation', `contour-1-mix-pa`, 'mixed'),
          ),
          direction: `In a steady tempo, play this short melodic phrase in ${rootKey} ${modeTitle} with mixed articulations (“staccato” and “legato”). `,
          section: 'A' as SectionId,
        },
      );
    }
    // ── Chords chapter ──────────────────────────────────────────────────
    // Every chord activity is in time: Demo and Practice let the student
    // prepare, Play Now is graded in time. Rules (no diminished chord in a
    // progression, one chord per bar, nothing shorter than a quarter) live in
    // lib/learn/theoryChordProgressions.ts.
    const progressions = theoryProgressionsFor(mode as string);
    const sevenths = getChordScales(mode as string)?.sevenths;

    /** One quality per chord type for a degree: "1 maj", "5 dom7". */
    const chordLabel = (kind: 'triad' | 'seventh', degree: number) => {
      const entry = (kind === 'triad' ? degreeLabels : sevenths)?.[degree - 1];
      return entry ? `${entry.degree} ${entry.quality}` : undefined;
    };
    const symbolsAtBars = (kind: 'triad' | 'seventh', degrees: number[]) => {
      const chords = degrees.flatMap((degree, bar) => {
        const label = chordLabel(kind, degree);
        return label ? [{ label, startTick: bar * THEORY_BAR_TICKS }] : [];
      });
      return chords.length
        ? lessonChordSymbols(chords, chordNotation, chordContext)
        : undefined;
    };

    const chordActivities = (
      kind: 'triad' | 'seventh',
      chords: number[][],
      chordProgressions: number[][],
    ) => {
      const noun = kind === 'triad' ? 'Chord' : '7th Chord';
      const tones = kind === 'triad' ? '1, 3 and 5' : '1, 3, 5 and 7';
      // Stand-alone chords: every degree, the diminished one included —
      // going through the chords of the scale is the one place it belongs.
      chords.forEach((chord, i) => {
        if (!isNumberArray(chord)) return;
        const degree = i + 1;
        const key = `${kind}-${degree}-arp-pa`;
        // "5 dom7", in the app's hybrid numbering; the bare degree if the
        // mode has no table.
        const name = chordLabel(kind, degree) ?? String(degree);
        sequences.push({
          key,
          label: `${rootKey} ${modeTitle} ${name} ${noun} • Arpeggio & Hold`,
          Component: PlayAlong,
          seq: applyActivityColor(
            chordArpeggioThenHold(inChordRegister([chord])[0], key),
          ),
          direction: `In a steady tempo, play the ${tones} of the ${name} chord one at a time going up, then play the chord and hold it for the bar.`,
          section: 'B' as SectionId,
          chordSymbols: symbolsAtBars(kind, [degree, degree]),
        });
      });
      chordProgressions.forEach((degrees, p) => {
        const figure = chordsInOrder(
          chords,
          degrees.map((d) => d - 1),
        );
        if (figure.length !== degrees.length) return;
        const key = `${kind}-progression-${p + 1}-pa`;
        sequences.push({
          key,
          label: `${rootKey} ${modeTitle} ${noun} Progression ${progressionChart(degrees)} • Play Along`,
          Component: PlayAlong,
          seq: applyActivityColor(
            midiSequenceToWholeNotes(inChordRegister(figure), key),
          ),
          direction: `In a steady tempo, play ${progressionChart(degrees)}, one ${noun.toLowerCase()} per bar.`,
          section: 'B' as SectionId,
          chordSymbols: symbolsAtBars(kind, degrees),
        });
      });
    };

    chordActivities('triad', chordTriads, progressions.triads);
    chordActivities('seventh', chordSevenths, progressions.sevenths);

    // Pentatonic and blues scales have no chord on every degree: their
    // Chords chapter is the tonic chords chosen for each, in set voicings
    // (lib/learn/scaleLessons.ts), with no progressions.
    scaleLesson?.chords.forEach((scaleChord, i) => {
      const key = `scale-chord-${i + 1}-arp-pa`;
      const name = `1 ${scaleChord.quality}`;
      const notes = scaleChord.offsets.map((o) => o + rootMidi);
      const tones = scaleChord.tones;
      // The chord spells its own notes (C dom7(♯9): E – B♭ – D♯), over the
      // scale's spelling for anything it doesn't name.
      const chordSpelling = new Map(pcSpellingMap);
      const tonic = spelledMidiNoteName(rootMidi, pcSpellingMap).replace(
        /-?\d+$/,
        '',
      );
      spellScaleChord(scaleChord, tonic).forEach((name, t) =>
        chordSpelling.set(
          (((rootMidi + scaleChord.offsets[t]) % 12) + 12) % 12,
          name,
        ),
      );
      const toneList =
        tones.length > 1
          ? `${tones.slice(0, -1).join(', ')} and ${tones[tones.length - 1]}`
          : tones.join('');
      sequences.push({
        key,
        label: `${rootKey} ${modeTitle} ${name} Chord • Arpeggio & Hold`,
        Component: PlayAlong,
        seq: applyActivityColor(
          chordArpeggioThenHold(inChordRegister([notes])[0], key),
          chordSpelling,
        ),
        direction: `In a steady tempo, play the ${toneList} of the ${name} chord one at a time going up, then play the chord and hold it for the bar.`,
        section: 'B' as SectionId,
        chordSymbols: lessonChordSymbols(
          [0, THEORY_BAR_TICKS].map((startTick) => ({
            label: name,
            startTick,
          })),
          chordNotation,
          chordContext,
        ),
      });
    });

    if (includeChordPlaceholder && chordTriads.length === 0) {
      sequences.push({
        key: 'chords-loading',
        label: `${rootKey} ${modeTitle} Chords • Loading`,
        Component: ChordLoadingStep,
        seq: applyActivityColor([]),
        direction: 'Loading chord exercises...',
        section: 'B' as SectionId,
      } as (typeof sequences)[number]);
    }

    return sequences.map(
      ({ key, label, Component, seq, direction, section, chordSymbols }) => ({
        activityDefId: key,
        activityInstanceId: buildActivityInstanceId({
          lessonId,
          lessonVersion,
          activityDefId: key,
          mode: modeLabel,
          root: rootKey,
        }),
        key: scopeId(key),
        label,
        Component,
        events: seq,
        direction,
        section,
        chordSymbols,
      }),
    );
  };
  ////////////// end buildFlowDefinitions ///////////////////

  // Melodies for the contour activities: three separate phrases drawn from the
  // fetched pool and resolved onto the lesson scale, each stating the mode's
  // quality and cadencing properly, with every leap inside a 5th (level 1).
  // See content/melodyConstraints.ts. A lesson with written phrases never
  // generates any — the line is the lesson.
  const melodyPhrases = useMemo(() => {
    if (writtenPhrases || availableContours.length === 0) {
      return null;
    }
    const scale =
      scaleMidis && scaleMidis.length > 0 ? scaleMidis : DEFAULT_SCALE;
    return selectMelodyPhrases(
      availableContours,
      scale,
      1,
      scaleLesson?.chordTones,
    );
  }, [writtenPhrases, availableContours, scaleMidis, scaleLesson]);

  const flowDefinitions = useMemo(() => {
    const scale =
      scaleMidis && scaleMidis.length > 0 ? scaleMidis : DEFAULT_SCALE;
    return buildFlowDefinitions(
      scale,
      melodyPhrases,
      triads,
      chordsPending && triads.length === 0,
      tetrads,
    );
  }, [
    scaleMidis,
    melodyPhrases,
    writtenPhrases,
    rootMidi,
    triads,
    tetrads,
    chordsPending,
    activityColor,
    lessonKeyScope,
    lessonId,
    lessonVersion,
    modeLabel,
    rootKey,
  ]);

  const lessonProgressQuery = useLessonProgress(lessonId, lessonVersion, true);
  const updateActivityProgress = useUpdateActivityProgress();
  const updateLessonState = useUpdateLessonState();
  const awardLessonActivity = useAwardLessonActivityExperience();
  const awardLessonCompletion = useAwardLessonCompletionExperience();
  const resumeAppliedScopeRef = useRef<string | null>(null);
  const explicitStartAppliedRef = useRef<string | null>(null);
  const completionReportedRef = useRef<Set<string>>(new Set());
  const activityStartReportedRef = useRef<Set<string>>(new Set());
  const lessonStartReportedRef = useRef<string | null>(null);
  const lessonCompleteReportedRef = useRef<string | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [activityInstanceId, setActivityInstanceId] = useState(0);
  const [activityState, setActivityState] = useState<ActivityState>('active');
  const [startSignal, setStartSignal] = useState(0);
  const [lessonComplete, setLessonComplete] = useState(false);
  // Shown once when the student finishes every Melody (section 'A') activity
  // while Chords (section 'B') activities still remain — offers a Practice
  // Track (generated Chords, open Melody) in Studio, or the existing silent
  // auto-advance into Chords.
  const [
    showMelodySectionCompleteInterstitial,
    setShowMelodySectionCompleteInterstitial,
  ] = useState(false);
  const pendingSectionAdvanceIndexRef = useRef<number | null>(null);
  // Practice runs give live feedback but don't count toward completion —
  // only a Play Now (graded) pass marks the step done. See handleStartAttempt
  // / handleActivityCompleteChange / the two progress-reporting effects below,
  // all of which check attemptMode before writing backend progress or XP.
  const [attemptMode, setAttemptMode] = useState<'practice' | 'graded' | null>(
    null,
  );
  const [practiceComplete, setPracticeComplete] = useState(false);
  // Score of the last finished play-along run. A graded run under the pass
  // mark shows the retry card instead of the completion card.
  const [playAlongResult, setPlayAlongResult] =
    useState<PlayAlongResult | null>(null);

  // Section state
  const [currentSectionId, setCurrentSectionId] = useState<SectionId>('O');
  const [overviewTab, setOverviewTab] = useState<
    'scale' | 'triads' | 'sevenths' | 'inversions'
  >('scale');
  const overviewTabRef = useRef(overviewTab);
  overviewTabRef.current = overviewTab;
  const [completedActivityKeys, setCompletedActivityKeys] = useState<
    Set<string>
  >(new Set());

  const sectionIds = useMemo(() => {
    const seen = new Set<SectionId>();
    const ids: SectionId[] = [];
    for (const def of flowDefinitions) {
      if (!seen.has(def.section)) {
        seen.add(def.section);
        ids.push(def.section);
      }
    }
    return ids;
  }, [flowDefinitions]);

  const sectionActivities = useMemo(
    () => flowDefinitions.filter((d) => d.section === currentSectionId),
    [flowDefinitions, currentSectionId],
  );

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const currentSectionIdx = sectionIds.indexOf(currentSectionId);

  // Map currentIndex to section-relative index
  const currentStepInSection = useMemo(() => {
    const activity = flowDefinitions[currentIndex];
    if (!activity || activity.section !== currentSectionId) return 0;
    return sectionActivities.findIndex((a) => a.key === activity.key);
  }, [currentIndex, currentSectionId, flowDefinitions, sectionActivities]);

  const currentActivity = flowDefinitions[currentIndex];
  const lessonProgressScope = `${lessonId}:${lessonVersion}:${lessonKeyScope}`;
  const currentChromaticIndex = useMemo(
    () => CHROMATIC_KEYS.findIndex((key) => key === rootKey),
    [rootKey],
  );
  const nextCurriculumKey = useMemo(() => {
    const safeIndex = currentChromaticIndex >= 0 ? currentChromaticIndex : 0;
    const nextIndex =
      (safeIndex + 1 + CHROMATIC_KEYS.length) % CHROMATIC_KEYS.length;
    return CHROMATIC_KEYS[nextIndex];
  }, [currentChromaticIndex]);
  const [nextKeyChoice, setNextKeyChoice] = useState<string>(nextCurriculumKey);
  const midiTriggeredRef = useRef(false);
  const isTrackableActivity =
    currentActivity?.activityDefId !== 'lesson-overview';

  const continueCurriculum = useCallback(() => {
    navigate(
      LearnRoutes.keyboardLesson({
        mode: modeLabel,
        key: keyLabelToUrlParam(nextCurriculumKey),
      }),
    );
  }, [modeLabel, navigate, nextCurriculumKey]);

  const goToSection = useCallback(
    (sectionId: SectionId) => {
      setCurrentSectionId(sectionId);
      const firstInSection = flowDefinitions.findIndex(
        (d) => d.section === sectionId,
      );
      if (firstInSection >= 0) {
        setCurrentIndex(firstInSection);
        setActivityState('active');
        setStartSignal(0);
      }
    },
    [flowDefinitions],
  );

  // Jump directly to a step within the current section — used by the
  // clickable step-progress dots. Mirrors goToSection's eager reset so
  // there's no one-frame flash before the currentActivity-keyed effect
  // above catches up.
  const goToStepInSection = useCallback(
    (activity: ActivityDefinition) => {
      const idx = flowDefinitions.findIndex((d) => d.key === activity.key);
      if (idx < 0) return;
      setCurrentIndex(idx);
      const requiresStartOverlay =
        activity.Component === PlayAlong || activity.Component === NoteHold;
      setActivityState(requiresStartOverlay ? 'pending' : 'active');
      setStartSignal(0);
      setAttemptMode(null);
      setPracticeComplete(false);
    },
    [flowDefinitions],
  );

  useEffect(() => {
    setCurrentIndex(0);
    setActivityInstanceId(0);
    setActivityState('active');
    setLessonComplete(false);
    setNextKeyChoice(nextCurriculumKey);
    setCurrentSectionId('O');
    setCompletedActivityKeys(new Set());
    resumeAppliedScopeRef.current = null;
    explicitStartAppliedRef.current = null;
    completionReportedRef.current = new Set();
  }, [mode, rootKey, nextCurriculumKey]);

  useEffect(() => {
    if (flowDefinitions.length === 0) return;
    const lessonOverviewIndex = flowDefinitions.findIndex(
      (activity) => activity.activityDefId === 'lesson-overview',
    );
    const introChordHoldActivity = flowDefinitions.find(
      (activity) => activity.activityDefId === 'intro-chord-hold',
    );
    const introChordHoldProgress = introChordHoldActivity
      ? lessonProgressQuery.data?.progressByActivityInstanceId[
          introChordHoldActivity.activityInstanceId
        ]
      : undefined;
    const introChordHoldCompleted =
      introChordHoldProgress?.status === 'COMPLETED';

    // Not the Chords placeholder: the chapter starts at its first real step.
    const sectionStartIndex = startAtSection
      ? flowDefinitions.findIndex(
          (activity) =>
            activity.section === startAtSection &&
            activity.activityDefId !== 'chords-loading',
        )
      : -1;

    // Chord activities only exist once the mode's chord data loads, so a deep
    // link into Chords waits for it instead of falling through to resume.
    if (startAtSection && sectionStartIndex < 0 && chordsPending) {
      return;
    }

    // A chapter the lesson lacks opens its first.
    const explicitStartIndex = startAtSection
      ? Math.max(sectionStartIndex, 0)
      : -1;

    const explicitStartScopeKey = startAtSection
      ? `${lessonProgressScope}:${startAtSection}`
      : null;

    if (
      explicitStartIndex >= 0 &&
      explicitStartScopeKey &&
      explicitStartAppliedRef.current !== explicitStartScopeKey
    ) {
      explicitStartAppliedRef.current = explicitStartScopeKey;
      resumeAppliedScopeRef.current = lessonProgressScope;
      setLessonComplete(false);
      setCurrentSectionId(flowDefinitions[explicitStartIndex].section);
      setCurrentIndex(explicitStartIndex);
      return;
    }

    if (!lessonProgressQuery.data) return;
    if (resumeAppliedScopeRef.current === lessonProgressScope) return;

    if (!introChordHoldCompleted && lessonOverviewIndex >= 0) {
      resumeAppliedScopeRef.current = lessonProgressScope;
      setLessonComplete(false);
      setCurrentIndex(lessonOverviewIndex);
      return;
    }

    const resumeIndex = selectResumeActivityIndex({
      activities: flowDefinitions.map((activity) => ({
        activityInstanceId: activity.activityInstanceId,
      })),
      progress: lessonProgressQuery.data,
    });

    resumeAppliedScopeRef.current = lessonProgressScope;

    if (resumeIndex < 0) {
      setLessonComplete(true);
      setCurrentIndex(Math.max(flowDefinitions.length - 1, 0));
      return;
    }

    setLessonComplete(false);
    setCurrentIndex(resumeIndex);
  }, [
    chordsPending,
    flowDefinitions,
    lessonProgressQuery.data,
    lessonProgressScope,
    startAtSection,
  ]);

  useEffect(() => {
    setActivityState('active');
    setAttemptMode(null);
    setPracticeComplete(false);
    if (!currentActivity) {
      setStartSignal(0);
      return;
    }
    const requiresStartOverlay =
      currentActivity.Component === PlayAlong ||
      currentActivity.Component === NoteHold;
    setActivityState(requiresStartOverlay ? 'pending' : 'active');
    setStartSignal(0);
  }, [currentActivity?.key]);

  useEffect(() => {
    if (!lessonComplete) {
      midiTriggeredRef.current = false;
    }
  }, [lessonComplete]);

  useEffect(() => {
    if (!lessonComplete) return;
    updateLessonState.mutate({
      lessonId,
      lessonVersion,
      currentActivityInstanceId: null,
    });
  }, [lessonComplete, lessonId, lessonVersion]);

  useEffect(() => {
    if (flowDefinitions.length === 0) return;
    if (currentIndex < flowDefinitions.length) return;
    if (!chordsPending) {
      setLessonComplete(true);
      onComplete?.();
    }
    setCurrentIndex(Math.max(flowDefinitions.length - 1, 0));
  }, [currentIndex, flowDefinitions.length, chordsPending, onComplete]);
  useEffect(() => {
    if (labelChange) {
      if (!currentActivity) return;
      const activityLabel = `Activity ${currentIndex + 1} of ${flowDefinitions.length}`;
      labelChange([currentActivity.label, activityLabel]);
    }
  }, [currentActivity, currentIndex, labelChange, flowDefinitions.length]);

  useEffect(() => {
    if (!lessonId || !isTrackableActivity) return;
    const key = `${lessonId}::${lessonVersion}`;
    if (lessonStartReportedRef.current === key) return;
    lessonStartReportedRef.current = key;
    trackLessonStarted(lessonId, {
      mode: modeLabel ?? undefined,
      rootNote: rootKey ?? undefined,
    });
  }, [lessonId, lessonVersion, modeLabel, rootKey, isTrackableActivity]);

  useEffect(() => {
    if (!currentActivity || lessonComplete) return;
    if (!isTrackableActivity) return;
    updateLessonState.mutate({
      lessonId,
      lessonVersion,
      currentActivityInstanceId: currentActivity.activityInstanceId,
    });
  }, [
    currentActivity?.activityInstanceId,
    lessonComplete,
    lessonId,
    lessonVersion,
    isTrackableActivity,
  ]);

  useEffect(() => {
    if (!currentActivity || lessonComplete) return;
    if (activityState !== 'active') return;
    if (!isTrackableActivity) return;
    // Practice attempts don't report real backend progress — only Play Now
    // (graded) attempts do. See attemptMode in handleStartAttempt.
    if (attemptMode === 'practice') return;

    updateActivityProgress.mutate({
      activityInstanceId: currentActivity.activityInstanceId,
      lessonId,
      lessonVersion,
      activityDefId: currentActivity.activityDefId,
      mode: modeLabel,
      root: rootKey,
      status: 'IN_PROGRESS',
      attemptsDelta: 1,
      resumePayloadJson: {
        activityIndex: currentIndex,
        activityDefId: currentActivity.activityDefId,
      },
    });

    if (
      !activityStartReportedRef.current.has(currentActivity.activityInstanceId)
    ) {
      activityStartReportedRef.current.add(currentActivity.activityInstanceId);
      trackActivityStarted(lessonId, currentActivity.activityDefId, {
        mode: modeLabel ?? undefined,
        rootNote: rootKey ?? undefined,
      });
    }
  }, [
    activityState,
    attemptMode,
    activityInstanceId,
    startSignal,
    currentActivity?.activityInstanceId,
    currentIndex,
    lessonComplete,
    lessonId,
    lessonVersion,
    modeLabel,
    rootKey,
    isTrackableActivity,
  ]);

  /**
   * Resume checkpoint.
   *
   * This used to fire every 3 seconds. The payload is byte-identical on every
   * tick except `checkpointAt` — `activityIndex` and `activityDefId` cannot
   * change while the interval is alive, because a change to either tears the
   * effect down and rebuilds it. So it is a pure liveness ping whose only job
   * is to keep `updatedAt` fresh for "continue where you left off" and
   * cross-device resume. Activity start and completion are already reported
   * separately, and `progressLocalCache` persists synchronously to
   * localStorage in `onMutate`.
   *
   * At 3s (and with the invalidation that used to accompany it) that was about
   * one request per second per student for the whole of a graded activity. A
   * 60s heartbeat plus explicit flushes on hide/unload gives the same recovery
   * behaviour: the worst case is losing up to 60s of `updatedAt` freshness on
   * a hard crash, and `resumePayloadJson` is unchanged anyway.
   */
  const checkpointRef = useRef<ProgressActivityPatch | null>(null);
  checkpointRef.current =
    currentActivity &&
    isTrackableActivity &&
    !lessonComplete &&
    activityState === 'active' &&
    attemptMode !== 'practice'
      ? {
          activityInstanceId: currentActivity.activityInstanceId,
          lessonId,
          lessonVersion,
          activityDefId: currentActivity.activityDefId,
          mode: modeLabel,
          root: rootKey,
          status: 'IN_PROGRESS',
          resumePayloadJson: {
            activityIndex: currentIndex,
            activityDefId: currentActivity.activityDefId,
          },
        }
      : null;

  const sendCheckpoint = useCallback(() => {
    const body = checkpointRef.current;
    if (body) updateActivityProgress.mutate(body);
    // updateActivityProgress is a stable mutation object from react-query.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!checkpointRef.current) return;

    const intervalId = window.setInterval(() => {
      // A backgrounded tab is not making progress worth recording, and mobile
      // browsers throttle timers there anyway.
      if (document.visibilityState === 'visible') sendCheckpoint();
    }, CHECKPOINT_INTERVAL_MS);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') sendCheckpoint();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', sendCheckpoint);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', sendCheckpoint);
      // Final flush when the activity changes or the component unmounts.
      sendCheckpoint();
    };
  }, [
    activityState,
    attemptMode,
    currentActivity?.activityInstanceId,
    currentIndex,
    lessonComplete,
    lessonId,
    lessonVersion,
    modeLabel,
    rootKey,
    isTrackableActivity,
    sendCheckpoint,
  ]);

  const advanceActivity = useCallback(
    ({ recordCompletion }: { recordCompletion: boolean }) => {
      setPlayAlongResult(null);
      if (recordCompletion && currentActivity && isTrackableActivity) {
        if (
          !completionReportedRef.current.has(currentActivity.activityInstanceId)
        ) {
          completionReportedRef.current.add(currentActivity.activityInstanceId);
          updateActivityProgress.mutate({
            activityInstanceId: currentActivity.activityInstanceId,
            lessonId,
            lessonVersion,
            activityDefId: currentActivity.activityDefId,
            mode: modeLabel,
            root: rootKey,
            status: 'COMPLETED',
            resumePayloadJson: {
              activityIndex: currentIndex,
              activityDefId: currentActivity.activityDefId,
              completedVia: 'continue',
            },
          });
          trackActivityCompleted(lessonId, currentActivity.activityDefId);
          void awardLessonActivity
            .mutateAsync(currentActivity.activityInstanceId)
            .catch(() => {});
        }
      }
      // Track completed activity for section progress
      if (recordCompletion && currentActivity) {
        setCompletedActivityKeys(
          (prev) => new Set([...prev, currentActivity.key]),
        );
      }
      if (currentActivity && isTrackableActivity) {
        updateLessonState.mutate({
          lessonId,
          lessonVersion,
          currentActivityInstanceId: null,
        });
      }
      setCurrentIndex((idx) => {
        const nextIdx = idx + 1;
        if (nextIdx < flowDefinitions.length) {
          const nextActivity = flowDefinitions[nextIdx];
          // Auto-advance section when moving to next section's activity
          if (nextActivity && nextActivity.section !== currentSectionId) {
            // Melody -> Chords is a teachable moment: offer a Practice Track
            // (generated Chords, open Melody) before silently continuing.
            // Diatonic-only for now (Practice Track generation is diatonic-only).
            if (
              currentSectionId === 'A' &&
              nextActivity.section === 'B' &&
              hasPracticeTrack
            ) {
              pendingSectionAdvanceIndexRef.current = nextIdx;
              setShowMelodySectionCompleteInterstitial(true);
              return idx;
            }
            setCurrentSectionId(nextActivity.section);
          }
          return nextIdx;
        }
        if (!chordsPending) {
          setLessonComplete(true);
          updateLessonState.mutate({
            lessonId,
            lessonVersion,
            currentActivityInstanceId: null,
          });
          const lessonKey = `${lessonId}::${lessonVersion}`;
          if (lessonCompleteReportedRef.current !== lessonKey) {
            lessonCompleteReportedRef.current = lessonKey;
            trackLessonCompleted(lessonId);
            // Award lesson completion experience (best-effort)
            void awardLessonCompletion.mutateAsync(lessonId).catch(() => {});
          }
          onComplete?.();
        }
        return idx;
      });
    },
    [
      chordsPending,
      currentActivity,
      currentIndex,
      currentSectionId,
      flowDefinitions,
      hasPracticeTrack,
      lessonId,
      lessonVersion,
      modeLabel,
      onComplete,
      rootKey,
      isTrackableActivity,
    ],
  );

  const handleContinue = useCallback(
    () => advanceActivity({ recordCompletion: true }),
    [advanceActivity],
  );

  // "Continue anyway" from the retry card: move on, but the step stays
  // incomplete — no progress write, no XP, no tick.
  const handleContinueAnyway = useCallback(
    () => advanceActivity({ recordCompletion: false }),
    [advanceActivity],
  );

  const handleRunGraded = useCallback(
    (result: PlayAlongResult) => {
      setPlayAlongResult(result);
      // Practice never gates: its "try Play Now" prompt shows either way.
      if (!result.passed && attemptMode === 'practice') {
        setPracticeComplete(true);
      }
    },
    [attemptMode],
  );

  // "Continue to Chords" — proceeds with the previously-silent auto-advance
  // behavior after the Melody-complete interstitial is dismissed.
  const handleContinueToChordsSection = useCallback(() => {
    const nextIdx = pendingSectionAdvanceIndexRef.current;
    setShowMelodySectionCompleteInterstitial(false);
    pendingSectionAdvanceIndexRef.current = null;
    if (nextIdx == null) return;
    setCurrentSectionId('B');
    setCurrentIndex(nextIdx);
    setActivityState('active');
    setStartSignal(0);
  }, []);

  // Practice Track CTAs (Studio hand-off) — see hasPracticeTrack.
  const openMelodyPracticeTrack = useCallback(() => {
    navigate(
      `${StudioRoutes.editor.definition}?practiceMode=${modeLabel}&practiceRoot=${keyLabelToUrlParam(rootKey)}&practiceOpen=melody`,
    );
  }, [modeLabel, navigate, rootKey]);

  const openChordsPracticeTrack = useCallback(() => {
    navigate(
      `${StudioRoutes.editor.definition}?practiceMode=${modeLabel}&practiceRoot=${keyLabelToUrlParam(rootKey)}&practiceOpen=chords`,
    );
  }, [modeLabel, navigate, rootKey]);

  // A note on the lesson-complete screen moves on. On a step it never starts
  // a run or skips ahead: the one-page screen lets the student play freely
  // before Practice or Play Now, as the guitar and Genre screens do.
  const handleMidiActivity = useCallback(() => {
    if (lessonComplete) {
      if (midiTriggeredRef.current) return;
      midiTriggeredRef.current = true;
      continueCurriculum();
    }
  }, [continueCurriculum, lessonComplete]);

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

  const handleActivityCompleteChange = useCallback(
    (isComplete: boolean) => {
      const currentComponent = currentActivity?.Component;
      const isCompletionOverlayActivity =
        currentComponent === PlayAlong || currentComponent === NoteHold;
      if (!isComplete || !isCompletionOverlayActivity) return;
      // A Practice pass gives the "nice work, try Play Now" prompt but never
      // counts as done — only a graded (Play Now) pass reaches the code below.
      if (attemptMode === 'practice') {
        setPracticeComplete(true);
        return;
      }
      setActivityState('completed');
      if (!currentActivity) return;
      setCompletedActivityKeys(
        (prev) => new Set([...prev, currentActivity.key]),
      );
      if (!isTrackableActivity) return;
      if (completionReportedRef.current.has(currentActivity.activityInstanceId))
        return;
      completionReportedRef.current.add(currentActivity.activityInstanceId);
      updateActivityProgress.mutate({
        activityInstanceId: currentActivity.activityInstanceId,
        lessonId,
        lessonVersion,
        activityDefId: currentActivity.activityDefId,
        mode: modeLabel,
        root: rootKey,
        status: 'COMPLETED',
        resumePayloadJson: {
          activityIndex: currentIndex,
          activityDefId: currentActivity.activityDefId,
        },
      });
      trackActivityCompleted(lessonId, currentActivity.activityDefId);
      // Award activity experience (best-effort, backend dedup protects duplicates)
      void awardLessonActivity
        .mutateAsync(currentActivity.activityInstanceId)
        .catch(() => {});
      updateLessonState.mutate({
        lessonId,
        lessonVersion,
        currentActivityInstanceId: null,
      });
    },
    [
      currentActivity,
      currentIndex,
      lessonId,
      lessonVersion,
      modeLabel,
      rootKey,
      isTrackableActivity,
      attemptMode,
    ],
  );

  const handleRestartActivity = () => {
    setStartSignal(0);
    setPlayAlongResult(null);
    setAttemptMode(null);
    setPracticeComplete(false);
    if (usesActivityStartOverlay) {
      setActivityState('pending');
    } else {
      setActivityState('active');
    }
    setActivityInstanceId((id) => id + 1);
  };

  const flushRecentLessonState = useCallback(() => {
    if (!authToken) return;
    if (!currentActivity) return;
    if (!isTrackableActivity) return;
    const apiBase = Env.get('VITE_MUSIC_ATLAS_API_URL', { nullable: true });
    if (!apiBase) return;
    const normalizedBase = apiBase.replace(/\/+$/, '');
    const progressPrefix = normalizedBase.endsWith('/api')
      ? '/progress'
      : '/api/progress';

    const currentActivityInstanceId =
      lessonComplete || activityState === 'completed'
        ? null
        : currentActivity.activityInstanceId;

    const lessonStateBody = {
      lessonId,
      lessonVersion,
      currentActivityInstanceId,
    };

    void fetch(`${normalizedBase}${progressPrefix}/lessonState`, {
      method: 'PATCH',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(lessonStateBody),
    }).catch(() => {});

    if (activityState === 'active' && currentActivity) {
      void fetch(`${normalizedBase}${progressPrefix}/activity`, {
        method: 'PATCH',
        keepalive: true,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          activityInstanceId: currentActivity.activityInstanceId,
          lessonId,
          lessonVersion,
          activityDefId: currentActivity.activityDefId,
          mode: modeLabel,
          root: rootKey,
          status: 'IN_PROGRESS',
          resumePayloadJson: {
            activityIndex: currentIndex,
            activityDefId: currentActivity.activityDefId,
            flushedAt: Date.now(),
            reason: 'page-exit',
          },
        }),
      }).catch(() => {});
    }
  }, [
    activityState,
    authToken,
    currentActivity,
    currentIndex,
    lessonComplete,
    lessonId,
    lessonVersion,
    modeLabel,
    rootKey,
    isTrackableActivity,
  ]);

  useEffect(() => {
    const onPageHide = () => {
      flushRecentLessonState();
    };

    window.addEventListener('pagehide', onPageHide);
    return () => {
      window.removeEventListener('pagehide', onPageHide);
      flushRecentLessonState();
    };
  }, [flushRecentLessonState]);

  if (!currentActivity) {
    return null;
  }

  const { Component, events, direction } = currentActivity;
  const usesActivityCompletionOverlay =
    Component === PlayAlong || Component === NoteHold;
  const usesActivityStartOverlay =
    Component === PlayAlong || Component === NoteHold;
  const payoff = useMemo(() => {
    if (!currentActivity || currentActivity.key === 'lesson-overview') {
      return null;
    }
    return activityPayoff({
      activityKey: currentActivity.key,
      modeSlug: modeLabel,
      modeTitle: getChordScales(mode as string)?.modeName ?? modeLabel,
      rootKey,
      steps: (scaleMidis ?? []).map((midi) => midi - rootMidi),
      chordSymbols: currentActivity.chordSymbols,
      origin,
    });
  }, [currentActivity, mode, modeLabel, origin, rootKey, rootMidi, scaleMidis]);

  // The Studio keeps the open project in memory, so going back is a plain
  // in-app navigation to the editor.
  const backToTrack = useCallback(() => {
    navigate(StudioRoutes.editor.definition);
  }, [navigate]);

  const showActivityCompletionOverlay =
    usesActivityCompletionOverlay && activityState === 'completed';
  const showPlayAlongRetry =
    attemptMode === 'graded' &&
    activityState === 'active' &&
    playAlongResult != null &&
    !playAlongResult.passed;
  const startOverlaySequence = useMemo(
    () =>
      [...events]
        .sort((a, b) => {
          if (a.startTicks !== b.startTicks) {
            return a.startTicks - b.startTicks;
          }
          const aMidi =
            typeof a.midi === 'number' ? a.midi : pitchNameToMidi(a.pitchName);
          const bMidi =
            typeof b.midi === 'number' ? b.midi : pitchNameToMidi(b.pitchName);
          if (aMidi == null || bMidi == null) {
            return 0;
          }
          return aMidi - bMidi;
        })
        .map((event) => ({
          event,
          midi:
            typeof event.midi === 'number'
              ? event.midi
              : pitchNameToMidi(event.pitchName),
        }))
        .filter(
          (item): item is { event: NoteEvent; midi: number } =>
            typeof item.midi === 'number',
        ),
    [events],
  );

  // Demo — audibly plays back the step's target note sequence with a
  // synced keyboard highlight, mirroring the genre/Fundamentals lesson gate.
  const [isPlayingDemo, setIsPlayingDemo] = useState(false);
  // MIDI note -> id of the event currently sounding it. Keying the keyboard
  // highlight by event id makes a repeated pitch visibly re-strike instead of
  // reading as one long held note.
  const [demoHighlights, setDemoHighlights] = useState<Map<number, string>>(
    () => new Map(),
  );
  const demoTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  // Ref-counts concurrent events per MIDI note so overlapping/repeated notes
  // (e.g. a held note under a moving line) don't get released early when one
  // of their occurrences ends while another is still sounding.
  const demoNoteRefCountsRef = useRef<Map<number, number>>(new Map());
  // Bumped whenever a demo starts or stops, so a demo still waiting on the
  // sampler to load can't schedule its notes after being cancelled.
  const demoRunIdRef = useRef(0);

  const demoPlayingNotes = useMemo<PlaybackEvent[]>(() => {
    const now = Date.now();
    return [...demoHighlights].map(([midi, eventId]) => ({
      id: `demo-${eventId}`,
      type: 'note',
      midi,
      time: now,
      duration: START_OVERLAY_NOTE_DURATION_SECONDS,
      velocity: 1,
    }));
  }, [demoHighlights]);

  const stopDemo = useCallback(() => {
    demoRunIdRef.current += 1;
    demoTimeoutsRef.current.forEach(clearTimeout);
    demoTimeoutsRef.current = [];
    demoNoteRefCountsRef.current = new Map();
    setIsPlayingDemo(false);
    setDemoHighlights(new Map());
    void releaseAllPianoNotes();
  }, []);

  // A demo left running must not carry on into the next step's gate.
  useEffect(() => stopDemo, [currentActivity.key, stopDemo]);

  // What the keyboard lights before a run: the demo as it plays, else the
  // step's own notes, each once (no start card shows them any more).
  const previewNotes = useMemo<PlaybackEvent[] | undefined>(() => {
    if (isPlayingDemo) return demoPlayingNotes;
    if (activityState !== 'pending') return undefined;
    const seen = new Set<number>();
    return startOverlaySequence
      .filter(({ midi }) => !seen.has(midi) && !!seen.add(midi))
      .map(({ event, midi }) => ({
        id: `target-${midi}`,
        type: 'note' as const,
        midi,
        time: 0,
        duration: 1,
        velocity: 1,
        color: event.color,
      }));
  }, [isPlayingDemo, demoPlayingNotes, activityState, startOverlaySequence]);

  // Fingering: the book's hands over the keys and finger numbers. The hands
  // follow the demo, rest on the first notes before a run, and follow what
  // each activity lights as due in practice. Off in Play Now: no fingers on
  // a graded take.
  const fingeringDisplay = useFingeringDisplay();
  const showFingering =
    usesActivityStartOverlay &&
    (fingeringDisplay.hands || fingeringDisplay.numbers);
  const fingeringTimeline = useMemo(() => {
    if (!showFingering || startOverlaySequence.length === 0) return null;
    return buildFingeringTimeline(
      startOverlaySequence.map(({ event, midi }) => ({
        midi,
        onset: event.startTicks,
        duration: event.durationTicks,
      })),
      {
        tonicPc: ((rootMidi % 12) + 12) % 12,
        ...(scaleMidis?.length
          ? {
              scalePcs: [
                ...new Set(scaleMidis.map((m) => ((m % 12) + 12) % 12)),
              ],
            }
          : {}),
        defaultHand: 'rh',
        // Theory lessons: the right hand's root-position triads thumb,
        // middle, little finger.
        rootTriad: '135',
      },
    );
  }, [showFingering, startOverlaySequence, rootMidi, scaleMidis]);
  const demoHighlightMidis = useMemo(
    () => new Set(demoHighlights.keys()),
    [demoHighlights],
  );
  const fingeringCursor = useMemo((): FingeringCursor | null => {
    if (attemptMode === 'graded' && activityState === 'active')
      return { kind: 'off' };
    if (isPlayingDemo) return { kind: 'sounding', midis: demoHighlightMidis };
    if (activityState !== 'active') return { kind: 'start' };
    return null;
  }, [attemptMode, activityState, isPlayingDemo, demoHighlightMidis]);
  const fingering = useMemo(
    (): ActivityFingering | undefined =>
      fingeringTimeline
        ? {
            timeline: fingeringTimeline,
            cursor: fingeringCursor,
            hands: fingeringDisplay.hands,
            numbers: fingeringDisplay.numbers,
          }
        : undefined,
    [
      fingeringTimeline,
      fingeringCursor,
      fingeringDisplay.hands,
      fingeringDisplay.numbers,
    ],
  );

  const playDemo = async () => {
    if (startOverlaySequence.length === 0) return;
    stopDemo();
    const runId = demoRunIdRef.current;
    const sequence = startOverlaySequence;
    setIsPlayingDemo(true);

    // Load the sampler before scheduling anything: otherwise every note that
    // comes due while samples are still loading sounds at once when they land.
    try {
      await startPianoSampler();
    } catch (error) {
      console.warn('Demo audio unavailable', error);
    }
    if (demoRunIdRef.current !== runId) return;

    // Mirrors the piano roll exactly: it plays at the roll's own tempo and
    // each note is scheduled by its own startTicks/durationTicks, so it sounds
    // and lights up for precisely the span drawn on the roll, and notes
    // sharing an onset (chords) fire together.
    const msPerTick = 60_000 / THEORY_ACTIVITY_BPM / NOTE_DURATION_TICKS;

    let maxEndMs = 0;
    sequence.forEach((item) => {
      const onsetMs = item.event.startTicks * msPerTick;
      const holdMs = item.event.durationTicks * msPerTick;
      maxEndMs = Math.max(maxEndMs, onsetMs + holdMs);

      const onTimeout = setTimeout(() => {
        void triggerPianoAttackRelease(
          Tone.Frequency(item.midi, 'midi').toNote(),
          holdMs / 1000,
          item.event.velocity,
        );
        const counts = demoNoteRefCountsRef.current;
        counts.set(item.midi, (counts.get(item.midi) ?? 0) + 1);
        setDemoHighlights((prev) =>
          new Map(prev).set(item.midi, item.event.id),
        );
      }, onsetMs);
      demoTimeoutsRef.current.push(onTimeout);

      const offTimeout = setTimeout(() => {
        const counts = demoNoteRefCountsRef.current;
        const remaining = (counts.get(item.midi) ?? 1) - 1;
        if (remaining <= 0) {
          counts.delete(item.midi);
          setDemoHighlights((prev) => {
            const next = new Map(prev);
            next.delete(item.midi);
            return next;
          });
        } else {
          counts.set(item.midi, remaining);
        }
      }, onsetMs + holdMs);
      demoTimeoutsRef.current.push(offTimeout);
    });

    const endTimeout = setTimeout(() => {
      setIsPlayingDemo(false);
      setDemoHighlights(new Map());
      demoNoteRefCountsRef.current = new Map();
    }, maxEndMs + 200);
    demoTimeoutsRef.current.push(endTimeout);
  };

  // Practice gives live feedback but doesn't count; only Play Now (graded)
  // marks the step done. See attemptMode / handleActivityCompleteChange /
  // the two progress-reporting effects above.
  const handleStartAttempt = (mode: 'practice' | 'graded') => {
    stopDemo();
    setPlayAlongResult(null);
    setAttemptMode(mode);
    setPracticeComplete(false);
    setActivityState('active');
    setStartSignal((value) => value + 1);
  };

  // Used from the "practice doesn't count" prompt to jump straight into a
  // fresh attempt (skipping the gate) — bumps activityInstanceId to force a
  // clean remount of the Component, same mechanism handleRestartActivity uses.
  const beginFreshAttempt = (mode: 'practice' | 'graded') => {
    stopDemo();
    setPlayAlongResult(null);
    setAttemptMode(mode);
    setPracticeComplete(false);
    setActivityState('active');
    setStartSignal((value) => value + 1);
    setActivityInstanceId((id) => id + 1);
  };

  // Demo from the persistent mode bar above the roll: back to the gate popup
  // (fresh remount, like Restart) with the demo already playing.
  const handleReplayDemo = () => {
    handleRestartActivity();
    void playDemo();
  };

  if (lessonComplete) {
    return (
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
              You completed the {modeLabel} lesson in {rootKey}. How would you
              like to continue?
            </p>
          </div>
          <div className="mt-6 grid gap-4">
            {origin && (
              <button
                type="button"
                onClick={backToTrack}
                className="rounded-xl px-4 py-3 text-left text-sm font-semibold transition-colors duration-150 glass-panel-sm"
                style={{
                  background: 'rgba(126, 207, 207, 0.1)',
                  border: '1px solid var(--color-accent)',
                  color: 'var(--color-text)',
                }}
              >
                Back to {origin.song}
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate(StudioRoutes.root.definition)}
              className="rounded-xl px-4 py-3 text-left text-sm font-semibold transition-colors duration-150 glass-panel-sm"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
              }}
            >
              Go to Studio
            </button>

            {hasPracticeTrack && (
              <div
                className="rounded-xl px-4 py-3 glass-panel-sm"
                style={{
                  background: 'rgba(126, 207, 207, 0.1)',
                  border: '1px solid var(--color-accent)',
                }}
              >
                <div
                  className="text-sm font-semibold"
                  style={{ color: 'var(--color-text)' }}
                >
                  Practice Track
                </div>
                <p
                  className="mt-1 text-xs"
                  style={{ color: 'var(--color-text-dim)' }}
                >
                  {scaleLesson
                    ? `Play the ${scaleLesson.title} scale over generated chords, bass, and beat.`
                    : 'Apply the chords you just learned over a generated melody, bass, and beat.'}
                </p>
                <div className="mt-3 flex flex-wrap items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={
                      scaleLesson
                        ? openMelodyPracticeTrack
                        : openChordsPracticeTrack
                    }
                    className="rounded-full px-4 py-1.5 text-sm font-semibold transition-colors duration-150"
                    style={{
                      background: 'var(--color-accent)',
                      color: '#191919',
                    }}
                  >
                    Open Practice Track
                  </button>
                </div>
              </div>
            )}

            <div
              className="rounded-xl px-4 py-3 glass-panel-sm"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div
                className="mb-2 text-sm font-semibold"
                style={{ color: 'var(--color-text)' }}
              >
                Pick next key center
              </div>
              <div className="flex flex-wrap gap-2">
                <select
                  value={nextKeyChoice}
                  onChange={(e) => setNextKeyChoice(e.target.value)}
                  className="rounded-md px-3 py-2 text-sm"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text)',
                  }}
                >
                  {CHROMATIC_KEYS.map((key) => (
                    <option key={key} value={key}>
                      {key}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      LearnRoutes.keyboardLesson({
                        mode: modeLabel,
                        key: keyLabelToUrlParam(nextKeyChoice),
                      }),
                    )
                  }
                  className="rounded-md px-4 py-2 text-sm font-semibold transition-colors duration-150"
                  style={{
                    background: 'var(--color-accent)',
                    color: '#191919',
                  }}
                >
                  Start selected key
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={continueCurriculum}
              className="rounded-xl px-4 py-3 text-left text-sm font-semibold transition-colors duration-150 glass-panel-sm"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
              }}
            >
              Continue curriculum ({nextCurriculumKey} {modeLabel})
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── The one-page screen (TheoryLessonLayout) ──────────────────────────────
  // No start card: a step waits ('pending') with its notes lit on the
  // keyboard, and Demo / Practice / Play Now sit in the bar at the bottom. A
  // result, the practice prompt, the retry and the end of Melody take the
  // activity's place, their buttons in the bar.

  const modeTitle = getChordScales(mode as string)?.modeName ?? modeLabel;
  const labelPrefix = `${rootKey} ${modeTitle} `;
  const stepTitle = (label: string) =>
    label.startsWith(labelPrefix) ? label.slice(labelPrefix.length) : label;
  // Keys are scoped to the lesson; the definition id names the step.
  const isOverview = currentActivity.activityDefId === 'lesson-overview';
  const isPlayAlongStep = Component === PlayAlong;
  const progressById = lessonProgressQuery.data?.progressByActivityInstanceId;
  /** Passed this session, or on record from before. */
  const isDone = (activity: ActivityDefinition) =>
    completedActivityKeys.has(activity.key) ||
    progressById?.[activity.activityInstanceId]?.status === 'COMPLETED';

  // The step list behind ‹ 3 / 12 ›: grouped by exercise ("Ascend"), each
  // row the exercise and how it's played ("Ascend • Hold").
  // A step's exercise group: Melody's by its exercise ("Ascend"), Chords'
  // by the kind of chord work (Triads, Triad Progressions, 7th Chords, 7th
  // Progressions). The tab row and the rail's step list both group by it.
  const exerciseGroup = (activity: ActivityDefinition) => {
    const chord = /(triad|seventh)-(progression|\d)/.exec(activity.key);
    if (chord) {
      const triad = chord[1] === 'triad';
      if (chord[2] === 'progression') {
        return triad ? 'Triad Progressions' : '7th Progressions';
      }
      return triad ? 'Triads' : '7th Chords';
    }
    return stepTitle(activity.label).split(' • ')[0];
  };

  // A section's exercise groups, in order. Melody and Chords number them
  // (owner, 2026-10-26): the rail's "1. Ascend" over its steps ("Ascend
  // Hold", "Ascend Play Along"), the tab row's "1".
  const groupsOf = (activities: ActivityDefinition[]) => [
    ...new Set(activities.map(exerciseGroup)),
  ];
  const stepsOf = (
    activities: ActivityDefinition[],
    sectionId: SectionId,
  ): NavStep[] => {
    const groups = groupsOf(activities);
    return activities.map((activity, i) => {
      const title = stepTitle(activity.label);
      const group = exerciseGroup(activity);
      if (sectionId !== 'O') {
        return {
          // No step numbers (owner, 2026-10-26: "1.1." read as confusing);
          // the group's heading keeps its number, as its tab.
          code: '',
          title: title.replace(/\s*•\s*/g, ' '),
          subsection: `${groups.indexOf(group) + 1}. ${group}`,
          status: isDone(activity) ? 'passed' : 'todo',
        };
      }
      return {
        code: activity.section === 'O' ? '' : `${activity.section}${i + 1}`,
        title,
        subsection: group,
        status: isDone(activity) ? 'passed' : 'todo',
      };
    });
  };

  const exerciseGroups = groupsOf(sectionActivities);
  const numbered = currentSectionId !== 'O';
  const groupLabel = (group: string) =>
    numbered ? `${exerciseGroups.indexOf(group) + 1}. ${group}` : group;
  const navSteps = stepsOf(sectionActivities, currentSectionId);

  const passMarkPct = Math.round(PLAY_ALONG_PASS_RATIO * 100);
  const barState: BarState = showMelodySectionCompleteInterstitial
    ? 'sectionComplete'
    : practiceComplete || showPlayAlongRetry || showActivityCompletionOverlay
      ? 'result'
      : !usesActivityStartOverlay || activityState === 'pending'
        ? 'preview'
        : attemptMode === 'practice'
          ? 'practice'
          : 'performance';

  const offer: SectionCompleteModel | null =
    showMelodySectionCompleteInterstitial
      ? {
          heading: 'Melody complete!',
          blurb:
            'Try composing your own melody over generated chords in Studio.',
          enterPracticeTrack: openMelodyPracticeTrack,
          continueLabel: 'Continue to Chords',
          onContinue: handleContinueToChordsSection,
        }
      : null;

  const leadText = (text: string) => (
    <p className="line-clamp-2 text-[15px] leading-5 text-[#e8e8f0]">{text}</p>
  );
  const canContinueAnyway = currentIndex < flowDefinitions.length - 1;
  const nextSectionId = sectionIds[sectionIds.indexOf(currentSectionId) + 1];

  // The bar's own states cover a step's preview, practice and run, and the
  // section's offer; how a Theory step ends is told here.
  const barCustom: Zones | null = practiceComplete
    ? {
        lead: null,
        meta: null,
        actions: (
          <>
            <Secondary onClick={() => beginFreshAttempt('practice')}>
              Practice Again
            </Secondary>
            <Primary onClick={() => beginFreshAttempt('graded')}>
              Play Now
            </Primary>
          </>
        ),
      }
    : showPlayAlongRetry
      ? {
          lead: null,
          meta: null,
          actions: (
            <>
              {canContinueAnyway && (
                <Secondary onClick={handleContinueAnyway}>
                  Continue anyway
                </Secondary>
              )}
              <Primary onClick={() => beginFreshAttempt('graded')}>
                Try Again
              </Primary>
            </>
          ),
        }
      : showActivityCompletionOverlay
        ? {
            lead: null,
            meta: null,
            actions: (
              <>
                {origin && (
                  <Secondary onClick={backToTrack}>
                    Back to {origin.song}
                  </Secondary>
                )}
                <Secondary onClick={handleRestartActivity}>Restart</Secondary>
                <Primary onClick={handleContinue}>Continue</Primary>
              </>
            ),
          }
        : !usesActivityStartOverlay
          ? {
              // The Overview's line is in About this step; a loading step
              // says what it's waiting for.
              lead: isOverview ? null : leadText(direction),
              meta: null,
              actions:
                isOverview && nextSectionId ? (
                  <Primary onClick={handleContinue}>
                    Start {SECTION_LABELS[nextSectionId] ?? nextSectionId}
                  </Primary>
                ) : null,
            }
          : null;

  const playedLine = playAlongResult
    ? `You played ${playAlongResult.hits} of ${playAlongResult.total} notes.`
    : null;
  const result = practiceComplete
    ? {
        heading: 'Nice practicing!',
        status: null,
        lines: [
          ...(playedLine ? [playedLine] : []),
          'Try it in Play Now to complete this step.',
        ],
      }
    : showPlayAlongRetry && playAlongResult
      ? {
          heading:
            playAlongResult.hits === 0 && playAlongResult.wrongNotes === 0
              ? 'No notes heard'
              : 'Not quite yet',
          status: `Not yet · ${passMarkPct}% passes`,
          lines: [
            `You played ${playAlongResult.hits} of ${playAlongResult.total} notes. You need ${playAlongResult.required} to pass.`,
            canContinueAnyway
              ? 'Continuing won’t mark this step complete.'
              : 'Pass this last step to complete the lesson.',
          ],
        }
      : showActivityCompletionOverlay
        ? {
            heading:
              isPlayAlongStep && playAlongResult && playAlongResult.total > 0
                ? `${Math.round((playAlongResult.hits / playAlongResult.total) * 100)}%`
                : 'Great job!',
            status: 'Passed',
            lines: isPlayAlongStep && playedLine ? [playedLine] : [],
            payoff,
          }
        : null;

  const panel = offer ? (
    <GuitarSectionCompletePanel offer={offer} />
  ) : result ? (
    <TheoryResultPanel {...result} />
  ) : null;

  const announcement = offer
    ? offer.heading
    : result
      ? [result.heading, result.status].filter(Boolean).join('. ')
      : '';

  // The Overview's tabs, after Pickup Music's over their video (owner,
  // 2026-10-26): Scale, Chords (its triads, 7ths and inversions under it)
  // and the Practice Track, which opens in the Studio.
  const chordTabs = ['triads', 'sevenths', 'inversions'] as const;
  const onChords = overviewTab !== 'scale';
  const overviewTabs =
    currentSectionId === 'O' ? (
      <div className="flex shrink-0 flex-col gap-4">
        <LessonTabStrip
          label="Overview"
          keyColor={activityColor}
          tabs={[
            {
              id: 'scale',
              label: 'Scale',
              active: !onChords,
              onSelect: () => setOverviewTab('scale'),
            },
            ...(scaleLesson
              ? []
              : [
                  {
                    id: 'chords',
                    label: 'Chords',
                    active: onChords,
                    onSelect: () => {
                      if (!onChords) setOverviewTab('triads');
                    },
                  },
                ]),
            ...(hasPracticeTrack
              ? [
                  {
                    id: 'practice-track',
                    label: 'Practice Track',
                    active: false,
                    onSelect: openMelodyPracticeTrack,
                  },
                ]
              : []),
          ]}
        />
        {/* Chords: which ones, in Learn's pills (the prompt box's). */}
        {onChords && (
          <div
            role="group"
            aria-label="Chords"
            className="flex w-fit shrink-0 flex-wrap items-center gap-2"
          >
            {chordTabs.map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={overviewTab === t}
                onClick={() => setOverviewTab(t)}
                className={cn(
                  PROMPT_PILL,
                  'max-[639px]:h-11',
                  overviewTab === t ? PROMPT_PILL_ON : PROMPT_PILL_OFF,
                )}
              >
                {OVERVIEW_TAB_LABELS[t]}
              </button>
            ))}
          </div>
        )}
      </div>
    ) : null;

  // Melody's and Chords' tabs, as the Overview's (owner, 2026-10-26): the
  // section's exercise groups, each opening its first step, then its
  // Practice Track (in the Studio). The pager pages the group's steps.
  const practiceTrackTab = hasPracticeTrack
    ? [
        {
          id: 'practice-track',
          label: 'Practice Track',
          active: false,
          onSelect:
            currentSectionId === 'B' && !scaleLesson
              ? openChordsPracticeTrack
              : openMelodyPracticeTrack,
        },
      ]
    : [];
  const currentGroup = exerciseGroup(currentActivity);
  const sectionTabs =
    currentSectionId === 'O' ? null : (
      <LessonTabStrip
        label={SECTION_LABELS[currentSectionId] ?? 'Steps'}
        keyColor={activityColor}
        tabs={[
          ...exerciseGroups.map((group) => ({
            id: group,
            // Just its number on the tab (owner, 2026-10-26); its name for
            // assistive tech and the tooltip.
            label: numbered ? String(exerciseGroups.indexOf(group) + 1) : group,
            name: numbered ? groupLabel(group) : undefined,
            // The step line under the tab: a segment per step of the group.
            steps: sectionActivities
              .filter((activity) => exerciseGroup(activity) === group)
              .map((activity) => {
                const done = isDone(activity);
                const title = stepTitle(activity.label).replace(
                  /\s*•\s*/g,
                  ' ',
                );
                return {
                  status: done ? ('passed' as const) : ('todo' as const),
                  current: activity.key === currentActivity.key,
                  label: done ? `${title}, passed` : title,
                  onSelect: () => goToStepInSection(activity),
                };
              }),
            active: group === currentGroup,
            onSelect: () => {
              const first = sectionActivities.find(
                (activity) => exerciseGroup(activity) === group,
              );
              if (first && group !== currentGroup) goToStepInSection(first);
            },
          })),
          ...practiceTrackTab,
        ]}
      />
    );

  // The rail's whole outline (owner, 2026-10-26): the Overview's tabs, then
  // every Melody and Chords step, all open in one list.
  const openStep = (activity: ActivityDefinition) => {
    setCurrentSectionId(activity.section);
    goToStepInSection(activity);
  };
  const overviewItems = [
    { id: 'scale', title: 'Scale' },
    ...(scaleLesson ? [] : [{ id: 'chords', title: 'Chords' }]),
    ...(hasPracticeTrack
      ? [{ id: 'practice-track', title: 'Practice Track' }]
      : []),
  ];
  const outline: NavOutlineSection[] = sectionIds.map((sId) => {
    const defs = flowDefinitions.filter((d) => d.section === sId);
    const active = sId === currentSectionId;
    const base = {
      id: sId as unknown as ActivitySectionId,
      name: SECTION_LABELS[sId] ?? sId,
      active,
      done: defs.length > 0 && defs.every(isDone),
    };
    if (sId === 'O') {
      return {
        ...base,
        steps: overviewItems.map(({ title }) => ({
          code: '',
          title,
          subsection: '',
          status: 'todo' as const,
        })),
        index: active ? (overviewTab === 'scale' ? 0 : 1) : -1,
        onPick: (i: number) => {
          const item = overviewItems[i]?.id;
          if (item === 'practice-track') {
            openMelodyPracticeTrack();
            return;
          }
          if (!active) goToSection('O');
          setOverviewTab(item === 'chords' ? 'triads' : 'scale');
        },
      };
    }
    return {
      ...base,
      steps: stepsOf(defs, sId),
      index: active ? defs.findIndex((d) => d.key === currentActivity.key) : -1,
      onPick: (i: number) => {
        const activity = defs[i];
        if (activity) openStep(activity);
      },
    };
  });

  const effectiveBpm = resolveTempo(THEORY_ACTIVITY_BPM);

  return (
    <TheoryLessonLayout
      header={{
        crumbs: [
          {
            label: 'Theory',
            onClick: () =>
              navigate(LearnRoutes.root(undefined, { tab: 'Theory' })),
          },
          {
            label: modeTitle,
            onClick: () =>
              navigate(LearnRoutes.keyboardOverview({ mode: modeLabel })),
          },
        ],
        keyLabel: `${rootKey} ${modeTitle}`,
        keyColor: activityColor,
        subsection: SECTION_LABELS[currentSectionId] ?? '',
        // The Overview's tab ("Overview: Scale"), else the step's name.
        activity: isOverview
          ? OVERVIEW_TAB_LABELS[overviewTab]
          : stepTitle(currentActivity.label),
        chordNames:
          !isOverview && (currentActivity.chordSymbols?.length ?? 0) > 0,
      }}
      nav={{
        sections: sectionIds.map((sId) => {
          const defs = flowDefinitions.filter((d) => d.section === sId);
          return {
            // Theory's sections are O / A / B; the nav only shows the name.
            id: sId as unknown as ActivitySectionId,
            name: SECTION_LABELS[sId] ?? sId,
            active: sId === currentSectionId,
            done: defs.length > 0 && defs.every(isDone),
          };
        }),
        onSection: (id) => goToSection(id as unknown as SectionId),
        outline,
        steps: navSteps,
        index: Math.max(0, currentStepInSection),
        goToStep: (i) => {
          const activity = sectionActivities[i];
          if (activity) goToStepInSection(activity);
        },
        // The Overview's Practice Track is one of its tabs.
        // Every section's Practice Track is the last of its tabs, and the
        // tabs page the steps: no pager.
        practiceTrack: null,
        pager: false,
        // Roll / Notation / Falling and the hands, on the tool rail, on every
        // step, the Overview's too (owner, 2026-10-26).
        noteViews: { hands: true },
      }}
      subNav={overviewTabs ?? sectionTabs}
      content={
        <Component
          key={`${currentActivity.key}-${activityInstanceId}`}
          bare
          previewNotes={previewNotes}
          fingering={fingering}
          activityColor={activityColor}
          events={events}
          isActive={activityState === 'active'}
          onContinue={handleContinue}
          onActivityCompleteChange={handleActivityCompleteChange}
          onRunGraded={handleRunGraded}
          showTargetKeys={attemptMode === 'practice'}
          playTargetNotes={attemptMode === 'practice'}
          chordSymbols={currentActivity.chordSymbols}
          startSignal={startSignal}
          startMessage={direction}
          noteSpelling={pcSpellingMap}
        />
      }
      panel={panel}
      bar={{
        state: barState,
        run: {
          state:
            barState === 'practice' || barState === 'performance'
              ? barState
              : 'preview',
          restartingPass: false,
          instruction: direction,
          listen: {
            mode: isPlayAlongStep ? 'keepTime' : 'waitForMe',
            passMarkPct: isPlayAlongStep ? passMarkPct : 100,
          },
          loading: false,
          demo: {
            playing: isPlayingDemo,
            play:
              activityState === 'pending'
                ? () => void playDemo()
                : handleReplayDemo,
            stop: stopDemo,
          },
          practise: () => handleStartAttempt('practice'),
          playNow: () =>
            activityState === 'pending'
              ? handleStartAttempt('graded')
              : beginFreshAttempt('graded'),
          back: handleRestartActivity,
          stopTake: handleRestartActivity,
          hint: null,
        },
        tempo: isPlayAlongStep
          ? {
              bpm: effectiveBpm,
              onChange: (bpm: number) => setTempoBpm(bpm),
              effectiveBpm,
            }
          : null,
        practice: { presets: [] },
        result: null,
        offer,
        custom: barCustom,
      }}
      about={{
        activity: isOverview ? 'Overview' : stepTitle(currentActivity.label),
        instruction: direction,
        chords: (currentActivity.chordSymbols ?? []).map((c) => c.text),
        key: describeKey(rootKey, mode as string),
      }}
      audio={{
        outputLatencyMs,
        openAudioTiming: () => navigate(`${SettingsRoutes.root()}/audio`),
      }}
      announcement={announcement}
    />
  );
};
