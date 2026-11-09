// @vitest-environment jsdom
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
import type { MidiNoteEvent } from '@prism/engine';
import type { StaffViewProps } from '@/components/notation/StaffView';
import { installDomShims } from '@/daw/ui/__tests__/dom';

// ── The Score is one editor (owner, 2026-10-21) ────────────────────────────
// The Full score and the Lead sheet were two layouts with a switch; now the
// page has one toolbar over the staves of every instrument track, the
// song's chords over them. Its Staves menu takes tracks off; with none left,
// or no notes yet, the page is the chord chart under the same toolbar, and
// Add notes goes back to the staves to write. The old 'leadsheet' view id
// opens the Score.
//
// Run: npx vitest run src/daw/components/Score/__tests__/scoreLayout.test.tsx

const h = vi.hoisted(() => ({ staff: null as StaffViewProps | null }));
vi.mock('@/components/notation/StaffView', () => ({
  // The palettes draw their cells in the music font; it never arrives here.
  loadVexFlow: () => new Promise(() => {}),
  StaffView: (props: StaffViewProps) => {
    h.staff = props;
    return <div data-testid="staff" />;
  },
}));
vi.mock('@/hooks/data/auth/useMe', () => ({
  useMe: () => ({ data: undefined }),
}));
vi.mock('@/daw/shell/lazyParts', () => ({ preloadView: vi.fn() }));

import { useStore, type AllSlices } from '@/daw/store';
import type { ChordRegion } from '@/daw/store/prismSlice';
import { ViewTabs } from '@/daw/shell/topbar/ViewTabs';
import { ScoreView } from '../ScoreView';

const s = () => useStore.getState();
const ev = (note: number, startTick: number): MidiNoteEvent => ({
  note,
  startTick,
  durationTicks: 480,
  velocity: 100,
  channel: 0,
});

const CHORDS: ChordRegion[] = [
  {
    id: 'chord-c',
    startTick: 0,
    endTick: 1920,
    name: '1 major',
    noteName: 'C',
    color: [200, 80, 80],
  },
];

let keys = '';
let bass = '';

beforeAll(installDomShims);

beforeEach(() => {
  h.staff = null;
  useStore.setState({
    tracks: [],
    remoteUsers: new Map(),
    currentView: 'score',
    chordRegions: CHORDS,
    rootNote: 0,
    mode: 'ionian',
    scoreHiddenTrackIds: [],
    scoreNoteInput: false,
  } as Partial<AllSlices>);
  keys = s().addTrack('midi', 'soundfont', 'Keys');
  bass = s().addTrack('midi', 'soundfont', 'Bass', {
    gmProgram: 33,
  });
  s().addMidiClip(keys, {
    id: 'keys-clip',
    startTick: 0,
    events: [ev(64, 0)],
  });
  s().addMidiClip(bass, { id: 'bass-clip', startTick: 0, events: [ev(40, 0)] });
});
afterEach(cleanup);

const staves = () => h.staff?.parts.map((p) => p.name) ?? null;
function openStaves() {
  fireEvent.keyDown(screen.getByTestId('score-staves'), { key: 'Enter' });
}

describe('the Score page', () => {
  it('has one toolbar over every instrument’s staff, and no layout switch', () => {
    render(<ScoreView />);
    expect(staves()).toEqual(['Keys', 'Bass']);
    expect(screen.getByTestId('score-toolbar')).toBeInTheDocument();
    expect(screen.getByTestId('score-staves')).toHaveAccessibleName(
      'Staves: All',
    );
    expect(screen.queryByRole('radio', { name: 'Lead sheet' })).toBeNull();
    expect(screen.queryByRole('radio', { name: 'Full score' })).toBeNull();
    // The lead sheet's tools are on the same toolbar; the exports are the
    // Export dialog's.
    for (const name of ['Measure', 'Replace']) {
      expect(screen.getAllByText(name).length).toBeGreaterThan(0);
    }
    for (const name of ['Print / PDF', 'MusicXML']) {
      expect(screen.queryByText(name)).toBeNull();
    }
  });

  it('takes a track off its staves from the Staves menu', () => {
    render(<ScoreView />);
    openStaves();
    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: 'Bass' }));
    expect(s().scoreHiddenTrackIds).toEqual([bass]);
    expect(staves()).toEqual(['Keys']);
    expect(screen.getByTestId('score-staves')).toHaveAccessibleName(
      'Staves: 1 of 2',
    );
  });

  it('is the chord chart with every staff off, and comes back from it', () => {
    act(() => s().setScoreHiddenTrackIds([keys, bass]));
    render(<ScoreView />);
    expect(screen.queryByTestId('staff')).toBeNull();
    expect(screen.getByTestId('score-toolbar')).toBeInTheDocument();
    expect(screen.getByTestId('score-staves')).toHaveAccessibleName(
      'Staves: Chords only',
    );
    // Every palette is in the Palettes panel on the chord chart too.
    for (const name of [
      'Notes',
      'Rests',
      'Rhythmic',
      'Articulations',
      'Accidentals',
      'Text',
      'Barlines',
      'Layout',
    ]) {
      expect(
        document.querySelector(`[data-palette-name="${name}"]`),
      ).not.toBeNull();
    }
    fireEvent.click(screen.getByRole('button', { name: 'Show every track' }));
    expect(s().scoreHiddenTrackIds).toEqual([]);
    expect(staves()).toEqual(['Keys', 'Bass']);
  });

  it('is the chord chart with no notes yet, and Add notes writes on a staff', () => {
    useStore.setState({
      tracks: s().tracks.map((t) => ({ ...t, midiClips: [] })),
    });
    render(<ScoreView />);
    expect(screen.queryByTestId('staff')).toBeNull();
    fireEvent.click(screen.getByTestId('score-add-notes'));
    expect(s().scoreNoteInput).toBe(true);
    expect(staves()).toEqual(['Keys', 'Bass']);
  });

  it('opens for the old Lead sheet view, under the one Score tab', () => {
    render(<ViewTabs />);
    act(() => s().setCurrentView('leadsheet'));
    expect(s().currentView).toBe('score');
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual([
      'Create',
      'Mix',
      'Score',
    ]);
    expect(screen.getByRole('tab', { name: 'Score' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });
});
