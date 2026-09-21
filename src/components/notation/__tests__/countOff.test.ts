import { describe, expect, it } from 'vitest';
import {
  countOffBeat,
  countOffBeatAtTime,
  countOffBeatIndex,
} from '../CountOff';

const Q = 480;
const BAR_4_4 = Q * 4;

/** The spoken count, bar by bar, as a player would say it. */
const spoken = (bars: number, beatsPerBar = 4) =>
  Array.from({ length: bars * beatsPerBar }, (_, i) =>
    countOffBeat(i, beatsPerBar),
  );

describe('countOffBeat', () => {
  it('counts one bar as 1 2 3 4', () => {
    expect(spoken(1).map((b) => b.label)).toEqual(['1', '2', '3', '4']);
  });

  it('counts two bars as 1 2 3 4 · 2 2 3 4', () => {
    expect(spoken(2).map((b) => b.label)).toEqual([
      '1',
      '2',
      '3',
      '4',
      '2',
      '2',
      '3',
      '4',
    ]);
  });

  it('marks only the downbeat of each bar', () => {
    expect(spoken(2).map((b) => b.isDownbeat)).toEqual([
      true,
      false,
      false,
      false,
      true,
      false,
      false,
      false,
    ]);
  });

  it('puts the emphasis on the 1 of bar one and the 2 of bar two', () => {
    const beats = spoken(2);
    const lit = beats.filter((b) => b.isDownbeat).map((b) => b.label);
    expect(lit).toEqual(['1', '2']);
  });

  it('follows the meter rather than assuming four beats', () => {
    expect(spoken(1, 3).map((b) => b.label)).toEqual(['1', '2', '3']);
    expect(spoken(2, 3).map((b) => b.label)).toEqual([
      '1',
      '2',
      '3',
      '2',
      '2',
      '3',
    ]);
    expect(spoken(2, 6).map((b) => b.label)).toEqual([
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '2',
      '2',
      '3',
      '4',
      '5',
      '6',
    ]);
  });

  it('reports the bar and beat it came from', () => {
    expect(countOffBeat(0, 4)).toMatchObject({ bar: 0, beat: 0 });
    expect(countOffBeat(5, 4)).toMatchObject({ bar: 1, beat: 1 });
  });
});

describe('countOffBeatIndex — playhead driven (Learn)', () => {
  it('walks the beats of a one-bar lead-in', () => {
    // The playhead runs from -countInTicks up to 0.
    const at = (tick: number) => countOffBeatIndex(tick, BAR_4_4, Q);
    expect(at(-BAR_4_4)).toBe(0);
    expect(at(-BAR_4_4 + Q)).toBe(1);
    expect(at(-BAR_4_4 + Q * 2)).toBe(2);
    expect(at(-BAR_4_4 + Q * 3)).toBe(3);
  });

  it('holds each number for the whole beat', () => {
    expect(countOffBeatIndex(-BAR_4_4 + 1, BAR_4_4, Q)).toBe(0);
    expect(countOffBeatIndex(-BAR_4_4 + Q - 1, BAR_4_4, Q)).toBe(0);
    expect(countOffBeatIndex(-BAR_4_4 + Q, BAR_4_4, Q)).toBe(1);
  });

  it('walks all eight beats of a two-bar lead-in', () => {
    const lead = BAR_4_4 * 2;
    const labels = Array.from(
      { length: 8 },
      (_, i) =>
        countOffBeat(countOffBeatIndex(-lead + i * Q, lead, Q)!, 4).label,
    );
    expect(labels).toEqual(['1', '2', '3', '4', '2', '2', '3', '4']);
  });

  it('stops counting the moment the music starts', () => {
    expect(countOffBeatIndex(0, BAR_4_4, Q)).toBeNull();
    expect(countOffBeatIndex(120, BAR_4_4, Q)).toBeNull();
  });

  it('shows nothing when there is no lead-in', () => {
    expect(countOffBeatIndex(-100, 0, Q)).toBeNull();
  });

  it('never runs past the last beat of the lead-in', () => {
    expect(countOffBeatIndex(-1, BAR_4_4, Q)).toBe(3);
  });

  it('holds on the first beat if the playhead sits before the lead-in', () => {
    // GenrePianoRoll pins the playhead until the transport clock is alive.
    expect(countOffBeatIndex(-BAR_4_4 - 50, BAR_4_4, Q)).toBe(0);
  });
});

