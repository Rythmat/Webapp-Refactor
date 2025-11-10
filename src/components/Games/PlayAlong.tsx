import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PianoKeyboard } from "@/components/PianoKeyboard";
import type { PlaybackEvent } from "@/contexts/PlaybackContext/helpers";
import { useMidiInput, type MidiNoteEvent } from "@/hooks/music/useMidiInput";
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
  const [keyboardPlayingNotes, setKeyboardPlayingNotes] = useState<
    PlaybackEvent[]
  >([]);
  const keyboardNoteTimers = useRef<Record<string, number>>({});

  useEffect(
    () => () => {
      Object.values(highlightTimers.current).forEach((timerId) =>
        clearTimeout(timerId),
      );
      Object.values(keyboardNoteTimers.current).forEach((timerId) =>
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

  const registerKeyboardVisual = useCallback(
    (midiNumber: number, color: string) => {
      const id = `playalong-key-${midiNumber}-${Date.now()}`;
      const playbackEvent: PlaybackEvent = {
        id,
        type: "note",
        midi: midiNumber,
        time: Date.now(),
        duration: 0.5,
        velocity: 1,
        color,
      };
      setKeyboardPlayingNotes((prev) => [...prev, playbackEvent]);
      keyboardNoteTimers.current[id] = window.setTimeout(() => {
        setKeyboardPlayingNotes((prev) =>
          prev.filter((event) => event.id !== id),
        );
        delete keyboardNoteTimers.current[id];
      }, 500);
    },
    [],
  );

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

      registerKeyboardVisual(midiNumber, color);
    },
    [noteColorByMidi, registerKeyboardVisual],
  );

  const handleMidiInput = useCallback(
    (event: MidiNoteEvent) => {
      triggerHighlight(event.number);
    },
    [triggerHighlight],
  );

  const { startListening, stopListening } = useMidiInput(handleMidiInput);

  useEffect(() => {
    const stop = startListening();
    return () => {
      stop?.();
      stopListening();
    };
  }, [startListening, stopListening, handleMidiInput]);

  return (
    <div className="flex flex-col gap-0">
      <div className="rounded-xl border border-neutral-800 bg-neutral-950/80 p-4">
        <PianoRoll
          events={resolvedEvents}
          bars={4}
          beatsPerBar={4}
        subdivision={1}
        rowHeight={28}
          showChordsTop
          inTime={inTime}
          playSpeed={120}
          isPlaying={isPlaying}
          onPlayingChange={setIsPlaying}
          highlightedNotes={highlightedNotes}
        />
      </div>

      <div className="rounded-xl border border-neutral-800 bg-neutral-950/80 p-4">
        <PianoKeyboard
          className="mx-auto"
          startC={2}
          endC={6}
          playingNotes={keyboardPlayingNotes}
          activeWhiteKeyColor="#60a5fa"
          activeBlackKeyColor="#3b82f6"
          onKeyClick={triggerHighlight}
          onMidiInput={handleMidiInput}
          showOctaveStart
        />
      </div>
    </div>
  );
};
