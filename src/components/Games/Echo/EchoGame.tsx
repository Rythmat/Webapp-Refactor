import {
  Music,
  Pause,
  Play,
  Settings,
  Sparkles,
  UserRound,
  Users,
} from 'lucide-react';
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import { startPianoSampler } from '@/audio/pianoSampler';
import { cn } from '@/components/utilities';
import { useUserRole } from '@/contexts/AuthContext/hooks/useUserRole';
import {
  melodyPads,
  taughtCall,
  type EchoLevelNumber,
} from '@/curriculum/engine/echo';
import { circleOfFifths } from '@/curriculum/engine/musicLiteracy/choices';
import { keyName } from '@/curriculum/musicLiteracy/ChooseKeyPanel';
import { ECHO_STOP_ID } from '@/curriculum/musicLiteracy/literacyPath';
import { markStopDone } from '@/curriculum/musicLiteracy/stopDone';
import { useAwardArcadeExperience } from '@/hooks/data/experience/useAwardExperience';
import { ArcadeGameHeader } from '../ArcadeGameHeader';
import { EchoGate, SECTION_TITLE } from './EchoGate';
import { EchoSettingsSheet } from './EchoSettingsSheet';
import { EchoSetup } from './EchoSetup';
import { EchoStage } from './EchoStage';
import type { EchoSectionName } from './echoCalls';
import {
  CHORD_ECHO_ROUNDS,
  MELODY_ECHO_ROUNDS,
  echoFlowReducer,
  newEchoFlow,
  runCallsOf,
  wantsRun,
  type EchoAudience,
  type EchoLeader,
} from './echoFlow';
import { gradeRunCallForClass } from './echoOutcome';
import {
  highScoreOf,
  nextLevelOf,
  readEchoProgress,
  recordSongFinished,
  recordStreak,
  rememberSetup,
  type EchoKeyChoice,
} from './echoProgress';
import { inputFor, useEchoSettings } from './echoSettings';
import { EchoInputSurface } from './input';
import { useEchoRun } from './useEchoRun';
import './echoGame.css';

// ── Echo ───────────────────────────────────────────────────────────────────
// The Arcade's call-and-response creation game (docs/echo-game.md), the
// last stop of the Start Here path. The screens, in order (echoFlow.ts):
//
//   setup → Melody Echo (8 rounds) → Chord Echo (6) → the Echo Boss → the
//   gate → Make Your Song
//
// This component holds the game together: the flow, the transport runs
// (useEchoRun.ts: a run for each round, one for the boss's four calls),
// the timers that move the game on (a section's title card, a round's
// result), the device's progress and settings, and the
// Arcade's header with the streak and High Score.
//
// PAUSE AND PLAY
// The header's Pause holds the game wherever it is, from the first title
// card to the boss's last call: between activities (a title card, a
// round's result, the boss's entrance) nothing moves on until Play; over a
// call the music stops, and Play plays the call again from its count-in.
// Game Settings, opened over the music, pauses it the same way.
//
// PRESENTER MODE (docs/echo-classroom.md): a teacher may present Echo to
// their class instead (setup's Who's Playing?). The class plays along with
// the big screen, so an answer played here is graded the class's way
// (quantized), and one that isn't is the teacher's to judge. The header's
// leader switch has the teacher make the calls. Nobody's XP, High Score or
// progress moves: the players aren't signed in here.
//
// When the student finishes their song, the level is done: the next one
// opens, Start Here's Echo stop is done, and the song's XP is counted.

const MakeYourSong = lazy(() =>
  import('@/components/Games/Echo/makeYourSong/MakeYourSong').then(
    ({ MakeYourSong }) => ({ default: MakeYourSong }),
  ),
);

/** How long a section's title card shows before its first round. */
export const INTRO_MS = 2600;
/** How long a round's result shows before the next call. */
export const RESULT_MS = 2400;

const SECTION_LINE: Readonly<Record<EchoSectionName, string>> = {
  melodyEcho: `Atlas plays a tune. Play it back! ${MELODY_ECHO_ROUNDS} rounds.`,
  chordEcho: `Now chords. Atlas plays two; play them back! ${CHORD_ECHO_ROUNDS} rounds.`,
};

/** Who may present Echo to a class. */
const PRESENTERS = new Set(['teacher', 'admin', 'editor']);

const newSeed = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export interface EchoGameProps {
  /** Where each game's calls come from (a test pins it). */
  makeSeed?: () => string;
}

