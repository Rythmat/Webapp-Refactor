// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { useMemo, type PointerEvent } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MeasureBox, StaffLayout } from '@/components/notation/StaffView';
import { installKeyDispatcher } from '@/daw/commands/dispatcher';
import { mintNoteId } from '@/daw/model/noteIds';
import { useStore, type AllSlices } from '@/daw/store';
import {
  initUndoTracking,
  resetUndoHistory,
  undo,
} from '@/daw/store/undoMiddleware';
import { auditionNote } from '@/daw/audio/auditionNote';
import { buildScoreParts } from './scoreParts';
import { useScoreEditing } from './useScoreEditing';

// ── Note input, end to end ─────────────────────────────────────────────────
// N turns it on, the pointer aims a ghost note, a press writes it into the
// track's clip, Shift adds to a chord, letters type notes at the cursor and
// every note is one undo step. Driven through the real hook, store and key
// dispatcher, as ScoreView wires them, over a layout drawn the way StaffView
// reports one.

vi.mock('@/components/notation/StaffView', () => ({
  loadVexFlow: () => new Promise(() => {}),
}));
vi.mock('@/daw/audio/auditionNote', () => ({ auditionNote: vi.fn() }));

const st = () => useStore.getState();
let editing: ReturnType<typeof useScoreEditing>;

function ScoreEditor() {
  const tracks = useStore((s) => s.tracks);
  const noteInput = useStore((s) => s.scoreNoteInput);
  const scoreParts = useMemo(
    () =>
      buildScoreParts({
        tracks,
        rootNote: 7, // G major: one sharp
        mode: 'ionian',
        timeSignature: [4, 4],
        includeEmpty: noteInput,
      }),
    [tracks, noteInput],
  );
  const parts = useMemo(
    () => scoreParts.map(({ id, name, score }) => ({ id, name, score })),
    [scoreParts],
  );
  editing = useScoreEditing({ parts, scoreParts });
  return <div data-testid="overlay">{editing.staff.overlay}</div>;
}

// Two bars on one treble staff, top line at y = 40, each bar's notes from
// x = 20 to 426: an empty bar's beats fall at 26, 124.5, 223 and 321.5.
const STEP = 5;
const bar = (index: number, staves: MeasureBox['staves']): MeasureBox => ({
  measureIndex: index,
  partIndex: 0,
  system: 0,
  x: index * 440,
  y: 0,
  width: 440,
  height: 180,
  startTick: index * 1920,
  endTick: (index + 1) * 1920,
  noteStartX: index * 440 + 20,
  noteEndX: index * 440 + 426,
  staves,
});
const layoutOf = (staves: MeasureBox['staves']): StaffLayout => ({
  barlines: [],
  measures: [bar(0, staves), bar(1, staves)],
  notes: [],
  rests: [],
  scale: 1,
  systemHeight: 200,
  stepPx: STEP,
  topLineDrop: 40,
});
const TREBLE = [{ staff: 'treble' as const, topLineY: 40 }];
const beatX = (beat: number) => 26 + beat * 98.5;
/** Staff steps below the top line: F5 is 0, C5 is 3, G4 is 6. */
const lineY = (position: number, top = 40) => top + position * STEP;

/** A press on the staff at x, y, as StaffView hands one on. */
const press = (x: number, y: number, shiftKey = false) =>
  act(() =>
    editing.staff.onMeasurePointerDown({ measureIndex: 0, partIndex: 0 }, {
      clientX: x,
      clientY: y,
      shiftKey,
      metaKey: false,
      ctrlKey: false,
      preventDefault: () => {},
      currentTarget: {
        getBoundingClientRect: () => ({ left: 0, top: 0 }),
      },
    } as unknown as PointerEvent),
  );

const keyDown = (init: KeyboardEventInit) =>
  act(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', init));
  });
const typeLetter = (letter: string, shiftKey = false) =>
  keyDown({
    key: shiftKey ? letter : letter.toLowerCase(),
    code: `Key${letter}`,
    shiftKey,
  });

