import { useMemo, type CSSProperties, type FC } from 'react';
import { sectionBars } from '@/curriculum/songLibrary/performance';
import {
  opensPage,
  songSystemOffsets,
  systemRowSizes,
} from '@/curriculum/songLibrary/systems';
import type {
  ChordBar,
  ChordHit,
  Song,
  SongSection,
} from '@/curriculum/types/songLibrary';
import { useChordNotation, type ChordNotation } from '@/lib/chordNotation';
import { ChordSymbolText } from './ChordSymbolText';
import { useChartNotation } from './chartNotationPreference';
import {
  chordAriaLabel,
  chordText,
  contextOf,
  songKeyMap,
  type DisplayMode,
} from './chordLabel';

/**
 * The chart as bars of chord symbols — the format a phone can be read from on
 * a stand, in the manner of iRealPro.
 *
 * The staff chart draws its symbols inside the SVG, so their size is tied to
 * the width of a bar: four bars across a phone puts them at about five pixels,
 * which is no use at arm's length. Here a bar is a box and the symbol is text,
 * so the type stays the size it needs to be however narrow the chart gets.
 * Four bars still fit across a phone because the symbol is set compactly —
 * see ChordSymbolText — not because the bars are made wider.
 *
 * It is the same song, the same roadmap and the same symbols; what goes is the
 * staff and the slashes, which a player reading changes was not reading. It
 * emits the same page marks as ChordChart (`data-chart-system`,
 * `data-page-start`, `break-before`), so the stand pages it and the printer
 * breaks it exactly the same way.
 */

export interface ChordGridProps {
  song: Song;
  /** Bars across. Four is the chart's own shape and iRealPro's; two is for a
   *  phone too narrow even for that. */
  barsPerRow?: number;
  /** Break into pages of this many rows. Unset: one continuous chart. */
  systemsPerPage?: number;
  onChordClick?: (hit: ChordHit) => void;
}

const BAR_HEIGHT = 52;
const MARKS_HEIGHT = 14;
const THIN = '1px solid currentColor';
const THICK = '3px solid currentColor';

/** Room for the letter, given how many chords share the bar. */
const chordSize = (count: number): number =>
  count <= 1 ? 22 : count === 2 ? 17 : 13;

const hasMarks = (bar: ChordBar): boolean =>
  !!(
    bar.segno ||
    bar.coda ||
    bar.toCoda ||
    bar.jump ||
    bar.cue ||
    bar.keyChange ||
    bar.fermata ||
    bar.ending
  );

/* ── One bar ──────────────────────────────────────────────────────────── */

const Bar: FC<{
  bar: ChordBar;
  displayMode: DisplayMode;
  notation: ChordNotation;
  context: ReturnType<typeof contextOf>;
  isLast: boolean;
  /** Drawn before the first bar of the chart, as on paper. */
  timeSignature?: [number, number];
  onChordClick?: (hit: ChordHit) => void;
}> = ({
  bar,
  displayMode,
  notation,
  context,
  isLast,
  timeSignature,
  onChordClick,
}) => {
  const size = chordSize(bar.chords.length);
  return (
    <div
      className="relative flex min-w-0 flex-1 items-center"
      style={{
        height: BAR_HEIGHT,
        borderLeft: bar.repeatStart ? THICK : THIN,
        borderRight: isLast ? THIN : bar.repeatEnd ? THICK : undefined,
        paddingLeft: bar.repeatStart ? 9 : 3,
        paddingRight: bar.repeatEnd ? 9 : 1,
      }}
    >
      {bar.repeatStart && <RepeatDots side="left" />}
      {bar.repeatEnd && <RepeatDots side="right" />}

      {timeSignature && (
        <span
          aria-label={`${timeSignature[0]}/${timeSignature[1]} time`}
          className="mr-1.5 inline-flex flex-shrink-0 flex-col items-center leading-[0.85]"
          style={{ fontFamily: 'serif', fontSize: 17, fontWeight: 700 }}
        >
          <span>{timeSignature[0]}</span>
          <span>{timeSignature[1]}</span>
        </span>
      )}

      {bar.restBars ? (
        <span className="text-sm opacity-60">— {bar.restBars} —</span>
      ) : (
        // Chords sit against the barline, left to right, as they are played.
        bar.chords.map((hit, i) => {
          const label = chordText(hit, displayMode, notation, context);
          return (
            <button
              key={i}
              type="button"
              onClick={() => onChordClick?.(hit)}
              aria-label={chordAriaLabel(hit, label)}
              className="min-w-0 flex-shrink truncate rounded pr-1.5 text-left font-bold transition-colors hover:text-[#7ecfcf]"
              style={{ background: 'none', border: 'none', color: 'inherit' }}
            >
              <ChordSymbolText text={label} size={size} />
            </button>
          );
        })
      )}
    </div>
  );
};

const RepeatDots: FC<{ side: 'left' | 'right' }> = ({ side }) => (
  <span
    aria-hidden
    className="absolute flex flex-col justify-center gap-[3px]"
    style={{ [side]: 3, top: '50%', transform: 'translateY(-50%)' }}
  >
    <span className="block h-[3px] w-[3px] rounded-full bg-current" />
    <span className="block h-[3px] w-[3px] rounded-full bg-current" />
  </span>
);

/* ── The lane above a row, where the roadmap is written ───────────────── */

