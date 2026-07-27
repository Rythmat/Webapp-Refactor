import { ArcadeGameHeader } from '../ArcadeGameHeader';

interface GameHeaderProps {
  gameMode: 'Melody' | 'Harmony';
  keyName: string;
  keyColor: string;
  score: number;
  streak: number;
  multiplier: number;
  onToggleMode: (mode: 'Melody' | 'Harmony') => void;
  onOpenKeySelector: () => void;
}

export function GameHeader({
  gameMode,
  keyName,
  keyColor,
  score,
  streak,
  multiplier,
  onToggleMode,
  onOpenKeySelector,
}: GameHeaderProps) {
  return (
    <ArcadeGameHeader
      title="Major Arcanum"
      controls={
        <>
          <button
            onClick={() => onToggleMode('Melody')}
            className={`px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider transition-all ${
              gameMode === 'Melody'
                ? 'bg-white text-black'
                : 'text-zinc-500 hover:text-white'
            }`}
          >
            Melody
          </button>
          <button
            onClick={() => onToggleMode('Harmony')}
            className={`px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider transition-all ${
              gameMode === 'Harmony'
                ? 'bg-white text-black'
                : 'text-zinc-500 hover:text-white'
            }`}
          >
            Harmony
          </button>
          <div className="w-px h-3 bg-white/10 mx-1" />
          <button
            onClick={onOpenKeySelector}
            className="px-3 py-1 rounded text-xs font-medium uppercase tracking-wider transition-all text-zinc-400 hover:text-white hover:bg-white/[0.08] border border-white/10 flex items-center gap-2"
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: keyColor }}
            />
            {keyName}
          </button>
        </>
      }
      stats={[
        { label: 'Score', value: score.toLocaleString() },
        { label: 'Streak', value: streak, valueClassName: 'text-cyan-400' },
        {
          label: 'Multiplier',
          value: `x${multiplier}`,
          valueClassName: 'font-bold text-yellow-400',
        },
      ]}
    />
  );
}