const notes = () =>
  st()
    .tracks.find((t) => t.id === trackId)!
    .midiClips.flatMap((clip) =>
      clip.events.map((e) => ({
        midi: e.note,
        at: clip.startTick + e.startTick,
        length: e.durationTicks,
      })),
    )
    .sort((a, b) => a.at - b.at || a.midi - b.midi);

let trackId = '';
let uninstallKeys: () => void = () => {};
let stopUndo: () => void = () => {};

function mount(staves: MeasureBox['staves'] = TREBLE) {
  const view = render(<ScoreEditor />);
  keyDown({ key: 'n', code: 'KeyN' });
  act(() => editing.staff.onLayout(layoutOf(staves)));
  return view;
}

beforeEach(() => {
  uninstallKeys = installKeyDispatcher();
  useStore.setState({
    currentView: 'score',
    tracks: [],
    scoreNoteInput: false,
    scoreArticulations: [],
    scoreSlurs: [],
    scoreSpellings: [],
    scoreSlashNotes: [],
  } as Partial<AllSlices>);
  trackId = st().addTrack('midi', 'soundfont', 'Piano');
  stopUndo = initUndoTracking();
  resetUndoHistory();
  vi.mocked(auditionNote).mockClear();
});

afterEach(() => {
  cleanup();
  uninstallKeys();
  stopUndo();
});