const BarMarks: FC<{ bar: ChordBar }> = ({ bar }) => {
  const marks: string[] = [];
  if (bar.segno) marks.push('𝄋');
  if (bar.coda) marks.push('𝄌');
  if (bar.fermata) marks.push('𝄐');
  if (bar.keyChange) marks.push(`Key: ${bar.keyChange}`);
  if (bar.cue) marks.push(bar.cue);
  if (bar.toCoda) marks.push('To Coda');
  if (bar.jump) marks.push(bar.jump);
  const volta = bar.ending?.length ? `${bar.ending.join(', ')}.` : null;

  return (
    <div
      className="flex min-w-0 flex-1 items-end overflow-hidden whitespace-nowrap"
      style={{
        height: MARKS_HEIGHT,
        fontSize: 10,
        lineHeight: 1,
        fontFamily: 'serif',
        // A volta is a bracket over the bars it covers, as it is on paper.
        borderTop: volta ? THIN : undefined,
        borderLeft: volta ? THIN : undefined,
        paddingLeft: volta ? 2 : 3,
      }}
    >
      <span className="truncate opacity-75">
        {volta}
        {volta && marks.length > 0 ? ' ' : ''}
        {marks.join(' · ')}
      </span>
    </div>
  );
};

/* ── A section ────────────────────────────────────────────────────────── */

const GridSection: FC<{
  section: SongSection;
  sectionIdx: number;
  keys: ReturnType<typeof songKeyMap>['sectionKeys'][number];
  displayMode: DisplayMode;
  notation: ChordNotation;
  barsPerRow: number;
  systemOffset: number;
  systemsPerPage?: number;
  timeSignature?: [number, number];
  onChordClick?: (hit: ChordHit) => void;
}> = ({
  section,
  sectionIdx,
  keys,
  displayMode,
  notation,
  barsPerRow,
  systemOffset,
  systemsPerPage,
  timeSignature,
  onChordClick,
}) => {
  const bars = sectionBars(section);
  const rows: { bars: ChordBar[]; from: number }[] = [];
  let at = 0;
  for (const size of systemRowSizes(bars.length, barsPerRow)) {
    rows.push({ bars: bars.slice(at, at + size), from: at });
    at += size;
  }

  const sectionOpensPage = opensPage(systemOffset, systemsPerPage);
  const pageBreak: CSSProperties = { breakBefore: 'page' };

  return (
    <div
      data-chart-section={sectionIdx}
      {...(sectionOpensPage ? { 'data-page-start': systemOffset } : {})}
      style={{ marginBottom: 8, ...(sectionOpensPage ? pageBreak : {}) }}
    >
      {section.label && (
        <div className="flex items-baseline gap-2 leading-none">
          <span
            className="font-bold text-white/60"
            style={{ fontFamily: 'serif', fontSize: 12 }}
          >
            {section.label}
          </span>
          {section.instrumental && (
            <span className="text-[10px] italic text-white/40">
              {section.instrumental === 'first-time'
                ? 'Instrumental 1st time'
                : 'Instrumental'}
            </span>
          )}
        </div>
      )}

      {rows.map((row, ri) => {
        const system = systemOffset + ri;
        const rowOpensPage = ri > 0 && opensPage(system, systemsPerPage);
        const showMarks = row.bars.some(hasMarks);
        return (
          <div
            key={ri}
            data-chart-system={system}
            {...(rowOpensPage ? { 'data-page-start': system } : {})}
            style={{ ...(rowOpensPage ? pageBreak : {}) }}
          >
            {showMarks && (
              <div className="flex text-white/75">
                {row.bars.map((bar, bi) => (
                  <BarMarks key={bi} bar={bar} />
                ))}
              </div>
            )}
            <div className="flex text-white/90">
              {row.bars.map((bar, bi) => (
                <Bar
                  key={bi}
                  bar={bar}
                  displayMode={displayMode}
                  notation={notation}
                  context={contextOf(keys[row.from + bi])}
                  isLast={bi === row.bars.length - 1}
                  timeSignature={
                    sectionIdx === 0 && ri === 0 && bi === 0
                      ? timeSignature
                      : undefined
                  }
                  onChordClick={onChordClick}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ── The chart ────────────────────────────────────────────────────────── */

export const ChordGrid: FC<ChordGridProps> = ({
  song,
  barsPerRow = 4,
  systemsPerPage,
  onChordClick,
}) => {
  const [chartNotation] = useChartNotation();
  const displayMode: DisplayMode =
    chartNotation === 'numbers' ? 'hybrid' : 'chordName';
  const picked = useChordNotation();
  const notation: ChordNotation = displayMode === 'hybrid' ? 'hybrid' : picked;

  const { sectionKeys } = useMemo(() => songKeyMap(song), [song]);
  const systemOffsets = useMemo(
    () => songSystemOffsets(song, barsPerRow),
    [song, barsPerRow],
  );

  return (
    <div className="flex min-w-0 flex-col">
      {song.sections.map((section, si) => (
        <GridSection
          key={section.id + '_' + si}
          section={section}
          sectionIdx={si}
          keys={sectionKeys[si] ?? []}
          displayMode={displayMode}
          notation={notation}
          barsPerRow={barsPerRow}
          systemOffset={systemOffsets[si]}
          systemsPerPage={systemsPerPage}
          timeSignature={song.timeSignature}
          onChordClick={onChordClick}
        />
      ))}
    </div>
  );
};
