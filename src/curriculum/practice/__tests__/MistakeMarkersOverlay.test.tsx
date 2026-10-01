// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  MeasureBox,
  NoteInfo,
  StaffLayout,
} from '@/components/notation/StaffView';
import type { TargetOutcome } from '@/curriculum/hooks/useGenreAssessment';
import { MistakeMarkersOverlay } from '../MistakeMarkersOverlay';

afterEach(cleanup);

const BAR = 1920;

/** Count-in bar plus two step bars on one system, 400px each. */
function fakeLayout(notes: Array<[tick: number, x: number]> = []): StaffLayout {
  const measures: MeasureBox[] = [0, 1, 2].map((i) => ({
    measureIndex: i,
    partIndex: 0,
    system: 0,
    x: i * 400,
    y: 28,
    width: 400,
    height: 128,
    startTick: i * BAR,
    endTick: (i + 1) * BAR,
  }));
  const drawn: NoteInfo[] = notes.map(([tick, x], i) => ({
    id: `n${i}`,
    partIndex: 0,
    measureIndex: Math.floor(tick / BAR),
    tick,
    x,
    y: 50,
    space: 6.5,
    stem: 'down',
    letter: 'c',
    octave: 4,
    alteration: 0,
    line: 0,
  }));
  return {
    barlines: [],
    measures,
    notes: drawn,
    rests: [],
    scale: 1,
    systemHeight: 168,
    stepPx: 6.5,
    topLineDrop: 13,
  };
}

const outcome = (
  onsetTick: number,
  status: TargetOutcome['status'],
  timingDevTicks?: number,
): TargetOutcome => ({
  targetIndex: 0,
  onsetTick,
  status,
  ...(timingDevTicks === undefined ? {} : { timingDevTicks }),
});

function markers() {
  return screen.queryAllByRole('button').map((b) => ({
    kind: b.getAttribute('data-mistake'),
    glyph: b.textContent,
    label: b.getAttribute('aria-label'),
    left: b.style.left,
  }));
}

describe('MistakeMarkersOverlay', () => {
  it('marks each mistake with its glyph and says what went wrong', () => {
    render(
      <MistakeMarkersOverlay
        layout={fakeLayout()}
        outcomes={[
          outcome(0, 'hit'),
          outcome(480, 'missed'),
          outcome(960, 'wrong'),
          outcome(1440, 'hit', -200),
          outcome(1920, 'hit', 200),
          outcome(2400, 'unclear'),
          outcome(2880, 'hit', 60),
        ]}
        countInOffset={BAR}
        onLoopBar={() => {}}
      />,
    );
    expect(
      markers().map(({ kind, glyph, label }) => [kind, glyph, label]),
    ).toEqual([
      ['missed', '✗', 'Missed at bar 1, beat 2. Loop bar 1'],
      ['wrong', '≠', 'Wrong at bar 1, beat 3. Loop bar 1'],
      ['early', '◀', 'Early at bar 1, beat 4. Loop bar 1'],
      ['late', '▶', 'Late at bar 2, beat 1. Loop bar 2'],
      ['unclear', '?', 'Unclear at bar 2, beat 2. Loop bar 2'],
    ]);
  });

  it('places a marker at the note drawn at its tick, past the count-in', () => {
    const layout = fakeLayout([[BAR + 480, 555]]);
    render(
      <MistakeMarkersOverlay
        layout={layout}
        outcomes={[outcome(480, 'missed'), outcome(960, 'missed')]}
        countInOffset={BAR}
        onLoopBar={() => {}}
      />,
    );
    const [drawnNote, noNote] = markers();
    expect(drawnNote.left).toBe('555px');
    // No note drawn at 960: halfway across bar 1 (x 400–800).
    expect(noNote.left).toBe('600px');
    const button = screen.getAllByRole('button')[0];
    // Under the stems: the bottom of the measure box.
    expect(parseFloat(button.style.top)).toBeGreaterThan(28 + 128 - 20);
  });

  it('works out of time too, with no count-in', () => {
    render(
      <MistakeMarkersOverlay
        layout={fakeLayout()}
        outcomes={[outcome(BAR, 'missed')]}
        countInOffset={0}
        onLoopBar={() => {}}
      />,
    );
    expect(markers()[0].left).toBe('400px');
    expect(markers()[0].label).toBe('Missed at bar 2, beat 1. Loop bar 2');
  });

  it('one marker per tick names every mistake there', () => {
    render(
      <MistakeMarkersOverlay
        layout={fakeLayout()}
        outcomes={[
          outcome(0, 'wrong'),
          outcome(0, 'missed'),
          outcome(0, 'missed'),
        ]}
        countInOffset={BAR}
        onLoopBar={() => {}}
      />,
    );
    expect(markers()).toHaveLength(1);
    expect(markers()[0]).toMatchObject({
      kind: 'missed',
      label: '2 missed, wrong at bar 1, beat 1. Loop bar 1',
    });
  });

  it('loops the bar a marker is in', () => {
    const onLoopBar = vi.fn();
    render(
      <MistakeMarkersOverlay
        layout={fakeLayout()}
        outcomes={[outcome(BAR + 960, 'missed')]}
        countInOffset={BAR}
        onLoopBar={onLoopBar}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Loop bar 2$/ }));
    expect(onLoopBar).toHaveBeenCalledWith(1);
  });

  it('draws nothing for a clean take or a missing layout', () => {
    const { container, rerender } = render(
      <MistakeMarkersOverlay
        layout={fakeLayout()}
        outcomes={[outcome(0, 'hit', 10)]}
        countInOffset={0}
        onLoopBar={() => {}}
      />,
    );
    expect(container.innerHTML).toBe('');
    rerender(
      <MistakeMarkersOverlay
        layout={null}
        outcomes={[outcome(0, 'missed')]}
        countInOffset={0}
        onLoopBar={() => {}}
      />,
    );
    expect(container.innerHTML).toBe('');
  });
});
