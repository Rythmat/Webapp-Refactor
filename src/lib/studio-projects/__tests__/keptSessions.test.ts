// @vitest-environment jsdom
/**
 * Kept work (owner decision 6): a link that replaces the session sets its
 * work aside first, in a timestamped slot per user, and never has to ask.
 *
 * Kept: an edited session, a restored one (whose undo history the restore
 * cleared), and on a fresh page the autosave, which is then the only copy.
 * Not kept: an empty session, or one untouched since it opened (a template
 * or demo can be opened again), so browsing them can't push real work out of
 * the newest five slots.
 *
 * Full storage is tested against jsdom's own quota (5M UTF-16 code units,
 * keys and values counted the way browsers count them), filled with another
 * feature's data, and against a storage that refuses every write. Either
 * way, kept work is dropped only to store newer work in its place.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  forgetLiveSession,
  markSessionLoaded,
  resetSessionToEmpty,
  serializeSession,
} from '@/daw/persistence/SessionSerializer';
import { useStore } from '@/daw/store';
import { showError, showNotice } from '@/util/toast';
import {
  announceKeptWork,
  announceKeptWorkAfterReload,
  announceKeptWorkFromReload,
  keepOutgoingSession,
  listKeptSessions,
  markSessionPristine,
  readKeptSession,
  readLocalSession,
  replaceSession,
  restoreKeptSession,
  restoreKeptWork,
  resumeLocalSession,
  swapInKeptSession,
  writeLocalSession,
  type KeptSessionInfo,
} from '../localSession';

vi.mock('@/util/toast', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/util/toast')>()),
  showError: vi.fn(),
  showNotice: vi.fn(),
}));

const s = () => useStore.getState();

/** An opened session: the template's tracks, as it arrived. */
function openTemplate(name = 'Lo-Fi Template'): void {
  resetSessionToEmpty();
  s().setProjectName(name);
  s().addTrack('midi', 'piano-sampler', 'Keys');
  markSessionPristine();
}

/** The student plays a part into it (`notes` long). */
function edit(notes = 1): void {
  const keys = s().tracks[0].id;
  s().addMidiClip(keys, {
    id: `clip-${s().tracks[0].midiClips.length}`,
    startTick: 0,
    events: Array.from({ length: notes }, (_, i) => ({
      note: 48 + (i % 24),
      velocity: 90,
      startTick: i * 120,
      durationTicks: 110,
      channel: 0,
    })),
  });
}

/** Keep `name` as edited work for `user`, a minute after the last one. */
function keepWork(user: string, name: string): KeptSessionInfo {
  openTemplate(name);
  edit();
  const outcome = keepOutgoingSession(user);
  if (outcome.status !== 'kept') throw new Error(`${name} was not kept`);
  vi.advanceTimersByTime(60_000);
  return outcome.slot;
}

/** A kept slot written straight to storage, `padding` characters heavier. */
function plantSlot(
  user: string,
  keptAt: string,
  projectName: string,
  padding = 0,
): string {
  const session = serializeSession();
  session.data.projectName = projectName;
  session.data.composerName = 'x'.repeat(padding);
  const key = `musicAtlas:daw:kept:${user}:${keptAt}`;
  localStorage.setItem(key, JSON.stringify({ keptAt, projectName, session }));
  return key;
}

const keptKeys = () =>
  Object.keys(localStorage).filter((k) => k.startsWith('musicAtlas:daw:kept:'));
const names = (user: string) =>
  listKeptSessions(user).map((k) => k.projectName);

// jsdom's localStorage quota, in UTF-16 code units (keys included).
const QUOTA = 5_000_000;
const OTHER_APP_KEY = 'other-feature-data';
const used = () =>
  Object.keys(localStorage).reduce(
    (sum, key) => sum + key.length + (localStorage.getItem(key)?.length ?? 0),
    0,
  );
/** Fill storage with another feature's data, leaving `room` code units. */
function fillStorageLeaving(room: number): void {
  localStorage.removeItem(OTHER_APP_KEY);
  localStorage.setItem(
    OTHER_APP_KEY,
    'x'.repeat(QUOTA - used() - OTHER_APP_KEY.length - room),
  );
}
const slotSize = (key: string) =>
  key.length + (localStorage.getItem(key)?.length ?? 0);

