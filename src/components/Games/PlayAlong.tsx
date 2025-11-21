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

const CHORD_HOLD_REQUIRED_MS = 2000;
const CHORD_NOTE_COLOR = "#22c55e";
const WRONG_NOTE_COLOR = "#ef4444";
const TICKS_PER_QUARTER = 480;
const COUNT_IN_TICKS = 4 * TICKS_PER_QUARTER;

type PlayAlongProps = {
  events?: NoteEvent[];
  inTime?: boolean;
  onContinue?: () => void;
};

type NotePerformance = {
  startTick: number | null;
  endTick: number | null;
};

export const PlayAlong = ({
  events,
  inTime = true,
  onContinue,
}: PlayAlongProps) => {
  const resolvedEvents = useMemo(() => events ?? DEFAULT_EVENTS, [events]);
  const maxEventEndTick = useMemo(
    () =>
      resolvedEvents.length > 0
        ? resolvedEvents.reduce(
            (max, ev) => Math.max(max, ev.startTicks + ev.durationTicks),
            0,
          )
        : 0,
    [resolvedEvents],
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const wasPlayingRef = useRef(false);
  const [activeMidis, setActiveMidis] = useState<number[]>([]);
  const activeMidiSetRef = useRef(new Set<number>());
  const [keyboardPlayingNotes, setKeyboardPlayingNotes] = useState<PlaybackEvent[]>([]);
  const [currentChordIndex, setCurrentChordIndex] = useState(0);
  const [completedChords, setCompletedChords] = useState<Set<number>>(
    () => new Set(),
  );
  const [chordHoldStartMs, setChordHoldStartMs] = useState<number | null>(null);
  const [chordHoldProgress, setChordHoldProgress] = useState(0);
  const [currentTick, setCurrentTick] = useState(-COUNT_IN_TICKS);
  const [notePerformance, setNotePerformance] = useState<Record<string, NotePerformance>>({});
  const activeMidiCountsRef = useRef<Map<number, number>>(new Map());
  const lastCountInBeatRef = useRef<number | null>(null);
  const getSynth = useSynth();


  const resetProgress = useCallback(() => {
    setCurrentChordIndex(0);
    setCompletedChords(new Set());
    setChordHoldStartMs(null);
    setChordHoldProgress(0);
    setActiveMidis([]);
    setKeyboardPlayingNotes([]);
    setNotePerformance({});
    setCurrentTick(-COUNT_IN_TICKS);
    lastCountInBeatRef.current = null;
    activeMidiCountsRef.current.clear();
    const synth = getSynth();
    synth?.releaseAll();
  }, [getSynth]);

  const resetInTimeRun = useCallback(() => {
    setNotePerformance({});
    setCurrentTick(-COUNT_IN_TICKS);
    lastCountInBeatRef.current = null;
  }, []);

  // Triggers the on state of the syntheizer with a specified note and a given velocity
  const triggerSynthAttack = useCallback(
    (name: string, velocity?: number) => {
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

  const playCountInClick = useCallback(() => {
    const synth = getSynth();
    if (!synth) return;
    if (Tone.getContext().state !== "running") {
      Tone.start().catch(() => undefined);
    }
    const frequency = Tone.Frequency(84, "midi").toFrequency();
    synth.triggerAttackRelease(frequency, "16n", Tone.now(), 0.7);
  }, [getSynth]);

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
    if (!inTime || !isPlaying) {
      lastCountInBeatRef.current = null;
      return;
    }
    if (currentTick >= 0 || currentTick < -COUNT_IN_TICKS) {
      lastCountInBeatRef.current = null;
      return;
    }
    const ticksIntoCountIn = currentTick + COUNT_IN_TICKS;
    const beatIndex = Math.floor(ticksIntoCountIn / TICKS_PER_QUARTER);
    if (lastCountInBeatRef.current !== beatIndex) {
      lastCountInBeatRef.current = beatIndex;
      playCountInClick();
    }
  }, [inTime, isPlaying, currentTick, playCountInClick]);

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

  // const noteById = useMemo(() => {
  //   const map = new Map<string, NoteEvent>();
  //   resolvedEvents.forEach((note) => map.set(note.id, note));
  //   return map;
  // }, [resolvedEvents]);

  // const chordStartTicks = useMemo(
  //   () => chords.map((chord) => chord[0]?.startTicks ?? 0),
  //   [chords],
  // );

  // const currentChordIndexInTime = useMemo(() => {
  //   if (!inTime || chords.length === 0) {
  //     return null;
  //   }
  //   const songTick = currentTick;
  //   if (songTick < 0) {
  //     return null;
  //   }
  //   for (let i = 0; i < chordStartTicks.length - 1; i++) {
  //     const start = chordStartTicks[i];
  //     const nextStart = chordStartTicks[i + 1];
  //     if (songTick >= start && songTick < nextStart) {
  //       return i;
  //     }
  //   }
  //   const lastIndex = chordStartTicks.length - 1;
  //   if (songTick >= (chordStartTicks[lastIndex] ?? 0)) {
  //     return lastIndex;
  //   }
  //   return null;
  // }, [inTime, chords.length, chordStartTicks, currentTick]);

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

const showChordHoldCompletion =
    !inTime && chords.length > 0 && completedChords.size >= chords.length;

  const showInTimeCompletion =
    inTime && !isPlaying && maxEventEndTick > 0 && currentTick >= maxEventEndTick;

  const showCompletionOverlay = showChordHoldCompletion || showInTimeCompletion;

  // Updates the note performance record for the appropriate event, given the incoming midi signal, the current time tick, and a boolean for if the signal is on or off
  const parsePerformance = useCallback(
    (midi: number, tick: number ,onSignal: boolean) => {
      if(onSignal){
        const note = resolvedEvents.find(
        (note) =>
          pitchNameToMidi(note.pitchName) === midi &&
          note.startTicks <= tick &&
          note.startTicks + note.durationTicks >= tick
      );
      if (!note) return;
      const noteId = note.id;
        if(noteId in notePerformance){
          return;
        }else{
          setNotePerformance((prev) => ({
            ...prev,
            [noteId]: {
              ...prev[noteId],
              startTick: tick,
            },
          }));
        }
      }else{
        for(const note of resolvedEvents){
          if(pitchNameToMidi(note.pitchName)!==midi){
            return;
          }
          if(notePerformance[note.id].startTick != null && notePerformance[note.id].endTick == null){
            setNotePerformance((prev) => ({
              ...prev,
              [note.id]: {
                ...prev[note.id],
                endTick: tick,
              },
            }));
          }
        }
      }

    },
    [resolvedEvents, notePerformance]
  );

  const handleMidiNoteOff = useCallback(
    (event: MidiNoteEvent) => {
      const midi = event.number;
      if (activeMidiSetRef.current.has(midi)) {
        activeMidiSetRef.current.delete(midi);

        const noteName = Tone.Frequency(midi, "midi").toNote();
        triggerSynthRelease(noteName);
      }

      setActiveMidis(Array.from(activeMidiSetRef.current));
      handleKeyboardNoteOff(midi);
      if(inTime){
        parsePerformance(event.number,currentTick,false);
      }
    },
    [triggerSynthRelease,handleKeyboardNoteOff, parsePerformance, currentTick, inTime]
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

        const noteName = Tone.Frequency(midi, "midi").toNote();
        triggerSynthAttack(noteName, event.velocity);
      }
      setActiveMidis(Array.from(activeMidiSetRef.current));
      handleKeyboardNoteOn(midi);
      if(inTime){
        parsePerformance(event.number, currentTick,true);
      }
    },
    [triggerSynthAttack,handleKeyboardNoteOn, parsePerformance, currentTick, inTime]
  );

  const { startListening, stopListening } = useMidiInput(undefined, {
    onNoteOn: (e) => {
      console.log("[MIDI] NOTE ON", e.number, "vel", e.velocity)
      handleMidiNoteOn(e);
    },
    onNoteOff: (e) => {
      console.log("[MIDI] NOTE OFF", e.number, "vel", e.velocity)
      handleMidiNoteOff(e);
    } 
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

  const performanceMeta = useMemo(() => {
    if (!inTime) return undefined;
    const meta: Record<string, { startTick: number; endTick?: number }> = {};
    Object.entries(notePerformance).forEach(([id, perf]) => {
      if (perf.startTick == null) return;
      meta[id] = {
        startTick: perf.startTick,
        ...(perf.endTick != null ? { endTick: perf.endTick } : {}),
      };
    });
    return meta;
  }, [inTime, notePerformance]);


  const handleContinue = useCallback(() => {
    if (onContinue) {
      onContinue();
    } else {
      resetProgress();
    }
  }, [onContinue, resetProgress]);

  useEffect(() => {
    const wasPlaying = wasPlayingRef.current;
    if (!wasPlaying && isPlaying && inTime) {
      resetInTimeRun();
    }
    wasPlayingRef.current = isPlaying;
  }, [isPlaying, inTime, resetInTimeRun]);

  useEffect(() => {
    if (isPlaying) {
      return;
    }
    const synth = getSynth();
    synth?.releaseAll();
    setActiveMidis([]);
    setKeyboardPlayingNotes([]);
    activeMidiCountsRef.current.clear();
  }, [isPlaying, getSynth]);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <div
          className={`rounded-xl border border-neutral-800 bg-neutral-950/80 p-4 transition duration-300 ${
            showCompletionOverlay ? "pointer-events-none opacity-30 blur-sm" : ""
          }`}
        >
          <h2 className="mb-4 text-lg font-semibold text-neutral-100">
            {inTime ? "Play along with the moving notes" : "Hold each chord for 2 seconds"}
          </h2>
          <PianoRoll
            events={resolvedEvents}
            bars={4}
            beatsPerBar={4}
            subdivision={1}
            rowHeight={28 * 24}
            inTime={inTime}
            playSpeed={80}
            isPlaying={isPlaying}
            onPlayingChange={setIsPlaying}
            activeMidis={activeMidis}
            noteHoldMeta={noteHoldMeta}
            performanceMeta={performanceMeta}
            onTickChange={setCurrentTick}
          />
        </div>
        {showCompletionOverlay && (
          <div className="absolute inset-0 flex items-center justify-center px-4">
            <div className="rounded-2xl border border-neutral-700 bg-neutral-900 px-8 py-6 text-center text-neutral-50 shadow-2xl">
              <h3 className="text-2xl font-semibold">
                {showInTimeCompletion ? "Nice work!" : "Great job!"}
              </h3>
              <p className="mt-2 text-sm text-neutral-300">
                {showInTimeCompletion
                  ? "You finished the play-along. Continue when you are ready, or restart to practice again."
                  : "You completed every chord. Continue when you are ready, or restart to practice again."}
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
