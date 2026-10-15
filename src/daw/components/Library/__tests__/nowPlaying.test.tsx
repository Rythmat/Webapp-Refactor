// @vitest-environment jsdom
/**
 * Insight's "Now Playing" card draws a played chord with the chord cards'
 * own parts: the same tones, lesson links and alternatives (insight-21). Its
 * lesson links used to be its own copies, with 8 px icons and no way back:
 * a lesson opened from them didn't know the song it came from.
 */
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readLessonOrigin } from '@/lib/learn/lessonOrigin';

// The card is about live notes; the analysis sections below it aren't.
vi.mock('../ChordSymbolsSection', () => ({ ChordSymbolsSection: () => null }));
vi.mock('../SelectionAnalysis', () => ({ SelectionAnalysis: () => null }));
vi.mock('../UnisonSections', () => ({ UnisonSections: () => null }));

import { useStore } from '@/daw/store';
import { InsightContent } from '../InsightContent';

const initial = useStore.getState();

beforeEach(() => {
  useStore.setState({
    projectName: 'Midnight Groove',
    rootNote: 0, // C
    mode: 'ionian',
    stringSeq: [],
    chordRegions: [],
    audioActiveNotes: [],
    // D F A: the 2 chord of C major.
    hwActiveNotes: new Set([62, 65, 69]),
  });
});

afterEach(() => {
  cleanup();
  useStore.setState(initial, true);
});

function renderInsight() {
  render(
    <MemoryRouter>
      <InsightContent />
    </MemoryRouter>,
  );
}

describe('Now Playing', () => {
  it("links a played chord's lessons back to the song and chord", () => {
    renderInsight();

    const learn = screen.getByRole('link', { name: /Learn this sound/ });
    expect(learn).toHaveTextContent('D Dorian');
    const [path, query] = learn.getAttribute('href')!.split('?');
    expect(path).toMatch(/dorian/);
    expect(readLessonOrigin(new URLSearchParams(query))).toEqual({
      song: 'Midnight Groove',
      chord: expect.stringContaining('D min'),
    });
  });

  it("shows the played chord's tones as a chord card does", () => {
    renderInsight();

    expect(screen.getByText('Notes: D – F – A')).toBeInTheDocument();
    expect(screen.getByText('R')).toBeInTheDocument();
    // The parent-scale link: D Dorian's parent is C major, the song's key,
    // so there is none.
    expect(screen.queryByText('Parent scale:')).toBeNull();
  });

  it('offers no lesson without a key, but still names the chord', () => {
    useStore.setState({ rootNote: null });
    renderInsight();

    expect(screen.getByText('Notes: D – F – A')).toBeInTheDocument();
    expect(screen.queryByRole('link')).toBeNull();
  });
});
