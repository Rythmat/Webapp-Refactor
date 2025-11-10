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

const MIDI_NOTE_NAMES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];

const midiToNoteName = (midi: number) => {
  const semitone = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${MIDI_NOTE_NAMES[semitone]}${octave}`;
};

const CHORD_HOLD_DURATION_MS = 2000;
const COMPLETED_COLOR = "#22c55e";

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

  const chords = useMemo(() => {
    const grouped = new Map<number, Set<number>>();
    resolvedEvents.forEach((event) => {
      const midi =
        typeof event.midi === "number"
          ? event.midi
          : pitchNameToMidi(event.pitchName);
      if (typeof midi !== "number") return;
      if (!grouped.has(event.startTicks)) {
        grouped.set(event.startTicks, new Set());
      }
      grouped.get(event.startTicks)!.add(midi);
    });

    return Array.from(grouped.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([startTicks, noteSet], index) => {
        const notes = Array.from(noteSet).sort((a, b) => a - b);
        const name =
          notes.length > 0
            ? notes.map(midiToNoteName).join(" ")
            : `Chord ${index + 1}`;
        return { startTicks, notes, name };
      })
      .filter((chord) => chord.notes.length > 0);
  }, [resolvedEvents]);

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
  const keyboardNoteMapRef = useRef<
    Record<number, { activeId?: string; completedId?: string }>
  >({});

  const [currentChordIndex, setCurrentChordIndex] = useState(0);
  const [completedChords, setCompletedChords] = useState<boolean[]>([]);
  const [showCompletion, setShowCompletion] = useState(false);
  const [chordHoldProgress, setChordHoldProgress] = useState(0);
  const [pianoRollRefreshKey, setPianoRollRefreshKey] = useState(0);

  const chordHoldStartRef = useRef<number | null>(null);
  const activeMidiKeysRef = useRef<Set<number>>(new Set());

  useEffect(
    () => () => {
      Object.values(highlightTimersRef.current).forEach((timerId) =>
        clearTimeout(timerId),
      );
      highlightStateRef.current = {};
      setHighlightedNotes([]);

      keyboardNoteMapRef.current = {};
      setKeyboardPlayingNotes([]);
      completedChords;
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

  const addKeyboardNote = useCallback(
    (midiNumber: number, color: string, role: "active" | "completed") => {
      const entry =
        keyboardNoteMapRef.current[midiNumber] ??
        (keyboardNoteMapRef.current[midiNumber] = {});

      if (role === "active" && entry.activeId) {
        setKeyboardPlayingNotes((prev) =>
          prev.filter((event) => event.id !== entry.activeId),
        );
      }

      if (role === "completed" && entry.completedId) {
        return;
      }

      const id = `${role}-${midiNumber}-${Date.now()}`;
      if (role === "active") {
        entry.activeId = id;
      } else {
        entry.completedId = id;
      }

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

  const removeActiveKeyboardNote = useCallback((midiNumber: number) => {
    const entry = keyboardNoteMapRef.current[midiNumber];
    if (!entry?.activeId) return;
    setKeyboardPlayingNotes((prev) =>
      prev.filter((event) => event.id !== entry.activeId),
    );
    delete entry.activeId;
  }, []);

  const flashKeyboard = useCallback((midiNumber: number, color: string) => {
    const id = `flash-${midiNumber}-${Date.now()}`;
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
    window.setTimeout(() => {
      setKeyboardPlayingNotes((prev) =>
        prev.filter((event) => event.id !== id),
      );
    }, 250);
  }, []);

  const triggerHighlight = useCallback(
    (midiNumber: number) => {
      const color = noteColorByMidi.get(midiNumber) ?? "#60a5fa";
      activateHighlight(midiNumber, color, false, 500);
      flashKeyboard(midiNumber, color);
    },
    [noteColorByMidi, activateHighlight, flashKeyboard],
  );

  const activeChord = chords[currentChordIndex] ?? null;

  const evaluateChordHold = useCallback(() => {
    if (!activeChord || showCompletion) {
      chordHoldStartRef.current = null;
      setChordHoldProgress(0);
      return;
    }

    const activeKeys = activeMidiKeysRef.current;
    const matches =
      activeKeys.size === activeChord.notes.length &&
      activeChord.notes.every((note) => activeKeys.has(note));

    if (matches) {
      if (chordHoldStartRef.current === null) {
        chordHoldStartRef.current = performance.now();
      }
    } else {
      chordHoldStartRef.current = null;
      setChordHoldProgress(0);
    }
  }, [activeChord, showCompletion]);

  const completeChord = useCallback(() => {
    if (!activeChord) return;
    setCompletedChords((prev) => {
      const next = [...prev];
      if (currentChordIndex < next.length) {
        next[currentChordIndex] = true;
      }
      return next;
    });

    activeChord.notes.forEach((note) => {
      deactivateHighlight(note);
      activateHighlight(note, COMPLETED_COLOR, true);
      addKeyboardNote(note, COMPLETED_COLOR, "completed");
      removeActiveKeyboardNote(note);
      activeMidiKeysRef.current.delete(note);
    });

    chordHoldStartRef.current = null;
    setChordHoldProgress(0);

    if (currentChordIndex + 1 < chords.length) {
      setCurrentChordIndex((idx) => idx + 1);
    } else {
      setCurrentChordIndex(chords.length);
      setShowCompletion(true);
    }
    setPianoRollRefreshKey((prev) => prev + 1);
  }, [
    activeChord,
    chords.length,
    currentChordIndex,
    deactivateHighlight,
    activateHighlight,
    addKeyboardNote,
    removeActiveKeyboardNote,
  ]);

  useEffect(() => {
    let raf: number;
    const tick = () => {
      if (chordHoldStartRef.current !== null && activeChord && !showCompletion) {
        const elapsed = performance.now() - chordHoldStartRef.current;
        setChordHoldProgress(
          Math.min(elapsed / CHORD_HOLD_DURATION_MS, 1),
        );
        if (elapsed >= CHORD_HOLD_DURATION_MS) {
          completeChord();
        }
      } else {
        setChordHoldProgress(0);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [completeChord, activeChord, showCompletion]);

  const handleMidiNoteOn = useCallback(
    (event: MidiNoteEvent) => {
      const color = noteColorByMidi.get(event.number) ?? "#60a5fa";
      addKeyboardNote(event.number, color, "active");
      activateHighlight(event.number, color, true);
      activeMidiKeysRef.current.add(event.number);
      evaluateChordHold();
    },
    [
      noteColorByMidi,
      addKeyboardNote,
      activateHighlight,
      evaluateChordHold,
    ],
  );

  const handleMidiNoteOff = useCallback(
    (event: MidiNoteEvent) => {
      removeActiveKeyboardNote(event.number);
      deactivateHighlight(event.number);
      activeMidiKeysRef.current.delete(event.number);
      evaluateChordHold();
    },
    [removeActiveKeyboardNote, deactivateHighlight, evaluateChordHold],
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

  const resetGame = useCallback(() => {
    highlightStateRef.current = {};
    Object.values(highlightTimersRef.current).forEach((timerId) =>
      clearTimeout(timerId),
    );
    highlightTimersRef.current = {};
    setHighlightedNotes([]);

    keyboardNoteMapRef.current = {};
    setKeyboardPlayingNotes([]);

    activeMidiKeysRef.current.clear();
    chordHoldStartRef.current = null;
    setChordHoldProgress(0);
    setCompletedChords(Array(chords.length).fill(false));
    setCurrentChordIndex(0);
    setShowCompletion(false);
  }, [chords.length]);

  useEffect(() => {
    resetGame();
  }, [resetGame]);

  const progressPercent = Math.round(chordHoldProgress * 100);

  return (
    <div className="relative flex flex-col gap-0">
      <div className="rounded-xl border border-neutral-800 bg-neutral-950/80 p-4">
        <h2 className="mb-4 text-lg font-semibold text-neutral-100">
          Hold each chord for 2 seconds
        </h2>

        <PianoRoll
          key={pianoRollRefreshKey}
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

      <div className="px-4 py-3">
        <div className="mb-2 text-sm font-medium text-neutral-300">
          Chord hold progress: {progressPercent}%
        </div>
        <div className="h-2 rounded bg-neutral-800">
          <div
            className="h-full rounded bg-sky-400 transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
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

      {showCompletion && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70">
          <div className="rounded-2xl bg-neutral-900 px-8 py-6 text-center text-neutral-100 shadow-2xl">
            <h3 className="text-2xl font-semibold">All chords complete!</h3>
            <p className="mt-2 text-neutral-300">
              Nice work holding every chord cleanly.
            </p>
            <button
              className="mt-4 rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-white hover:bg-green-400"
              onClick={resetGame}
            >
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
