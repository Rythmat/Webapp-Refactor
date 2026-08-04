/* eslint-disable import/order, no-duplicate-imports, react-hooks/exhaustive-deps, react-hooks/rules-of-hooks, sonarjs/no-collapsible-if, react/jsx-sort-props, tailwindcss/classnames-order */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Tone from 'tone';
import { usePrismStartContours } from '@/hooks/data/prism/usePrismStartContours';
import { NoteHold } from './NoteHold';
import { PlayAlong } from './PlayAlong';
// import { BoardChoiceGame } from "./BoardChoiceGame";
// import { ChordPressGame } from "./ChordPressGame";
import { LessonOverview } from '@/components/learn/LessonOverview';
import { PrismModeSlug, usePrismModeChordsData } from '@/hooks/data';
import { useNavigate } from 'react-router';
import { LearnRoutes, StudioRoutes } from '@/constants/routes';
import { keyLabelToUrlParam } from '@/lib/musicKeyUrl';
import { useMidiInput } from '@/hooks/music/useMidiInput';
import { useAuthToken } from '@/contexts/AuthContext/hooks/useAuthToken';
import { PianoKeyboard } from '@/components/PianoKeyboard';
import type { PlaybackEvent } from '@/contexts/PlaybackContext/helpers';
import { usePlayNote } from '@/contexts/PianoContext';
import { pitchNameToMidi, type NoteEvent } from './PianoRollPlay';
import { colorForKeyMode } from '@/lib/modeColorShift';
import { getChordScales } from '@/components/learn/chordScaleData';
import {
  buildPitchClassSpellingMap,
  spelledMidiNoteName,
} from '@/components/learn/noteSpellingLookup';
import { Env } from '@/constants/env';
import { buildActivityInstanceId } from '@/lib/progress/activityInstanceId';
import { selectResumeActivityIndex } from '@/lib/progress/resume';
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
  activityColor?: string;
  isActive?: boolean;
  startSignal?: number;
  startMessage?: string;
};

