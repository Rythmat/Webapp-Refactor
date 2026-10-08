// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { useMemo, type PointerEvent } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StaffLayout } from '@/components/notation/StaffView';
import { mintNoteId } from '@/daw/model/noteIds';
import { useStore, type AllSlices } from '@/daw/store';
import {
  initUndoTracking,
  resetUndoHistory,
  undo,
} from '@/daw/store/undoMiddleware';
import { DURATIONS } from './noteEditor';
import { buildScoreParts } from './scoreParts';
import { useScoreEditing } from './useScoreEditing';

// ── Marks stay on their notes through a Score edit ─────────────────────────
// Driven through the real hook and store, as ScoreView wires them. Select the
// later note first, then the earlier one, and move both: each staccato,
// spelling and slash stays on the note it was written on (score-08). They
// used to be paired up by position, the selection's order against the
// clip's, so the later note's staccato landed on the earlier note.

vi.mock('@/components/notation/StaffView', () => ({
  loadVexFlow: () => new Promise(() => {}),
}));

const st = () => useStore.getState();
let editing: ReturnType<typeof useScoreEditing>;

function ScoreEditor() {
  const tracks = useStore((s) => s.tracks);
  const scoreParts = useMemo(
    () =>
      buildScoreParts({
        tracks,
        rootNote: 0,
        mode: 'ionian',
        timeSignature: [4, 4],
      }),
    [tracks],
  );
  const parts = useMemo(
    () => scoreParts.map(({ id, name, score }) => ({ id, name, score })),
    [scoreParts],
  );
  editing = useScoreEditing({ parts, scoreParts });
  return null;
}

let trackId = '';
const key = (startTick: number, midi: number) =>
  `${trackId}:clip:${startTick}:${midi}`;

/** A drawn note: `letter` is how the staff writes it (both sit in octave 5). */
function layoutNote(id: string, tick: number, letter = 'c') {
  return {
    id,
    partIndex: 0,
    measureIndex: 0,
    tick,
    x: 20 + tick / 10,
    y: 40,
    space: 5,
    stem: 'up' as const,
    letter,
    octave: 5,
    alteration: 0,
    line: 3,
  };
}

/**
 * Press a note (⌘ adds it to the selection) and let go where it was. Each
 * press lands on its own note's spot: two presses in one spot read as a
 * double-click, which writes a chord instead of selecting.
 */
function press(id: string, tick: number, withMeta: boolean) {
  act(() =>
    editing.staff.onNotePointerDown({ noteId: id, noteIds: [id] }, {
      preventDefault: () => {},
      clientX: layoutNote(id, tick).x,
      clientY: 40,
      shiftKey: false,
      metaKey: withMeta,
      ctrlKey: false,
    } as unknown as PointerEvent),
  );
  act(() => {
    window.dispatchEvent(new Event('pointerup'));
  });
}

beforeEach(() => {
  useStore.setState({
    tracks: [],
    scoreArticulations: [],
    scoreSlurs: [],
    scoreSpellings: [],
    scoreSlashNotes: [],
  } as Partial<AllSlices>);
  trackId = st().addTrack('midi', 'piano-sampler', 'Piano');
  // C5 (spelled B♯4 by hand) then E5.
  st().addMidiClip(trackId, {
    id: 'clip',
    startTick: 0,
    durationTicks: 1920,
    events: [
      {
        id: mintNoteId(),
        note: 72,
        velocity: 90,
        startTick: 0,
        durationTicks: 480,
        channel: 0,
      },
      {
        id: mintNoteId(),
        note: 76,
        velocity: 90,
        startTick: 480,
        durationTicks: 480,
        channel: 0,
      },
    ],
  });
  useStore.setState({
    scoreArticulations: [`${key(480, 76)}|staccato`, `${key(0, 72)}|accent`],
    scoreSlurs: [`${key(0, 72)}|${key(480, 76)}`],
    scoreSpellings: [`${key(0, 72)}|B♯4`],
    scoreSlashNotes: [key(480, 76)],
  } as Partial<AllSlices>);
  render(<ScoreEditor />);
  const layout: StaffLayout = {
    barlines: [],
    measures: [],
    rests: [],
    notes: [layoutNote(key(0, 72), 0), layoutNote(key(480, 76), 480, 'e')],
    scale: 1,
    systemHeight: 120,
    stepPx: 5,
    topLineDrop: 0,
  };
  act(() => editing.staff.onLayout(layout));
  // The later note first, then the earlier one with ⌘.
  press(key(480, 76), 480, false);
  press(key(0, 72), 0, true);
  expect([...editing.selection.notes]).toEqual([key(480, 76), key(0, 72)]);
});

afterEach(cleanup);

const keyDown = (init: KeyboardEventInit) =>
  act(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', init));
  });

const pitches = () => st().tracks[0].midiClips[0].events.map((e) => e.note);

