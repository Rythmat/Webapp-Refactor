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

const HexagonPattern = () => (
  <svg
    className="absolute inset-0 w-full h-full opacity-40"
    preserveAspectRatio="xMidYMid slice"
  >
    <defs>
      <pattern
        id="hexagons"
        width="50"
        height="43.4"
        patternUnits="userSpaceOnUse"
        patternTransform="scale(2)"
      >
        <path
          d="M25 0L50 14.4V43.3L25 57.7L0 43.3V14.4L25 0Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          className="text-white/10"
        />
      </pattern>
    </defs>
    <path d="M0 0H400L300 200H0V0Z" fill="#28a69a" fillOpacity="0.2" />
    <path d="M300 0H600L500 200H200L300 0Z" fill="#d2404a" fillOpacity="0.3" />
    <path d="M550 0H900L800 200H450L550 0Z" fill="#9d7fce" fillOpacity="0.2" />
    <path
      d="M850 0H1200L1100 200H750L850 0Z"
      fill="#fea92a"
      fillOpacity="0.2"
    />
    <rect width="100%" height="100%" fill="url(#hexagons)" />
  </svg>
);

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
    <div className="h-28 relative w-full flex items-center px-8 justify-between shrink-0 overflow-hidden border-b border-zinc-800">
      <div className="absolute inset-0 bg-[#18181b]">
        <HexagonPattern />
      </div>
      <div className="relative z-10 flex flex-col">
        <h1
          className="text-5xl font-serif italic text-white tracking-wide"
          style={{ fontFamily: '"Playfair Display", serif' }}
        >
          Major Arcanum
        </h1>
        <div className="mt-2 flex items-center gap-2">
          <button
            onClick={() => onToggleMode('Melody')}
            className={`px-3 py-1 rounded text-xs font-medium uppercase tracking-wider transition-all ${
              gameMode === 'Melody'
                ? 'bg-white text-black'
                : 'text-zinc-500 hover:text-white'
            }`}
          >
            Melody
          </button>
          <button
            onClick={() => onToggleMode('Harmony')}
            className={`px-3 py-1 rounded text-xs font-medium uppercase tracking-wider transition-all ${
              gameMode === 'Harmony'
                ? 'bg-white text-black'
                : 'text-zinc-500 hover:text-white'
            }`}
          >
            Harmony
          </button>
          <div className="w-px h-3 bg-zinc-700 mx-1" />
          <button
            onClick={onOpenKeySelector}
            className="px-3 py-1 rounded text-xs font-medium uppercase tracking-wider transition-all text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-700 flex items-center gap-2"
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: keyColor }}
            />
            {keyName}
          </button>
        </div>
      </div>

      <div className="relative z-10 flex items-center gap-8 bg-black/20 backdrop-blur-sm px-6 py-3 rounded-xl border border-white/5">
        <div className="flex flex-col items-end">
          <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">
            Score
          </span>
          <span className="text-xl font-medium text-white tabular-nums">
            {score.toLocaleString()}
          </span>
        </div>
        <div className="w-px h-8 bg-white/10" />
        <div className="flex flex-col items-end">
          <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">
            Streak
          </span>
          <span className="text-xl font-medium text-cyan-400 tabular-nums">
            {streak}
          </span>
        </div>
        <div className="w-px h-8 bg-white/10" />
        <div className="flex flex-col items-end">
          <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">
            Multiplier
          </span>
          <span className="text-xl font-bold text-yellow-400 tabular-nums">
            x{multiplier}
          </span>
        </div>
      </div>
    </div>
  );
}
