/* eslint-disable react/jsx-sort-props */
import { lazy, Suspense, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SpectrumBar } from '@/components/art/light/SpectrumLight';
import TubesCursor from '@/components/ui/tubes-cursor';
import { GameRoutes } from '@/constants/routes';
import { useAwardArcadeExperience } from '@/hooks/data/experience/useAwardExperience';
import { LearnInputProvider } from '@/learn/context/LearnInputContext';
import { BoardChoiceGame } from './BoardChoiceGame';
import { ChordConnectionGame } from './ChordConnectionGame';
import { ChordPressGame } from './ChordPressGame';
import Constellations from './ContourTrace/ContourTrace';
import Foli from './Foli';
import GrooveLab from './GrooveLab/GrooveLab';
import HarmonicStrings from './HarmonicStrings/HarmonicStrings';
import MajorArcanum from './MajorArcanum/MajorArcanum';
import { PlayAlong } from './PlayAlong';
import SignalFlow from './SignalFlow/SignalFlow';
import WaveSculptor from './WaveSculptor/WaveSculptor';
import { ARCADE_ROOT } from './arcadeChrome';
import Chroma from './chroma';
import {
  ArcadeStreakContext,
  type ArcadeStreakState,
} from './scoring/ArcadeStreak';
import { useArcadeStreakReward } from './scoring/useArcadeStreakReward';
import '@/components/learn/learn.css';

// Echo is its own chunk: its engine, contours and screens load only when
// it opens.
const EchoGame = lazy(() => import('./Echo/EchoGame'));

/**
 * A page's streak, as its game's header shows it (scoring/ArcadeStreak.tsx):
 * the strip under the bar, and the banner when a streak is won.
 */
function streakState(
  reward: ReturnType<typeof useArcadeStreakReward>,
  ownWinSound = false,
): ArcadeStreakState {
  return {
    count: reward.streak,
    target: reward.target,
    win: reward.win,
    sessionXp: reward.sessionXp,
    ownWinSound,
  };
}

// Full-bleed arcade shell: the game fills the whole window it's given so its
// header bar spans the full width (matching Major Arcanum). Navigation back to
// the arcade lives on each game's ArcadeGameHeader, not here.
function GameShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`learn-root flex h-full w-full flex-col overflow-hidden ${ARCADE_ROOT}`}
    >
      {children}
    </div>
  );
}

export function ChromaPage() {
  const reward = useArcadeStreakReward('chroma');
  // Chroma plays its win on its own lead: an arpeggio.
  return (
    <GameShell>
      <ArcadeStreakContext.Provider value={streakState(reward, true)}>
        <div className="relative flex-1 min-h-0">
          <Chroma
            onCorrect={reward.registerCorrect}
            onWrong={reward.registerWrong}
          />
        </div>
      </ArcadeStreakContext.Provider>
    </GameShell>
  );
}

export function FoliPage() {
  const reward = useArcadeStreakReward('foli');
  const { registerCorrect, registerWrong } = reward;
  return (
    <GameShell>
      <ArcadeStreakContext.Provider value={streakState(reward)}>
        <div className="relative flex-1 min-h-0">
          <Foli
            onCorrect={registerCorrect}
            onWrong={registerWrong}
            onRestart={reward.reset}
          />
        </div>
      </ArcadeStreakContext.Provider>
    </GameShell>
  );
}

export function BoardChoicePage() {
  const reward = useArcadeStreakReward('board_choice');
  const { registerCorrect, registerWrong } = reward;
  return (
    <GameShell>
      <ArcadeStreakContext.Provider value={streakState(reward)}>
        <div className="relative flex-1 min-h-0">
          <BoardChoiceGame
            arcade
            onCorrect={registerCorrect}
            onWrong={registerWrong}
          />
        </div>
      </ArcadeStreakContext.Provider>
    </GameShell>
  );
}

export function ChordConnectionPage() {
  const reward = useArcadeStreakReward('chord_connection');
  const { registerCorrect, registerWrong } = reward;
  return (
    <GameShell>
      <ArcadeStreakContext.Provider value={streakState(reward)}>
        <div className="relative flex-1 min-h-0">
          <ChordConnectionGame
            arcade
            onCorrect={registerCorrect}
            onWrong={registerWrong}
          />
        </div>
      </ArcadeStreakContext.Provider>
    </GameShell>
  );
}

