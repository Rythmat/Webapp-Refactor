import { Map as MapIcon } from 'lucide-react';
import { ArcadeGameHeader } from '../ArcadeGameHeader';

interface GameHeaderProps {
  /** 'Novice · Level 2', or 'The Circle'. */
  where: string;
  /** 'Melody in G'. */
  what: string;
  keyColor: string;
  score: number;
  streak: number;
  multiplier: number;
  onOpenMap: () => void;
}

export function GameHeader({
  where,
  what,
  keyColor,
  score,
  streak,
  multiplier,
  onOpenMap,
}: GameHeaderProps) {
  return (
    <ArcadeGameHeader
      title="Major Arcanum"
      controls={
        <>
          <span className="rounded-full bg-white/[0.08] px-3 py-1 text-xs font-medium uppercase tracking-wider text-zinc-200">
            {where}
          </span>
          <span className="flex items-center gap-2 rounded border border-white/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-zinc-300">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: keyColor }}
            />
            {what}
          </span>
          <div className="mx-1 h-3 w-px bg-white/10" />
          <button
            type="button"
            onClick={onOpenMap}
            className="flex items-center gap-1.5 rounded px-3 py-1 text-xs font-medium uppercase tracking-wider text-zinc-400 transition-all hover:bg-white/[0.08] hover:text-white"
          >
            <MapIcon size={13} /> Level map
          </button>
        </>
      }
      stats={[
        { label: 'Score', value: score.toLocaleString() },
        { label: 'Notes', value: streak, valueClassName: 'text-cyan-400' },
        {
          label: 'Multiplier',
          value: `x${multiplier}`,
          valueClassName: 'font-bold text-white',
        },
      ]}
    />
  );
}
