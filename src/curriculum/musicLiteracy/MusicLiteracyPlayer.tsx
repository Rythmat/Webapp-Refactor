import { Headphones, Keyboard, Play, Square } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  releaseAllPianoNotes,
  triggerPianoAttack,
  triggerPianoRelease,
} from '@/audio/pianoSampler';
import { SavedRollViewSwitch } from '@/components/notation/RollViewToggle';
import { CurriculumRoutes, SettingsRoutes } from '@/constants/routes';
import type { MusicLiteracyLesson } from '@/content/musicLiteracy/schemas';
import type { PlaybackEvent } from '@/contexts/PlaybackContext/helpers';
import GenrePianoRoll, {
  type NoteEvent,
} from '@/curriculum/components/GenrePianoRoll';
import {
  MIDI_ROOT_TO_KEY,
  midiToPitchName,
} from '@/curriculum/engine/genreGeneration/enharmonicEngine';
import {
  gradeResponse,
  inResponse,
  isRightNote,
  pairResponse,
  passMarkOf,
  TIMING_FLOOR,
  type LiteracyResult,
  type PlayedNote,
} from '@/curriculum/engine/musicLiteracy/grading';
import {
  degreeLabel,
  secondsPerTick,
  stepNotes,
} from '@/curriculum/engine/musicLiteracy/literacy';
import {
  applyCue,
  groovePreviewCues,
  IDLE_RUN_VIEW,
  runCues,
  type RunCue,
  type RunMode,
  type RunView,
} from '@/curriculum/engine/musicLiteracy/run';
import {
  stepKeyColor,
  stepMode,
  tonicPitchClass,
} from '@/curriculum/engine/musicLiteracy/stepColor';
import {
  Primary,
  Secondary,
  type Zones,
} from '@/curriculum/guitar/layout/GuitarActionBar';
import {
  GuitarResultPanel,
  resultSummary,
} from '@/curriculum/guitar/layout/GuitarResultPanel';
import type {
  BarState,
  NavStep,
  ResultModel,
} from '@/curriculum/guitar/layout/types';
import { displayAccidentals } from '@/daw/utils/displayAccidentals';
import { useMspModuleCompletion } from '@/features/classroom/msp';
import { useSettingsStore } from '@/features/settings/useSettingsStore';
import { useElementSize } from '@/hooks/useElementSize';
import { useDrumGrooveSettings } from '@/learn/audio/useDrumGrooveSettings';
import { usePracticeSettings } from '@/learn/audio/usePracticeSettings';
import { LessonKeyboard } from '@/learn/components/LessonKeyboard';
import { LearnInputProvider } from '@/learn/context/LearnInputContext';
import type { KeyRange } from '@/learn/keyboard/lessonKeyboardRange';
import { describeKey } from '@/lib/learn/keyDescription';
import { LiteracyCallPanel } from './LiteracyCallPanel';
import { MusicLiteracyLayout } from './MusicLiteracyLayout';
import { drumsForGroove } from './literacyGrooves';
import { startHereRoute } from './literacyPath';
import {
  literacyClock,
  previewLiteracyGroove,
  startLiteracyRun,
  stopLiteracyRun,
} from './literacyRun';
import { typingLetterFor, typingOctaveLabel } from './typingKeys';
import { useLiteracyInput, type LiteracyNoteOn } from './useLiteracyInput';
import { useLiteracyProgress } from './useLiteracyProgress';