describe('note input', () => {
  it('turns on with N and shows an empty instrument to write on', () => {
    render(<ScoreEditor />);
    expect(editing.noteInput.on).toBe(false);
    keyDown({ key: 'n', code: 'KeyN' });
    expect(st().scoreNoteInput).toBe(true);
    expect(editing.noteInput.on).toBe(true);
    keyDown({ key: 'Escape', code: 'Escape' });
    expect(st().scoreNoteInput).toBe(false);
  });

  it('aims a ghost note at the line and beat under the pointer', () => {
    const view = mount();
    act(() =>
      editing.staff.onStaffPointerMove?.({ x: beatX(1) + 10, y: lineY(0) }),
    );
    // The top line in G major is F♯5, on beat 2.
    expect(
      view.container
        .querySelector('[data-note-ghost]')
        ?.getAttribute('data-note-ghost'),
    ).toBe('78@480');
    act(() => editing.staff.onStaffPointerLeave?.());
    expect(view.container.querySelector('[data-note-ghost]')).toBeNull();
  });

  it('writes a quarter into an empty bar, selects it and sounds it', async () => {
    mount();
    press(beatX(1), lineY(3));
    expect(notes()).toEqual([{ midi: 72, at: 480, length: 480 }]);
    // A new clip, from the bar's start, a bar long.
    const [clip] = st().tracks.find((t) => t.id === trackId)!.midiClips;
    expect(clip.startTick).toBe(0);
    expect(clip.durationTicks).toBe(1920);
    expect([...editing.selection.notes]).toEqual([
      `${trackId}:${clip.id}:480:72`,
    ]);
    await vi.waitFor(() =>
      expect(auditionNote).toHaveBeenCalledWith(trackId, 72, 100),
    );
    // ↑ acts on it straight away: a step up is D5.
    keyDown({ key: 'ArrowUp', code: 'ArrowUp' });
    expect(notes()).toEqual([{ midi: 74, at: 480, length: 480 }]);
  });

  it('places eighths, sixteenths and dotted quarters on their own grids', () => {
    mount();
    keyDown({ key: '4', code: 'Digit4' }); // eighth
    press(beatX(0.5) + 4, lineY(6)); // G4 on the "and" of 1
    keyDown({ key: '3', code: 'Digit3' }); // sixteenths from now on
    press(beatX(1.25) - 3, lineY(5)); // A4 on the second sixteenth of 2
    // The eighth written first keeps its length.
    expect(notes()).toEqual([
      { midi: 67, at: 240, length: 240 },
      { midi: 69, at: 600, length: 120 },
    ]);
    // A dotted quarter starts on any eighth.
    keyDown({ key: '5', code: 'Digit5' });
    act(() => editing.editor.onToggleDot('notes'));
    press(beatX(2.5) + 2, lineY(4)); // B4 on the "and" of 3
    expect(notes().at(-1)).toEqual({ midi: 71, at: 1200, length: 720 });
  });

  it('writes over what starts inside it and cuts short what it lands in', () => {
    st().addMidiClip(trackId, {
      id: 'clip',
      startTick: 0,
      durationTicks: 1920,
      events: [
        {
          id: mintNoteId(),
          note: 67,
          velocity: 90,
          startTick: 0,
          durationTicks: 960,
          channel: 0,
        },
        {
          id: mintNoteId(),
          note: 71,
          velocity: 90,
          startTick: 960,
          durationTicks: 480,
          channel: 0,
        },
      ],
    });
    mount();
    press(beatX(1), lineY(3)); // a quarter C5 on beat 2, inside the half G
    press(beatX(2), lineY(2)); // a quarter D5 on beat 3, over the B
    expect(notes()).toEqual([
      { midi: 67, at: 0, length: 480 },
      { midi: 72, at: 480, length: 480 },
      { midi: 74, at: 960, length: 480 },
    ]);
  });

  it('adds to the chord with Shift, at the chord’s length', () => {
    mount();
    keyDown({ key: '6', code: 'Digit6' }); // half
    press(beatX(0), lineY(8)); // E4
    keyDown({ key: '5', code: 'Digit5' }); // quarters from now on
    press(beatX(0), lineY(6), true); // + G4, at the half's length
    press(beatX(0), lineY(4), true); // + B4
    expect(notes()).toEqual([
      { midi: 64, at: 0, length: 960 },
      { midi: 67, at: 0, length: 960 },
      { midi: 71, at: 0, length: 960 },
    ]);
    // Without Shift the next note is a quarter again, and overwrites.
    press(beatX(2), lineY(3));
    expect(notes().at(-1)).toEqual({ midi: 72, at: 960, length: 480 });
  });

  it('undoes one note at a time', () => {
    mount();
    press(beatX(0), lineY(3));
    press(beatX(1), lineY(2));
    press(beatX(2), lineY(1));
    expect(notes()).toHaveLength(3);
    act(() => {
      undo();
    });
    expect(notes().map((n) => n.midi)).toEqual([72, 74]);
    act(() => {
      undo();
    });
    expect(notes().map((n) => n.midi)).toEqual([72]);
  });

  it('types letters at the cursor, in the nearest octave, walking on', () => {
    mount();
    press(beatX(0), lineY(6)); // G4, then the cursor stands on beat 2
    typeLetter('A');
    typeLetter('B');
    typeLetter('C'); // up a step to C5, not down a seventh
    typeLetter('F'); // F♯5 in G major: up a fourth beats down a fifth
    expect(notes()).toEqual([
      { midi: 67, at: 0, length: 480 },
      { midi: 69, at: 480, length: 480 },
      { midi: 71, at: 960, length: 480 },
      { midi: 72, at: 1440, length: 480 },
      { midi: 78, at: 1920, length: 480 },
    ]);
    expect(editing.noteInput.cursorTick).toBe(2400);
    // Shift adds the letter above the note just written, to its chord.
    typeLetter('A', true);
    expect(
      notes()
        .filter((n) => n.at === 1920)
        .map((n) => n.midi),
    ).toEqual([78, 81]);
    expect(editing.noteInput.cursorTick).toBe(2400);
  });

  it('types nothing outside note input', () => {
    render(<ScoreEditor />);
    typeLetter('C');
    expect(notes()).toEqual([]);
  });

  it('writes each staff of a grand staff on its own', () => {
    // C2 and C6 together: the piano is written on two staves.
    st().addMidiClip(trackId, {
      id: 'clip',
      startTick: 0,
      durationTicks: 1920,
      events: [
        {
          id: mintNoteId(),
          note: 36,
          velocity: 90,
          startTick: 0,
          durationTicks: 480,
          channel: 0,
        },
        {
          id: mintNoteId(),
          note: 84,
          velocity: 90,
          startTick: 0,
          durationTicks: 480,
          channel: 0,
        },
      ],
    });
    mount([
      { staff: 'treble', topLineY: 40 },
      { staff: 'bass', topLineY: 140 },
    ]);
    // Five steps below the bass staff's top line (A3) is C3, on beat 1.
    press(beatX(0), lineY(5, 140));
    expect(notes()).toEqual([
      { midi: 48, at: 0, length: 480 },
      { midi: 84, at: 0, length: 480 },
    ]);
  });
});

