// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import GenrePianoRoll, { type NoteEvent } from '../GenrePianoRoll';

// The faces themselves draw with VexFlow; what's checked here is which face
// the lesson gets and what it's handed.
const faces = vi.hoisted(() => ({
  tab: vi.fn(),
  notation: vi.fn(),
}));
vi.mock('../LearnTabView', () => ({
  LearnTabView: (props: { toggle: React.ReactNode }) => {
    faces.tab(props);
    return <div data-testid="tab-view">{props.toggle}</div>;
  },
}));
vi.mock('../LearnNotationView', () => ({
  LearnNotationView: (props: { toggle: React.ReactNode }) => {
    faces.notation(props);
    return <div data-testid="notation-view">{props.toggle}</div>;
  },
}));

const events: NoteEvent[] = [
  {
    id: 'n0',
    pitchName: 'C3',
    midi: 48,
    startTicks: 0,
    durationTicks: 480,
    fretPosition: { string: 5, fret: 3 },
  },
];

describe('GenrePianoRoll instrument', () => {
  beforeEach(() => {
    localStorage.clear();
    faces.tab.mockClear();
    faces.notation.mockClear();
  });
  afterEach(cleanup);

  it('is still the piano roll by default', () => {
    render(<GenrePianoRoll events={events} bars={1} />);
    expect(
      screen.getByRole('radio', { name: 'Piano roll' }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('tab-view')).toBeNull();
    expect(faces.notation).not.toHaveBeenCalled();
  });

  it('shows guitar lessons as TAB, with no way back to a roll', () => {
    render(<GenrePianoRoll events={events} bars={1} instrument="guitar" />);
    expect(screen.getByTestId('tab-view')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Tablature' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(screen.queryByRole('radio', { name: 'Piano roll' })).toBeNull();
    expect(faces.tab).toHaveBeenLastCalledWith(
      expect.objectContaining({ events, bars: 1, inTime: false }),
    );
  });

  it('switches guitar to notation written an octave up on a treble 8vb staff', () => {
    render(<GenrePianoRoll events={events} bars={1} instrument="guitar" />);
    fireEvent.click(screen.getByRole('radio', { name: 'Notation' }));
    expect(screen.getByTestId('notation-view')).toBeInTheDocument();
    expect(faces.notation).toHaveBeenLastCalledWith(
      expect.objectContaining({
        events,
        staves: 'treble',
        writtenOctaveShift: 1,
        clefAnnotation: '8vb',
      }),
    );
    // Remembered for guitar only; the piano's roll/notation choice is its own.
    expect(localStorage.getItem('musicAtlas:guitarView')).toBe('notation');
    expect(localStorage.getItem('musicAtlas:rollView:learn')).toBeNull();
  });

  it('runs the guitar faces on the same clock and at the same size as the staff', () => {
    // A two-bar lead-in, so the count and the music start are both in play.
    const lesson = {
      events,
      bars: 2,
      beatsPerBar: 3,
      inTime: true,
      leadInTicks: 2 * 3 * 480,
      rowHeight: 180,
      chordSymbols: [],
      noteHoldMeta: {},
      performanceMeta: {},
    };
    // What each face is handed, less its own chrome and staff settings.
    const shared = (props: Record<string, unknown>, ...also: string[]) =>
      Object.fromEntries(
        Object.entries(props).filter(
          ([name]) =>
            ![
              'toggle',
              'staves',
              'writtenOctaveShift',
              'clefAnnotation',
              ...also,
            ].includes(name),
        ),
      );
    localStorage.setItem('musicAtlas:rollView:learn', 'notation');
    render(<GenrePianoRoll {...lesson} />);
    const piano = shared(faces.notation.mock.lastCall![0]);
    cleanup();
    faces.notation.mockClear();

    render(<GenrePianoRoll {...lesson} instrument="guitar" />);
    // TAB has no key signature, so it takes no key; whether the playhead
    // runs is the TAB's alone (it lights no note once a take stops), and so
    // is where a paged TAB opens.
    expect(
      shared(faces.tab.mock.lastCall![0], 'playing', 'openOnMusic'),
    ).toEqual(shared(piano, 'keyRoot'));
    fireEvent.click(screen.getByRole('radio', { name: 'Notation' }));
    expect(shared(faces.notation.mock.lastCall![0])).toEqual(piano);
  });

  it('opens the TAB on the music only when the lesson asks (its preview)', () => {
    const { rerender } = render(
      <GenrePianoRoll events={events} bars={1} instrument="guitar" />,
    );
    expect(faces.tab).toHaveBeenLastCalledWith(
      expect.objectContaining({ openOnMusic: false }),
    );
    rerender(
      <GenrePianoRoll
        events={events}
        bars={1}
        instrument="guitar"
        tabOpensOnMusic
      />,
    );
    expect(faces.tab).toHaveBeenLastCalledWith(
      expect.objectContaining({ openOnMusic: true }),
    );
  });

  it('drops the view switch and both faces’ header for the guitar lesson layout', () => {
    render(
      <GenrePianoRoll
        events={events}
        bars={1}
        instrument="guitar"
        guitarViewToggle={false}
      />,
    );
    expect(screen.getByTestId('tab-view')).toBeInTheDocument();
    expect(
      screen.queryByRole('radiogroup', { name: 'Guitar note view' }),
    ).toBeNull();
    expect(screen.queryByRole('radio', { name: 'Tablature' })).toBeNull();
    expect(faces.tab).toHaveBeenLastCalledWith(
      expect.objectContaining({ toggle: null, showHeader: false }),
    );

    // Notation, chosen in the lesson's settings, loses its header too.
    cleanup();
    localStorage.setItem('musicAtlas:guitarView', 'notation');
    render(
      <GenrePianoRoll
        events={events}
        bars={1}
        instrument="guitar"
        guitarViewToggle={false}
      />,
    );
    expect(screen.getByTestId('notation-view')).toBeInTheDocument();
    expect(faces.notation).toHaveBeenLastCalledWith(
      expect.objectContaining({
        toggle: null,
        showHeader: false,
        clefAnnotation: '8vb',
      }),
    );
  });

  it('tells the TAB whether its playhead is running', () => {
    const roll = (isPlaying: boolean) => (
      <GenrePianoRoll
        events={events}
        bars={1}
        instrument="guitar"
        inTime
        isPlaying={isPlaying}
        onPlayingChange={() => {}}
      />
    );
    const { rerender } = render(roll(true));
    expect(faces.tab.mock.lastCall![0]).toHaveProperty('playing', true);
    rerender(roll(false));
    expect(faces.tab.mock.lastCall![0]).toHaveProperty('playing', false);
  });

  it('hands neither face a header setting by default', () => {
    render(<GenrePianoRoll events={events} bars={1} instrument="guitar" />);
    expect(faces.tab.mock.lastCall![0]).not.toHaveProperty('showHeader');
    expect(
      screen.getByRole('radiogroup', { name: 'Guitar note view' }),
    ).toBeInTheDocument();
  });

  it("gives piano's notation view none of guitar's settings", () => {
    localStorage.setItem('musicAtlas:rollView:learn', 'notation');
    localStorage.setItem('musicAtlas:guitarView', 'tab');
    render(<GenrePianoRoll events={events} bars={1} staves="treble" />);
    const props = faces.notation.mock.lastCall![0];
    expect(props).not.toHaveProperty('writtenOctaveShift');
    expect(props).not.toHaveProperty('clefAnnotation');
    expect(props).not.toHaveProperty('showHeader');
    expect(props.staves).toBe('treble');
  });
});
