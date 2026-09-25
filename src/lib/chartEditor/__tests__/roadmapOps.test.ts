import { describe, expect, it } from 'vitest';
import type { SongSection } from '@/curriculum/types/songLibrary';
import {
  clearRoadmap,
  flagState,
  setBarValue,
  setEnding,
  sharedValue,
  toggleBarFlag,
} from '../roadmapOps';

const bar = (name: string) => ({
  chords: [{ degree: '1 maj', chordName: name, beat: 1, duration: 4 }],
});
const chart = (): SongSection[] => [
  { id: 'v', label: 'Verse', bars: [bar('C'), bar('F'), bar('G'), bar('C')] },
  { id: 'c', label: 'Chorus', bars: [bar('Am'), bar('E')] },
];
const refs = (...pairs: [number, number][]) =>
  pairs.map(([section, b]) => ({ section, bar: b }));

describe('flags', () => {
  it('turns a mark on across the whole selection', () => {
    const out = toggleBarFlag(chart(), refs([0, 0], [0, 3]), 'repeatStart');
    expect(out[0].bars[0].repeatStart).toBe(true);
    expect(out[0].bars[3].repeatStart).toBe(true);
    expect(out[0].bars[1].repeatStart).toBeUndefined();
  });

  it('turns it off only when every selected bar already has it', () => {
    let out = toggleBarFlag(chart(), refs([0, 0]), 'fermata');
    // One of two has it: the toggle sets the other rather than clearing.
    out = toggleBarFlag(out, refs([0, 0], [0, 1]), 'fermata');
    expect(out[0].bars[0].fermata).toBe(true);
    expect(out[0].bars[1].fermata).toBe(true);
    // Now both have it, so it clears.
    out = toggleBarFlag(out, refs([0, 0], [0, 1]), 'fermata');
    expect(out[0].bars[0].fermata).toBeUndefined();
    expect(out[0].bars[1].fermata).toBeUndefined();
  });

  it('removes the key rather than storing false', () => {
    const on = toggleBarFlag(chart(), refs([0, 0]), 'segno');
    const off = toggleBarFlag(on, refs([0, 0]), 'segno');
    expect('segno' in off[0].bars[0]).toBe(false);
  });

  it('works across sections', () => {
    const out = toggleBarFlag(chart(), refs([0, 3], [1, 0]), 'coda');
    expect(out[0].bars[3].coda).toBe(true);
    expect(out[1].bars[0].coda).toBe(true);
  });

  it('reports whether the whole selection carries the mark', () => {
    const out = toggleBarFlag(chart(), refs([0, 0]), 'toCoda');
    expect(flagState(out, refs([0, 0]), 'toCoda')).toBe(true);
    expect(flagState(out, refs([0, 0], [0, 1]), 'toCoda')).toBe(false);
    expect(flagState(out, [], 'toCoda')).toBe(false);
  });

  it('leaves the chart alone for an empty selection', () => {
    expect(toggleBarFlag(chart(), [], 'fine')).toEqual(chart());
  });
});

describe('valued marks', () => {
  it('writes a cue and a key change', () => {
    let out = setBarValue(chart(), refs([0, 2]), 'cue', 'Break');
    out = setBarValue(out, refs([1, 0]), 'keyChange', 'A♭ major');
    expect(out[0].bars[2].cue).toBe('Break');
    expect(out[1].bars[0].keyChange).toBe('A♭ major');
  });

  it('writes a jump', () => {
    const out = setBarValue(chart(), refs([1, 1]), 'jump', 'D.S. al Coda');
    expect(out[1].bars[1].jump).toBe('D.S. al Coda');
  });

  it('clears on empty, undefined or a nonsense number', () => {
    const on = setBarValue(chart(), refs([0, 0]), 'cue', 'Riff');
    expect('cue' in setBarValue(on, refs([0, 0]), 'cue', '')[0].bars[0]).toBe(
      false,
    );
    expect(
      'cue' in setBarValue(on, refs([0, 0]), 'cue', undefined)[0].bars[0],
    ).toBe(false);
    const rest = setBarValue(chart(), refs([0, 0]), 'restBars', NaN);
    expect('restBars' in rest[0].bars[0]).toBe(false);
  });

  it('reports a shared value, and nothing when they differ', () => {
    let out = setBarValue(chart(), refs([0, 0], [0, 1]), 'cue', 'Riff');
    expect(sharedValue(out, refs([0, 0], [0, 1]), 'cue')).toBe('Riff');
    out = setBarValue(out, refs([0, 1]), 'cue', 'Break');
    expect(sharedValue(out, refs([0, 0], [0, 1]), 'cue')).toBeUndefined();
    expect(sharedValue(out, [], 'cue')).toBeUndefined();
  });
});

describe('endings', () => {
  it('brackets the selected bars as the first ending', () => {
    const out = setEnding(chart(), refs([0, 2], [0, 3]), [1]);
    expect(out[0].bars[2].ending).toEqual([1]);
    expect(out[0].bars[3].ending).toEqual([1]);
  });

  it('takes a bracket over both passes, sorted and deduped', () => {
    const out = setEnding(chart(), refs([0, 0]), [2, 1, 2]);
    expect(out[0].bars[0].ending).toEqual([1, 2]);
  });

  it('clears the bracket', () => {
    const on = setEnding(chart(), refs([0, 0]), [1]);
    expect('ending' in setEnding(on, refs([0, 0]), undefined)[0].bars[0]).toBe(
      false,
    );
    expect('ending' in setEnding(on, refs([0, 0]), [])[0].bars[0]).toBe(false);
  });

  it('ignores nonsense pass numbers', () => {
    const out = setEnding(chart(), refs([0, 0]), [0, -1, 1.5, 2]);
    expect(out[0].bars[0].ending).toEqual([2]);
  });
});

describe('clearing', () => {
  it('strips every mark but keeps the music', () => {
    let out = toggleBarFlag(chart(), refs([0, 0]), 'repeatStart');
    out = setBarValue(out, refs([0, 0]), 'cue', 'Break');
    out = setEnding(out, refs([0, 0]), [1]);
    out = setBarValue(out, refs([0, 0]), 'keyChange', 'G major');

    const cleared = clearRoadmap(out, refs([0, 0]));
    expect(cleared[0].bars[0]).toEqual(bar('C'));
  });

  it('keeps a multi-bar rest, which is music not roadmap', () => {
    const rest = setBarValue(chart(), refs([0, 1]), 'restBars', 4);
    const cleared = clearRoadmap(rest, refs([0, 1]));
    expect(cleared[0].bars[1].restBars).toBe(4);
  });
});

describe('purity', () => {
  it('never mutates the chart it was given', () => {
    const sections = chart();
    toggleBarFlag(sections, refs([0, 0]), 'repeatStart');
    setEnding(sections, refs([0, 0]), [1]);
    setBarValue(sections, refs([0, 0]), 'cue', 'Break');
    clearRoadmap(sections, refs([0, 0]));
    expect(sections[0].bars[0]).toEqual(bar('C'));
  });

  it('leaves untouched sections identical, so React can skip them', () => {
    const sections = chart();
    const out = toggleBarFlag(sections, refs([0, 0]), 'repeatStart');
    expect(out[1]).toBe(sections[1]);
  });
});