/** A storage that refuses every write until the returned restore runs. */
const refuseEveryWrite = () =>
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('full', 'QuotaExceededError');
  });

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  useStore.setState(useStore.getInitialState(), true);
  forgetLiveSession();
  vi.mocked(showError).mockClear();
  vi.mocked(showNotice).mockClear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-07T09:00:00Z'));
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('what a link keeps', () => {
  it('nothing from an empty session', () => {
    resetSessionToEmpty();
    expect(keepOutgoingSession('u1')).toEqual({ status: 'nothing' });
    expect(keptKeys()).toEqual([]);
  });

  it('nothing from a template nobody has touched', () => {
    openTemplate();
    s().setPosition(960); // pressing Play is not work
    expect(keepOutgoingSession('u1')).toEqual({ status: 'nothing' });
  });

  it('an edited session, under the user, with its name and time', () => {
    openTemplate('Blue Hour');
    edit();
    const outcome = keepOutgoingSession('u1');

    expect(outcome).toEqual({
      status: 'kept',
      slot: {
        key: 'musicAtlas:daw:kept:u1:2026-10-07T09:00:00.000Z',
        keptAt: '2026-10-07T09:00:00.000Z',
        projectName: 'Blue Hour',
      },
    });
    const kept = readKeptSession(
      'musicAtlas:daw:kept:u1:2026-10-07T09:00:00.000Z',
    );
    expect(kept?.projectName).toBe('Blue Hour');
    expect(kept?.session.data.tracks[0].midiClips).toHaveLength(1);
  });

  it('a session restored from the autosave (its undo history is gone)', () => {
    openTemplate();
    edit();
    writeLocalSession();
    forgetLiveSession();
    useStore.setState(useStore.getInitialState(), true);
    expect(resumeLocalSession()).toBe('restored');

    expect(keepOutgoingSession('u1').status).toBe('kept');
  });

  it('on a fresh page, the autosave: the only copy of the last session', () => {
    openTemplate('Yesterday’s Jam');
    edit();
    writeLocalSession();
    // A new page: nothing loaded yet, the store empty.
    forgetLiveSession();
    useStore.setState(useStore.getInitialState(), true);

    const outcome = keepOutgoingSession(null);
    expect(outcome.status).toBe('kept');
    expect(listKeptSessions(null)).toEqual([
      {
        key: 'musicAtlas:daw:kept:anon:2026-10-07T09:00:00.000Z',
        keptAt: '2026-10-07T09:00:00.000Z',
        projectName: 'Yesterday’s Jam',
      },
    ]);
  });

  it('the same work once, however many links pass it on', () => {
    openTemplate();
    edit();
    const first = keepOutgoingSession('u1');
    vi.advanceTimersByTime(60_000);
    const again = keepOutgoingSession('u1');
    expect(again).toEqual(first);
    expect(keptKeys()).toHaveLength(1);
  });
});

describe('the kept slots', () => {
  it('keep the newest five per user, newest first', () => {
    for (let i = 1; i <= 7; i++) keepWork('u1', `Song ${i}`);
    keepWork('u2', 'Theirs');

    expect(names('u1')).toEqual([
      'Song 7',
      'Song 6',
      'Song 5',
      'Song 4',
      'Song 3',
    ]);
    expect(names('u2')).toEqual(['Theirs']);
  });

  it('stay within one budget for everyone on the device, oldest out first', () => {
    // Two other students' heavy sessions: together over the 1M budget once
    // anything else is kept.
    plantSlot('u2', '2026-10-01T08:00:00.000Z', 'Their Big One', 600_000);
    plantSlot('u3', '2026-10-02T08:00:00.000Z', 'Another Big One', 450_000);
    keepWork('u1', 'Mine');

    expect(names('u2')).toEqual([]);
    expect(names('u3')).toEqual(['Another Big One']);
    expect(names('u1')).toEqual(['Mine']);
  });

  it('never give up the newest slot to the budget', () => {
    keepWork('u1', 'Earlier');
    openTemplate('Huge');
    s().setComposerName('x'.repeat(1_100_000));
    edit();
    expect(keepOutgoingSession('u1').status).toBe('kept');
    expect(names('u1')).toEqual(['Huge']);
  });

  it('are told apart by user even when one id starts another', () => {
    keepWork('a', 'Short id');
    keepWork('a:b', 'Long id');
    expect(names('a')).toEqual(['Short id']);
    expect(names('a:b')).toEqual(['Long id']);
  });
});

