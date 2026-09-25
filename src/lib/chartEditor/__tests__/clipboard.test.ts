import { describe, expect, it } from 'vitest';
import type { ChordBar, SongSection } from '@/curriculum/types/songLibrary';
import { copySelection, paste, pasteBars, pasteLabel } from '../clipboard';
import { clickBar, clickChord, NO_SELECTION } from '../selection';

const hit = (name: string, beat = 1) => ({
  degree: '1 maj',
  chordName: name,
  beat,
  duration: 4,
});
const bar = (name: string, over: Partial<ChordBar> = {}): ChordBar => ({
  chords: [hit(name)],
  ...over,
});

const chart = (): SongSection[] => [
  {
    id: 'verse',
    label: 'Verse',
    bars: [
      bar('C', { repeatStart: true }),
      bar('F'),
      bar('G', { ending: [1], cue: 'Break' }),
      bar('C', { repeatEnd: true, ending: [2] }),
    ],
  },
  {
    id: 'chorus',
    label: 'Chorus',
    bars: [bar('Am'), bar('E'), bar('Am'), bar('E')],
  },
];
const names = (s: SongSection[]) =>
  s.map((sec) => sec.bars.map((b) => b.chords[0]?.chordName ?? '—'));

describe('copying', () => {
  it('takes a bar with its roadmap, not just its chords', () => {
    // A verse copied without its endings is worse than useless.
    const s = clickBar({ sections: chart() }, NO_SELECTION, {
      section: 0,
      bar: 2,
    });
    const clip = copySelection(chart(), s);
    expect(clip).toEqual({
      kind: 'bars',
      bars: [{ chords: [hit('G')], ending: [1], cue: 'Break' }],
    });
  });

  it('takes a run across a section boundary', () => {
    const sections = chart();
    let s = clickBar({ sections }, NO_SELECTION, { section: 0, bar: 3 });
    s = clickBar({ sections }, s, { section: 1, bar: 0 }, { shift: true });
    const clip = copySelection(sections, s);
    expect(
      clip?.kind === 'bars' && clip.bars.map((b) => b.chords[0].chordName),
    ).toEqual(['C', 'Am']);
  });

  it('copies chords on their own', () => {
    const s = clickChord({ sections: chart() }, NO_SELECTION, {
      section: 1,
      bar: 0,
      chord: 0,
    });
    expect(copySelection(chart(), s)).toEqual({
      kind: 'chords',
      chords: [hit('Am')],
    });
  });

  it('copies nothing from an empty selection', () => {
    expect(copySelection(chart(), NO_SELECTION)).toBeNull();
  });

  it('never hands back a reference into the chart', () => {
    const sections = chart();
    const s = clickBar({ sections }, NO_SELECTION, { section: 0, bar: 0 });
    const clip = copySelection(sections, s);
    if (clip?.kind !== 'bars') throw new Error('expected bars');
    clip.bars[0].chords[0].chordName = 'MUTATED';
    expect(sections[0].bars[0].chords[0].chordName).toBe('C');
  });
});

describe('pasting bars', () => {
  it('writes over the bars from here, keeping the form length', () => {
    const out = pasteBars(chart(), { section: 1, bar: 0 }, [
      bar('X'),
      bar('Y'),
    ]);
    expect(names(out)).toEqual([
      ['C', 'F', 'G', 'C'],
      ['X', 'Y', 'Am', 'E'],
    ]);
  });

  it('crosses a section boundary the way a reader would', () => {
    const out = pasteBars(chart(), { section: 0, bar: 3 }, [
      bar('X'),
      bar('Y'),
      bar('Z'),
    ]);
    expect(names(out)).toEqual([
      ['C', 'F', 'G', 'X'],
      ['Y', 'Z', 'Am', 'E'],
    ]);
  });

  it('stops at the end rather than growing the chart', () => {
    // Pasting four bars over the last two must not invent two more.
    const out = pasteBars(chart(), { section: 1, bar: 2 }, [
      bar('W'),
      bar('X'),
      bar('Y'),
      bar('Z'),
    ]);
    expect(names(out)).toEqual([
      ['C', 'F', 'G', 'C'],
      ['Am', 'E', 'W', 'X'],
    ]);
  });

  it('carries the roadmap onto the pasted bars', () => {
    const sections = chart();
    let s = clickBar({ sections }, NO_SELECTION, { section: 0, bar: 2 });
    s = clickBar({ sections }, s, { section: 0, bar: 3 }, { shift: true });
    const clip = copySelection(sections, s);
    const out = paste(sections, { section: 1, bar: 0 }, clip);
    expect(out[1].bars[0]).toMatchObject({ ending: [1], cue: 'Break' });
    expect(out[1].bars[1]).toMatchObject({ ending: [2], repeatEnd: true });
  });

  it('insert pushes the rest along', () => {
    const out = pasteBars(
      chart(),
      { section: 1, bar: 1 },
      [bar('X')],
      'insert',
    );
    expect(names(out)).toEqual([
      ['C', 'F', 'G', 'C'],
      ['Am', 'X', 'E', 'Am', 'E'],
    ]);
  });

  it('leaves the chart alone for an empty clipboard or a bad target', () => {
    expect(names(paste(chart(), { section: 0, bar: 0 }, null))).toEqual(
      names(chart()),
    );
    expect(
      names(pasteBars(chart(), { section: 9, bar: 9 }, [bar('X')])),
    ).toEqual(names(chart()));
  });

  it('does not mutate the chart it was given', () => {
    const sections = chart();
    pasteBars(sections, { section: 0, bar: 0 }, [bar('X')]);
    expect(names(sections)[0][0]).toBe('C');
  });
});

describe('pasting chords', () => {
  it('replaces the chords in the clicked bar', () => {
    const clip = {
      kind: 'chords' as const,
      chords: [hit('X', 1), hit('Y', 3)],
    };
    const out = paste(chart(), { section: 0, bar: 1 }, clip);
    expect(out[0].bars[1].chords.map((c) => c.chordName)).toEqual(['X', 'Y']);
    // The bar's roadmap is untouched — only its chords changed.
    expect(out[0].bars[0].repeatStart).toBe(true);
  });
});

describe('the menu item', () => {
  it('says what it would paste', () => {
    expect(pasteLabel(null)).toBeNull();
    expect(pasteLabel({ kind: 'bars', bars: [bar('C')] })).toBe('Paste 1 bar');
    expect(pasteLabel({ kind: 'bars', bars: [bar('C'), bar('F')] })).toBe(
      'Paste 2 bars',
    );
    expect(pasteLabel({ kind: 'chords', chords: [hit('C')] })).toBe(
      'Paste 1 chord',
    );
  });
});
