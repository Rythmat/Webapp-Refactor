// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { useMemo } from 'react';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import type { MeasureBox, StaffLayout } from '@/components/notation/StaffView';
import { useStore, type AllSlices } from '@/daw/store';
import {
  initUndoTracking,
  redo,
  resetUndoHistory,
  undo,
  withTransaction,
} from '@/daw/store/undoMiddleware';
import { installDomShims } from '@/daw/ui/__tests__/dom';
import { ScorePartsPanel } from './ScorePartsPanel';
import { buildScoreParts } from './scoreParts';
import { useScoreEditing } from './useScoreEditing';

// ── Choosing a part's clef ─────────────────────────────────────────────────
// The Score's parts panel lists each part's clef, Auto naming the staff its
// instrument reads; a part's name on the page opens the same choice as a
// menu. A change is one undo step, and Auto saves as no setting at all.
// Driven through the real hook and store, as ScoreView wires them.

vi.mock('@/components/notation/StaffView', () => ({
  loadVexFlow: () => new Promise(() => {}),
}));

const st = () => useStore.getState();
let editing: ReturnType<typeof useScoreEditing>;
let parts: ReturnType<typeof buildScoreParts>;

function Score() {
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
  parts = scoreParts;
  const staffParts = useMemo(
    () => scoreParts.map(({ id, name, score }) => ({ id, name, score })),
    [scoreParts],
  );
  editing = useScoreEditing({ parts: staffParts, scoreParts });
  return (
    <>
      <ScorePartsPanel
        parts={editing.partRows}
        onSetStaff={editing.onSetStaff}
        onToggleChords={editing.onToggleChords}
        onRestoreChords={editing.onRestoreChords}
      />
      <div data-testid="page">{editing.staff.overlay}</div>
    </>
  );
}

/** One bar per part, stacked, each starting right of its name at x = 200. */
const box = (partIndex: number): MeasureBox => ({
  measureIndex: 0,
  partIndex,
  system: 0,
  x: 200,
  y: partIndex * 200,
  width: 400,
  height: 180,
  startTick: 0,
  endTick: 1920,
  noteStartX: 240,
  noteEndX: 590,
  staves: [{ staff: 'treble', topLineY: partIndex * 200 + 40 }],
});
const layoutOf = (count: number): StaffLayout => ({
  barlines: [],
  measures: Array.from({ length: count }, (_, i) => box(i)),
  notes: [],
  rests: [],
  scale: 1,
  systemHeight: count * 200,
  stepPx: 5,
  topLineDrop: 40,
});

const note = (midi: number) => ({
  id: `n${midi}`,
  note: midi,
  velocity: 100,
  startTick: 0,
  durationTicks: 480,
  channel: 0,
});

let keys = '';
let bass = '';
let stopUndo: () => void = () => {};

const trackOf = (id: string) => st().tracks.find((t) => t.id === id)!;
const stavesOf = (id: string) =>
  parts.find((part) => part.id === id)!.score.staves;

function mount() {
  const view = render(<Score />);
  act(() => editing.staff.onLayout(layoutOf(parts.length)));
  return view;
}

/** Choose `option` from the panel's list for `part`, from the keyboard. */
async function choose(part: string, option: string) {
  const field = screen.getByRole('combobox', { name: `Clef for ${part}` });
  act(() => field.focus());
  fireEvent.keyDown(field, { key: 'Enter' });
  const item = await screen.findByRole('option', { name: option });
  fireEvent.keyDown(item, { key: 'Enter' });
  await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull());
}

beforeAll(installDomShims);

beforeEach(() => {
  useStore.setState({ tracks: [] } as Partial<AllSlices>);
  keys = st().addTrack('midi', 'electric-piano', 'Keys');
  bass = st().addTrack('midi', 'bass-electric', 'Bass');
  const drums = st().addTrack('midi', 'drum-machine', 'Drums');
  for (const [id, midi] of [
    [keys, 72],
    [bass, 40],
    [drums, 36],
  ] as const) {
    st().addMidiClip(id, {
      id: `${id}-clip`,
      startTick: 0,
      events: [note(midi)],
    });
  }
  stopUndo = initUndoTracking();
  resetUndoHistory();
});

afterEach(() => {
  cleanup();
  stopUndo();
});

describe('the parts panel', () => {
  it('lists each part’s clef, Auto naming what the instrument reads', () => {
    mount();
    expect(
      screen.getByRole('combobox', { name: 'Clef for Keys' }),
    ).toHaveTextContent('Auto (Grand staff)');
    expect(
      screen.getByRole('combobox', { name: 'Clef for Bass' }),
    ).toHaveTextContent('Auto (Bass clef 8vb)');
    // A kit has nothing to choose.
    expect(
      screen.queryByRole('combobox', { name: 'Clef for Drums' }),
    ).toBeNull();
    const clefs = document.querySelector('[data-score-clefs]') as HTMLElement;
    expect(within(clefs).getByText('Drum staff')).toBeInTheDocument();
  });

  it('sets a part’s clef as one undo step', async () => {
    mount();
    expect(stavesOf(keys)).toEqual(['treble', 'bass']);
    await choose('Keys', 'Treble clef');
    expect(trackOf(keys).notationStaff).toBe('treble');
    expect(stavesOf(keys)).toEqual(['treble']);
    expect(
      screen.getByRole('combobox', { name: 'Clef for Keys' }),
    ).toHaveTextContent('Treble clef');

    act(() => undo());
    expect(trackOf(keys).notationStaff).toBeUndefined();
    expect(stavesOf(keys)).toEqual(['treble', 'bass']);
    act(() => redo());
    expect(trackOf(keys).notationStaff).toBe('treble');
  });

  it('saves Auto as no setting at all', async () => {
    mount();
    await choose('Bass', 'Treble clef');
    expect(trackOf(bass).notationStaff).toBe('treble');
    await choose('Bass', 'Auto (Bass clef 8vb)');
    expect(trackOf(bass).notationStaff).toBeUndefined();
    expect(stavesOf(bass)).toEqual(['bass8vb']);
  });

  it('offers the alto clef and both bass clefs', async () => {
    mount();
    await choose('Keys', 'Alto clef');
    expect(trackOf(keys).notationStaff).toBe('alto');
    expect(stavesOf(keys)).toEqual(['alto']);
    await choose('Bass', 'Bass clef');
    expect(trackOf(bass).notationStaff).toBe('bass');
    expect(stavesOf(bass)).toEqual(['bass']);
    await choose('Keys', 'Bass clef 8vb (sounds an octave lower)');
    expect(stavesOf(keys)).toEqual(['bass8vb']);
    // The narrow field names the clef; its tooltip says what the 8 does.
    const field = screen.getByRole('combobox', { name: 'Clef for Keys' });
    expect(field).toHaveTextContent(/^Bass clef 8vb$/);
    expect(field.parentElement?.getAttribute('title')).toBe(
      'Bass clef 8vb (sounds an octave lower), set by hand',
    );
  });
});