describe('when storage is full', () => {
  it('older kept work makes room, as little as will do', () => {
    const oldest = keepWork('u1', 'Old 1');
    const older = keepWork('u1', 'Old 2');
    openTemplate('New');
    edit();
    const newSize = slotSize(oldest.key);
    fillStorageLeaving(Math.floor(newSize / 2));

    const outcome = keepOutgoingSession('u1');

    expect(outcome.status).toBe('kept');
    expect(names('u1')).toEqual(['New', 'Old 2']);
    expect(readKeptSession(older.key)?.projectName).toBe('Old 2');
  });

  it('nothing is dropped when dropping everything would not make room', () => {
    keepWork('u1', 'Old 1');
    keepWork('u1', 'Old 2');
    openTemplate('Long Take');
    edit(4000); // far bigger than both kept slots together
    fillStorageLeaving(2_000);

    expect(keepOutgoingSession('u1')).toEqual({ status: 'failed' });
    expect(names('u1')).toEqual(['Old 2', 'Old 1']);
  });

  it('nothing is dropped when storage refuses every write', () => {
    keepWork('u1', 'Old 1');
    keepWork('u1', 'Old 2');
    openTemplate('New');
    edit();

    refuseEveryWrite();
    const outcome = keepOutgoingSession('u1');
    vi.restoreAllMocks();

    expect(outcome).toEqual({ status: 'failed' });
    expect(names('u1')).toEqual(['Old 2', 'Old 1']);
  });

  it('the autosave may take the place of another user’s oldest kept work', () => {
    const theirs = plantSlot(
      'u2',
      '2026-10-01T08:00:00.000Z',
      'Theirs',
      50_000,
    );
    const mine = keepWork('u1', 'Mine');
    openTemplate('Live');
    edit(500);
    fillStorageLeaving(1_000);

    expect(writeLocalSession('u1')).toBe(true);
    expect(readLocalSession()?.data.projectName).toBe('Live');
    expect(localStorage.getItem(theirs)).toBeNull();
    expect(readKeptSession(mine.key)?.projectName).toBe('Mine');
  });

  it('but never of the user’s own kept work, nor more than one', () => {
    const mine = plantSlot('u1', '2026-10-01T08:00:00.000Z', 'Mine', 50_000);
    const small = plantSlot('u2', '2026-10-02T08:00:00.000Z', 'Small', 0);
    const alsoSmall = plantSlot('u3', '2026-10-03T08:00:00.000Z', 'Tiny', 0);
    markSessionLoaded();
    s().addTrack('midi', 'piano-sampler', 'Keys');
    s().setComposerName('x'.repeat(20_000));
    fillStorageLeaving(1_000);

    expect(writeLocalSession('u1')).toBe(false);
    expect(localStorage.getItem(mine)).not.toBeNull();
    expect(localStorage.getItem(small)).not.toBeNull();
    expect(localStorage.getItem(alsoSmall)).not.toBeNull();
  });

  it('but not for a session nobody has changed since it opened', () => {
    // An untouched template opens again from its link: no one's kept work
    // goes for its crash copy.
    const theirs = plantSlot(
      'u2',
      '2026-10-01T08:00:00.000Z',
      'Theirs',
      50_000,
    );
    openTemplate('Untouched');
    s().setComposerName('x'.repeat(5_000));
    markSessionPristine();
    fillStorageLeaving(1_000);

    expect(writeLocalSession('u1')).toBe(false);
    expect(localStorage.getItem(theirs)).not.toBeNull();
  });

  it('nor for a session still being opened', async () => {
    const theirs = plantSlot(
      'u2',
      '2026-10-01T08:00:00.000Z',
      'Theirs',
      50_000,
    );
    resetSessionToEmpty();
    fillStorageLeaving(1_000);
    let finishSeed = () => {};
    const opening = replaceSession('u1', async () => {
      s().addTrack('midi', 'piano-sampler', 'Keys');
      s().setComposerName('x'.repeat(5_000));
      await new Promise<void>((resolve) => (finishSeed = resolve));
    });

    expect(writeLocalSession('u1')).toBe(false);
    expect(localStorage.getItem(theirs)).not.toBeNull();
    finishSeed();
    await opening;
  });

  it('an autosave written without a user drops nothing', () => {
    const theirs = plantSlot(
      'u2',
      '2026-10-01T08:00:00.000Z',
      'Theirs',
      50_000,
    );
    markSessionLoaded();
    s().addTrack('midi', 'piano-sampler', 'Keys');
    s().setComposerName('x'.repeat(5_000));
    fillStorageLeaving(1_000);

    expect(writeLocalSession()).toBe(false);
    expect(localStorage.getItem(theirs)).not.toBeNull();
  });
});

