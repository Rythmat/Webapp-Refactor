import { useCallback, useEffect, useMemo, useRef, useState } from "react";
// import { useQueries } from "@tanstack/react-query";
import * as Tone from "tone";
// import { useMusicAtlas } from "@/contexts/MusicAtlasContext";
import { usePrismStartContours } from "@/hooks/data/prism/usePrismStartContours";
import { NoteHold } from "./NoteHold";
import { PlayAlong } from "./PlayAlong";
import { BoardChoiceGame } from "./BoardChoiceGame";
import { ChordPressGame } from "./ChordPressGame";
import { LessonOverview } from "@/components/learn/LessonOverview";
import type { NoteEvent } from "./PianoRollPlay";
import {    PrismModeSlug, usePrismModeChordsData } from "@/hooks/data";
import { usePrismRhythms } from "@/hooks/data/prism/usePrismRhythms";
import { useNavigate } from "react-router";
import { LearnRoutes, StudioRoutes } from "@/constants/routes";
import { keyLabelToUrlParam } from "@/lib/musicKeyUrl";
import { useMidiInput } from "@/hooks/music/useMidiInput";
import { useAuthToken } from "@/contexts/AuthContext/hooks/useAuthToken";
import { PianoKeyboard } from "@/components/PianoKeyboard";
import type { PlaybackEvent } from "@/contexts/PlaybackContext/helpers";
import { pitchNameToMidi } from "./PianoRollPlay";
import { colorForKeyMode } from "@/lib/modeColorShift";
import { Env } from "@/constants/env";
import { buildActivityInstanceId } from "@/lib/progress/activityInstanceId";
import { selectResumeActivityIndex } from "@/lib/progress/resume";
import { useLessonProgress, useUpdateActivityProgress, useUpdateLessonState } from "@/hooks/data/progress";
type RhythmHit = [number, number];
const chordRhythmFallbacks: Record<string, RhythmHit[]> = {
  "Jazz 1a": [[0, 480], [720, 240], [1440, 480]],
  "Jazz 5": [[0, 240], [480, 120], [600, 120], [720, 120], [840, 120], [1320, 120]],
};

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
type ActivityState = "pending" | "active" | "completed";

const DEFAULT_SCALE: number[] = [60, 62, 64, 65, 67, 69, 71, 72];
const NOTE_DURATION_TICKS = 480;
const CHROMATIC_KEYS = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"] as const;
const START_OVERLAY_NOTE_DURATION_SECONDS = 0.6;

type ActivityDefinition = {
  activityDefId: string;
  activityInstanceId: string;
  key: string;
  label: string;
  Component: (props: FlowActivityProps) => JSX.Element;
  events: NoteEvent[];
  direction: string;
};

const ACTIVITY_FLOW_LESSON_ID = "mode-lesson-flow";
const ACTIVITY_FLOW_LESSON_VERSION = 1;

