// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
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

// ── A song section's menu (milestone 2.13) ─────────────────────────────────
// The canvas's one menu, opened on a section: what the section is for, then
// Rename · Change type │ Duplicate · Loop · Insert before · Insert after │
// Delete · About song sections. Each item is one undo step; Duplicate and
// Insert move the whole song after the section, so they wait, saying why,
// while a take records or a collaborator holds a track. Then the menu as
// CanvasMenu draws it. Run:
// npx vitest run src/daw/shell/canvas/clipMenu/__tests__/sectionMenu.test.tsx

const h = vi.hoisted(() => ({
  /** What the app's name dialog answers: a name, or null for Cancel. */
  typed: null as string | null,
  /** What it was asked with, each time. */
  asked: [] as Array<{ title?: string; defaultValue?: string }>,
  /** Runs while the dialog is open, before it answers. */
  whileAsking: null as (() => void) | null,
  toasts: [] as Array<{ title?: string; description?: string }>,
  shared: [] as Array<[string, string]>,
}));
vi.mock('@/hooks/useIsPremium', () => ({
  useIsPremium: () => ({ isPremium: true, isLoading: false }),
}));
vi.mock('@/daw/ui/DialogHost', async (original) => ({
  ...(await original<typeof import('@/daw/ui/DialogHost')>()),
  promptDialog: async (options: { title?: string; defaultValue?: string }) => {
    h.asked.push(options);
    h.whileAsking?.();
    return h.typed;
  },
}));
vi.mock('@/daw/shell/notice', () => ({
  notice: (t: { title?: string; description?: string }) => {
    h.toasts.push(t);
  },
}));
vi.mock('@/daw/audio/AudioBufferStore', async (original) => ({
  ...(await original<Record<string, unknown>>()),
  shareClipAudio: (from: string, to: string) => {
    h.shared.push([from, to]);
    return true;
  },
}));

import type { UserPresence } from '@/daw/collab/types';
import {
  SECTION_TYPES,
  sectionTypeInfo,
  type SongSection,
} from '@/daw/model/sections';
import { useStore, type AllSlices } from '@/daw/store';
import {
  historyLabels,
  resetHistory,
  startHistory,
  undo,
} from '@/daw/store/history';
import type { AudioClip, MidiClip } from '@/daw/store/tracksSlice';
import { installDomShims } from '@/daw/ui/__tests__/dom';
import { SONG_FORM_ROUTE } from '../../sections/sectionActions';
import { CanvasMenu } from '../CanvasMenu';
import { useCanvasMenuStore } from '../canvasMenuStore';
import {
  canvasMenuModel,
  menuItemIds,
  type MenuItemModel,
  type MenuModel,
  type SubMenuModel,
} from '../clipMenuModel';
import { runCanvasMenuItem } from '../runCanvasMenuItem';

const s = () => useStore.getState();
const BAR = 1920; // a bar of 4/4

const SECTIONS: SongSection[] = [
  {
    id: 'intro',
    type: 'intro',
    label: 'Intro',
    startTick: 0,
    endTick: 4 * BAR,
  },
  {
    id: 'verse',
    type: 'verse',
    label: 'Verse',
    startTick: 4 * BAR,
    endTick: 12 * BAR,
  },
  {
    id: 'chorus',
    type: 'chorus',
    label: 'Chorus',
    startTick: 12 * BAR,
    endTick: 20 * BAR,
  },
];

const note = (id: string, n: number, startTick: number) => ({
  id,
  note: n,
  velocity: 100,
  startTick,
  durationTicks: 240,
  channel: 0,
});
const presence = (userName: string, selectedTrackId: string | null) =>
  ({
    userId: userName.toLowerCase(),
    userName,
    selectedTrackId,
  }) as unknown as UserPresence;

let keys = '';
let vocal = '';
let stopHistory: () => void;

