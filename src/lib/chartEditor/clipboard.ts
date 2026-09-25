import type {
  ChordBar,
  ChordHit,
  SongSection,
} from '@/curriculum/types/songLibrary';
import {
  chartBars,
  type BarRef,
  type ChartSelection,
  type ChordRef,
} from './selection';

/**
 * Copying and pasting parts of a chart.
 *
 * A copied bar carries its roadmap — its repeat barlines, its volta, its
 * segno, its cue. Copying four bars of a verse and pasting them into the
 * second verse is the commonest correction there is, and it is worthless if
 * the 1st- and 2nd-ending brackets do not come too.
 *
 * Everything is deep-copied on the way in and on the way out, so a clipboard
 * held across edits can never alias the chart it came from.
 */

export type ChartClipboard =
  | { kind: 'bars'; bars: ChordBar[] }
  | { kind: 'chords'; chords: ChordHit[] };

/** How pasted bars meet the bars already there. */
export type PasteMode =
  /** Write over the bars from here on. The form keeps its length. */
  | 'replace'
  /** Push the existing bars along. The form gets longer. */
  | 'insert';

const cloneBar = (bar: ChordBar): ChordBar => ({
  ...bar,
  chords: bar.chords.map((c) => ({ ...c })),
  ...(bar.ending ? { ending: [...bar.ending] } : {}),
});

const cloneChord = (chord: ChordHit): ChordHit => ({ ...chord });

/** Nothing selected, or a selection that no longer points at anything. */
export function copySelection(
  sections: readonly SongSection[],
  selection: ChartSelection,
): ChartClipboard | null {
  if (selection.kind === 'bars') {
    const bars = selection.refs
      .map((r) => sections[r.section]?.bars[r.bar])
      .filter((b): b is ChordBar => !!b)
      .map(cloneBar);
    return bars.length ? { kind: 'bars', bars } : null;
  }
  if (selection.kind === 'chords') {
    const chords = selection.refs
      .map((r) => sections[r.section]?.bars[r.bar]?.chords[r.chord])
      .filter((c): c is ChordHit => !!c)
      .map(cloneChord);
    return chords.length ? { kind: 'chords', chords } : null;
  }
  return null;
}

/**
 * Paste bars at a point in the chart.
 *
 * `replace` walks the bars from here in reading order and writes over them,
 * crossing section boundaries as the reader would and stopping at the end of
 * the chart rather than growing it — pasting a four-bar phrase should not
 * silently add bars to the last section. `insert` puts them into the clicked
 * section at that index and pushes the rest along.
 */
export function pasteBars(
  sections: readonly SongSection[],
  at: BarRef,
  bars: readonly ChordBar[],
  mode: PasteMode = 'replace',
): SongSection[] {
  if (bars.length === 0) return sections.map((s) => ({ ...s }));
  const next = sections.map((s) => ({ ...s, bars: [...s.bars] }));
  if (
    !next[at.section]?.bars[at.bar] &&
    !(mode === 'insert' && next[at.section])
  )
    return next;

  if (mode === 'insert') {
    next[at.section].bars.splice(at.bar, 0, ...bars.map(cloneBar));
    return next;
  }

  const order = chartBars({ sections: next });
  const start = order.findIndex(
    (r) => r.section === at.section && r.bar === at.bar,
  );
  if (start < 0) return next;
  bars.forEach((bar, i) => {
    const target = order[start + i];
    if (!target) return; // Past the end: the chart does not grow.
    next[target.section].bars[target.bar] = cloneBar(bar);
  });
  return next;
}

/**
 * Paste chords into the bar that was clicked, replacing what is there.
 *
 * Chords land on the beats they were copied from, which is what makes copying
 * a two-chord bar across a chart do the same thing every time.
 */
export function pasteChords(
  sections: readonly SongSection[],
  at: BarRef,
  chords: readonly ChordHit[],
): SongSection[] {
  const next = sections.map((s) => ({ ...s, bars: [...s.bars] }));
  const bar = next[at.section]?.bars[at.bar];
  if (!bar) return next;
  next[at.section].bars[at.bar] = {
    ...bar,
    chords: chords.map(cloneChord),
  };
  return next;
}

/** Paste whatever is on the clipboard, wherever the player clicked. */
export function paste(
  sections: readonly SongSection[],
  at: BarRef | ChordRef,
  clip: ChartClipboard | null,
  mode: PasteMode = 'replace',
): SongSection[] {
  if (!clip) return sections.map((s) => ({ ...s }));
  return clip.kind === 'bars'
    ? pasteBars(sections, at, clip.bars, mode)
    : pasteChords(sections, at, clip.chords);
}

/** What the paste menu item should say. */
export function pasteLabel(clip: ChartClipboard | null): string | null {
  if (!clip) return null;
  const n = clip.kind === 'bars' ? clip.bars.length : clip.chords.length;
  const noun = clip.kind === 'bars' ? 'bar' : 'chord';
  return `Paste ${n} ${noun}${n === 1 ? '' : 's'}`;
}
