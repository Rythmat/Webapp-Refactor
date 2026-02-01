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
import PianoRoll, { NoteEvent, pitchNameToMidi } from "./PianoRollPlay";

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

const TICKS_PER_QUARTER = 480;
const COUNT_IN_TICKS = 4 * TICKS_PER_QUARTER;
const TICKS_PER_BAR = TICKS_PER_QUARTER * 4;

type PlayAlongProps = {
  events?: NoteEvent[];
  onContinue?: () => void;
  startMessage?:string;
};

type NotePerformance = {
  startTick: number | null;
  endTick: number | null;
};

export const PlayAlong = ({
  events,
  onContinue,
  startMessage,
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
  const activeMidiSetRef = useRef(new Set<number>());
  const [activeMidis, setActiveMidis] = useState<number[]>([]);
  const [keyboardPlayingNotes, setKeyboardPlayingNotes] = useState<PlaybackEvent[]>([]);
  const [currentTick, setCurrentTick] = useState(-COUNT_IN_TICKS);
  const [notePerformance, setNotePerformance] = useState<Record<string, NotePerformance>>({});
  const [playSessionId, setPlaySessionId] = useState(0);
  const lastMetronomeBeatRef = useRef<number | null>(null);
  const lastMetronomeClickAtRef = useRef<number>(-1);
  const hasStartedAudioContextRef = useRef(false);
  const firstMetronomePlayer = useMemo(
    () => new Tone.Player("/sound/firstMetronomeClick.mp3").toDestination(),
    [],
  );
  const metronomePlayer = useMemo(
    () => new Tone.Player("/sound/metronomeClick.mp3").toDestination(),
    [],
  );

  //Current tick reference
  const currentTickRef = useRef(currentTick);
  useEffect(() => {
    currentTickRef.current = currentTick;
  }, [currentTick]);

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

  useEffect(() => {
    return () => {
      for (const p of [firstMetronomePlayer, metronomePlayer]) {
        try {
          // Tone.Source has `state` in many versions ("started"/"stopped")
          if ((p as any).state === "started") {
            p.stop();
          }
        } catch {}
        try {
          p.dispose();
        } catch {}
      }
    };
  }, [firstMetronomePlayer, metronomePlayer]);

  const resetProgress = useCallback(() => {
    activeMidiSetRef.current = new Set<number>();
    setActiveMidis([]);
    setKeyboardPlayingNotes([]);
    setNotePerformance({});
    setCurrentTick(-COUNT_IN_TICKS);
    lastMetronomeBeatRef.current = null;
    void releaseAllPianoNotes();
  }, []);

  const releaseActiveNotes = useCallback(() => {
    void releaseAllPianoNotes();
    activeMidiSetRef.current = new Set<number>();
    setActiveMidis([]);
    setKeyboardPlayingNotes([]);
  }, []);

  const resetInTimeRun = useCallback(() => {
    setNotePerformance({});
    setCurrentTick(-COUNT_IN_TICKS);
    lastMetronomeBeatRef.current = null;
  }, []);

  // Triggers the on state of the syntheizer with a specified note and a given velocity
  const triggerSynthAttack = useCallback((name: string, velocity?: number) => {
    void triggerPianoAttack(name, velocity, Tone.now());
  }, []);

  // Triggers the off state of the synthesizer for the specified note
  const triggerSynthRelease = useCallback((name: string) => {
    void triggerPianoRelease(name, Tone.now());
  }, []);

  const playMetronome = useCallback(
    (isDownbeat: boolean) => {
      if (Tone.getContext().state !== "running") return;
      const player = isDownbeat ? firstMetronomePlayer : metronomePlayer;
      const now = Tone.now();
      // Guard against duplicate same-tick starts (can happen around rerenders/activity transitions).
      if (lastMetronomeClickAtRef.current >= 0 && now - lastMetronomeClickAtRef.current < 0.01) {
        return;
      }
      lastMetronomeClickAtRef.current = now;
      if ((player as any).state === "started") {
        try {
          player.stop(now);
        } catch {}
      }
      player.start(now);
    },
    [firstMetronomePlayer, metronomePlayer],
  );

  useEffect(() => {
    if (!isPlaying) {
      lastMetronomeBeatRef.current = null;
      lastMetronomeClickAtRef.current = -1;
      return;
    }
    if (currentTick < -COUNT_IN_TICKS || currentTick > maxEventEndTick) {
      lastMetronomeBeatRef.current = null;
      lastMetronomeClickAtRef.current = -1;
      return;
    }
    const ticksIntoSession = currentTick + COUNT_IN_TICKS;
    const beatIndex = Math.floor(ticksIntoSession / TICKS_PER_QUARTER);
    if (lastMetronomeBeatRef.current !== beatIndex) {
      lastMetronomeBeatRef.current = beatIndex;
      const beatInBar = beatIndex % 4;
      playMetronome(beatInBar === 0);
    }
  }, [isPlaying, currentTick, maxEventEndTick, playMetronome]);

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
    if (maxEventEndTick <= 0) return 1;
    return Math.max(1, Math.ceil(maxEventEndTick / TICKS_PER_BAR));
  }, [maxEventEndTick]);


  const handleKeyboardNoteOn = useCallback(
    (midi: number) => {
      let color = noteColorByMidi.get(midi) ?? "#60a5fa";
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
    [noteColorByMidi,],
  );

  const handleKeyboardNoteOff = useCallback((midi: number) => {
    setKeyboardPlayingNotes((prev) =>
      prev.filter((event) => event.midi !== midi),
    );
  }, []);






  const showInTimeCompletion = !isPlaying && maxEventEndTick > 0 && currentTick >= maxEventEndTick;

  const showCompletionOverlay = showInTimeCompletion;

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
        if (note == null) return;
        setNotePerformance(prev => {
          const existing = prev[note.id];
          if (existing && existing.startTick != null) {
            return prev;
          }
          return {
            ...prev,
            [note.id]: {
              ...(existing ?? {}),
              startTick: tick,
              endTick: null,
            },
          };
        });
      }else {
        setNotePerformance(prev => {
          for (const note of resolvedEvents) {
            if (pitchNameToMidi(note.pitchName) !== midi) continue;

            const perf = prev[note.id];
            if (!perf) continue;

            if (perf.startTick != null && perf.endTick == null) {
              return {
                ...prev,
                [note.id]: {
                  ...perf,
                  endTick: tick,
                },
              };
            }
          }
          return prev;
        });
      }

    },
    [resolvedEvents]
  );

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
      parsePerformance(event.number,currentTickRef.current,false);
    },
    [triggerSynthRelease,handleKeyboardNoteOff, parsePerformance]
  );


  const handleMidiNoteOn = useCallback(
    (event: MidiNoteEvent) => {
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
      parsePerformance(event.number, currentTickRef.current,true);
    },
    [triggerSynthAttack,handleKeyboardNoteOn, parsePerformance]
  );

  const { startListening, stopListening } = useMidiInput(undefined, {
    onNoteOn: (e) => {
      console.log("[MIDI] NOTE ON", e.number, "vel", e.velocity, "at", currentTickRef.current, "ticks");
      console.log("timestamp:", Date.now(), ', isPlaying is', isPlaying);
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

 

  const performanceMeta = useMemo(() => {
    const meta: Record<string, { startTick: number; endTick?: number }> = {};
    Object.entries(notePerformance).forEach(([id, perf]) => {
      if (perf.startTick == null) return;
      meta[id] = {
        startTick: perf.startTick,
        ...(perf.endTick != null ? { endTick: perf.endTick } : {}),
      };
    });
    return meta;
  }, [notePerformance]);


  const handleContinue = useCallback(() => {
    releaseActiveNotes();
    if (onContinue) {
      onContinue();
    } else {
      resetProgress();
    }
  }, [onContinue, releaseActiveNotes, resetProgress]);

  useEffect(() => {
    const wasPlaying = wasPlayingRef.current;
    if (!wasPlaying && isPlaying) {
      resetInTimeRun();
      setPlaySessionId((id) => id + 1);
      activeMidiSetRef.current = new Set<number>();
      setActiveMidis([]);
      setKeyboardPlayingNotes([]);
    }
    wasPlayingRef.current = isPlaying;
  }, [isPlaying, resetInTimeRun]);

  useEffect(() => {
    if (isPlaying) {
      return;
    }
    void releaseAllPianoNotes();
    activeMidiSetRef.current = new Set<number>();
    setActiveMidis([]);
    setKeyboardPlayingNotes([]);
  }, [isPlaying]);

  useEffect(() => {
    return () => {
      releaseActiveNotes();
    };
  }, [releaseActiveNotes]);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <div
          className={`rounded-xl border border-neutral-800 bg-neutral-950/80 p-4 transition duration-300 ${
            showCompletionOverlay ? "pointer-events-none opacity-30 blur-sm" : ""
          }`}
        >
          <PianoRoll
            key={playSessionId}
            events={resolvedEvents}
            bars={requiredBars}
            beatsPerBar={4}
            subdivision={1}
            rowHeight={28 * 18}
            inTime
            playSpeed={80}
            isPlaying={isPlaying}
            onPlayingChange={setIsPlaying}
            onStart={startToneContext}
            activeMidis={activeMidis}
            performanceMeta={performanceMeta}
            onTickChange={setCurrentTick}
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

    </div>
  );
};