beforeAll(installDomShims);
beforeEach(() => {
  h.typed = null;
  h.asked = [];
  h.whileAsking = null;
  h.toasts = [];
  h.shared = [];
  useStore.setState(useStore.getInitialState(), true);
  useCanvasMenuStore.setState({ request: null });
  keys = s().addTrack('midi', 'soundfont', 'Keys');
  vocal = s().addTrack('audio', 'audio-input', 'Vocal');
  // In the verse, a riff (bar 6) and a take (bars 7 and 8); a hook starts
  // the chorus (bar 13).
  s().addMidiClip(keys, {
    id: 'riff',
    name: 'Riff',
    startTick: 5 * BAR,
    durationTicks: BAR,
    events: [note('n60', 60, 0), note('n64', 64, 480)],
  } as MidiClip);
  s().addMidiClip(keys, {
    id: 'hook',
    startTick: 12 * BAR,
    durationTicks: BAR,
    events: [note('n67', 67, 0)],
  } as MidiClip);
  s().addAudioClip(vocal, {
    id: 'take',
    startTick: 6 * BAR,
    duration: 2 * BAR,
    fadeInTicks: 0,
    fadeOutTicks: 0,
  } as AudioClip);
  s().setSections(SECTIONS);
  resetHistory();
  stopHistory = startHistory();
});
afterEach(() => {
  stopHistory();
  cleanup();
});

const target = (sectionId: string) =>
  ({
    kind: 'section',
    sectionId,
    tick: s().sections.find((x) => x.id === sectionId)?.startTick ?? 0,
  }) as const;
const ctx = { premium: true, playheadTick: 0 };
const model = (sectionId: string): MenuModel =>
  canvasMenuModel(s() as AllSlices, target(sectionId), ctx);
const run = (sectionId: string, id: string) =>
  runCanvasMenuItem(target(sectionId), id);

function find(
  m: MenuModel,
  id: string,
): MenuItemModel | SubMenuModel | undefined {
  for (const entry of m.flat()) {
    if (entry.type === 'note') continue;
    if (entry.id === id) return entry;
    if (entry.type === 'sub') {
      const inner = entry.items.find((item) => item.id === id);
      if (inner) return inner;
    }
  }
  return undefined;
}

/** The items that are off, with why. */
const off = (m: MenuModel) =>
  m
    .flat()
    .flatMap((e) =>
      e.type !== 'note' && e.disabled !== undefined ? [[e.id, e.disabled]] : [],
    );
/** The song's sections as [id, first bar line, last bar line]. */
const bars = () =>
  s().sections.map((x) => [x.id, x.startTick / BAR, x.endTick / BAR]);
const section = (id: string) => s().sections.find((x) => x.id === id)!;
const midiClip = (id: string) =>
  s()
    .tracks.flatMap((t) => t.midiClips)
    .find((c) => c.id === id);