describe('marks on a two-note selection', () => {
  it('stay on their own notes when the notes move an octave', () => {
    // Shift+↑ is an octave: C5 → C6, E5 → E6. B♯ still spells a C, now the
    // one in the octave below C6.
    keyDown({ key: 'ArrowUp', shiftKey: true });
    expect(st().scoreArticulations).toEqual([
      `${key(480, 88)}|staccato`,
      `${key(0, 84)}|accent`,
    ]);
    expect(st().scoreSlurs).toEqual([`${key(0, 84)}|${key(480, 88)}`]);
    expect(st().scoreSpellings).toEqual([`${key(0, 84)}|B♯5`]);
    expect(st().scoreSlashNotes).toEqual([key(480, 88)]);
  });

  it('let a spelling go when its note moves to another pitch', () => {
    // A staff step: C5 → D5, E5 → F5. The pinned B♯ no longer fits.
    keyDown({ key: 'ArrowUp' });
    expect(st().scoreArticulations).toEqual([
      `${key(480, 77)}|staccato`,
      `${key(0, 74)}|accent`,
    ]);
    expect(st().scoreSlurs).toEqual([`${key(0, 74)}|${key(480, 77)}`]);
    expect(st().scoreSpellings).toEqual([]);
    expect(st().scoreSlashNotes).toEqual([key(480, 77)]);
  });

  it('go with their notes when the notes are deleted', () => {
    keyDown({ key: 'Delete' });
    expect(st().tracks[0].midiClips[0].events).toEqual([]);
    expect(st().scoreArticulations).toEqual([]);
    expect(st().scoreSlurs).toEqual([]);
    expect(st().scoreSpellings).toEqual([]);
    expect(st().scoreSlashNotes).toEqual([]);
  });

  it('stay on their notes through an accidental, which pins its spelling', () => {
    // Without the B♯ pin, as the layout draws C5 (a pinned B♯ would draw it
    // as a B that already carries the sharp). A sharp on both: C5 → C♯5,
    // E5 → E♯5, each pinned as the accidental wrote it.
    act(() => {
      useStore.setState({ scoreSpellings: [] });
    });
    act(() => editing.editor.onAccidental(1));
    expect(pitches()).toEqual([73, 77]);
    expect(st().scoreArticulations).toEqual([
      `${key(480, 77)}|staccato`,
      `${key(0, 73)}|accent`,
    ]);
    expect(st().scoreSlurs).toEqual([`${key(0, 73)}|${key(480, 77)}`]);
    expect(new Set(st().scoreSpellings)).toEqual(
      new Set([`${key(0, 73)}|C♯5`, `${key(480, 77)}|E♯5`]),
    );
    expect(st().scoreSlashNotes).toEqual([key(480, 77)]);
  });

  it('are left as they are by a length change that slashes nothing new', () => {
    act(() => {
      useStore.setState({ scoreSlashNotes: [key(0, 72), key(480, 76)] });
    });
    const before = st();
    const eighth = DURATIONS.find((choice) => choice.name === 'Eighth')!;
    act(() => editing.editor.onDuration(eighth, 'slashes'));
    expect(
      st().tracks[0].midiClips[0].events.map((e) => e.durationTicks),
    ).toEqual([240, 240]);
    // Only the lengths changed: no mark list was written.
    expect(st().scoreSlashNotes).toBe(before.scoreSlashNotes);
    expect(st().scoreArticulations).toBe(before.scoreArticulations);
    expect(st().scoreSlurs).toBe(before.scoreSlurs);
    expect(st().scoreSpellings).toBe(before.scoreSpellings);
  });
});

describe('undo after the notes move', () => {
  let stopUndo = () => {};

  /** Step both notes up, let the edit settle into an undo step, undo it. */
  function moveThenUndo() {
    vi.useFakeTimers();
    stopUndo = initUndoTracking();
    resetUndoHistory();
    keyDown({ key: 'ArrowUp' });
    expect(pitches()).toEqual([74, 77]);
    act(() => {
      vi.advanceTimersByTime(400);
    });
    act(() => {
      undo();
    });
  }

  afterEach(() => {
    stopUndo();
    vi.useRealTimers();
  });

  it('puts the notes and their marks back', () => {
    moveThenUndo();
    expect(pitches()).toEqual([72, 76]);
    expect(st().scoreArticulations).toEqual([
      `${key(480, 76)}|staccato`,
      `${key(0, 72)}|accent`,
    ]);
    expect(st().scoreSlurs).toEqual([`${key(0, 72)}|${key(480, 76)}`]);
    expect(st().scoreSpellings).toEqual([`${key(0, 72)}|B♯4`]);
  });

  // A slash follows its note, and undo puts it back with the note: the undo
  // snapshot carries scoreSlashNotes like the other marks.
  it('puts the slash back on its note', () => {
    moveThenUndo();
    expect(st().scoreSlashNotes).toEqual([key(480, 76)]);
  });
});
