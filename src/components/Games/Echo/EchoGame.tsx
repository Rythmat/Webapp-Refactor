import { Music, Settings, Sparkles } from 'lucide-react';
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
import { melodyPads, type EchoLevelNumber } from '@/curriculum/engine/echo';
import { circleOfFifths } from '@/curriculum/engine/musicLiteracy/choices';
import { keyName } from '@/curriculum/musicLiteracy/ChooseKeyPanel';
import { ECHO_STOP_ID } from '@/curriculum/musicLiteracy/literacyPath';
import { markStopDone } from '@/curriculum/musicLiteracy/stopDone';
import { useAwardArcadeExperience } from '@/hooks/data/experience/useAwardExperience';
import { ArcadeGameHeader } from '../ArcadeGameHeader';
import { EchoBossIntro } from './EchoBoss';
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
} from './echoFlow';
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
// result, the beaten boss), the device's progress and settings, and the
// Arcade's header with the streak and High Score. A pause (or Game
// Settings, opened mid-game) stops the music; Resume plays the call again
// from its count-in.
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
/** How long the beaten boss spins before the gate. */
export const BOSS_WON_MS = 2800;

const SECTION_LINE: Readonly<Record<EchoSectionName, string>> = {
  melodyEcho: `Atlas plays a tune. Play it back! ${MELODY_ECHO_ROUNDS} rounds.`,
  chordEcho: `Now chords. Atlas plays two; play them back! ${CHORD_ECHO_ROUNDS} rounds.`,
};

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
  /** The level's High Score when this game began: beaten, it's new. */
  const highScoreBefore = useRef(0);
  /** Games begun: what the gate's XP and the song's finish happen once for. */
  const game = useRef(0);
  const flowRef = useRef(flow);
  flowRef.current = flow;

  const { screen, level, key } = flow;
  const input = inputFor(settings, level);
  const keyColor = useMemo(() => melodyPads(level, key).keyColor, [level, key]);
  const palette = useMemo(
    () => circleOfFifths(key.mode).map((k) => k.color),
    [key.mode],
  );

  // ── A game begins ──
  const begin = useCallback(
    (nextLevel: EchoLevelNumber, nextKey: EchoKeyChoice) => {
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
      });
    },
    [makeSeed],
  );

  // ── The runs ──
  /** The boss call a run starts on (a resumed fight starts mid-way). */
  const runFrom = useRef(0);
  const run = useEchoRun({
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
    } else if (screen.kind === 'boss' && flow.stats.boss.outcome === 'won') {
      wait = BOSS_WON_MS;
      event = { type: 'toGate' };
    }
    if (wait === null || !event) return;
    const next = event;
    const timer = setTimeout(() => dispatch(next), wait);
    return () => clearTimeout(timer);
  }, [screen, halted, flow.stats.boss.outcome]);

  // ── The High Score, kept as it's beaten ──
  const best = flow.stats.bestStreak;
  useEffect(() => {
    if (best > 0 && recordStreak(level, best)) setProgress(readEchoProgress());
  }, [best, level]);
  const highScore = Math.max(highScoreOf(progress, level), best);

  // ── The gate: the game's XP, awarded once ──
  const awardXP = useAwardArcadeExperience();
  const awarded = useRef(0);
  useEffect(() => {
    if (screen.kind !== 'gate' || awarded.current === game.current) return;
    awarded.current = game.current;
    awardXP.mutateAsync().catch(() => {});
  }, [screen.kind, awardXP]);

  // ── Make Your Song's way back ──
  const finished = useRef(0);
  const onSongFinished = useCallback(() => {
    const now = flowRef.current;
    if (finished.current === game.current) return;
    finished.current = game.current;
    setProgress(recordSongFinished(now.level));
    markStopDone(ECHO_STOP_ID);
    dispatch({ type: 'songFinished' });
  }, []);
  const nextLevel = nextLevelOf(level);

  // Opened over the music, Game Settings pauses it; over a title card or a
  // result, it only holds the game until it closes.
  const openSettings = (open: boolean) => {
    if (open && wanted) setPaused(true);
    setSettingsOpen(open);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col" data-echo-game>
      <ArcadeGameHeader
        title="Echo"
        controls={
          <>
            {screen.kind !== 'setup' && (
              <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/70">
                <span
                  aria-hidden
                  className="size-2 rounded-full"
                  style={{ backgroundColor: keyColor }}
                />
                Level {level} · {keyName(key.tonic, key.mode)}
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
        stats={[
          { label: 'XP', value: `+${flow.stats.xp}` },
          { label: 'High Score', value: highScore },
        ]}
      />

      <div className="relative flex min-h-0 flex-1 flex-col">
        {screen.kind === 'setup' && (
          <EchoSetup
            key={`${flow.level}-${flow.key.tonic}-${flow.key.mode}`}
            progress={progress}
            initialLevel={flow.level}
            initialKey={flow.key}
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
        {(screen.kind === 'round' || screen.kind === 'boss') && (
          <EchoStage
            flow={flow}
            input={input}
            run={run}
            keyColor={keyColor}
            paused={paused}
            onPause={() => setPaused(true)}
            onResume={() => setPaused(false)}
            onBossRetry={() => dispatch({ type: 'bossRetry' })}
            onNoteOn={run.noteOn}
            onNoteOff={run.noteOff}
          />
        )}
        {screen.kind === 'bossIntro' && (
          <EchoBossIntro
            color={keyColor}
            onFight={() => dispatch({ type: 'fight' })}
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
                  level={level}
                  keyChoice={key}
                  onNoteOn={(note) => handlers.noteOn(note.midi, note.velocity)}
                  onNoteOff={(note) => handlers.noteOff(note.midi)}
                />
              )}
              onSongFinished={onSongFinished}
              onPlayAgain={() => begin(level, key)}
              onNextLevel={nextLevel ? () => begin(nextLevel, key) : null}
              onExit={() => dispatch({ type: 'exit' })}
            />
          </Suspense>
        )}
      </div>

      <EchoSettingsSheet
        open={settingsOpen}
        onOpenChange={openSettings}
        level={level}
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

function SongLoading() {
  return (
    <div className="flex flex-1 items-center justify-center text-sm text-white/50">
      Opening Make Your Song…
    </div>
  );
}
