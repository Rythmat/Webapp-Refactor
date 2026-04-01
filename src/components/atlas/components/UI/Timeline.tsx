import {
  useAppState,
  useAppDispatch,
} from '@/components/atlas/context/AppContext';

const MIN_YEAR = 1900;
const MAX_YEAR = 2025;
const TICKS = [1900, 1925, 1950, 1975, 2000, 2025];

export function Timeline() {
  const { currentYear } = useAppState();
  const dispatch = useAppDispatch();

  const pct = ((currentYear - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100;

  return (
    <div className="flex h-14 shrink-0 items-center gap-4 border-t border-zinc-800/50 bg-zinc-900/60 px-6 backdrop-blur-xl">
      {/* Year display */}
      <span className="w-10 text-sm font-medium tabular-nums text-teal-400">
        {currentYear}
      </span>

      {/* Slider area */}
      <div className="relative flex-1">
        {/* Tick labels */}
        <div className="mb-1 flex justify-between px-0.5 text-[10px] text-zinc-500">
          {TICKS.map((year) => (
            <span key={year}>{year}</span>
          ))}
        </div>

        {/* Track */}
        <div className="relative h-1 rounded-full bg-zinc-700">
          {/* Filled portion */}
          <div
            className="absolute h-full rounded-full bg-teal-500 transition-[width] duration-75"
            style={{ width: `${pct}%` }}
          />
          {/* Thumb indicator */}
          <div
            className="absolute top-1/2 size-3 -translate-y-1/2 rounded-full border-2 border-zinc-900 bg-teal-400 shadow-md transition-[left] duration-75"
            style={{ left: `calc(${pct}% - 6px)` }}
          />
        </div>

        {/* Invisible native range input */}
        <input
          className="absolute inset-0 w-full cursor-pointer opacity-0"
          max={MAX_YEAR}
          min={MIN_YEAR}
          style={{ top: '14px', height: '12px' }}
          type="range"
          value={currentYear}
          onChange={(e) =>
            dispatch({ type: 'SET_YEAR', payload: Number(e.target.value) })
          }
        />
      </div>
    </div>
  );
}
