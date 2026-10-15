// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import type { ComponentType } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ── Opening a sheet leaves its composer alone (score-15, leadsheet-24) ─────
// The Score and the Lead Sheet chart filled an empty composer with the
// signed-in viewer's name as they opened, so viewing a new or template
// project edited it (the autosave wrote it, the next link kept it, a Save
// sent it to the cloud and the set-list chart) and, in a shared session,
// stamped a guest's name on the host's song for everyone. An emptied field
// was ignored, so the name couldn't be taken back out. The name is now only
// the field's placeholder; it is written when typed, and an emptied field
// clears the composer. Only an edit made in the field is written: closing it
// untouched writes nothing, even when a collaborator named the composer while
// it was open.

const h = vi.hoisted(() => ({
  me: undefined as
    | { nickname: string; username: string | null; fullName: string | null }
    | undefined,
  downloadScoreXml: vi.fn(),
}));

vi.mock('@/hooks/data/auth/useMe', () => ({
  useMe: () => ({ data: h.me }),
}));
// Engraving needs VexFlow and a real layout; neither matters to the title.
vi.mock('@/components/notation/StaffView', () => ({
  StaffView: () => null,
  loadVexFlow: () => new Promise(() => {}),
}));
// The toolbar's menus and set-list button aren't under test.
vi.mock('@/daw/components/LeadSheet/LeadSheetToolbar', () => ({
  LeadSheetToolbar: () => null,
}));
// The Score's MusicXML button hands its file to this; nothing downloads here.
vi.mock('@/daw/midi/ScoreMusicXmlExport', () => ({
  downloadScoreXml: h.downloadScoreXml,
}));

import { DOC_KEYS } from '@/daw/persistence/projectDocument/fields';
import { useStore } from '@/daw/store';
import { ScoreView } from '@/daw/components/Score/ScoreView';
import { LeadSheetView } from '../LeadSheetView';

const st = () => useStore.getState();

/** Every value composerName took while the sheet was open. */
let composerWrites: string[] = [];
/** Every document key a write changed while the sheet was open. */
let docWrites: string[] = [];
let unsubscribe = () => {};

const PROMPT = 'Double-click to add composer';

/**
 * A collaborator's edit, applied the way the collab bridge (yjsToZustand)
 * applies a peer's composer: straight into the store, whether or not this
 * viewer has the field open.
 */
const fromCollaborator = (composerName: string) =>
  act(() => {
    useStore.setState({ composerName });
  });

beforeEach(() => {
  h.me = { nickname: 'Ada', username: 'ada', fullName: 'Ada Lovelace' };
  h.downloadScoreXml.mockClear();
  useStore.setState(useStore.getInitialState(), true);

  // A template-like project: a melody to notate and a chord to chart.
  const keys = st().addTrack('midi', 'piano-sampler', 'Keys');
  st().addMidiClip(keys, {
    id: 'clip',
    startTick: 0,
    durationTicks: 1920,
    events: [60, 64, 67].map((note, i) => ({
      note,
      velocity: 100,
      startTick: i * 480,
      durationTicks: 480,
      channel: 0,
    })),
  });
  st().insertChordRegion(0, 'maj', 'C');

  composerWrites = [];
  docWrites = [];
  unsubscribe = useStore.subscribe((state, prev) => {
    if (state.composerName !== prev.composerName) {
      composerWrites.push(state.composerName);
    }
    for (const key of DOC_KEYS) {
      if (state[key] !== prev[key]) docWrites.push(key);
    }
  });
});

afterEach(() => {
  unsubscribe();
  cleanup();
});

/** With a melody to show, the Lead Sheet is written out as a one-part score. */
const showMelody = () => st().setLeadSheetShowMelody(true);
const asChart = () => {};

const sheets: [string, ComponentType, () => void][] = [
  ['the Score', ScoreView, asChart],
  ['the Lead Sheet chart', LeadSheetView, asChart],
  ['the Lead Sheet with its melody', LeadSheetView, showMelody],
];