export function ChordPressPage() {
  const reward = useArcadeStreakReward('chord_press');
  const { registerCorrect, registerWrong } = reward;
  return (
    <GameShell>
      <ArcadeStreakContext.Provider value={streakState(reward)}>
        <div className="relative flex-1 min-h-0">
          <ChordPressGame
            arcade
            enableComputerKeyboard
            onCorrect={registerCorrect}
            onWrong={registerWrong}
          />
        </div>
      </ArcadeStreakContext.Provider>
    </GameShell>
  );
}

export function PlayAlongPage() {
  const awardXP = useAwardArcadeExperience();

  const handleComplete = useCallback(
    async (isComplete: boolean) => {
      if (isComplete) {
        await awardXP.mutateAsync().catch(() => {});
      }
    },
    [awardXP],
  );

  return (
    <LearnInputProvider detectionMode="polyphonic">
      <GameShell>
        <PlayAlong arcade onActivityCompleteChange={handleComplete} />
      </GameShell>
    </LearnInputProvider>
  );
}

export function MajorArcanumPage() {
  // Major Arcanum shows its own in-window score screen (accuracy + Play Again)
  // when a round ends, so no page-level completion screen is needed here.
  return (
    <div
      className="learn-root flex h-full w-full flex-col overflow-hidden"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      <MajorArcanum />
    </div>
  );
}

export function ConstellationsPage() {
  const navigate = useNavigate();
  // Bumped on every round start: 0 means the player hasn't pressed Start yet,
  // and each later value re-randomizes the tube colours.
  const [roundKey, setRoundKey] = useState(0);

  const handleRoundStart = useCallback(() => {
    setRoundKey((k) => k + 1);
  }, []);

  return (
    <div
      className={`learn-root flex h-full w-full flex-col overflow-hidden ${ARCADE_ROOT}`}
    >
      <div className="relative flex-1 min-h-0">
        <Constellations
          onRoundStart={handleRoundStart}
          onExit={() => navigate(GameRoutes.root())}
          // Mounted only once the round is under way, so neither the tubes'
          // load-in sweep nor the cursor trail shows on the ready screen, and
          // passed as a body overlay so it stays below the header bar.
          bodyOverlay={
            roundKey > 0 ? (
              <TubesCursor
                colorKey={roundKey}
                className="absolute inset-0 z-[3] opacity-60 pointer-events-none"
              />
            ) : null
          }
        />
      </div>
    </div>
  );
}

export function GrooveLabPage() {
  const reward = useArcadeStreakReward('groove_lab');
  const { registerCorrect, registerWrong } = reward;
  return (
    <GameShell>
      <ArcadeStreakContext.Provider value={streakState(reward)}>
        <div className="relative flex-1 min-h-0">
          <GrooveLab
            onCorrect={registerCorrect}
            onWrong={registerWrong}
            onRestart={reward.reset}
          />
        </div>
      </ArcadeStreakContext.Provider>
    </GameShell>
  );
}

export function WaveSculptorPage() {
  const awardXP = useAwardArcadeExperience();
  const reward = useArcadeStreakReward('wave_sculptor');
  const { registerCorrect } = reward;

  const handleComplete = useCallback(async () => {
    await awardXP.mutateAsync().catch(() => {});
  }, [awardXP]);

  return (
    <GameShell>
      <ArcadeStreakContext.Provider value={streakState(reward)}>
        <div className="relative flex-1 min-h-0">
          <WaveSculptor
            onComplete={handleComplete}
            onRoundWon={registerCorrect}
          />
        </div>
      </ArcadeStreakContext.Provider>
    </GameShell>
  );
}

export function HarmonicStringsPage() {
  const awardXP = useAwardArcadeExperience();

  const handleComplete = useCallback(async () => {
    await awardXP.mutateAsync().catch(() => {});
  }, [awardXP]);

  return (
    <GameShell>
      <HarmonicStrings onComplete={handleComplete} />
    </GameShell>
  );
}

export function SignalFlowPage() {
  const awardXP = useAwardArcadeExperience();

  const handleComplete = useCallback(async () => {
    await awardXP.mutateAsync().catch(() => {});
  }, [awardXP]);

  return (
    <GameShell>
      <SignalFlow onComplete={handleComplete} />
    </GameShell>
  );
}

export function EchoPage() {
  return (
    <LearnInputProvider detectionMode="polyphonic" instrument="piano">
      <GameShell>
        <Suspense
          fallback={
            <div className="grid flex-1 place-items-center">
              <SpectrumBar label="Loading Echo" />
            </div>
          }
        >
          <EchoGame />
        </Suspense>
      </GameShell>
    </LearnInputProvider>
  );
}