type ActivityFlowProps = {
  scaleMidis?: number[];
  onComplete?: () => void;
  labelChange?: (newLabel: string[]) => void;
  rootKey: string;
  rootMidi: number;
  mode?: PrismModeSlug;
  startAtActivityKey?: string;
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

type ActivityDefinition = {
  activityDefId: string;
  activityInstanceId: string;
  key: string;
  label: string;
  Component: (props: FlowActivityProps) => JSX.Element;
  events: NoteEvent[];
  direction: string;
  section: SectionId;
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

const normalizeMidiSequence = (sequence: number[] | number[][]): number[][] => {
  const grouped = Array.isArray(sequence[0])
    ? (sequence as number[][])
    : (sequence as number[]).map((midi) => [midi]);

  // Group simultaneous notes into one slot and drop duplicate pitches in the same slot.
  return grouped.map((slot) => Array.from(new Set(slot)));
};

const midiSequenceToEvents = (
  sequence: number[] | number[][],
  prefix: string,
): NoteEvent[] => {
  return normalizeMidiSequence(sequence).flatMap((group, idx) =>
    group.map((midi, groupIndex) => ({
      id: `${prefix}-${idx}-${groupIndex}-${midi}`,
      pitchName: Tone.Frequency(midi, 'midi').toNote(),
      startTicks: idx * NOTE_DURATION_TICKS,
      durationTicks: NOTE_DURATION_TICKS,
    })),
  );
};

const midiSequenceToWholeNotes = (
  sequence: number[] | number[][],
  prefix: string,
): NoteEvent[] => {
  return normalizeMidiSequence(sequence).flatMap((group, idx) =>
    group.map((midi, groupIndex) => ({
      id: `${prefix}-${idx}-${groupIndex}-${midi}`,
      pitchName: Tone.Frequency(midi, 'midi').toNote(),
      startTicks: idx * 4 * NOTE_DURATION_TICKS,
      durationTicks: 4 * NOTE_DURATION_TICKS,
    })),
  );
};

const midiSequenceToHalfNotes = (
  sequence: number[] | number[][],
  prefix: string,
): NoteEvent[] => {
  return normalizeMidiSequence(sequence).flatMap((group, idx) => {
    const startTick = 4 * idx * NOTE_DURATION_TICKS;
    const nextStartTick = (4 * idx + 2) * NOTE_DURATION_TICKS;
    return group.flatMap((midi, groupIndex) => [
      {
        id: `${prefix}-${4 * idx}-${groupIndex}-${midi}`,
        pitchName: Tone.Frequency(midi, 'midi').toNote(),
        startTicks: startTick,
        durationTicks: NOTE_DURATION_TICKS * 2,
      },
      {
        id: `${prefix}-${4 * idx + 2}-${groupIndex}-${midi}`,
        pitchName: Tone.Frequency(midi, 'midi').toNote(),
        startTicks: nextStartTick,
        durationTicks: NOTE_DURATION_TICKS * 2,
      },
    ]);
  });
};

const midiSequenceToQuarterNotes = (
  sequence: number[] | number[][],
  prefix: string,
): NoteEvent[] => {
  return normalizeMidiSequence(sequence).flatMap((group, idx) =>
    group.flatMap((midi, groupIndex) => [
      {
        id: `${prefix}-${4 * idx}-${groupIndex}-${midi}`,
        pitchName: Tone.Frequency(midi, 'midi').toNote(),
        startTicks: 4 * idx * NOTE_DURATION_TICKS,
        durationTicks: NOTE_DURATION_TICKS,
      },
      {
        id: `${prefix}-${4 * idx + 1}-${groupIndex}-${midi}`,
        pitchName: Tone.Frequency(midi, 'midi').toNote(),
        startTicks: (4 * idx + 1) * NOTE_DURATION_TICKS,
        durationTicks: NOTE_DURATION_TICKS,
      },
      {
        id: `${prefix}-${4 * idx + 2}-${groupIndex}-${midi}`,
        pitchName: Tone.Frequency(midi, 'midi').toNote(),
        startTicks: (4 * idx + 2) * NOTE_DURATION_TICKS,
        durationTicks: NOTE_DURATION_TICKS,
      },
      {
        id: `${prefix}-${4 * idx + 3}-${groupIndex}-${midi}`,
        pitchName: Tone.Frequency(midi, 'midi').toNote(),
        startTicks: (4 * idx + 3) * NOTE_DURATION_TICKS,
        durationTicks: NOTE_DURATION_TICKS,
      },
    ]),
  );
};

const midiSequenceToEighthNotes = (
  sequence: number[] | number[][],
  prefix: string,
): NoteEvent[] => {
  return normalizeMidiSequence(sequence).flatMap((group, idx) =>
    group.flatMap((midi, groupIndex) => [
      {
        id: `${prefix}-${8 * idx}-${groupIndex}-${midi}`,
        pitchName: Tone.Frequency(midi, 'midi').toNote(),
        startTicks: 4 * idx * NOTE_DURATION_TICKS,
        durationTicks: NOTE_DURATION_TICKS * 0.5,
      },
      {
        id: `${prefix}-${8 * idx + 1}-${groupIndex}-${midi}`,
        pitchName: Tone.Frequency(midi, 'midi').toNote(),
        startTicks: (4 * idx + 0.5) * NOTE_DURATION_TICKS,
        durationTicks: NOTE_DURATION_TICKS * 0.5,
      },
      {
        id: `${prefix}-${8 * idx + 2}-${groupIndex}-${midi}`,
        pitchName: Tone.Frequency(midi, 'midi').toNote(),
        startTicks: (4 * idx + 1) * NOTE_DURATION_TICKS,
        durationTicks: NOTE_DURATION_TICKS * 0.5,
      },
      {
        id: `${prefix}-${8 * idx + 3}-${groupIndex}-${midi}`,
        pitchName: Tone.Frequency(midi, 'midi').toNote(),
        startTicks: (4 * idx + 1.5) * NOTE_DURATION_TICKS,
        durationTicks: NOTE_DURATION_TICKS * 0.5,
      },
      {
        id: `${prefix}-${8 * idx + 4}-${groupIndex}-${midi}`,
        pitchName: Tone.Frequency(midi, 'midi').toNote(),
        startTicks: (4 * idx + 2) * NOTE_DURATION_TICKS,
        durationTicks: NOTE_DURATION_TICKS * 0.5,
      },
      {
        id: `${prefix}-${8 * idx + 5}-${groupIndex}-${midi}`,
        pitchName: Tone.Frequency(midi, 'midi').toNote(),
        startTicks: (4 * idx + 2.5) * NOTE_DURATION_TICKS,
        durationTicks: NOTE_DURATION_TICKS * 0.5,
      },
      {
        id: `${prefix}-${8 * idx + 6}-${groupIndex}-${midi}`,
        pitchName: Tone.Frequency(midi, 'midi').toNote(),
        startTicks: (4 * idx + 3) * NOTE_DURATION_TICKS,
        durationTicks: NOTE_DURATION_TICKS * 0.5,
      },
      {
        id: `${prefix}-${8 * idx + 7}-${groupIndex}-${midi}`,
        pitchName: Tone.Frequency(midi, 'midi').toNote(),
        startTicks: (4 * idx + 3.5) * NOTE_DURATION_TICKS,
        durationTicks: NOTE_DURATION_TICKS * 0.5,
      },
    ]),
  );
};

const midiSequenceToStoccatoEvents = (
  sequence: number[] | number[][],
  prefix: string,
): NoteEvent[] => {
  return normalizeMidiSequence(sequence).flatMap((group, idx) =>
    group.map((midi, groupIndex) => ({
      id: `${prefix}-${idx}-${groupIndex}-${midi}`,
      pitchName: Tone.Frequency(midi, 'midi').toNote(),
      startTicks: idx * NOTE_DURATION_TICKS,
      durationTicks: NOTE_DURATION_TICKS * 0.5,
    })),
  );
};

const midiSequenceToMixedArticulation = (
  sequence: number[] | number[][],
  prefix: string,
): NoteEvent[] => {
  return normalizeMidiSequence(sequence).flatMap((group, idx) =>
    group.map((midi, groupIndex) => ({
      id: `${prefix}-${idx}-${groupIndex}-${midi}`,
      pitchName: Tone.Frequency(midi, 'midi').toNote(),
      startTicks: idx * NOTE_DURATION_TICKS,
      durationTicks:
        (NOTE_DURATION_TICKS * Math.floor(Math.random() * 2 + 1)) / 2,
    })),
  );
};

const chordArpegiateEvents = (
  sequence: number[],
  prefix: string,
): NoteEvent[] => {
  const events: NoteEvent[] = [];
  sequence.forEach((note, idx) => {
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
        startTicks: (sequence.length + 1) * NOTE_DURATION_TICKS,
        durationTicks: NOTE_DURATION_TICKS * 2,
      },
    );
  });
  return events;
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

export const ActivityFlow = ({
  scaleMidis,
  onComplete,
  labelChange,
  rootKey,
  rootMidi,
  mode,
  startAtActivityKey,
}: ActivityFlowProps) => {
  const navigate = useNavigate();
  const authToken = useAuthToken();
  const playNote = usePlayNote();
  const modeLabel = mode ?? 'mode';
  // Practice Tracks (Studio hand-off CTAs) are only available for the 7
  // diatonic modes for now — see DIATONIC_MODE_SLUGS.
  const isDiatonicMode = DIATONIC_MODE_SLUGS.has(
    (modeLabel ?? '').toLowerCase(),
  );
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

  const chordsQuery = usePrismModeChordsData(mode);
  const chordResponse = chordsQuery.data;
  // const modeChords: PrismModeChordDataMap | undefined = chordResponse?.chords;
  const triads = useMemo(() => {
    const raw = chordResponse?.chords?.triads;
    if (!raw || !Array.isArray(raw)) return [];
    return raw.map((arr) => arr.map((i) => i + rootMidi));
  }, [chordResponse, rootMidi]);

  const generateStepTriad = (step: number) => {
    const baseChord = triads[step - 1];
    return baseChord ? baseChord : undefined;
  };

  const buildFlowDefinitions = (
    scale: number[],
    contours?: number[][],
    chordTriads: number[][] = [],
    includeChordPlaceholder = false,
  ): ActivityDefinition[] => {
    const scopeId = (id: string) => `${lessonKeyScope}:${id}`;
    const applyActivityColor = (seq: NoteEvent[]) =>
      seq.map((event) => {
        const midi = pitchNameToMidi(event.pitchName);
        return {
          ...event,
          pitchName:
            typeof midi === 'number'
              ? spelledMidiNoteName(midi, pcSpellingMap)
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
          mode={mode as PrismModeSlug}
          rootKey={rootKey}
          rootMidi={rootMidi}
        />
      ),
      seq: [] as NoteEvent[],
      direction: `Overview of ${rootKey} ${modeTitle}.`,
      section: 'O' as SectionId,
    };
    const contourSeqs: number[][] = [];
    contours?.forEach((contour) => {
      if (!Array.isArray(contour)) {
        return;
      }

      const mapContourValue = (value: number): number | undefined => {
        if (value > 0) {
          const noteIdx = value - 1;
          return scale[noteIdx];
        }
        if (value < 0) {
          const idxFromBack = scale.length + value;
          if (idxFromBack < 0 || idxFromBack >= scale.length) return undefined;
          return scale[idxFromBack] - 12;
        }
        return undefined;
      };

      const seq = contour
        .map((scaleIdx) => mapContourValue(scaleIdx))
        .filter((midi): midi is number => typeof midi === 'number');

      if (seq.length === 0) return;
      contourSeqs.push(seq);
    });

    const sequences = [
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
    if (contourSeqs[0] && contourSeqs[1]) {
      const combined = [...contourSeqs[0], ...contourSeqs[1]];
      sequences.push(
        {
          key: `contour-1-nh`,
          label: `${rootKey} ${modeTitle} Musical Contour • Hold`,
          Component: NoteHold,
          seq: applyActivityColor(
            midiSequenceToEvents(contourSeqs[0], `contour-1-nh`),
          ),
          direction: `Play this short melodic phrase in ${rootKey} ${modeTitle}`,
          section: 'A' as SectionId,
        },
        {
          key: `contour-1-pa`,
          label: `${rootKey} ${modeTitle} Musical Contour • Play Along`,
          Component: PlayAlong,
          seq: applyActivityColor(
            midiSequenceToEvents(contourSeqs[0], `contour-1-pa`),
          ),
          direction: `In a steady tempo, play this short melodic phrase in ${rootKey} ${modeTitle}`,
          section: 'A' as SectionId,
        },
        {
          key: `contour-2-nh`,
          label: `${rootKey} ${modeTitle} Melodic Phrase • Hold`,
          Component: NoteHold,
          seq: applyActivityColor(
            midiSequenceToEvents(combined, `contour-2-nh`),
          ),
          direction: `Play this longer melodic phrase in ${rootKey} ${modeTitle}`,
          section: 'A' as SectionId,
        },
        {
          key: `contour-2-pa`,
          label: `${rootKey} ${modeTitle} Melodic Phrase • Play Along`,
          Component: PlayAlong,
          seq: applyActivityColor(
            midiSequenceToEvents(combined, `contour-2-pa`),
          ),
          direction: `In a steady tempo, play this longer melodic phrase in ${rootKey} ${modeTitle}`,
          section: 'A' as SectionId,
        },
        {
          key: `contour-1-stac-pa`,
          label: `${rootKey} ${modeTitle} Musical Contour (Staccato) • Play Along`,
          Component: PlayAlong,
          seq: applyActivityColor(
            midiSequenceToStoccatoEvents(contourSeqs[0], `contour-1-stac-pa`),
          ),
          direction: `In a steady tempo, play this short melodic phrase in ${rootKey} ${modeTitle} with short articulations (“staccato”).`,
          section: 'A' as SectionId,
        },
        {
          key: `contour-1-lega-pa`,
          label: `${rootKey} ${modeTitle} Musical Contour (Legato) • Play Along`,
          Component: PlayAlong,
          seq: applyActivityColor(
            midiSequenceToEvents(contourSeqs[0], `contour-1-lega-pa`),
          ),
          direction: `In a steady tempo, play this short melodic phrase in ${rootKey} ${modeTitle} with long articulations (“legato”).`,
          section: 'A' as SectionId,
        },
        {
          key: `contour-1-mix-pa`,
          label: `${rootKey} ${modeTitle} Musical Contour (Mixed Articulation) • Play Along`,
          Component: PlayAlong,
          seq: applyActivityColor(
            midiSequenceToMixedArticulation(contourSeqs[0], `contour-1-mix-pa`),
          ),
          direction: `In a steady tempo, play this short melodic phrase in ${rootKey} ${modeTitle} with mixed articulations (“staccato” and “legato”). `,
          section: 'A' as SectionId,
        },
      );
    }
    /////////// ACTIVITIES FOR 5
    for (let i = 0; i < 4; i++) {
      const chordNotes = generateStepTriad(i + 1);
      if (isNumberArray(chordNotes)) {
        sequences.push(
          {
            key: `arpeggiate-${i + 1}-nh`,
            label: `${rootKey} ${modeTitle} ${i + 1} Chord Arpeggio • Hold`,
            Component: NoteHold,
            seq: applyActivityColor(
              chordArpegiateEvents(
                chordNotes ?? [scale[0], scale[2], scale[4]],
                `arpeggiate-${i + 1}-nh`,
              ),
            ),
            direction: `Play the notes of the ${i + 1} chord one at a time going up (to the right) and then play the chord.`,
            section: 'B' as SectionId,
          },
          {
            key: `arpeggiate-${i + 1}-pa`,
            label: `${rootKey} ${modeTitle} ${i + 1} Chord Arpeggio • Play Along`,
            Component: PlayAlong,
            seq: applyActivityColor(
              chordArpegiateEvents(
                chordNotes ?? [scale[0], scale[2], scale[4]],
                `arpeggiate-${i + 1}-pa`,
              ),
            ),
            direction:
              'In a steady tempo, play an arpeggio of the chord going up and then play the chord.',
            section: 'B' as SectionId,
          },
        );
      }
    }
    if (triads.length > 4) {
      ////////////////ACTIVITES FOR 6
      // NoteEvent {
      //   id: string;
      //   pitchName: string;
      //   midi?: Midi;
      //   startTicks: number;
      //   durationTicks: number;
      //   velocity?: number;
      //   color?: string;
      // }
      const oneToFourChords = [triads[0], triads[1], triads[2], triads[3]];
      sequences.push(
        {
          key: `chords-1-nh`,
          label: `${rootKey} ${modeTitle} Chords • Hold`,
          Component: NoteHold,
          seq: applyActivityColor(
            midiSequenceToEvents(oneToFourChords, `chords-1-nh`),
          ),
          direction: `Play the notes of the 1 through the four chord for ${rootKey} ${modeTitle}, holding down the notes of each chord as you go.`,
          section: 'B' as SectionId,
        },
        {
          key: `chords-1-pa`,
          label: `${rootKey} ${modeTitle} Chords (Whole) • Play Along`,
          Component: PlayAlong,
          seq: applyActivityColor(
            midiSequenceToWholeNotes(oneToFourChords, `chords-1-pa`),
          ),
          direction: `In a steady tempo, play the 1 through the four chord for ${rootKey} ${modeTitle} in whole notes.`,
          section: 'B' as SectionId,
        },
        {
          key: `chords-2-pa`,
          label: `${rootKey} ${modeTitle} Chords (Half) • Play Along`,
          Component: PlayAlong,
          seq: applyActivityColor(
            midiSequenceToHalfNotes(oneToFourChords, `chords-2-pa`),
          ),
          direction: `In a steady tempo, play the 1 through the four chord for ${rootKey} ${modeTitle} in half notes.`,
          section: 'B' as SectionId,
        },
        {
          key: `chords-3-pa`,
          label: `${rootKey} ${modeTitle} Chords (Quarter) • Play Along`,
          Component: PlayAlong,
          seq: applyActivityColor(
            midiSequenceToQuarterNotes(oneToFourChords, `chords-3-pa`),
          ),
          direction: `In a steady tempo, play the 1 through the four chord for ${rootKey} ${modeTitle} in quarter notes.`,
          section: 'B' as SectionId,
        },
      );

      //////////ACTIVITES FOR 7
      const indices = [0, 1, 2, 3];
      let shuffled = indices.sort(() => Math.random() - 0.5);
      sequences.push({
        key: `chords-4-pa`,
        label: `${rootKey} ${modeTitle} Two Chords (Staccato) • Play Along`,
        Component: PlayAlong,
        seq: applyActivityColor(
          midiSequenceToStoccatoEvents(
            [...triads[shuffled[0]], ...triads[shuffled[1]]],
            `chords-4-pa`,
          ),
        ),
        direction: `Play chord ${shuffled[0] + 1} and ${shuffled[1] + 1} in a steady tempo, with short articulations (“staccato”).`,
        section: 'B' as SectionId,
      });
      shuffled = shuffled.sort(() => Math.random() - 0.5);
      sequences.push({
        key: `chords-5-pa`,
        label: `${rootKey} ${modeTitle} Two Chords (Legato) • Play Along`,
        Component: PlayAlong,
        seq: applyActivityColor(
          midiSequenceToEvents(
            [...triads[shuffled[0]], ...triads[shuffled[1]]],
            `chords-5-pa`,
          ),
        ),
        direction: `Play chord ${shuffled[0] + 1} and ${shuffled[1] + 1} in a steady tempo, with long articulations (“legato”).`,
        section: 'B' as SectionId,
      });

      /////////ACTIVITES FOR 8
      shuffled = shuffled.sort(() => Math.random() - 0.5);
      sequences.push({
        key: `chords-2-nh`,
        label: `${rootKey} ${modeTitle} First Four Chords • Hold`,
        Component: NoteHold,
        seq: applyActivityColor(
          midiSequenceToEvents(
            [
              ...triads[shuffled[0]],
              ...triads[shuffled[1]],
              ...triads[shuffled[2]],
              ...triads[shuffled[3]],
            ],
            `chords-2-nh`,
          ),
        ),
        direction: `Play the first four chords in a mixed order, holding down each chord one by one.`,
        section: 'B' as SectionId,
      });
      sequences.push({
        key: `chords-7-pa`,
        label: `${rootKey} ${modeTitle} First Four Chords • Play Along`,
        Component: PlayAlong,
        seq: applyActivityColor(
          midiSequenceToHalfNotes(
            [
              ...triads[shuffled[0]],
              ...triads[shuffled[1]],
              ...triads[shuffled[2]],
              ...triads[shuffled[3]],
            ],
            `chords-7-pa`,
          ),
        ),
        direction: `In a steady tempo, play the first four chords in a mixed order, each chord held for a half note.`,
        section: 'B' as SectionId,
      });
      sequences.push({
        key: `chords-8-pa`,
        label: `${rootKey} ${modeTitle} First Four Chords • Play Along`,
        Component: PlayAlong,
        seq: applyActivityColor(
          midiSequenceToQuarterNotes(
            [
              ...triads[shuffled[0]],
              ...triads[shuffled[1]],
              ...triads[shuffled[2]],
              ...triads[shuffled[3]],
            ],
            `chords-8-pa`,
          ),
        ),
        direction: `In a steady tempo, play the first four chords in a mixed order, each chord held for a quarter note.`,
        section: 'B' as SectionId,
      });
      sequences.push({
        key: `chords-9-pa`,
        label: `${rootKey} ${modeTitle} First Four Chords • Play Along`,
        Component: PlayAlong,
        seq: applyActivityColor(
          midiSequenceToEighthNotes(
            [
              ...triads[shuffled[0]],
              ...triads[shuffled[1]],
              ...triads[shuffled[2]],
              ...triads[shuffled[3]],
            ],
            `chords-9-pa`,
          ),
        ),
        direction: `In a steady tempo, play the first four chords in a mixed order, each chord held for a eighth note.`,
        section: 'B' as SectionId,
      });
      shuffled = shuffled.sort(() => Math.random() - 0.5);
      sequences.push({
        key: `chords-6-pa`,
        label: `${rootKey} ${modeTitle} Four Chords (Mixed Articulation) • Play Along`,
        Component: PlayAlong,
        seq: applyActivityColor(
          midiSequenceToEvents(
            [
              ...triads[shuffled[0]],
              ...triads[shuffled[1]],
              ...triads[shuffled[2]],
              ...triads[shuffled[3]],
            ],
            `chords-6-pa`,
          ),
        ),
        direction: `Play the four chords in a steady tempo, with mixed articulations.`,
        section: 'B' as SectionId,
      });
    }

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
      ({ key, label, Component, seq, direction, section }) => ({
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
      }),
    );
  };
  ////////////// end buildFlowDefinitions ///////////////////

  const randomContours = useMemo(() => {
    if (availableContours.length === 0) {
      return [];
    }
    const shuffled = [...availableContours].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  }, [availableContours]);

  const flowDefinitions = useMemo(() => {
    const scale =
      scaleMidis && scaleMidis.length > 0 ? scaleMidis : DEFAULT_SCALE;
    return buildFlowDefinitions(
      scale,
      randomContours,
      triads,
      chordsQuery.isPending && triads.length === 0,
    );
  }, [
    scaleMidis,
    randomContours,
    triads,
    chordsQuery.isPending,
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
  const [startOverlayStep, setStartOverlayStep] = useState(0);
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
      LearnRoutes.lesson({
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
        setStartOverlayStep(0);
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
      setStartOverlayStep(0);
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

    const explicitStartIndex = startAtActivityKey
      ? flowDefinitions.findIndex(
          (activity) =>
            activity.activityDefId === startAtActivityKey ||
            activity.key === startAtActivityKey,
        )
      : -1;

    const explicitStartScopeKey = startAtActivityKey
      ? `${lessonProgressScope}:${startAtActivityKey}`
      : null;

    if (
      explicitStartIndex >= 0 &&
      explicitStartScopeKey &&
      explicitStartAppliedRef.current !== explicitStartScopeKey
    ) {
      if (!introChordHoldCompleted && lessonOverviewIndex >= 0) {
        explicitStartAppliedRef.current = explicitStartScopeKey;
        resumeAppliedScopeRef.current = lessonProgressScope;
        setLessonComplete(false);
        setCurrentIndex(lessonOverviewIndex);
        return;
      }
      explicitStartAppliedRef.current = explicitStartScopeKey;
      resumeAppliedScopeRef.current = lessonProgressScope;
      setLessonComplete(false);
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
    flowDefinitions,
    lessonProgressQuery.data,
    lessonProgressScope,
    startAtActivityKey,
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
    setStartOverlayStep(0);
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
    if (!chordsQuery.isPending) {
      setLessonComplete(true);
      onComplete?.();
    }
    setCurrentIndex(Math.max(flowDefinitions.length - 1, 0));
  }, [currentIndex, flowDefinitions.length, chordsQuery.isPending, onComplete]);
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

  useEffect(() => {
    if (!currentActivity || lessonComplete) return;
    if (activityState !== 'active') return;
    if (!isTrackableActivity) return;
    if (attemptMode === 'practice') return;

    const intervalId = window.setInterval(() => {
      updateActivityProgress.mutate({
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
          checkpointAt: Date.now(),
        },
      });
    }, 3000);

    return () => window.clearInterval(intervalId);
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
  ]);

  const handleContinue = useCallback(() => {
    if (currentActivity && isTrackableActivity) {
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
    if (currentActivity) {
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
            isDiatonicMode
          ) {
            pendingSectionAdvanceIndexRef.current = nextIdx;
            setShowMelodySectionCompleteInterstitial(true);
            return idx;
          }
          setCurrentSectionId(nextActivity.section);
        }
        return nextIdx;
      }
      if (!chordsQuery.isPending) {
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
  }, [
    chordsQuery.isPending,
    currentActivity,
    currentIndex,
    currentSectionId,
    flowDefinitions,
    isDiatonicMode,
    lessonId,
    lessonVersion,
    modeLabel,
    onComplete,
    rootKey,
    isTrackableActivity,
  ]);

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
    setStartOverlayStep(0);
  }, []);

  // Practice Track CTAs (Studio hand-off) — diatonic-only, see isDiatonicMode.
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

  const handleMidiActivity = useCallback(() => {
    if (lessonComplete) {
      if (midiTriggeredRef.current) return;
      midiTriggeredRef.current = true;
      continueCurriculum();
      return;
    }

    if (activityState === 'pending') {
      setActivityState('active');
      setStartSignal((value) => value + 1);
      return;
    }

    if (activityState === 'completed') {
      handleContinue();
    }
  }, [activityState, continueCurriculum, handleContinue, lessonComplete]);

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
  const showActivityCompletionOverlay =
    usesActivityCompletionOverlay && activityState === 'completed';
  const showStartOverlay =
    usesActivityStartOverlay && activityState === 'pending';

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

  useEffect(() => {
    if (!showStartOverlay || startOverlaySequence.length === 0) {
      setStartOverlayStep(0);
      return;
    }

    const intervalId = window.setInterval(() => {
      setStartOverlayStep((prev) => {
        const next = prev + 1;
        if (next >= startOverlaySequence.length) {
          return 0;
        }
        return next;
      });
    }, 600);

    return () => window.clearInterval(intervalId);
  }, [showStartOverlay, startOverlaySequence]);

  const startOverlayNotes = useMemo(() => {
    if (startOverlaySequence.length === 0) {
      return [];
    }

    const now = Date.now();
    const cappedIndex = Math.min(
      startOverlayStep,
      startOverlaySequence.length - 1,
    );
    const item = startOverlaySequence[cappedIndex];
    return [
      {
        id: `start-${item.event.id}-${cappedIndex}`,
        type: 'note',
        midi: item.midi,
        time: now,
        duration: START_OVERLAY_NOTE_DURATION_SECONDS,
        velocity: 1,
        color: item.event.color,
      } satisfies PlaybackEvent,
    ];
  }, [startOverlaySequence, startOverlayStep]);

  // Demo — audibly plays back the step's target note sequence with a
  // synced keyboard highlight, mirroring the genre/Fundamentals lesson gate.
  const [isPlayingDemo, setIsPlayingDemo] = useState(false);
  const [demoHighlightMidis, setDemoHighlightMidis] = useState<Set<number>>(
    new Set(),
  );
  const demoTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const demoPlayingNotes = useMemo<PlaybackEvent[]>(() => {
    const now = Date.now();
    return [...demoHighlightMidis].map((midi, i) => ({
      id: `demo-${midi}-${i}`,
      type: 'note',
      midi,
      time: now,
      duration: START_OVERLAY_NOTE_DURATION_SECONDS,
      velocity: 1,
    }));
  }, [demoHighlightMidis]);

  const { startC: startOverlayStartC, endC: startOverlayEndC } = useMemo(() => {
    if (startOverlaySequence.length === 0) {
      return { startC: 3, endC: 4 };
    }
    const midiValues = startOverlaySequence.map((item) => item.midi);
    const minMidi = Math.min(...midiValues);
    const maxMidi = Math.max(...midiValues);
    // PianoKeyboard maps octave N to MIDI [N*12 .. N*12+11].
    const minOctave = Math.floor(minMidi / 12);
    const maxOctave = Math.floor(maxMidi / 12);
    const endC = Math.max(maxOctave, minOctave + 1);
    return { startC: minOctave, endC };
  }, [startOverlaySequence]);

  const stopDemo = () => {
    demoTimeoutsRef.current.forEach(clearTimeout);
    demoTimeoutsRef.current = [];
    setIsPlayingDemo(false);
    setDemoHighlightMidis(new Set());
  };

  const playDemo = () => {
    if (startOverlaySequence.length === 0) return;
    stopDemo();
    setIsPlayingDemo(true);
    const NOTE_GAP_MS = 500;
    startOverlaySequence.forEach((item, i) => {
      const t = setTimeout(() => {
        playNote(item.midi);
        setDemoHighlightMidis((prev) => new Set(prev).add(item.midi));
      }, i * NOTE_GAP_MS);
      demoTimeoutsRef.current.push(t);
    });
    const totalMs = startOverlaySequence.length * NOTE_GAP_MS + 400;
    const endTimeout = setTimeout(() => {
      setIsPlayingDemo(false);
      setDemoHighlightMidis(new Set());
    }, totalMs);
    demoTimeoutsRef.current.push(endTimeout);
  };

  // Practice gives live feedback but doesn't count; only Play Now (graded)
  // marks the step done. See attemptMode / handleActivityCompleteChange /
  // the two progress-reporting effects above.
  const handleStartAttempt = (mode: 'practice' | 'graded') => {
    stopDemo();
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
    setAttemptMode(mode);
    setPracticeComplete(false);
    setActivityState('active');
    setStartSignal((value) => value + 1);
    setActivityInstanceId((id) => id + 1);
  };

  if (showMelodySectionCompleteInterstitial) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <div
          className="w-full max-w-2xl rounded-2xl p-6 text-center glass-panel"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--color-accent)',
            boxShadow: 'var(--glass-shadow)',
          }}
        >
          <h1
            className="text-2xl font-semibold"
            style={{ color: 'var(--color-text)' }}
          >
            Melody complete!
          </h1>
          <p
            className="mt-2 text-sm"
            style={{ color: 'var(--color-text-dim)' }}
          >
            Try composing your own melody over generated chords in Studio.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={openMelodyPracticeTrack}
              className="rounded-full px-6 py-2 text-sm font-semibold transition-colors duration-150"
              style={{
                background: 'var(--color-accent)',
                color: '#191919',
              }}
            >
              Open Practice Track
            </button>
            <button
              type="button"
              onClick={handleContinueToChordsSection}
              className="rounded-full px-6 py-2 text-sm font-semibold transition-colors duration-150"
              style={{
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
              }}
            >
              Continue to Chords
            </button>
          </div>
        </div>
      </div>
    );
  }

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

            {isDiatonicMode && (
              <button
                type="button"
                onClick={openChordsPracticeTrack}
                className="rounded-xl px-4 py-3 text-left text-sm font-semibold transition-colors duration-150 glass-panel-sm"
                style={{
                  background: 'rgba(126, 207, 207, 0.1)',
                  border: '1px solid var(--color-accent)',
                  color: 'var(--color-text)',
                }}
              >
                Open Practice Track
                <span
                  className="block text-xs font-normal"
                  style={{ color: 'var(--color-text-dim)' }}
                >
                  Apply the chords you just learned over a generated melody,
                  bass, and beat.
                </span>
              </button>
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
                      LearnRoutes.lesson({
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

  return (
    <div className="flex flex-col gap-4">
      {/* Section navigation tabs */}
      <div
        className="flex gap-2 px-4 py-2"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        {sectionIds.map((sId) => {
          const isActive = sId === currentSectionId;
          const sectionDefs = flowDefinitions.filter((d) => d.section === sId);
          const completedCount = sectionDefs.filter((d) =>
            completedActivityKeys.has(d.key),
          ).length;
          const totalCount = sectionDefs.length;
          const isComplete = completedCount === totalCount && totalCount > 0;

          return (
            <button
              key={sId}
              type="button"
              onClick={() => goToSection(sId)}
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
              {SECTION_LABELS[sId] ?? sId}
              {isComplete && (
                <span style={{ marginLeft: '6px' }}>&#10003;</span>
              )}
              {completedCount > 0 && !isComplete && (
                <span
                  style={{ fontSize: '11px', marginLeft: '6px', opacity: 0.7 }}
                >
                  {Math.round((completedCount / totalCount) * 100)}%
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Overview sub-tabs */}
      {currentSectionId === 'O' && (
        <div
          className="flex gap-2 px-4 py-2"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          {(['scale', 'triads', 'sevenths', 'inversions'] as const).map((t) => {
            const label =
              t === 'scale'
                ? 'Scale'
                : t === 'triads'
                  ? 'Triads'
                  : t === 'sevenths'
                    ? '7th Chords'
                    : 'Inversions';
            const isActive = overviewTab === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setOverviewTab(t)}
                className="glass-panel-sm rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-150"
                style={{
                  background: isActive
                    ? 'rgba(126, 207, 207, 0.12)'
                    : 'rgba(255,255,255,0.03)',
                  border: isActive
                    ? '1px solid var(--color-accent)'
                    : '1px solid var(--color-border)',
                  color: isActive
                    ? 'var(--color-accent)'
                    : 'var(--color-text-dim)',
                  cursor: 'pointer',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      {/* Step progress dots */}
      {currentSectionId !== 'O' && (
        <div className="flex items-center gap-1 px-4 py-1">
          {sectionActivities.map((activity, i) => {
            const isStepDone = completedActivityKeys.has(activity.key);
            const isCurrent = i === currentStepInSection;

            if (isStepDone) {
              return (
                <button
                  key={activity.key}
                  type="button"
                  onClick={() => goToStepInSection(activity)}
                  aria-label={`Go to ${activity.label} — completed`}
                  title={`${activity.label} ✓ Passed`}
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    border: '1.5px solid var(--color-accent)',
                    background: 'rgba(126, 207, 207, 0.13)',
                    color: 'var(--color-accent)',
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
                >
                  &#10003;
                </button>
              );
            }

            return (
              <button
                key={activity.key}
                type="button"
                onClick={() => goToStepInSection(activity)}
                aria-label={`Go to ${activity.label}`}
                title={activity.label}
                style={{
                  width: isCurrent ? '24px' : '16px',
                  height: '6px',
                  borderRadius: '3px',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  background: isCurrent
                    ? 'var(--color-accent)'
                    : 'rgba(255,255,255,0.1)',
                  transition: 'all 0.2s',
                  flexShrink: 0,
                }}
              />
            );
          })}
          <span
            className="ml-2 text-xs"
            style={{ color: 'var(--color-text-dim)' }}
          >
            {currentStepInSection + 1}/{sectionActivities.length}
          </span>
        </div>
      )}

      <div className="relative">
        <div
          className={
            showActivityCompletionOverlay ||
            showStartOverlay ||
            practiceComplete
              ? 'pointer-events-none opacity-30 blur-sm transition duration-300'
              : 'transition duration-300'
          }
        >
          <Component
            key={`${currentActivity.key}-${activityInstanceId}`}
            activityColor={activityColor}
            events={events}
            isActive={activityState === 'active'}
            onContinue={handleContinue}
            onActivityCompleteChange={handleActivityCompleteChange}
            startSignal={startSignal}
            startMessage={direction}
          />
        </div>
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
                {direction}
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
                    startC={startOverlayStartC}
                    endC={startOverlayEndC}
                    playingNotes={
                      isPlayingDemo ? demoPlayingNotes : startOverlayNotes
                    }
                    activeWhiteKeyColor={activityColor}
                    activeBlackKeyColor={activityColor}
                    enableClick={false}
                    useContextNotes={false}
                  />
                </div>
              )}
              <div className="mt-6 flex justify-center gap-3">
                {startOverlaySequence.length > 0 && (
                  <button
                    type="button"
                    onClick={playDemo}
                    disabled={isPlayingDemo}
                    className="rounded-full px-5 py-2 text-sm font-semibold transition-colors duration-150"
                    style={{
                      border: '1px solid var(--color-border)',
                      background: isPlayingDemo
                        ? 'rgba(255,255,255,0.02)'
                        : 'transparent',
                      color: isPlayingDemo
                        ? 'var(--color-text-dim)'
                        : 'var(--color-text)',
                      cursor: isPlayingDemo ? 'default' : 'pointer',
                    }}
                  >
                    {isPlayingDemo ? '◼ Playing...' : '▶ Demo'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleStartAttempt('practice')}
                  className="rounded-full px-6 py-2 text-sm font-semibold transition-colors duration-150"
                  style={{
                    border: '1px solid var(--color-border)',
                    background: 'transparent',
                    color: 'var(--color-text)',
                  }}
                >
                  Practice
                </button>
                <button
                  type="button"
                  onClick={() => handleStartAttempt('graded')}
                  className="rounded-full px-6 py-2 text-sm font-semibold transition-colors duration-150"
                  style={{
                    background: 'var(--color-accent)',
                    color: '#191919',
                  }}
                >
                  Play Now
                </button>
              </div>
            </div>
          </div>
        )}
        {practiceComplete && (
          <div className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center px-4">
            <div
              className="w-full max-w-lg rounded-2xl px-8 py-6 text-center glass-panel"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--color-accent)',
                color: 'var(--color-text)',
              }}
            >
              <h3 className="text-2xl font-semibold">Nice practicing!</h3>
              <p
                className="mt-2 text-sm"
                style={{ color: 'var(--color-text-dim)' }}
              >
                Try it in Play Now to complete this step.
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => beginFreshAttempt('practice')}
                  className="rounded-full px-5 py-2 text-sm font-semibold transition-colors duration-150"
                  style={{
                    border: '1px solid var(--color-border)',
                    background: 'transparent',
                    color: 'var(--color-text)',
                  }}
                >
                  Practice Again
                </button>
                <button
                  type="button"
                  onClick={() => beginFreshAttempt('graded')}
                  className="rounded-full px-6 py-2 text-sm font-semibold transition-colors duration-150"
                  style={{
                    background: 'var(--color-accent)',
                    color: '#191919',
                  }}
                >
                  Play Now
                </button>
              </div>
            </div>
          </div>
        )}
        {showActivityCompletionOverlay && (
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
                {Component === PlayAlong ? 'Nice work!' : 'Great job!'}
              </h3>
              <p
                className="mt-2 text-sm"
                style={{ color: 'var(--color-text-dim)' }}
              >
                {Component === PlayAlong
                  ? 'You finished the play-along. Continue when you are ready, or restart to practice again.'
                  : 'You completed the sequence. Continue when you are ready, or restart to practice again.'}
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
  );
};
