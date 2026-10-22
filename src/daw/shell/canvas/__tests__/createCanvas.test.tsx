// @vitest-environment jsdom
import type { ReactNode } from 'react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

// ── Create's canvas: the header's controls and the chord lane (2.7, 2.13) ──
// Snap never moves the playhead (shell-18); the grid and the tool are
// visible choices (timeline-14, timeline-15); the chord lane's analysis
// offer blocks nothing and remembers Not now (insight-22); + Suggest is
// Premium and targets a track that can hold chords (ia-flows-26). Since
// Create's toolbar folded away (2.13, decision 16) the tools sit beside the
// ruler, Snap and Grid at its right end, zoom and Follow in the footer, and
// + Add track over the track list. Their tips open where they cover no
// control, and the Grid menu's radio groups say what they choose.

const h = vi.hoisted(() => ({
  premium: { isPremium: true, isLoading: false },
  navigate: vi.fn(),
}));
vi.mock('@/hooks/useIsPremium', () => ({ useIsPremium: () => h.premium }));
vi.mock('react-router-dom', () => ({ useNavigate: () => h.navigate }));

import { useStore } from '@/daw/store';
import { installDomShims } from '@/daw/ui/__tests__/dom';
import {
  setChordNotation,
  setChordNotationSwitcherEnabled,
} from '@/lib/chordNotation';
import { ChordAnalysisBanner } from '../ChordAnalysisBanner';
import { ChordLaneHeader, suggestTarget } from '../ChordLaneHeader';
import { Menu, MenuContent, MenuTrigger } from '@/daw/ui/Menu';
import { SnapToGridSub, TimelineDisplaySub } from '../GridMenu';
import { TimelineFooter } from '../TimelineFooter';
import { EditToolButton } from '../TimelineTools';

const s = () => useStore.getState();

/** A submenu as the top bar's More menu holds it: open, with its trigger. */
function InMore({ children }: { children: ReactNode }) {
  return (
    <Menu defaultOpen modal={false}>
      <MenuTrigger>More</MenuTrigger>
      <MenuContent>{children}</MenuContent>
    </Menu>
  );
}
const openSub = (testId: string) =>
  fireEvent.keyDown(screen.getByTestId(testId), { key: 'ArrowRight' });
/** The tip on screen (Radix's hidden copy, role="tooltip", sits inside). */
const shownTip = () => screen.getByRole('tooltip').parentElement!;

beforeAll(installDomShims);

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
afterEach(() => {
  cleanup();
  setChordNotationSwitcherEnabled(false);
  setChordNotation('hybrid');
});

describe('the header’s controls', () => {
  it('turns snap off and on from More, without moving the playhead (shell-18)', () => {
    for (const expected of [false, true]) {
      const { unmount } = render(
        <InMore>
          <SnapToGridSub />
        </InMore>,
      );
      openSub('grid-menu');
      fireEvent.click(screen.getByTestId('grid-snap'));
      expect(s().timelineSnapEnabled).toBe(expected);
      unmount();
    }
    expect(s().position).toBe(960);
  });

  it('steps the tool with one button: Pointer, Draw, Cut, Pointer', () => {
    useStore.setState({ activeTool: 'cursor' });
    render(<EditToolButton />);
    const button = screen.getByTestId('edit-tool');
    expect(button).toHaveAccessibleName('Pointer (V): click for Draw clips');
    fireEvent.click(button);
    expect(s().activeTool).toBe('pencil');
    expect(button).toHaveAccessibleName('Draw clips (B): click for Cut clips');
    fireEvent.click(button);
    expect(s().activeTool).toBe('scissors');
    fireEvent.click(button);
    expect(s().activeTool).toBe('cursor');
    // The layout tool (key 4) shows as the pointer; a click takes Draw.
    act(() => useStore.setState({ activeTool: 'layout' }));
    expect(button).toHaveAttribute('data-tool', 'cursor');
    fireEvent.click(button);
    expect(s().activeTool).toBe('pencil');
  });

  it('Follow is the student’s switch', () => {
    render(<TimelineFooter />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Follow the playhead' }),
    );
    expect(s().followPlayhead).toBe(false);
  });

  it('zooms from the footer, beside the song overview', () => {
    useStore.setState({ timelineZoom: 1 });
    render(<TimelineFooter />);
    const footer = screen.getByTestId('timeline-footer');
    expect(footer).toContainElement(screen.getByTestId('timeline-overview'));
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(s().timelineZoom).toBeGreaterThan(1);
    fireEvent.click(screen.getByRole('button', { name: 'Zoom out' }));
    fireEvent.click(screen.getByRole('button', { name: 'Zoom out' }));
    expect(s().timelineZoom).toBeLessThan(1);
  });

  it('names the grid, and says when snap is off, on its More row', () => {
    useStore.setState({ timelineGridSize: '1/8T', timelineSnapEnabled: false });
    render(
      <InMore>
        <SnapToGridSub />
      </InMore>,
    );
    expect(screen.getByTestId('grid-menu')).toHaveAccessibleName(
      'Snap to grid: 1/8 triplet, snap off',
    );
  });
});

