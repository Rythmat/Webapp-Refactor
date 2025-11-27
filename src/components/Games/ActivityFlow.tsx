import { useMemo, useState } from "react";
import * as Tone from "tone";
import { NoteHold } from "./NoteHold";
import { PlayAlong } from "./PlayAlong";
import type { NoteEvent } from "./PianoRollPlay";

type FlowActivityProps = {
  events: NoteEvent[];
  onContinue?: () => void;
};

type ActivityFlowProps = {
  scaleMidis?: number[];
};

const DEFAULT_SCALE: number[] = [60, 62, 64, 65, 67, 69, 71, 72];
const NOTE_DURATION_TICKS = 480;

type ActivityDefinition = {
  key: string;
  label: string;
  Component: (props: FlowActivityProps) => JSX.Element;
  events: NoteEvent[];
};

const midiSequenceToEvents = (
  sequence: number[],
  prefix: string,
): NoteEvent[] =>
  sequence.map((midi, idx) => ({
    id: `${prefix}-${idx}-${midi}`,
    pitchName: Tone.Frequency(midi, "midi").toNote(),
    startTicks: idx * NOTE_DURATION_TICKS,
    durationTicks: NOTE_DURATION_TICKS,
  }));

const buildFlowDefinitions = (scale: number[]): ActivityDefinition[] => {
  const ascending = scale;
  const descending = [...scale].reverse();
  const ascendDescend = [...ascending, ...descending];

  const sequences = [
    { key: "asc-nh", label: "Ascend • Hold", Component: NoteHold, seq: ascending },
    { key: "asc-pa", label: "Ascend • Play Along", Component: PlayAlong, seq: ascending },
    { key: "desc-nh", label: "Descend • Hold", Component: NoteHold, seq: descending },
    { key: "desc-pa", label: "Descend • Play Along", Component: PlayAlong, seq: descending },
    { key: "ascdesc-nh", label: "Ascend + Descend • Hold", Component: NoteHold, seq: ascendDescend },
    { key: "ascdesc-pa", label: "Ascend + Descend • Play Along", Component: PlayAlong, seq: ascendDescend },
  ];

  return sequences.map(({ key, label, Component, seq }) => ({
    key,
    label,
    Component,
    events: midiSequenceToEvents(seq, key),
  }));
};

export const ActivityFlow = ({ scaleMidis }: ActivityFlowProps) => {
  const flowDefinitions = useMemo(() => {
    const scale = scaleMidis && scaleMidis.length > 0 ? scaleMidis : DEFAULT_SCALE;
    return buildFlowDefinitions(scale);
  }, [scaleMidis]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const currentActivity = flowDefinitions[currentIndex];

  const handleContinue = () => {
    setCurrentIndex((idx) =>
      idx < flowDefinitions.length - 1 ? idx + 1 : idx,
    );
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
