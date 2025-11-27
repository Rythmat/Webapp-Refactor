import { useMemo, useState } from "react";
import * as Tone from "tone";
import { usePrismStartContours } from "@/hooks/data/prism/usePrismStartContours";
import { NoteHold } from "./NoteHold";
import { PlayAlong } from "./PlayAlong";
import type { NoteEvent } from "./PianoRollPlay";

type FlowActivityProps = {
  events: NoteEvent[];
  onContinue?: () => void;
};

type ActivityFlowProps = {
  scaleMidis?: number[];
  onComplete?: () => void;
};

const DEFAULT_SCALE: number[] = [60, 62, 64, 65, 67, 69, 71, 72];
const NOTE_DURATION_TICKS = 480;

type ActivityDefinition = {
  key: string;
  label: string;
  Component: (props: FlowActivityProps) => JSX.Element;
  events: NoteEvent[];
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
        startTicks: sequence.length * NOTE_DURATION_TICKS,
        durationTicks: NOTE_DURATION_TICKS,
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

const buildFlowDefinitions = (
  scale: number[],
  contours?: number[][],
): ActivityDefinition[] => {
  const ascending = scale;
  const descending = [...scale].reverse();
  const ascendDescend = [...ascending, ...descending];

  const sequences = [
    { key: "asc-nh", label: "Ascend • Hold", Component: NoteHold, seq: midiSequenceToEvents(ascending, "asc-nh") },
    { key: "asc-pa", label: "Ascend • Play Along", Component: PlayAlong, seq: midiSequenceToEvents(ascending, "asc-pa") },
    { key: "desc-nh", label: "Descend • Hold", Component: NoteHold, seq: midiSequenceToEvents(descending, "desc-nh") },
    { key: "desc-pa", label: "Descend • Play Along", Component: PlayAlong, seq: midiSequenceToEvents(descending, "desc-pa") },
    { key: "ascdesc-nh", label: "Ascend + Descend • Hold", Component: NoteHold, seq: midiSequenceToEvents(ascendDescend, "ascdesc-nh") },
    { key: "ascdesc-pa", label: "Ascend + Descend • Play Along", Component: PlayAlong, seq: midiSequenceToEvents(ascendDescend, "ascdesc-pa") },
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
        label: `Single Contour • Hold`,
        Component: NoteHold,
        seq: midiSequenceToEvents(contourSeqs[0], `contour-1-nh`),
      },
      {
        key: `contour-1-pa`,
        label: `Single Contour • Play Along`,
        Component: PlayAlong,
        seq: midiSequenceToEvents(contourSeqs[0], `contour-1-pa`),
      },
    );
  }

  if (contourSeqs[0] && contourSeqs[1]) {
    const combined = [...contourSeqs[0], ...contourSeqs[1]];
    sequences.push(
      {
        key: `contour-2-nh`,
        label: `Two Contour • Hold`,
        Component: NoteHold,
        seq: midiSequenceToEvents(combined, `contour-2-nh`),
      },
      {
        key: `contour-2-pa`,
        label: `Two Contour • Play Along`,
        Component: PlayAlong,
        seq: midiSequenceToEvents(combined, `contour-2-pa`),
      },
    );
  }

  sequences.push({
    key: `arpeggiate-1-nh`,
    label: `Chord Arpeggio • Hold`,
    Component: NoteHold,
    seq: chordArpegiateEvents([scale[0], scale[2], scale[4]], `arpeggiate-1-nh`),
  },{
    key: `arpeggiate-1-nh`,
    label: `Chord Arpeggio • Play Along`,
    Component: PlayAlong,
    seq: chordArpegiateEvents([scale[0], scale[2], scale[4]], `arpeggiate-1-pa`),
  });
  return sequences.map(({ key, label, Component, seq }) => ({
    key,
    label,
    Component,
    events: seq,
  }));
};

export const ActivityFlow = ({ scaleMidis, onComplete }: ActivityFlowProps) => {
  const { data: contourData } = usePrismStartContours();
  const availableContours = useMemo(() => {
    const raw = contourData?.contours;
    return extractContours(raw);
  }, [contourData]);

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

  const { Component, events, label } = currentActivity;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between text-sm text-neutral-300">
        <span>
          Activity {currentIndex + 1} of {flowDefinitions.length}
        </span>
        <span className="text-neutral-400">{label}</span>
      </div>
      <Component
        key={currentActivity.key}
        events={events}
        onContinue={handleContinue}
      />
    </div>
  );
};
