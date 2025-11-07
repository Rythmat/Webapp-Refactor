import { useMemo, useState } from "react";
import { PianoKeyboard } from "@/components/PianoKeyboard";
import PianoRoll, { NoteEvent } from "./PianoRollPlay";

const DEFAULT_EVENTS: NoteEvent[] = [
  { id: "e1", pitchName: "A2", startTicks: 0, durationTicks: 1920 },
  { id: "e2", pitchName: "C3", startTicks: 0, durationTicks: 1920 },
  { id: "e3", pitchName: "E3", startTicks: 0, durationTicks: 1920 },
  { id: "e4", pitchName: "G3", startTicks: 0, durationTicks: 1920 },
  { id: "e5", pitchName: "B3", startTicks: 1920, durationTicks: 1920 },
  { id: "e6", pitchName: "E3", startTicks: 1920, durationTicks: 1920 },
  { id: "e7", pitchName: "G3", startTicks: 1920, durationTicks: 1920 },
  { id: "e8", pitchName: "C3", startTicks: 1920, durationTicks: 1920 },
  { id: "e9", pitchName: "A2", startTicks: 3840, durationTicks: 1920 },
  { id: "e10", pitchName: "C3", startTicks: 3840, durationTicks: 1920 },
  { id: "e11", pitchName: "E3", startTicks: 3840, durationTicks: 1920 },
  { id: "e12", pitchName: "G3", startTicks: 3840, durationTicks: 1920 },
  { id: "e13", pitchName: "B3", startTicks: 5760, durationTicks: 1920 },
  { id: "e14", pitchName: "E3", startTicks: 5760, durationTicks: 1920 },
  { id: "e15", pitchName: "G3", startTicks: 5760, durationTicks: 1920 },
  { id: "e16", pitchName: "C3", startTicks: 5760, durationTicks: 1920 },
];

type PlayAlongProps = {
  events?: NoteEvent[];
  inTime?: boolean;
};

export const PlayAlong = ({
  events,
  inTime = true,
}: PlayAlongProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const resolvedEvents = useMemo(() => events ?? DEFAULT_EVENTS, [events]);

  return (
    <div className="space-y-6">
      <PianoRoll
        events={resolvedEvents}
        lanes={[
          "D4",
          "C4",
          "B3",
          "Bb3",
          "A3",
          "Ab3",
          "G3",
          "Gb3",
          "F3",
          "E3",
          "Eb3",
          "D3",
          "Db3",
          "C3",
          "B2",
          "Bb2",
          "A2",
          "Ab2",
        ]}
        bars={4}
        beatsPerBar={4}
        subdivision={1}
        rowHeight={36}
        showChordsTop
        inTime={inTime}
        playSpeed={120}
        isPlaying={isPlaying}
        onPlayingChange={setIsPlaying}
      />

      <div className="rounded-xl border border-neutral-800 bg-neutral-950/80 p-4">
        <PianoKeyboard
          className="mx-auto"
          startC={3}
          endC={5}
          gaming
          showOctaveStart
          activeWhiteKeyColor="#60a5fa"
          activeBlackKeyColor="#3b82f6"
        />
      </div>
    </div>
  );
};
