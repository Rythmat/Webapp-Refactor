import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Tone from "tone";
import { PianoKeyboard } from "@/components/PianoKeyboard";
import type { PlaybackEvent } from "@/contexts/PlaybackContext/helpers";
import { useMidiInput, type MidiNoteEvent } from "@/hooks/music/useMidiInput";
import {
  releaseAllPianoNotes,
  startPianoSampler,
  triggerPianoAttack,
  triggerPianoRelease,
} from "@/audio/pianoSampler";
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

const CHORD_HOLD_REQUIRED_MS = 500;
const CHORD_NOTE_COLOR = "#22c55e";
const WRONG_NOTE_COLOR = "#ef4444";
const TICKS_PER_QUARTER = 480;
const TICKS_PER_BAR = TICKS_PER_QUARTER * 4;

type NoteHoldProps = {
  events?: NoteEvent[];
  onActivityCompleteChange?: (isComplete: boolean) => void;
  isActive?: boolean;
  startSignal?: number;
};

export const NoteHold = ({
  events,
  onActivityCompleteChange,
  isActive = true,
  startSignal = 0,
}: NoteHoldProps) => {
  const resolvedEvents = useMemo(() => events ?? DEFAULT_EVENTS, [events]);
  const activeMidiSetRef = useRef(new Set<number>());
  const [activeMidis, setActiveMidis] = useState<number[]>([]);
  const [keyboardPlayingNotes, setKeyboardPlayingNotes] = useState<PlaybackEvent[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentChordIndex, setCurrentChordIndex] = useState(0);
  const [completedChords, setCompletedChords] = useState<Set<number>>(
    () => new Set(),
  );
  const [chordHoldStartMs, setChordHoldStartMs] = useState<number | null>(null);
  const [chordHoldProgress, setChordHoldProgress] = useState(0);
  const hasStartedAudioContextRef = useRef(false);

  const startToneContext = useCallback(async () => {
    if (hasStartedAudioContextRef.current) {
      return;
    }
    try {
      await startPianoSampler();
      hasStartedAudioContextRef.current = true;
    } catch (error) {
      console.warn("Failed to start Tone.js audio context", error);
    }
  }, []);


  const releaseActiveNotes = useCallback(() => {
    void releaseAllPianoNotes();
    activeMidiSetRef.current = new Set<number>();
    setActiveMidis([]);
    setKeyboardPlayingNotes([]);
  }, []);


  // Triggers the on state of the syntheizer with a specified note and a given velocity
  const triggerSynthAttack = useCallback((name: string, velocity?: number) => {
    void triggerPianoAttack(name, velocity, Tone.now());
  }, []);

  // Triggers the off state of the synthesizer for the specified note
  const triggerSynthRelease = useCallback((name: string) => {
    void triggerPianoRelease(name, Tone.now());
  }, []);

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

  const handleMidiNoteOff = useCallback(
    (event: MidiNoteEvent) => {
      if (!isActive) return;
      if (!isPlaying) {
        void startToneContext();
        setIsPlaying(true);
      }
      const midi = event.number;
      if (activeMidiSetRef.current.has(midi)) {
        activeMidiSetRef.current.delete(midi);
        setActiveMidis([...activeMidiSetRef.current]);

        const noteName = Tone.Frequency(midi, "midi").toNote();
        triggerSynthRelease(noteName);
      }

      handleKeyboardNoteOff(midi);
    },
    [isActive, isPlaying, startToneContext, triggerSynthRelease, handleKeyboardNoteOff]
  );


  const handleMidiNoteOn = useCallback(
    (event: MidiNoteEvent) => {
      if (!isActive) return;
      void startPianoSampler();
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
    [handleMidiNoteOff, isActive, triggerSynthAttack,handleKeyboardNoteOn]
  );

  const { startListening, stopListening } = useMidiInput(undefined, {
    onNoteOn: (e) => {
      if (!isActive) return;
      handleMidiNoteOn(e);
    },
    onNoteOff: (e) => {
      if (!isActive) return;
      handleMidiNoteOff(e);
    } 
  });

  useEffect(() => {
    const stop = startListening();
    return () => {
      stop?.();
      stopListening();
    };
  }, [startListening, stopListening]);

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


  useEffect(() => {
    onActivityCompleteChange?.(showChordHoldCompletion);
  }, [onActivityCompleteChange, showChordHoldCompletion]);

  useEffect(() => {
    if (startSignal <= 0) return;
    if (!isActive) return;
    void startToneContext();
    setIsPlaying(true);
  }, [isActive, startSignal, startToneContext]);

  useEffect(() => {
    if (isActive) return;
    setIsPlaying(false);
    releaseActiveNotes();
  }, [isActive, releaseActiveNotes]);

  useEffect(() => {
    return () => {
      releaseActiveNotes();
    };
  }, [releaseActiveNotes]);


  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <div className="rounded-xl border border-neutral-800 bg-neutral-950/80 p-4 transition duration-300">
        <PianoRoll
          events={resolvedEvents}
          bars={requiredBars}
          beatsPerBar={4}
          subdivision={1}
          rowHeight={28 * 18}
          inTime={false}
          playSpeed={80}
          isPlaying={isPlaying}
          onPlayingChange={setIsPlaying}
          activeMidis={activeMidis}
          noteHoldMeta={noteHoldMeta}
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
      </div>
    </div>
  );
};
