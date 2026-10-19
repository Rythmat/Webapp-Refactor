// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { buildAppliedTheoryFundamentalsFlow } from '@/curriculum/data/activityFlows/appliedTheoryFundamentals';
import { buildGuitarAppliedTheoryFundamentalsFlow } from '@/curriculum/data/activityFlows/guitarAppliedTheoryFundamentals';
import { chordSymbolTones } from '@/curriculum/engine/genreGeneration/chordSymbolTones';
import { buildGenrePracticeTrack } from '@/features/practiceTracks/genre/buildGenrePracticeTrack';
import { GuitarPracticePanel, shapeForChord } from '../GuitarPracticePanel';
import { guitarPracticeModel } from '../guitarVisualModel';

// A guitar Practice Track draws the guitar in place of the practice keyboard:
// the level's scale position to improvise in, or the section's chord shapes
// in the progression's order, the one sounding now ringed.

const flow = buildGuitarAppliedTheoryFundamentalsFlow('C');
const CYCLE = ['Cmaj7', 'Dm7', 'Em7', 'Fmaj7', 'G7', 'Am7', 'Bm7b5', 'Cmaj7'];

afterEach(cleanup);

describe('the guitar a Practice Track carries', () => {
  it('names the key, the scale position and the section’s shapes', () => {
    const melody = buildGenrePracticeTrack(flow, 'A')?.guitar;
    expect(melody).toMatchObject({ keyCenter: 'C', scalePosition: 'major' });
    const chords = buildGenrePracticeTrack(flow, 'B')?.guitar;
    expect(chords?.shapeIds.length).toBeGreaterThanOrEqual(7);
    expect(chords?.scalePosition).toBe('major');
  });

  it('is absent on piano', () => {
    const piano = buildAppliedTheoryFundamentalsFlow('C');
    expect(buildGenrePracticeTrack(piano, 'A')?.guitar).toBeUndefined();
  });
});

describe('shapeForChord', () => {
  it('takes the shape on the chord’s root, a seventh for a seventh chord', () => {
    const info = buildGenrePracticeTrack(flow, 'B')!.guitar!;
    const { chords } = guitarPracticeModel('C', { shapeIds: info.shapeIds });
    const g7 = shapeForChord(chords, chordSymbolTones('G7')!);
    expect(g7?.name).toMatch(/^G dominant 7/);
    expect(shapeForChord(chords, chordSymbolTones('F#7')!)).toBeNull();
  });
});

describe('GuitarPracticePanel', () => {
  it('shows the scale position to improvise in', () => {
    const info = buildGenrePracticeTrack(flow, 'A')!.guitar!;
    render(
      <GuitarPracticePanel
        {...info}
        view="scales"
        chordCycle={['Cmaj7']}
        chordIndex={-1}
        keyColor="#7ecfcf"
      />,
    );
    expect(screen.getByText('C major scale')).toBeTruthy();
  });

  it('rings the chord sounding now, in the progression’s order', () => {
    const info = buildGenrePracticeTrack(flow, 'B')!.guitar!;
    const { rerender } = render(
      <GuitarPracticePanel
        {...info}
        view="chords"
        chordCycle={CYCLE}
        chordIndex={-1}
        keyColor="#7ecfcf"
      />,
    );
    const list = () => screen.getByRole('list', { name: 'Chords' });
    const current = () =>
      within(list())
        .getAllByRole('listitem')
        .find((li) => li.getAttribute('aria-current'));
    // Before the playhead is in a chord, the first is ringed.
    expect(current()?.textContent).toMatch(/C major 7/);

    rerender(
      <GuitarPracticePanel
        {...info}
        view="chords"
        chordCycle={CYCLE}
        chordIndex={1}
        keyColor="#7ecfcf"
      />,
    );
    expect(current()?.textContent).toMatch(/D minor 7/);
    // One box per shape: the closing Cmaj7 rings the first box again.
    expect(within(list()).getAllByRole('listitem')).toHaveLength(7);
    rerender(
      <GuitarPracticePanel
        {...info}
        view="chords"
        chordCycle={CYCLE}
        chordIndex={7}
        keyColor="#7ecfcf"
      />,
    );
    expect(current()?.getAttribute('data-chord-index')).toBe('0');
  });
});
