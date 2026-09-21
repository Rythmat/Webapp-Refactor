import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Tone from 'tone';
import {
  releaseAllPianoNotes,
  startPianoSampler,
  triggerPianoAttack,
  triggerPianoRelease,
} from '@/audio/pianoSampler';
import { PianoKeyboard } from '@/components/PianoKeyboard';
import type { PlaybackEvent } from '@/contexts/PlaybackContext/helpers';
import GenrePianoRoll from '@/curriculum/components/GenrePianoRoll';
import type { LessonChordSymbol } from '@/curriculum/notation/lessonChordSymbols';
import type { MidiNoteEvent } from '@/hooks/music/useMidiInput';
import { playClick, resetClickSpacing } from '@/learn/audio/metronomeClick';
import { playGuideNote } from '@/learn/audio/practiceGuide';
import { usePracticeSettings } from '@/learn/audio/usePracticeSettings';
import { LessonVolumeDial } from '@/learn/components/LessonVolumeDial';
import { PracticeControls } from '@/learn/components/PracticeControls';
import { useLearnInputStable } from '@/learn/context/LearnInputContext';
import { ArcadeGameHeader } from './ArcadeGameHeader';
import {
  NoteEvent,
  pitchNameToMidi,
  THEORY_ACTIVITY_BPM,
} from './PianoRollPlay';
import { useWrongNoteFlash, WrongNoteFlash } from './WrongNoteFlash';
import {
  activationWindow,
  dueMidisAt,
  nextTargets,
  WRONG_KEY_COLOR,
} from './liveFeedback';
import { gradePlayAlong, type PlayAlongResult } from './playAlongGrade';

const DEFAULT_EVENTS: NoteEvent[] = [
  { id: 'e1', pitchName: 'C3', startTicks: 0, durationTicks: 1920 },
  { id: 'e2', pitchName: 'E3', startTicks: 0, durationTicks: 1920 },
  { id: 'e3', pitchName: 'G3', startTicks: 0, durationTicks: 1920 },
  { id: 'e4', pitchName: 'B3', startTicks: 0, durationTicks: 1920 },
  { id: 'e5', pitchName: 'C3', startTicks: 1920, durationTicks: 1920 },
  { id: 'e6', pitchName: 'E3', startTicks: 1920, durationTicks: 1920 },
  { id: 'e7', pitchName: 'G3', startTicks: 1920, durationTicks: 1920 },
  { id: 'e8', pitchName: 'A#3', startTicks: 1920, durationTicks: 1920 },
  { id: 'e9', pitchName: 'C#3', startTicks: 3840, durationTicks: 1920 },
  { id: 'e10', pitchName: 'F3', startTicks: 3840, durationTicks: 1920 },
  { id: 'e11', pitchName: 'G#3', startTicks: 3840, durationTicks: 1920 },
  { id: 'e12', pitchName: 'C4', startTicks: 3840, durationTicks: 1920 },
  { id: 'e13', pitchName: 'C#3', startTicks: 5760, durationTicks: 1920 },
  { id: 'e14', pitchName: 'F3', startTicks: 5760, durationTicks: 1920 },
  { id: 'e15', pitchName: 'G#3', startTicks: 5760, durationTicks: 1920 },
  { id: 'e16', pitchName: 'B3', startTicks: 5760, durationTicks: 1920 },
];

const TICKS_PER_QUARTER = 480;
const COUNT_IN_TICKS = 4 * TICKS_PER_QUARTER;
const TICKS_PER_BAR = TICKS_PER_QUARTER * 4;
const midiOfNote = (note: NoteEvent) =>
  typeof note.midi === 'number' ? note.midi : pitchNameToMidi(note.pitchName);

type PlayAlongProps = {
  events?: NoteEvent[];
  /** Called with `true` only when a run passes (see playAlongGrade). */
  onActivityCompleteChange?: (isComplete: boolean) => void;
  /** Called at the end of every run, pass or fail, with its score. */
  onRunGraded?: (result: PlayAlongResult) => void;
  activityColor?: string;
  isActive?: boolean;
  startSignal?: number;
  startMessage?: string;
  arcade?: boolean;
  /** Tint every target note on the keyboard (Practice mode scaffolding). */
  showTargetKeys?: boolean;
  /** Chord symbols above the staff in notation view; chord activities only. */
  chordSymbols?: readonly LessonChordSymbol[];
  /**
   * Sound the target notes as the playhead reaches them (Practice mode). Off in
   * Play Now, where the student proves the notes unaided.
   */
  playTargetNotes?: boolean;
  /** Lesson spelling map, passed through to the piano roll's lane labels. */
  noteSpelling?: Map<number, string>;
};

type NotePerformance = {
  startTick: number | null;
  endTick: number | null;
};