describe('Restore', () => {
  it('brings the kept session back and drops its slot', () => {
    const slot = keepWork('u1', 'Blue Hour');
    openTemplate('Something Else');

    expect(restoreKeptSession(slot.key)).toBe(true);
    expect(s().projectName).toBe('Blue Hour');
    expect(s().tracks[0].midiClips).toHaveLength(1);
    expect(listKeptSessions('u1')).toEqual([]);
  });

  it('puts the restored session in the autosave at once', () => {
    // Restore can be clicked after leaving the editor, with no autosave
    // running: the autosave must hold the session before the slot goes.
    const slot = keepWork('u1', 'Blue Hour');
    openTemplate('Something Else');
    writeLocalSession();

    restoreKeptSession(slot.key);
    expect(readLocalSession()?.data.projectName).toBe('Blue Hour');
  });

  it('keeps the slot when the autosave cannot be written', () => {
    const slot = keepWork('u1', 'Blue Hour');
    openTemplate('Something Else');

    refuseEveryWrite();
    const restored = restoreKeptSession(slot.key);
    vi.restoreAllMocks();

    expect(restored).toBe(true);
    expect(s().projectName).toBe('Blue Hour');
    expect(readKeptSession(slot.key)?.projectName).toBe('Blue Hour');
  });

  it('changes nothing for a slot that is gone', () => {
    openTemplate('Current');
    expect(restoreKeptSession('musicAtlas:daw:kept:u1:missing')).toBe(false);
    expect(s().projectName).toBe('Current');
  });
});

describe('swapping kept work back in', () => {
  it('keeps what it replaces, even with five slots and the oldest restored', () => {
    const slots = [1, 2, 3, 4, 5].map((i) => keepWork('u1', `Song ${i}`));
    openTemplate('Current');
    edit();

    const outcome = swapInKeptSession(slots[0].key, 'u1');

    expect(outcome).toMatchObject({
      status: 'restored',
      replaced: { projectName: 'Current' },
    });
    expect(s().projectName).toBe('Song 1');
    expect(names('u1')).toEqual([
      'Current',
      'Song 5',
      'Song 4',
      'Song 3',
      'Song 2',
    ]);
  });

  it('never makes room with the slot it is bringing back', () => {
    const target = keepWork('u1', 'Old 1');
    keepWork('u1', 'Old 2');
    openTemplate('Current');
    edit();
    fillStorageLeaving(Math.floor(slotSize(target.key) / 2));

    const outcome = swapInKeptSession(target.key, 'u1');

    expect(outcome.status).toBe('restored');
    expect(s().projectName).toBe('Old 1');
    // Old 2 made the room for the work that was live. Old 1's slot stays
    // too: storage had no room left for the autosave's copy, and a slot only
    // goes once the autosave holds it.
    expect(names('u1')).toEqual(['Current', 'Old 1']);
  });

  it('changes nothing when what it replaces cannot be kept', () => {
    const slot = keepWork('u1', 'Blue Hour');
    openTemplate('Current');
    edit();

    refuseEveryWrite();
    const outcome = swapInKeptSession(slot.key, 'u1');
    vi.restoreAllMocks();

    expect(outcome).toEqual({ status: 'failed' });
    expect(s().projectName).toBe('Current');
    expect(names('u1')).toEqual(['Blue Hour']);
  });

  it('turns away a slot this build cannot read, keeping nothing for it', () => {
    const key = plantSlot('u1', '2026-10-01T08:00:00.000Z', 'From Later');
    const raw = JSON.parse(localStorage.getItem(key) ?? '{}');
    raw.session.version = 99;
    localStorage.setItem(key, JSON.stringify(raw));
    openTemplate('Current');
    edit();

    expect(swapInKeptSession(key, 'u1')).toEqual({ status: 'failed' });
    expect(s().projectName).toBe('Current');
    expect(names('u1')).toEqual(['From Later']);
  });
});

