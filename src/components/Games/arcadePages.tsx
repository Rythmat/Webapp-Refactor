/* eslint-disable react/jsx-sort-props */
import { ArrowLeft } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
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

function BackToArcade() {
  const navigate = useNavigate();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => navigate(GameRoutes.root())}
      className="gap-2 text-muted-foreground"
    >
      <ArrowLeft size={16} />
      Back to Arcade
    </Button>
  );
}

function GameShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`learn-root flex flex-col h-full overflow-y-auto px-8 pb-12 ${ARCADE_ROOT}`}
    >
      <div className="mb-4 pt-6">
        <BackToArcade />
      </div>
      <div className="mx-auto flex w-full min-h-0 max-w-5xl flex-1 flex-col">
        {children}
      </div>
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
          className="mx-auto max-w-5xl"
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
          className="mx-auto max-w-5xl"
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
          className="mx-auto max-w-5xl"
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
        <PlayAlong onActivityCompleteChange={handleComplete} />
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
        />
        <TubesCursor
          colorKey={roundKey}
          className="absolute inset-0 z-10 opacity-60 pointer-events-none"
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

  const handleComplete = useCallback(async () => {
    await awardXP.mutateAsync().catch(() => {});
  }, [awardXP]);

  return (
    <GameShell>
      <WaveSculptor onComplete={handleComplete} />
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