/** A played pitch that isn't a target; endTick stays null while it's held. */
type WrongNote = {
  midi: number;
  onset: number;
  endTick: number | null;
};

export const PlayAlong = ({
  events,
  onActivityCompleteChange,
  onRunGraded,
  activityColor = '#60a5fa',
  isActive = true,
  startSignal = 0,
  arcade = false,
  showTargetKeys = false,
  chordSymbols,
  playTargetNotes = false,
  noteSpelling,
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
  const [keyboardPlayingNotes, setKeyboardPlayingNotes] = useState<
    PlaybackEvent[]
  >([]);
  const [currentTick, setCurrentTick] = useState(-COUNT_IN_TICKS);
  const [notePerformance, setNotePerformance] = useState<
    Record<string, NotePerformance>
  >({});
  const [playSessionId, setPlaySessionId] = useState(0);
  const [wrongNotes, setWrongNotes] = useState<WrongNote[]>([]);
  const lastCompletionShownRef = useRef(false);
  const lastMetronomeBeatRef = useRef<number | null>(null);
  const hasStartedAudioContextRef = useRef(false);
  // Target notes already sounded this run, keyed by event id, so the guide
  // fires each note once even though the effect runs every animation frame.
  const guidedEventIdsRef = useRef<Set<string>>(new Set());

  // Metronome on/off and the tempo this run should use. The click itself lives
  // in learn/audio/metronomeClick.ts — a module-level synth, because a
  // component-owned one gets disposed by StrictMode's setup/cleanup/setup and
  // then silently throws on every beat.
  const { metronomeEnabled, resolveTempo } = usePracticeSettings();
  const playbackBpm = resolveTempo(THEORY_ACTIVITY_BPM);

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
      console.warn('Failed to start Tone.js audio context', error);
    }
  }, []);

  const releaseActiveNotes = useCallback(() => {
    void releaseAllPianoNotes();
    activeMidiSetRef.current = new Set<number>();
    setActiveMidis([]);
    setKeyboardPlayingNotes([]);
  }, []);

  const resetInTimeRun = useCallback(() => {
    setNotePerformance({});
    setWrongNotes([]);
    setCurrentTick(-COUNT_IN_TICKS);
    lastMetronomeBeatRef.current = null;
    guidedEventIdsRef.current = new Set();
    resetClickSpacing();
  }, []);

  // Triggers the on state of the syntheizer with a specified note and a given velocity
  const triggerSynthAttack = useCallback((name: string, velocity?: number) => {
    void triggerPianoAttack(name, velocity, Tone.now());
  }, []);

  // Triggers the off state of the synthesizer for the specified note
  const triggerSynthRelease = useCallback((name: string) => {
    void triggerPianoRelease(name, Tone.now());
  }, []);

  useEffect(() => {
    if (!isPlaying || !metronomeEnabled) {
      lastMetronomeBeatRef.current = null;
      resetClickSpacing();
      return;
    }
    if (currentTick < -COUNT_IN_TICKS || currentTick > maxEventEndTick) {
      lastMetronomeBeatRef.current = null;
      resetClickSpacing();
      return;
    }
    const ticksIntoSession = currentTick + COUNT_IN_TICKS;
    const beatIndex = Math.floor(ticksIntoSession / TICKS_PER_QUARTER);
    if (lastMetronomeBeatRef.current !== beatIndex) {
      lastMetronomeBeatRef.current = beatIndex;
      const beatInBar = beatIndex % 4;
      playClick(beatInBar === 0);
    }
  }, [isPlaying, metronomeEnabled, currentTick, maxEventEndTick]);

  // Practice guide — sound each target note as the playhead reaches it, at the
  // note's own drawn length so it sustains exactly as the roll shows it.
  useEffect(() => {
    if (!isPlaying || !playTargetNotes) return;
    if (currentTick < 0) return;

    const secondsPerTick = 60 / playbackBpm / TICKS_PER_QUARTER;
    const sounded = guidedEventIdsRef.current;

    for (const event of resolvedEvents) {
      if (sounded.has(event.id)) continue;
      if (currentTick < event.startTicks) continue;
      sounded.add(event.id);
      const midi =
        typeof event.midi === 'number'
          ? event.midi
          : pitchNameToMidi(event.pitchName);
      if (typeof midi !== 'number') continue;
      playGuideNote(midi, event.durationTicks * secondsPerTick, event.velocity);
    }
  }, [isPlaying, playTargetNotes, currentTick, resolvedEvents, playbackBpm]);

  const noteColorByMidi = useMemo(() => {
    const map = new Map<number, string>();
    resolvedEvents.forEach((event) => {
      const midi =
        typeof event.midi === 'number'
          ? event.midi
          : pitchNameToMidi(event.pitchName);
      if (typeof midi === 'number' && !map.has(midi)) {
        map.set(midi, event.color ?? activityColor);
      }
    });
    return map;
  }, [activityColor, resolvedEvents]);

  const targetMidiSet = useMemo(
    () => new Set(noteColorByMidi.keys()),
    [noteColorByMidi],
  );

  const requiredBars = useMemo(() => {
    if (maxEventEndTick <= 0) return 1;
    return Math.max(1, Math.ceil(maxEventEndTick / TICKS_PER_BAR));
  }, [maxEventEndTick]);

  const { flash, flashWrong } = useWrongNoteFlash();

  const handleKeyboardNoteOn = useCallback(
    (midi: number, wrong: boolean) => {
      const color = wrong
        ? WRONG_KEY_COLOR
        : (noteColorByMidi.get(midi) ?? WRONG_KEY_COLOR);
      const id = `keyboard-${midi}`;
      setKeyboardPlayingNotes((prev) => [
        ...prev.filter((event) => event.midi !== midi),
        {
          id,
          type: 'note',
          midi,
          time: Date.now(),
          duration: Number.POSITIVE_INFINITY,
          velocity: 1,
          color,
        },
      ]);
    },
    [noteColorByMidi],
  );

  const handleKeyboardNoteOff = useCallback((midi: number) => {
    setKeyboardPlayingNotes((prev) =>
      prev.filter((event) => event.midi !== midi),
    );
  }, []);

  const showInTimeCompletion =
    !isPlaying && maxEventEndTick > 0 && currentTick >= maxEventEndTick;

  const getActivationWindow = activationWindow;

  // Updates the note performance record for the appropriate event, given the incoming midi signal, the current time tick, and a boolean for if the signal is on or off
  const parsePerformance = useCallback(
    (midi: number, tick: number, onSignal: boolean) => {
      if (onSignal) {
        setNotePerformance((prev) => {
          // Every same-pitch note whose (extended) window contains this tick.
          const candidates = resolvedEvents.filter(
            (note) =>
              pitchNameToMidi(note.pitchName) === midi &&
              tick >= getActivationWindow(note).start &&
              tick < getActivationWindow(note).end,
          );
          // Only notes that haven't been played yet can absorb this press.
          const unplayed = candidates.filter(
            (note) => prev[note.id]?.startTick == null,
          );
          if (unplayed.length === 0) return prev;

          // When two same-pitch notes are back to back, their extended early
          // windows overlap. If neither has been played, default to the latter
          // (latest-starting) note so the early hit credits the upcoming note.
          const note = unplayed.reduce((latest, candidate) =>
            candidate.startTicks > latest.startTicks ? candidate : latest,
          );

          const normalizedStartTick = Math.max(tick, note.startTicks);
          return {
            ...prev,
            [note.id]: {
              ...(prev[note.id] ?? {}),
              startTick: normalizedStartTick,
              endTick: null,
            },
          };
        });
      } else {
        setNotePerformance((prev) => {
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
    [resolvedEvents, getActivationWindow],
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

        if (event.source !== 'audio') {
          const noteName = Tone.Frequency(midi, 'midi').toNote();
          triggerSynthRelease(noteName);
        }
      }

      handleKeyboardNoteOff(midi);
      parsePerformance(event.number, currentTickRef.current, false);
      setWrongNotes((prev) => {
        for (let i = prev.length - 1; i >= 0; i--) {
          if (prev[i].midi === midi && prev[i].endTick === null) {
            const next = [...prev];
            next[i] = { ...prev[i], endTick: currentTickRef.current };
            return next;
          }
        }
        return prev;
      });
    },
    [
      isActive,
      isPlaying,
      startToneContext,
      triggerSynthRelease,
      handleKeyboardNoteOff,
      parsePerformance,
    ],
  );

  const handleMidiNoteOn = useCallback(
    (event: MidiNoteEvent) => {
      if (!isActive) return;
      const midi = event.number;
      if (event.velocity == 0) {
        handleMidiNoteOff(event);
        return;
      }
      // Only play sampler sound for MIDI input — acoustic piano already produces sound
      if (event.source !== 'audio') {
        void startPianoSampler();
        if (!activeMidiSetRef.current.has(midi)) {
          const noteName = Tone.Frequency(midi, 'midi').toNote();
          triggerSynthAttack(noteName, event.velocity);
        }
      }
      if (!activeMidiSetRef.current.has(midi)) {
        activeMidiSetRef.current.add(midi);
        setActiveMidis([...activeMidiSetRef.current]);
      }
      // Judged against what's due at this moment, not just whether the pitch
      // appears somewhere in the activity: the right note at the wrong time
      // is a wrong note.
      const wrong =
        isPlaying &&
        !dueMidisAt(resolvedEvents, currentTickRef.current, midiOfNote).has(
          midi,
        );
      handleKeyboardNoteOn(midi, wrong);
      parsePerformance(event.number, currentTickRef.current, true);
      if (wrong) {
        flashWrong(midi);
        // Drawn on the roll in grey, like on the keyboard.
        setWrongNotes((prev) => [
          ...prev,
          { midi, onset: currentTickRef.current, endTick: null },
        ]);
      }
    },
    [
      handleMidiNoteOff,
      isActive,
      isPlaying,
      resolvedEvents,
      flashWrong,
      triggerSynthAttack,
      handleKeyboardNoteOn,
      parsePerformance,
    ],
  );

  const onMidiNoteOn = useCallback(
    (e: MidiNoteEvent) => {
      if (!isActive) return;
      handleMidiNoteOn(e);
    },
    [handleMidiNoteOn, isActive],
  );

  const onMidiNoteOff = useCallback(
    (e: MidiNoteEvent) => {
      if (!isActive) return;
      handleMidiNoteOff(e);
    },
    [handleMidiNoteOff, isActive],
  );

  const { subscribeNoteOn, subscribeNoteOff } = useLearnInputStable();

  useEffect(() => {
    if (!isActive) return;
    const unsubOn = subscribeNoteOn(onMidiNoteOn);
    const unsubOff = subscribeNoteOff(onMidiNoteOff);
    return () => {
      unsubOn();
      unsubOff();
    };
  }, [
    isActive,
    subscribeNoteOn,
    subscribeNoteOff,
    onMidiNoteOn,
    onMidiNoteOff,
  ]);

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

  const wrongUserNotes = useMemo(
    () =>
      wrongNotes.map((note) => ({
        midi: note.midi,
        onset: note.onset,
        duration: (note.endTick ?? currentTick) - note.onset,
        // Judged at the press: the right pitch at the wrong time is wrong.
        correct: false,
      })),
    [wrongNotes, currentTick],
  );

  useEffect(() => {
    const wasShown = lastCompletionShownRef.current;
    if (!wasShown && showInTimeCompletion) {
      // Reaching the end of the roll only finishes the run; it passes on the
      // notes actually played.
      const result = gradePlayAlong(
        resolvedEvents,
        notePerformance,
        wrongNotes.length,
      );
      onRunGraded?.(result);
      if (result.passed) onActivityCompleteChange?.(true);
    }
    lastCompletionShownRef.current = showInTimeCompletion;
  }, [
    notePerformance,
    onActivityCompleteChange,
    onRunGraded,
    resolvedEvents,
    showInTimeCompletion,
    wrongNotes.length,
  ]);

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

  // Practice lights only what's due next — the whole chord at once — rather
  // than every pitch in the activity.
  const nextTargetKeys = useMemo(() => {
    const keys = new Map<number, string>();
    for (const note of nextTargets(
      resolvedEvents,
      (n) => notePerformance[n.id]?.startTick != null,
      currentTick,
    )) {
      const midi = midiOfNote(note);
      if (midi != null) keys.set(midi, note.color ?? activityColor);
    }
    return keys;
  }, [activityColor, currentTick, notePerformance, resolvedEvents]);

  const gameplayContent = (
    <>
      <GenrePianoRoll
        key={playSessionId}
        inTime
        activeMidis={activeMidis}
        bars={requiredBars}
        beatsPerBar={4}
        events={resolvedEvents}
        isPlaying={isPlaying}
        performanceMeta={performanceMeta}
        playSpeed={playbackBpm}
        rowHeight={28 * 18}
        subdivision={1}
        keyColor={activityColor}
        colorActiveLanesByTarget
        targetMidiSet={targetMidiSet}
        userNotes={wrongUserNotes}
        noteSpelling={noteSpelling}
        onPlayingChange={setIsPlaying}
        onTickChange={setCurrentTick}
        chordSymbols={chordSymbols}
      />
      <div className="flex items-stretch gap-3">
        <div className="relative flex-1 min-w-0">
          <WrongNoteFlash flash={flash} noteSpelling={noteSpelling} />
          <PianoKeyboard
            showOctaveStart
            activeBlackKeyColor={activityColor}
            activeWhiteKeyColor={activityColor}
            className="mx-auto"
            endC={6}
            hintNotes={showTargetKeys ? nextTargetKeys : undefined}
            playingNotes={keyboardPlayingNotes}
            startC={2}
          />
        </div>
        <PracticeControls activityBpm={THEORY_ACTIVITY_BPM} />
        <LessonVolumeDial />
      </div>
    </>
  );

  if (arcade) {
    return (
      <div className="flex h-full w-full flex-col">
        <ArcadeGameHeader title="Play Along" />
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-4 p-4">
          {gameplayContent}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <div
          className="glass-panel rounded-xl p-4 transition duration-300"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--color-border)',
          }}
        >
          {gameplayContent}
        </div>
      </div>
    </div>
  );
};
