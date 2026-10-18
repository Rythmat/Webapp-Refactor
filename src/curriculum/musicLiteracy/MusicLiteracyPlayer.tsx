import { Headphones, Keyboard, Play, Square } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  releaseAllPianoNotes,
  triggerPianoAttack,
  triggerPianoRelease,
} from '@/audio/pianoSampler';
import { SavedRollViewSwitch } from '@/components/notation/RollViewToggle';
import { cn } from '@/components/utilities';
import { CurriculumRoutes, SettingsRoutes } from '@/constants/routes';
import {
  stepKind,
  type LiteracyChooseChordsStep,
  type LiteracyMode,
  type LiteracyScaleDegree,
  type LiteracyTonic,
  type MusicLiteracyLesson,
} from '@/content/musicLiteracy/schemas';
import type { PlaybackEvent } from '@/contexts/PlaybackContext/helpers';
import GenrePianoRoll, {
  type NoteEvent,
  type RollBand,
} from '@/curriculum/components/GenrePianoRoll';
import {
  MIDI_ROOT_TO_KEY,
  midiToPitchName,
} from '@/curriculum/engine/genreGeneration/enharmonicEngine';
import {
  keyFor,
  missingChoices,
  progressionFor,
  withMode,
  withProgression,
  withTonic,
  type LiteracyChoices,
  type SavedProgression,
} from '@/curriculum/engine/musicLiteracy/choices';
import {
  gradeChordResponse,
  type LiteracyChordResult,
} from '@/curriculum/engine/musicLiteracy/chordGrading';
import { voicedChord } from '@/curriculum/engine/musicLiteracy/chords';
import {
  createPass,
  bestCreateReading,
  gradeCreateRepeat,
  transcribeCall,
  type CreatePass,
  type CreateResult,
  type Transcription,
} from '@/curriculum/engine/musicLiteracy/createPass';
import {
  challengeTargets,
  gradeChallenge,
  gradeResponse,
  inResponse,
  pairResponse,
  passMarkOf,
  RESPONSE_EARLY_TICKS,
  TIMING_FLOOR,
  type LiteracyChallengeResult,
  type LiteracyResult,
  type PlayedNote,
} from '@/curriculum/engine/musicLiteracy/grading';
import {
  degreeLabel,
  degreeOfMidi,
  replayHarmonies,
  resolveReplay,
  secondsPerTick,
  stepNotes,
  type StepNotes,
  type StepTimeline,
  type TimedNote,
} from '@/curriculum/engine/musicLiteracy/literacy';
import {
  finishesModule,
  lessonGoal,
  lessonModules,
  moduleEchoPassed,
  moduleOfStep,
  modulePass,
  roundMark,
  roundStart,
  roundSteps,
  type LiteracyModule,
} from '@/curriculum/engine/musicLiteracy/modules';
import {
  passProgressKey,
  stepPasses,
  type LiteracyPass,
} from '@/curriculum/engine/musicLiteracy/passes';
import {
  applyCue,
  createRunCues,
  groovePreviewCues,
  IDLE_RUN_VIEW,
  repeatLightCues,
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
  GuitarStepStatus,
  NavGroupAction,
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
import { describeKey } from '@/lib/learn/keyDescription';
import { ChallengeSegments } from './ChallengeSegments';
import { ChoiceGate } from './ChoiceGate';
import { ChooseChordsPanel } from './ChooseChordsPanel';
import {
  ChooseKeyPanel,
  ChooseModePanel,
  keyName as nameOfKey,
} from './ChooseKeyPanel';
import { ChordBars, type ChordBarRow } from './ChordBars';
import { CreateResultPanel } from './CreateResultPanel';
import { LiteracyCallPanel } from './LiteracyCallPanel';
import {
  LessonIntroCard,
  ModuleDoneCard,
  ROUND_COPY,
  RoundBanner,
  RoundIcon,
} from './ModuleCards';
import { MusicLiteracyLayout } from './MusicLiteracyLayout';
import { createComparison } from './createComparison';
import { drumsForGroove } from './literacyGrooves';
import { LITERACY_KEY_RANGE, literacyKeyRange } from './literacyKeyRange';
import {
  attackAt,
  chordLabelsByBar,
  isRightKey,
  pitchClass,
} from './literacyKeys';
import { startHereRoute } from './literacyPath';
import {
  keyPreviewNotes,
  PREVIEW_CHORD_TICKS,
  previewCues,
  progressionPreview,
} from './literacyPreview';
import {
  addLiteracyRunCues,
  literacyClock,
  previewLiteracyGroove,
  startLiteracyRun,
  stopLiteracyRun,
} from './literacyRun';
import { literacyStepDone, literacyStepTried } from './stepDone';
import { createHubHeadline, hubHeadline, replayHubHeadline } from './turnCues';
import { typingLetterFor, typingOctaveLabel } from './typingKeys';
import { useLiteracyChoices } from './useLiteracyChoices';
import { useLiteracyInput, type LiteracyNoteOn } from './useLiteracyInput';
import { useLiteracyProgress, withTry } from './useLiteracyProgress';

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
//
// Words with a pickup sing it at the end of the count-in bar, which clicks on
// under it, into the words' downbeat; the roll and the staff mark that
// downbeat with a double bar.
//
// What to do is never in doubt: the hub says LISTEN through the count-in and
// the words, GET READY as the call starts, GO! on its last beat, one before
// the student's turn, and then YOUR TURN (turnCues.ts). The call is what to
// copy: its keys light shiny over the words' plain light, and the roll marks
// its bars "Copy this".
//
// MODULES AND THEIR ROUNDS (engine/musicLiteracy/modules.ts)
// A lesson is a run of modules, its sections (Part 1 is one). Each step is
// played as its echo first. Passing a module's last echo shows the module's
// card in the result's place, offering its round: the module's steps again,
// each as its round's pass. Once passed, the round stays open from the
// module's header in the step list.
//
//   create     Part 2: "Module done! Now go again and create your own." Each
//              step's create pass: count-in, the student's own call on the
//              step's notes (the keys lit softly), transcribed to 16ths at
//              its end and shown on the roll and staff, then their repeat of
//              it, graded against it (`<tag>:create`).
//   challenge  Part 1: "Part 1 done! Want a challenge just for fun? Go again
//              and play ALL the notes!" The same run, PLAY ALONG over the
//              teacher's turn, every note graded, each segment's score
//              shown (`<tag>:challenge`). It never holds up the lesson.
//
// In a round the pager counts the round's steps, under a banner naming it
// with the module's goal; its last step goes on to the next module. Part 2
// opens on the lesson's one goal, before its first step.
//
// PART 2 (a lesson whose key is the student's)
// The choose steps pick the key on the circle, major or minor, and the
// chords of a progression; their choices are kept beside the progress
// (useLiteracyChoices.ts). A step that needs a choice not yet made waits
// with a link to the step that makes it. A chord echo plays its voiced
// chords in their rhythm, the hub naming each bar's chord; a replay plays
// the student's progression as triads, then with 7ths, to listen to.
// When a step counts as done is one rule, in stepDone.ts.

export { LITERACY_KEY_RANGE };

/** White-key length ÷ width: a real key is about 6.4, this a touch shorter. */
const KEY_ASPECT = 6;

/** The keyboard's height, between these, by the room the panel has. */
const KEYBOARD_MIN_HEIGHT = 110;
const KEYBOARD_MAX_HEIGHT = 190;

/** The chord chooser's keys, which light the chords as they're heard. */
const CHOOSER_KEYBOARD_HEIGHT = 130;

/** The roll's timeline header (GenrePianoRoll draws it 40px tall). */
const ROLL_HEADER = 40;

/** The house wrong-key gray, for a key held that isn't the step's. */
const NEUTRAL_KEY_COLOR = '#e8e8f0';

type Status = 'preview' | 'running' | 'result';

/** What a run is for: one of the step's passes, or hearing a choice. */
type RunKind = LiteracyPass | 'hear';

interface Run {
  kind: RunKind;
  mode: RunMode;
  stepIndex: number;
  notes: StepNotes;
  /** The run's own timeline: the step's, or its create pass's. */
  timeline: StepTimeline;
  create: CreatePass | null;
  /** The create pass's call, once its bars are over. */
  transcription: Transcription | null;
  tempo: number;
  passMark: number;
  tag: string;
  finished: boolean;
}

/** What a graded run came to. */
type Outcome =
  | { pass: 'echo'; kind: 'notes'; result: LiteracyResult }
  | { pass: 'echo'; kind: 'chords'; result: LiteracyChordResult }
  | {
      pass: 'challenge';
      result: LiteracyChallengeResult;
      bestBefore: number | null;
    }
  | {
      pass: 'create';
      result: CreateResult;
      transcription: Transcription;
      create: CreatePass;
      played: PlayedNote[];
    };

const RUN_LEAD: Record<RunMode, string> = {
  listen: 'Listen: the whole step, the answer too',
  practice: 'Practice: play the lit keys back, not scored',
  play: 'Play the call back when it’s your turn',
};

const CHORD_RUN_LEAD: Record<RunMode, string> = {
  listen: 'Listen: the chords, then the answer',
  practice: 'Practice: play the lit chords back, not scored',
  play: 'Play the chords back when it’s your turn',
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
  const studentKey = lesson.keyChoice === 'student';
  const { choices: savedChoices, update: updateChoices } = useLiteracyChoices(
    lesson.id,
  );
  /** The student's choices, in a lesson that asks for them. */
  const choices: LiteracyChoices | null = studentKey ? savedChoices : null;

  // `?step=<tag>` opens on that step: Start Here's Continue.
  const [params] = useSearchParams();
  const [stepIndex, setStepIndex] = useState(() =>
    Math.max(
      0,
      lesson.steps.findIndex((s) => s.tag === params.get('step')),
    ),
  );
  const step = lesson.steps[Math.min(stepIndex, lesson.steps.length - 1)];
  const kind = stepKind(step);

  // The modules, and the round being played, if one is (a module's index).
  const modules = useMemo(() => lessonModules(lesson), [lesson]);
  const whole = modules.length === 1;
  const [round, setRound] = useState<number | null>(null);
  const roundModule = round === null ? null : (modules[round] ?? null);
  /** Each module's round steps, by their places in the lesson. */
  const roundIndices = useMemo(
    () =>
      modules.map((m) =>
        roundSteps(m, lesson).map((s) => lesson.steps.indexOf(s)),
      ),
    [modules, lesson],
  );
  const inRound =
    round !== null && (roundIndices[round] ?? []).includes(stepIndex);
  /** The pass this step is played as: its round's, or the echo. */
  const activePass: LiteracyPass =
    inRound && roundModule ? (modulePass(roundModule) ?? 'echo') : 'echo';
  /** A module just passed: its card shows in the result's place. */
  const [moduleDone, setModuleDone] = useState<number | null>(null);
  // The lesson's one goal (Part 2's), before its first step: on opening it
  // at the start, not at a step Start Here's Continue names.
  const goal = useMemo(() => lessonGoal(lesson), [lesson]);
  const [intro, setIntro] = useState(
    () => goal !== null && !params.get('step'),
  );
  const notes = useMemo(
    () => stepNotes(lesson, step, choices),
    [lesson, step, choices],
  );
  const chordSteps = notes.chords !== null;
  const passes = useMemo(() => stepPasses(lesson, step), [lesson, step]);
  const create = useMemo(
    () => (passes.create ? createPass(lesson, step, choices) : null),
    [passes.create, lesson, step, choices],
  );
  const missing = useMemo(
    () => (studentKey ? missingChoices(lesson, step, choices) : []),
    [studentKey, lesson, step, choices],
  );
  const gate = missing[0] ?? null;

  const mode = stepMode(lesson, step, choices);
  const keyColorOfStep = stepKeyColor(lesson, step, choices);
  // Before a Part 2 student picks a key, the screen wears no key's color.
  const noKeyYet = studentKey && !choices?.tonic;
  const keyColor = noKeyYet ? NEUTRAL_KEY_COLOR : keyColorOfStep;
  const tonicPc = tonicPitchClass(lesson, step, choices);
  const { tonic } = notes;
  const keyName = nameOfKey(notes.key.tonic, mode);
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
  const onCreate = activePass === 'create' && create !== null;
  /** The timeline the screen draws: the step's, or its create pass's. */
  const timeline = onCreate ? create.timeline : notes.timeline;

  const [status, setStatus] = useState<Status>('preview');
  const [runMode, setRunMode] = useState<RunMode | null>(null);
  /** What the run under way is for: a pass, or hearing a choice. */
  const [runFor, setRunFor] = useState<RunKind | null>(null);
  /** The transport is under way (the playhead may follow it). */
  const [live, setLive] = useState(false);
  const [view, setView] = useState<RunView>(IDLE_RUN_VIEW);
  const [played, setPlayed] = useState<readonly PlayedNote[]>([]);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  /** The create pass's call, transcribed at its end (shown in the repeat). */
  const [transcription, setTranscription] = useState<Transcription | null>(
    null,
  );
  /** What a choose step is playing to be heard, if anything. */
  const [hearing, setHearing] = useState<
    'key' | 'chord' | 'progression' | null
  >(null);
  const [held, setHeld] = useState<ReadonlyMap<number, string | null>>(
    () => new Map(),
  );
  /** Remounts the roll for each run, so its playhead starts at the count-in. */
  const [runId, setRunId] = useState(0);

  const runRef = useRef<Run | null>(null);
  const playedRef = useRef<PlayedNote[]>([]);
  const liveRef = useRef(false);
  const progressRef = useRef(progress);
  progressRef.current = progress;

  const latest = useRef({
    notes,
    keyColor,
    tonic,
    pass: activePass,
    create,
    transcription,
  });
  latest.current = {
    notes,
    keyColor,
    tonic,
    pass: onCreate ? 'create' : activePass === 'create' ? 'echo' : activePass,
    create,
    transcription,
  };

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
      if (run.kind === 'hear') {
        setHearing(null);
        setView(IDLE_RUN_VIEW);
        return;
      }
      if (run.mode !== 'play') {
        // A replay heard to the end is done: there's nothing to grade.
        if (run.notes.timeline.response.length === 0 && run.mode === 'listen') {
          record(run.tag, 100, true);
        }
        setStatus('preview');
        setRunMode(null);
        return;
      }
      const all = playedRef.current;
      const timing = { tempo: run.tempo, passMark: run.passMark };
      let next: Outcome;
      if (run.kind === 'create' && run.create) {
        // The call once more, with every note it heard, read whichever way
        // fits the repeat (a repeat's first note may come a little early).
        const { transcription: heard, result: graded } = bestCreateReading(
          run.create,
          all,
          timing,
        );
        if (graded.kind !== 'empty') {
          record(
            passProgressKey(run.tag, 'create'),
            graded.result.percent,
            graded.passed,
          );
        }
        setTranscription(heard);
        next = {
          pass: 'create',
          result: graded,
          transcription: heard,
          create: run.create,
          played: [...all],
        };
      } else if (run.kind === 'challenge') {
        const graded = gradeChallenge(challengeTargets(run.notes), all, {
          timeline: run.notes.timeline,
          ...timing,
        });
        const before =
          progressRef.current[passProgressKey(run.tag, 'challenge')];
        record(
          passProgressKey(run.tag, 'challenge'),
          graded.percent,
          graded.passed,
        );
        next = {
          pass: 'challenge',
          result: graded,
          bestBefore: before ? before.best : null,
        };
      } else if (run.notes.chords) {
        const graded = gradeChordResponse(run.notes.chords.response, all, {
          timeline: run.notes.timeline,
          ...timing,
          call: run.notes.chords.call,
        });
        record(run.tag, graded.percent, graded.passed);
        next = { pass: 'echo', kind: 'chords', result: graded };
      } else {
        const graded = gradeResponse(run.notes.response, all, {
          timeline: run.notes.timeline,
          ...timing,
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
        next = { pass: 'echo', kind: 'notes', result: graded };
      }
      // The classroom hears when the last step's echo is passed (a no-op
      // unless the lesson was opened from a classroom slide).
      if (
        next.pass === 'echo' &&
        next.result.passed &&
        run.stepIndex === lesson.steps.length - 1
      ) {
        reportCompletion();
      }
      // An echo that finishes its module brings the module's card, when
      // it has a round to offer.
      if (next.pass === 'echo' && next.result.passed) {
        const done = moduleOfStep(modules, run.stepIndex);
        const at = done ? modules.indexOf(done) : -1;
        const before = progressRef.current;
        const after = withTry(before, run.tag, next.result.percent, true);
        if (
          done &&
          (roundIndices[at]?.length ?? 0) > 0 &&
          finishesModule(done, run.stepIndex, before, after)
        ) {
          setModuleDone(at);
        }
      }
      setOutcome(next);
      setStatus('result');
    },
    [
      endRun,
      lesson.steps.length,
      modules,
      record,
      reportCompletion,
      roundIndices,
    ],
  );

  /**
   * The create pass's call is over: transcribe it, show it, light its keys
   * for the repeat. An empty call stops the run: try again.
   */
  const onCallOver = useCallback(
    (run: Run) => {
      if (!run.create || run.transcription) return;
      const heard = transcribeCall(run.create, playedRef.current);
      run.transcription = heard;
      setTranscription(heard);
      if (heard.empty) {
        endRun();
        run.finished = true;
        setView(IDLE_RUN_VIEW);
        setOutcome({
          pass: 'create',
          result: gradeCreateRepeat(run.create, heard, playedRef.current, {
            tempo: run.tempo,
            passMark: run.passMark,
          }),
          transcription: heard,
          create: run.create,
          played: [...playedRef.current],
        });
        setStatus('result');
        return;
      }
      if (run.create.material.kind === 'notes') {
        addLiteracyRunCues(repeatLightCues(heard.targets));
      } else {
        addLiteracyRunCues(
          repeatLightCues(
            heard.attacks.flatMap((attack) =>
              attack.chord.midis.map((midi, i) => ({
                midi,
                onset: attack.onset,
                duration: attack.duration,
                degree: '1' as const,
                index: attack.index * 8 + i,
              })),
            ),
          ),
        );
      }
    },
    [endRun],
  );

  const startRun = useCallback(
    (mode: RunMode, runKind: LiteracyPass) => {
      endRun();
      const forCreate = runKind === 'create' && create !== null;
      const runTimeline = forCreate ? create.timeline : notes.timeline;
      const run: Run = {
        kind: runKind,
        mode,
        stepIndex,
        notes,
        timeline: runTimeline,
        create: forCreate ? create : null,
        transcription: null,
        tempo,
        passMark,
        tag: step.tag,
        finished: false,
      };
      runRef.current = run;
      playedRef.current = [];
      setPlayed([]);
      setOutcome(null);
      setModuleDone(null);
      setTranscription(null);
      setHearing(null);
      setView(IDLE_RUN_VIEW);
      setRunMode(mode);
      setRunFor(runKind);
      setStatus('running');
      setRunId((n) => n + 1);

      const wordCount = notes.words.length;
      const onCue = (cue: RunCue) => {
        if (runRef.current !== run) return;
        setView((v) => applyCue(v, cue, wordCount));
        if (
          forCreate &&
          cue.kind === 'beat' &&
          cue.tick === runTimeline.response.start
        ) {
          onCallOver(run);
        }
        if (cue.kind === 'end') finishRun(run);
      };
      // The groove's drums first (a Studio groove or a code groove loads
      // now); one that's gone, or won't load, leaves the click alone.
      const from = forCreate ? runTimeline.call.start : runTimeline.words.start;
      const begin = async () => {
        const drums =
          groove === null
            ? null
            : await drumsForGroove(
                groove,
                (runTimeline.total - from) / runTimeline.barTicks,
              ).catch((error: unknown) => {
                console.warn('[MusicLiteracy] the groove did not load', error);
                return null;
              });
        if (runRef.current !== run) return false;
        // Over the drums the click stops after the count-in, unless asked for.
        const options = {
          metronome: drums ? grooveClick : metronomeEnabled,
          groove: drums?.groove,
        };
        return startLiteracyRun({
          cues: forCreate
            ? createRunCues(lesson, create, options)
            : runCues(lesson, step, mode, {
                ...options,
                choices,
                challenge: runKind === 'challenge',
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
      choices,
      create,
      endRun,
      finishRun,
      groove,
      grooveClick,
      lesson,
      metronomeEnabled,
      notes,
      onCallOver,
      passMark,
      step,
      stepIndex,
      tempo,
    ],
  );

  /** Play something to hear a choice: no count-in, nothing graded. */
  const hear = useCallback(
    (cues: RunCue[], what: 'key' | 'chord' | 'progression') => {
      endRun();
      const run: Run = {
        kind: 'hear',
        mode: 'listen',
        stepIndex,
        notes,
        timeline: notes.timeline,
        create: null,
        transcription: null,
        tempo,
        passMark,
        tag: step.tag,
        finished: false,
      };
      runRef.current = run;
      setHearing(what);
      setRunFor('hear');
      setView(IDLE_RUN_VIEW);
      void startLiteracyRun({
        cues,
        tempo,
        onCue: (cue) => {
          if (runRef.current !== run) return;
          setView((v) => applyCue(v, cue, 0));
          if (cue.kind === 'end') finishRun(run);
        },
      }).catch((error: unknown) => {
        console.warn('[MusicLiteracy] could not play it', error);
        if (runRef.current === run) {
          endRun();
          setHearing(null);
        }
      });
    },
    [endRun, finishRun, notes, passMark, step.tag, stepIndex, tempo],
  );

  const stopRun = useCallback(() => {
    endRun();
    setStatus('preview');
    setRunMode(null);
    setHearing(null);
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

  /** Open a step at its preview, in a module's round or out of any. */
  const openStep = useCallback(
    (index: number, inModuleRound: number | null) => {
      endRun();
      setStepIndex(Math.max(0, Math.min(lesson.steps.length - 1, index)));
      setRound(inModuleRound);
      setStatus('preview');
      setRunMode(null);
      setView(IDLE_RUN_VIEW);
      setOutcome(null);
      setModuleDone(null);
      setTranscription(null);
      setHearing(null);
      setIntro(false);
      playedRef.current = [];
      setPlayed([]);
    },
    [endRun, lesson.steps.length],
  );

  /** Another step: in the round still when it is one of the round's. */
  const goToStep = useCallback(
    (index: number) =>
      openStep(
        index,
        round !== null && (roundIndices[round] ?? []).includes(index)
          ? round
          : null,
      ),
    [openStep, round, roundIndices],
  );

  /** A module's round, from its first step not yet passed. */
  const startRound = useCallback(
    (at: number) => {
      const target = modules[at];
      const start = target && roundStart(target, lesson, progressRef.current);
      if (start === undefined) return;
      openStep(start, at);
    },
    [lesson, modules, openStep],
  );

  /** Out of the round, on the same step. */
  const leaveRound = useCallback(
    () => openStep(stepIndex, null),
    [openStep, stepIndex],
  );

  /** The module after this one: its first step, or the path after the last. */
  const toNextModule = useCallback(
    (from: LiteracyModule | null | undefined) => {
      const following = from ? modules[modules.indexOf(from) + 1] : undefined;
      if (following) {
        openStep(following.indices[0], null);
        return;
      }
      endRun();
      navigate(startHereRoute());
    },
    [endRun, modules, navigate, openStep],
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

  // In a round, Next is the round's next step, and after its last, the
  // next module; out of one, the lesson's next step.
  const roundOrder =
    inRound && round !== null ? (roundIndices[round] ?? []) : [];
  const lastInRound =
    inRound && roundOrder.indexOf(stepIndex) === roundOrder.length - 1;
  const isLastStep = inRound
    ? lastInRound && round === modules.length - 1
    : stepIndex === lesson.steps.length - 1;
  const next = useCallback(() => {
    if (inRound && round !== null) {
      const steps = roundIndices[round] ?? [];
      const at = steps.indexOf(stepIndex);
      if (at >= 0 && at < steps.length - 1) {
        openStep(steps[at + 1], round);
        return;
      }
      toNextModule(modules[round]);
      return;
    }
    if (stepIndex === lesson.steps.length - 1) {
      endRun();
      navigate(startHereRoute());
      return;
    }
    goToStep(stepIndex + 1);
  }, [
    endRun,
    goToStep,
    inRound,
    lesson.steps.length,
    modules,
    navigate,
    openStep,
    round,
    roundIndices,
    stepIndex,
    toNextModule,
  ]);

  // ── The student's notes, from every source ──

  const noteOn = useCallback(({ midi, velocity, perfMs }: LiteracyNoteOn) => {
    const current = latest.current;
    void triggerPianoAttack(midiToPitchName(midi, current.tonic), velocity);
    const run = runRef.current;
    const graded = run && run.kind !== 'hear' ? run : null;
    const tick =
      graded && liveRef.current ? literacyClock.soundingTicks(perfMs) : null;
    // A key is judged by the run's pass, or out of one, the pass shown.
    const right = isRightKey(midi, tick, {
      pass: graded ? (graded.kind as LiteracyPass) : current.pass,
      notes: graded?.notes ?? current.notes,
      create:
        graded?.create ?? (current.pass === 'create' ? current.create : null),
      transcription: graded?.transcription ?? current.transcription,
    });
    setHeld((prev) => new Map(prev).set(midi, right ? current.keyColor : null));
    if (graded && tick !== null) {
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
      const run = runRef.current;
      if (!run || run.kind === 'hear' || !liveRef.current) return;
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

  // ── The choose steps ──

  const markDone = useCallback(
    (tag: string) => {
      if (!progressRef.current[tag]?.passed) record(tag, 100, true);
    },
    [record],
  );

  const hearKey = useCallback(
    (tonicName: LiteracyTonic, keyMode: LiteracyMode) =>
      hear(
        previewCues(keyPreviewNotes({ tonic: tonicName, mode: keyMode })),
        'key',
      ),
    [hear],
  );

  const chooseTonic = useCallback(
    (picked: LiteracyTonic) => {
      updateChoices((c) => withTonic(c, picked));
      markDone(step.tag);
      hearKey(picked, choices?.mode ?? lesson.key.mode);
    },
    [
      choices?.mode,
      hearKey,
      lesson.key.mode,
      markDone,
      step.tag,
      updateChoices,
    ],
  );

  const chooseMode = useCallback(
    (picked: LiteracyMode) => {
      updateChoices((c) => withMode(c, picked));
      markDone(step.tag);
      hearKey(choices?.tonic ?? lesson.key.tonic, picked);
    },
    [
      choices?.tonic,
      hearKey,
      lesson.key.tonic,
      markDone,
      step.tag,
      updateChoices,
    ],
  );

  const chooserKey = keyFor(lesson, choices);
  const hearChords = useCallback(
    (degrees: LiteracyScaleDegree[], what: 'chord' | 'progression') => {
      if (step.kind !== 'chooseChords') return;
      const voiced = degrees
        .map((d) => voicedChord(chooserKey, d, step.harmony))
        .filter((c): c is NonNullable<typeof c> => c !== null);
      hear(progressionPreview(voiced, tonic).cues, what);
    },
    [chooserKey, hear, step, tonic],
  );

  const saveChords = useCallback(
    (progression: SavedProgression) => {
      if (step.kind !== 'chooseChords') return;
      const name = step.saveAs;
      updateChoices((c) => withProgression(c, name, progression));
      markDone(step.tag);
    },
    [markDone, step, updateChoices],
  );

  // ── The response panel: the roll and the keyboard ──

  const rollRef = useRef<HTMLDivElement>(null);
  const rollBox = useElementSize(rollRef);
  const responseRef = useRef<HTMLElement>(null);
  const responseBox = useElementSize(responseRef);
  const rowHeight = Math.max(100, Math.round(rollBox.height) - ROLL_HEADER);
  const running = status === 'running';
  const countIn = timeline.countIn.length;
  const bar = timeline.barTicks;
  const isReplay = kind === 'replay';
  /** The pass the screen shows: the run's, or out of one, the step's. */
  const shownPass: LiteracyPass = onCreate
    ? 'create'
    : activePass === 'challenge'
      ? 'challenge'
      : 'echo';
  /** The challenge's words in the hub: its run, or its preview. */
  const challenge = running
    ? runFor === 'challenge'
    : shownPass === 'challenge';
  /** The run under way is this screen's graded or played run. */
  const runKind: RunKind | null = running ? runFor : null;

  const wordsColor = useMemo(() => mutedColor(keyColor), [keyColor]);
  const chordLabels = useMemo(
    () => chordLabelsByBar(notes.chords?.call ?? []),
    [notes.chords],
  );
  const replayPasses = useMemo(
    () => (step.kind === 'replay' ? resolveReplay(lesson, step, choices) : []),
    [lesson, step, choices],
  );

  // The call is the figure to copy: marked so over its bars (a chord call,
  // each bar by its chord); a create pass marks the student's call and
  // their repeat.
  const rollBands = useMemo<RollBand[]>(() => {
    const at = (tick: number) => tick - countIn;
    if (onCreate) {
      return [
        {
          startTick: at(timeline.call.start),
          endTick: at(timeline.call.start + timeline.call.length),
          label: 'Your call',
          color: keyColor,
        },
        {
          startTick: at(timeline.response.start),
          endTick: at(timeline.response.start + timeline.response.length),
          label: 'Repeat it',
          color: wordsColor,
        },
      ];
    }
    if (isReplay) {
      const once = replayPasses[0]?.chords.length ?? 1;
      return replayPasses.flatMap((p, i) =>
        p.chords.map((chord, b) => ({
          startTick: at(timeline.call.start + (i * once + b) * bar),
          endTick: at(timeline.call.start + (i * once + b + 1) * bar),
          label: chord.label,
          color: keyColor,
        })),
      );
    }
    if (chordSteps) {
      return chordLabels.map((label, b) => ({
        startTick: at(timeline.call.start + b * bar),
        endTick: at(timeline.call.start + (b + 1) * bar),
        label,
        color: keyColor,
      }));
    }
    return [
      {
        startTick: at(timeline.call.start),
        endTick: at(timeline.call.start + timeline.call.length),
        label: 'Copy this',
        color: keyColor,
      },
    ];
  }, [
    onCreate,
    isReplay,
    chordSteps,
    replayPasses,
    chordLabels,
    timeline,
    countIn,
    bar,
    keyColor,
    wordsColor,
  ]);

  /** The create pass's call and repeat, once transcribed, on its timeline. */
  const createNotes = useMemo(() => {
    if (!onCreate || !transcription || transcription.empty) {
      return { call: [] as TimedNote[], response: [] as TimedNote[] };
    }
    const shift = timeline.response.start - timeline.call.start;
    const response: TimedNote[] =
      create.material.kind === 'notes'
        ? transcription.targets
        : transcription.attacks.flatMap((attack) =>
            attack.chord.midis.map((midi) => ({
              midi,
              onset: attack.onset,
              duration: attack.duration,
              degree: degreeOfMidi(midi, tonic).degree,
              index: 0,
            })),
          );
    const indexed = response.map((n, index) => ({ ...n, index }));
    return {
      call: indexed.map((n) => ({ ...n, onset: n.onset - shift })),
      response: indexed,
    };
  }, [onCreate, transcription, create, timeline, tonic]);

  const segments = useMemo(
    () =>
      onCreate
        ? ([
            ['call', createNotes.call],
            ['response', createNotes.response],
          ] as const)
        : ([
            ['words', notes.words],
            ['call', notes.call],
            ['response', notes.response],
          ] as const),
    [onCreate, createNotes, notes],
  );
  const events = useMemo<NoteEvent[]>(
    () =>
      segments.flatMap(([segment, list]) =>
        list.map((note) => ({
          id: `${segment}-${note.index}`,
          pitchName: midiToPitchName(note.midi, tonic),
          midi: note.midi,
          // The roll's tick 0 is the words' downbeat (a pickup's before it).
          startTicks: note.onset - countIn,
          durationTicks: note.duration,
          color: segment === 'words' ? wordsColor : keyColor,
        })),
      ),
    [segments, tonic, countIn, wordsColor, keyColor],
  );

  /** Every pitch the step asks for: the keyboard shows them all. */
  const targetMidis = useMemo(() => {
    const midis = new Set<number>();
    for (const n of [...notes.words, ...notes.call, ...notes.response]) {
      midis.add(n.midi);
    }
    if (create?.material.kind === 'notes') {
      for (const m of create.material.notes) midis.add(m.midi);
    } else if (create) {
      for (const c of create.material.chords)
        for (const m of c.midis) midis.add(m);
    }
    return midis;
  }, [notes, create]);
  const keyRange = useMemo(() => literacyKeyRange(targetMidis), [targetMidis]);

  const createMaterialMidis = useMemo(() => {
    if (!create) return [];
    return create.material.kind === 'notes'
      ? create.material.notes.map((m) => m.midi)
      : create.material.chords.flatMap((c) => [...c.midis]);
  }, [create]);

  const rollRange = useMemo(() => {
    const midis = [
      ...events.map((e) => e.midi!),
      ...(onCreate
        ? [...createMaterialMidis, ...played.map((p) => p.midi)]
        : []),
    ];
    if (midis.length === 0) return { min: 58, max: 66 };
    const low = Math.min(...midis);
    const high = Math.max(...midis);
    const pad = Math.max(2, Math.ceil((7 - (high - low)) / 2));
    return { min: low - pad, max: high + pad };
  }, [events, onCreate, createMaterialMidis, played]);

  // The roll draws one count-in bar before its tick 0, wherever the
  // transport's zero is: hand it the transport moved by the difference.
  const rollPlaybackTicks = useCallback(() => {
    const ticks = literacyClock.playbackTicks();
    return ticks === null ? null : ticks - countIn + bar;
  }, [countIn, bar]);

  /** The notes the student answers, and what they've played for them. */
  const answerTargets = onCreate ? createNotes.response : notes.response;
  const answerPlayed = useMemo(() => {
    if (!onCreate || !transcription) return played;
    const used = new Set(transcription.used);
    return played.filter((n) => !used.has(n));
  }, [onCreate, transcription, played]);

  // Live pairs while the student answers (Play); the result's once graded.
  const echoResult =
    outcome?.pass === 'echo' && outcome.kind === 'notes'
      ? outcome.result
      : null;
  const pairs = useMemo(() => {
    if (echoResult) return echoResult.pairs;
    if (chordSteps && !onCreate) {
      // A chord's note is answered by its pitch class, near its attack.
      const answers = inResponse(answerPlayed, timeline);
      return answerTargets.map(
        (target) =>
          answers.find(
            (n) =>
              pitchClass(n.midi) === pitchClass(target.midi) &&
              Math.abs(n.onset - target.onset) <= RESPONSE_EARLY_TICKS,
          ) ?? null,
      );
    }
    return pairResponse(
      answerTargets,
      inResponse(answerPlayed, timeline, {
        call: onCreate ? createNotes.call : notes.call,
        response: answerTargets,
      }),
    ).pairs;
  }, [
    echoResult,
    chordSteps,
    onCreate,
    answerPlayed,
    timeline,
    answerTargets,
    createNotes.call,
    notes.call,
  ]);

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
          (!outcome &&
            isRightKey(note.midi, note.onset, {
              pass: running && runFor && runFor !== 'hear' ? runFor : shownPass,
              notes,
              create: onCreate ? create : null,
              transcription,
            })),
      })),
    [
      played,
      countIn,
      answeredNotes,
      outcome,
      onCreate,
      running,
      runFor,
      shownPass,
      notes,
      create,
      transcription,
    ],
  );

  const figureMidis = useMemo(
    () =>
      new Set(
        onCreate
          ? createMaterialMidis
          : [...notes.call, ...notes.response].map((n) => n.midi),
      ),
    [onCreate, createMaterialMidis, notes],
  );

  /** The create pass's bar now: the call's, then the repeat's. */
  const createBar = useMemo(() => {
    if (!onCreate || create.material.kind !== 'chords') return null;
    const tick = running ? view.tick : -1;
    const from =
      tick >= timeline.response.start
        ? timeline.response.start
        : timeline.call.start;
    return Math.max(
      0,
      Math.min(
        create.material.chords.length - 1,
        Math.floor((tick - from) / bar),
      ),
    );
  }, [onCreate, create, running, view.tick, timeline, bar]);

  // The keys to play, lit softly: the answer's; in a create pass's call, the
  // step's notes (a chord call: the bar's chord).
  const hintNotes = useMemo(() => {
    if (onCreate) {
      const midis =
        create.material.kind === 'notes'
          ? create.material.notes.map((m) => m.midi)
          : [...create.material.chords[createBar ?? 0].midis];
      return new Map(midis.map((m) => [m, keyColor] as const));
    }
    const list = notes.response.length ? notes.response : notes.call;
    return new Map(list.map((n) => [n.midi, keyColor] as const));
  }, [onCreate, create, createBar, notes, keyColor]);
  const keyLabels = useMemo(() => {
    const labels = new Map<number, string>();
    for (const n of [...notes.call, ...notes.response]) {
      labels.set(n.midi, degreeLabel(n.degree));
    }
    if (create?.material.kind === 'notes') {
      for (const m of create.material.notes) {
        labels.set(m.midi, degreeLabel(m.degree));
      }
    }
    return labels;
  }, [notes, create]);
  // The call's keys as they sound: shiny, as the student's own right notes
  // are, over the plain light of the words. A key the student holds is
  // drawn as theirs.
  const keysShown = useMemo(() => {
    const sounding = notes.call.filter(
      (n) =>
        view.lit.includes(n.midi) &&
        n.onset <= view.tick &&
        view.tick < n.onset + n.duration,
    );
    if (sounding.length === 0 || onCreate) return held;
    return new Map([
      ...sounding.map((n) => [n.midi, keyColor] as const),
      ...held,
    ]);
  }, [notes.call, view.lit, view.tick, held, keyColor, onCreate]);
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

  const answerLetters = (onCreate ? [] : notes.response)
    .map((n) => typingLetterFor(n.midi, typingOctave) ?? '–')
    .join(' · ');

  // ── The hub: what to do now ──

  const headline = onCreate
    ? createHubHeadline(
        timeline,
        running ? view.tick : -1,
        beatsPerBar,
        running,
      )
    : isReplay
      ? replayHubHeadline(
          timeline,
          running ? view.tick : -1,
          step.kind === 'replay' ? replayHarmonies(step) : [],
          running,
        )
      : hubHeadline(
          timeline,
          running ? view.tick : -1,
          beatsPerBar,
          running ? runMode : null,
          { challenge },
        );

  // A chord step's hub names the chord now; a create pass's, its notes.
  const hubContent = useMemo(():
    | { kind: 'chord'; label: string; lit: boolean }
    | { kind: 'degrees'; items: { label: string; lit: boolean }[] }
    | undefined => {
    if (onCreate) {
      if (create.material.kind === 'notes') {
        const on = new Set([...view.lit, ...held.keys()]);
        return {
          kind: 'degrees',
          items: create.material.notes.map((m) => ({
            label: degreeLabel(m.degree),
            lit: running && on.has(m.midi),
          })),
        };
      }
      const chord = create.material.chords[createBar ?? 0];
      return {
        kind: 'chord',
        label: chord.label,
        lit:
          running &&
          chord.midis.some((m) => view.lit.includes(m) || held.has(m)),
      };
    }
    if (!notes.chords) return undefined;
    const attacks =
      running &&
      view.tick >= timeline.response.start &&
      notes.chords.response.length
        ? notes.chords.response
        : notes.chords.call;
    const now = running ? attackAt(attacks, view.tick) : null;
    const chord = now?.attack.chord ?? notes.chords.call[0]?.chord;
    return {
      kind: 'chord',
      label: chord?.label ?? '',
      lit:
        !!now?.sounding &&
        now.attack.chord.midis.some((m) => view.lit.includes(m)),
    };
  }, [
    onCreate,
    create,
    createBar,
    view.lit,
    view.tick,
    held,
    running,
    notes.chords,
    timeline,
  ]);

  // Under the circle: a chord step's bars, the one playing lit.
  const chordRows = useMemo((): ChordBarRow[] | null => {
    if (onCreate) {
      if (create.material.kind !== 'chords') return null;
      return [
        {
          bars: create.material.chords.map((chord, b) => ({
            label: chord.label,
            lit: running && view.tick >= timeline.call.start && createBar === b,
          })),
        },
      ];
    }
    if (isReplay) {
      const once = (replayPasses[0]?.chords.length ?? 1) * bar;
      const now =
        running && view.tick >= timeline.call.start
          ? view.tick - timeline.call.start
          : -1;
      const row = now >= 0 ? Math.floor(now / once) : -1;
      const at = now >= 0 ? Math.floor((now % once) / bar) : -1;
      return replayPasses.map((p, r) => ({
        label: p.harmony === 'sevenths' ? '7ths' : 'Triads',
        bars: p.chords.map((chord, b) => ({
          label: chord.label,
          lit: r === row && b === at,
        })),
      }));
    }
    if (!notes.chords) return null;
    const inResponseBars = running && view.tick >= timeline.response.start;
    const attacks = inResponseBars ? notes.chords.response : notes.chords.call;
    const now =
      running && view.tick >= timeline.call.start
        ? attackAt(attacks, view.tick)
        : null;
    return [
      {
        bars: chordLabels.map((label, b) => ({
          label,
          lit: now?.attack.bar === b,
        })),
      },
    ];
  }, [
    onCreate,
    create,
    running,
    view.tick,
    timeline,
    createBar,
    isReplay,
    replayPasses,
    bar,
    notes.chords,
    chordLabels,
  ]);

  // ── The bar ──

  const graded = outcome !== null;
  const barState: BarState =
    status === 'result'
      ? 'result'
      : running
        ? runMode === 'play'
          ? 'performance'
          : 'practice'
        : 'preview';

  const passedNow = outcome?.result.passed ?? false;

  // Next's name: the round's last step goes on to the next module.
  const nextLabel = lastInRound
    ? isLastStep
      ? 'Finish'
      : 'Next module'
    : isLastStep
      ? 'Finish'
      : 'Next';
  const resultModel: ResultModel | null =
    outcome && outcome.pass !== 'create'
      ? {
          result: outcome.result,
          stepKind:
            outcome.pass === 'echo' && outcome.kind === 'chords'
              ? 'chords'
              : 'notes',
          headingOverride: null,
          feedback: outcome.result.feedbackText,
          suggestion: null,
          onSuggestion: () => {},
          hasMistakes: false,
          canCountItMyself: false,
          onCountItMyself: () => {},
          retry: () => startRun('play', outcome.pass),
          next,
          nextLabel,
        }
      : null;

  /** The module whose card shows, and the round it offers. */
  const doneModule = moduleDone === null ? null : (modules[moduleDone] ?? null);
  const donePass = doneModule ? modulePass(doneModule) : null;
  const doneRound =
    donePass === 'create' || donePass === 'challenge' ? donePass : null;
  const lastModule =
    doneModule !== null && modules.indexOf(doneModule) === modules.length - 1;

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
    if (intro) {
      return {
        lead: null,
        meta: null,
        actions: <Primary onClick={() => setIntro(false)}>Let’s go</Primary>,
      };
    }
    if (status === 'result' && outcome && doneModule && doneRound) {
      // The module's card: its round first, the next module beside it.
      return {
        lead: null,
        meta: null,
        actions: (
          <>
            <Secondary onClick={() => toNextModule(doneModule)}>
              {lastModule ? 'Finish' : 'Next module'}
            </Secondary>
            <Primary
              onClick={() => moduleDone !== null && startRound(moduleDone)}
            >
              <RoundIcon round={doneRound} />
              {ROUND_COPY[doneRound].start}
            </Primary>
          </>
        ),
      };
    }
    if (status === 'result' && outcome) {
      const emptyCall =
        outcome.pass === 'create' && outcome.result.kind === 'empty';
      const retry = () => startRun('play', outcome.pass);
      // The primary sits last: Next after a pass, Try Again after a miss.
      return {
        lead: null,
        meta: null,
        actions:
          passedNow && !emptyCall ? (
            <>
              <Secondary onClick={retry}>Try Again</Secondary>
              <Primary onClick={next}>{nextLabel}</Primary>
            </>
          ) : (
            <>
              <Secondary onClick={next}>{nextLabel}</Secondary>
              <Primary onClick={retry}>Try Again</Primary>
            </>
          ),
      };
    }
    if (running && runMode) {
      const leadText = !live
        ? groove !== null
          ? 'Getting the drums ready…'
          : 'Getting the piano ready…'
        : onCreate
          ? 'Play your own rhythm, then repeat it'
          : challenge
            ? 'Play ALL the notes, along with Atlas'
            : isReplay
              ? 'Listen: your chords, then with their 7ths'
              : chordSteps
                ? CHORD_RUN_LEAD[runMode]
                : RUN_LEAD[runMode];
      return {
        lead: (
          <p data-literacy-run-lead className="text-[15px] text-[#e8e8f0]">
            {leadText}
          </p>
        ),
        meta: (
          <span className="whitespace-nowrap text-sm text-white/55">
            {tempo} bpm
          </span>
        ),
        corner: runMode === 'play' ? corner : undefined,
        actions: (
          <Primary onClick={stopRun}>
            <Square />
            Stop
          </Primary>
        ),
      };
    }
    // The choose steps, and a step waiting for a choice: Next.
    if (
      gate ||
      kind === 'chooseKey' ||
      kind === 'chooseMode' ||
      kind === 'chooseChords'
    ) {
      // Chosen here, or already (the mode is asked each section): Next
      // is the way on, and counts the step done.
      const chosen =
        !gate &&
        (step.kind === 'chooseKey'
          ? !!choices?.tonic
          : step.kind === 'chooseMode'
            ? !!choices?.mode
            : step.kind === 'chooseChords'
              ? !!progressionFor(lesson, choices, step.saveAs)
              : false);
      const done = chosen || (!gate && literacyStepDone(step, progress));
      const onward = () => {
        if (chosen) markDone(step.tag);
        next();
      };
      return {
        lead: null,
        meta: null,
        actions: done ? (
          <Primary onClick={onward}>{nextLabel}</Primary>
        ) : (
          <Secondary onClick={next}>{nextLabel}</Secondary>
        ),
      };
    }
    if (isReplay) {
      const heard = literacyStepDone(step, progress);
      return {
        lead: null,
        meta: null,
        actions: heard ? (
          <>
            <Secondary onClick={() => startRun('listen', 'echo')}>
              <Headphones />
              Listen
            </Secondary>
            <Primary onClick={next}>{nextLabel}</Primary>
          </>
        ) : (
          <>
            <Secondary onClick={next}>{nextLabel}</Secondary>
            <Primary onClick={() => startRun('listen', 'echo')}>
              <Headphones />
              Listen
            </Primary>
          </>
        ),
      };
    }
    if (onCreate) {
      return {
        lead: (
          <p data-literacy-run-lead className="text-[15px] text-[#e8e8f0]">
            Play your own rhythm on the lit keys. Then repeat it.
          </p>
        ),
        meta: null,
        corner,
        actions: (
          <Primary onClick={() => startRun('play', 'create')}>
            <Play />
            Play
          </Primary>
        ),
      };
    }
    if (shownPass === 'challenge') {
      // The challenge round: hear the step again, or play ALL of it.
      return {
        lead: (
          <p data-literacy-run-lead className="text-[15px] text-[#e8e8f0]">
            Play ALL the notes, along with Atlas
          </p>
        ),
        meta: null,
        corner,
        actions: (
          <>
            <Secondary onClick={() => startRun('listen', 'echo')}>
              <Headphones />
              Listen
            </Secondary>
            <Primary onClick={() => startRun('play', 'challenge')}>
              <Play />
              Play
            </Primary>
          </>
        ),
      };
    }
    return {
      lead: null,
      meta: null,
      corner,
      actions: (
        <>
          <Secondary onClick={() => startRun('listen', 'echo')}>
            <Headphones />
            Listen
          </Secondary>
          <Secondary onClick={() => startRun('practice', 'echo')}>
            Practice
          </Secondary>
          <Primary onClick={() => startRun('play', 'echo')}>
            <Play />
            Play
          </Primary>
        </>
      ),
    };
  })();

  // ── The chrome ──

  /** A pass's mark in the step list's words. */
  const statusOf = (key: string): GuitarStepStatus =>
    progress[key]?.passed
      ? 'passed'
      : progress[key] !== undefined
        ? 'attempted'
        : 'todo';

  // The pager and the step list: the lesson's steps, grouped by module, or
  // in a round, the round's steps alone, each by its round's mark.
  const roundPassNow = roundModule ? modulePass(roundModule) : null;
  const roundKind =
    roundPassNow === 'create' || roundPassNow === 'challenge'
      ? roundPassNow
      : null;
  const roundName = roundKind ? ROUND_COPY[roundKind].name : null;
  /** The modules with a round to play: the intro marks them. */
  const withRound = new Set(
    modules
      .filter((_, i) => (roundIndices[i]?.length ?? 0) > 0)
      .map((m) => m.title),
  );
  const navIndices: readonly number[] =
    inRound && round !== null
      ? (roundIndices[round] ?? [])
      : lesson.steps.map((_, i) => i);
  const navSteps: NavStep[] = navIndices.map((i, n) => {
    const s = lesson.steps[i];
    if (inRound && roundModule && roundKind && roundName) {
      return {
        code: String(n + 1),
        title: s.title,
        subsection: whole ? roundName : `${roundModule.title} · ${roundName}`,
        status: statusOf(passProgressKey(s.tag, roundKind)),
      };
    }
    return {
      code: String(i + 1),
      title: s.title,
      // The step list groups by module (Part 2's sections), else the lesson.
      subsection: moduleOfStep(modules, i)?.title ?? lesson.name,
      status: literacyStepDone(s, progress)
        ? 'passed'
        : literacyStepTried(s, progress)
          ? 'attempted'
          : 'todo',
    };
  });

  /** A passed module's header in the step list opens its round again. */
  const groupAction = (subsection: string): NavGroupAction | null => {
    if (inRound) return null;
    const at = modules.findIndex((m) => m.title === subsection);
    const target = modules[at];
    const pass = target ? modulePass(target) : null;
    if (
      !target ||
      (pass !== 'create' && pass !== 'challenge') ||
      (roundIndices[at]?.length ?? 0) === 0 ||
      !moduleEchoPassed(target, progress)
    ) {
      return null;
    }
    return {
      label: ROUND_COPY[pass].start,
      status:
        roundMark(target, lesson, progress) === 'passed' ? 'passed' : 'todo',
      onPick: () => startRound(at),
    };
  };

  const about = useMemo(() => {
    const key = describeKey(
      notes.key.tonic,
      mode === 'minor' ? 'aeolian' : 'ionian',
    );
    return {
      activity: step.title,
      instruction: step.direction ?? '',
      chords: [],
      // Beginners meet "C Major" and "C Minor", not the modes' names.
      key: key && { ...key, title: keyName },
    };
  }, [step, notes.key.tonic, mode, keyName]);

  /** The keys, as tall as `maxHeight` allows at their real proportions. */
  const keyboardOf = (maxHeight: number) => (
    <>
      <LessonKeyboard
        range={keyRange}
        natural={{ aspect: KEY_ASPECT, maxHeight }}
        activeWhiteKeyColor={keyColor}
        activeBlackKeyColor={keyColor}
        hintNotes={kind === 'echo' || isReplay ? hintNotes : undefined}
        keyLabels={keyLabels}
        playingNotes={playingNotes}
        playedKeys={keysShown}
        enableClick={false}
        useContextNotes={false}
        onKeyPointerDown={onKeyPointerDown}
      />
      {kind === 'echo' && (
        <TypingHint
          octave={typingOctave}
          answer={onCreate || chordSteps ? null : answerLetters}
        />
      )}
    </>
  );
  const keyboard = keyboardOf(keyboardMax);

  // Part 2's full-width screens: the choices, and a step waiting for one.
  const fullScreen = (stacked: boolean): ReactNode => {
    if (intro && goal) {
      return (
        <LessonIntroCard
          key={`intro-${stacked}`}
          lessonName={lesson.name}
          goal={goal}
          modules={modules}
          withRound={withRound}
          keyColor={keyColor}
          stacked={stacked}
        />
      );
    }
    if (gate) {
      const at = gate.at;
      const target = at ? lesson.steps.findIndex((s) => s.tag === at) : -1;
      return (
        <ChoiceGate
          key={`gate-${stacked}`}
          missing={gate}
          onGo={target >= 0 ? () => goToStep(target) : null}
        />
      );
    }
    if (step.kind === 'chooseKey') {
      return (
        <ChooseKeyPanel
          heading="Choose your color"
          direction={step.direction}
          tonic={choices?.tonic ?? null}
          mode={choices?.mode ?? lesson.key.mode}
          onChoose={chooseTonic}
          onHear={() =>
            choices?.tonic &&
            hearKey(choices.tonic, choices.mode ?? lesson.key.mode)
          }
          stacked={stacked}
        />
      );
    }
    if (step.kind === 'chooseMode') {
      return (
        <ChooseModePanel
          heading="Choose major or minor"
          direction={step.direction}
          tonic={choices?.tonic ?? lesson.key.tonic}
          mode={choices?.mode ?? null}
          onChoose={chooseMode}
          stacked={stacked}
        />
      );
    }
    if (step.kind === 'chooseChords') {
      const chooser = step as LiteracyChooseChordsStep;
      const saved = progressionFor(lesson, choices, chooser.saveAs);
      return (
        <ChooseChordsPanel
          key={`${chooser.tag}-${chooserKey.tonic}-${chooserKey.mode}`}
          step={chooser}
          key_={chooserKey}
          keyColor={keyColor}
          saved={saved}
          playingBar={
            hearing === 'progression' && view.tick >= 0 && view.lit.length
              ? Math.floor(view.tick / PREVIEW_CHORD_TICKS)
              : null
          }
          onHearChord={(degree) => hearChords([degree], 'chord')}
          onHear={(degrees) => hearChords(degrees, 'progression')}
          onSave={saveChords}
          keyboard={
            <div data-literacy-keyboard className="pt-2">
              {keyboardOf(CHOOSER_KEYBOARD_HEIGHT)}
            </div>
          }
          stacked={stacked}
        />
      );
    }
    return null;
  };
  const hasFull =
    intro ||
    gate !== null ||
    kind === 'chooseKey' ||
    kind === 'chooseMode' ||
    kind === 'chooseChords';

  const resultSlot = (() => {
    if (!outcome || status !== 'result') return null;
    if (doneModule && doneRound && moduleDone !== null) {
      return (
        <ModuleDoneCard
          module={doneModule}
          round={doneRound}
          whole={whole ? { part: lesson.part } : null}
          last={
            outcome.pass === 'echo'
              ? { title: step.title, percent: outcome.result.percent }
              : null
          }
          steps={roundIndices[moduleDone]?.length ?? 0}
          keyColor={keyColor}
        />
      );
    }
    if (outcome.pass === 'create') {
      if (outcome.result.kind === 'empty') {
        return (
          <section
            data-guitar-result
            data-literacy-empty-call
            data-passed={false}
            className="my-auto flex flex-col gap-3 rounded-xl border border-white/[0.08] bg-[#151518] p-5"
          >
            <h2 className="text-2xl font-normal leading-8 text-[#e8e8f0]">
              Try again
            </h2>
            <p className="text-[15px] leading-6 text-white/55">
              {outcome.result.feedbackText}
            </p>
          </section>
        );
      }
      return (
        <CreateResultPanelSlot
          outcome={outcome}
          passMark={passMark}
          keyColor={keyColor}
          tonic={tonic}
          beatsPerBar={beatsPerBar}
          timeSignature={lesson.timeSignature}
        />
      );
    }
    const panel = resultModel ? (
      <GuitarResultPanel result={resultModel} passMarkPct={passMark} />
    ) : null;
    if (outcome.pass === 'challenge') {
      return (
        <div className="my-auto flex max-h-full min-h-0 flex-col gap-3 overflow-y-auto">
          {panel}
          <ChallengeSegments
            segments={outcome.result.segments}
            best={
              outcome.bestBefore === null
                ? null
                : Math.max(outcome.bestBefore, outcome.result.percent)
            }
          />
        </div>
      );
    }
    return panel;
  })();

  const announcement = doneModule
    ? `${whole ? `Part ${lesson.part} done!` : 'Module done!'} ${doneRound ? ROUND_COPY[doneRound].offer : ''}`
    : resultModel
      ? resultSummary(resultModel, passMark)
      : outcome?.pass === 'create'
        ? outcome.result.kind === 'empty'
          ? outcome.result.feedbackText
          : `${outcome.result.result.percent}%. ${outcome.result.passed ? 'Passed' : `Not yet: ${passMark}% passes`}.`
        : '';

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
        keyLabel: noKeyYet ? 'Your key' : keyName,
        keyColor,
        // In a round, its module (Part 1's, the round's name).
        subsection:
          inRound && roundModule && roundName
            ? whole
              ? roundName
              : roundModule.title
            : (step.section ?? ''),
        // Before the first step, the lesson's welcome.
        activity: intro ? `Welcome to Part ${lesson.part}` : step.title,
      }}
      nav={{
        sections: [],
        onSection: () => {},
        steps: navSteps,
        index: Math.max(0, navIndices.indexOf(stepIndex)),
        goToStep: (n) => goToStep(navIndices[n] ?? stepIndex),
        groupAction,
        practiceTrack: null,
        extra: !hasFull ? <SavedRollViewSwitch /> : undefined,
      }}
      banner={
        inRound && roundModule && roundKind ? (
          <RoundBanner
            module={roundModule}
            round={roundKind}
            whole={whole}
            keyColor={keyColor}
            onLeave={leaveRound}
            disabled={running}
          />
        ) : undefined
      }
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
      announcement={graded ? announcement : ''}
      slots={{
        full: hasFull ? fullScreen : null,
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
            headline={headline}
            compact={stacked}
            hubContent={hubContent}
            below={
              chordRows ? (
                <ChordBars
                  rows={chordRows}
                  keyColor={keyColor}
                  compact={stacked}
                />
              ) : notes.words.length === 0 && step.direction && !onCreate ? (
                // A Part 2 melody has no words: what to do, under the circle.
                <p
                  data-literacy-direction
                  className={cn(
                    'text-[15px] leading-6 text-white/55',
                    stacked ? 'text-left' : 'text-center',
                  )}
                >
                  {step.direction}
                </p>
              ) : undefined
            }
          />
        ),
        responseRef,
        rollRef,
        roll: (
          <GenrePianoRoll
            key={`roll-${step.tag}-${shownPass}-${runId}`}
            instrument="piano"
            showViewToggle={false}
            events={events}
            bars={(timeline.total - countIn) / bar}
            beatsPerBar={beatsPerBar}
            beatTicks={bar / beatsPerBar}
            timeSignature={lesson.timeSignature}
            pickupTicks={timeline.pickup.length}
            staves="treble"
            subdivision={running ? (onCreate ? 4 : 2) : 1}
            rowHeight={rowHeight}
            midiRangeMin={rollRange.min}
            midiRangeMax={rollRange.max}
            inTime={running && runKind !== null}
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
            bands={rollBands}
          />
        ),
        result: resultSlot,
        keyboard: step.kind === 'chooseChords' && !gate ? null : keyboard,
      }}
    />
  );
}

/** Pass 2's result: the call and the repeat, side by side. */
function CreateResultPanelSlot({
  outcome,
  passMark,
  keyColor,
  tonic,
  beatsPerBar,
  timeSignature,
}: {
  outcome: Extract<Outcome, { pass: 'create' }>;
  passMark: number;
  keyColor: string;
  tonic: number;
  beatsPerBar: number;
  timeSignature: [number, number];
}) {
  const graded = outcome.result;
  const comparison = useMemo(
    () =>
      graded.kind === 'empty'
        ? null
        : createComparison(
            outcome.create,
            outcome.transcription,
            graded,
            outcome.played,
          ),
    [graded, outcome],
  );
  const ref = useRef<HTMLDivElement>(null);
  const box = useElementSize(ref);
  if (graded.kind === 'empty' || !comparison) return null;
  return (
    <div ref={ref} className="flex min-h-0 min-w-0 flex-col">
      <CreateResultPanel
        percent={graded.result.percent}
        passed={graded.passed}
        passMark={passMark}
        feedback={graded.result.feedbackText}
        comparison={comparison}
        keyColor={keyColor}
        tonic={tonic}
        beatsPerBar={beatsPerBar}
        timeSignature={timeSignature}
        stacked={box.width > 0 && box.width < 560}
      />
    </div>
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

function TypingHint({
  octave,
  answer,
}: {
  octave: number;
  /** The answer's letters; null when there's none to give (a create pass). */
  answer: string | null;
}) {
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
      {answer !== null && answer !== '' && (
        <span data-literacy-answer-letters className="whitespace-nowrap">
          Answer: <span className="text-[#e8e8f0]">{answer}</span>
        </span>
      )}
    </p>
  );
}