// ── The Music Literacy player ──────────────────────────────────────────────
// Simon says, in time. One step is one continuous pulse: a count-in bar, the
// words (no voice: the syllables light as the piano plays their notes), the
// call, then the student's bars, where they play the call back. Then a
// score with Try again and Next; Next is always there, passed or not.
//
//   Listen    the whole step, the answer played by the app
//   Practice  the same run, the answer's keys lit, not scored
//   Play      the graded run
//
// The run is scheduled on the transport (literacyRun.ts) from the step's
// cues (engine/musicLiteracy/run.ts); the student's notes, from MIDI, the
// on-screen keys or the letter keys (useLiteracyInput.ts), are stamped on
// the same clock and graded in the response bars (grading.ts).
//
// With a drum groove chosen (Settings → Play along, literacyGrooves.ts) every
// run plays over it: the count-in clicks, the drums come in with the words
// and keep time to the end of the answer, a kick and crash land the final
// downbeat, and the result shows once it has rung. The words and the call
// are MY TURN, the teacher's: a teacher may play along on the keyboard then,
// and nothing played in it is graded or shown wrong.

/** The keyboard: exactly 25 keys, C3–C5 (the series' register, literacy.ts). */
export const LITERACY_KEY_RANGE: KeyRange = { low: 48, high: 72 };

/** White-key length ÷ width: a real key is about 6.4, this a touch shorter. */
const KEY_ASPECT = 6;

/** The keyboard's height, between these, by the room the panel has. */
const KEYBOARD_MIN_HEIGHT = 110;
const KEYBOARD_MAX_HEIGHT = 190;

/** The roll's timeline header (GenrePianoRoll draws it 40px tall). */
const ROLL_HEADER = 40;

type Status = 'preview' | 'running' | 'result';

interface Run {
  mode: RunMode;
  stepIndex: number;
  notes: ReturnType<typeof stepNotes>;
  tempo: number;
  passMark: number;
  tag: string;
  finished: boolean;
}

const RUN_LEAD: Record<RunMode, string> = {
  listen: 'Listen: the whole step, the answer too',
  practice: 'Practice: play the lit keys back, not scored',
  play: 'Play the call back when it’s your turn',
};

export interface MusicLiteracyPlayerProps {
  lesson: MusicLiteracyLesson;
}

export function MusicLiteracyPlayer(props: MusicLiteracyPlayerProps) {
  return (
    <LearnInputProvider detectionMode="polyphonic" instrument="piano">
      <MusicLiteracyPlayerInner {...props} />
    </LearnInputProvider>
  );
}

