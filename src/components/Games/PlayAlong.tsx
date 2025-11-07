import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PianoKeyboard } from "@/components/PianoKeyboard";
import type { MidiNoteEvent } from "@/hooks/music/useMidiInput";
import PianoRoll, { NoteEvent, pitchNameToMidi } from "./PianoRollPlay";

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
  const [highlightedNotes, setHighlightedNotes] = useState<
    Array<{ midi: number; color: string }>
  >([]);
  const highlightTimers = useRef<Record<number, number>>({});

  useEffect(
    () => () => {
      Object.values(highlightTimers.current).forEach((timerId) =>
        clearTimeout(timerId),
      );
    },
    [],
  );

  const noteColorByMidi = useMemo(() => {
    const map = new Map<number, string>();
    resolvedEvents.forEach((event) => {
      const midi =
        typeof event.midi === "number"
          ? event.midi
          : pitchNameToMidi(event.pitchName);
      if (typeof midi === "number" && !map.has(midi)) {
        map.set(midi, event.color ?? "#b64f4f");
      }
    });
    return map;
  }, [resolvedEvents]);

  const triggerHighlight = useCallback(
    (midiNumber: number) => {
      const color = noteColorByMidi.get(midiNumber) ?? "#b64f4f";
      setHighlightedNotes((prev) => {
        const filtered = prev.filter((entry) => entry.midi !== midiNumber);
        return [...filtered, { midi: midiNumber, color }];
      });

      if (highlightTimers.current[midiNumber]) {
        clearTimeout(highlightTimers.current[midiNumber]);
      }

      highlightTimers.current[midiNumber] = window.setTimeout(() => {
        setHighlightedNotes((prev) =>
          prev.filter((entry) => entry.midi !== midiNumber),
        );
        delete highlightTimers.current[midiNumber];
      }, 500);
    },
    [noteColorByMidi],
  );

  const handleMidiInput = useCallback(
    (event: MidiNoteEvent) => {
      triggerHighlight(event.number);
    },
    [triggerHighlight],
  );

  return (
    <div className="flex flex-col gap-4">
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
        highlightedNotes={highlightedNotes}
      />

      <div className="rounded-xl border border-neutral-800 bg-neutral-950/80 p-4">
        <PianoKeyboard
          className="mx-auto"
          startC={1}
          endC={7}
          activeWhiteKeyColor="#60a5fa"
          activeBlackKeyColor="#3b82f6"
          onKeyClick={triggerHighlight}
          onMidiInput={handleMidiInput}
        />
      </div>
    </div>
  );
};
