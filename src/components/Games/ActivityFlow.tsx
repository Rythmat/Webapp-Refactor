import { useEffect, useMemo, useState } from "react";
import * as Tone from "tone";
import { usePrismStartContours } from "@/hooks/data/prism/usePrismStartContours";
import { NoteHold } from "./NoteHold";
import { PlayAlong } from "./PlayAlong";
import type { NoteEvent } from "./PianoRollPlay";
import { usePrismModeChords, PrismModeChordMap } from "@/hooks/data";
import { PrismModeSlug } from "@/hooks/data";

type FlowActivityProps = {
  events: NoteEvent[];
  onContinue?: () => void;
  startMessage?: string;
};

type ActivityFlowProps = {
  scaleMidis?: number[];
  onComplete?: () => void;
  labelChange?: (newLabel: string[]) => void;
  rootKey?: string;
  mode?: PrismModeSlug;
};

const DEFAULT_SCALE: number[] = [60, 62, 64, 65, 67, 69, 71, 72];
const NOTE_DURATION_TICKS = 480;

type ActivityDefinition = {
  key: string;
  label: string;
  Component: (props: FlowActivityProps) => JSX.Element;
  events: NoteEvent[];
  direction: string;
};

const midiSequenceToEvents = (sequence: number[],prefix: string): NoteEvent[] =>
  sequence.map((midi, idx) => ({
    id: `${prefix}-${idx}-${midi}`,
    pitchName: Tone.Frequency(midi, "midi").toNote(),
    startTicks: idx * NOTE_DURATION_TICKS,
    durationTicks: NOTE_DURATION_TICKS,
  }));
 
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
        id: `${prefix}Join-${idx}-${note}`,
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