describe('note input on a staff written an octave above its sound', () => {
  // A bass guitar reads the bass clef with an 8 under it: its lines say
  // A3 (top) … G2 (bottom) and it sounds an octave lower. G major again.
  const BASS8VB = [{ staff: 'bass8vb' as const, topLineY: 40 }];

  beforeEach(() => {
    useStore.setState({ tracks: [] } as Partial<AllSlices>);
    trackId = st().addTrack('midi', 'soundfont', 'Bass', {
      gmProgram: 33,
    });
    resetUndoHistory();
  });

  it('writes the pitch it sounds: the written C3 space writes C2', () => {
    const view = mount(BASS8VB);
    act(() => editing.staff.onStaffPointerMove?.({ x: beatX(0), y: lineY(5) }));
    expect(
      view.container
        .querySelector('[data-note-ghost]')
        ?.getAttribute('data-note-ghost'),
    ).toBe('36@0');
    press(beatX(0), lineY(5));
    expect(notes()).toEqual([{ midi: 36, at: 0, length: 480 }]);
    // The top line, written A3, is A2; the ledger line under the staff E1.
    press(beatX(1), lineY(0));
    press(beatX(2), lineY(10));
    expect(notes().map((n) => n.midi)).toEqual([36, 45, 28]);
  });

  it('moves a written note by its lines, and types letters an octave down', () => {
    mount(BASS8VB);
    press(beatX(0), lineY(5)); // C2, on the written C3 space
    keyDown({ key: 'ArrowUp', code: 'ArrowUp' });
    expect(notes()).toEqual([{ midi: 38, at: 0, length: 480 }]); // D2
    // The cursor stands on beat 2, a step up: E is written E3, sounds E2.
    typeLetter('E');
    typeLetter('G');
    expect(notes().map((n) => n.midi)).toEqual([38, 40, 43]);
  });

  it('starts typing from the staff’s middle line, an octave down', () => {
    render(<ScoreEditor />);
    keyDown({ key: 'n', code: 'KeyN' });
    act(() => editing.staff.onLayout(layoutOf(BASS8VB)));
    // Nothing written yet: the middle line is written D3, so C is C2.
    typeLetter('C');
    expect(notes()).toEqual([{ midi: 36, at: 0, length: 480 }]);
  });

  it('sharpens a note at the pitch it sounds', () => {
    mount(BASS8VB);
    press(beatX(0), lineY(5)); // C2
    const [clip] = st().tracks.find((t) => t.id === trackId)!.midiClips;
    const id = `${trackId}:${clip.id}:0:36`;
    // The page draws it as StaffView reports: written C3.
    act(() =>
      editing.staff.onLayout({
        ...layoutOf(BASS8VB),
        notes: [
          {
            id,
            partIndex: 0,
            measureIndex: 0,
            tick: 0,
            x: beatX(0),
            y: lineY(5),
            space: STEP,
            stem: 'up',
            letter: 'c',
            octave: 3,
            alteration: 0,
            line: 1.5,
          },
        ],
      }),
    );
    act(() => editing.editor.onAccidental(1));
    expect(notes()).toEqual([{ midi: 37, at: 0, length: 480 }]);
    // Pinned in the octave it sounds, as every spelling is.
    expect(st().scoreSpellings).toEqual([`${trackId}:${clip.id}:0:37|C♯2`]);
  });

  it('reads the alto clef for a viola', () => {
    useStore.setState({ tracks: [] } as Partial<AllSlices>);
    trackId = st().addTrack('midi', 'soundfont', 'Viola');
    st().updateTrack(trackId, { gmProgram: 41 });
    mount([{ staff: 'alto', topLineY: 40 }]);
    press(beatX(0), lineY(4)); // middle C, on the middle line
    press(beatX(1), lineY(0)); // G4, the top line
    press(beatX(2), lineY(1)); // F♯4 in G major, the top space
    expect(notes().map((n) => n.midi)).toEqual([60, 67, 66]);
  });
});
