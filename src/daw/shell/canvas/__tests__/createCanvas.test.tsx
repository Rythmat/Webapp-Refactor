// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ── Create's canvas: the header's controls and the chord lane (2.7, 2.13) ──
// Snap never moves the playhead (shell-18); the grid and the tool are
// visible choices (timeline-14, timeline-15); the chord lane's analysis
// offer blocks nothing and remembers Not now (insight-22); + Suggest is
// Premium and targets a track that can hold chords (ia-flows-26). Since
// Create's toolbar folded away (2.13, decision 16) the tools sit beside the
// ruler, Snap and Grid at its right end, zoom and Follow in the footer, and
// + Add track over the track list.

const h = vi.hoisted(() => ({
  premium: { isPremium: true, isLoading: false },
  navigate: vi.fn(),
}));
vi.mock('@/hooks/useIsPremium', () => ({ useIsPremium: () => h.premium }));
vi.mock('react-router-dom', () => ({ useNavigate: () => h.navigate }));

import { useStore } from '@/daw/store';
import { ChordAnalysisBanner } from '../ChordAnalysisBanner';
import { ChordLaneHeader, suggestTarget } from '../ChordLaneHeader';
import { GridMenu } from '../GridMenu';
import { RulerEndControls } from '../RulerEndControls';
import { TimelineFooter } from '../TimelineFooter';
import { TimelineTools } from '../TimelineTools';

const s = () => useStore.getState();

beforeEach(() => {
  useStore.setState({
    tracks: [],
    chordRegions: [],
    selectedTrackId: null,
    position: 960,
    activeTool: 'cursor',
    timelineSnapEnabled: true,
    timelineGridSize: '1/4',
    timelineTripletMode: false,
    followPlayhead: true,
    chordAnalysisOffered: false,
    chordAnalysisDismissed: false,
    chordAnalysisPromptOpen: false,
  });
  s().setTimeSignature(4, 4);
  h.premium = { isPremium: true, isLoading: false };
  h.navigate.mockClear();
});
afterEach(cleanup);

describe('the header’s controls', () => {
  it('turns snap off and on without moving the playhead (shell-18)', () => {
    render(<RulerEndControls />);
    fireEvent.click(screen.getByRole('button', { name: 'Snap to grid' }));
    expect(s().timelineSnapEnabled).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Snap to grid' }));
    expect(s().timelineSnapEnabled).toBe(true);
    expect(s().position).toBe(960);
  });

  it('picks the tool beside the ruler, and Follow is the student’s switch', () => {
    render(
      <>
        <TimelineTools />
        <TimelineFooter />
      </>,
    );
    fireEvent.click(screen.getByRole('radio', { name: 'Cut clips (C)' }));
    expect(s().activeTool).toBe('scissors');
    fireEvent.click(
      screen.getByRole('button', { name: 'Follow the playhead' }),
    );
    expect(s().followPlayhead).toBe(false);
  });

  it('zooms from the footer, beside the scrollbar', () => {
    useStore.setState({ timelineZoom: 1 });
    render(<TimelineFooter />);
    const footer = screen.getByTestId('timeline-footer');
    expect(footer).toContainElement(screen.getByTestId('timeline-scrollbar'));
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(s().timelineZoom).toBeGreaterThan(1);
    fireEvent.click(screen.getByRole('button', { name: 'Zoom out' }));
    fireEvent.click(screen.getByRole('button', { name: 'Zoom out' }));
    expect(s().timelineZoom).toBeLessThan(1);
  });

  it('names the grid on its button', () => {
    useStore.setState({ timelineGridSize: '1/8T', timelineSnapEnabled: false });
    render(<GridMenu />);
    expect(
      screen.getByRole('button', { name: 'Grid: 1/8 triplet, snap off' }),
    ).toBeInTheDocument();
  });

  it('puts snap and the grid together at the ruler’s end', () => {
    render(<RulerEndControls />);
    const end = screen.getByRole('group', { name: 'Grid and snap' });
    expect(end).toContainElement(screen.getByTestId('snap-toggle'));
    expect(end).toContainElement(screen.getByTestId('grid-menu'));
  });
});

describe('the chord lane’s analysis offer', () => {
  it('shows only while offered and the lane is empty', () => {
    const { rerender } = render(<ChordAnalysisBanner />);
    expect(screen.queryByTestId('chord-analysis-banner')).toBeNull();
    useStore.setState({ chordAnalysisOffered: true });
    rerender(<ChordAnalysisBanner />);
    expect(screen.getByTestId('chord-analysis-banner')).toBeInTheDocument();
  });

  it('Analyze… opens the analysis; Not now goes and stays gone', () => {
    useStore.setState({ chordAnalysisOffered: true });
    render(<ChordAnalysisBanner />);
    fireEvent.click(screen.getByRole('button', { name: /Analyze/ }));
    expect(s().chordAnalysisPromptOpen).toBe(true);
    expect(screen.queryByTestId('chord-analysis-banner')).toBeNull();

    act(() => useStore.setState({ chordAnalysisOffered: true }));
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
    expect(s().chordAnalysisDismissed).toBe(true);
    expect(screen.queryByTestId('chord-analysis-banner')).toBeNull();
  });
});

describe('+ Suggest', () => {
  it('suggests after the last chord, for a track that can hold chords', () => {
    const drums = s().addTrack('midi', 'drum-machine', 'Drums');
    const keys = s().addTrack('midi', 'piano-sampler', 'Keys');
    s().setSelectedTrackId(drums);
    expect(suggestTarget(s(), 2500)).toEqual({ tick: 1920, trackId: keys });
    useStore.setState({
      chordRegions: [{ startTick: 0, endTick: 3840 } as never],
    });
    expect(suggestTarget(s(), 0)?.tick).toBe(3840);
  });

  it('has nothing to suggest for without such a track', () => {
    s().addTrack('midi', 'drum-machine', 'Drums');
    expect(suggestTarget(s(), 0)).toBeNull();
    render(<ChordLaneHeader />);
    expect(
      screen.getByRole('button', { name: 'Suggest chords (Prism)' }),
    ).toBeDisabled();
  });

  it('opens the suggestions for Premium, the plans for a free student', () => {
    s().addTrack('midi', 'piano-sampler', 'Keys');
    const open = vi.fn();
    useStore.setState({ openPrismSuggestion: open });
    const { unmount } = render(<ChordLaneHeader />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Suggest chords (Prism)' }),
    );
    expect(open).toHaveBeenCalledWith(0, s().tracks[0].id);
    unmount();

    h.premium = { isPremium: false, isLoading: false };
    render(<ChordLaneHeader />);
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Suggest chords (Prism, Premium, locked)',
      }),
    );
    expect(h.navigate).toHaveBeenCalled();
    expect(open).toHaveBeenCalledTimes(1);
  });

  it('shows the key as a chip, dashed when there is none', () => {
    useStore.setState({ rootNote: null });
    render(<ChordLaneHeader />);
    expect(screen.getByTestId('chord-lane-key')).toHaveTextContent('No key');
  });
});
