/* eslint-disable react/jsx-sort-props */
import { ArrowLeft } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import TubesCursor from '@/components/ui/tubes-cursor';
import { GameRoutes } from '@/constants/routes';
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
import Chroma from './chroma';
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
      className="learn-root flex flex-col h-full overflow-y-auto px-8 pb-12"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      <div className="mb-4 pt-6">
        <BackToArcade />
      </div>
      <div className="mx-auto w-full max-w-5xl">{children}</div>
    </div>
  );
}

export function ChromaPage() {
  return (
    <GameShell>
      <Chroma />
    </GameShell>
  );
}

export function FoliPage() {
  return (
    <GameShell>
      <Foli />
    </GameShell>
  );
}

export function BoardChoicePage() {
  return (
    <GameShell>
      <BoardChoiceGame className="mx-auto max-w-5xl" />
    </GameShell>
  );
}

export function ChordConnectionPage() {
  return (
    <GameShell>
      <ChordConnectionGame className="mx-auto max-w-5xl" />
    </GameShell>
  );
}

export function ChordPressPage() {
  return (
    <GameShell>
      <ChordPressGame className="mx-auto max-w-5xl" enableComputerKeyboard />
    </GameShell>
  );
}

export function PlayAlongPage() {
  const navigate = useNavigate();
  const [done, setDone] = useState(false);
  const [key, setKey] = useState(0);

  const handleComplete = useCallback((isComplete: boolean) => {
    if (isComplete) setDone(true);
  }, []);

  const handlePlayAgain = useCallback(() => {
    setDone(false);
    setKey((k) => k + 1);
  }, []);

  return (
    <LearnInputProvider detectionMode="polyphonic">
      <GameShell>
        {done ? (
          <div className="flex flex-col items-center gap-4 pt-12">
            <h2
              className="text-2xl font-semibold"
              style={{ color: 'var(--color-text)' }}
            >
              Round Complete!
            </h2>
            <div className="flex gap-3">
              <Button onClick={handlePlayAgain}>Play Again</Button>
              <Button
                variant="outline"
                onClick={() => navigate(GameRoutes.root())}
              >
                Back to Arcade
              </Button>
            </div>
          </div>
        ) : (
          <PlayAlong key={key} onActivityCompleteChange={handleComplete} />
        )}
      </GameShell>
    </LearnInputProvider>
  );
}

export function MajorArcanumPage() {
  const navigate = useNavigate();
  const [done, setDone] = useState(false);
  const [key, setKey] = useState(0);

  const handleComplete = useCallback(() => {
    setDone(true);
  }, []);

  const handlePlayAgain = useCallback(() => {
    setDone(false);
    setKey((k) => k + 1);
  }, []);

  return (
    <GameShell>
      {done ? (
        <div className="flex flex-col items-center gap-4 pt-12">
          <h2
            className="text-2xl font-semibold"
            style={{ color: 'var(--color-text)' }}
          >
            Session Complete
          </h2>
          <div className="flex gap-3">
            <Button onClick={handlePlayAgain}>Play Again</Button>
            <Button
              variant="outline"
              onClick={() => navigate(GameRoutes.root())}
            >
              Back to Arcade
            </Button>
          </div>
        </div>
      ) : (
        <MajorArcanum key={key} onComplete={handleComplete} />
      )}
    </GameShell>
  );
}

