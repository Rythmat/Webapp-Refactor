// @vitest-environment jsdom
/**
 * Every way a draft comes back (the boot's restore, Restore on kept work, a
 * swap, a link whose seed failed) survives a load that throws: nothing is
 * left half open, the student is told where it matters, and the draft is
 * kept aside rather than lost (decision D9). loadSession itself never throws
 * for a draft's sake (the codec reports why instead); these guard against
 * anything else that might throw on the way in, so the load is made to
 * throw here.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  forgetLiveSession,
  loadSession,
  resetSessionToEmpty,
} from '@/daw/persistence/SessionSerializer';
import {
  listQuarantinedDrafts,
  readQuarantinedDraft,
} from '@/daw/persistence/projectDocument/quarantine';
import { markDocumentBaseline } from '@/daw/persistence/saveStatusStore';
import { bumpSessionGeneration } from '@/daw/session/sessionGeneration';
import { useStore } from '@/daw/store';
import { showError, showNotice } from '@/util/toast';
import {
  keepOutgoingSession,
  listKeptSessions,
  readKeptSession,
  replaceSession,
  restoreKeptSession,
  restoreKeptWork,
  resumeLocalSession,
  swapInKeptSession,
  writeLocalSession,
  type KeptSessionInfo,
} from '../localSession';

vi.mock('@/daw/persistence/SessionSerializer', async (importOriginal) => {
  const real =
    await importOriginal<
      typeof import('@/daw/persistence/SessionSerializer')
    >();
  return { ...real, loadSession: vi.fn(real.loadSession) };
});
vi.mock('@/util/toast', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/util/toast')>()),
  showError: vi.fn(),
  showNotice: vi.fn(),
}));

const s = () => useStore.getState();
const AUTOSAVE_KEY = 'musicAtlas:daw:autosave';

/** The next load throws, as a bug on the way in would. */
const nextLoadThrows = () =>
  vi.mocked(loadSession).mockImplementationOnce(() => {
    throw new Error('a bug on the way in');
  });

/** A project with work in it, opened and then edited. */
function work(name: string): void {
  resetSessionToEmpty();
  s().setProjectName(name);
  s().addTrack('midi', 'piano-sampler', 'Keys');
  markDocumentBaseline();
  s().updateTrack(s().tracks[0].id, { volume: 0.3 });
}

/** `name`, edited, kept for u1 as a link keeps it. */
function kept(name: string): KeptSessionInfo {
  work(name);
  const outcome = keepOutgoingSession('u1');
  if (outcome.status !== 'kept') throw new Error(`${name} was not kept`);
  return outcome.slot;
}

const quarantined = (user: string) =>
  listQuarantinedDrafts(user)
    .filter((d) => d.owner !== null)
    .map((d) => readQuarantinedDraft(d.key));

/** A page of this build opened fresh: nothing loaded, the store empty. */
function freshPage(): void {
  forgetLiveSession();
  useStore.setState(useStore.getInitialState(), true);
}

