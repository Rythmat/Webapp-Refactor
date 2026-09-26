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
 * It is the same song and the same roadmap; what goes is the staff and the
 * slashes, which a player reading changes was not reading. It emits the same
 * page marks as ChordChart (`data-chart-system`, `data-page-start`,
 * `break-before`), so the stand pages it and the printer breaks it exactly
 * the same way.
 *
 * The chords are the same chords, written shorter: a jazz chart's symbols,
 * where minor is a dash, major seventh a triangle, diminished a circle and
 * half-diminished a slashed one. Both renderers ask chordLabel.ts what a
 * chord is, so they cannot disagree about which chord it is — they differ
 * only in how much room it takes to say so.
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
/**
 * A chart with slash chords needs taller bars: the bass note is set on its
 * own level under the chord, so the symbol is about twice as tall as a plain
 * one and would otherwise reach both barlines. Charts without one keep the
 * shorter bar and fit more on a screen.
 */
const SLASH_BAR_HEIGHT = 68;

/** Whether any chord in the song has a bass note under it. */
export const hasSlashChord = (song: Song): boolean =>
  song.sections.some((section) =>
    section.bars.some((bar) =>
      bar.chords.some((hit) => hit.chordName.includes('/')),
    ),
  );

/**
 * Air between one system and the next, as a share of the bar's own height.
 *
 * Without it the barlines of one row run straight into the row below and the
 * chart reads as one long ruled column rather than as systems. A printed
 * chart leaves about a third of a staff between them.
 */
export const rowGapFor = (barHeight: number): number =>
  Math.round(barHeight * 0.3);

const MARKS_HEIGHT = 14;
const THIN = '1px solid currentColor';
const THICK = '3px solid currentColor';

/**
 * The smallest share of a bar that any chord in the song has to itself.
 *
 * A chord's room is the distance to the chord after it, so two chords in a
 * 4/4 bar have half a bar each and four have a quarter. The tightest one in
 * the song sets the type size for all of them.
 */
export function tightestChordSlot(song: Song): number {
  const beats = song.timeSignature?.[0] || 4;
  let tightest = 1;
  for (const section of song.sections)
    for (const bar of section.bars)
      bar.chords.forEach((hit, i) => {
        const next = bar.chords[i + 1]?.beat ?? beats + 1;
        tightest = Math.min(tightest, (next - hit.beat) / beats);
      });
  // A bar of sixteenths would set the whole chart in six point; past a
  // quarter of a bar the answer is to let the symbols run close together.
  return Math.min(1, Math.max(tightest, 0.25));
}

/**
 * One type size for the whole chart.
 *
 * Sizing each bar by how many chords were in it made a chorus of one-chord
 * bars come out half again as big as the verse above it. Size belongs to the
 * chart, not to a bar: it comes from the room a chord has — a bar's width
 * narrowed by the closest two chords in the song — and every bar then reads
 * the same.
 *
 * `cqw` is one per cent of the chart's own width, so the browser works this
 * out itself. That holds through the stand's page zoom and in print, with
 * nothing measured and no second paint.
 */
