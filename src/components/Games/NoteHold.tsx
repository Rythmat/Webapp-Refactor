import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Tone from "tone";
import { PianoKeyboard } from "@/components/PianoKeyboard";
import type { PlaybackEvent } from "@/contexts/PlaybackContext/helpers";
import { useMidiInput, type MidiNoteEvent } from "@/hooks/music/useMidiInput";
import { useSynth } from "@/hooks/useSynth";
import PianoRoll, { NoteEvent, NoteHoldMeta, pitchNameToMidi } from "./PianoRollPlay";

const DEFAULT_EVENTS: NoteEvent[] = [
  { id: "e1", pitchName: "C3", startTicks: 0, durationTicks: 1920 },
  { id: "e2", pitchName: "E3", startTicks: 0, durationTicks: 1920 },
  { id: "e3", pitchName: "G3", startTicks: 0, durationTicks: 1920 },
  { id: "e4", pitchName: "B3", startTicks: 0, durationTicks: 1920 },
  { id: "e5", pitchName: "C3", startTicks: 1920, durationTicks: 1920 },
  { id: "e6", pitchName: "E3", startTicks: 1920, durationTicks: 1920 },
  { id: "e7", pitchName: "G3", startTicks: 1920, durationTicks: 1920 },
  { id: "e8", pitchName: "A#3", startTicks: 1920, durationTicks: 1920 },
  { id: "e9", pitchName: "C#3", startTicks: 3840, durationTicks: 1920 },
  { id: "e10", pitchName: "F3", startTicks: 3840, durationTicks: 1920 },
  { id: "e11", pitchName: "G#3", startTicks: 3840, durationTicks: 1920 },
  { id: "e12", pitchName: "C4", startTicks: 3840, durationTicks: 1920 },
  { id: "e13", pitchName: "C#3", startTicks: 5760, durationTicks: 1920 },
  { id: "e14", pitchName: "F3", startTicks: 5760, durationTicks: 1920 },
  { id: "e15", pitchName: "G#3", startTicks: 5760, durationTicks: 1920 },
  { id: "e16", pitchName: "B3", startTicks: 5760, durationTicks: 1920 },
];

const CHORD_HOLD_REQUIRED_MS = 1000;
const CHORD_NOTE_COLOR = "#22c55e";
const WRONG_NOTE_COLOR = "#ef4444";
const TICKS_PER_QUARTER = 480;
const TICKS_PER_BAR = TICKS_PER_QUARTER * 4;

type NoteHoldProps = {
  events?: NoteEvent[];
  onContinue?: () => void;
  startMessage?: string;
};

