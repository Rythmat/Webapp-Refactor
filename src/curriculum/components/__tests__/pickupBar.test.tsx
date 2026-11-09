// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NotationScore } from '@/lib/notation';
import GenrePianoRoll, { type NoteEvent } from '../GenrePianoRoll';
import { LearnNotationView, pickupLayout } from '../LearnNotationView';

/**
 * A pickup into bar 1 (Music Literacy's words): notes before tick 0, at the
 * end of the count-in bar. The roll opens on the pickup and marks bar 1
 * with a double bar; the staff writes the pickup in a bar 0 of its own,
 * rests up to its notes, closed by a double bar. Without one, nothing
 * changes.
 */

// The staff draws with VexFlow; what's checked is the score it's handed.
const grandStaff = vi.hoisted(() => vi.fn());
vi.mock('@/components/notation/GrandStaff', () => ({
  GrandStaff: (props: unknown) => {
    grandStaff(props);
    return null;
  },
}));

/** "When" on 4, "I" on its "and", "play" on the downbeat. */
const events: NoteEvent[] = [
  {
    id: 'when',
    pitchName: 'C4',
    midi: 60,
    startTicks: -480,
    durationTicks: 240,
  },
  { id: 'i', pitchName: 'C4', midi: 60, startTicks: -240, durationTicks: 240 },
  { id: 'play', pitchName: 'C4', midi: 60, startTicks: 0, durationTicks: 480 },
];

interface StaffProps {
  score: NotationScore;
  doubleBarEnds?: ReadonlySet<number>;
  playheadTick: number | null;
}

const staff = (props: Partial<Parameters<typeof LearnNotationView>[0]>) => {
  render(
    <LearnNotationView
      events={events}
      bars={2}
      beatsPerBar={4}
      inTime={false}
      playheadTick={0}
      height={300}
      staves="treble"
      toggle={null}
      {...props}
    />,
  );
  return grandStaff.mock.lastCall![0] as StaffProps;
};

/** A bar's treble line: "rest h", "note 8"… with where each starts. */
const line = (score: NotationScore, bar: number) =>
  score.measures[bar].staves.treble[0].items.map(
    (item) =>
      `${item.kind} ${item.value}${item.dots ? '.' : ''} @${item.startTick}`,
  );

describe('the staff with a pickup', () => {
  afterEach(cleanup);
  beforeEach(() => grandStaff.mockClear());

  it('writes the pickup in bar 0, rests ahead of it, then a double bar', () => {
    const { score, doubleBarEnds } = staff({ pickupTicks: 480 });
    expect(score.measures).toHaveLength(3);
    expect(score.measures[0]).toMatchObject({
      number: 0,
      startTick: -1920,
      endTick: 0,
    });
    expect(line(score, 0)).toEqual([
      'rest h @-1920',
      'rest q @-960',
      'note 8 @-480',
      'note 8 @-240',
    ]);
    expect(score.measures[1]).toMatchObject({ number: 1, startTick: 0 });
    expect(line(score, 1)[0]).toBe('note q @0');
    expect([...doubleBarEnds!]).toEqual([0]);
  });

  it('runs its playhead through the pickup bar, from the count-in', () => {
    expect(
      staff({ pickupTicks: 480, inTime: true, playheadTick: -600 })
        .playheadTick,
    ).toBe(-600);
    expect(
      staff({ pickupTicks: 480, inTime: true, playheadTick: -2400 })
        .playheadTick,
    ).toBeNull();
  });

  it('is the staff it always was without one', () => {
    const { score, doubleBarEnds, playheadTick } = staff({
      events: events.slice(2),
      inTime: true,
      playheadTick: -600,
    });
    expect(score.measures).toHaveLength(2);
    expect(score.measures[0]).toMatchObject({ number: 1, startTick: 0 });
    expect(doubleBarEnds).toBeUndefined();
    expect(playheadTick).toBeNull();
    expect(pickupLayout(0, 1920)).toEqual({
      originTick: 0,
      firstMeasureNumber: 1,
      extraBars: 0,
      doubleBarEnds: undefined,
    });
  });
});

describe('the roll with a pickup', () => {
  afterEach(cleanup);
  beforeEach(() => localStorage.clear());

  const doubleBars = () =>
    document.querySelectorAll('[data-roll-double-bar]').length;
  const labels = () =>
    screen
      .getAllByText(/^\d+(\.\d+)?$/)
      .map((el) => el.textContent)
      .slice(0, 5);

  it('opens on the pickup, its beat counted as the pickup bar’s, and double-bars bar 1', () => {
    render(<GenrePianoRoll events={events} bars={2} pickupTicks={480} />);
    expect(labels()).toEqual(['4', '1.1', '1.2', '1.3', '1.4']);
    // In the ruler and down the grid.
    expect(doubleBars()).toBe(2);
    // The double bar is a pickup's length in from the left: 480 of 4320.
    const bar = document.querySelector<HTMLElement>('[data-roll-double-bar]')!;
    expect(parseFloat(bar.style.left)).toBeCloseTo((480 / 4320) * 100);
  });

  it('keeps it in time, the count-in bar numbered as the pickup bar', () => {
    render(
      <GenrePianoRoll
        events={events}
        bars={2}
        pickupTicks={480}
        inTime
        isPlaying={false}
        onPlayingChange={() => {}}
      />,
    );
    expect(labels().slice(0, 4)).toEqual(['1', '2', '3', '4']);
    expect(doubleBars()).toBe(2);
  });

  it('is the roll it always was without one', () => {
    render(<GenrePianoRoll events={events.slice(2)} bars={2} />);
    expect(labels()[0]).toBe('1.1');
    expect(doubleBars()).toBe(0);
  });
});
