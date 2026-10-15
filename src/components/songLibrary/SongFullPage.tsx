import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useCallback, type FC } from 'react';
import type { Song } from '@/curriculum/types/songLibrary';
import {
  CHART_FORMATS,
  PHONE_MEDIA_QUERY,
  STAVES_PER_PAGE,
  gridBarsPerRow,
  resolveChartFormat,
  useChartFormat,
  useSetViewMode,
  useStavesPerPage,
  type ChartFormat,
} from '@/features/setlists/setViewPreference';
import {
  ChartStandBox,
  useChartStand,
} from '@/features/setlists/useChartStand';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { ChordChart } from './ChordChart';
import { ChordGrid } from './ChordGrid';

/**
 * One song's chart on the whole screen: the Set Lists stand, for a single
 * song. Page view fits a page of staves to the screen and turns pages
 * (← →, swipe, Back/Next); Scroll view is the whole chart as one column.
 * The view, staves per page and chart format are the same preferences the
 * Set Lists stand uses, so a player's choice follows them between the two.
 */
export const SongFullPage: FC<{
  /** The chart as the page shows it (already transposed). */
  song: Song;
  onClose: () => void;
}> = ({ song, onClose }) => {
  const [view, setView] = useSetViewMode();
  const [staves, setStaves] = useStavesPerPage();
  const [format, setFormat] = useChartFormat();
  const isPhone = useMediaQuery(PHONE_MEDIA_QUERY);
  const drawnAs = resolveChartFormat(format, isPhone);
  const systemsPerPage = view === 'page' ? staves : undefined;

  // One song: there is nothing before or after it.
  const onStep = useCallback(() => false, []);
  const stand = useChartStand({
    view,
    measureDeps: [song, staves, drawnAs],
    onStep,
    perform: true,
    onExit: onClose,
  });
  const { page, pageCount, turn } = stand;
  const barsPerRow = gridBarsPerRow(stand.size.width);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${song.title}, full page`}
      className="fixed inset-0 z-[60] flex flex-col bg-[#101012]"
    >
      <header className="flex flex-shrink-0 flex-wrap items-center gap-2 border-b border-white/10 px-3 py-2 md:gap-3 md:px-5 md:py-2.5">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold text-white">
            {song.title}
          </h1>
          <p className="truncate text-xs text-white/45">
            {song.artist} · {song.key}
          </p>
        </div>

        {view === 'page' && (
          <label className="flex flex-shrink-0 items-center gap-1 text-xs text-white/40">
            <span className="hidden sm:inline">Staves</span>
            <select
              value={staves}
              onChange={(e) =>
                setStaves(
                  Number(e.target.value) as (typeof STAVES_PER_PAGE)[number],
                )
              }
              className="rounded-full border border-white/15 bg-transparent px-1.5 py-0.5 text-xs text-white/70 outline-none focus:border-white/35"
              title="Staves on a page"
            >
              {STAVES_PER_PAGE.map((n) => (
                <option key={n} value={n} className="bg-[#161618]">
                  {n}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="flex flex-shrink-0 items-center gap-1 text-xs text-white/40">
          <span className="hidden md:inline">Chart</span>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as ChartFormat)}
            className="rounded-full border border-white/15 bg-transparent px-1.5 py-0.5 text-xs capitalize text-white/70 outline-none focus:border-white/35"
            title={`How the chart is drawn — auto picks ${drawnAs} on this device`}
          >
            {CHART_FORMATS.map((f) => (
              <option key={f} value={f} className="bg-[#161618]">
                {f === 'auto' ? `Auto (${drawnAs})` : f}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-1 rounded-full border border-white/10 p-0.5">
          {(['page', 'scroll'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setView(mode)}
              aria-pressed={view === mode}
              className={`rounded-full px-2.5 py-1 text-xs capitalize transition-colors ${
                view === mode
                  ? 'bg-white text-black'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              {mode} view
            </button>
          ))}
        </div>

        {view === 'page' && pageCount > 1 && (
          <span className="text-xs tabular-nums text-white/40">
            p{page + 1}/{pageCount}
          </span>
        )}

        <button
          type="button"
          onClick={onClose}
          title="Close full page (Esc)"
          aria-label="Close full page"
          className="flex-shrink-0 rounded-full border border-white/15 p-1.5 text-white/70 hover:border-white/30 hover:text-white"
        >
          <X size={16} />
        </button>
      </header>

      <ChartStandBox stand={stand} view={view}>
        {drawnAs === 'chords' ? (
          <ChordGrid
            key={`${song.key}:${staves}:${barsPerRow}`}
            song={song}
            barsPerRow={barsPerRow}
            systemsPerPage={systemsPerPage}
          />
        ) : (
          <ChordChart
            key={`${song.key}:${staves}`}
            song={song}
            systemsPerPage={systemsPerPage}
          />
        )}
      </ChartStandBox>

      {view === 'page' && (
        <footer className="flex flex-shrink-0 items-center justify-between border-t border-white/10 px-5 py-1.5">
          <button
            type="button"
            onClick={() => turn(-1)}
            disabled={page === 0}
            className="inline-flex items-center gap-1 text-xs text-white/50 hover:text-white disabled:opacity-30"
          >
            <ChevronLeft size={14} /> Back
          </button>
          <span className="text-[11px] text-white/30">
            ← → turn pages · Esc closes
          </span>
          <button
            type="button"
            onClick={() => turn(1)}
            disabled={page >= pageCount - 1}
            className="inline-flex items-center gap-1 text-xs text-white/50 hover:text-white disabled:opacity-30"
          >
            Next <ChevronRight size={14} />
          </button>
        </footer>
      )}
    </div>
  );
};