export function chartTypeScale(
  barsInWidestRow: number,
  tightestSlot: number,
): { chord: string; label: string; marks: string } {
  // A compactly-set symbol is about 2.75 letter-widths across — the quality
  // and the bass are stacked in one narrow column beside the letter.
  const letter = ((100 / barsInWidestRow) * tightestSlot) / 2.75;
  const cq = (factor: number) => `${(letter * factor).toFixed(2)}cqw`;
  return {
    chord: `clamp(13px, ${cq(1)}, 26px)`,
    label: `clamp(11px, ${cq(0.62)}, 16px)`,
    marks: `clamp(9px, ${cq(0.52)}, 13px)`,
  };
}

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
  beatsPerBar: number;
  size: string;
  barHeight: number;
  /** Drawn before the first bar of the chart, as on paper. */
  timeSignature?: [number, number];
  onChordClick?: (hit: ChordHit) => void;
}> = ({
  bar,
  displayMode,
  notation,
  context,
  isLast,
  beatsPerBar,
  size,
  barHeight,
  timeSignature,
  onChordClick,
}) => (
  <div
    className="relative flex min-w-0 flex-1 items-center"
    style={{
      height: barHeight,
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

    {/* The bar's own span, which the chords are placed across by beat. */}
    <div className="relative h-full min-w-0 flex-1">
      {bar.restBars ? (
        <span className="absolute inset-0 flex items-center justify-center text-sm opacity-60">
          — {bar.restBars} —
        </span>
      ) : (
        // A chord sits where it is played: beat 1 against the barline, beat 3
        // halfway across. Reading a bar is reading where in it a change lands,
        // and chords packed against the left edge threw that away.
        bar.chords.map((hit, i) => {
          const label = chordText(hit, displayMode, notation, context);
          const at = Math.min(
            0.9,
            Math.max(0, (hit.beat - 1) / Math.max(1, beatsPerBar)),
          );
          return (
            <button
              key={i}
              type="button"
              onClick={() => onChordClick?.(hit)}
              aria-label={chordAriaLabel(hit, label)}
              className="absolute truncate rounded pr-1.5 text-left font-bold transition-colors hover:text-[#7ecfcf]"
              style={{
                background: 'none',
                border: 'none',
                color: 'inherit',
                left: `${(at * 100).toFixed(3)}%`,
                // Never past its own barline, however long the symbol.
                maxWidth: `${((1 - at) * 100).toFixed(3)}%`,
                top: '50%',
                transform: 'translateY(-50%)',
              }}
            >
              <ChordSymbolText text={label} size={size} />
            </button>
          );
        })
      )}
    </div>
  </div>
);

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

const BarMarks: FC<{ bar: ChordBar; size: string }> = ({ bar, size }) => {
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
        fontSize: size,
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
  beatsPerBar: number;
  type: ReturnType<typeof chartTypeScale>;
  barHeight: number;
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
  beatsPerBar,
  type,
  barHeight,
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
            style={{ fontFamily: 'serif', fontSize: type.label }}
          >
            {section.label}
          </span>
          {section.instrumental && (
            <span
              className="italic text-white/40"
              style={{ fontSize: type.marks }}
            >
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
            style={{
              marginBottom: rowGapFor(barHeight),
              ...(rowOpensPage ? pageBreak : {}),
            }}
          >
            {showMarks && (
              <div className="flex text-white/75">
                {row.bars.map((bar, bi) => (
                  <BarMarks key={bi} bar={bar} size={type.marks} />
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
                  beatsPerBar={beatsPerBar}
                  size={type.chord}
                  barHeight={barHeight}
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
  // Letters here are written the way a jazz chart writes them — "A−7", not
  // "Amin7". Four letters of "min7" beside the note letter is most of what
  // makes a phone bar too narrow, and a dash is one. A reader who has picked
  // Roman through the switcher keeps it; hybrid, which is the default and is
  // the longest of the three, gives way to jazz in this format only.
  const notation: ChordNotation =
    displayMode === 'hybrid' ? 'hybrid' : picked === 'hybrid' ? 'jazz' : picked;

  const { sectionKeys } = useMemo(() => songKeyMap(song), [song]);
  const systemOffsets = useMemo(
    () => songSystemOffsets(song, barsPerRow),
    [song, barsPerRow],
  );
  // A section that ends two bars over folds them into its last row, so the
  // widest row in the chart can be six where the chart reads four. Type set
  // for four would then run over the barline, so the widest row decides.
  const type = useMemo(() => {
    let widest = barsPerRow;
    for (const section of song.sections)
      for (const size of systemRowSizes(
        sectionBars(section).length,
        barsPerRow,
      ))
        widest = Math.max(widest, size);
    return chartTypeScale(widest, tightestChordSlot(song));
  }, [song, barsPerRow]);

  const barHeight = hasSlashChord(song) ? SLASH_BAR_HEIGHT : BAR_HEIGHT;

  return (
    // The container the `cqw` in the type scale is a percentage of: the chart
    // sets its own type from its own width, wherever it has been put.
    <div
      className="flex min-w-0 flex-col"
      style={{ containerType: 'inline-size' }}
    >
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
          beatsPerBar={song.timeSignature?.[0] || 4}
          type={type}
          barHeight={barHeight}
          timeSignature={song.timeSignature}
          onChordClick={onChordClick}
        />
      ))}
    </div>
  );
};
