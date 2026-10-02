// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NotationScore } from '@/lib/notation';
import type { NoteEvent } from '../GenrePianoRoll';
import { LearnNotationView } from '../LearnNotationView';

// The staff draws with VexFlow; what's checked is the score and clef it's handed.
const grandStaff = vi.hoisted(() => vi.fn());
vi.mock('@/components/notation/GrandStaff', () => ({
  GrandStaff: (props: unknown) => {
    grandStaff(props);
    return null;
  },
}));

// Open C on a guitar, as it sounds: C3 E3 G3 C4 E4.
const events: NoteEvent[] = [48, 52, 55, 60, 64].map((midi, i) => ({
  id: `n${i}`,
  pitchName: ['C3', 'E3', 'G3', 'C4', 'E4'][i],
  midi,
  startTicks: 0,
  durationTicks: 1920,
}));

const drawn = (props: Partial<Parameters<typeof LearnNotationView>[0]>) => {
  render(
    <LearnNotationView
      events={events}
      bars={1}
      beatsPerBar={4}
      inTime={false}
      playheadTick={0}
      height={300}
      staves="treble"
      toggle={null}
      {...props}
    />,
  );
  return grandStaff.mock.lastCall![0] as {
    score: NotationScore;
    clefAnnotation?: string;
  };
};

const writtenPitches = (score: NotationScore) =>
  score.measures[0].staves.treble[0].items[0].keys.map(
    (k) => `${k.letter}${k.octave}`,
  );

describe('LearnNotationView octave shift', () => {
  afterEach(cleanup);

  it('writes the sounding pitch with no clef mark by default', () => {
    const { score, clefAnnotation } = drawn({});
    expect(writtenPitches(score)).toEqual(['c3', 'e3', 'g3', 'c4', 'e4']);
    expect(clefAnnotation).toBeUndefined();
  });

  it('writes guitar an octave up with an 8 under the clef', () => {
    const { score, clefAnnotation } = drawn({
      writtenOctaveShift: 1,
      clefAnnotation: '8vb',
    });
    expect(writtenPitches(score)).toEqual(['c4', 'e4', 'g4', 'c5', 'e5']);
    expect(clefAnnotation).toBe('8vb');
    // The same notes: ids are unchanged, so progress colours still land.
    expect(
      score.measures[0].staves.treble[0].items[0].keys.map((k) => k.noteId),
    ).toEqual(events.map((e) => e.id));
  });
});

describe('LearnNotationView header', () => {
  afterEach(cleanup);
  const header = (props: Partial<Parameters<typeof LearnNotationView>[0]>) =>
    render(
      <LearnNotationView
        events={events}
        bars={1}
        beatsPerBar={4}
        inTime={false}
        playheadTick={0}
        height={300}
        toggle={<span data-testid="view-toggle" />}
        {...props}
      />,
    ).container;

  it('keeps its header strip and toggle by default', () => {
    const host = header({});
    expect(host.querySelector('[data-testid="view-toggle"]')).toBeTruthy();
    expect(host.firstElementChild!.children).toHaveLength(2);
  });

  it('draws no header strip with showHeader off', () => {
    const host = header({ showHeader: false });
    expect(host.querySelector('[data-testid="view-toggle"]')).toBeNull();
    // Only the staff's own box is left in the panel.
    expect(host.firstElementChild!.children).toHaveLength(1);
  });
});
