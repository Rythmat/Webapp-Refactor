import { useCallback, useEffect, useMemo, useState } from "react";
import * as Tone from "tone";
import { PianoKeyboard } from "@/components/PianoKeyboard";
import type { PlaybackEvent } from "@/contexts/PlaybackContext/helpers";
import { useMidiInput, type MidiNoteEvent } from "@/hooks/music/useMidiInput";
import { useSynth } from "@/hooks/useSynth";
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
const CHORD_NOTE_COLOR = "#22c55e";
const WRONG_NOTE_COLOR = "#ef4444";

type PlayAlongProps = {
  events?: NoteEvent[];
  inTime?: boolean;
  onContinue?: () => void;
};

export const PlayAlong = ({
  events,
  inTime = false,
  onContinue,
}: PlayAlongProps) => {
  const resolvedEvents = useMemo(() => events ?? DEFAULT_EVENTS, [events]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeMidis, setActiveMidis] = useState<number[]>([]);
  const [keyboardPlayingNotes, setKeyboardPlayingNotes] = useState<PlaybackEvent[]>([]);
  const [currentChordIndex, setCurrentChordIndex] = useState(0);
  const [completedChords, setCompletedChords] = useState<Set<number>>(
    () => new Set(),
  );
  const [chordHoldStartMs, setChordHoldStartMs] = useState<number | null>(null);
  const [chordHoldProgress, setChordHoldProgress] = useState(0);
  const getSynth = useSynth();

  const resetProgress = useCallback(() => {
    setCurrentChordIndex(0);
    setCompletedChords(new Set());
    setChordHoldStartMs(null);
    setChordHoldProgress(0);
    setActiveMidis([]);
    setKeyboardPlayingNotes([]);
    const synth = getSynth();
    synth?.releaseAll();
  }, [getSynth]);

  const triggerSynthAttack = useCallback(
    (midi: number, velocity?: number) => {
      const synth = getSynth();
      if (!synth) {
        return;
      }
      if (Tone.getContext().state !== "running") {
        Tone.start().catch(() => undefined);
      }
      const normalizedVelocity =
        typeof velocity === "number"
          ? Math.max(0, Math.min(1, velocity / 127))
          : 0.8;
      const frequency = Tone.Frequency(midi, "midi").toFrequency();
      synth.triggerAttack(frequency, Tone.now(), normalizedVelocity || 0.8);
    },
    [getSynth],
  );

  const triggerSynthRelease = useCallback(
    (midi: number) => {
      const synth = getSynth();
      if (!synth) {
        return;
      }
      const frequency = Tone.Frequency(midi, "midi").toFrequency();
      synth.triggerRelease(frequency, Tone.now());
    },
    [getSynth],
  );

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
    resetProgress();
  }, [chords, inTime, resetProgress]);

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

  const currentChord = chords[currentChordIndex] ?? null;
  const currentChordMidis = useMemo(() => {
    if (!currentChord) return [];
    return currentChord
      .map((note) =>
        typeof note.midi === "number" ? note.midi : pitchNameToMidi(note.pitchName),
      )
      .filter((midi): midi is number => typeof midi === "number");
  }, [currentChord]);

  const highlightedNotes = useMemo(
    () =>
      activeMidis.map((midi) => {
        let color = noteColorByMidi.get(midi) ?? "#60a5fa";
        if (!inTime && currentChordMidis.length > 0) {
          const isChordNote = currentChordMidis.includes(midi);
          color = isChordNote ? CHORD_NOTE_COLOR : WRONG_NOTE_COLOR;
        }
        return { midi, color };
      }),
    [activeMidis, noteColorByMidi, inTime, currentChordMidis],
  );

  const isCurrentChordHeld = useMemo(() => {
    if (inTime || !currentChord || currentChordMidis.length === 0) {
      return false;
    }

    const allChordNotesHeld = currentChordMidis.every((midi) =>
      activeMidis.includes(midi),
    );
    if (!allChordNotesHeld) return false;

    const noExtraNotes = activeMidis.every((midi) =>
      currentChordMidis.includes(midi),
    );
    return noExtraNotes;
  }, [inTime, currentChord, currentChordMidis, activeMidis]);

  const handleKeyboardNoteOn = useCallback(
    (midi: number) => {
      let color = noteColorByMidi.get(midi) ?? "#60a5fa";
      if (!inTime && currentChordMidis.length > 0) {
        const isChordNote = currentChordMidis.includes(midi);
        color = isChordNote ? CHORD_NOTE_COLOR : WRONG_NOTE_COLOR;
      }
      const id = `keyboard-${midi}`;
      setKeyboardPlayingNotes((prev) => [
        ...prev.filter((event) => event.midi !== midi),
        {
          id,
          type: "note",
          midi,
          time: Date.now(),
          duration: Number.POSITIVE_INFINITY,
          velocity: 1,
          color,
        },
      ]);
    },
    [noteColorByMidi, inTime, currentChordMidis],
  );

  const handleKeyboardNoteOff = useCallback((midi: number) => {
    setKeyboardPlayingNotes((prev) =>
      prev.filter((event) => event.midi !== midi),
    );
  }, []);

  useEffect(() => {
    if (inTime || !currentChord || currentChordMidis.length === 0) {
      setChordHoldStartMs(null);
      setChordHoldProgress(0);
      return;
    }

    if (isCurrentChordHeld) {
      if (chordHoldStartMs === null) {
        setChordHoldStartMs(Date.now());
      } else if (chordHoldProgress >= 1) {
        setCompletedChords((prev) => {
          const next = new Set(prev);
          next.add(currentChordIndex);
          return next;
        });
        setChordHoldStartMs(null);
        setChordHoldProgress(0);
        setCurrentChordIndex((prev) => Math.min(prev + 1, chords.length));
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
    chordHoldProgress,
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
      setActiveMidis((prev) =>
        prev.includes(event.number) ? prev : [...prev, event.number],
      );
      handleKeyboardNoteOn(event.number);
      triggerSynthAttack(event.number, event.velocity);
    },
    [handleKeyboardNoteOn, triggerSynthAttack],
  );

  const handleMidiNoteOff = useCallback(
    (event: MidiNoteEvent) => {
      setActiveMidis((prev) =>
        prev.filter((midi) => midi !== event.number),
      );
      handleKeyboardNoteOff(event.number);
      triggerSynthRelease(event.number);
    },
    [handleKeyboardNoteOff, triggerSynthRelease],
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
        const isHeld =
          !inTime && (isCompleted || (isCurrent && activeMidis.includes(midi)));
        meta[note.id] = {
          isCompleted,
          isCurrentChord: isCurrent,
          holdProgress,
          isHeld,
        };
      });
    });
    return meta;
  }, [
    inTime,
    chords,
    completedChords,
    currentChordIndex,
    chordHoldProgress,
    activeMidis,
  ]);

  const showCompletionOverlay =
    !inTime && chords.length > 0 && completedChords.size >= chords.length;

  const handleContinue = useCallback(() => {
    if (onContinue) {
      onContinue();
    } else {
      resetProgress();
    }
  }, [onContinue, resetProgress]);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <div
          className={`rounded-xl border border-neutral-800 bg-neutral-950/80 p-4 transition duration-300 ${
            showCompletionOverlay ? "pointer-events-none opacity-30 blur-sm" : ""
          }`}
        >
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
        {showCompletionOverlay && (
          <div className="absolute inset-0 flex items-center justify-center px-4">
            <div className="rounded-2xl border border-neutral-700 bg-neutral-900 px-8 py-6 text-center text-neutral-50 shadow-2xl">
              <h3 className="text-2xl font-semibold">Great job!</h3>
              <p className="mt-2 text-sm text-neutral-300">
                You completed every chord. Continue when you are ready, or restart to
                practice again.
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
                  onClick={resetProgress}
                  className="rounded-full border border-neutral-500 px-6 py-2 text-sm font-semibold text-neutral-200 transition hover:border-neutral-300 hover:text-white"
                >
                  Restart
                </button>
              </div>
            </div>
          </div>
        )}
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