describe.each(sheets)('opening %s', (_name, Sheet, setUp) => {
  beforeEach(() => {
    setUp();
    // Setting the sheet up is the test's write, not the sheet's.
    composerWrites = [];
    docWrites = [];
  });

  it('leaves an empty composer empty and offers the signed-in name as the placeholder', () => {
    render(<Sheet />);
    expect(st().composerName).toBe('');
    expect(composerWrites).toEqual([]);

    fireEvent.doubleClick(screen.getByText(PROMPT));
    const field = screen.getByRole('textbox', { name: 'Composer' });
    expect(field).toHaveValue('');
    expect(field).toHaveAttribute('placeholder', 'Ada');

    // Closing the field untouched is no edit.
    fireEvent.blur(field);
    expect(screen.getByText(PROMPT)).toBeInTheDocument();
    expect(st().composerName).toBe('');
    expect(composerWrites).toEqual([]);
  });

  it('makes no document write as it opens and closes', async () => {
    const { unmount } = render(<Sheet />);
    // Let the mount effects, and any timer they start, run.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    unmount();
    expect(docWrites).toEqual([]);
  });

  it("leaves an existing project's composer as it was", () => {
    st().setComposerName('Carole King');
    composerWrites = [];

    render(<Sheet />);
    expect(screen.getByText('by Carole King')).toBeInTheDocument();
    expect(st().composerName).toBe('Carole King');
    expect(composerWrites).toEqual([]);
  });

  it('writes the name only when it is typed', () => {
    render(<Sheet />);
    fireEvent.doubleClick(screen.getByText(PROMPT));
    const field = screen.getByRole('textbox', { name: 'Composer' });
    fireEvent.change(field, { target: { value: '  Ada  ' } });
    fireEvent.keyDown(field, { key: 'Enter' });

    expect(st().composerName).toBe('Ada');
    expect(composerWrites).toEqual(['Ada']);
    expect(screen.getByText('by Ada')).toBeInTheDocument();
  });

  it('clears the composer when the field is emptied', () => {
    st().setComposerName('Ada');
    render(<Sheet />);

    fireEvent.doubleClick(screen.getByText('by Ada'));
    const field = screen.getByRole('textbox', { name: 'Composer' });
    expect(field).toHaveValue('Ada');
    fireEvent.change(field, { target: { value: ' ' } });
    fireEvent.keyDown(field, { key: 'Enter' });

    expect(st().composerName).toBe('');
    expect(screen.getByText(PROMPT)).toBeInTheDocument();
  });

  it('keeps the composer when the edit is escaped', () => {
    st().setComposerName('Carole King');
    composerWrites = [];
    render(<Sheet />);

    fireEvent.doubleClick(screen.getByText('by Carole King'));
    const field = screen.getByRole('textbox', { name: 'Composer' });
    fireEvent.change(field, { target: { value: 'Someone else' } });
    fireEvent.keyDown(field, { key: 'Escape' });

    expect(st().composerName).toBe('Carole King');
    expect(composerWrites).toEqual([]);
  });

  it('writes nothing when the sheet closes with the field open', () => {
    const { unmount } = render(<Sheet />);
    fireEvent.doubleClick(screen.getByText(PROMPT));
    expect(screen.getByRole('textbox', { name: 'Composer' })).toHaveFocus();

    unmount();
    expect(composerWrites).toEqual([]);
    expect(docWrites).toEqual([]);
  });

  it("keeps a collaborator's composer when the untouched field closes", () => {
    render(<Sheet />);
    fireEvent.doubleClick(screen.getByText(PROMPT));
    const field = screen.getByRole('textbox', { name: 'Composer' });
    // A collaborator names the composer while this field is open and empty.
    fromCollaborator('Carole King');
    composerWrites = [];

    fireEvent.blur(field);
    expect(st().composerName).toBe('Carole King');
    expect(composerWrites).toEqual([]);
    expect(screen.getByText('by Carole King')).toBeInTheDocument();
  });

  it("keeps a collaborator's rename when the untouched field closes", () => {
    st().setComposerName('Carole King');
    render(<Sheet />);
    fireEvent.doubleClick(screen.getByText('by Carole King'));
    const field = screen.getByRole('textbox', { name: 'Composer' });
    fromCollaborator('Gerry Goffin');
    composerWrites = [];

    fireEvent.keyDown(field, { key: 'Enter' });
    expect(st().composerName).toBe('Gerry Goffin');
    expect(composerWrites).toEqual([]);
  });

  it("lets a name typed in the field win over a collaborator's", () => {
    st().setComposerName('Carole King');
    render(<Sheet />);
    fireEvent.doubleClick(screen.getByText('by Carole King'));
    const field = screen.getByRole('textbox', { name: 'Composer' });
    fromCollaborator('Gerry Goffin');
    fireEvent.change(field, { target: { value: 'Ada' } });
    fireEvent.keyDown(field, { key: 'Enter' });

    expect(st().composerName).toBe('Ada');
    expect(screen.getByText('by Ada')).toBeInTheDocument();
  });

  it('never rewrites the composer the field opened with', () => {
    // A composer can be stored untrimmed: the old auto-fill wrote the
    // viewer's nickname as it came.
    useStore.setState({ composerName: ' Carole King ' });
    composerWrites = [];
    render(<Sheet />);

    fireEvent.doubleClick(screen.getByText('by Carole King'));
    fireEvent.blur(screen.getByRole('textbox', { name: 'Composer' }));
    expect(st().composerName).toBe(' Carole King ');
    expect(composerWrites).toEqual([]);
  });

  it('suggests nothing when no one is signed in', () => {
    h.me = undefined;
    render(<Sheet />);
    fireEvent.doubleClick(screen.getByText(PROMPT));
    expect(
      screen.getByRole('textbox', { name: 'Composer' }),
    ).not.toHaveAttribute('placeholder');
    expect(st().composerName).toBe('');
  });

  it('keeps the on-screen prompt off the printed page', () => {
    render(<Sheet />);
    expect(screen.getByText(PROMPT)).toHaveClass('print:hidden');
  });
});

// The composer line no longer re-renders the whole Score: the MusicXML export
// reads the composer from the project when the button is pressed.
describe("the Score's MusicXML export", () => {
  it('credits the composer the project has when the button is pressed', () => {
    render(<ScoreView />);
    act(() => st().setComposerName('Carole King'));
    fireEvent.click(screen.getByRole('button', { name: 'MusicXML' }));

    expect(h.downloadScoreXml).toHaveBeenCalledTimes(1);
    expect(h.downloadScoreXml.mock.lastCall?.[1]).toMatchObject({
      composer: 'Carole King',
    });
  });

  it('credits no one when the project has no composer', () => {
    render(<ScoreView />);
    fireEvent.click(screen.getByRole('button', { name: 'MusicXML' }));

    expect(h.downloadScoreXml).toHaveBeenCalledTimes(1);
    expect(h.downloadScoreXml.mock.lastCall?.[1].composer).toBeUndefined();
  });
});