export const NoteHold = ({
  events,
  onContinue,
  startMessage,
}: NoteHoldProps) => {
  const resolvedEvents = useMemo(() => events ?? DEFAULT_EVENTS, [events]);
  const activeMidiSetRef = useRef(new Set<number>());
  const [activeMidis, setActiveMidis] = useState<number[]>([]);
  const [keyboardPlayingNotes, setKeyboardPlayingNotes] = useState<PlaybackEvent[]>([]);
  const [currentChordIndex, setCurrentChordIndex] = useState(0);
  const [completedChords, setCompletedChords] = useState<Set<number>>(
    () => new Set(),
  );
  const [chordHoldStartMs, setChordHoldStartMs] = useState<number | null>(null);
  const [chordHoldProgress, setChordHoldProgress] = useState(0);
  const getSynth = useSynth();
  const hasStartedAudioContextRef = useRef(false);

  const startToneContext = useCallback(async () => {
    if (hasStartedAudioContextRef.current) {
      return;
    }
    if (Tone.getContext().state === "running") {
      hasStartedAudioContextRef.current = true;
      return;
    }
    try {
      await Tone.start();
      hasStartedAudioContextRef.current = true;
    } catch (error) {
      console.warn("Failed to start Tone.js audio context", error);
    }
  }, []);


  const resetProgress = useCallback(() => {
    setCurrentChordIndex(0);
    setCompletedChords(new Set());
    setChordHoldStartMs(null);
    setChordHoldProgress(0);
    activeMidiSetRef.current = new Set<number>();
    setActiveMidis([]);
    setKeyboardPlayingNotes([]);
    const synth = getSynth();
    synth?.releaseAll();
  }, [getSynth]);


  // Triggers the on state of the syntheizer with a specified note and a given velocity
  const triggerSynthAttack = useCallback(
    (name: string, velocity?: number) => {
      const synth = getSynth();
      // if (!synth || Tone.getContext().state !== "running") {
      //   return;
      // }
      const normalizedVelocity =
        typeof velocity === "number"
          ? Math.max(0, Math.min(1, velocity / 127))
          : 0.8;
      synth.triggerAttack(name, Tone.now(), normalizedVelocity || 0.8);
    },
    [getSynth],
  );

  // Triggers the off state of the synthesizer for the specified note
  const triggerSynthRelease = useCallback(
    (name: string) => {
      const synth = getSynth();
      if (!synth) {
        return;
      }
      synth.triggerRelease(name, Tone.now());
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

  const requiredBars = useMemo(() => {
    const maxEnd = resolvedEvents.reduce(
      (max, ev) => Math.max(max, ev.startTicks + ev.durationTicks),
      0,
    );
    if (maxEnd <= 0) return 1;
    return Math.max(1, Math.ceil(maxEnd / TICKS_PER_BAR));
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

  const isCurrentChordHeld = useMemo(() => {
    if (!currentChord || currentChordMidis.length === 0) {
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
  }, [ currentChord, currentChordMidis, activeMidis]);

  const handleKeyboardNoteOn = useCallback(
    (midi: number) => {
      const isChordNote = currentChordMidis.includes(midi);
      const color = isChordNote ? CHORD_NOTE_COLOR : noteColorByMidi.get(midi) ?? WRONG_NOTE_COLOR;

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
    [currentChordMidis, noteColorByMidi],
  );

  const handleKeyboardNoteOff = useCallback((midi: number) => {
    setKeyboardPlayingNotes((prev) =>
      prev.filter((event) => event.midi !== midi),
    );
  }, []);

  useEffect(() => {
    if (!currentChord || currentChordMidis.length === 0) {
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
        setCurrentChordIndex((prev) =>
          Math.min(prev + 1, Math.max(0, chords.length - 1)),
        );
      }
    } else if (chordHoldStartMs !== null) {
      setChordHoldStartMs(null);
      setChordHoldProgress(0);
    }
  }, [ currentChord, currentChordMidis, isCurrentChordHeld, chordHoldStartMs, chordHoldProgress, currentChordIndex,chords.length ]);

  useEffect(() => {
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
  }, [ chordHoldStartMs]);

  useEffect(() => {
    // Reset the visible progress when moving to the next chord
    setChordHoldProgress(0);
    setChordHoldStartMs(null);
  }, [currentChordIndex]);

const showChordHoldCompletion = chords.length > 0 && completedChords.size >= chords.length;

  const showCompletionOverlay = showChordHoldCompletion;

  const handleMidiNoteOff = useCallback(
    (event: MidiNoteEvent) => {
      const midi = event.number;
      if (activeMidiSetRef.current.has(midi)) {
        activeMidiSetRef.current.delete(midi);
        setActiveMidis([...activeMidiSetRef.current]);

        const noteName = Tone.Frequency(midi, "midi").toNote();
        triggerSynthRelease(noteName);
      }

      handleKeyboardNoteOff(midi);
    },
    [triggerSynthRelease,handleKeyboardNoteOff]
  );


  const handleMidiNoteOn = useCallback(
    (event: MidiNoteEvent) => {
      const midi = event.number;
      if(event.velocity == 0){
        handleMidiNoteOff(event);
        return;
      }
      if (!activeMidiSetRef.current.has(midi)) {
        activeMidiSetRef.current.add(midi);
        setActiveMidis([...activeMidiSetRef.current]);

        const noteName = Tone.Frequency(midi, "midi").toNote();
        triggerSynthAttack(noteName, event.velocity);
      }
      handleKeyboardNoteOn(midi);
    },
    [triggerSynthAttack,handleKeyboardNoteOn]
  );

  const { startListening, stopListening } = useMidiInput(undefined, {
    onNoteOn: (e) => {
      handleMidiNoteOn(e);
    },
    onNoteOff: (e) => {
      handleMidiNoteOff(e);
    } 
  });

  useEffect(() => {
    const stop = startListening();
    return () => {
      stop?.();
      stopListening();
    };
  }, []);

  const noteHoldMeta = useMemo(() => {
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
        const isHeld = (isCompleted || (isCurrent && activeMidis.includes(midi)));
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
    chords,
    completedChords,
    currentChordIndex,
    chordHoldProgress,
    activeMidis,
  ]);


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
        <PianoRoll
          events={resolvedEvents}
          bars={requiredBars}
          beatsPerBar={4}
          subdivision={1}
          rowHeight={28 * 18}
          inTime={false}
          playSpeed={80}
          onStart={startToneContext}
          activeMidis={activeMidis}
          noteHoldMeta={noteHoldMeta}
          startMessage={startMessage}
        />
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
        {showCompletionOverlay && (
          <div className="absolute inset-0 flex items-center justify-center px-4">
            <div className="rounded-2xl border border-neutral-700 bg-neutral-900 px-8 py-6 text-center text-neutral-50 shadow-2xl">
              <h3 className="text-2xl font-semibold">
                {"Great job!"}
              </h3>
              <p className="mt-2 text-sm text-neutral-300">
                { "You completed the sequence. Continue when you are ready, or restart to practice again."}
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
    </div>
  );
};