function MusicLiteracyPlayerInner({ lesson }: MusicLiteracyPlayerProps) {
  const navigate = useNavigate();
  const outputLatencyMs = useSettingsStore((s) => s.outputLatencyMs);
  const { metronomeEnabled } = usePracticeSettings();
  const { grooveId, click: grooveClick, setGrooveId } = useDrumGrooveSettings();
  const { reportCompletion } = useMspModuleCompletion();
  const { progress, record } = useLiteracyProgress(lesson.id);

  // `?step=<tag>` opens on that step: Start Here's Continue.
  const [params] = useSearchParams();
  const [stepIndex, setStepIndex] = useState(() =>
    Math.max(
      0,
      lesson.steps.findIndex((s) => s.tag === params.get('step')),
    ),
  );
  const step = lesson.steps[Math.min(stepIndex, lesson.steps.length - 1)];
  const notes = useMemo(() => stepNotes(lesson, step), [lesson, step]);
  const { timeline, tonic } = notes;
  const mode = stepMode(lesson, step);
  const keyColor = stepKeyColor(lesson, step);
  const tonicPc = tonicPitchClass(lesson);
  const tonicName = displayAccidentals(lesson.key.tonic);
  const keyName = `${tonicName} ${mode === 'minor' ? 'Minor' : 'Major'}`;
  const colorOf =
    mode === 'minor'
      ? displayAccidentals(MIDI_ROOT_TO_KEY[(tonicPc + 3) % 12])
      : null;
  const passMark = passMarkOf(step);
  const [beatsPerBar, beatUnit] = lesson.timeSignature;
  // The grooves are all in 4/4; a lesson in another meter plays without one.
  const grooveFits = beatsPerBar === 4 && beatUnit === 4;
  const groove = grooveFits ? grooveId : null;

  // Tempo: the step's own, or the lesson's, until the student changes it.
  const ownTempo = step.tempo ?? lesson.tempo;
  const [tempo, setTempo] = useState(ownTempo);
  const [tempoFor, setTempoFor] = useState(step.tag);
  if (tempoFor !== step.tag) {
    setTempoFor(step.tag);
    setTempo(ownTempo);
  }

  const [status, setStatus] = useState<Status>('preview');
  const [runMode, setRunMode] = useState<RunMode | null>(null);
  /** The transport is under way (the playhead may follow it). */
  const [live, setLive] = useState(false);
  const [view, setView] = useState<RunView>(IDLE_RUN_VIEW);
  const [played, setPlayed] = useState<readonly PlayedNote[]>([]);
  const [result, setResult] = useState<LiteracyResult | null>(null);
  const [held, setHeld] = useState<ReadonlyMap<number, string | null>>(
    () => new Map(),
  );
  /** Remounts the roll for each run, so its playhead starts at the count-in. */
  const [runId, setRunId] = useState(0);

  const runRef = useRef<Run | null>(null);
  const playedRef = useRef<PlayedNote[]>([]);
  const liveRef = useRef(false);
  const latest = useRef({ notes, keyColor, tonic });
  latest.current = { notes, keyColor, tonic };

  // ── The run ──

  const endRun = useCallback(() => {
    runRef.current = null;
    liveRef.current = false;
    stopLiteracyRun();
    setLive(false);
  }, []);

  const finishRun = useCallback(
    (run: Run) => {
      if (run.finished || runRef.current !== run) return;
      run.finished = true;
      endRun();
      setView((v) => ({ ...v, hub: null, lit: [], ended: true }));
      if (run.mode !== 'play') {
        setStatus('preview');
        setRunMode(null);
        return;
      }
      const graded = gradeResponse(run.notes.response, playedRef.current, {
        timeline: run.notes.timeline,
        tempo: run.tempo,
        passMark: run.passMark,
        call: run.notes.call,
      });
      if (import.meta.env.DEV) {
        // For tuning the grading by ear: how far off each answer was.
        console.debug(
          '[MusicLiteracy] graded',
          JSON.stringify({
            percent: graded.percent,
            pitch: graded.pitchAccuracy,
            timing: graded.timingAccuracy,
            offsetsMs: graded.outcomes?.map((o) =>
              o.timingDevTicks === undefined
                ? null
                : Math.round(
                    o.timingDevTicks * secondsPerTick(run.tempo) * 1000,
                  ),
            ),
            extras: graded.extras.length,
          }),
        );
      }
      record(run.tag, graded.percent, graded.passed);
      // The classroom hears when the last step is passed (a no-op unless the
      // lesson was opened from a classroom slide).
      if (graded.passed && run.stepIndex === lesson.steps.length - 1) {
        reportCompletion();
      }
      setResult(graded);
      setStatus('result');
    },
    [endRun, lesson.steps.length, record, reportCompletion],
  );

  const startRun = useCallback(
    (mode: RunMode) => {
      endRun();
      const run: Run = {
        mode,
        stepIndex,
        notes,
        tempo,
        passMark,
        tag: step.tag,
        finished: false,
      };
      runRef.current = run;
      playedRef.current = [];
      setPlayed([]);
      setResult(null);
      setView(IDLE_RUN_VIEW);
      setRunMode(mode);
      setStatus('running');
      setRunId((n) => n + 1);

      const wordCount = notes.words.length;
      const onCue = (cue: RunCue) => {
        if (runRef.current !== run) return;
        setView((v) => applyCue(v, cue, wordCount));
        if (cue.kind === 'end') finishRun(run);
      };
      // The groove's drums first (a Studio groove or a code groove loads
      // now); one that's gone, or won't load, leaves the click alone.
      const begin = async () => {
        const drums =
          groove === null
            ? null
            : await drumsForGroove(
                groove,
                (timeline.total - timeline.words.start) / timeline.barTicks,
              ).catch((error: unknown) => {
                console.warn('[MusicLiteracy] the groove did not load', error);
                return null;
              });
        if (runRef.current !== run) return false;
        return startLiteracyRun({
          cues: runCues(lesson, step, mode, {
            // Over the drums the click stops after the count-in, unless asked for.
            metronome: drums ? grooveClick : metronomeEnabled,
            groove: drums?.groove,
          }),
          tempo,
          onCue,
          kit: drums?.kit,
        });
      };
      void begin().then(
        (started) => {
          if (!started || runRef.current !== run) return;
          liveRef.current = true;
          setLive(true);
        },
        (error: unknown) => {
          // No sound to run on (the piano failed to load): back to the step.
          console.warn('[MusicLiteracy] the run could not start', error);
          if (runRef.current !== run) return;
          endRun();
          setStatus('preview');
          setRunMode(null);
          setView(IDLE_RUN_VIEW);
        },
      );
    },
    [
      endRun,
      finishRun,
      groove,
      grooveClick,
      lesson,
      metronomeEnabled,
      notes,
      passMark,
      step,
      stepIndex,
      tempo,
      timeline,
    ],
  );

  const stopRun = useCallback(() => {
    endRun();
    setStatus('preview');
    setRunMode(null);
    setView(IDLE_RUN_VIEW);
  }, [endRun]);

  // Choosing a groove stops a run (as a new tempo does) and plays a bar of
  // it, then its final downbeat, at the step's tempo.
  const previewRef = useRef(0);
  const chooseGroove = useCallback(
    (id: string | null) => {
      if (runRef.current) stopRun();
      setGrooveId(id);
      const preview = ++previewRef.current;
      if (id === null) {
        stopLiteracyRun();
        return;
      }
      void drumsForGroove(id, 1)
        .then((drums) => {
          if (!drums || preview !== previewRef.current || runRef.current) {
            return;
          }
          return previewLiteracyGroove({
            cues: groovePreviewCues(
              drums.groove,
              timeline.barTicks,
              beatsPerBar,
            ),
            tempo,
            kit: drums.kit,
          });
        })
        .catch((error: unknown) => {
          console.warn('[MusicLiteracy] the groove preview failed', error);
        });
    },
    [beatsPerBar, setGrooveId, stopRun, tempo, timeline.barTicks],
  );

  const goToStep = useCallback(
    (index: number) => {
      endRun();
      setStepIndex(Math.max(0, Math.min(lesson.steps.length - 1, index)));
      setStatus('preview');
      setRunMode(null);
      setView(IDLE_RUN_VIEW);
      setResult(null);
      playedRef.current = [];
      setPlayed([]);
    },
    [endRun, lesson.steps.length],
  );

  // Leaving the lesson stops everything it started.
  useEffect(
    () => () => {
      runRef.current = null;
      stopLiteracyRun();
      void releaseAllPianoNotes();
    },
    [],
  );

  const isLastStep = stepIndex === lesson.steps.length - 1;
  const next = useCallback(() => {
    if (isLastStep) {
      endRun();
      navigate(startHereRoute());
      return;
    }
    goToStep(stepIndex + 1);
  }, [endRun, goToStep, isLastStep, navigate, stepIndex]);

  // ── The student's notes, from every source ──

  const noteOn = useCallback(({ midi, velocity, perfMs }: LiteracyNoteOn) => {
    const { notes: current, keyColor: color, tonic: one } = latest.current;
    void triggerPianoAttack(midiToPitchName(midi, one), velocity);
    const run = runRef.current;
    const tick =
      run && liveRef.current ? literacyClock.soundingTicks(perfMs) : null;
    const figure = run?.notes ?? current;
    const right = isRightNote(midi, tick, figure.response, figure.timeline);
    setHeld((prev) => new Map(prev).set(midi, right ? color : null));
    if (run && tick !== null) {
      playedRef.current = [
        ...playedRef.current,
        { midi, onset: tick, duration: 0 },
      ];
      setPlayed(playedRef.current);
    }
  }, []);

  const noteOff = useCallback(
    ({ midi, perfMs }: { midi: number; perfMs?: number }) => {
      void triggerPianoRelease(midiToPitchName(midi, latest.current.tonic));
      setHeld((prev) => {
        if (!prev.has(midi)) return prev;
        const nextHeld = new Map(prev);
        nextHeld.delete(midi);
        return nextHeld;
      });
      if (!runRef.current || !liveRef.current) return;
      const tick = literacyClock.soundingTicks(perfMs);
      if (tick === null) return;
      const list = playedRef.current;
      for (let i = list.length - 1; i >= 0; i--) {
        if (list[i].midi === midi && list[i].duration === 0) {
          const closed = [...list];
          closed[i] = {
            ...list[i],
            duration: Math.max(1, tick - list[i].onset),
          };
          playedRef.current = closed;
          setPlayed(closed);
          break;
        }
      }
    },
    [],
  );

  const { onKeyPointerDown, typingOctave } = useLiteracyInput({
    onNoteOn: noteOn,
    onNoteOff: noteOff,
  });

  // ── The response panel: the roll and the keyboard ──

  const rollRef = useRef<HTMLDivElement>(null);
  const rollBox = useElementSize(rollRef);
  const responseRef = useRef<HTMLElement>(null);
  const responseBox = useElementSize(responseRef);
  const rowHeight = Math.max(100, Math.round(rollBox.height) - ROLL_HEADER);
  const running = status === 'running';
  const countIn = timeline.countIn.length;
  const bar = timeline.barTicks;

  const wordsColor = useMemo(() => mutedColor(keyColor), [keyColor]);
  const segments = useMemo(
    () =>
      [
        ['words', notes.words],
        ['call', notes.call],
        ['response', notes.response],
      ] as const,
    [notes],
  );
  const events = useMemo<NoteEvent[]>(
    () =>
      segments.flatMap(([segment, list]) =>
        list.map((note) => ({
          id: `${segment}-${note.index}`,
          pitchName: midiToPitchName(note.midi, tonic),
          midi: note.midi,
          // The roll's tick 0 is where the words begin.
          startTicks: note.onset - countIn,
          durationTicks: note.duration,
          color: segment === 'words' ? wordsColor : keyColor,
        })),
      ),
    [segments, tonic, countIn, wordsColor, keyColor],
  );
  const rollRange = useMemo(() => {
    const midis = events.map((e) => e.midi!);
    const low = Math.min(...midis);
    const high = Math.max(...midis);
    const pad = Math.max(2, Math.ceil((7 - (high - low)) / 2));
    return { min: low - pad, max: high + pad };
  }, [events]);

  // The roll draws one count-in bar before its tick 0, wherever the
  // transport's zero is: hand it the transport moved by the difference.
  const rollPlaybackTicks = useCallback(() => {
    const ticks = literacyClock.playbackTicks();
    return ticks === null ? null : ticks - countIn + bar;
  }, [countIn, bar]);

  // Live pairs while the student answers (Play); the result's once graded.
  const pairs = useMemo(() => {
    if (result) return result.pairs;
    return pairResponse(
      notes.response,
      inResponse(played, timeline, {
        call: notes.call,
        response: notes.response,
      }),
    ).pairs;
  }, [result, notes.call, notes.response, played, timeline]);

  const performanceMeta = useMemo(() => {
    if (!running) return undefined;
    const meta: Record<string, { startTick: number; endTick?: number }> = {};
    for (const [segment, list] of segments) {
      const answered = segment === 'response' && runMode === 'play';
      list.forEach((note, i) => {
        const id = `${segment}-${note.index}`;
        if (answered) {
          const pair = pairs[i];
          if (pair) {
            meta[id] = {
              startTick: pair.onset - countIn,
              ...(pair.duration > 0
                ? { endTick: pair.onset + pair.duration - countIn }
                : {}),
            };
          }
        } else if (note.onset <= view.tick) {
          meta[id] = {
            startTick: note.onset - countIn,
            endTick: note.onset + note.duration - countIn,
          };
        }
      });
    }
    return meta;
  }, [running, segments, runMode, pairs, view.tick, countIn]);

  const answeredNotes = useMemo(
    () => new Set(pairs.filter((p): p is PlayedNote => p !== null)),
    [pairs],
  );
  const userNotes = useMemo(
    () =>
      played.map((note) => ({
        midi: note.midi,
        onset: note.onset - countIn,
        duration: note.duration,
        correct:
          answeredNotes.has(note) ||
          (!result &&
            isRightNote(note.midi, note.onset, notes.response, timeline)),
      })),
    [played, countIn, answeredNotes, result, notes.response, timeline],
  );

  const figureMidis = useMemo(
    () => new Set([...notes.call, ...notes.response].map((n) => n.midi)),
    [notes],
  );
  const hintNotes = useMemo(
    () => new Map(notes.response.map((n) => [n.midi, keyColor] as const)),
    [notes.response, keyColor],
  );
  const keyLabels = useMemo(() => {
    const labels = new Map<number, string>();
    for (const n of [...notes.call, ...notes.response]) {
      labels.set(n.midi, degreeLabel(n.degree));
    }
    return labels;
  }, [notes]);
  const playingNotes = useMemo<PlaybackEvent[]>(
    () =>
      view.lit.map((midi) => ({
        id: `lit-${midi}`,
        type: 'note',
        midi,
        time: 0,
        duration: 1,
        velocity: 80,
      })),
    [view.lit],
  );

  // The keyboard takes about a third of the panel's height.
  const keyboardMax = Math.max(
    KEYBOARD_MIN_HEIGHT,
    Math.min(KEYBOARD_MAX_HEIGHT, Math.round(responseBox.height * 0.34)),
  );

  const answerLetters = notes.response
    .map((n) => typingLetterFor(n.midi, typingOctave) ?? '–')
    .join(' · ');

  // ── The bar ──

  const barState: BarState =
    status === 'result'
      ? 'result'
      : running
        ? runMode === 'play'
          ? 'performance'
          : 'practice'
        : 'preview';

  const resultModel: ResultModel | null = result
    ? {
        result,
        stepKind: 'notes',
        headingOverride: null,
        feedback: result.feedbackText,
        suggestion: null,
        onSuggestion: () => {},
        hasMistakes: false,
        canCountItMyself: false,
        onCountItMyself: () => {},
        retry: () => startRun('play'),
        next,
        nextLabel: isLastStep ? 'Finish' : 'Next',
      }
    : null;

  const zones = ((): Zones => {
    const corner = (
      <span
        data-pass-mark={passMark}
        title={`Score ${passMark}% overall, with timing at ${TIMING_FLOOR}% or more, to pass this step.`}
        className="whitespace-nowrap text-xs text-white/45"
      >
        Pass = {passMark}% · timing {TIMING_FLOOR}%
      </span>
    );
    if (status === 'result' && resultModel) {
      const retry = resultModel.result.passed ? (
        <Secondary onClick={resultModel.retry}>Try Again</Secondary>
      ) : (
        <Primary onClick={resultModel.retry}>Try Again</Primary>
      );
      const forward = resultModel.result.passed ? (
        <Primary onClick={next}>{resultModel.nextLabel}</Primary>
      ) : (
        <Secondary onClick={next}>{resultModel.nextLabel}</Secondary>
      );
      return {
        lead: null,
        meta: null,
        // The primary sits last: Next after a pass, Try Again after a miss.
        actions: resultModel.result.passed ? (
          <>
            {retry}
            {forward}
          </>
        ) : (
          <>
            {forward}
            {retry}
          </>
        ),
      };
    }
    if (running && runMode) {
      return {
        lead: (
          <p data-literacy-run-lead className="text-[15px] text-[#e8e8f0]">
            {live
              ? RUN_LEAD[runMode]
              : groove !== null
                ? 'Getting the drums ready…'
                : 'Getting the piano ready…'}
          </p>
        ),
        meta: (
          <span className="whitespace-nowrap text-sm text-white/55">
            {tempo} bpm
          </span>
        ),
        corner,
        actions: (
          <Primary onClick={stopRun}>
            <Square />
            Stop
          </Primary>
        ),
      };
    }
    return {
      lead: null,
      meta: null,
      corner,
      actions: (
        <>
          <Secondary onClick={() => startRun('listen')}>
            <Headphones />
            Listen
          </Secondary>
          <Secondary onClick={() => startRun('practice')}>Practice</Secondary>
          <Primary onClick={() => startRun('play')}>
            <Play />
            Play
          </Primary>
        </>
      ),
    };
  })();

  // ── The chrome ──

  const navSteps: NavStep[] = lesson.steps.map((s, i) => {
    const saved = progress[s.tag];
    return {
      code: String(i + 1),
      title: s.title,
      subsection: lesson.name,
      status: saved?.passed ? 'passed' : saved ? 'attempted' : 'todo',
    };
  });

  const about = useMemo(() => {
    const key = describeKey(
      lesson.key.tonic,
      mode === 'minor' ? 'aeolian' : 'ionian',
    );
    return {
      activity: step.title,
      instruction: step.direction ?? '',
      chords: [],
      // Beginners meet "C Major" and "C Minor", not the modes' names.
      key: key && { ...key, title: keyName },
    };
  }, [step, lesson.key.tonic, mode, keyName]);

  return (
    <MusicLiteracyLayout
      header={{
        crumbs: [
          {
            label: 'Start here',
            onClick: () => navigate(startHereRoute()),
          },
          {
            // The console previews drafts; say so.
            label:
              lesson.status === 'draft'
                ? `${lesson.name} · Draft`
                : lesson.name,
            onClick: () => navigate(CurriculumRoutes.musicLiteracy()),
          },
        ],
        keyLabel: keyName,
        keyColor,
        subsection: '',
        activity: step.title,
      }}
      nav={{
        sections: [],
        onSection: () => {},
        steps: navSteps,
        index: stepIndex,
        goToStep,
        practiceTrack: null,
        extra: <SavedRollViewSwitch />,
      }}
      bar={{
        state: barState,
        run: NO_RUN_MODEL,
        tempo: null,
        practice: { presets: [] },
        result: resultModel,
        offer: null,
        custom: zones,
      }}
      about={about}
      audio={{
        outputLatencyMs,
        openAudioTiming: () => navigate(`${SettingsRoutes.root()}/audio`),
      }}
      tempo={{
        bpm: tempo,
        onChange: (bpm) => {
          if (running) stopRun();
          setTempo(bpm);
        },
      }}
      groove={{ onChoose: chooseGroove, fits: grooveFits }}
      announcement={resultModel ? resultSummary(resultModel, passMark) : ''}
      slots={{
        call: (stacked) => (
          <LiteracyCallPanel
            // Its two shapes measure different boxes: a new shape, a new panel.
            key={stacked ? 'row' : 'column'}
            tonicPc={tonicPc}
            mode={mode}
            keyColor={keyColor}
            keyName={keyName}
            colorOf={colorOf}
            call={notes.call}
            response={notes.response}
            words={notes.words}
            wordsStart={timeline.words.start}
            barTicks={bar}
            beatsPerBar={beatsPerBar}
            view={view}
            running={running}
            compact={stacked}
          />
        ),
        responseRef,
        rollRef,
        roll: (
          <GenrePianoRoll
            key={`roll-${step.tag}-${runId}`}
            instrument="piano"
            showViewToggle={false}
            events={events}
            bars={(timeline.total - countIn) / bar}
            beatsPerBar={beatsPerBar}
            beatTicks={bar / beatsPerBar}
            timeSignature={lesson.timeSignature}
            staves="treble"
            subdivision={running ? 2 : 1}
            rowHeight={rowHeight}
            midiRangeMin={rollRange.min}
            midiRangeMax={rollRange.max}
            inTime={running}
            playSpeed={tempo}
            isPlaying={running && live}
            onPlayingChange={() => {}}
            playbackTicks={running ? rollPlaybackTicks : undefined}
            activeMidis={[...held.keys()]}
            performanceMeta={performanceMeta}
            keyRoot={tonic}
            keyColor={keyColor}
            userNotes={userNotes}
            targetMidiSet={figureMidis}
            colorActiveLanesByTarget
          />
        ),
        result: resultModel ? (
          <GuitarResultPanel result={resultModel} passMarkPct={passMark} />
        ) : null,
        keyboard: (
          <>
            <LessonKeyboard
              range={LITERACY_KEY_RANGE}
              natural={{ aspect: KEY_ASPECT, maxHeight: keyboardMax }}
              activeWhiteKeyColor={keyColor}
              activeBlackKeyColor={keyColor}
              hintNotes={hintNotes}
              keyLabels={keyLabels}
              playingNotes={playingNotes}
              playedKeys={held}
              enableClick={false}
              useContextNotes={false}
              onKeyPointerDown={onKeyPointerDown}
            />
            <TypingHint octave={typingOctave} answer={answerLetters} />
          </>
        ),
      }}
    />
  );
}