const ChordLoadingStep: (props: FlowActivityProps) => JSX.Element = ({
  startMessage,
}) => (
  <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-6 text-center">
    <div className="text-sm text-neutral-300">
      {startMessage ?? "Loading chord exercises..."}
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

const midiSequenceToEvents = (sequence: number[] | number[][], prefix: string): NoteEvent[] => {
  return normalizeMidiSequence(sequence).flatMap((group, idx) =>
    group.map((midi, groupIndex) => ({
      id: `${prefix}-${idx}-${groupIndex}-${midi}`,
      pitchName: Tone.Frequency(midi, "midi").toNote(),
      startTicks: idx * NOTE_DURATION_TICKS,
      durationTicks: NOTE_DURATION_TICKS,
    })),
  );
};

const midiSequenceToWholeNotes = (sequence: number[] | number[][], prefix: string): NoteEvent[] => {
  return normalizeMidiSequence(sequence).flatMap((group, idx) =>
    group.map((midi, groupIndex) => ({
      id: `${prefix}-${idx}-${groupIndex}-${midi}`,
      pitchName: Tone.Frequency(midi, "midi").toNote(),
      startTicks: idx * 4 * NOTE_DURATION_TICKS,
      durationTicks: 4 * NOTE_DURATION_TICKS,
    })),
  );
};

const midiSequenceToHalfNotes = (sequence: number[] | number[][], prefix: string): NoteEvent[] => {
  return normalizeMidiSequence(sequence).flatMap((group, idx) => {
    const startTick = 4 * idx * NOTE_DURATION_TICKS;
    const nextStartTick = (4 * idx + 2) * NOTE_DURATION_TICKS;
    return group.flatMap((midi, groupIndex) => [
      {
        id: `${prefix}-${4 * idx}-${groupIndex}-${midi}`,
        pitchName: Tone.Frequency(midi, "midi").toNote(),
        startTicks: startTick,
        durationTicks: NOTE_DURATION_TICKS * 2,
      },
      {
        id: `${prefix}-${4 * idx + 2}-${groupIndex}-${midi}`,
        pitchName: Tone.Frequency(midi, "midi").toNote(),
        startTicks: nextStartTick,
        durationTicks: NOTE_DURATION_TICKS * 2,
      },
    ]);
  });
};

const midiSequenceToQuarterNotes = (sequence: number[] | number[][], prefix: string): NoteEvent[] => {
  return normalizeMidiSequence(sequence).flatMap((group, idx) =>
    group.flatMap((midi, groupIndex) => [
      {
        id: `${prefix}-${4 * idx}-${groupIndex}-${midi}`,
        pitchName: Tone.Frequency(midi, "midi").toNote(),
        startTicks: 4 * idx * NOTE_DURATION_TICKS,
        durationTicks: NOTE_DURATION_TICKS,
      },
      {
        id: `${prefix}-${4 * idx + 1}-${groupIndex}-${midi}`,
        pitchName: Tone.Frequency(midi, "midi").toNote(),
        startTicks: (4 * idx + 1) * NOTE_DURATION_TICKS,
        durationTicks: NOTE_DURATION_TICKS,
      },
      {
        id: `${prefix}-${4 * idx + 2}-${groupIndex}-${midi}`,
        pitchName: Tone.Frequency(midi, "midi").toNote(),
        startTicks: (4 * idx + 2) * NOTE_DURATION_TICKS,
        durationTicks: NOTE_DURATION_TICKS,
      },
      {
        id: `${prefix}-${4 * idx + 3}-${groupIndex}-${midi}`,
        pitchName: Tone.Frequency(midi, "midi").toNote(),
        startTicks: (4 * idx + 3) * NOTE_DURATION_TICKS,
        durationTicks: NOTE_DURATION_TICKS,
      },
    ]),
  );
};

const midiSequenceToEighthNotes = (sequence: number[] | number[][], prefix: string): NoteEvent[] => {
  return normalizeMidiSequence(sequence).flatMap((group, idx) =>
    group.flatMap((midi, groupIndex) => [
      {
        id: `${prefix}-${8 * idx}-${groupIndex}-${midi}`,
        pitchName: Tone.Frequency(midi, "midi").toNote(),
        startTicks: 4 * idx * NOTE_DURATION_TICKS,
        durationTicks: NOTE_DURATION_TICKS * 0.5,
      },
      {
        id: `${prefix}-${8 * idx + 1}-${groupIndex}-${midi}`,
        pitchName: Tone.Frequency(midi, "midi").toNote(),
        startTicks: (4 * idx + 0.5) * NOTE_DURATION_TICKS,
        durationTicks: NOTE_DURATION_TICKS * 0.5,
      },
      {
        id: `${prefix}-${8 * idx + 2}-${groupIndex}-${midi}`,
        pitchName: Tone.Frequency(midi, "midi").toNote(),
        startTicks: (4 * idx + 1) * NOTE_DURATION_TICKS,
        durationTicks: NOTE_DURATION_TICKS * 0.5,
      },
      {
        id: `${prefix}-${8 * idx + 3}-${groupIndex}-${midi}`,
        pitchName: Tone.Frequency(midi, "midi").toNote(),
        startTicks: (4 * idx + 1.5) * NOTE_DURATION_TICKS,
        durationTicks: NOTE_DURATION_TICKS * 0.5,
      },
      {
        id: `${prefix}-${8 * idx + 4}-${groupIndex}-${midi}`,
        pitchName: Tone.Frequency(midi, "midi").toNote(),
        startTicks: (4 * idx + 2) * NOTE_DURATION_TICKS,
        durationTicks: NOTE_DURATION_TICKS * 0.5,
      },
      {
        id: `${prefix}-${8 * idx + 5}-${groupIndex}-${midi}`,
        pitchName: Tone.Frequency(midi, "midi").toNote(),
        startTicks: (4 * idx + 2.5) * NOTE_DURATION_TICKS,
        durationTicks: NOTE_DURATION_TICKS * 0.5,
      },
      {
        id: `${prefix}-${8 * idx + 6}-${groupIndex}-${midi}`,
        pitchName: Tone.Frequency(midi, "midi").toNote(),
        startTicks: (4 * idx + 3) * NOTE_DURATION_TICKS,
        durationTicks: NOTE_DURATION_TICKS * 0.5,
      },
      {
        id: `${prefix}-${8 * idx + 7}-${groupIndex}-${midi}`,
        pitchName: Tone.Frequency(midi, "midi").toNote(),
        startTicks: (4 * idx + 3.5) * NOTE_DURATION_TICKS,
        durationTicks: NOTE_DURATION_TICKS * 0.5,
      },
    ]),
  );
};

const midiSequenceToStoccatoEvents = (sequence: number[] | number[][], prefix: string): NoteEvent[] => {
  return normalizeMidiSequence(sequence).flatMap((group, idx) =>
    group.map((midi, groupIndex) => ({
      id: `${prefix}-${idx}-${groupIndex}-${midi}`,
      pitchName: Tone.Frequency(midi, "midi").toNote(),
      startTicks: idx * NOTE_DURATION_TICKS,
      durationTicks: NOTE_DURATION_TICKS * 0.5,
    })),
  );
};

const midiSequenceToMixedArticulation = (sequence: number[] | number[][], prefix: string): NoteEvent[] => {
  return normalizeMidiSequence(sequence).flatMap((group, idx) =>
    group.map((midi, groupIndex) => ({
      id: `${prefix}-${idx}-${groupIndex}-${midi}`,
      pitchName: Tone.Frequency(midi, "midi").toNote(),
      startTicks: idx * NOTE_DURATION_TICKS,
      durationTicks: (NOTE_DURATION_TICKS * Math.floor(Math.random() * 2 + 1)) / 2,
    })),
  );
};
 
const chordArpegiateEvents = (sequence: number[],prefix: string): NoteEvent[] => {  
  const events: NoteEvent[] = []; 
  sequence.forEach((note, idx) => {
    events.push({
      id: `${prefix}-${idx}-${note}`,
      pitchName: Tone.Frequency(note, "midi").toNote(),
      startTicks: idx * NOTE_DURATION_TICKS,
      durationTicks: NOTE_DURATION_TICKS,
    },
    {
      id: `${prefix}Joined-${idx}-${note}`,
      pitchName: Tone.Frequency(note, "midi").toNote(),
      startTicks: (sequence.length+1) * NOTE_DURATION_TICKS,
      durationTicks: NOTE_DURATION_TICKS*2,
    });
  });
  return events;
};

const isNumberArray = (value: unknown): value is number[] =>
  Array.isArray(value) && value.every((n) => typeof n === "number" && Number.isFinite(n));

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

  if (typeof value === "object") {
    inspectCollection(Object.values(value));
  }

  return results;
};


