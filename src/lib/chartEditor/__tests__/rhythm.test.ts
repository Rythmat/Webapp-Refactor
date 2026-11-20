import { describe, expect, it } from 'vitest';
import type {
  ChordBar,
  NoteValue,
  RhythmEvent,
} from '@/curriculum/types/songLibrary';
import {
  beamGroups,
  beatAt,
  chordLengthFrom,
  defaultRhythm,
  eventStarts,
  quartersAt,
  rhythmOf,
  setEventLength,
  toggleDot,
  togglePlain,
  toggleRest,
  toggleStem,
  toggleTie,
  valueOfQuarters,
  withRhythm,
} from '../rhythm';

/**
 * '4p 4 8 8~' → events: a value each, then 'p' a standard slash, '.' a dot,
 * 'r' a rest, '~' a tie, 'v' a stem down.
 */
const r = (text: string): RhythmEvent[] =>
  text.split(' ').map((token) => {
    const event: RhythmEvent = {
      value: token.replace(/[p.r~v]/g, '') as NoteValue,
    };
    if (token.includes('p')) event.plain = true;
    if (token.includes('.')) event.dot = true;
    if (token.includes('r')) event.rest = true;
    if (token.includes('~')) event.tie = true;
    if (token.includes('v')) event.stem = 'down';
    return event;
  });
const text = (events: RhythmEvent[]) =>
  events
    .map(
      (e) =>
        `${e.value}${e.plain ? 'p' : ''}${e.dot ? '.' : ''}${e.rest ? 'r' : ''}${e.tie ? '~' : ''}${e.stem === 'down' ? 'v' : ''}`,
    )
    .join(' ');

const FOUR: [number, number] = [4, 4];
const SIX_EIGHT: [number, number] = [6, 8];

describe('a bar with no rhythm of its own', () => {
  it('is a standard slash a beat, in the metre’s own beats', () => {
    expect(text(defaultRhythm(FOUR))).toBe('4p 4p 4p 4p');
    expect(text(defaultRhythm(SIX_EIGHT))).toBe('8p 8p 8p 8p 8p 8p');
    expect(text(defaultRhythm([2, 2]))).toBe('2p 2p');
    expect(text(defaultRhythm([3, 4]))).toBe('4p 4p 4p');
    expect(text(rhythmOf({ chords: [] }, FOUR))).toBe('4p 4p 4p 4p');
  });
});

describe('standard slashes beside rhythm notation (owner, 2026-11-12)', () => {
  it('keeps beats 1–3 as slashes when beat 4 becomes two eighths', () => {
    expect(text(setEventLength(defaultRhythm(FOUR), 3, '8', false, FOUR))).toBe(
      '4p 4p 4p 8 8',
    );
  });

  it('turns a standard slash into rhythm notation, and back', () => {
    const rhythm = togglePlain(defaultRhythm(FOUR), 1, FOUR);
    expect(text(rhythm)).toBe('4p 4 4p 4p');
    expect(text(togglePlain(rhythm, 1, FOUR))).toBe('4p 4p 4p 4p');
  });

  it('makes a beat of rhythm one standard slash again', () => {
    expect(text(togglePlain(r('4p 4p 4p 8 8~'), 4, FOUR))).toBe('4p 4p 4p 4p~');
    expect(text(togglePlain(r('4p 4p 16 16 8 4p'), 2, FOUR))).toBe(
      '4p 4p 4p 4p',
    );
  });

  it('takes the whole beats a value spans', () => {
    // A dotted quarter across 1 and 2 is two slashes, its eighth with it.
    expect(text(togglePlain(r('4. 8 4p 4p'), 0, FOUR))).toBe('4p 4p 4p 4p');
  });

  it('never beams standard slashes, even eighths in 6/8', () => {
    expect(beamGroups(defaultRhythm(SIX_EIGHT), SIX_EIGHT)).toEqual([]);
  });
});