export const ActivityFlow = ({ scaleMidis, onComplete, labelChange, rootKey, mode }: ActivityFlowProps) => {

  const { data: contourData } = usePrismStartContours();
  const availableContours = useMemo(() => {
    const raw = contourData?.contours;
    return extractContours(raw);
  }, [contourData]);

  const { data: chordResponse } = usePrismModeChords(mode);
  const [modeChords, setModeChords] = useState<PrismModeChordMap | null>(null);

  useEffect(() => {
    if (chordResponse?.chords) {
      setModeChords(chordResponse.chords);
    } else {
      setModeChords(null);
    }
  }, [chordResponse]);

  const buildFlowDefinitions = (
  scale: number[],
  contours?: number[][],
): ActivityDefinition[] => {
  const ascending = scale;
  const descending = [...scale].reverse();
  const ascendDescend = [...ascending, ...descending];
  const modeTitle = (mode as string).charAt(0).toUpperCase() + (mode as string).slice(1);
  const sequences = [
    { key: "asc-nh", label: `${rootKey} ${modeTitle} Ascend • Hold`, Component: NoteHold, seq: midiSequenceToEvents(ascending, "asc-nh"),
       direction: "Play the notes of the scale going up (to the right)."  },
    { key: "asc-pa", label: `${rootKey} ${modeTitle} Ascend • Play Along`, Component: PlayAlong, seq: midiSequenceToEvents(ascending, "asc-pa"),
      direction: "In a steady tempo, play the notes of the scale going up"
     },
    { key: "desc-nh", label: `${rootKey} ${modeTitle} Descend • Hold`, Component: NoteHold, seq: midiSequenceToEvents(descending, "desc-nh"),
       direction: "Play the notes of the scale going down (to the left)."  },
    { key: "desc-pa", label: `${rootKey} ${modeTitle} Descend • Play Along`, Component: PlayAlong, seq: midiSequenceToEvents(descending, "desc-pa"),
      direction: "In a steady tempo, play the notes of the scale going down" },
    { key: "ascdesc-nh", label: `${rootKey} ${modeTitle} Ascend + Descend • Hold`, Component: NoteHold, seq: midiSequenceToEvents(ascendDescend, "ascdesc-nh"),
       direction: "Play the notes of the scale going up and down." },
    { key: "ascdesc-pa", label: `${rootKey} ${modeTitle} Ascend + Descend • Play Along`, Component: PlayAlong, seq: midiSequenceToEvents(ascendDescend, "ascdesc-pa"),
       direction: "In a steady tempo, play the notes of the scale going up and down." },
  ];
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
  if (contourSeqs[0]) {
    sequences.push(
      {
        key: `contour-1-nh`,
        label: `$${rootKey} ${modeTitle} Musical Contour • Hold`,
        Component: NoteHold,
        seq: midiSequenceToEvents(contourSeqs[0], `contour-1-nh`),
        direction: `Play this short melodic phrase in ${rootKey} ${modeTitle}`
      },
      {
        key: `contour-1-pa`,
        label: `${rootKey} ${modeTitle} Musical Contour • Play Along`,
        Component: PlayAlong,
        seq: midiSequenceToEvents(contourSeqs[0], `contour-1-pa`),
        direction: `In a steady tempo, play this short melodic phrase in ${rootKey} ${modeTitle}`
      },
    );
  }

  if (contourSeqs[0] && contourSeqs[1]) {
    const combined = [...contourSeqs[0], ...contourSeqs[1]];
    sequences.push(
      {
        key: `contour-2-nh`,
        label: `${rootKey} ${modeTitle} Melodic Phrase • Hold`,
        Component: NoteHold,
        seq: midiSequenceToEvents(combined, `contour-2-nh`),
        direction: `Play this longer melodic phrase in ${rootKey} ${modeTitle}`,
      },
      {
        key: `contour-2-pa`,
        label: `${rootKey} ${modeTitle} Melodic Phrase • Play Along`,
        Component: PlayAlong,
        seq: midiSequenceToEvents(combined, `contour-2-pa`),
        direction: `In a steady tempo, play this longer melodic phrase in ${rootKey} ${modeTitle}`,
      },
    );
  }
  // LOOP OVER CHORDS AND REPEAT FOR FIRST 4
  const chordNames = modeChords
    ? Object.values(modeChords).flatMap((v) => (Array.isArray(v) ? v : []))
    : [];

  for (let i = 0; i < 4; i++) {
    const chordLabel = chordNames[i];
    if (chordLabel) {
      sequences.push(
        {
          key: `arpeggiate-${i + 1}-nh`,
          label: `${rootKey} ${modeTitle} ${i + 1} Chord Arpeggio • Hold`,
          Component: NoteHold,
          seq: chordArpegiateEvents([scale[0], scale[2], scale[4]], `arpeggiate-${i + 1}-nh`),
          direction: `Play the notes of ${chordLabel} one at a time going up (to the right).`,
        },
        {
          key: `arpeggiate-${i + 1}-pa`,
          label: `${rootKey} ${modeTitle} ${i + 1} Chord Arpeggio • Play Along`,
          Component: PlayAlong,
          seq: chordArpegiateEvents([scale[0], scale[2], scale[4]], `arpeggiate-${i + 1}-pa`),
          direction: "In a steady tempo, play an arpeggio of the chord going up and down.",
        },
      );
    }
  }
  
  return sequences.map(({ key, label, Component, seq, direction }) => ({
    key,
    label,
    Component,
    events: seq,
    direction
  }));
};

  const randomContours = useMemo(() => {
    if (availableContours.length === 0){
      return [];
    } 
    const shuffled = [...availableContours].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 2);
  }, [availableContours]);

  const flowDefinitions = useMemo(() => {
    const scale = scaleMidis && scaleMidis.length > 0 ? scaleMidis : DEFAULT_SCALE;
    return buildFlowDefinitions(scale, randomContours);
  }, [scaleMidis, randomContours]);


  const [currentIndex, setCurrentIndex] = useState(0);
  const currentActivity = flowDefinitions[currentIndex];
  useEffect(() => {
    if(labelChange){
      const activityLabel = `Activity ${currentIndex + 1} of ${flowDefinitions.length}`;
      labelChange([currentActivity.label,activityLabel]);
    }
  }, [currentActivity]);

  const handleContinue = () => {
    setCurrentIndex((idx) => {
      if (idx < flowDefinitions.length - 1) {
        return idx + 1;
      }
      onComplete?.();
      return idx;
    });
  };

  if (!currentActivity) {
    return null;
  }

  const { Component, events, direction} = currentActivity;
  
  return (
    <div className="flex flex-col gap-4">
      <Component
        key={currentActivity.key}
        events={events}
        onContinue={handleContinue}
        startMessage={direction}
      />
    </div>
  );
};
