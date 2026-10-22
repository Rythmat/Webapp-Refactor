// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import {
  choicesStorageKey,
  emptyChoices,
  withProgression,
  type SavedProgression,
} from '@/curriculum/engine/musicLiteracy/choices';
import { getLiveMusicLiteracy } from '@/curriculum/engine/musicLiteracy/registry';
import {
  BAND_PICKS_KEY,
  bandCharts,
  defaultBandProgression,
  openingBandProgression,
  PART_2_LESSON_ID,
  readBandPicks,
  readBandProgressions,
  savedBandProgressions,
  STARTER,
  writeBandPicks,
} from '../bandProgressions';

/**
 * What Part 3 offers a band to play: the progressions saved in Part 2, in
 * the lesson's order, the one it opens on, and the picks it remembers.
 */

const part2 = getLiveMusicLiteracy(PART_2_LESSON_ID)!;

const saved = (
  template: SavedProgression['template'],
  chords: string,
  harmony: SavedProgression['harmony'] = 'triads',
): SavedProgression => ({
  template,
  chords: chords.split(' ') as SavedProgression['chords'],
  harmony,
  tonic: 'D',
  mode: 'minor',
});
const xxxx = ['X', 'X', 'X', 'X'] as SavedProgression['template'];

beforeEach(() => localStorage.clear());

describe('the student’s progressions', () => {
  it('come in the lesson’s order, the triads and then the 7ths', () => {
    let choices = emptyChoices();
    choices = withProgression(
      choices,
      'four-chords-7ths',
      saved(xxxx, '1 4 5 6', 'sevenths'),
    );
    choices = withProgression(choices, 'one-and-x', saved(['1', 'X'], '1 4'));
    choices = withProgression(choices, 'four-chords', saved(xxxx, '1 4 5 6'));
    expect(savedBandProgressions(choices, part2).map((p) => p.name)).toEqual([
      'one-and-x',
      'four-chords',
      'four-chords-7ths',
    ]);
  });

  it('leave out one the lesson’s step no longer fits', () => {
    // four-chords is | X | X | X | X |: a two-bar one is from an older lesson.
    const choices = withProgression(
      emptyChoices(),
      'four-chords',
      saved(['1', 'X'], '1 4'),
    );
    expect(savedBandProgressions(choices, part2)).toEqual([]);
    // Without the lesson, whatever is saved.
    expect(savedBandProgressions(choices, undefined)).toHaveLength(1);
  });

  it('open on four-chords, else the most complete', () => {
    const list = [
      { name: 'one-and-x', progression: saved(['1', 'X'], '1 4') },
      {
        name: 'three-chords-1',
        progression: saved(['1', 'X', 'X', 'X'], '1 4 5 4'),
      },
      { name: 'four-chords', progression: saved(xxxx, '1 4 5 6') },
    ];
    expect(defaultBandProgression(list).name).toBe('four-chords');
    expect(defaultBandProgression(list.slice(0, 2)).name).toBe(
      'three-chords-1',
    );
    expect(defaultBandProgression([])).toBe(STARTER);
  });

  it('are the starter, C major’s 1 6 4 5, while nothing is saved', () => {
    expect(readBandProgressions()).toEqual([STARTER]);
    expect(STARTER.progression).toMatchObject({
      tonic: 'C',
      mode: 'major',
      chords: ['1', '6', '4', '5'],
    });
  });

  it('are read from this device, as Part 2 saved them', () => {
    const choices = withProgression(
      emptyChoices(),
      'four-chords',
      saved(xxxx, '1 4 5 6'),
    );
    localStorage.setItem(
      choicesStorageKey(PART_2_LESSON_ID),
      JSON.stringify(choices),
    );
    expect(readBandProgressions().map((p) => p.name)).toEqual(['four-chords']);
  });

  it('give the switch one chart each, the same chords once', () => {
    const charts = bandCharts([
      { name: 'a', progression: saved(xxxx, '1 4 5 6') },
      { name: 'b', progression: saved(xxxx, '1 4 5 6') },
      { name: 'c', progression: saved(xxxx, '1 4 5 6', 'sevenths') },
    ]);
    expect(charts.map((c) => c.id)).toEqual([
      'D.minor.triads.1-4-5-6',
      'D.minor.sevenths.1-4-5-6',
    ]);
  });
});

describe('the picks, remembered', () => {
  it('come back as they were written, and open on the progression picked', () => {
    expect(readBandPicks()).toEqual({});
    writeBandPicks({
      progression: 'one-and-x',
      band: 'funk-band-1',
      variation: 'l1-pocket',
    });
    expect(readBandPicks()).toEqual({
      progression: 'one-and-x',
      band: 'funk-band-1',
      variation: 'l1-pocket',
    });
    const list = [
      { name: 'one-and-x', progression: saved(['1', 'X'], '1 4') },
      { name: 'four-chords', progression: saved(xxxx, '1 4 5 6') },
    ];
    expect(openingBandProgression(list).name).toBe('one-and-x');
    // One no longer saved: the default.
    expect(openingBandProgression(list, { progression: 'gone' }).name).toBe(
      'four-chords',
    );
  });

  it('read as nothing when what’s kept is unreadable', () => {
    localStorage.setItem(BAND_PICKS_KEY, '{not json');
    expect(readBandPicks()).toEqual({});
    localStorage.setItem(BAND_PICKS_KEY, JSON.stringify({ band: 7 }));
    expect(readBandPicks()).toEqual({
      progression: undefined,
      band: undefined,
      variation: undefined,
    });
  });
});