/** The run model the bar asks for; the screen brings its own buttons (custom). */
const NO_RUN_MODEL = {
  state: 'preview',
  restartingPass: false,
  instruction: '',
  listen: { mode: 'keepTime', passMarkPct: 0 },
  loading: false,
  demo: { playing: false, play: () => {}, stop: () => {} },
  practise: () => {},
  playNow: () => {},
  back: () => {},
  stopTake: () => {},
  hint: null,
} as const;

/** The words' notes on the roll: the key's color, quieter than the figure's. */
function mutedColor(hex: string): string {
  const n = Number.parseInt(hex.replace('#', ''), 16);
  if (!Number.isFinite(n)) return hex;
  const mix = (channel: number) =>
    Math.round(channel * 0.45 + 0x60 * 0.55)
      .toString(16)
      .padStart(2, '0');
  return `#${mix((n >> 16) & 255)}${mix((n >> 8) & 255)}${mix(n & 255)}`;
}

function TypingHint({ octave, answer }: { octave: number; answer: string }) {
  const key = (text: string) => (
    <kbd className="rounded border border-white/15 bg-white/[0.06] px-1 font-sans text-[11px] leading-4 text-[#e8e8f0]">
      {text}
    </kbd>
  );
  // Three chunks that wrap between, never inside.
  return (
    <p
      data-literacy-typing-hint
      className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-white/45"
    >
      <span className="inline-flex items-center gap-1 whitespace-nowrap">
        <Keyboard aria-hidden className="mr-0.5 size-3.5" />
        Letter keys: {key('A')}–{key('K')} white, {key('W')}
        {key('E')}
        {key('T')}
        {key('Y')}
        {key('U')} black
      </span>
      <span className="inline-flex items-center gap-1 whitespace-nowrap">
        {key('Z')}
        {key('X')} octave · {typingOctaveLabel(octave)}
      </span>
      <span data-literacy-answer-letters className="whitespace-nowrap">
        Answer: <span className="text-[#e8e8f0]">{answer}</span>
      </span>
    </p>
  );
}
