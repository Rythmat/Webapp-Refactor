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
  const [keyboardPlayingNotes, setKeyboardPlayingNotes] = useState<PlaybackEvent[]>([]);
  const activeKeyboardNoteIds = useRef<Record<number, string>>({});

  useEffect(
    () => () => {
      Object.values(highlightTimers.current).forEach((timerId) =>
        clearTimeout(timerId),
      );
      activeKeyboardNoteIds.current = {};
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
      const existingId = activeKeyboardNoteIds.current[midiNumber];
      if (existingId) {
        setKeyboardPlayingNotes((prev) =>
          prev.filter((event) => event.id !== existingId),
        );
      }

      const id = `playalong-key-${midiNumber}-${Date.now()}`;
      activeKeyboardNoteIds.current[midiNumber] = id;
      const playbackEvent: PlaybackEvent = {
        id,
        type: "note",
        midi: midiNumber,
        time: Date.now(),
        duration: Number.POSITIVE_INFINITY,
        velocity: 1,
        color,
      };
      setKeyboardPlayingNotes((prev) => [...prev, playbackEvent]);
    },
    [],
  );

  const removeKeyboardVisual = useCallback((midiNumber: number) => {
    const activeId = activeKeyboardNoteIds.current[midiNumber];
    if (!activeId) return;
    setKeyboardPlayingNotes((prev) =>
      prev.filter((event) => event.id !== activeId),
    );
    delete activeKeyboardNoteIds.current[midiNumber];
  }, []);

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

  const handleMidiNoteOn = useCallback(
    (event: MidiNoteEvent) => {
      const color = noteColorByMidi.get(event.number) ?? "#b64f4f";
      registerKeyboardVisual(event.number, color);
      triggerHighlight(event.number);
    },
    [noteColorByMidi, registerKeyboardVisual, triggerHighlight],
  );

  const handleMidiNoteOff = useCallback(
    (event: MidiNoteEvent) => {
      removeKeyboardVisual(event.number);
    },
    [removeKeyboardVisual],
  );

  const { startListening, stopListening } = useMidiInput(undefined, {
    onNoteOn: handleMidiNoteOn,
    onNoteOff: handleMidiNoteOff,
  });

  useEffect(() => {
    const stop = startListening();
    return () => {
      stop?.();
      stopListening();
    };
  }, [startListening, stopListening, handleMidiNoteOn]);

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
          showOctaveStart
        />
      </div>
    </div>
  );
};
