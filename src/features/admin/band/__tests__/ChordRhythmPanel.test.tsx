// @vitest-environment jsdom
/**
 * A band style's chord rhythm (owner, 2026-11-10): an admin sets how long
 * its chords hold, how early they change, and a loop's own holds; a
 * content editor only sees them.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { StyleHarmony } from '@/curriculum/engine/band/harmonicRhythm';
import { ChordRhythmPanel } from '../ChordRhythmPanel';

afterEach(cleanup);

const panel = (
  harmony: StyleHarmony | undefined,
  readOnly = false,
  onChange = vi.fn(),
) => {
  render(
    <ChordRhythmPanel
      harmony={harmony}
      onChange={onChange}
      chords={['Cm', 'G7sus']}
      beatsPerBar={4}
      inputClass=""
      readOnly={readOnly}
    />,
  );
  return onChange;
};

describe('ChordRhythmPanel', () => {
  it('sets the style’s hold and push, and clears what says nothing', () => {
    const onChange = panel(undefined);
    fireEvent.change(screen.getByLabelText('Bars each chord holds'), {
      target: { value: '2' },
    });
    expect(onChange).toHaveBeenLastCalledWith({ barsPerChord: 2 });
    fireEvent.change(screen.getByLabelText('How early the changes arrive'), {
      target: { value: '240' },
    });
    expect(onChange).toHaveBeenLastCalledWith({ push: 240 });
    cleanup();
    const back = panel({ push: 240 });
    fireEvent.change(screen.getByLabelText('How early the changes arrive'), {
      target: { value: '0' },
    });
    expect(back).toHaveBeenLastCalledWith(undefined);
  });

  it('writes a loop’s own holds, by its chord count', () => {
    const onChange = panel({ barsPerChord: 2 });
    expect(screen.getByText(/2-chord loops · 4 bars/)).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Shorten G7sus'));
    expect(onChange).toHaveBeenLastCalledWith({
      barsPerChord: 2,
      rhythms: { '2': [8, 7] },
    });
  });

  it('only shows a content editor the rhythm', () => {
    const onChange = panel({ barsPerChord: 2 }, true);
    expect(
      (screen.getByLabelText('Bars each chord holds') as HTMLSelectElement)
        .disabled,
    ).toBe(true);
    fireEvent.click(screen.getByLabelText('Lengthen Cm'));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText(/Only an admin can change it/)).toBeTruthy();
  });
});