export function ConstellationsPage() {
  const navigate = useNavigate();
  const [done, setDone] = useState(false);
  const [key, setKey] = useState(0);
  const [roundKey, setRoundKey] = useState(0);

  const handleComplete = useCallback(() => {
    setDone(true);
  }, []);

  const handlePlayAgain = useCallback(() => {
    setDone(false);
    setKey((k) => k + 1);
  }, []);

  const handleRoundStart = useCallback(() => {
    setRoundKey((k) => k + 1);
  }, []);

  return (
    <GameShell>
      <div className="relative">
        {done ? (
          <div className="flex flex-col items-center gap-4 pt-12">
            <h2
              className="text-2xl font-semibold"
              style={{ color: 'var(--color-text)' }}
            >
              Round Complete!
            </h2>
            <div className="flex gap-3">
              <Button onClick={handlePlayAgain}>Play Again</Button>
              <Button
                variant="outline"
                onClick={() => navigate(GameRoutes.root())}
              >
                Back to Arcade
              </Button>
            </div>
          </div>
        ) : (
          <Constellations
            key={key}
            onComplete={handleComplete}
            onRoundStart={handleRoundStart}
          />
        )}
        <TubesCursor
          colorKey={roundKey}
          className="absolute inset-0 z-10 rounded-2xl overflow-hidden opacity-60 pointer-events-none"
        />
      </div>
    </GameShell>
  );
}

export function GrooveLabPage() {
  return (
    <GameShell>
      <GrooveLab />
    </GameShell>
  );
}

export function WaveSculptorPage() {
  const navigate = useNavigate();
  const [done, setDone] = useState(false);
  const [key, setKey] = useState(0);

  const handleComplete = useCallback(() => {
    setDone(true);
  }, []);

  const handlePlayAgain = useCallback(() => {
    setDone(false);
    setKey((k) => k + 1);
  }, []);

  return (
    <GameShell>
      {done ? (
        <div className="flex flex-col items-center gap-4 pt-12">
          <h2
            className="text-2xl font-semibold"
            style={{ color: 'var(--color-text)' }}
          >
            All Waves Sculpted!
          </h2>
          <div className="flex gap-3">
            <Button onClick={handlePlayAgain}>Play Again</Button>
            <Button
              variant="outline"
              onClick={() => navigate(GameRoutes.root())}
            >
              Back to Arcade
            </Button>
          </div>
        </div>
      ) : (
        <WaveSculptor key={key} onComplete={handleComplete} />
      )}
    </GameShell>
  );
}

export function HarmonicStringsPage() {
  const navigate = useNavigate();
  const [done, setDone] = useState(false);
  const [key, setKey] = useState(0);

  const handleComplete = useCallback(() => {
    setDone(true);
  }, []);

  const handlePlayAgain = useCallback(() => {
    setDone(false);
    setKey((k) => k + 1);
  }, []);

  return (
    <GameShell>
      {done ? (
        <div className="flex flex-col items-center gap-4 pt-12">
          <h2
            className="text-2xl font-semibold"
            style={{ color: 'var(--color-text)' }}
          >
            Quiz Complete!
          </h2>
          <div className="flex gap-3">
            <Button onClick={handlePlayAgain}>Play Again</Button>
            <Button
              variant="outline"
              onClick={() => navigate(GameRoutes.root())}
            >
              Back to Arcade
            </Button>
          </div>
        </div>
      ) : (
        <HarmonicStrings key={key} onComplete={handleComplete} />
      )}
    </GameShell>
  );
}

export function SignalFlowPage() {
  const navigate = useNavigate();
  const [done, setDone] = useState(false);
  const [key, setKey] = useState(0);

  const handleComplete = useCallback(() => {
    setDone(true);
  }, []);

  const handlePlayAgain = useCallback(() => {
    setDone(false);
    setKey((k) => k + 1);
  }, []);

  return (
    <GameShell>
      {done ? (
        <div className="flex flex-col items-center gap-4 pt-12">
          <h2
            className="text-2xl font-semibold"
            style={{ color: 'var(--color-text)' }}
          >
            All Signals Routed!
          </h2>
          <div className="flex gap-3">
            <Button onClick={handlePlayAgain}>Play Again</Button>
            <Button
              variant="outline"
              onClick={() => navigate(GameRoutes.root())}
            >
              Back to Arcade
            </Button>
          </div>
        </div>
      ) : (
        <SignalFlow key={key} onComplete={handleComplete} />
      )}
    </GameShell>
  );
}