describe('a slash’s length (the Rhythmic palette)', () => {
  it('splits a quarter into eighths, the "and" left as a slash', () => {
    expect(text(setEventLength(r('4 4 4 4'), 3, '8', false, FOUR))).toBe(
      '4 4 4 8 8',
    );
  });

  it('takes the time a longer value needs from what follows', () => {
    expect(text(setEventLength(r('4 4 4 4'), 0, '2', false, FOUR))).toBe(
      '2 4 4',
    );
    expect(text(setEventLength(r('4 4 4 4'), 1, '4', true, FOUR))).toBe(
      '4 4. 8 4',
    );
    expect(text(setEventLength(r('4 4 4 4'), 0, '1', false, FOUR))).toBe('1');
  });

  it('gives back the time a shorter value leaves', () => {
    expect(text(setEventLength(r('2 2'), 0, '4', false, FOUR))).toBe('4 4 2');
    expect(text(setEventLength(r('4 4 4 4'), 0, '16', false, FOUR))).toBe(
      '16 16 16 16 4 4 4',
    );
  });

  it('never runs past the barline', () => {
    expect(text(setEventLength(r('4 4 4 4'), 3, '2', false, FOUR))).toBe(
      '4 4 4 4',
    );
    expect(text(setEventLength(r('2 4 8 8'), 2, '2', false, FOUR))).toBe(
      '2 4 4',
    );
  });

  it('dots and undots, taking and giving time', () => {
    const dotted = toggleDot(r('4 4 4 4'), 0, FOUR);
    expect(text(dotted)).toBe('4. 8 4 4');
    expect(text(toggleDot(dotted, 0, FOUR))).toBe('4 8 8 4 4');
  });

  it('counts in eighths in 6/8', () => {
    expect(
      text(setEventLength(r('8 8 8 8 8 8'), 0, '4', true, SIX_EIGHT)),
    ).toBe('4. 8 8 8');
  });

  it('reads the palette’s lengths as values', () => {
    expect(valueOfQuarters(0.5)).toBe('8');
    expect(valueOfQuarters(4)).toBe('1');
    expect(valueOfQuarters(3)).toBeNull();
  });
});

describe('rests and ties', () => {
  it('makes a slash a rest, and a rest ties nothing', () => {
    const tied = toggleTie(r('4 4 4 4'), 3);
    expect(text(tied)).toBe('4 4 4 4~');
    expect(text(toggleRest(tied, 3))).toBe('4 4 4 4r');
    expect(text(toggleTie(r('4r 4 4 4'), 0))).toBe('4r 4 4 4');
  });

  it('writes the push: a hit on 4+, tied into the next bar', () => {
    const push = toggleTie(
      setEventLength(r('4 4 4 4'), 3, '8', false, FOUR),
      4,
    );
    expect(text(push)).toBe('4 4 4 8 8~');
    expect(eventStarts(push)[4]).toBe(3.5);
    expect(beatAt(3.5, FOUR)).toBe(4.5);
  });
});

describe('stems', () => {
  it('flips a slash’s stem down and back up', () => {
    const down = toggleStem(r('4 4 4 4'), 1, FOUR);
    expect(text(down)).toBe('4 4v 4 4');
    expect(text(toggleStem(down, 1, FOUR))).toBe('4 4 4 4');
  });

  it('flips a beamed group whole, from any slash in it', () => {
    expect(text(toggleStem(r('4 4 4 8 8'), 4, FOUR))).toBe('4 4 4 8v 8v');
  });

  it('leaves a standard slash alone: it has no stem', () => {
    expect(text(toggleStem(r('4p 4 4 4'), 0, FOUR))).toBe('4p 4 4 4');
  });
});

describe('positions', () => {
  it('converts quarters and the metre’s beats both ways', () => {
    expect(beatAt(1.5, FOUR)).toBe(2.5);
    expect(beatAt(1.5, SIX_EIGHT)).toBe(4);
    expect(quartersAt(4.5, FOUR)).toBe(3.5);
    expect(quartersAt(4, SIX_EIGHT)).toBe(1.5);
  });

  it('lasts a new chord until the next one, or the barline', () => {
    const bar: ChordBar = {
      chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }],
    };
    expect(chordLengthFrom(bar, 4.5, FOUR)).toBe(0.5);
    expect(chordLengthFrom(bar, 0.5, FOUR)).toBe(0.5);
  });
});

describe('storing it', () => {
  it('stores a standard slash a beat as nothing, and anything else as written', () => {
    expect('rhythm' in withRhythm({ chords: [] }, r('4p 4p 4p 4p'), FOUR)).toBe(
      false,
    );
    // Four quarters with stems are written rhythm, not the default.
    expect(withRhythm({ chords: [] }, r('4 4 4 4'), FOUR).rhythm).toEqual(
      r('4 4 4 4'),
    );
    expect(withRhythm({ chords: [] }, r('4p 4p 4p 8 8~'), FOUR).rhythm).toEqual(
      r('4p 4p 4p 8 8~'),
    );
    expect(
      'rhythm' in
        withRhythm({ chords: [], rhythm: r('2 2') }, r('4p 4p 4p 4p'), FOUR),
    ).toBe(false);
  });
});

describe('beams', () => {
  it('beams eighths within a beat, and leaves a lone one its flag', () => {
    expect(beamGroups(r('4 4 4 8 8'), FOUR)).toEqual([[3, 4]]);
    expect(beamGroups(r('8 8 8 8 4 4'), FOUR)).toEqual([
      [0, 1],
      [2, 3],
    ]);
    expect(beamGroups(r('4. 8 4 4'), FOUR)).toEqual([]);
    expect(beamGroups(r('8 8r 4 4 4'), FOUR)).toEqual([]);
  });

  it('beams by the dotted quarter in compound time', () => {
    expect(beamGroups(r('8 8 8 8 8 8'), SIX_EIGHT)).toEqual([
      [0, 1, 2],
      [3, 4, 5],
    ]);
  });
});
