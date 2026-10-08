// @vitest-environment jsdom
/**
 * Kept work (owner decision 6): a link that replaces the session sets its
 * work aside first, in a timestamped slot per user, and never has to ask.
 *
 * Kept: an edited session, a restored one (the only copy of what it holds),
 * and on a fresh page the autosave, which is then the only copy. Not kept: an
 * empty session, or one whose project is as it opened (a template or demo
 * can be opened again), so browsing them can't push real work out of the
 * newest five slots. What counts is the project document only (decision D7):
 * arming a track, the metronome, the playhead and zoom never make work, and
 * markers, the metre, mastering, Score and Lead Sheet marks and the Prism
 * builder always do.
 *
 * A draft this build can't read (decision D9) is never dropped: an autosave
 * or a kept slot like that is copied word for word to the quarantine, under
 * its user, once; and a draft written before codec v3 is backed up before
 * its first v3 rewrite.
 *
 * Full storage is tested against jsdom's own quota (5M UTF-16 code units,
 * keys and values counted the way browsers count them), filled with another
 * feature's data, and against a storage that refuses every write. Either
 * way, kept work is dropped only to store newer work in its place.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  forgetLiveSession,
  markSessionLoaded,
  resetSessionToEmpty,
  serializeSession,
} from '@/daw/persistence/SessionSerializer';
import {
  MAX_QUARANTINED_PER_USER,
  backupBeforeMigration,
  listMigrationBackups,
  listQuarantinedDrafts,
  quarantineDraft,
  readMigrationBackup,
  readQuarantinedDraft,
} from '@/daw/persistence/projectDocument/quarantine';
import {
  hasWorkToKeep,
  markDocumentBaseline,
} from '@/daw/persistence/saveStatusStore';
import { useStore } from '@/daw/store';
import { showError, showNotice } from '@/util/toast';
import {
  announceKeptWork,
  announceKeptWorkAfterReload,
  announceKeptWorkFromReload,
  clearLocalSession,
  keepOutgoingSession,
  listKeptSessions,
  readKeptSession,
  readLocalSession,
  replaceSession,
  restoreKeptSession,
  restoreKeptWork,
  resumeLocalSession,
  swapInKeptSession,
  writeLocalSession,
  type KeptSession,
  type KeptSessionInfo,
} from '../localSession';

vi.mock('@/util/toast', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/util/toast')>()),
  showError: vi.fn(),
  showNotice: vi.fn(),
}));

const s = () => useStore.getState();
const AUTOSAVE_KEY = 'musicAtlas:daw:autosave';

/** An opened session: the template's tracks, as it arrived. */
function openTemplate(name = 'Lo-Fi Template'): void {
  resetSessionToEmpty();
  s().setProjectName(name);
  s().addTrack('midi', 'piano-sampler', 'Keys');
  // As a link marks what it opened (replaceSession).
  markDocumentBaseline();
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

/** A slot kept for its cloud copy's gaps, as a save then a link keep it. */
function plantSavedInPart(
  user: string,
  keptAt: string,
  projectName: string,
  padding = 0,
): string {
  const key = plantSlot(user, keptAt, projectName, padding);
  const kept = JSON.parse(localStorage.getItem(key)!) as KeptSession;
  kept.cloudCopy = 'partial';
  localStorage.setItem(key, JSON.stringify(kept));
  return key;
}

/** A page of this build opened fresh: nothing loaded, the store empty. */
function freshPage(): void {
  forgetLiveSession();
  useStore.setState(useStore.getInitialState(), true);
}

const keptKeys = () =>
  Object.keys(localStorage).filter((k) => k.startsWith('musicAtlas:daw:kept:'));
const names = (user: string) =>
  listKeptSessions(user).map((k) => k.projectName);
/** The raw text of each of `user`'s quarantined drafts. */
const quarantined = (user: string) =>
  listQuarantinedDrafts(user)
    .filter((d) => d.owner !== null)
    .map((d) => readQuarantinedDraft(d.key));
/** Let go of every pre-migration backup of `user`'s. */
const forgetMigrationBackups = (user: string) => {
  for (const { key } of listMigrationBackups(user)) {
    localStorage.removeItem(key);
  }
};

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

/** A real autosave of the pop template, as milestone 1.2 wrote it (v2). */
const V2_AUTOSAVE = JSON.stringify(
  JSON.parse(
    readFileSync(
      resolve(
        __dirname,
        '../../../daw/persistence/__tests__/fixtures/v2-1.2/template-project-pop.json',
      ),
      'utf8',
    ),
  ),
);

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

  it('a session restored from the autosave: the only copy of what it holds', () => {
    openTemplate();
    edit();
    writeLocalSession();
    freshPage();
    expect(resumeLocalSession('u1')).toBe('restored');

    const outcome = keepOutgoingSession('u1');
    expect(outcome.status).toBe('kept');
    // Not a cloud copy in part: nothing of it is kept anywhere else.
    expect(
      readKeptSession(outcome.status === 'kept' ? outcome.slot.key : ''),
    ).not.toHaveProperty('cloudCopy');
  });

  it('on a fresh page, the autosave: the only copy of the last session', () => {
    openTemplate('Yesterday’s Jam');
    edit();
    writeLocalSession();
    freshPage();

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

  it('on a fresh page, the autosave, whatever the page wrote to the store first', () => {
    // The editor's mount effects can write to the empty store before a
    // link's boot runs; that store is still no session of anyone's.
    openTemplate('Yesterday’s Jam');
    edit();
    writeLocalSession();
    freshPage();
    s().setBpm(97);
    s().setSwing(20);

    const outcome = keepOutgoingSession('u1');
    expect(outcome.status === 'kept' && outcome.slot.projectName).toBe(
      'Yesterday’s Jam',
    );
  });

  it('on a fresh page, the autosave and the tracks added while a link loaded, each in a slot', () => {
    // The editor takes input while a link waits for its fetch: what the
    // student adds then is theirs, and the autosave is still the only copy
    // of the last session.
    openTemplate('Yesterday’s Jam');
    edit();
    writeLocalSession();
    freshPage();
    s().addTrack('midi', 'piano-sampler', 'Doodle');

    const outcome = keepOutgoingSession('u1');

    expect(outcome).toEqual({
      status: 'kept',
      slot: {
        key: 'musicAtlas:daw:kept:u1:2026-10-07T09:00:00.000Z',
        keptAt: '2026-10-07T09:00:00.000Z',
        projectName: 'Yesterday’s Jam',
      },
      also: {
        key: 'musicAtlas:daw:kept:u1:2026-10-07T09:00:00.001Z',
        keptAt: '2026-10-07T09:00:00.001Z',
        projectName: 'Untitled Project',
      },
    });
    const doodle = readKeptSession(
      'musicAtlas:daw:kept:u1:2026-10-07T09:00:00.001Z',
    );
    expect(doodle?.session.data.tracks.map((t) => t.name)).toEqual(['Doodle']);
  });

  it('on a fresh page, keeps neither when one of the two can’t be kept', () => {
    openTemplate('Yesterday’s Jam');
    edit();
    writeLocalSession();
    freshPage();
    s().addTrack('midi', 'piano-sampler', 'Doodle');
    const setItem = Storage.prototype.setItem;
    let slots = 0;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
      this: Storage,
      key: string,
      value: string,
    ) {
      if (key.startsWith('musicAtlas:daw:kept:') && ++slots > 1) {
        throw new DOMException('full', 'QuotaExceededError');
      }
      setItem.call(this, key, value);
    });

    expect(keepOutgoingSession('u1')).toEqual({ status: 'failed' });
    vi.restoreAllMocks();
    expect(keptKeys()).toEqual([]);
    expect(readLocalSession()?.data.projectName).toBe('Yesterday’s Jam');
  });

  it('on a fresh page, nothing from an autosave of an empty project', () => {
    resetSessionToEmpty();
    writeLocalSession();
    freshPage();
    expect(keepOutgoingSession('u1')).toEqual({ status: 'nothing' });
  });

  it('on a fresh page, an autosave with markers and no tracks', () => {
    resetSessionToEmpty();
    s().addMarker(1920, 'Chorus');
    writeLocalSession();
    freshPage();
    expect(keepOutgoingSession('u1').status).toBe('kept');
  });

  it('on a fresh page, an autosave with a progression and no tracks', () => {
    resetSessionToEmpty();
    s().addChord('6 minor');
    writeLocalSession();
    freshPage();
    expect(keepOutgoingSession('u1').status).toBe('kept');
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

describe('what counts as work', () => {
  /** Whether a link would keep the template after `change`. */
  function keptAfter(change: () => void): boolean {
    openTemplate();
    change();
    return keepOutgoingSession('u1').status === 'kept';
  }
  const keysTrack = () => s().tracks[0].id;

  // None of these is the project: the next link opens the template again.
  it.each([
    ['arming a track', () => s().toggleRecordArm(keysTrack())],
    ['monitoring a track', () => s().toggleMonitoring(keysTrack())],
    ['the metronome', () => s().toggleMetronome()],
    ['the playhead', () => s().setPosition(3840)],
    [
      'zoom and scroll',
      () => {
        s().setTimelineZoom(3);
        s().setTimelineScrollLeft(400);
      },
    ],
    [
      'the selected track and the view',
      () => {
        s().setSelectedTrackId(keysTrack());
        s().setCurrentView('score');
      },
    ],
  ])('not %s', (_, change) => {
    expect(keptAfter(change)).toBe(false);
  });

  // The v2 fingerprint couldn't see these, so a link dropped them.
  it.each([
    ['a marker', () => s().addMarker(1920, 'Verse')],
    ['the metre', () => s().setTimeSignature(3, 4)],
    ['the master volume', () => s().setMasterVolume(0.42)],
    ['a mastering effect', () => s().addMasteringFx('compressor')],
    ['a Score slur', () => s().setScoreSlurs(['a|b'])],
    [
      'a lead-sheet section',
      () => s().setLeadSheetSections([{ measureIdx: 0, label: 'A' }]),
    ],
    ['the Prism strum', () => s().setStrumAmount(30)],
    ['a progression in the Prism builder', () => s().addChord('1 major')],
    ['the mode', () => s().setMode('dorian')],
    ['a track’s volume', () => s().updateTrack(keysTrack(), { volume: 0.2 })],
  ])('%s', (_, change) => {
    expect(keptAfter(change)).toBe(true);
  });

  it('not a change put back as it was', () => {
    expect(
      keptAfter(() => {
        s().setBpm(97);
        s().setBpm(120);
      }),
    ).toBe(false);
  });

  it('a markers-only project, with no tracks at all', () => {
    resetSessionToEmpty();
    s().addMarker(960, 'Intro');
    expect(hasWorkToKeep()).toBe(true);
    expect(keepOutgoingSession('u1').status).toBe('kept');
  });

  it('a progression-only project, with no tracks at all', () => {
    resetSessionToEmpty();
    s().addChord('1 major');
    s().addChord('4 major');
    expect(hasWorkToKeep()).toBe(true);
    expect(keepOutgoingSession('u1').status).toBe('kept');
  });

  // A new project (?new=1) opens empty, and can be opened again, so only
  // what the student adds is work: by its document, not by its tracks.
  it.each([
    ['only markers', () => s().addMarker(1920, 'Verse')],
    ['only a progression', () => s().addChord('1 major')],
  ])('a new project with %s', async (_, change) => {
    await replaceSession('u1', () => {}, { reopenable: true });
    expect(keepOutgoingSession('u1')).toEqual({ status: 'nothing' });
    change();

    const next = await replaceSession('u1', () => openTemplate('Next'), {
      reopenable: true,
    });
    expect(next.status === 'opened' && next.kept).toBeTruthy();
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

  it('share the budget with quarantined drafts, which never make room', () => {
    plantSlot('u2', '2026-10-01T08:00:00.000Z', 'Theirs', 300_000);
    // A newer build's draft, set aside: 700K of the budget.
    const unreadable = JSON.stringify({
      version: 9,
      padding: 'x'.repeat(700_000),
    });
    expect(quarantineDraft(unreadable, 'u3').status).toBe('quarantined');
    keepWork('u1', 'Mine');

    expect(names('u2')).toEqual([]);
    expect(names('u1')).toEqual(['Mine']);
    expect(quarantined('u3')).toEqual([unreadable]);
  });

  it('give way to pre-migration backups first, which are never the only copy', () => {
    // Three pieces of work set aside by earlier links, and two drafts this
    // build read in v2 and migrated (their v3 copies live on).
    plantSlot('u1', '2026-10-01T08:00:00.000Z', 'Work A', 90_000);
    plantSlot('u1', '2026-10-02T08:00:00.000Z', 'Work B', 90_000);
    plantSlot('u2', '2026-10-03T08:00:00.000Z', 'Theirs', 90_000);
    const older = `{"version":2,"big":"${'y'.repeat(440_000)}"}`;
    const newer = `{"version":2,"big":"${'z'.repeat(440_000)}"}`;
    expect(
      backupBeforeMigration(older, 'u1', new Date('2026-10-05T08:00:00Z')),
    ).toBe('written');
    expect(
      backupBeforeMigration(newer, 'u1', new Date('2026-10-06T08:00:00Z')),
    ).toBe('written');

    keepWork('u1', 'Work D');

    expect(names('u1')).toEqual(['Work D', 'Work B', 'Work A']);
    expect(names('u2')).toEqual(['Theirs']);
    // The oldest backup went, and it was enough.
    expect(
      listMigrationBackups('u1').map(({ key }) => readQuarantinedDraft(key)),
    ).toEqual([newer]);
  });

  it('give way to copies kept elsewhere too before any kept work', () => {
    plantSlot('u2', '2026-10-01T08:00:00.000Z', 'Theirs', 300_000);
    // The same unreadable draft set aside twice (1.1 did it on every boot):
    // the later copy goes first.
    const unreadable = `{"version":9,"padding":"${'x'.repeat(350_000)}"}`;
    localStorage.setItem(
      'musicAtlas:daw:unreadable:2026-10-02T08:00:00.000Z',
      unreadable,
    );
    localStorage.setItem(
      'musicAtlas:daw:unreadable:2026-10-03T08:00:00.000Z',
      unreadable,
    );

    keepWork('u1', 'Mine');

    expect(names('u2')).toEqual(['Theirs']);
    expect(names('u1')).toEqual(['Mine']);
    expect(
      localStorage.getItem(
        'musicAtlas:daw:unreadable:2026-10-02T08:00:00.000Z',
      ),
    ).toBe(unreadable);
    expect(
      localStorage.getItem(
        'musicAtlas:daw:unreadable:2026-10-03T08:00:00.000Z',
      ),
    ).toBeNull();
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

  describe('kept only for their cloud copy’s gaps', () => {
    it('give way first to the cap of five, then the oldest', () => {
      plantSlot('u1', '2026-10-01T08:00:00.000Z', 'Unsaved 1');
      plantSavedInPart('u1', '2026-10-02T08:00:00.000Z', 'Saved 1');
      plantSlot('u1', '2026-10-03T08:00:00.000Z', 'Unsaved 2');
      plantSavedInPart('u1', '2026-10-04T08:00:00.000Z', 'Saved 2');
      plantSlot('u1', '2026-10-05T08:00:00.000Z', 'Unsaved 3');

      keepWork('u1', 'New 1');
      keepWork('u1', 'New 2');
      expect(names('u1')).toEqual([
        'New 2',
        'New 1',
        'Unsaved 3',
        'Unsaved 2',
        'Unsaved 1',
      ]);
      keepWork('u1', 'New 3');
      expect(names('u1')).toEqual([
        'New 3',
        'New 2',
        'New 1',
        'Unsaved 3',
        'Unsaved 2',
      ]);
    });

    it('give way first to the budget, whoever kept them', () => {
      plantSlot('u2', '2026-10-01T08:00:00.000Z', 'Their Only Copy', 500_000);
      plantSavedInPart(
        'u3',
        '2026-10-02T08:00:00.000Z',
        'Their Cloud Copy',
        500_000,
      );
      keepWork('u1', 'Mine');

      expect(names('u2')).toEqual(['Their Only Copy']);
      expect(names('u3')).toEqual([]);
      expect(names('u1')).toEqual(['Mine']);
    });

    it('make room first when storage is full', () => {
      const unsaved = keepWork('u1', 'Unsaved');
      const saved = plantSavedInPart(
        'u1',
        '2026-10-07T09:01:00.000Z',
        'Saved In Part',
      );
      openTemplate('New');
      edit();
      fillStorageLeaving(Math.floor(slotSize(unsaved.key) / 2));

      expect(keepOutgoingSession('u1').status).toBe('kept');
      expect(localStorage.getItem(saved)).toBeNull();
      expect(readKeptSession(unsaved.key)?.projectName).toBe('Unsaved');
    });
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

  it('a pre-migration backup makes room before any kept work', () => {
    const oldest = keepWork('u1', 'Old 1');
    openTemplate('New');
    edit();
    const backup = `{"version":2,"big":"${'y'.repeat(slotSize(oldest.key))}"}`;
    expect(backupBeforeMigration(backup, 'u2')).toBe('written');
    fillStorageLeaving(Math.floor(slotSize(oldest.key) / 2));

    expect(keepOutgoingSession('u1').status).toBe('kept');
    expect(names('u1')).toEqual(['New', 'Old 1']);
    expect(readMigrationBackup('u2')).toBeNull();
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

  it('kept work this build can’t read never makes room', () => {
    const unreadable = 'musicAtlas:daw:kept:u1:2026-10-01T08:00:00.000Z';
    const raw = `{"keptAt":"x",${'"y":1,'.repeat(9000)}`;
    localStorage.setItem(unreadable, raw);
    openTemplate('New');
    edit();
    fillStorageLeaving(1_000);

    expect(keepOutgoingSession('u1')).toEqual({ status: 'failed' });
    expect(localStorage.getItem(unreadable)).toBe(raw);
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

  it('the autosave takes a pre-migration backup before anyone’s kept work', () => {
    const theirs = plantSlot(
      'u2',
      '2026-10-01T08:00:00.000Z',
      'Theirs',
      50_000,
    );
    const backup = `{"version":2,"big":"${'y'.repeat(60_000)}"}`;
    expect(backupBeforeMigration(backup, 'u2')).toBe('written');
    openTemplate('Live');
    edit(500);
    fillStorageLeaving(1_000);

    expect(writeLocalSession('u1')).toBe(true);
    expect(localStorage.getItem(theirs)).not.toBeNull();
    expect(readMigrationBackup('u2')).toBeNull();
  });

  it('the autosave takes another user’s cloud copy in part before their only copy', () => {
    const theirOnly = plantSlot(
      'u2',
      '2026-10-01T08:00:00.000Z',
      'Their Only Copy',
      50_000,
    );
    const theirSaved = plantSavedInPart(
      'u3',
      '2026-10-02T08:00:00.000Z',
      'Their Cloud Copy',
      50_000,
    );
    openTemplate('Live');
    edit(500);
    fillStorageLeaving(1_000);

    expect(writeLocalSession('u1')).toBe(true);
    expect(localStorage.getItem(theirOnly)).not.toBeNull();
    expect(localStorage.getItem(theirSaved)).toBeNull();
  });

  it('for a project of markers alone too, which is work', () => {
    const theirs = plantSlot(
      'u2',
      '2026-10-01T08:00:00.000Z',
      'Theirs',
      50_000,
    );
    resetSessionToEmpty();
    for (let bar = 0; bar < 40; bar++) s().addMarker(bar * 1920, `Bar ${bar}`);
    fillStorageLeaving(1_000);

    expect(writeLocalSession('u1')).toBe(true);
    expect(localStorage.getItem(theirs)).toBeNull();
    expect(readLocalSession()?.data.markers).toHaveLength(40);
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

  it('nor of kept work this build can’t read', () => {
    const unreadable = 'musicAtlas:daw:kept:u2:2026-10-01T08:00:00.000Z';
    localStorage.setItem(unreadable, `{"keptAt":"x",${'"y":1,'.repeat(9000)}`);
    openTemplate('Live');
    edit(500);
    fillStorageLeaving(1_000);

    expect(writeLocalSession('u1')).toBe(false);
    expect(localStorage.getItem(unreadable)).not.toBeNull();
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
    markDocumentBaseline();
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

  it('the student is told when the autosave no longer fits, once until a write gets through', () => {
    const OUT_OF_ROOM =
      "This device is out of room, so your work isn't being kept here. Save it to your projects.";
    openTemplate('Live');
    edit(500);
    expect(writeLocalSession('u1')).toBe(true);
    edit(500);
    fillStorageLeaving(1_000);

    expect(writeLocalSession('u1')).toBe(false);
    expect(writeLocalSession('u1')).toBe(false);
    expect(vi.mocked(showError).mock.calls).toEqual([[OUT_OF_ROOM]]);

    localStorage.removeItem(OTHER_APP_KEY);
    expect(writeLocalSession('u1')).toBe(true);
    edit(500);
    fillStorageLeaving(1_000);
    expect(writeLocalSession('u1')).toBe(false);
    expect(showError).toHaveBeenCalledTimes(2);
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

  it('leaves the restored session as work to keep', () => {
    // Its slot is gone: the session is the only copy again.
    const slot = keepWork('u1', 'Blue Hour');
    openTemplate('Something Else');
    restoreKeptSession(slot.key);

    expect(keepOutgoingSession('u1').status).toBe('kept');
    expect(names('u1')).toEqual(['Blue Hour']);
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

  it('holds the slots to five once the swap is done', () => {
    const slots = [1, 2, 3, 4, 5].map((i) => keepWork('u1', `Song ${i}`));
    openTemplate('Current');
    edit();
    // The autosave can't take the restored session, so its slot stays too.
    const setItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
      this: Storage,
      key: string,
      value: string,
    ) {
      if (key === AUTOSAVE_KEY) {
        throw new DOMException('full', 'QuotaExceededError');
      }
      setItem.call(this, key, value);
    });

    expect(swapInKeptSession(slots[2].key, 'u1').status).toBe('restored');
    vi.restoreAllMocks();

    expect(s().projectName).toBe('Song 3');
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

  it('turns away a slot this build cannot read, and sets it aside word for word', () => {
    const key = plantSlot('u1', '2026-10-01T08:00:00.000Z', 'From Later');
    const raw = JSON.parse(localStorage.getItem(key) ?? '{}');
    raw.session.version = 99;
    localStorage.setItem(key, JSON.stringify(raw));
    const stored = localStorage.getItem(key);
    openTemplate('Current');
    edit();

    expect(swapInKeptSession(key, 'u1')).toEqual({ status: 'failed' });
    expect(s().projectName).toBe('Current');
    // Nothing was kept for it, and the slot moved to the quarantine.
    expect(names('u1')).toEqual([]);
    expect(quarantined('u1')).toEqual([stored]);
  });

  it('drops no kept work to make room for what is live when the slot can’t be read', () => {
    const old = keepWork('u1', 'Old');
    const key = plantSlot('u1', '2026-10-07T09:05:00.000Z', 'From Later');
    const raw = JSON.parse(localStorage.getItem(key) ?? '{}');
    raw.session.version = 99;
    localStorage.setItem(key, JSON.stringify(raw));
    openTemplate('Current');
    edit();
    fillStorageLeaving(Math.floor(slotSize(old.key) / 2));

    expect(swapInKeptSession(key, 'u1')).toEqual({ status: 'failed' });
    expect(s().projectName).toBe('Current');
    expect(readKeptSession(old.key)?.projectName).toBe('Old');
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

  // A host leaving the editor closes the room for everyone and nothing
  // rejoins it (sharedSession.ts): the project is theirs again, and there is
  // no Leave button to press, so Restore works.
  it('restores once a room the student hosted has closed', () => {
    const slot = keepWork('u1', 'Blue Hour');
    openTemplate('Current');
    useStore.setState({ roomId: 'room-1', collabRole: 'owner' });
    restoreKeptWork(slot, 'u1');

    expect(showError).not.toHaveBeenCalled();
    expect(s().projectName).toBe('Blue Hour');
  });

  it('says so when the work can’t be brought back, and loses nothing', () => {
    const key = plantSlot('u1', '2026-10-01T08:00:00.000Z', 'Damaged');
    localStorage.setItem(key, '{"keptAt": "2026-10-01T08:00:00.000Z", "se');
    openTemplate('Current');

    restoreKeptWork(
      { key, keptAt: '2026-10-01T08:00:00.000Z', projectName: 'Damaged' },
      'u1',
    );

    expect(showError).toHaveBeenCalledWith(
      'Your previous work could not be brought back.',
    );
    expect(s().projectName).toBe('Current');
    expect(quarantined('u1')).toEqual([
      '{"keptAt": "2026-10-01T08:00:00.000Z", "se',
    ]);
  });
});

describe('an autosave this build cannot read', () => {
  /** A fresh page of this build, finding a newer build's autosave. */
  function newerBuildAutosave(name = 'From A Newer Build'): string {
    openTemplate(name);
    edit();
    writeLocalSession();
    const saved = JSON.parse(localStorage.getItem(AUTOSAVE_KEY)!);
    const raw = JSON.stringify({ ...saved, version: 99 });
    localStorage.setItem(AUTOSAVE_KEY, raw);
    freshPage();
    return raw;
  }

  it('is set aside word for word, under the user, before the session that starts writes over it', () => {
    const raw = newerBuildAutosave();

    expect(resumeLocalSession('u1')).toBe('empty');
    s().addTrack('midi', 'piano-sampler', 'New Idea');
    writeLocalSession();

    expect(readLocalSession()?.version).toBe(2);
    expect(quarantined('u1')).toEqual([raw]);
    expect(
      listQuarantinedDrafts('u1')[0].key.startsWith(
        'musicAtlas:daw:unreadable:u1:',
      ),
    ).toBe(true);
  });

  it('is set aside once, however often the page boots before anything writes', () => {
    const raw = newerBuildAutosave();
    for (let boot = 0; boot < 3; boot++) {
      freshPage();
      expect(resumeLocalSession('u1')).toBe('empty');
      vi.advanceTimersByTime(60_000);
    }
    expect(quarantined('u1')).toEqual([raw]);
    // The autosave itself is untouched until the new session writes.
    expect(localStorage.getItem(AUTOSAVE_KEY)).toBe(raw);
  });

  it('is announced once', () => {
    newerBuildAutosave();
    resumeLocalSession('u1');
    freshPage();
    resumeLocalSession('u1');

    expect(showNotice).toHaveBeenCalledTimes(1);
    expect(showNotice).toHaveBeenCalledWith(
      "Your last session couldn't be opened",
      expect.anything(),
    );
  });

  it('is set aside even when it isn’t JSON at all', () => {
    // It used to read as no autosave, and the next write dropped it.
    const raw = '{"version":2,"timestamp":1,"data":{"tracks":[{"id":"t1",';
    localStorage.setItem(AUTOSAVE_KEY, raw);

    expect(resumeLocalSession('u1')).toBe('empty');
    expect(quarantined('u1')).toEqual([raw]);
  });

  // The codec says why it can't load a draft rather than throwing; every
  // reason sets it aside, and none of them reports a restore.
  it.each([
    [
      'no transport',
      (d: Record<string, unknown>) => {
        delete d.transport;
      },
    ],
    [
      'a track without an id',
      (d: Record<string, unknown>) => {
        (d.tracks as Record<string, unknown>[])[0].id = '';
      },
    ],
    [
      'note columns of unequal length',
      (d: Record<string, unknown>) => {
        const [track] = d.tracks as {
          midiClips: { events: { notes: number[] } }[];
        }[];
        track.midiClips[0].events.notes.push(61);
      },
    ],
  ])('is set aside, and the editor starts empty, with %s', (_, damage) => {
    openTemplate('Damaged');
    edit();
    writeLocalSession();
    const draft = JSON.parse(localStorage.getItem(AUTOSAVE_KEY)!);
    damage(draft.data);
    const raw = JSON.stringify(draft);
    localStorage.setItem(AUTOSAVE_KEY, raw);
    freshPage();

    expect(resumeLocalSession('u1')).toBe('empty');
    expect(s().tracks).toEqual([]);
    expect(quarantined('u1')).toEqual([raw]);
  });

  it('is set aside when a later schema says this build may not read it', () => {
    openTemplate('From Much Later');
    edit();
    writeLocalSession();
    const raw = JSON.stringify({
      ...JSON.parse(localStorage.getItem(AUTOSAVE_KEY)!),
      schema: 5,
      compat: 5,
    });
    localStorage.setItem(AUTOSAVE_KEY, raw);
    freshPage();

    expect(resumeLocalSession('u1')).toBe('empty');
    expect(quarantined('u1')).toEqual([raw]);
  });

  it('is set aside, not kept, when a link replaces it', () => {
    // A kept slot this build can't restore would offer a Restore that fails.
    const raw = newerBuildAutosave();

    expect(keepOutgoingSession('u1')).toEqual({ status: 'nothing' });
    expect(keptKeys()).toEqual([]);
    expect(quarantined('u1')).toEqual([raw]);
  });

  it('is set aside when a link replaces it, even when it isn’t JSON', () => {
    const raw = '{"version":2,"data":{"projectName":"Cut Off';
    localStorage.setItem(AUTOSAVE_KEY, raw);

    expect(keepOutgoingSession('u1')).toEqual({ status: 'nothing' });
    expect(quarantined('u1')).toEqual([raw]);
  });

  describe('when the quarantine can’t take it', () => {
    /** u1's quarantine at its cap, with drafts unlike any here. */
    function fillQuarantine(): void {
      for (let i = 0; i < MAX_QUARANTINED_PER_USER; i++) {
        quarantineDraft(`{"version":99,"n":${i}}`, 'u1');
      }
    }

    it('is left as it is, and the student is told', () => {
      const raw = newerBuildAutosave('Only Copy');
      fillQuarantine();

      expect(resumeLocalSession('u1')).toBe('empty');
      expect(showError).toHaveBeenCalledTimes(1);
      s().addTrack('midi', 'piano-sampler', 'Keys');
      expect(writeLocalSession('u1')).toBe(false);
      clearLocalSession(); // File ▸ New
      expect(localStorage.getItem(AUTOSAVE_KEY)).toBe(raw);
    });

    it('is written over only once it is set aside', () => {
      const raw = newerBuildAutosave('Only Copy, Later');
      fillQuarantine();
      resumeLocalSession('u1');
      s().addTrack('midi', 'piano-sampler', 'Keys');

      // The student lets one of the older ones go: room for this one.
      localStorage.removeItem(listQuarantinedDrafts('u1')[0].key);
      expect(writeLocalSession('u1')).toBe(true);
      expect(quarantined('u1')).toContain(raw);
      expect(readLocalSession()?.data.tracks[0].name).toBe('Keys');
    });

    it('refuses the link that would write over it', () => {
      const raw = newerBuildAutosave('Only Copy, Again');
      fillQuarantine();

      expect(keepOutgoingSession('u1')).toEqual({ status: 'failed' });
      expect(localStorage.getItem(AUTOSAVE_KEY)).toBe(raw);
    });
  });
});

describe('a kept slot this build cannot read', () => {
  it('is never trimmed away: it moves to the quarantine', () => {
    const damaged = 'musicAtlas:daw:kept:u1:2026-10-01T08:00:00.000Z';
    const raw = '{"keptAt":"2026-10-01T08:00:00.000Z","session":{"data"';
    localStorage.setItem(damaged, raw);
    for (let i = 1; i <= 5; i++) keepWork('u1', `Song ${i}`);

    expect(localStorage.getItem(damaged)).toBeNull();
    expect(quarantined('u1')).toEqual([raw]);
    expect(names('u1')).toHaveLength(5);
  });

  it('stays where it is when the quarantine can’t take it', () => {
    for (let i = 0; i < MAX_QUARANTINED_PER_USER; i++) {
      quarantineDraft(`{"version":99,"n":${i}}`, 'u1');
    }
    const damaged = 'musicAtlas:daw:kept:u1:2026-10-01T08:00:00.000Z';
    localStorage.setItem(damaged, 'not a session');
    for (let i = 1; i <= 5; i++) keepWork('u1', `Song ${i}`);

    expect(localStorage.getItem(damaged)).toBe('not a session');
  });

  it('moves to the quarantine when Restore can’t bring it back', () => {
    const key = plantSlot('u1', '2026-10-01T08:00:00.000Z', 'Broken');
    const raw = JSON.parse(localStorage.getItem(key) ?? '{}');
    delete raw.session.data.transport;
    localStorage.setItem(key, JSON.stringify(raw));
    openTemplate('Current');

    expect(restoreKeptSession(key)).toBe(false);
    expect(s().projectName).toBe('Current');
    expect(localStorage.getItem(key)).toBeNull();
    expect(quarantined('u1')).toEqual([JSON.stringify(raw)]);
  });
});

describe('a draft from before codec v3', () => {
  it('is restored from the autosave, backed up, then rewritten as v3 at once', () => {
    localStorage.setItem(AUTOSAVE_KEY, V2_AUTOSAVE);
    const setItem = vi.spyOn(Storage.prototype, 'setItem');

    expect(resumeLocalSession('u1')).toBe('restored');
    expect(s().tracks.length).toBeGreaterThan(0);
    expect(readMigrationBackup('u1')).toBe(V2_AUTOSAVE);
    // Not left for the first edit: the autosave holds v3 now, written only
    // once the backup held the v2 draft.
    expect(readLocalSession()?.schema).toBe(3);
    const written = setItem.mock.calls.map(([key]) => key);
    const backup = written.findIndex((key) =>
      key.startsWith('musicAtlas:daw:backup:u1:'),
    );
    expect(backup).toBeGreaterThanOrEqual(0);
    expect(written.indexOf(AUTOSAVE_KEY)).toBeGreaterThan(backup);

    // A later boot reads v3 and backs nothing up again.
    freshPage();
    setItem.mockClear();
    expect(resumeLocalSession('u1')).toBe('restored');
    expect(setItem).not.toHaveBeenCalled();
    expect(readMigrationBackup('u1')).toBe(V2_AUTOSAVE);
  });

  /** Storage that refuses pre-migration backups and takes everything else. */
  const refuseBackups = () => {
    const setItem = Storage.prototype.setItem;
    return vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
      this: Storage,
      key,
      value,
    ) {
      if (key.startsWith('musicAtlas:daw:backup:')) {
        throw new DOMException('full', 'QuotaExceededError');
      }
      setItem.call(this, key, value);
    });
  };

  it('is left as stored, unchanged, while its backup can’t be written', () => {
    // Decision D9: the backup comes before the first write over it. Until
    // the project changes, the stored draft is the session's crash copy too,
    // so nothing is lost by waiting, and nothing is said.
    localStorage.setItem(AUTOSAVE_KEY, V2_AUTOSAVE);
    refuseBackups();

    expect(resumeLocalSession('u1')).toBe('restored');
    expect(readMigrationBackup('u1')).toBeNull();
    expect(localStorage.getItem(AUTOSAVE_KEY)).toBe(V2_AUTOSAVE);
    expect(writeLocalSession('u1')).toBe(false);
    expect(localStorage.getItem(AUTOSAVE_KEY)).toBe(V2_AUTOSAVE);
    expect(showError).not.toHaveBeenCalled();

    // A change to the project is written all the same: a crash copy of new
    // work outweighs the backup.
    s().setBpm(97);
    expect(writeLocalSession('u1')).toBe(true);
    expect(readLocalSession()?.schema).toBe(3);
    expect(readLocalSession()?.data.transport.bpm).toBe(97);
  });

  it('is backed up by the first write over it once there is room', () => {
    localStorage.setItem(AUTOSAVE_KEY, V2_AUTOSAVE);
    const refusing = refuseBackups();
    expect(resumeLocalSession('u1')).toBe('restored');
    refusing.mockRestore();

    expect(writeLocalSession('u1')).toBe(true);
    expect(readMigrationBackup('u1')).toBe(V2_AUTOSAVE);
    expect(readLocalSession()?.schema).toBe(3);
  });

  describe('from a later schema this build can read', () => {
    /**
     * A later Stage A build's draft after a rollback: schema 4, which says a
     * schema 3 reader may load it (compat 3). The autosave holds it.
     */
    function laterDraft(): string {
      openTemplate('From Later');
      edit();
      writeLocalSession();
      const later = JSON.stringify({
        ...JSON.parse(localStorage.getItem(AUTOSAVE_KEY)!),
        schema: 4,
        compat: 3,
        laterField: { kept: true },
      });
      localStorage.setItem(AUTOSAVE_KEY, later);
      freshPage();
      return later;
    }

    it('is restored, backed up as it was, then rewritten', () => {
      const later = laterDraft();

      expect(resumeLocalSession('u1')).toBe('restored');
      expect(s().projectName).toBe('From Later');
      expect(readMigrationBackup('u1')).toBe(later);
      expect(readLocalSession()?.schema).toBe(3);
    });

    it('is kept as it was when a fresh page’s link replaces it: the slot is its copy', () => {
      const later = laterDraft();

      const outcome = keepOutgoingSession('u1');

      expect(outcome.status).toBe('kept');
      const kept =
        outcome.status === 'kept' ? readKeptSession(outcome.slot.key) : null;
      expect(JSON.stringify(kept?.session)).toBe(later);
      // Backed up when it is restored, not before: no room taken twice.
      expect(readMigrationBackup('u1')).toBeNull();
    });

    it('is backed up when Restore brings it back from a kept slot', () => {
      const later = laterDraft();
      localStorage.removeItem(AUTOSAVE_KEY);
      const key = 'musicAtlas:daw:kept:u1:2026-10-01T08:00:00.000Z';
      localStorage.setItem(
        key,
        JSON.stringify({
          keptAt: '2026-10-01T08:00:00.000Z',
          projectName: 'From Later',
          session: JSON.parse(later),
        }),
      );
      openTemplate('Current');

      expect(restoreKeptSession(key)).toBe(true);
      expect(readMigrationBackup('u1')).toBe(later);
      expect(readLocalSession()?.schema).toBe(3);
    });
  });

  it('is work to keep once restored, though nobody touched it since', () => {
    localStorage.setItem(AUTOSAVE_KEY, V2_AUTOSAVE);
    resumeLocalSession('u1');
    expect(keepOutgoingSession('u1').status).toBe('kept');
  });

  it('is kept as it was stored when a fresh page’s link replaces it, and backed up only once restored', () => {
    localStorage.setItem(AUTOSAVE_KEY, V2_AUTOSAVE);

    const outcome = keepOutgoingSession('u1');

    expect(outcome.status).toBe('kept');
    const kept =
      outcome.status === 'kept' ? readKeptSession(outcome.slot.key) : null;
    expect(JSON.stringify(kept?.session)).toBe(V2_AUTOSAVE);
    // The slot holds it as it was: a backup now would take its room twice.
    expect(readMigrationBackup('u1')).toBeNull();
    expect(
      restoreKeptSession(outcome.status === 'kept' ? outcome.slot.key : ''),
    ).toBe(true);
    expect(readMigrationBackup('u1')).toBe(V2_AUTOSAVE);
  });

  it('is backed up when a fresh page’s link finds its work kept already', () => {
    // No slot holds it as stored then, and the next autosave writes over it.
    localStorage.setItem(AUTOSAVE_KEY, V2_AUTOSAVE);
    resumeLocalSession('u1');
    const first = keepOutgoingSession('u1');
    forgetMigrationBackups('u1');
    freshPage();
    localStorage.setItem(AUTOSAVE_KEY, V2_AUTOSAVE);

    const again = keepOutgoingSession('u1');

    expect(again).toEqual(first);
    expect(readMigrationBackup('u1')).toBe(V2_AUTOSAVE);
  });

  it('is rewritten as v3 in the room its set-aside copy leaves, the backup kept', () => {
    const theirs = plantSlot(
      'u2',
      '2026-10-01T08:00:00.000Z',
      'Theirs',
      50_000,
    );
    localStorage.setItem(AUTOSAVE_KEY, V2_AUTOSAVE);
    // A copy set aside on an earlier boot: once the backup holds the draft
    // as it was written, the copy has nothing left to offer.
    expect(quarantineDraft(V2_AUTOSAVE, 'u1').status).toBe('quarantined');
    // Room for the backup, but then not for the v3 draft as well.
    fillStorageLeaving(V2_AUTOSAVE.length + 200);

    expect(resumeLocalSession('u1')).toBe('restored');

    expect(localStorage.getItem(theirs)).not.toBeNull();
    expect(readLocalSession()?.schema).toBe(3);
    expect(readMigrationBackup('u1')).toBe(V2_AUTOSAVE);
    expect(quarantined('u1')).toEqual([]);
    expect(showError).not.toHaveBeenCalled();
  });

  it('takes no slot of anyone’s, nor its own backup, to be rewritten unchanged', () => {
    const theirs = plantSlot(
      'u2',
      '2026-10-01T08:00:00.000Z',
      'Theirs',
      50_000,
    );
    localStorage.setItem(AUTOSAVE_KEY, V2_AUTOSAVE);
    // Room for the backup, but then not for the v3 draft as well.
    fillStorageLeaving(V2_AUTOSAVE.length + 200);

    expect(resumeLocalSession('u1')).toBe('restored');

    // The draft as stored holds the session as it opened: it stays, and so
    // does its backup, the copy D9 asks for.
    expect(localStorage.getItem(AUTOSAVE_KEY)).toBe(V2_AUTOSAVE);
    expect(readMigrationBackup('u1')).toBe(V2_AUTOSAVE);
    expect(writeLocalSession('u1')).toBe(false);
    expect(localStorage.getItem(theirs)).not.toBeNull();
    expect(readMigrationBackup('u1')).toBe(V2_AUTOSAVE);
    expect(showError).not.toHaveBeenCalled();

    // Changed, the session's crash copy outweighs the backup, which goes
    // before anyone's kept work.
    s().setBpm(97);
    expect(writeLocalSession('u1')).toBe(true);
    expect(readLocalSession()?.data.transport.bpm).toBe(97);
    expect(localStorage.getItem(theirs)).not.toBeNull();
    expect(readMigrationBackup('u1')).toBeNull();
  });

  it('is backed up when Restore brings it back from a kept slot', () => {
    // A slot 1.1 or 1.2 kept: the autosave holds it in v3 once restored,
    // and the slot goes.
    const session = JSON.parse(V2_AUTOSAVE);
    const key = 'musicAtlas:daw:kept:u1:2026-10-01T08:00:00.000Z';
    localStorage.setItem(
      key,
      JSON.stringify({
        keptAt: '2026-10-01T08:00:00.000Z',
        projectName: session.data.projectName,
        session,
      }),
    );
    openTemplate('Current');

    expect(restoreKeptSession(key)).toBe(true);
    expect(localStorage.getItem(key)).toBeNull();
    expect(readLocalSession()?.schema).toBe(3);
    expect(readMigrationBackup('u1')).toBe(V2_AUTOSAVE);
  });

  it('is kept once across the change to v3', () => {
    // A fresh page's link keeps the v2 autosave as stored. Restored, the
    // same draft is the v3 live session, and the next link finds that work
    // kept already.
    localStorage.setItem(AUTOSAVE_KEY, V2_AUTOSAVE);
    const first = keepOutgoingSession('u1');
    vi.advanceTimersByTime(60_000);
    expect(resumeLocalSession('u1')).toBe('restored');
    const again = keepOutgoingSession('u1');

    expect(first.status).toBe('kept');
    expect(again).toEqual(first);
    expect(keptKeys()).toHaveLength(1);
  });
});

describe('a v3 draft that needed repairs', () => {
  /** A v3 draft of `name` with a value of the wrong type in it, as stored. */
  function damagedDraft(name: string): string {
    openTemplate(name);
    edit();
    writeLocalSession();
    const draft = JSON.parse(localStorage.getItem(AUTOSAVE_KEY)!);
    expect(draft.schema).toBe(3);
    // Loads as the default tempo: the next write would lose what was there.
    draft.data.transport.bpm = 'fast';
    freshPage();
    return JSON.stringify(draft);
  }

  it('is backed up as it was, then written again at once, when the autosave holds it', () => {
    const raw = damagedDraft('Mended');
    localStorage.setItem(AUTOSAVE_KEY, raw);

    expect(resumeLocalSession('u1')).toBe('restored');
    expect(readMigrationBackup('u1')).toBe(raw);
    expect(readLocalSession()?.data.transport.bpm).toBe(120);
  });

  it('is backed up as it was when Restore brings it back from a kept slot', () => {
    const raw = damagedDraft('Mended Later');
    const key = 'musicAtlas:daw:kept:u1:2026-10-01T08:00:00.000Z';
    localStorage.setItem(
      key,
      JSON.stringify({
        keptAt: '2026-10-01T08:00:00.000Z',
        projectName: 'Mended Later',
        session: JSON.parse(raw),
      }),
    );
    openTemplate('Current');

    expect(restoreKeptSession(key)).toBe(true);
    expect(readMigrationBackup('u1')).toBe(raw);
  });
});

describe('work set aside on an earlier boot', () => {
  /**
   * A draft of `name` with a part played in, as storage held it, while
   * nothing else is stored: what an earlier build set aside unread.
   */
  function setAsideDraft(name: string): string {
    openTemplate(name);
    edit();
    writeLocalSession();
    const raw = localStorage.getItem(AUTOSAVE_KEY)!;
    localStorage.removeItem(AUTOSAVE_KEY);
    freshPage();
    return raw;
  }

  const lastNotice = () => vi.mocked(showNotice).mock.lastCall;

  it('comes back as kept work, as it was stored, with a Restore', () => {
    const raw = setAsideDraft('From A Redeploy');
    expect(quarantineDraft(raw, 'u1').status).toBe('quarantined');

    expect(resumeLocalSession('u1')).toBe('empty');

    expect(names('u1')).toEqual(['From A Redeploy']);
    expect(quarantined('u1')).toEqual([]);
    const [slot] = listKeptSessions('u1');
    expect(JSON.stringify(readKeptSession(slot.key)?.session)).toBe(raw);
    expect(lastNotice()).toEqual([
      'Your previous work was kept',
      {
        description: 'From A Redeploy',
        action: { label: 'Restore', onClick: expect.any(Function) },
      },
    ]);

    lastNotice()?.[1]?.action?.onClick();
    expect(s().projectName).toBe('From A Redeploy');
    expect(s().tracks[0].midiClips).toHaveLength(1);
  });

  it('comes back unmigrated when it was written before codec v3, and Restore backs it up', () => {
    quarantineDraft(V2_AUTOSAVE, 'u1');

    resumeLocalSession('u1');

    const [slot] = listKeptSessions('u1');
    expect(JSON.stringify(readKeptSession(slot.key)?.session)).toBe(
      V2_AUTOSAVE,
    );
    expect(restoreKeptSession(slot.key)).toBe(true);
    expect(readMigrationBackup('u1')).toBe(V2_AUTOSAVE);
    expect(readLocalSession()?.schema).toBe(3);
  });

  it('comes back the same way when it was a kept slot set aside whole', () => {
    const raw = setAsideDraft('Kept, Then Aside');
    const session = JSON.parse(raw);
    const slot = JSON.stringify({
      keptAt: '2026-10-01T08:00:00.000Z',
      projectName: 'Kept, Then Aside',
      session,
    });
    quarantineDraft(slot, 'u1');

    resumeLocalSession('u1');

    const [kept] = listKeptSessions('u1');
    expect(kept.projectName).toBe('Kept, Then Aside');
    expect(readKeptSession(kept.key)?.session).toEqual(session);
    expect(quarantined('u1')).toEqual([]);
  });

  it('is only ever the student’s own: never another’s, nor one set aside without an owner', () => {
    const theirs = setAsideDraft('Theirs');
    const ownerless = setAsideDraft('Nobody’s');
    quarantineDraft(theirs, 'u2');
    // As 1.1 and 1.2 set drafts aside: no owner in the key.
    const legacyKey = 'musicAtlas:daw:unreadable:2026-10-01T08:00:00.000Z';
    localStorage.setItem(legacyKey, ownerless);

    resumeLocalSession('u1');

    expect(listKeptSessions('u1')).toEqual([]);
    expect(showNotice).not.toHaveBeenCalled();
    // Still listed for the student to choose from (milestone 1.4).
    expect(listQuarantinedDrafts('u1').map((d) => d.key)).toEqual([legacyKey]);
    expect(localStorage.getItem(legacyKey)).toBe(ownerless);

    freshPage();
    resumeLocalSession('u2');
    expect(names('u2')).toEqual(['Theirs']);
    expect(localStorage.getItem(legacyKey)).toBe(ownerless);
  });

  it('stays aside, unannounced, while this build can’t read it', () => {
    const raw = JSON.stringify({
      ...JSON.parse(setAsideDraft('From Later')),
      version: 99,
    });
    quarantineDraft(raw, 'u1');
    for (let boot = 0; boot < 2; boot++) {
      freshPage();
      resumeLocalSession('u1');
    }

    expect(listKeptSessions('u1')).toEqual([]);
    expect(quarantined('u1')).toEqual([raw]);
    expect(showNotice).not.toHaveBeenCalled();
  });

  it('stays aside, unannounced, when it holds no work', () => {
    resetSessionToEmpty();
    writeLocalSession();
    const raw = localStorage.getItem(AUTOSAVE_KEY)!;
    localStorage.removeItem(AUTOSAVE_KEY);
    freshPage();
    quarantineDraft(raw, 'u1');

    resumeLocalSession('u1');

    expect(listKeptSessions('u1')).toEqual([]);
    expect(quarantined('u1')).toEqual([raw]);
    expect(showNotice).not.toHaveBeenCalled();
  });

  it('stays aside when storage refuses its slot', () => {
    const raw = setAsideDraft('Nowhere To Go');
    quarantineDraft(raw, 'u1');

    refuseEveryWrite();
    resumeLocalSession('u1');
    vi.restoreAllMocks();

    expect(listKeptSessions('u1')).toEqual([]);
    expect(quarantined('u1')).toEqual([raw]);
  });

  it('is offered on a plain boot into the session this page holds, too', () => {
    const raw = setAsideDraft('Found On Return');
    openTemplate('Live');
    quarantineDraft(raw, 'u1');

    expect(resumeLocalSession('u1')).toBe('live');
    expect(s().projectName).toBe('Live');
    expect(names('u1')).toEqual(['Found On Return']);
  });

  it('is let go of once the autosave it copies is restored, but only the student’s own copy', () => {
    const raw = setAsideDraft('Back Again');
    quarantineDraft(raw, 'u1');
    const legacyKey = 'musicAtlas:daw:unreadable:2026-10-01T08:00:00.000Z';
    localStorage.setItem(legacyKey, raw);
    const theirKey =
      'musicAtlas:daw:unreadable:u2:00000000:2026-10-02T08:00:00.000Z';
    localStorage.setItem(theirKey, raw);
    localStorage.setItem(AUTOSAVE_KEY, raw);

    expect(resumeLocalSession('u1')).toBe('restored');

    // The session holds it, so neither a slot nor a toast offers it again.
    expect(quarantined('u1')).toEqual([]);
    expect(listKeptSessions('u1')).toEqual([]);
    expect(localStorage.getItem(legacyKey)).toBe(raw);
    expect(localStorage.getItem(theirKey)).toBe(raw);
  });

  it('stays when the autosave it copies is restored from before v3 and can’t be backed up', () => {
    // The copy is then the only one of the draft as it was written.
    quarantineDraft(V2_AUTOSAVE, 'u1');
    localStorage.setItem(AUTOSAVE_KEY, V2_AUTOSAVE);
    const setItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
      this: Storage,
      key: string,
      value: string,
    ) {
      if (key.startsWith('musicAtlas:daw:backup:')) {
        throw new DOMException('full', 'QuotaExceededError');
      }
      setItem.call(this, key, value);
    });

    expect(resumeLocalSession('u1')).toBe('restored');
    vi.restoreAllMocks();

    expect(quarantined('u1')).toEqual([V2_AUTOSAVE]);
    expect(localStorage.getItem(AUTOSAVE_KEY)).toBe(V2_AUTOSAVE);
  });

  it('is kept once, however many times milestone 1.1 set it aside', () => {
    // 1.1 set the same unreadable autosave aside on every boot, without an
    // owner; each copy counted against the kept-work budget.
    const raw = '{"version":99,"data":"from a newer build"}';
    const repeats = [
      '2026-10-01T08:00:00.000Z',
      '2026-10-02T08:00:00.000Z',
      '2026-10-03T08:00:00.000Z',
    ].map((iso) => {
      const key = `musicAtlas:daw:unreadable:${iso}`;
      localStorage.setItem(key, raw);
      return key;
    });
    const another = 'musicAtlas:daw:unreadable:2026-10-04T08:00:00.000Z';
    localStorage.setItem(another, '{"version":99,"n":2}');
    // The same text under an owner: each owner's list keeps its own.
    const theirs =
      'musicAtlas:daw:unreadable:u2:00000000:2026-10-05T08:00:00.000Z';
    localStorage.setItem(theirs, raw);
    const mine =
      'musicAtlas:daw:unreadable:u1:00000000:2026-10-06T08:00:00.000Z';
    localStorage.setItem(mine, raw);

    resumeLocalSession('u1');

    expect(listQuarantinedDrafts('u1').map((d) => d.key)).toEqual([
      mine,
      another,
      repeats[0],
    ]);
    expect(localStorage.getItem(theirs)).toBe(raw);
  });

  it('lets go of pre-migration backups past their lifetime at boot', () => {
    backupBeforeMigration(V2_AUTOSAVE, 'u1', new Date('2026-08-01T08:00:00Z'));
    expect(listMigrationBackups('u1')).toHaveLength(1);

    resumeLocalSession('u1');
    expect(listMigrationBackups('u1')).toEqual([]);
  });
});