describe('the header’s tips', () => {
  // Above, the tools' tips covered + Add track and Snap's covered + Section
  // at the sections lane's right end; below, Grid's covered the side rail.
  // Radix keeps a tip open while the pointer is over it, so a click meant
  // for what it covered landed on the tip.
  it('open the tool’s under the top bar', () => {
    render(<EditToolButton />);
    act(() => screen.getByTestId('edit-tool').focus());
    expect(shownTip()).toHaveTextContent('Pointer (V)');
    expect(shownTip()).toHaveAttribute('data-side', 'bottom');
  });
});

describe('More ▸ Timeline display', () => {
  const open = () => openSub('timeline-display-menu');
  const Display = () => (
    <InMore>
      <TimelineDisplaySub />
    </InMore>
  );
  const checked = (name: string) =>
    screen.getByRole('menuitemradio', { name }).getAttribute('aria-checked');

  it('names its radio groups', () => {
    render(<Display />);
    open();
    expect(
      screen.getByRole('group', { name: 'Chord lane labels' }),
    ).toBeInTheDocument();
    // Harmony Color is a switch, not a group (2026-10-22).
    expect(screen.queryByRole('group', { name: 'Colour clips by' })).toBeNull();
  });

  it('switches Harmony Color on and off', () => {
    useStore.setState({ clipColorMode: 'track' });
    render(<Display />);
    open();
    const item = screen.getByRole('menuitemcheckbox', {
      name: /Harmony Color/,
    });
    expect(item).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(item);
    expect(useStore.getState().clipColorMode).toBe('prism');
  });

  it('checks the hybrid labels choice, and neither under Jazz notation', () => {
    useStore.setState({ chordRulerShowNotes: true });
    const { unmount } = render(<Display />);
    open();
    expect(checked('Note names')).toBe('true');
    expect(checked('Degree numbers')).toBe('false');
    unmount();

    setChordNotationSwitcherEnabled(true);
    setChordNotation('jazz');
    render(<Display />);
    open();
    // The lane draws jazz symbols, not the note names the choice keeps.
    expect(checked('Note names')).toBe('false');
    expect(checked('Degree numbers')).toBe('false');
    expect(
      screen.getByRole('menuitemradio', { name: 'Note names' }),
    ).toHaveAttribute('aria-disabled', 'true');
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

describe('the chord lane’s corner', () => {
  it('is empty: the key is set in the top bar, suggestions on the clip menu', () => {
    render(<ChordLaneHeader />);
    const corner = screen.getByTestId('chord-lane-header');
    expect(corner).toBeEmptyDOMElement();
    expect(corner).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByTestId('chord-lane-key')).toBeNull();
    expect(screen.queryByTestId('chord-lane-suggest')).toBeNull();
  });
});

describe('where Suggest puts chords', () => {
  it('suggests after the last chord, for a track that can hold chords', () => {
    const drums = s().addTrack('midi', 'drum-machine', 'Drums');
    const keys = s().addTrack('midi', 'soundfont', 'Keys');
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
  });
});