beforeEach(() => {
  localStorage.clear();
  freshPage();
  vi.mocked(showError).mockClear();
  vi.mocked(showNotice).mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('a load that throws', () => {
  it('at boot: the editor starts empty and the autosave is kept aside', () => {
    work('Blue Hour');
    writeLocalSession();
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    forgetLiveSession();
    useStore.setState(useStore.getInitialState(), true);

    nextLoadThrows();
    expect(resumeLocalSession('u1')).toBe('empty');
    expect(quarantined('u1')).toEqual([raw]);
  });

  describe('at boot, and the boot after, once it loads again', () => {
    /** A boot whose load throws: the autosave goes aside, nothing opens. */
    function failedBoot(): string | null {
      work('Blue Hour');
      writeLocalSession();
      const raw = localStorage.getItem(AUTOSAVE_KEY);
      freshPage();
      nextLoadThrows();
      resumeLocalSession('u1');
      // Not offered back in the boot that set it aside.
      expect(listKeptSessions('u1')).toEqual([]);
      expect(showNotice).not.toHaveBeenCalledWith(
        'Your previous work was kept',
        expect.anything(),
      );
      return raw;
    }

    it('does not offer it back while the student stays on that page', () => {
      failedBoot();
      s().addTrack('midi', 'drum-machine', 'Drums');

      // Back to the editor from the dashboard: a plain boot into the live
      // session, whose load would fail the same way again.
      expect(resumeLocalSession('u1')).toBe('live');
      expect(listKeptSessions('u1')).toEqual([]);
      expect(quarantined('u1')).toHaveLength(1);
    });

    it('restores it, and lets go of the copy set aside', () => {
      failedBoot();
      freshPage();

      expect(resumeLocalSession('u1')).toBe('restored');
      expect(s().projectName).toBe('Blue Hour');
      expect(quarantined('u1')).toEqual([]);
      expect(listKeptSessions('u1')).toEqual([]);
    });

    it('offers it back as kept work once the student has moved on', () => {
      const raw = failedBoot();
      // The empty session that boot opened, worked on and autosaved.
      s().addTrack('midi', 'drum-machine', 'Drums');
      writeLocalSession();
      freshPage();

      expect(resumeLocalSession('u1')).toBe('restored');
      expect(s().tracks.map((t) => t.name)).toEqual(['Drums']);
      const [slot] = listKeptSessions('u1');
      expect(slot?.projectName).toBe('Blue Hour');
      expect(quarantined('u1')).toEqual([]);
      expect(JSON.stringify(readKeptSession(slot.key)?.session)).toBe(raw);
      expect(showNotice).toHaveBeenCalledWith(
        'Your previous work was kept',
        expect.objectContaining({ description: 'Blue Hour' }),
      );
    });
  });

  it('on Restore: the live session stays, and the kept work is not lost', () => {
    const slot = kept('Blue Hour');
    const raw = localStorage.getItem(slot.key);
    work('Current');

    nextLoadThrows();
    expect(restoreKeptSession(slot.key)).toBe(false);
    expect(s().projectName).toBe('Current');
    expect(quarantined('u1')).toEqual([raw]);
  });

  it('on a swap from the kept-work toast: it says so, and loses nothing', () => {
    const slot = kept('Blue Hour');
    const raw = localStorage.getItem(slot.key);
    work('Current');

    nextLoadThrows();
    restoreKeptWork(slot, 'u1');

    expect(showError).toHaveBeenCalledWith(
      'Your previous work could not be brought back.',
    );
    // What was live still is, so the copy kept of it on the way is gone
    // again, and the slot that failed is aside.
    expect(s().projectName).toBe('Current');
    expect(listKeptSessions('u1')).toEqual([]);
    expect(quarantined('u1')).toEqual([raw]);
  });

  it('on a swap with five slots: none of them is dropped for the copy of what is live', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-07T09:00:00Z'));
    const slots = [1, 2, 3, 4, 5].map((i) => {
      const slot = kept(`Song ${i}`);
      vi.advanceTimersByTime(60_000);
      return slot;
    });
    work('Current');

    nextLoadThrows();
    restoreKeptWork(slots[2], 'u1');

    expect(s().projectName).toBe('Current');
    // Song 3 is aside; the other four are all still kept.
    expect(listKeptSessions('u1').map((k) => k.projectName)).toEqual([
      'Song 5',
      'Song 4',
      'Song 2',
      'Song 1',
    ]);
    expect(quarantined('u1')).toHaveLength(1);
  });

  it('on a swap that got as far as the caches: the copy of what was live stays', () => {
    const slot = kept('Blue Hour');
    work('Current');

    // A load that starts a new session generation and then fails: the live
    // session's Oracle patches may be gone from the cache, so its kept copy
    // is the one that still holds them.
    vi.mocked(loadSession).mockImplementationOnce(() => {
      bumpSessionGeneration('restore');
      throw new Error('a bug halfway in');
    });
    restoreKeptWork(slot, 'u1');

    expect(s().projectName).toBe('Current');
    expect(listKeptSessions('u1').map((k) => k.projectName)).toEqual([
      'Current',
    ]);
  });

  it('after a failed Restore, the same draft is not offered back on this page', () => {
    // Set aside at one boot, its load failing again at the next.
    work('Blue Hour');
    writeLocalSession();
    freshPage();
    nextLoadThrows();
    resumeLocalSession('u1');
    s().addTrack('midi', 'drum-machine', 'Drums');
    writeLocalSession();
    freshPage();
    resumeLocalSession('u1');
    const [offered] = listKeptSessions('u1');
    expect(offered?.projectName).toBe('Blue Hour');

    nextLoadThrows();
    restoreKeptWork(offered, 'u1');
    expect(showError).toHaveBeenCalledWith(
      'Your previous work could not be brought back.',
    );
    vi.mocked(showNotice).mockClear();

    // Returning to the editor on this page: no second offer, no stray slot.
    for (let visit = 0; visit < 3; visit++) resumeLocalSession('u1');
    expect(showNotice).not.toHaveBeenCalled();
    expect(listKeptSessions('u1')).toEqual([]);
    expect(quarantined('u1')).toHaveLength(1);

    // A fresh page tries again.
    freshPage();
    resumeLocalSession('u1');
    expect(listKeptSessions('u1').map((k) => k.projectName)).toEqual([
      'Blue Hour',
    ]);
  });

  it('on a swap: the outcome is a failure, not a throw', () => {
    const slot = kept('Blue Hour');
    work('Current');

    nextLoadThrows();
    expect(swapInKeptSession(slot.key, 'u1')).toEqual({ status: 'failed' });
  });

  it('when a link’s seed fails: an empty project, and the work it replaced aside', async () => {
    work('Blue Hour');

    const opened = replaceSession('u1', () => {
      s().addTrack('midi', 'drum-machine', 'Drums');
      // Bringing back the kept work throws too.
      nextLoadThrows();
      throw new Error('groove fetch failed');
    });

    await expect(opened).resolves.toMatchObject({
      status: 'failed',
      restored: false,
    });
    expect(s().tracks).toEqual([]);
    expect(quarantined('u1')).toHaveLength(1);
    expect(JSON.parse(quarantined('u1')[0] ?? '{}').projectName).toBe(
      'Blue Hour',
    );
  });
});