/** Lets a dialog's answer arrive. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('the menu on a section', () => {
  it('says what the section is for, then Rename · Change type │ Duplicate · Loop · Insert before · Insert after │ Delete · About song sections', () => {
    const m = model('verse');
    expect(m.map((group) => group.map((e) => e.id))).toEqual([
      ['sectionPurpose'],
      ['renameSection', 'sectionType'],
      ['duplicateSection', 'loopSection', 'insertBefore', 'insertAfter'],
      ['deleteSection', 'learnSections'],
    ]);
    expect(m[0][0]).toEqual({
      type: 'note',
      id: 'sectionPurpose',
      label: `Verse: ${sectionTypeInfo('verse').purpose}`,
    });
    // A line to read, not an item to run.
    expect(menuItemIds(m)).not.toContain('sectionPurpose');
    // With nothing in the way, nothing is off.
    expect(off(m)).toEqual([]);
    // Each shows the key that does the same in the lane.
    expect(find(m, 'renameSection')).toMatchObject({
      command: 'sections.rename',
    });
    expect(find(m, 'duplicateSection')).toMatchObject({
      command: 'sections.duplicate',
    });
    expect(find(m, 'deleteSection')).toMatchObject({
      command: 'sections.delete',
    });
  });

  it('names a section of the student’s own by its name in the note', () => {
    s().setSections([
      { ...SECTIONS[0], type: 'custom', label: 'Ocean' },
      ...SECTIONS.slice(1),
    ]);
    expect(model('intro')[0][0]).toMatchObject({
      label: `Ocean: ${sectionTypeInfo('custom').purpose}`,
    });
  });

  it('lists the 14 kinds under Change type, the section’s own checked', () => {
    const sub = find(model('chorus'), 'sectionType') as SubMenuModel;
    expect(sub.type).toBe('sub');
    expect(sub.items).toHaveLength(14);
    expect(sub.items.map((i) => i.id)).toEqual(
      SECTION_TYPES.map((t) => `sectionType:${t.type}`),
    );
    expect(sub.items.map((i) => i.label)).toEqual(
      SECTION_TYPES.map((t) => t.name),
    );
    expect(sub.items.every((i) => typeof i.checked === 'boolean')).toBe(true);
    expect(sub.items.filter((i) => i.checked).map((i) => i.id)).toEqual([
      'sectionType:chorus',
    ]);
  });

  it('offers every kind and a name of one’s own to insert before or after', () => {
    const m = model('verse');
    for (const id of ['insertBefore', 'insertAfter']) {
      const sub = find(m, id) as SubMenuModel;
      expect(sub.type).toBe('sub');
      expect(sub.items.map((i) => i.id)).toEqual([
        ...SECTION_TYPES.map((t) => `${id}:${t.type}`),
        `${id}:custom`,
      ]);
      // They make a new section: nothing in them is checked.
      expect(sub.items.some((i) => i.checked !== undefined)).toBe(false);
    }
  });

  it('checks Loop this section only while the loop is on over exactly it', () => {
    const loop = (id: string) => find(model(id), 'loopSection');
    expect(loop('verse')).toMatchObject({ checked: false });
    useStore.setState({
      loopStart: 4 * BAR,
      loopEnd: 12 * BAR,
      loopEnabled: false,
    });
    expect(loop('verse')).toMatchObject({ checked: false });
    useStore.setState({ loopEnabled: true });
    expect(loop('verse')).toMatchObject({ checked: true });
    expect(loop('chorus')).toMatchObject({ checked: false });
    useStore.setState({ loopEnd: 13 * BAR });
    expect(loop('verse')).toMatchObject({ checked: false });
  });

  it('keeps Duplicate and Insert off while a take records, saying why', () => {
    useStore.setState({ isRecording: true });
    expect(off(model('verse'))).toEqual([
      ['duplicateSection', 'Stop recording first'],
      ['insertBefore', 'Stop recording first'],
      ['insertAfter', 'Stop recording first'],
    ]);
  });

  it('and while a collaborator holds a track, naming them', () => {
    useStore.setState({ remoteUsers: new Map([[7, presence('Sam', keys)]]) });
    expect(off(model('verse'))).toEqual([
      ['duplicateSection', 'Sam is editing a track'],
      ['insertBefore', 'Sam is editing a track'],
      ['insertAfter', 'Sam is editing a track'],
    ]);
    // Someone on no track holds nothing up.
    useStore.setState({ remoteUsers: new Map([[7, presence('Sam', null)]]) });
    expect(off(model('verse'))).toEqual([]);
  });

  it('has nothing to show for a section that has gone', () => {
    expect(model('nope')).toEqual([]);
    s().removeSection('verse');
    expect(model('verse')).toEqual([]);
  });
});

describe('what its items do', () => {
  it('Rename… names the section in the app’s dialog, starting from its name, as one undo step', async () => {
    h.typed = 'Verse 1';
    expect(run('verse', 'renameSection')).toBe(true);
    await waitFor(() => expect(section('verse').label).toBe('Verse 1'));
    // A new name, the same kind.
    expect(section('verse').type).toBe('verse');
    expect(h.asked).toEqual([
      expect.objectContaining({ defaultValue: 'Verse' }),
    ]);
    expect(historyLabels()).toEqual(['Rename section']);
  });

  it('a cancelled rename changes nothing', async () => {
    h.typed = null;
    run('verse', 'renameSection');
    await settle();
    expect(h.asked).toHaveLength(1);
    expect(s().sections).toBe(SECTIONS);
    expect(historyLabels()).toEqual([]);
  });

  it('Change type renames a section named after its kind, and keeps a name of the student’s own', () => {
    s().setSections([
      {
        id: 'a',
        type: 'verse',
        label: 'Verse',
        startTick: 0,
        endTick: 8 * BAR,
      },
      {
        id: 'b',
        type: 'verse',
        label: 'Ocean',
        startTick: 8 * BAR,
        endTick: 16 * BAR,
      },
      {
        id: 'c',
        type: 'intro',
        label: 'Intro 2',
        startTick: 16 * BAR,
        endTick: 20 * BAR,
      },
    ]);
    resetHistory();
    expect(run('a', 'sectionType:chorus')).toBe(true);
    expect(section('a')).toMatchObject({ type: 'chorus', label: 'Chorus' });
    run('b', 'sectionType:chorus');
    expect(section('b')).toMatchObject({ type: 'chorus', label: 'Ocean' });
    // A numbered name of its kind takes the new kind's name.
    run('c', 'sectionType:outro');
    expect(section('c')).toMatchObject({ type: 'outro', label: 'Outro' });
    expect(historyLabels()).toEqual([
      'Change section type',
      'Change section type',
      'Change section type',
    ]);
    // Its own kind again is no step; what isn't a kind does nothing.
    run('a', 'sectionType:chorus');
    expect(historyLabels()).toHaveLength(3);
    expect(run('a', 'sectionType:nope')).toBe(false);
    expect(section('a')).toMatchObject({ type: 'chorus', label: 'Chorus' });
  });

  it('Duplicate with its clips plays the section twice: what plays in it is copied into the gap and the rest moves on, as one undo step', () => {
    const before = { tracks: s().tracks, sections: s().sections };
    expect(run('verse', 'duplicateSection')).toBe(true);
    expect(bars()).toEqual([
      ['intro', 0, 4],
      ['verse', 4, 12],
      [expect.any(String), 12, 20],
      ['chorus', 20, 28],
    ]);
    expect(s().sections[2]).toMatchObject({ type: 'verse', label: 'Verse' });

    // The riff stays, and a copy plays 8 bars on with notes of its own; the
    // hook moves on with the chorus.
    expect(midiClip('riff')?.startTick).toBe(5 * BAR);
    expect(midiClip('hook')?.startTick).toBe(20 * BAR);
    const copies = s().tracks[0].midiClips.filter(
      (c) => c.id !== 'riff' && c.id !== 'hook',
    );
    expect(copies).toHaveLength(1);
    expect(copies[0]).toMatchObject({ startTick: 13 * BAR, name: 'Riff' });
    expect(copies[0].events.map((e) => [e.note, e.startTick])).toEqual([
      [60, 0],
      [64, 480],
    ]);
    const noteIds = copies[0].events.map((e) => e.id);
    expect(new Set(noteIds).size).toBe(2);
    for (const id of noteIds) expect(['n60', 'n64', 'n67']).not.toContain(id);

    // The take's window too, playing the take's audio.
    const takes = s().tracks[1].audioClips;
    expect(takes.map((c) => c.startTick)).toEqual([6 * BAR, 14 * BAR]);
    expect(takes[1].id).not.toBe('take');
    expect(h.shared).toEqual([['take', takes[1].id]]);
    expect(historyLabels()).toEqual(['Duplicate section']);

    undo();
    expect(s().sections).toEqual(before.sections);
    expect(s().tracks.map((t) => [t.midiClips, t.audioClips])).toEqual(
      before.tracks.map((t) => [t.midiClips, t.audioClips]),
    );
  });

  it('Loop this section loops it, and a second time turns the loop off', () => {
    const loop = () => ({
      on: s().loopEnabled,
      from: s().loopStart / BAR,
      to: s().loopEnd / BAR,
    });
    expect(run('verse', 'loopSection')).toBe(true);
    expect(loop()).toEqual({ on: true, from: 4, to: 12 });
    run('verse', 'loopSection');
    expect(loop()).toEqual({ on: false, from: 4, to: 12 });
    // On over something else, the loop moves to the section.
    useStore.setState({ loopEnabled: true, loopStart: 0, loopEnd: BAR });
    run('chorus', 'loopSection');
    expect(loop()).toEqual({ on: true, from: 12, to: 20 });
  });

  it('Insert after ▸ Bridge puts 8 empty bars and a Bridge after the section, moving the rest on', async () => {
    expect(run('verse', 'insertAfter:bridge')).toBe(true);
    await waitFor(() => expect(s().sections).toHaveLength(4));
    expect(bars()).toEqual([
      ['intro', 0, 4],
      ['verse', 4, 12],
      [expect.any(String), 12, 20],
      ['chorus', 20, 28],
    ]);
    expect(s().sections[2]).toMatchObject({ type: 'bridge', label: 'Bridge' });
    expect(midiClip('riff')?.startTick).toBe(5 * BAR);
    expect(midiClip('hook')?.startTick).toBe(20 * BAR);
    // Empty bars: nothing is copied, and no name is asked for.
    expect(s().tracks[0].midiClips).toHaveLength(2);
    expect(h.asked).toEqual([]);
    expect(historyLabels()).toEqual(['Insert section']);
  });

  it('Insert before ▸ a kind puts the bars before the section', async () => {
    run('intro', 'insertBefore:intro');
    await waitFor(() => expect(s().sections).toHaveLength(4));
    expect(bars()).toEqual([
      [expect.any(String), 0, 8],
      ['intro', 8, 12],
      ['verse', 12, 20],
      ['chorus', 20, 28],
    ]);
    expect(s().sections[0]).toMatchObject({ type: 'intro', label: 'Intro' });
    expect(midiClip('riff')?.startTick).toBe(13 * BAR);
  });

  it('Insert before ▸ Custom name… asks for the name, and the name says its kind', async () => {
    h.typed = 'Middle 8';
    run('chorus', 'insertBefore:custom');
    await waitFor(() => expect(s().sections).toHaveLength(4));
    expect(h.asked).toHaveLength(1);
    expect(bars()).toEqual([
      ['intro', 0, 4],
      ['verse', 4, 12],
      [expect.any(String), 12, 20],
      ['chorus', 20, 28],
    ]);
    expect(s().sections[2]).toMatchObject({
      type: 'bridge',
      label: 'Middle 8',
    });
    expect(historyLabels()).toEqual(['Insert section']);
  });

  it('a cancelled name inserts nothing', async () => {
    h.typed = null;
    run('chorus', 'insertAfter:custom');
    await settle();
    expect(h.asked).toHaveLength(1);
    expect(s().sections).toBe(SECTIONS);
    expect(historyLabels()).toEqual([]);
  });

  it('Delete section keeps its bars and the clips on them', () => {
    const tracks = s().tracks;
    expect(run('verse', 'deleteSection')).toBe(true);
    expect(bars()).toEqual([
      ['intro', 0, 4],
      ['chorus', 12, 20],
    ]);
    expect(s().tracks).toBe(tracks);
    expect(historyLabels()).toEqual(['Delete section']);
  });

  it('About song sections opens Learn → Songs in a new tab', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    try {
      expect(run('verse', 'learnSections')).toBe(true);
      expect(SONG_FORM_ROUTE).toBe('/learn?tab=Songs');
      expect(open).toHaveBeenCalledWith(
        '/learn?tab=Songs',
        '_blank',
        expect.stringContaining('noopener'),
      );
      expect(s().sections).toBe(SECTIONS);
    } finally {
      open.mockRestore();
    }
  });

  it('refuses Duplicate while a take records, saying why, and changes nothing', () => {
    useStore.setState({ isRecording: true });
    const tracks = s().tracks;
    expect(run('verse', 'duplicateSection')).toBe(false);
    expect(s().tracks).toBe(tracks);
    expect(s().sections).toBe(SECTIONS);
    expect(historyLabels()).toEqual([]);
    expect(h.shared).toEqual([]);
    expect(h.toasts).toEqual([
      expect.objectContaining({
        title: 'Not now',
        description: 'Stop recording first',
      }),
    ]);
  });

  it('refuses Insert while a collaborator holds a track, before asking for a name', async () => {
    useStore.setState({ remoteUsers: new Map([[7, presence('Sam', keys)]]) });
    h.typed = 'Ocean';
    run('verse', 'insertAfter:custom');
    run('verse', 'insertBefore:bridge');
    await settle();
    expect(h.asked).toEqual([]);
    expect(s().sections).toBe(SECTIONS);
    expect(historyLabels()).toEqual([]);
    expect(h.toasts.map((t) => t.description)).toEqual([
      'Sam is editing a track',
      'Sam is editing a track',
    ]);
  });

  it('checks again once the name is in: a take started meanwhile stops the insert', async () => {
    h.typed = 'Ocean';
    h.whileAsking = () => useStore.setState({ isRecording: true });
    run('verse', 'insertAfter:custom');
    await waitFor(() => expect(h.toasts).toHaveLength(1));
    expect(h.toasts[0]).toMatchObject({ description: 'Stop recording first' });
    expect(s().sections).toBe(SECTIONS);
    expect(historyLabels()).toEqual([]);
  });

  it('does nothing for an id it doesn’t know', () => {
    expect(run('verse', 'nope')).toBe(false);
    expect(run('verse', 'insertAfter:nope')).toBe(false);
    expect(run('verse', 'insertBefore:')).toBe(false);
    expect(s().sections).toBe(SECTIONS);
    expect(historyLabels()).toEqual([]);
  });
});

describe('the menu drawn for a section', () => {
  let back: HTMLButtonElement;
  beforeEach(() => {
    // Stands in for the section's block in the lane.
    back = document.createElement('button');
    back.textContent = 'Verse, bars 5 to 12';
    document.body.append(back);
  });
  afterEach(() => back.remove());

  const openOn = (sectionId: string, source: 'pointer' | 'key' = 'key') =>
    act(() =>
      useCanvasMenuStore.getState().open({
        target: target(sectionId),
        anchor: { x: 320, y: 40, width: 640, height: 20 },
        source,
        playheadTick: 0,
        returnFocus: back,
      }),
    );
  const itemOf = (id: string) =>
    document.querySelector<HTMLElement>(`[data-item="${id}"]`);
  /** Opens it, and waits as a student would for it to be ready for keys. */
  async function menuOn(sectionId: string, source: 'pointer' | 'key' = 'key') {
    openOn(sectionId, source);
    const menu = await screen.findByRole('menu', { name: 'Section menu' });
    // Opened from a key, focus moves onto the first item a frame later.
    if (source === 'key') {
      await waitFor(() => expect(itemOf('renameSection')).toHaveFocus());
    }
    return menu;
  }
  const dataItems = (root: Element) =>
    [...root.querySelectorAll('[data-item]')].map((el) =>
      el.getAttribute('data-item'),
    );

  it('shows the section’s items, focus on the first, and gives focus back when it closes', async () => {
    render(<CanvasMenu />);
    openOn('verse');
    const menu = await screen.findByRole('menu', { name: 'Section menu' });
    expect(menu).toHaveAttribute('data-menu-target', 'section');
    expect(menu).toHaveAttribute('data-tutorial-id', 'clip-menu');
    expect(dataItems(menu)).toEqual([
      'sectionPurpose',
      'renameSection',
      'sectionType',
      'duplicateSection',
      'loopSection',
      'insertBefore',
      'insertAfter',
      'deleteSection',
      'learnSections',
    ]);
    expect(itemOf('sectionPurpose')).toHaveTextContent(
      sectionTypeInfo('verse').purpose,
    );
    // Opened from a key: focus starts on the first item.
    await waitFor(() => expect(itemOf('renameSection')).toHaveFocus());

    fireEvent.keyDown(itemOf('renameSection')!, {
      key: 'Escape',
      code: 'Escape',
    });
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
    expect(useCanvasMenuStore.getState().request).toBeNull();
    await waitFor(() => expect(back).toHaveFocus());
  });

  it('gives focus back without scrolling, and once that has gone, to what the opener names', async () => {
    render(<CanvasMenu />);
    const focus = vi.spyOn(back, 'focus');
    await menuOn('verse');
    fireEvent.keyDown(itemOf('renameSection')!, {
      key: 'Escape',
      code: 'Escape',
    });
    await waitFor(() => expect(back).toHaveFocus());
    expect(focus).toHaveBeenLastCalledWith({ preventScroll: true });

    // The section it was opened from goes while it is open.
    const neighbour = document.createElement('button');
    document.body.append(neighbour);
    act(() =>
      useCanvasMenuStore.getState().open({
        target: target('verse'),
        anchor: { x: 320, y: 40, width: 0, height: 20 },
        source: 'key',
        playheadTick: 0,
        returnFocus: back,
        returnFocusFallback: () => neighbour,
      }),
    );
    await waitFor(() => expect(itemOf('renameSection')).toHaveFocus());
    back.remove();
    fireEvent.keyDown(itemOf('renameSection')!, {
      key: 'Escape',
      code: 'Escape',
    });
    await waitFor(() => expect(neighbour).toHaveFocus());
    neighbour.remove();
  });

  it('runs the item chosen on its section, closes, and gives focus back', async () => {
    render(<CanvasMenu />);
    await menuOn('verse', 'pointer');
    expect(itemOf('loopSection')).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(itemOf('loopSection')!);
    expect(s()).toMatchObject({
      loopEnabled: true,
      loopStart: 4 * BAR,
      loopEnd: 12 * BAR,
    });
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
    await waitFor(() => expect(back).toHaveFocus());
  });

  it('opens Change type with the section’s kind checked', async () => {
    render(<CanvasMenu />);
    await menuOn('verse');
    fireEvent.keyDown(itemOf('sectionType')!, {
      key: 'ArrowRight',
      code: 'ArrowRight',
    });
    await waitFor(() => expect(itemOf('sectionType:verse')).not.toBeNull());
    expect(itemOf('sectionType:verse')).toHaveAttribute('aria-checked', 'true');
    expect(itemOf('sectionType:chorus')).toHaveAttribute(
      'aria-checked',
      'false',
    );
    fireEvent.click(itemOf('sectionType:chorus')!);
    expect(section('verse')).toMatchObject({ type: 'chorus', label: 'Chorus' });
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
  });

  it('opens Insert after with every kind and a name of one’s own, and inserts the one picked', async () => {
    render(<CanvasMenu />);
    await menuOn('verse');
    fireEvent.keyDown(itemOf('insertAfter')!, {
      key: 'ArrowRight',
      code: 'ArrowRight',
    });
    await waitFor(() => expect(itemOf('insertAfter:custom')).not.toBeNull());
    expect(
      [...document.querySelectorAll('[data-item^="insertAfter:"]')].map((el) =>
        el.getAttribute('data-item'),
      ),
    ).toEqual([
      ...SECTION_TYPES.map((t) => `insertAfter:${t.type}`),
      'insertAfter:custom',
    ]);
    fireEvent.click(itemOf('insertAfter:bridge')!);
    await waitFor(() => expect(s().sections).toHaveLength(4));
    expect(s().sections[2]).toMatchObject({
      type: 'bridge',
      label: 'Bridge',
      startTick: 12 * BAR,
    });
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
  });

  it('shows Duplicate and Insert off while a take records, with the reason', async () => {
    useStore.setState({ isRecording: true });
    render(<CanvasMenu />);
    await menuOn('verse');
    for (const id of ['duplicateSection', 'insertBefore', 'insertAfter']) {
      expect(itemOf(id)).toHaveAttribute('data-disabled');
      expect(itemOf(id)).toHaveAttribute('title', 'Stop recording first');
    }
    expect(itemOf('renameSection')).not.toHaveAttribute('data-disabled');
    expect(itemOf('deleteSection')).not.toHaveAttribute('data-disabled');
  });

  it('closes when its section goes', async () => {
    render(<CanvasMenu />);
    await menuOn('verse');
    act(() => s().removeSection('verse'));
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
    expect(useCanvasMenuStore.getState().request).toBeNull();
  });
});