export const ActivityFlow = ({ scaleMidis, onComplete, labelChange, rootKey, rootMidi, mode, startAtActivityKey }: ActivityFlowProps) => {
  const navigate = useNavigate();
  const authToken = useAuthToken();
  const modeLabel = mode ?? "mode";
  const activityColor = useMemo(() => colorForKeyMode(rootKey, mode), [rootKey, mode]);
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
    return raw.map(arr => arr.map(i => i + rootMidi));
  }, [chordResponse, rootMidi]);

  type RhythmHit = [number, number];
  type RhythmRecord = Record<string, RhythmHit[]>
  const rhythmsQuery = usePrismRhythms();

  const melodyRhythms: RhythmRecord = rhythmsQuery.data?.melodies ?? {};
  const chordRhythms: RhythmRecord = useMemo(
    () => ({
      ...chordRhythmFallbacks,
      ...(rhythmsQuery.data?.chords ?? {}),
    }),
    [rhythmsQuery.data?.chords],
  );

  const pickFallbackChordRhythm = (lengthOf?: number): RhythmHit[] | undefined => {
    const entries = Object.entries(chordRhythmFallbacks);
    if (entries.length === 0) return undefined;
    if (lengthOf) {
      const matching = entries.filter(([, hits]) => hits.length === lengthOf);
      if (matching.length > 0) {
        const pick = matching[Math.floor(Math.random() * matching.length)];
        return pick[1];
      }
    }
    return (
      chordRhythmFallbacks["Jazz 5"] ??
      chordRhythmFallbacks["Jazz 1a"] ??
      entries[0][1]
    );
  };

  const getRhythm = (melOrChord: "melody" | "chord", name?: string, lengthOf?: number  ): RhythmHit[] | undefined => {
    const rhythms = melOrChord === "chord" ? chordRhythms : melodyRhythms;

    if (name) {
      const named = rhythms[name];
      if (named && named.length > 0) return named;
      return melOrChord === "chord" ? pickFallbackChordRhythm(lengthOf) : undefined;
    }

    const keys = lengthOf
      ? Object.entries(rhythms)
          .filter(([, hits]) => hits.length === lengthOf)
          .map(([k]) => k)
      : Object.keys(rhythms);

    if (keys.length === 0) {
      return melOrChord === "chord" ? pickFallbackChordRhythm(lengthOf) : undefined;
    }

    const pick = keys[Math.floor(Math.random() * keys.length)];
    return rhythms[pick];
  }

  const generateStepTriad = (step: number) => {
    const baseChord = triads[step-1];
    return baseChord ? baseChord: undefined;
  }

  const rhythmicMidiSequenceEvents = (sequence: number[],prefix: string, rhythmName?: string): NoteEvent[] => {
    const rhythm = getRhythm("chord",rhythmName,sequence.length);
    const resolvedRhythm = rhythm ?? pickFallbackChordRhythm(sequence.length);
    if (resolvedRhythm == undefined){
      return [];
    } 
    const hits =
      resolvedRhythm.length >= sequence.length
        ? resolvedRhythm
        : sequence.map((_, idx) => resolvedRhythm[idx % resolvedRhythm.length]);
    return sequence.map((midi, idx) => ({
    id: `${prefix}-${idx}-${midi}`,
    pitchName: Tone.Frequency(midi, "midi").toNote(),
    startTicks: hits[idx][0],
    durationTicks: hits[idx][1],
    }));
  }
    
  

  const buildFlowDefinitions = (
    scale: number[],
    contours?: number[][],
    chordTriads: number[][] = [],
    includeChordPlaceholder = false,
  ): ActivityDefinition[] => {
    const scopeId = (id: string) => `${lessonKeyScope}:${id}`;
    const applyActivityColor = (seq: NoteEvent[]) =>
      seq.map((event) => ({
        ...event,
        id: event.id.startsWith(`${lessonKeyScope}:`) ? event.id : scopeId(event.id),
        color: event.color ?? activityColor,
      }));
    const ascending = scale;
    const descending = [...scale].reverse();
    const ascendDescend = [...ascending, ...descending];
    const modeTitle = (mode as string).charAt(0).toUpperCase() + (mode as string).slice(1);
    const chordLabel = `${rootKey} ${modeTitle} Chord`;
    const chordHoldEvents = midiSequenceToEvents(ascending, "chord-hold");
    const overviewItem = {
      key: "lesson-overview",
      label: `${rootKey} ${modeTitle} Overview`,
      Component: ({ onContinue }: FlowActivityProps) => (
        <LessonOverview
          mode={mode as PrismModeSlug}
          rootMidi={rootMidi}
          onStartLesson={onContinue}
        />
      ),
      seq: [] as NoteEvent[],
      direction: `Overview of ${rootKey} ${modeTitle}.`,
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
        .filter((midi): midi is number => typeof midi === "number");

      if (seq.length === 0) return;
      contourSeqs.push(seq);
    });
    const introItems = [
      {
        key: "intro-chord-press",
        label: `${rootKey} ${modeTitle} • Press`,
        Component: ({ onContinue }: FlowActivityProps) => (
          <ChordPressGame
            targetNotes={ascending}
            targetLabel={`${rootKey} ${modeTitle}`}
            onComplete={onContinue}
          />
        ),
        seq: [] as NoteEvent[],
        direction: `Play the ${chordLabel}.`,
      },
      {
        key: "intro-board-choice",
        label: `${rootKey} ${modeTitle} • Choose`,
        Component: ({ onContinue }: FlowActivityProps) => (
          <BoardChoiceGame
            targetNotes={ascending}
            targetLabel={`${rootKey} ${modeTitle}`}
            onComplete={onContinue}
          />
        ),
        seq: [] as NoteEvent[],
        direction: `Pick the keyboard that shows the ${chordLabel}.`,
      },
      {
        key: "intro-chord-hold",
        label: `${rootKey} ${modeTitle} • Hold`,
        Component: NoteHold,
        seq: applyActivityColor(chordHoldEvents),
        direction: `Hold the notes of the ${rootKey} ${modeTitle} scale.`,
      },
    ];
    const randomIntro = introItems.filter((item) => item.key === "intro-chord-hold");

    const sequences = [
      overviewItem,
      ...randomIntro,
      { key: "asc-pa", label: `${rootKey} ${modeTitle} Ascend • Play Along`, Component: PlayAlong, seq: applyActivityColor(midiSequenceToEvents(ascending, "asc-pa")),
        direction: "In a steady tempo, play the notes of the scale going up"
      },
      { key: "desc-nh", label: `${rootKey} ${modeTitle} Descend • Hold`, Component: NoteHold, seq: applyActivityColor(midiSequenceToEvents(descending, "desc-nh")),
        direction: "Play the notes of the scale going down (to the left)."  },
      { key: "desc-pa", label: `${rootKey} ${modeTitle} Descend • Play Along`, Component: PlayAlong, seq: applyActivityColor(midiSequenceToEvents(descending, "desc-pa")),
        direction: "In a steady tempo, play the notes of the scale going down" },
      { key: "ascdesc-nh", label: `${rootKey} ${modeTitle} Ascend + Descend • Hold`, Component: NoteHold, seq: applyActivityColor(midiSequenceToEvents(ascendDescend, "ascdesc-nh")),
        direction: "Play the notes of the scale going up and down." },
      { key: "ascdesc-pa", label: `${rootKey} ${modeTitle} Ascend + Descend • Play Along`, Component: PlayAlong, seq: applyActivityColor(midiSequenceToEvents(ascendDescend, "ascdesc-pa")),
        direction: "In a steady tempo, play the notes of the scale going up and down." },
    ];

    //////////////////ACTIVITIES 2-3 ?4?
    if (contourSeqs[0] && contourSeqs[1]) {
      const combined = [...contourSeqs[0], ...contourSeqs[1]];
      sequences.push(
        {
          key: `contour-1-nh`,
          label: `${rootKey} ${modeTitle} Musical Contour • Hold`,
          Component: NoteHold,
          seq: applyActivityColor(midiSequenceToEvents(contourSeqs[0], `contour-1-nh`)),
          direction: `Play this short melodic phrase in ${rootKey} ${modeTitle}`
        },
        {
          key: `contour-1-pa`,
          label: `${rootKey} ${modeTitle} Musical Contour • Play Along`,
          Component: PlayAlong,
          seq: applyActivityColor(midiSequenceToEvents(contourSeqs[0], `contour-1-pa`)),
          direction: `In a steady tempo, play this short melodic phrase in ${rootKey} ${modeTitle}`
        },
        {
          key: `contour-2-nh`,
          label: `${rootKey} ${modeTitle} Melodic Phrase • Hold`,
          Component: NoteHold,
          seq: applyActivityColor(midiSequenceToEvents(combined, `contour-2-nh`)),
          direction: `Play this longer melodic phrase in ${rootKey} ${modeTitle}`,
        },
        {
          key: `contour-2-pa`,
          label: `${rootKey} ${modeTitle} Melodic Phrase • Play Along`,
          Component: PlayAlong,
          seq: applyActivityColor(midiSequenceToEvents(combined, `contour-2-pa`)),
          direction: `In a steady tempo, play this longer melodic phrase in ${rootKey} ${modeTitle}`,
        },
        {
          key: `contour-1-stac-pa`,
          label: `${rootKey} ${modeTitle} Musical Contour (Staccato) • Play Along`,
          Component: PlayAlong,
          seq: applyActivityColor(midiSequenceToStoccatoEvents(contourSeqs[0], `contour-1-stac-pa`)),
          direction: `In a steady tempo, play this short melodic phrase in ${rootKey} ${modeTitle} with short articulations (“staccato”).`
        },
        {
          key: `contour-1-lega-pa`,
          label: `${rootKey} ${modeTitle} Musical Contour (Legato) • Play Along`,
          Component: PlayAlong,
          seq: applyActivityColor(midiSequenceToEvents(contourSeqs[0], `contour-1-lega-pa`)),
          direction: `In a steady tempo, play this short melodic phrase in ${rootKey} ${modeTitle} with long articulations (“legato”).`
        },
        {
          key: `contour-1-mix-pa`,
          label: `${rootKey} ${modeTitle} Musical Contour (Mixed Articulation) • Play Along`,
          Component: PlayAlong,
          seq: applyActivityColor(midiSequenceToMixedArticulation(contourSeqs[0], `contour-1-mix-pa`)),
          direction: `In a steady tempo, play this short melodic phrase in ${rootKey} ${modeTitle} with mixed articulations (“staccato” and “legato”). `
        },
        {
          key: `contour-2-mix-pa`,
          label: `${rootKey} ${modeTitle} Melodic Phrase (Mixed Articulation) • Play Along`,
          Component: PlayAlong,
          seq: applyActivityColor(midiSequenceToMixedArticulation(combined, `contour-2-mix-pa`)),
          direction: `In a steady tempo, play this longer melodic phrase in ${rootKey} ${modeTitle} with mixed articulations (“staccato” and “legato”).`,
        },
        {
          key: `contour-1-rhythm-pa`,
          label: `${rootKey} ${modeTitle} Musical Contour (Styled) • Play Along`,
          Component: PlayAlong,
          seq: applyActivityColor(rhythmicMidiSequenceEvents(contourSeqs[0], `contour-1-rhythm-pa`)),
          direction: `In a steady tempo, play this short melodic phrase in ${rootKey} ${modeTitle} in a rhythmic style. `
        },
        {
          key: `contour-2-rhythm-pa`,
          label: `${rootKey} ${modeTitle} Melodic Phrase (Styled) • Play Along`,
          Component: PlayAlong,
          seq: applyActivityColor(rhythmicMidiSequenceEvents(combined, `contour-2-rhythm-pa`)),
          direction: `In a steady tempo, play this longer melodic phrase in ${rootKey} ${modeTitle} in a rhythmic style.`,
        },
      );
    }
    /////////// ACTIVITIES FOR 5
    for (let i = 0; i < 4; i++) {
      const chordNotes = generateStepTriad(i+1);
      if (isNumberArray(chordNotes)) {
        sequences.push(
          {
            key: `arpeggiate-${i + 1}-nh`,
            label: `${rootKey} ${modeTitle} ${i + 1} Chord Arpeggio • Hold`,
            Component: NoteHold,
            seq: applyActivityColor(chordArpegiateEvents(
              chordNotes ?? [scale[0], scale[2], scale[4]],
              `arpeggiate-${i + 1}-nh`
            )),
            direction: `Play the notes of the ${i + 1} chord one at a time going up (to the right) and then play the chord.`,
          },
          {
            key: `arpeggiate-${i + 1}-pa`,
            label: `${rootKey} ${modeTitle} ${i + 1} Chord Arpeggio • Play Along`,
            Component: PlayAlong,
            seq: applyActivityColor(chordArpegiateEvents(
              chordNotes ?? [scale[0], scale[2], scale[4]],
              `arpeggiate-${i + 1}-pa`
            )),
            direction:
              "In a steady tempo, play an arpeggio of the chord going up and then play the chord.",
          },
        );
      }
    }
    if(triads.length >4){
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
      const oneToFourChords = [triads[0],triads[1],triads[2],triads[3]];
      sequences.push({
        key: `chords-1-nh`,
        label: `${rootKey} ${modeTitle} Chords • Hold`,
        Component: NoteHold,
        seq: applyActivityColor(midiSequenceToEvents(oneToFourChords, `chords-1-nh`)),
        direction: `Play the notes of the 1 through the four chord for ${rootKey} ${modeTitle}, holding down the notes of each chord as you go.`
      },{
        key: `chords-1-pa`,
        label: `${rootKey} ${modeTitle} Chords (Whole) • Play Along`,
        Component: PlayAlong,
        seq: applyActivityColor(midiSequenceToWholeNotes(oneToFourChords, `chords-1-pa`)),
        direction: `In a steady tempo, play the 1 through the four chord for ${rootKey} ${modeTitle} in whole notes.`,
      },{
        key: `chords-2-pa`,
        label: `${rootKey} ${modeTitle} Chords (Half) • Play Along`,
        Component: PlayAlong,
        seq: applyActivityColor(midiSequenceToHalfNotes(oneToFourChords, `chords-2-pa`)),
        direction: `In a steady tempo, play the 1 through the four chord for ${rootKey} ${modeTitle} in half notes.`,
      },{
        key: `chords-3-pa`,
        label: `${rootKey} ${modeTitle} Chords (Quarter) • Play Along`,
        Component: PlayAlong,
        seq: applyActivityColor(midiSequenceToQuarterNotes(oneToFourChords, `chords-3-pa`)),
        direction: `In a steady tempo, play the 1 through the four chord for ${rootKey} ${modeTitle} in quarter notes.`,
      });
    
    

      //////////ACTIVITES FOR 7
      const indices = [0,1,2,3];
      let shuffled = indices.sort(() => Math.random() - 0.5);
      sequences.push({
        key: `chords-4-pa`,
        label: `${rootKey} ${modeTitle} Two Chords (Staccato) • Play Along`,
        Component: PlayAlong,
        seq: applyActivityColor(midiSequenceToStoccatoEvents([...triads[shuffled[0]],...triads[shuffled[1]]], `chords-4-pa`)),
        direction: `Play chord ${shuffled[0]+1} and ${shuffled[1]+1} in a steady tempo, with short articulations (“staccato”).`
      })
      shuffled = shuffled.sort(() => Math.random() - 0.5);
      sequences.push({
        key: `chords-5-pa`,
        label: `${rootKey} ${modeTitle} Two Chords (Legato) • Play Along`,
        Component: PlayAlong,
        seq: applyActivityColor(midiSequenceToEvents([...triads[shuffled[0]],...triads[shuffled[1]]], `chords-5-pa`)),
        direction: `Play chord ${shuffled[0]+1} and ${shuffled[1]+1} in a steady tempo, with long articulations (“legato”).`
      })

      /////////ACTIVITES FOR 8
      shuffled = shuffled.sort(() => Math.random() - 0.5);
      sequences.push({
        key: `chords-2-nh`,
        label: `${rootKey} ${modeTitle} First Four Chords • Hold`,
        Component: NoteHold,
        seq: applyActivityColor(midiSequenceToEvents([...triads[shuffled[0]],...triads[shuffled[1]],...triads[shuffled[2]],...triads[shuffled[3]]], `chords-2-nh`)),
        direction: `Play the first four chords in a mixed order, holding down each chord one by one.`
      })
      sequences.push({
        key: `chords-7-pa`,
        label: `${rootKey} ${modeTitle} First Four Chords • Play Along`,
        Component: PlayAlong,
        seq: applyActivityColor(midiSequenceToHalfNotes([...triads[shuffled[0]],...triads[shuffled[1]],...triads[shuffled[2]],...triads[shuffled[3]]], `chords-7-pa`)),
        direction: `In a steady tempo, play the first four chords in a mixed order, each chord held for a half note.`
      })
      sequences.push({
        key: `chords-8-pa`,
        label: `${rootKey} ${modeTitle} First Four Chords • Play Along`,
        Component: PlayAlong,
        seq: applyActivityColor(midiSequenceToQuarterNotes([...triads[shuffled[0]],...triads[shuffled[1]],...triads[shuffled[2]],...triads[shuffled[3]]], `chords-8-pa`)),
        direction: `In a steady tempo, play the first four chords in a mixed order, each chord held for a quarter note.`
      })
      sequences.push({
        key: `chords-9-pa`,
        label: `${rootKey} ${modeTitle} First Four Chords • Play Along`,
        Component: PlayAlong,
        seq: applyActivityColor(midiSequenceToEighthNotes([...triads[shuffled[0]],...triads[shuffled[1]],...triads[shuffled[2]],...triads[shuffled[3]]], `chords-9-pa`)),
        direction: `In a steady tempo, play the first four chords in a mixed order, each chord held for a eighth note.`
      })
      shuffled = shuffled.sort(() => Math.random() - 0.5);
      sequences.push({
        key: `chords-6-pa`,
        label: `${rootKey} ${modeTitle} Four Chords (Mixed Articulation) • Play Along`,
        Component: PlayAlong,
        seq: applyActivityColor(midiSequenceToEvents([...triads[shuffled[0]],...triads[shuffled[1]],...triads[shuffled[2]],...triads[shuffled[3]]], `chords-6-pa`)),
        direction: `Play the four chords in a steady tempo, with mixed articulations.`
      })
    }
    if (includeChordPlaceholder && chordTriads.length === 0) {
      sequences.push({
        key: "chords-loading",
        label: `${rootKey} ${modeTitle} Chords • Loading`,
        Component: ChordLoadingStep,
        seq: [] as NoteEvent[],
        direction: "Loading chord exercises...",
      });
    }
    
    return sequences.map(({ key, label, Component, seq, direction }) => ({
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
      direction
    }));
  };
  ////////////// end buildFlowDefinitions ///////////////////

  const randomContours = useMemo(() => {
    if (availableContours.length === 0){
      return [];
    } 
    const shuffled = [...availableContours].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  }, [availableContours]);

  const flowDefinitions = useMemo(() => {
    const scale = scaleMidis && scaleMidis.length > 0 ? scaleMidis : DEFAULT_SCALE;
    return buildFlowDefinitions(
      scale,
      randomContours,
      triads,
      chordsQuery.isPending && triads.length === 0,
    );
  }, [scaleMidis, randomContours, triads, chordsQuery.isPending, activityColor, lessonKeyScope, lessonId, lessonVersion, modeLabel, rootKey]);

  const lessonProgressQuery = useLessonProgress(lessonId, lessonVersion, true);
  const updateActivityProgress = useUpdateActivityProgress();
  const updateLessonState = useUpdateLessonState();
  const resumeAppliedScopeRef = useRef<string | null>(null);
  const completionReportedRef = useRef<Set<string>>(new Set());


  const [currentIndex, setCurrentIndex] = useState(0);
  const [activityInstanceId, setActivityInstanceId] = useState(0);
  const [activityState, setActivityState] = useState<ActivityState>("active");
  const [startSignal, setStartSignal] = useState(0);
  const [startOverlayStep, setStartOverlayStep] = useState(0);
  const [lessonComplete, setLessonComplete] = useState(false);
  const currentActivity = flowDefinitions[currentIndex];
  const lessonProgressScope = `${lessonId}:${lessonVersion}:${lessonKeyScope}`;
  const currentChromaticIndex = useMemo(
    () => CHROMATIC_KEYS.findIndex((key) => key === rootKey),
    [rootKey],
  );
  const nextCurriculumKey = useMemo(() => {
    const safeIndex = currentChromaticIndex >= 0 ? currentChromaticIndex : 0;
    const nextIndex = (safeIndex + 1 + CHROMATIC_KEYS.length) % CHROMATIC_KEYS.length;
    return CHROMATIC_KEYS[nextIndex];
  }, [currentChromaticIndex]);
  const [nextKeyChoice, setNextKeyChoice] = useState<string>(nextCurriculumKey);
  const midiTriggeredRef = useRef(false);
  const isTrackableActivity = currentActivity?.activityDefId !== "lesson-overview";

  const continueCurriculum = useCallback(() => {
    navigate(
      LearnRoutes.lesson({
        mode: modeLabel,
        key: keyLabelToUrlParam(nextCurriculumKey),
      }),
    );
  }, [modeLabel, navigate, nextCurriculumKey]);

  useEffect(() => {
    setCurrentIndex(0);
    setActivityInstanceId(0);
    setActivityState("active");
    setLessonComplete(false);
    setNextKeyChoice(nextCurriculumKey);
    resumeAppliedScopeRef.current = null;
    completionReportedRef.current = new Set();
  }, [mode, rootKey, nextCurriculumKey]);

  useEffect(() => {
    if (flowDefinitions.length === 0) return;
    const explicitStartIndex = startAtActivityKey
      ? flowDefinitions.findIndex(
          (activity) =>
            activity.activityDefId === startAtActivityKey ||
            activity.key === startAtActivityKey,
        )
      : -1;

    if (explicitStartIndex >= 0) {
      resumeAppliedScopeRef.current = lessonProgressScope;
      setLessonComplete(false);
      setCurrentIndex(explicitStartIndex);
      return;
    }

    if (!lessonProgressQuery.data) return;
    if (resumeAppliedScopeRef.current === lessonProgressScope) return;

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
  }, [flowDefinitions, lessonProgressQuery.data, lessonProgressScope, startAtActivityKey]);

  useEffect(() => {
    setActivityState("active");
    if (!currentActivity) {
      setStartSignal(0);
      return;
    }
    const requiresStartOverlay =
      currentActivity.Component === PlayAlong || currentActivity.Component === NoteHold;
    setActivityState(requiresStartOverlay ? "pending" : "active");
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
    if(labelChange){
      if (!currentActivity) return;
      const activityLabel = `Activity ${currentIndex + 1} of ${flowDefinitions.length}`;
      labelChange([currentActivity.label,activityLabel]);
    }
  }, [currentActivity, currentIndex, labelChange, flowDefinitions.length]);

  useEffect(() => {
    if (!currentActivity || lessonComplete) return;
    if (!isTrackableActivity) return;
    updateLessonState.mutate({
      lessonId,
      lessonVersion,
      currentActivityInstanceId: currentActivity.activityInstanceId,
    });
  }, [currentActivity?.activityInstanceId, lessonComplete, lessonId, lessonVersion, isTrackableActivity]);

  useEffect(() => {
    if (!currentActivity || lessonComplete) return;
    if (activityState !== "active") return;
    if (!isTrackableActivity) return;

    updateActivityProgress.mutate({
      activityInstanceId: currentActivity.activityInstanceId,
      lessonId,
      lessonVersion,
      activityDefId: currentActivity.activityDefId,
      mode: modeLabel,
      root: rootKey,
      status: "IN_PROGRESS",
      attemptsDelta: 1,
      resumePayloadJson: {
        activityIndex: currentIndex,
        activityDefId: currentActivity.activityDefId,
      },
    });
  }, [
    activityState,
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
    if (activityState !== "active") return;
    if (!isTrackableActivity) return;

    const intervalId = window.setInterval(() => {
      updateActivityProgress.mutate({
        activityInstanceId: currentActivity.activityInstanceId,
        lessonId,
        lessonVersion,
        activityDefId: currentActivity.activityDefId,
        mode: modeLabel,
        root: rootKey,
        status: "IN_PROGRESS",
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
      if (!completionReportedRef.current.has(currentActivity.activityInstanceId)) {
        completionReportedRef.current.add(currentActivity.activityInstanceId);
        updateActivityProgress.mutate({
          activityInstanceId: currentActivity.activityInstanceId,
          lessonId,
          lessonVersion,
          activityDefId: currentActivity.activityDefId,
          mode: modeLabel,
          root: rootKey,
          status: "COMPLETED",
          resumePayloadJson: {
            activityIndex: currentIndex,
            activityDefId: currentActivity.activityDefId,
            completedVia: "continue",
          },
        });
      }
    }
    if (currentActivity && isTrackableActivity) {
      updateLessonState.mutate({
        lessonId,
        lessonVersion,
        currentActivityInstanceId: null,
      });
    }
    setCurrentIndex((idx) => {
      if (idx < flowDefinitions.length - 1) {
        return idx + 1;
      }
      if (!chordsQuery.isPending) {
        setLessonComplete(true);
        updateLessonState.mutate({
          lessonId,
          lessonVersion,
          currentActivityInstanceId: null,
        });
        onComplete?.();
      }
      return idx;
    });
  }, [
    chordsQuery.isPending,
    currentActivity,
    currentIndex,
    flowDefinitions.length,
    lessonId,
    lessonVersion,
    modeLabel,
    onComplete,
    rootKey,
    isTrackableActivity,
  ]);

  const handleMidiActivity = useCallback(() => {
    if (lessonComplete) {
      if (midiTriggeredRef.current) return;
      midiTriggeredRef.current = true;
      continueCurriculum();
      return;
    }

    if (activityState === "pending") {
      setActivityState("active");
      setStartSignal((value) => value + 1);
      return;
    }

    if (activityState === "completed") {
      handleContinue();
    }
  }, [activityState, continueCurriculum, handleContinue, lessonComplete]);

  const { startListening, stopListening } = useMidiInput(undefined, {
    onNoteOn: handleMidiActivity,
  });

  useEffect(() => {
    const stop = startListening();
    return () => {
      if (typeof stop === "function") {
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
      setActivityState("completed");
      if (!currentActivity) return;
      if (!isTrackableActivity) return;
      if (completionReportedRef.current.has(currentActivity.activityInstanceId)) return;
      completionReportedRef.current.add(currentActivity.activityInstanceId);
      updateActivityProgress.mutate({
        activityInstanceId: currentActivity.activityInstanceId,
        lessonId,
        lessonVersion,
        activityDefId: currentActivity.activityDefId,
        mode: modeLabel,
        root: rootKey,
        status: "COMPLETED",
        resumePayloadJson: {
          activityIndex: currentIndex,
          activityDefId: currentActivity.activityDefId,
        },
      });
      updateLessonState.mutate({
        lessonId,
        lessonVersion,
        currentActivityInstanceId: null,
      });
    },
    [currentActivity, currentIndex, lessonId, lessonVersion, modeLabel, rootKey, isTrackableActivity],
  );

  const handleRestartActivity = () => {
    setStartSignal(0);
    if (usesActivityStartOverlay) {
      setActivityState("pending");
    } else {
      setActivityState("active");
    }
    setActivityInstanceId((id) => id + 1);
  };

  const flushRecentLessonState = useCallback(() => {
    if (!authToken) return;
    if (!currentActivity) return;
    if (!isTrackableActivity) return;
    const apiBase = Env.get("VITE_MUSIC_ATLAS_API_URL", { nullable: true });
    if (!apiBase) return;
    const normalizedBase = apiBase.replace(/\/+$/, "");
    const progressPrefix = normalizedBase.endsWith("/api")
      ? "/progress"
      : "/api/progress";

    const currentActivityInstanceId =
      lessonComplete || activityState === "completed"
        ? null
        : currentActivity.activityInstanceId;

    const lessonStateBody = {
      lessonId,
      lessonVersion,
      currentActivityInstanceId,
    };

    void fetch(`${normalizedBase}${progressPrefix}/lessonState`, {
      method: "PATCH",
      keepalive: true,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(lessonStateBody),
    }).catch(() => {});

    if (activityState === "active" && currentActivity) {
      void fetch(`${normalizedBase}${progressPrefix}/activity`, {
        method: "PATCH",
        keepalive: true,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          activityInstanceId: currentActivity.activityInstanceId,
          lessonId,
          lessonVersion,
          activityDefId: currentActivity.activityDefId,
          mode: modeLabel,
          root: rootKey,
          status: "IN_PROGRESS",
          resumePayloadJson: {
            activityIndex: currentIndex,
            activityDefId: currentActivity.activityDefId,
            flushedAt: Date.now(),
            reason: "page-exit",
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

    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      flushRecentLessonState();
    };
  }, [flushRecentLessonState]);

  if (!currentActivity) {
    return null;
  }

  const { Component, events, direction} = currentActivity;
  const usesActivityCompletionOverlay =
    Component === PlayAlong || Component === NoteHold;
  const usesActivityStartOverlay =
    Component === PlayAlong || Component === NoteHold;
  const showActivityCompletionOverlay =
    usesActivityCompletionOverlay && activityState === "completed";
  const showStartOverlay =
    usesActivityStartOverlay && activityState === "pending";

  const startOverlaySequence = useMemo(
    () =>
      [...events]
        .sort((a, b) => {
          if (a.startTicks !== b.startTicks) {
            return a.startTicks - b.startTicks;
          }
          const aMidi =
            typeof a.midi === "number" ? a.midi : pitchNameToMidi(a.pitchName);
          const bMidi =
            typeof b.midi === "number" ? b.midi : pitchNameToMidi(b.pitchName);
          if (aMidi == null || bMidi == null) {
            return 0;
          }
          return aMidi - bMidi;
        })
        .map((event) => ({
          event,
          midi:
            typeof event.midi === "number"
              ? event.midi
              : pitchNameToMidi(event.pitchName),
        }))
        .filter(
          (item): item is { event: NoteEvent; midi: number } =>
            typeof item.midi === "number",
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
        type: "note",
        midi: item.midi,
        time: now,
        duration: START_OVERLAY_NOTE_DURATION_SECONDS,
        velocity: 1,
        color: item.event.color,
      } satisfies PlaybackEvent,
    ];
  }, [startOverlaySequence, startOverlayStep]);

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

  const handleStartActivity = () => {
    setActivityState("active");
    setStartSignal((value) => value + 1);
  };

  if (lessonComplete) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <div className="w-full max-w-3xl rounded-2xl border border-neutral-800 bg-neutral-900/70 p-6 shadow-xl">
          <div className="flex flex-col items-center gap-2 text-center">
            <h1 className="text-2xl font-semibold">Great work!</h1>
            <p className="text-sm text-neutral-300">
              You completed the {modeLabel} lesson in {rootKey}. How would you like to continue?
            </p>
          </div>
          <div className="mt-6 grid gap-4">
            <button
              type="button"
              onClick={() => navigate(StudioRoutes.root.definition)}
              className="rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-3 text-left text-sm font-semibold text-neutral-100 transition hover:border-neutral-500 hover:bg-neutral-700"
            >
              Go to Studio
            </button>

            <div className="rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-3">
              <div className="mb-2 text-sm font-semibold text-neutral-100">Pick next key center</div>
              <div className="flex flex-wrap gap-2">
                <select
                  value={nextKeyChoice}
                  onChange={(e) => setNextKeyChoice(e.target.value)}
                  className="rounded-md border border-neutral-600 bg-neutral-900 px-3 py-2 text-sm text-neutral-100"
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
                  className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400"
                >
                  Start selected key
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={continueCurriculum}
              className="rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-3 text-left text-sm font-semibold text-neutral-100 transition hover:border-neutral-500 hover:bg-neutral-700"
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
      <div className="relative">
        <div
          className={
            showActivityCompletionOverlay || showStartOverlay
              ? "pointer-events-none opacity-30 blur-sm transition duration-300"
              : "transition duration-300"
          }
        >
          <Component
            key={`${currentActivity.key}-${activityInstanceId}`}
            activityColor={activityColor}
            events={events}
            isActive={activityState === "active"}
            onContinue={handleContinue}
            onActivityCompleteChange={handleActivityCompleteChange}
            startSignal={startSignal}
            startMessage={direction}
          />
        </div>
        {showStartOverlay && (
          <div className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-neutral-950/80 px-4 backdrop-blur">
            <div className="w-full max-w-lg rounded-2xl border border-neutral-700 bg-neutral-900 px-8 py-6 text-center text-neutral-50 shadow-2xl">
              <h3 className="text-2xl font-semibold">Ready to start?</h3>
              <p className="mt-2 text-sm text-neutral-300">{direction}</p>
              {startOverlayNotes.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-xs uppercase tracking-wide text-neutral-400">
                    Note sequence
                  </p>
                  <PianoKeyboard
                    className="mx-auto"
                    startC={startOverlayStartC}
                    endC={startOverlayEndC}
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
                  className="rounded-full bg-emerald-500 px-6 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400"
                >
                  Start
                </button>
              </div>
            </div>
          </div>
        )}
        {showActivityCompletionOverlay && (
          <div className="absolute inset-0 flex items-center justify-center px-4">
            <div className="rounded-2xl border border-neutral-700 bg-neutral-900 px-8 py-6 text-center text-neutral-50 shadow-2xl">
              <h3 className="text-2xl font-semibold">
                {Component === PlayAlong ? "Nice work!" : "Great job!"}
              </h3>
              <p className="mt-2 text-sm text-neutral-300">
                {Component === PlayAlong
                  ? "You finished the play-along. Continue when you are ready, or restart to practice again."
                  : "You completed the sequence. Continue when you are ready, or restart to practice again."}
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <button
                  type="button"
                  onClick={handleContinue}
                  className="rounded-full bg-emerald-500 px-6 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400"
                >
                  Continue
                </button>
                <button
                  type="button"
                  onClick={handleRestartActivity}
                  className="rounded-full border border-neutral-500 px-6 py-2 text-sm font-semibold text-neutral-200 transition hover:border-neutral-300 hover:text-white"
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