export default function EchoGame({ makeSeed = newSeed }: EchoGameProps) {
  const [progress, setProgress] = useState(readEchoProgress);
  const [settings] = useEchoSettings();
  const [flow, dispatch] = useReducer(echoFlowReducer, undefined, () => {
    const saved = readEchoProgress().last;
    return newEchoFlow(saved?.level ?? 1, saved?.key);
  });
  const [paused, setPaused] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const role = useUserRole();
  const canPresent = !!role && PRESENTERS.has(role);
  /** The level's High Score when this game began: beaten, it's new. */
  const highScoreBefore = useRef(0);
  /** Games begun: what the gate's XP and the song's finish happen once for. */
  const game = useRef(0);
  const flowRef = useRef(flow);
  flowRef.current = flow;

  const { screen, level, key } = flow;
  const solo = flow.audience === 'solo';
  const input = inputFor(settings, level);
  const keyColor = useMemo(() => melodyPads(key).keyColor, [key]);
  const palette = useMemo(
    () => circleOfFifths(key.mode).map((k) => k.color),
    [key.mode],
  );

  // ── A game begins ──
  const begin = useCallback(
    (
      nextLevel: EchoLevelNumber,
      nextKey: EchoKeyChoice,
      who: { audience: EchoAudience; leader: EchoLeader } = {
        audience: flowRef.current.audience,
        leader: flowRef.current.leader,
      },
    ) => {
      // On the press itself, so the audio may start.
      void startPianoSampler().catch(() => {});
      setProgress(rememberSetup(nextLevel, nextKey));
      highScoreBefore.current = highScoreOf(readEchoProgress(), nextLevel);
      game.current += 1;
      setPaused(false);
      dispatch({
        type: 'begin',
        level: nextLevel,
        key: nextKey,
        seed: makeSeed(),
        ...who,
        // In development, `?boss` goes straight to the Echo Boss.
        ...(import.meta.env.DEV &&
        new URLSearchParams(window.location.search).has('boss')
          ? { skipTo: 'boss' as const }
          : {}),
      });
    },
    [makeSeed],
  );

  // ── The runs ──
  /** The boss call a run starts on (a resumed fight starts mid-way). */
  const runFrom = useRef(0);
  const run = useEchoRun({
    grade: solo ? undefined : gradeRunCallForClass,
    onUnanswered: () => dispatch({ type: 'unanswered' }),
    teach: (placed, played) =>
      taughtCall(
        placed.call.kind,
        played,
        { level, key, tempo: placed.timeline.tempo },
        {
          start: placed.timeline.call.start,
          tempo: placed.timeline.tempo,
          snap: settings.classSnap,
        },
      ),
    onTaught: (_index, call) => {
      if (call) {
        dispatch({ type: 'taught', run: flowRef.current.run, call });
      } else {
        // Nothing heard: stop here, and say so.
        run.stop();
        dispatch({ type: 'noCall' });
      }
    },
    onGraded: (index, outcome) => {
      const now = flowRef.current;
      if (now.screen.kind === 'round') {
        dispatch({ type: 'graded', outcome });
      } else if (now.screen.kind === 'boss') {
        dispatch({
          type: 'bossGraded',
          index: runFrom.current + index,
          outcome,
        });
      }
    },
  });
  const wanted = wantsRun(flow);
  const halted = paused || settingsOpen;
  const { start: startRun, stop: stopRun } = run;
  useEffect(() => {
    if (!wanted || halted) return;
    const now = flowRef.current;
    runFrom.current = now.screen.kind === 'boss' ? now.screen.at : 0;
    startRun({
      id: now.run,
      calls: runCallsOf(now),
      groove: settings.groove,
    });
    return () => stopRun();
    // A run starts for each run asked for (flow.run), and again on resume.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flow.run, wanted, halted, startRun, stopRun]);

  // ── The timers that move the game on ──
  useEffect(() => {
    if (halted) return;
    let wait: number | null = null;
    let event: Parameters<typeof dispatch>[0] | null = null;
    if (screen.kind === 'intro') {
      wait = INTRO_MS;
      event = { type: 'go' };
    } else if (screen.kind === 'round' && screen.outcome) {
      wait = RESULT_MS;
      event = { type: 'next' };
    } else if (screen.kind === 'round' && screen.noCall) {
      // "No call heard": the teacher plays it again.
      wait = RESULT_MS;
      event = { type: 'judge', verdict: 'again' };
    }
    // The boss's entrance and its end move on with its art (EchoStage).
    if (wait === null || !event) return;
    const next = event;
    const timer = setTimeout(() => dispatch(next), wait);
    return () => clearTimeout(timer);
  }, [screen, halted]);

  // ── The High Score, kept as it's beaten ──
  const best = flow.stats.bestStreak;
  useEffect(() => {
    if (!solo) return;
    if (best > 0 && recordStreak(level, best)) setProgress(readEchoProgress());
  }, [best, level, solo]);
  const highScore = solo ? Math.max(highScoreOf(progress, level), best) : best;

  // ── The gate: the game's XP, awarded once ──
  const awardXP = useAwardArcadeExperience();
  const awarded = useRef(0);
  useEffect(() => {
    if (screen.kind !== 'gate' || awarded.current === game.current) return;
    awarded.current = game.current;
    if (solo) awardXP.mutateAsync().catch(() => {});
  }, [screen.kind, awardXP, solo]);

  // ── Make Your Song's way back ──
  const finished = useRef(0);
  const onSongFinished = useCallback(() => {
    const now = flowRef.current;
    if (finished.current === game.current) return;
    finished.current = game.current;
    // A class's song is the class's: the teacher's own progress stays put.
    if (now.audience === 'solo') {
      setProgress(recordSongFinished(now.level));
      markStopDone(ECHO_STOP_ID);
    }
    dispatch({ type: 'songFinished' });
  }, []);
  const nextLevel = nextLevelOf(level);

  // Opened over the music, Game Settings pauses it; over a title card or a
  // result, it only holds the game until it closes.
  const openSettings = (open: boolean) => {
    if (open && wanted) setPaused(true);
    setSettingsOpen(open);
  };

  // ── Pause and Play: the title cards, the rounds and the boss ──
  const pausable =
    screen.kind === 'intro' ||
    screen.kind === 'round' ||
    screen.kind === 'bossIntro' ||
    screen.kind === 'boss';
  useEffect(() => {
    if (!pausable) setPaused(false);
  }, [pausable]);

  return (
    <div className="flex min-h-0 flex-1 flex-col" data-echo-game>
      <ArcadeGameHeader
        title="Echo"
        controls={
          <>
            {pausable && (
              <button
                type="button"
                aria-pressed={paused}
                data-echo-pause-button
                onClick={() => setPaused((p) => !p)}
                className="flex items-center gap-1.5 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/70 transition-colors hover:text-white"
              >
                {paused ? (
                  <Play aria-hidden className="size-3.5" fill="currentColor" />
                ) : (
                  <Pause aria-hidden className="size-3.5" fill="currentColor" />
                )}
                {paused ? 'Play' : 'Pause'}
              </button>
            )}
            {!solo && screen.kind !== 'setup' && (
              <LeaderSwitch
                leader={flow.leader}
                onChange={(leader) => dispatch({ type: 'leader', leader })}
              />
            )}
            {screen.kind !== 'setup' && (
              <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/70">
                <span
                  aria-hidden
                  className="size-2 rounded-full"
                  style={{ backgroundColor: keyColor }}
                />
                Level {level} · {keyName(key.tonic, key.mode)}
                {!solo && ' · Presenting'}
              </span>
            )}
            <button
              type="button"
              aria-haspopup="dialog"
              aria-expanded={settingsOpen}
              data-echo-settings-button
              onClick={() => openSettings(true)}
              className="flex items-center gap-1.5 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/70 transition-colors hover:text-white"
            >
              <Settings aria-hidden className="size-3.5" />
              Game Settings
            </button>
          </>
        }
        stats={
          solo
            ? [
                { label: 'XP', value: `+${flow.stats.xp}` },
                { label: 'High Score', value: highScore },
              ]
            : [{ label: 'Best Streak', value: highScore }]
        }
      />

      <div className="relative flex min-h-0 flex-1 flex-col">
        {screen.kind === 'setup' && (
          <EchoSetup
            key={`${flow.level}-${flow.key.tonic}-${flow.key.mode}`}
            progress={progress}
            initialLevel={flow.level}
            initialKey={flow.key}
            initialAudience={flow.audience}
            initialLeader={flow.leader}
            canPresent={canPresent}
            inputFor={(n) => inputFor(settings, n)}
            onStart={begin}
          />
        )}
        {screen.kind === 'intro' && (
          <SectionIntro
            section={screen.section}
            keyColor={keyColor}
            onGo={() => dispatch({ type: 'go' })}
          />
        )}
        {(screen.kind === 'round' ||
          screen.kind === 'bossIntro' ||
          screen.kind === 'boss') && (
          <EchoStage
            flow={flow}
            input={input}
            run={run}
            keyColor={keyColor}
            paused={paused}
            onJudge={(verdict) => dispatch({ type: 'judge', verdict })}
            onFight={() => dispatch({ type: 'fight' })}
            onBossRetry={() => dispatch({ type: 'bossRetry' })}
            onBossWon={() => dispatch({ type: 'toGate' })}
            onNoteOn={run.noteOn}
            onNoteOff={run.noteOff}
          />
        )}
        {screen.kind === 'gate' && (
          <EchoGate
            stats={flow.stats}
            keyColor={keyColor}
            palette={palette}
            newHighScore={flow.stats.bestStreak > highScoreBefore.current}
            onMakeYourSong={() => dispatch({ type: 'toSong' })}
          />
        )}
        {screen.kind === 'song' && (
          <Suspense fallback={<SongLoading />}>
            <MakeYourSong
              level={level}
              keyChoice={key}
              input={input}
              scaffolding={settings.scaffolding}
              renderInput={(handlers) => (
                <EchoInputSurface
                  input={input}
                  kind={handlers.kind}
                  keyChoice={key}
                  onNoteOn={(note) => handlers.noteOn(note.midi, note.velocity)}
                  onNoteOff={(note) => handlers.noteOff(note.midi)}
                  // Make Your Song sounds each key on its track's own
                  // instrument; the lesson piano would double it.
                  sound={false}
                />
              )}
              onSongFinished={onSongFinished}
              onPlayAgain={() => begin(level, key)}
              onNextLevel={nextLevel ? () => begin(nextLevel, key) : null}
              onExit={() => dispatch({ type: 'exit' })}
            />
          </Suspense>
        )}
        {pausable && paused && (
          <PausedCard midCall={wanted} onPlay={() => setPaused(false)} />
        )}
      </div>

      <EchoSettingsSheet
        open={settingsOpen}
        onOpenChange={openSettings}
        level={level}
        audience={flow.audience}
      />
    </div>
  );
}

/** A section's title card: its name, what to do, and Go. */
function SectionIntro({
  section,
  keyColor,
  onGo,
}: {
  section: EchoSectionName;
  keyColor: string;
  onGo: () => void;
}) {
  const Icon = section === 'melodyEcho' ? Music : Sparkles;
  return (
    <section
      aria-label={SECTION_TITLE[section]}
      data-echo-screen="intro"
      data-echo-section={section}
      className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 p-6 text-center"
    >
      <span
        className="echo-pop flex size-20 items-center justify-center rounded-full"
        style={{
          backgroundColor: `color-mix(in oklab, ${keyColor} 25%, transparent)`,
        }}
      >
        <Icon aria-hidden className="size-9" style={{ color: keyColor }} />
      </span>
      <h2 className="echo-pop text-[clamp(30px,3.6vw,48px)] leading-tight text-[#e8e8f0]">
        {SECTION_TITLE[section]}
      </h2>
      <p className="max-w-md text-[15px] leading-6 text-white/60">
        {SECTION_LINE[section]}
      </p>
      <button
        type="button"
        onClick={onGo}
        className={cn(
          'mt-1 inline-flex h-12 items-center rounded-full bg-white px-7 text-base font-semibold text-[#101012] transition-transform hover:scale-105',
        )}
      >
        Let’s Go!
      </button>
    </section>
  );
}

/** Who makes the class's calls: Atlas, or the teacher. From the next call. */
function LeaderSwitch({
  leader,
  onChange,
}: {
  leader: EchoLeader;
  onChange: (leader: EchoLeader) => void;
}) {
  const options: { value: EchoLeader; label: string; Icon: typeof Users }[] = [
    { value: 'atlas', label: 'Atlas Leads', Icon: Users },
    { value: 'teacher', label: 'I Lead', Icon: UserRound },
  ];
  return (
    <span
      role="radiogroup"
      aria-label="Who leads the calls"
      data-echo-leader={leader}
      className="flex items-center rounded-full border border-white/10 bg-black/20 p-0.5 text-xs"
    >
      {options.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={leader === value}
          data-echo-leader-option={value}
          onClick={() => onChange(value)}
          className={cn(
            'flex items-center gap-1.5 rounded-full px-2.5 py-0.5 transition-colors',
            leader === value
              ? 'bg-white text-[#101012]'
              : 'text-white/70 hover:text-white',
          )}
        >
          <Icon aria-hidden className="size-3.5" />
          {label}
        </button>
      ))}
    </span>
  );
}

/** Paused: Play goes on from here, or plays the call again from the top. */
function PausedCard({
  midCall,
  onPlay,
}: {
  /** Paused over a call (its music stopped), not between activities. */
  midCall: boolean;
  onPlay: () => void;
}) {
  return (
    <div
      data-echo-paused
      className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-[#101012]/85 p-6 text-center backdrop-blur-sm"
    >
      <p className="text-3xl text-[#e8e8f0]">Paused</p>
      <button
        type="button"
        onClick={onPlay}
        className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-7 text-base font-semibold text-[#101012] transition-transform hover:scale-105"
      >
        <Play aria-hidden className="size-4" fill="currentColor" />
        Play
      </button>
      <p className="text-sm text-white/50">
        {midCall
          ? 'Atlas plays the call again from the count-in.'
          : 'The game waits here until you press Play.'}
      </p>
    </div>
  );
}

function SongLoading() {
  return (
    <div className="flex flex-1 items-center justify-center text-sm text-white/50">
      Opening Make Your Song…
    </div>
  );
}
