/* eslint-disable react/jsx-sort-props */
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { StreakTracker } from './scoring/StreakTracker';
import { useArcadeStreakReward } from './scoring/useArcadeStreakReward';
import '@/components/learn/learn.css';

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
  const { streak, target, registerCorrect, registerWrong } =
    useArcadeStreakReward('chroma');
  return (
    <GameShell>
      <div className="relative flex-1 min-h-0">
        <StreakTracker count={streak} target={target} />
        <Chroma onCorrect={registerCorrect} onWrong={registerWrong} />
      </div>
    </GameShell>
  );
}

export function FoliPage() {
  const { streak, target, registerCorrect, registerWrong } =
    useArcadeStreakReward('foli');
  return (
    <GameShell>
      <div className="relative flex-1 min-h-0">
        <StreakTracker count={streak} target={target} />
        <Foli onCorrect={registerCorrect} onWrong={registerWrong} />
      </div>
    </GameShell>
  );
}

export function BoardChoicePage() {
  const { streak, target, registerCorrect, registerWrong } =
    useArcadeStreakReward('board_choice');
  return (
    <GameShell>
      <div className="relative flex-1 min-h-0">
        <StreakTracker count={streak} target={target} />
        <BoardChoiceGame
          arcade
          onCorrect={registerCorrect}
          onWrong={registerWrong}
        />
      </div>
    </GameShell>
  );
}

export function ChordConnectionPage() {
  const { streak, target, registerCorrect, registerWrong } =
    useArcadeStreakReward('chord_connection');
  return (
    <GameShell>
      <div className="relative flex-1 min-h-0">
        <StreakTracker count={streak} target={target} />
        <ChordConnectionGame
          arcade
          onCorrect={registerCorrect}
          onWrong={registerWrong}
        />
      </div>
    </GameShell>
  );
}

export function ChordPressPage() {
  const { streak, target, registerCorrect, registerWrong } =
    useArcadeStreakReward('chord_press');
  return (
    <GameShell>
      <div className="relative flex-1 min-h-0">
        <StreakTracker count={streak} target={target} />
        <ChordPressGame
          arcade
          enableComputerKeyboard
          onCorrect={registerCorrect}
          onWrong={registerWrong}
        />
      </div>
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
  const { streak, target, registerCorrect, registerWrong } =
    useArcadeStreakReward('groove_lab');
  return (
    <GameShell>
      <div className="relative flex-1 min-h-0">
        <StreakTracker count={streak} target={target} />
        <GrooveLab onCorrect={registerCorrect} onWrong={registerWrong} />
      </div>
    </GameShell>
  );
}

export function WaveSculptorPage() {
  const awardXP = useAwardArcadeExperience();
  const { streak, target, registerCorrect } =
    useArcadeStreakReward('wave_sculptor');

  const handleComplete = useCallback(async () => {
    await awardXP.mutateAsync().catch(() => {});
  }, [awardXP]);

  return (
    <GameShell>
      <div className="relative flex-1 min-h-0">
        <StreakTracker count={streak} target={target} />
        <WaveSculptor
          onComplete={handleComplete}
          onRoundWon={registerCorrect}
        />
      </div>
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