describe('countOffBeatAtTime — clock driven (Studio)', () => {
  const beat = 0.5; // 120bpm

  it('walks the beats as the audio clock advances', () => {
    expect(countOffBeatAtTime(0, beat, 4)).toBe(0);
    expect(countOffBeatAtTime(0.5, beat, 4)).toBe(1);
    expect(countOffBeatAtTime(1.75, beat, 4)).toBe(3);
  });

  it('gives up once the count-in is over', () => {
    expect(countOffBeatAtTime(2, beat, 4)).toBeNull();
  });

  it('counts eight beats for two bars', () => {
    const labels = Array.from(
      { length: 8 },
      (_, i) => countOffBeat(countOffBeatAtTime(i * beat, beat, 8)!, 4).label,
    );
    expect(labels).toEqual(['1', '2', '3', '4', '2', '2', '3', '4']);
  });

  it('shows nothing when the count-in is switched off', () => {
    expect(countOffBeatAtTime(0, beat, 0)).toBeNull();
  });

  it('holds the first beat against a clock read slightly early', () => {
    expect(countOffBeatAtTime(-0.01, beat, 4)).toBe(0);
  });
});

describe('the Genre lesson\u2019s two-bar lead-in, end to end', () => {
  // The real chain in GenreLessonContainerV2 + GenrePianoRoll:
  //   COUNT_IN_OFFSET = 1920, LEAD_IN_TICKS = 3840
  //   playbackTicks()   = raw transport ticks (NOT offset — that is
  //                       soundingTicks, a different function)
  //   roll playheadTick = playbackTicks() - rollCountInTicks(1920)
  //                     = transportTicks - 1920
  //   roll note onsets are shifted +COUNT_IN_OFFSET, so the student's bar 1
  //   sits at roll tick 1920, not 0.
  const COUNT_IN_OFFSET = 1920;
  const LEAD_IN_TICKS = COUNT_IN_OFFSET * 2;
  const ROLL_COUNT_IN = 1920;
  const MUSIC_START = LEAD_IN_TICKS - ROLL_COUNT_IN; // 1920

  const playheadAt = (transportTicks: number) => transportTicks - ROLL_COUNT_IN;
  const countAt = (transportTicks: number) => {
    const index = countOffBeatIndex(
      playheadAt(transportTicks),
      LEAD_IN_TICKS,
      Q,
      MUSIC_START,
    );
    return index === null ? null : countOffBeat(index, 4);
  };

  it('counts 1 2 3 4 2 2 3 4 across the two bars the student hears', () => {
    const labels = Array.from(
      { length: 8 },
      (_, beat) => countAt(beat * Q)?.label,
    );
    expect(labels).toEqual(['1', '2', '3', '4', '2', '2', '3', '4']);
  });

  it('starts on 1 at the very top of the lead-in', () => {
    // The reported bug: this used to read "2", because the count assumed the
    // music began at roll tick 0 when it actually begins at 1920.
    expect(countAt(0)).toMatchObject({ label: '1', isDownbeat: true });
  });

  it('lights the 1 of bar one and the 2 of bar two', () => {
    expect(countAt(0)).toMatchObject({ label: '1', isDownbeat: true });
    expect(countAt(Q * 4)).toMatchObject({ label: '2', isDownbeat: true });
    [1, 2, 3, 5, 6, 7].forEach((beat) => {
      expect(countAt(beat * Q)?.isDownbeat).toBe(false);
    });
  });

  it('clears the moment the student\u2019s bar 1 arrives', () => {
    expect(countAt(LEAD_IN_TICKS)).toBeNull();
    // ...and is still counting on the beat before it.
    expect(countAt(LEAD_IN_TICKS - Q)).toMatchObject({ label: '4' });
  });

  it('counts one bar when the lead-in is one bar and notes are not shifted', () => {
    // musicStartTick falls out as 0: leadIn(1920) - rollCountIn(1920).
    const labels = Array.from({ length: 4 }, (_, beat) => {
      const index = countOffBeatIndex(-BAR_4_4 + beat * Q, BAR_4_4, Q, 0);
      return countOffBeat(index!, 4).label;
    });
    expect(labels).toEqual(['1', '2', '3', '4']);
    expect(countOffBeatIndex(0, BAR_4_4, Q, 0)).toBeNull();
  });

  it('derives the music start the way GenrePianoRoll does', () => {
    // One-bar lead-in: bar 1 is at tick 0. Two-bar: a bar later.
    expect(Math.max(0, 1920 - ROLL_COUNT_IN)).toBe(0);
    expect(Math.max(0, LEAD_IN_TICKS - ROLL_COUNT_IN)).toBe(1920);
  });
});
