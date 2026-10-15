// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { useMemo, type PointerEvent } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StaffLayout } from '@/components/notation/StaffView';
import { useStore, type AllSlices } from '@/daw/store';
import { NoteEditorBar } from './NoteEditorBar';
import { ACCIDENTALS, ARTICULATIONS, DURATIONS } from './noteEditor';
import { buildScoreParts } from './scoreParts';
import { useScoreEditing } from './useScoreEditing';

// The bar draws its cells in the music font once VexFlow has loaded; neither
// matters to what a click does, so the font never arrives here.
vi.mock('@/components/notation/StaffView', () => ({
  loadVexFlow: () => new Promise(() => {}),
}));

// ── Clicking across the note editor's rows ─────────────────────────────────
// A cell click makes its row live and applies its length in the same tick.
// The row used to be read from the render before the click, so a Rests cell
// clicked while Notes was live changed the note's length, and only a second
// click wrote the rest. Driven through the real hook, as ScoreView wires it.

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
  return <NoteEditorBar {...editing.editor} />;
}

let trackId = '';
const noteId = (startTick: number, midi: number) =>
  `${trackId}:clip:${startTick}:${midi}`;
const events = () =>
  st().tracks.find((t) => t.id === trackId)!.midiClips[0].events;

/** Draw two quarter notes, C5 then E5, and select the first. */
function selectFirstNote() {
  const note = (id: string, tick: number) => ({
    id,
    partIndex: 0,
    measureIndex: 0,
    tick,
    x: 20 + tick / 10,
    y: 40,
    space: 5,
    stem: 'up' as const,
    letter: 'c',
    octave: 5,
    alteration: 0,
    line: 3,
  });
  const layout: StaffLayout = {
    barlines: [],
    measures: [],
    rests: [],
    notes: [note(noteId(0, 72), 0), note(noteId(480, 76), 480)],
    scale: 1,
    systemHeight: 120,
    stepPx: 5,
    topLineDrop: 0,
  };
  act(() => editing.staff.onLayout(layout));
  act(() =>
    editing.staff.onNotePointerDown(
      { noteId: noteId(0, 72), noteIds: [noteId(0, 72)] },
      {
        preventDefault: () => {},
        clientX: 20,
        clientY: 40,
        shiftKey: false,
        metaKey: false,
        ctrlKey: false,
      } as unknown as PointerEvent,
    ),
  );
  // The press starts a drag; letting go where it began moves nothing.
  act(() => {
    window.dispatchEvent(new Event('pointerup'));
  });
  expect(editing.selection.notes).toEqual(new Set([noteId(0, 72)]));
}

beforeEach(() => {
  useStore.setState({
    tracks: [],
    scoreSlashNotes: [],
    scoreArticulations: [],
    scoreSlurs: [],
  } as Partial<AllSlices>);
  trackId = st().addTrack('midi', 'piano-sampler', 'Piano');
  st().addMidiClip(trackId, {
    id: 'clip',
    startTick: 0,
    durationTicks: 1920,
    events: [72, 76].map((note, i) => ({
      note,
      velocity: 90,
      startTick: i * 480,
      durationTicks: 480,
      channel: 0,
    })),
  });
  render(<ScoreEditor />);
  selectFirstNote();
});

afterEach(cleanup);

const liveRow = () =>
  screen
    .getAllByRole('button', { pressed: true })
    .map((button) => button.textContent);

describe('the note editor rows', () => {
  it('writes a rest from a Rests cell while Notes is live', () => {
    expect(liveRow()).toEqual(['Notes']);
    fireEvent.click(screen.getByTitle('Quarter rests (5)'));

    // The selected note is gone and its neighbour kept: a quarter rest.
    expect(events().map((e) => e.note)).toEqual([76]);
    expect(liveRow()).toEqual(['Rests']);
  });

  it('writes a slash from a Rhythmic cell while Notes is live', () => {
    fireEvent.click(screen.getByTitle('Half rhythmic (6)'));

    const first = events().find((e) => e.note === 72)!;
    expect(first.durationTicks).toBe(960);
    expect(st().scoreSlashNotes).toEqual([noteId(0, 72)]);
    expect(liveRow()).toEqual(['Rhythmic']);
  });

  it('sets a length from a Notes cell while Rests is live', () => {
    fireEvent.click(screen.getByRole('button', { name: /Rests/ }));
    expect(liveRow()).toEqual(['Rests']);
    fireEvent.click(screen.getByTitle('Half notes (6)'));

    expect(events().map((e) => [e.note, e.durationTicks])).toEqual([
      [72, 960],
      [76, 480],
    ]);
    expect(st().scoreSlashNotes).toEqual([]);
    expect(liveRow()).toEqual(['Notes']);
  });

  it("dots the note from the Notes row's dot while Rests is live", () => {
    fireEvent.click(screen.getByRole('button', { name: /Rests/ }));
    fireEvent.click(screen.getByTitle('Augmentation dot'));

    // A dotted quarter, not a dotted quarter rest over both notes.
    expect(events().map((e) => [e.note, e.durationTicks])).toEqual([
      [72, 720],
      [76, 480],
    ]);
    expect(liveRow()).toEqual(['Notes']);
  });

  it('keeps a slash a slash when dotted while Rhythmic is live', () => {
    fireEvent.click(screen.getByTitle('Quarter rhythmic (5)'));
    expect(st().scoreSlashNotes).toEqual([noteId(0, 72)]);
    fireEvent.click(screen.getByTitle('Augmentation dot'));

    // A dotted quarter slash, as a number key in that row would write it.
    const first = events().find((e) => e.note === 72)!;
    expect(first.durationTicks).toBe(720);
    expect(st().scoreSlashNotes).toEqual([noteId(0, 72)]);
    expect(liveRow()).toEqual(['Rhythmic']);
  });

  it('leaves every click to the cell under the pointer, not a glyph', () => {
    // A music glyph's text box runs over two rows tall, so in the browser
    // the Rests row's glyphs covered the Notes cells above them and took
    // their clicks. jsdom does no hit-testing; this pins what prevents it.
    const glyphs = [
      ...document.querySelectorAll<HTMLElement>('button span'),
    ].filter((span) => ['Bravura', 'serif'].includes(span.style.fontFamily));
    expect(glyphs).toHaveLength(
      DURATIONS.length * 2 + ARTICULATIONS.length + ACCIDENTALS.length,
    );
    for (const glyph of glyphs) expect(glyph.style.pointerEvents).toBe('none');
  });
});
