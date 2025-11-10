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
  const highlightStateRef = useRef<
    Record<number, { color: string; persistent: boolean }>
  >({});
  const highlightTimersRef = useRef<Record<number, number>>({});

  const [keyboardPlayingNotes, setKeyboardPlayingNotes] = useState<
    PlaybackEvent[]
  >([]);
  const keyboardNoteMapRef = useRef<Record<number, string>>({});

  useEffect(
    () => () => {
      Object.values(highlightTimersRef.current).forEach((timerId) =>
        clearTimeout(timerId),
      );
      highlightStateRef.current = {};
      setHighlightedNotes([]);

      keyboardNoteMapRef.current = {};
      setKeyboardPlayingNotes([]);
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

  const syncHighlightedNotes = useCallback(() => {
    const entries = Object.entries(highlightStateRef.current).map(
      ([midi, entry]) => ({
        midi: Number(midi),
        color: entry.color,
      }),
    );
    setHighlightedNotes(entries);
  }, []);

  const activateHighlight = useCallback(
    (
      midiNumber: number,
      color: string,
      persistent: boolean,
      transientDurationMs = 500,
    ) => {
      highlightStateRef.current[midiNumber] = { color, persistent };
      syncHighlightedNotes();

      if (!persistent) {
        if (highlightTimersRef.current[midiNumber]) {
          clearTimeout(highlightTimersRef.current[midiNumber]);
        }
        highlightTimersRef.current[midiNumber] = window.setTimeout(() => {
          const entry = highlightStateRef.current[midiNumber];
          if (entry && !entry.persistent) {
            delete highlightStateRef.current[midiNumber];
            syncHighlightedNotes();
          }
          delete highlightTimersRef.current[midiNumber];
        }, transientDurationMs);
      }
    },
    [syncHighlightedNotes],
  );

  const deactivateHighlight = useCallback(
    (midiNumber: number) => {
      const entry = highlightStateRef.current[midiNumber];
      if (!entry) return;
      if (highlightTimersRef.current[midiNumber]) {
        clearTimeout(highlightTimersRef.current[midiNumber]);
        delete highlightTimersRef.current[midiNumber];
      }
      delete highlightStateRef.current[midiNumber];
      syncHighlightedNotes();
    },
    [syncHighlightedNotes],
  );

  const registerKeyboardVisual = useCallback((midiNumber: number, color: string) => {
    const existingId = keyboardNoteMapRef.current[midiNumber];
    if (existingId) {
      setKeyboardPlayingNotes((prev) =>
        prev.filter((event) => event.id !== existingId),
      );
    }

    const id = `keyboard-${midiNumber}-${Date.now()}`;
    keyboardNoteMapRef.current[midiNumber] = id;
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
  }, []);

  const removeKeyboardVisual = useCallback((midiNumber: number) => {
    const existingId = keyboardNoteMapRef.current[midiNumber];
    if (!existingId) return;
    setKeyboardPlayingNotes((prev) =>
      prev.filter((event) => event.id !== existingId),
    );
    delete keyboardNoteMapRef.current[midiNumber];
  }, []);

  const triggerHighlight = useCallback(
    (midiNumber: number) => {
      const color = noteColorByMidi.get(midiNumber) ?? "#b64f4f";
      activateHighlight(midiNumber, color, false, 500);
    },
    [noteColorByMidi, activateHighlight],
  );

  const handleMidiNoteOn = useCallback(
    (event: MidiNoteEvent) => {
      const color = noteColorByMidi.get(event.number) ?? "#b64f4f";
      registerKeyboardVisual(event.number, color);
      activateHighlight(event.number, color, true);
    },
    [noteColorByMidi, registerKeyboardVisual, activateHighlight],
  );

  const handleMidiNoteOff = useCallback(
    (event: MidiNoteEvent) => {
      removeKeyboardVisual(event.number);
      deactivateHighlight(event.number);
    },
    [removeKeyboardVisual, deactivateHighlight],
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
  }, [startListening, stopListening, handleMidiNoteOn, handleMidiNoteOff]);

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