describe('the kept-work toast', () => {
  const restoreAction = () => {
    const options = vi.mocked(showNotice).mock.lastCall?.[1];
    return options?.action;
  };

  it('offers a Restore, and what Restore replaces gets one of its own', () => {
    const slot = keepWork('u1', 'Blue Hour');
    openTemplate('Something Else');
    edit();
    announceKeptWork(slot, 'u1');
    expect(showNotice).toHaveBeenLastCalledWith('Your previous work was kept', {
      description: 'Blue Hour',
      action: { label: 'Restore', onClick: expect.any(Function) },
    });

    restoreAction()?.onClick();
    expect(s().projectName).toBe('Blue Hour');
    expect(vi.mocked(showNotice).mock.lastCall?.[1]?.description).toBe(
      'Something Else',
    );

    restoreAction()?.onClick();
    expect(s().projectName).toBe('Something Else');
  });

  it('has no Restore in a shared session', () => {
    const slot = keepWork('u1', 'Blue Hour');
    announceKeptWork(slot, 'u1', { restorable: false });
    expect(restoreAction()).toBeUndefined();
  });

  it('can wait for the boot after a reload, once', () => {
    // File ▸ New and leaving a shared session reload the page.
    const slot = keepWork('u1', 'Blue Hour');
    announceKeptWorkAfterReload(slot);
    expect(showNotice).not.toHaveBeenCalled();

    announceKeptWorkFromReload('u1');
    announceKeptWorkFromReload('u1');
    expect(showNotice).toHaveBeenCalledTimes(1);
    expect(vi.mocked(showNotice).mock.lastCall?.[1]?.description).toBe(
      'Blue Hour',
    );
  });

  it('says nothing after a reload when the slot has gone', () => {
    const slot = keepWork('u1', 'Blue Hour');
    announceKeptWorkAfterReload(slot);
    localStorage.removeItem(slot.key);
    announceKeptWorkFromReload('u1');
    expect(showNotice).not.toHaveBeenCalled();
  });

  it('will not restore over a shared session or a recording', () => {
    const slot = keepWork('u1', 'Blue Hour');
    openTemplate('Current');
    useStore.setState({ roomId: 'room-1' });
    restoreKeptWork(slot, 'u1');
    useStore.setState({ roomId: null, isRecording: true });
    restoreKeptWork(slot, 'u1');

    expect(showError).toHaveBeenCalledTimes(2);
    expect(s().projectName).toBe('Current');
    expect(names('u1')).toEqual(['Blue Hour']);
  });
});

describe('an autosave this build cannot read', () => {
  /** A fresh page of this build, finding a newer build's autosave. */
  function newerBuildAutosave(): string {
    openTemplate('From A Newer Build');
    edit();
    writeLocalSession();
    const saved = JSON.parse(localStorage.getItem('musicAtlas:daw:autosave')!);
    const raw = JSON.stringify({ ...saved, version: 99 });
    localStorage.setItem('musicAtlas:daw:autosave', raw);
    forgetLiveSession();
    useStore.setState(useStore.getInitialState(), true);
    return raw;
  }
  const setAside = () =>
    Object.keys(localStorage)
      .filter((k) => k.startsWith('musicAtlas:daw:unreadable:'))
      .map((k) => localStorage.getItem(k));

  it('is set aside before the session that starts writes over it', () => {
    const raw = newerBuildAutosave();

    expect(resumeLocalSession()).toBe('empty');
    writeLocalSession();

    expect(readLocalSession()?.version).not.toBe(99);
    expect(setAside()).toEqual([raw]);
  });

  it('is set aside, not kept, when a link replaces it', () => {
    // A kept slot this build can't restore would offer a Restore that fails.
    const raw = newerBuildAutosave();

    expect(keepOutgoingSession('u1')).toEqual({ status: 'nothing' });
    expect(keptKeys()).toEqual([]);
    expect(setAside()).toEqual([raw]);
  });
});