describe('a new instrument', () => {
  it('puts a clef set by hand back to Auto, and one undo brings both back', async () => {
    mount();
    await choose('Bass', 'Treble clef');
    expect(stavesOf(bass)).toEqual(['treble']);
    // The keyboard's preset browser: a soundfont cello, as one edit.
    act(() =>
      withTransaction('Change instrument', () =>
        st().updateTrack(bass, { instrument: 'soundfont', gmProgram: 42 }),
      ),
    );
    expect(trackOf(bass).notationStaff).toBeUndefined();
    expect(stavesOf(bass)).toEqual(['bass']);
    expect(
      screen.getByRole('combobox', { name: 'Clef for Bass' }),
    ).toHaveTextContent('Auto (Bass clef)');
    // Then a viola, from the Instruments panel's program list.
    act(() =>
      withTransaction('Change instrument', () =>
        st().updateTrack(bass, { gmProgram: 41 }),
      ),
    );
    expect(stavesOf(bass)).toEqual(['alto']);

    act(() => undo());
    expect(trackOf(bass)).toMatchObject({ gmProgram: 42 });
    act(() => undo());
    expect(trackOf(bass)).toMatchObject({
      instrument: 'bass-electric',
      notationStaff: 'treble',
    });
    expect(stavesOf(bass)).toEqual(['treble']);
    act(() => redo());
    expect(trackOf(bass)).toMatchObject({ instrument: 'soundfont' });
    expect(trackOf(bass).notationStaff).toBeUndefined();
  });

  it('keeps the clef through an edit that is not one', async () => {
    mount();
    await choose('Keys', 'Treble clef');
    act(() => st().updateTrack(keys, { name: 'Lead keys', volume: 0.5 }));
    expect(trackOf(keys).notationStaff).toBe('treble');
  });
});

describe("a part's name on the page", () => {
  const nameButton = (part: string) =>
    within(screen.getByTestId('page')).getByRole('button', {
      name: `Clef for ${part}`,
    });

  it('sits over the name, left of the system’s first bar', () => {
    mount();
    const button = nameButton('Bass');
    // From the page's margin (72 px at this scale) to the opening barline.
    expect(button).toHaveStyle({
      left: '72px',
      width: '126px',
      top: '200px',
      height: '180px',
    });
    expect(button.getAttribute('title')).toBe(
      'Bass — Auto: Bass clef 8vb (sounds an octave lower), for Bass guitar. Click to change the clef.',
    );
  });

  it('opens a menu of the staves, and a choice is one undo step', async () => {
    mount();
    const button = nameButton('Bass');
    act(() => button.focus());
    fireEvent.keyDown(button, { key: 'Enter' });
    const menu = await screen.findByRole('menu');
    expect(menu).toHaveTextContent('Bass · Clef');
    expect(
      within(menu)
        .getAllByRole('menuitemradio')
        .map((item) => [item.textContent, item.getAttribute('aria-checked')]),
    ).toEqual([
      ['Auto (Bass clef 8vb)', 'true'],
      ['Treble clef', 'false'],
      ['Alto clef', 'false'],
      ['Bass clef', 'false'],
      ['Bass clef 8vb (sounds an octave lower)', 'false'],
      ['Grand staff', 'false'],
    ]);
    fireEvent.click(
      within(menu).getByRole('menuitemradio', { name: 'Grand staff' }),
    );
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
    expect(trackOf(bass).notationStaff).toBe('grand');
    expect(stavesOf(bass)).toEqual(['treble', 'bass']);

    act(() => undo());
    expect(trackOf(bass).notationStaff).toBeUndefined();
    expect(stavesOf(bass)).toEqual(['bass8vb']);
  });

  it('says a kit is always on a drum staff', async () => {
    mount();
    const button = nameButton('Drums');
    act(() => button.focus());
    fireEvent.keyDown(button, { key: 'Enter' });
    const menu = await screen.findByRole('menu');
    expect(within(menu).queryAllByRole('menuitemradio')).toEqual([]);
    expect(menu).toHaveTextContent('Drum staff: drum kits always use it');
  });

  it('is not there with one part, which shows no name', () => {
    useStore.setState({
      tracks: st().tracks.filter((t) => t.id === keys),
    } as Partial<AllSlices>);
    mount();
    expect(
      within(screen.getByTestId('page')).queryByRole('button', {
        name: 'Clef for Keys',
      }),
    ).toBeNull();
  });
});
