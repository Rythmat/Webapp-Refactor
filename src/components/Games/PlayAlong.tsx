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
const ACTIVATION_WINDOW_SHIFT_RATIO = 1 / 8;

type PlayAlongProps = {
  events?: NoteEvent[];
  onActivityCompleteChange?: (isComplete: boolean) => void;
  isActive?: boolean;
  startSignal?: number;
  startMessage?:string;
};

type NotePerformance = {
  startTick: number | null;
  endTick: number | null;
};

export const PlayAlong = ({
  events,
  onActivityCompleteChange,
  isActive = true,
  startSignal = 0,
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
      if (!player.loaded) return;
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
      try {
        player.start(now);
      } catch {
        // Can happen transiently if the player buffer has not loaded yet.
      }
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

  const getActivationWindow = useCallback((note: NoteEvent) => {
    const shift = note.durationTicks * ACTIVATION_WINDOW_SHIFT_RATIO;
    return {
      start: note.startTicks - shift,
      end: note.startTicks + note.durationTicks - shift,
    };
  }, []);

  // Updates the note performance record for the appropriate event, given the incoming midi signal, the current time tick, and a boolean for if the signal is on or off
  const parsePerformance = useCallback(
    (midi: number, tick: number ,onSignal: boolean) => {
      if(onSignal){
        const note = resolvedEvents.find(
        (note) =>
          pitchNameToMidi(note.pitchName) === midi &&
          tick >= getActivationWindow(note).start &&
          tick < getActivationWindow(note).end
        );
        if (note == null) return;
        const normalizedStartTick = Math.max(tick, note.startTicks);
        setNotePerformance(prev => {
          const existing = prev[note.id];
          if (existing && existing.startTick != null) {
            return prev;
          }
          return {
            ...prev,
            [note.id]: {
              ...(existing ?? {}),
              startTick: normalizedStartTick,
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
    [resolvedEvents, getActivationWindow]
  );

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
      parsePerformance(event.number,currentTickRef.current,false);
    },
    [isActive, isPlaying, startToneContext, triggerSynthRelease, handleKeyboardNoteOff, parsePerformance]
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
      parsePerformance(event.number, currentTickRef.current,true);
    },
    [handleMidiNoteOff, isActive, triggerSynthAttack,handleKeyboardNoteOn, parsePerformance]
  );

  const { startListening, stopListening } = useMidiInput(undefined, {
    onNoteOn: (e) => {
      if (!isActive) return;
      console.log("[MIDI] NOTE ON", e.number, "vel", e.velocity, "at", currentTickRef.current, "ticks");
      console.log("timestamp:", Date.now(), ', isPlaying is', isPlaying);
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


  useEffect(() => {
    onActivityCompleteChange?.(showInTimeCompletion);
  }, [onActivityCompleteChange, showInTimeCompletion]);

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
        <div className="rounded-xl border border-neutral-800 bg-neutral-950/80 p-4 transition duration-300">
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
            activeMidis={activeMidis}
            performanceMeta={performanceMeta}
            onTickChange={setCurrentTick}
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
