import { type ReactNode, useCallback, useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BoardChoiceGame } from './BoardChoiceGame';
import { ChordConnectionGame } from './ChordConnectionGame';
import { ChordPressGame } from './ChordPressGame';

const TOTAL_ROUNDS = 4;
const CHORD_TYPES = ['maj', 'min', 'dim', 'aug', '7', 'maj7', 'min7'] as const;
type ChordType = (typeof CHORD_TYPES)[number];

type ChordSpec = {
  rootPc: number;
  type: ChordType;
};

const GAME_POOL = ['board', 'press', 'connect'] as const;
type GameId = (typeof GAME_POOL)[number];

type RoundConfig = {
  id: string;
  game: GameId;
  chord: ChordSpec;
};

function randomItem<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

function generateChord(): ChordSpec {
  return {
    rootPc: Math.floor(Math.random() * 12),
    type: randomItem(CHORD_TYPES),
  };
}

function randomDifferentItem<T>(items: readonly T[], exclude?: T | null): T {
  const pool =
    typeof exclude === 'undefined' || exclude === null
      ? items
      : items.filter((item) => item !== exclude);
  const source = pool.length > 0 ? pool : items;
  return source[Math.floor(Math.random() * source.length)]!;
}

function generateSession(): RoundConfig[] {
  const rounds: RoundConfig[] = [];
  let previousGame: GameId | null = null;
  for (let index = 0; index < TOTAL_ROUNDS; index += 1) {
    const game: GameId = randomDifferentItem(GAME_POOL, previousGame);
    rounds.push({
      id: uuidv4(),
      game,
      chord: generateChord(),
    });
    previousGame = game;
  }
  return rounds;
}

export const GamePlayer = () => {
  const [rounds, setRounds] = useState<RoundConfig[]>(() => generateSession());
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [failures, setFailures] = useState(0);

  const currentRound = !sessionComplete ? rounds[currentRoundIndex] : null;

  const advanceRound = useCallback(() => {
    setCurrentRoundIndex((previous) => {
      const nextIndex = previous + 1;
      if (nextIndex >= rounds.length) {
        setSessionComplete(true);
        return previous;
      }
      return nextIndex;
    });
  }, [rounds.length]);

  const handleRoundComplete = useCallback(() => {
    advanceRound();
  }, [advanceRound]);

  const handleRoundCompleteWithResult = useCallback(
    ({ success }: { success: boolean }) => {
      setFailures((prev) => (success ? prev : prev + 1));
      advanceRound();
    },
    [advanceRound],
  );

  const restartSession = useCallback(() => {
    setRounds(generateSession());
    setCurrentRoundIndex(0);
    setSessionComplete(false);
    setFailures(0);
  }, []);

  const progressText = useMemo(() => {
    if (sessionComplete) return `${rounds.length} / ${rounds.length}`;
    return `${currentRoundIndex + 1} / ${rounds.length}`;
  }, [currentRoundIndex, rounds.length, sessionComplete]);

  let roundContent: ReactNode = null;

  if (!sessionComplete && currentRound) {
    const { id, game, chord } = currentRound;
    const sharedProps = {
      initialChord: chord,
      className: 'mx-auto max-w-5xl',
    };

    let gameComponent: ReactNode = null;
    switch (game) {
      case 'board':
        gameComponent = (
          <BoardChoiceGame {...sharedProps} onComplete={handleRoundComplete} />
        );
        break;
      case 'press':
        gameComponent = (
          <ChordPressGame {...sharedProps} onComplete={handleRoundComplete} />
        );
        break;
      case 'connect':
        gameComponent = (
          <ChordConnectionGame
            {...sharedProps}
            onComplete={handleRoundCompleteWithResult}
          />
        );
        break;
      default:
        gameComponent = null;
    }

    roundContent = (
      <div key={id} className="space-y-6">
        <Card>
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm text-muted-foreground">
                  Session Progress
                </div>
                <div className="text-lg font-semibold">{progressText}</div>
              </div>
              <Button variant="outline" onClick={restartSession}>
                Restart Session
              </Button>
            </div>
          </CardHeader>
        </Card>
        {gameComponent}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {sessionComplete ? (
        <div className="space-y-4">
          <Card>
            <CardHeader className="space-y-1">
              <div className="flex items-center justify-between gap-4">
                <CardTitle className="text-xl font-semibold">
                  Great work!
                </CardTitle>
                <Button variant="outline" onClick={restartSession}>
                  Restart Session
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                You completed all {rounds.length} rounds. Start a new session to
                keep practicing.
              </p>
              <p className="text-sm text-muted-foreground">
                Failed rounds: {failures}
              </p>
              <Button onClick={restartSession}>Play Another Session</Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        roundContent
      )}
    </div>
  );
};
