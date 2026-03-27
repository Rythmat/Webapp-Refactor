/* eslint-disable react/jsx-sort-props */
import { ArrowLeft } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { GameRoutes } from '@/constants/routes';
import { LearnInputProvider } from '@/learn/context/LearnInputContext';
import { HeaderBar } from '../ClassroomLayout/HeaderBar';
import { BoardChoiceGame } from './BoardChoiceGame';
import { ChordConnectionGame } from './ChordConnectionGame';
import { ChordPressGame } from './ChordPressGame';
import { PlayAlong } from './PlayAlong';
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

function GameShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="learn-root flex flex-col h-full overflow-y-auto px-8 pb-12"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      <HeaderBar title={title} />
      <div className="mb-4">
        <BackToArcade />
      </div>
      <div className="mx-auto w-full max-w-5xl">{children}</div>
    </div>
  );
}

export function ChromaPage() {
  return (
    <GameShell title="Chroma">
      <Chroma />
    </GameShell>
  );
}

export function BoardChoicePage() {
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
    <GameShell title="Board Choice">
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
        <BoardChoiceGame key={key} onComplete={handleComplete} />
      )}
    </GameShell>
  );
}

export function ChordConnectionPage() {
  const navigate = useNavigate();
  const [done, setDone] = useState(false);
  const [key, setKey] = useState(0);

  const handleComplete = useCallback((_result: { success: boolean }) => {
    setDone(true);
  }, []);

  const handlePlayAgain = useCallback(() => {
    setDone(false);
    setKey((k) => k + 1);
  }, []);

  return (
    <GameShell title="Chord Connection">
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
        <ChordConnectionGame key={key} onComplete={handleComplete} />
      )}
    </GameShell>
  );
}

export function ChordPressPage() {
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
    <GameShell title="Chord Press">
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
        <ChordPressGame
          key={key}
          enableComputerKeyboard
          onComplete={handleComplete}
        />
      )}
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
      <GameShell title="Play Along">
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
