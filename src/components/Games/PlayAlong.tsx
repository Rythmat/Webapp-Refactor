import { useCallback, useEffect, useMemo, useState } from "react";
import { PianoKeyboard } from "@/components/PianoKeyboard";
import type { PlaybackEvent } from "@/contexts/PlaybackContext/helpers";
import { useMidiInput, type MidiNoteEvent } from "@/hooks/music/useMidiInput";
import PianoRoll, { NoteEvent, NoteHoldMeta, pitchNameToMidi } from "./PianoRollPlay";

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

const CHORD_HOLD_REQUIRED_MS = 2000;

type PlayAlongProps = {
  events?: NoteEvent[];
  inTime?: boolean;
};

export const PlayAlong = ({
  events,
  inTime = false,
}: PlayAlongProps) => {
  const resolvedEvents = useMemo(() => events ?? DEFAULT_EVENTS, [events]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeMidis, setActiveMidis] = useState<number[]>([]);
  const [currentChordIndex, setCurrentChordIndex] = useState(0);
  const [completedChords, setCompletedChords] = useState<Set<number>>(
    () => new Set(),
  );
  const [chordHoldStartMs, setChordHoldStartMs] = useState<number | null>(null);
  const [chordHoldProgress, setChordHoldProgress] = useState(0);

  const chords = useMemo(() => {
    const grouped = new Map<number, NoteEvent[]>();
    resolvedEvents.forEach((event) => {
      const collection = grouped.get(event.startTicks);
      if (collection) {
        collection.push(event);
      } else {
        grouped.set(event.startTicks, [event]);
      }
    });
    return Array.from(grouped.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([_, noteEvents]) => noteEvents);
  }, [resolvedEvents]);

  useEffect(() => {
    setCurrentChordIndex(0);
    setCompletedChords(new Set());
    setChordHoldStartMs(null);
    setChordHoldProgress(0);
  }, [chords, inTime]);

  const noteColorByMidi = useMemo(() => {
    const map = new Map<number, string>();
    resolvedEvents.forEach((event) => {
      const midi =
        typeof event.midi === "number"
          ? event.midi
          : pitchNameToMidi(event.pitchName);
      if (typeof midi === "number" && !map.has(midi)) {
        map.set(midi, event.color ?? "#60a5fa");
      }
    });
    return map;
  }, [resolvedEvents]);

  const highlightedNotes = useMemo(
    () =>
      activeMidis.map((midi) => ({
        midi,
        color: noteColorByMidi.get(midi) ?? "#60a5fa",
      })),
    [activeMidis, noteColorByMidi],
  );

  const keyboardPlayingNotes = useMemo<PlaybackEvent[]>(
    () =>
      activeMidis.map((midi) => ({
        id: `kb-${midi}`,
        type: "note",
        midi,
        time: Date.now(),
        duration: Number.POSITIVE_INFINITY,
        velocity: 1,
        color: noteColorByMidi.get(midi) ?? "#60a5fa",
      })),
    [activeMidis, noteColorByMidi],
  );

  const currentChord = chords[currentChordIndex] ?? null;
  const currentChordMidis = useMemo(() => {
    if (!currentChord) return [];
    return currentChord
      .map((note) =>
        typeof note.midi === "number" ? note.midi : pitchNameToMidi(note.pitchName),
      )
      .filter((midi): midi is number => typeof midi === "number");
  }, [currentChord]);

  const isCurrentChordHeld = useMemo(() => {
    if (inTime || !currentChord || currentChordMidis.length === 0) {
      return false;
    }
    return currentChordMidis.every((midi) => activeMidis.includes(midi));
  }, [inTime, currentChord, currentChordMidis, activeMidis]);

  useEffect(() => {
    if (inTime || !currentChord || currentChordMidis.length === 0) {
      setChordHoldStartMs(null);
      setChordHoldProgress(0);
      return;
    }

    if (isCurrentChordHeld) {
      if (chordHoldStartMs === null) {
        setChordHoldStartMs(Date.now());
      } else {
        const elapsed = Date.now() - chordHoldStartMs;
        if (elapsed >= CHORD_HOLD_REQUIRED_MS) {
          setCompletedChords((prev) => {
            const next = new Set(prev);
            next.add(currentChordIndex);
            return next;
          });
          setChordHoldStartMs(null);
          setChordHoldProgress(0);
          setCurrentChordIndex((prev) => Math.min(prev + 1, chords.length));
        }
      }
    } else if (chordHoldStartMs !== null) {
      setChordHoldStartMs(null);
      setChordHoldProgress(0);
    }
  }, [
    inTime,
    currentChord,
    currentChordMidis,
    isCurrentChordHeld,
    chordHoldStartMs,
    currentChordIndex,
    chords.length,
  ]);

  useEffect(() => {
    if (inTime) {
      setChordHoldProgress(0);
      return;
    }
    let raf: number;
    const tick = () => {
      if (chordHoldStartMs !== null) {
        const elapsed = Date.now() - chordHoldStartMs;
        setChordHoldProgress(
          Math.max(0, Math.min(1, elapsed / CHORD_HOLD_REQUIRED_MS)),
        );
      } else {
        setChordHoldProgress(0);
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [inTime, chordHoldStartMs]);

  const handleMidiNoteOn = useCallback(
    (event: MidiNoteEvent) => {
      if (!inTime && currentChordMidis.length > 0) {
        if (!currentChordMidis.includes(event.number)) {
          return;
        }
      }
      setActiveMidis((prev) =>
        prev.includes(event.number) ? prev : [...prev, event.number],
      );
    },
    [inTime, currentChordMidis],
  );

  const handleMidiNoteOff = useCallback((event: MidiNoteEvent) => {
    setActiveMidis((prev) =>
      prev.filter((midi) => midi !== event.number),
    );
  }, []);

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

  const noteHoldMeta = useMemo(() => {
    if (inTime) return undefined;
    const meta: Record<string, NoteHoldMeta> = {};
    chords.forEach((chord, idx) => {
      chord.forEach((note) => {
        const midi =
          typeof note.midi === "number"
            ? note.midi
            : pitchNameToMidi(note.pitchName);
        if (typeof midi !== "number") {
          return;
        }
        const isCompleted = completedChords.has(idx);
        const isCurrent = idx === currentChordIndex;
        const holdProgress =
          isCompleted ? 1 : isCurrent ? chordHoldProgress : 0;
        meta[note.id] = {
          isCompleted,
          isCurrentChord: isCurrent,
          holdProgress,
        };
      });
    });
    return meta;
  }, [inTime, chords, completedChords, currentChordIndex, chordHoldProgress]);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-neutral-800 bg-neutral-950/80 p-4">
        <h2 className="mb-4 text-lg font-semibold text-neutral-100">
          Hold each chord for 2 seconds
        </h2>
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
          noteHoldMeta={noteHoldMeta}
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
          showOctaveStart
        />
      </div>
    </div>
  );
};
