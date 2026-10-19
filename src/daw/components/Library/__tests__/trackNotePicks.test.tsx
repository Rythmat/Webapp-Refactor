// @vitest-environment jsdom
/**
 * Insight's track picks (TrackNotePicks): a beginner selects the notes of
 * the chord track and the bass track with a click each, no ⌘-drag, and
 * Analyze appears for them.
 *
 * Run: npx vitest run src/daw/components/Library/__tests__/trackNotePicks.test.tsx
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useStore } from '@/daw/store';
import { SelectionAnalysis } from '../SelectionAnalysis';

const s = () => useStore.getState();
const byAnchor = (id: string) =>
  document.querySelector<HTMLElement>(`[data-tutorial-id="${id}"]`);

const chord = (notes: number[], bar: number) =>
  notes.map((note) => ({
    note,
    velocity: 90,
    startTick: bar * 1920,
    durationTicks: 1920,
    channel: 0,
  }));

afterEach(cleanup);

beforeEach(() => {
  useStore.setState(useStore.getInitialState(), true);
  const keys = s().addTrack('midi', 'electric-piano', 'Rhodes');
  s().addMidiClip(keys, {
    id: 'chords',
    startTick: 0,
    events: [...chord([53, 57, 60, 64], 0), ...chord([52, 55, 59, 62], 1)],
  });
  const bass = s().addTrack('midi', 'soundfont', 'Bass');
  s().addMidiClip(bass, {
    id: 'line',
    startTick: 0,
    events: [...chord([41], 0), ...chord([40], 1)],
  });
  const drums = s().addTrack('midi', 'drum-machine', 'Drums');
  s().addMidiClip(drums, { id: 'beat', startTick: 0, events: chord([36], 0) });
});

describe('Insight’s track picks', () => {
  it('offers the instrument tracks with notes, not the drums', () => {
    render(<SelectionAnalysis />);
    expect(byAnchor('insight-tracks')).not.toBeNull();
    expect(byAnchor('insight-track-0')?.textContent).toContain('Rhodes');
    expect(byAnchor('insight-track-1')?.textContent).toContain('Bass');
    expect(byAnchor('insight-track-2')).toBeNull();
    expect(byAnchor('insight-analyze')).toBeNull();
  });

  it('selects whole tracks with a click each, and Analyze appears', () => {
    render(<SelectionAnalysis />);
    fireEvent.click(byAnchor('insight-track-0')!);
    fireEvent.click(byAnchor('insight-track-1')!);
    expect(byAnchor('insight-track-0')).toHaveAttribute('aria-pressed', 'true');
    expect(byAnchor('insight-track-1')).toHaveAttribute('aria-pressed', 'true');
    expect(s().selectedNotes).toEqual([
      {
        trackId: s().tracks[0].id,
        clipId: 'chords',
        noteIndices: [0, 1, 2, 3, 4, 5, 6, 7],
      },
      { trackId: s().tracks[1].id, clipId: 'line', noteIndices: [0, 1] },
    ]);
    const analyze = byAnchor('insight-analyze')!;
    expect(analyze.textContent).toContain('Analyze 10 notes');
    expect(screen.getByRole('button', { name: /Rhodes/ })).toBeTruthy();

    // A second click takes a track out again.
    fireEvent.click(byAnchor('insight-track-1')!);
    expect(byAnchor('insight-analyze')!.textContent).toContain(
      'Analyze 8 notes',
    );
  });
});
