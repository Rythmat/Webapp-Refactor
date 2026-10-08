// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ── Leaving a session never deletes pre-existing work (collab-01) ──────────
// "Leave without saving" used to DELETE whatever projectId was open, so a host
// who started a session from a saved song lost that song. Now the session
// records the draft it minted itself (sessionDraftProjectId, set by
// ensureProjectId) and whether it started from an empty project. The renamed
// "Discard this session's changes" deletes that draft only when the session
// started empty; a session that started with work keeps the draft and sets
// the work aside in a kept slot before the reset clears the autosave.
//
// Save & Leave saves a copy to the student's own projects. Today's cloud
// copy can't hold a chord lane, markers and the rest only milestone 1.5's
// document carries (D7), and the reset after the save clears the autosave,
// so a session saved only in part goes to a kept slot first.

const h = vi.hoisted(() => ({
  leaveRoom: vi.fn(),
  resetToNewProject: vi.fn(),
  showError: vi.fn(),
}));

vi.mock('@/contexts/AuthContext/hooks/useAuthContext', () => ({
  useAuthContext: () => ({ token: 'tok', userId: 'u1' }),
}));
vi.mock('@/daw/collab/CollabProvider', () => ({
  useCollab: () => ({ leaveRoom: h.leaveRoom }),
}));
vi.mock('@/lib/studio-projects/newProject', () => ({
  resetToNewProject: h.resetToNewProject,
}));
vi.mock('@/components/utils/toast', () => ({
  showError: h.showError,
  showSuccess: vi.fn(),
  showWarning: vi.fn(),
}));
// The save's audio pass: nothing in these sessions needs uploading.
vi.mock('@/lib/studio-assets/upload-pending', () => ({
  uploadPendingAudioClips: vi.fn(async () => undefined),
  reconcileMissingAssets: vi.fn(async () => ({ unrecoverable: 0 })),
}));

import { forgetLiveSession } from '@/daw/persistence/SessionSerializer';
import { useStore } from '@/daw/store';
import { ensureProjectId, studioProjectsApi } from '@/lib/studio-projects/api';
import {
  listKeptSessions,
  readKeptSession,
} from '@/lib/studio-projects/localSession';
import { LeaveSavePrompt } from '../ui/LeaveSavePrompt';

const store = () => useStore.getState();

/** Work the student made: a track with a part played into it. */
function makeBeat(name = 'Beat'): void {
  store().addTrack('midi', 'piano-sampler', name);
  const trackId = store().tracks[store().tracks.length - 1].id;
  store().addMidiClip(trackId, {
    id: `clip-${name}`,
    startTick: 0,
    events: [
      { note: 36, velocity: 100, startTick: 0, durationTicks: 240, channel: 0 },
    ],
  });
}

/** A take is recorded: the first upload mints the cloud project if needed. */
async function recordTake(mintedId: string): Promise<void> {
  vi.spyOn(studioProjectsApi, 'create').mockResolvedValue({
    id: mintedId,
  } as never);
  await ensureProjectId('tok');
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  useStore.setState(useStore.getInitialState(), true);
  forgetLiveSession();
  h.leaveRoom.mockReset();
  h.resetToNewProject.mockReset();
  h.showError.mockReset();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('collabSlice session bookkeeping', () => {
  it('a session that starts from an empty project holds only session work', () => {
    store()._setRoomInfo('room-a', 'owner', 'room-a');

    expect(store().sessionStartedEmpty).toBe(true);
    expect(store().sessionDraftProjectId).toBeNull();
    expect(store().sessionSaved).toBe(false);
  });

  it('a session that starts with work may hold the student’s own, saved or not', () => {
    makeBeat();
    store()._setRoomInfo('room-a', 'owner', 'room-a');

    expect(store().sessionStartedEmpty).toBe(false);
  });

  it('rejoining the same room (SPA return, await-host retry) keeps the session state', () => {
    store()._setRoomInfo('room-a', 'editor');
    store()._setSessionDraftProjectId('draft-1');
    store()._markSessionSaved();
    // The room's project arrived with the first sync.
    makeBeat('Room');

    store()._setRoomInfo('room-a', 'editor');
    expect(store().sessionStartedEmpty).toBe(true);
    expect(store().sessionDraftProjectId).toBe('draft-1');
    expect(store().sessionSaved).toBe(true);

    // A different room is a new session, and what is open now predates it.
    store()._setRoomInfo('room-b', 'editor');
    expect(store().sessionStartedEmpty).toBe(false);
    expect(store().sessionDraftProjectId).toBeNull();
    expect(store().sessionSaved).toBe(false);
  });

  it('_clearCollab forgets the session', () => {
    store()._setRoomInfo('room-a', 'owner');
    store()._setSessionDraftProjectId('draft-1');
    store()._clearCollab();

    expect(store().sessionStartedEmpty).toBe(false);
    expect(store().sessionDraftProjectId).toBeNull();
  });
});

describe('ensureProjectId', () => {
  it('records a draft it mints during a session', async () => {
    store()._setRoomInfo('room-a', 'editor');

    await recordTake('draft-1');
    expect(store().projectId).toBe('draft-1');
    expect(store().sessionDraftProjectId).toBe('draft-1');
  });

  it('records nothing when a project is already open', async () => {
    const create = vi.spyOn(studioProjectsApi, 'create');
    store().setProjectId('song-1');
    store()._setRoomInfo('room-a', 'owner');

    await expect(ensureProjectId('tok')).resolves.toBe('song-1');
    expect(create).not.toHaveBeenCalled();
    expect(store().sessionDraftProjectId).toBeNull();
  });

  it('records nothing for a draft minted outside a session', async () => {
    await recordTake('solo-1');
    expect(store().sessionDraftProjectId).toBeNull();
  });

  it('records nothing if the session ended while the draft was minting', async () => {
    let finish: (v: { id: string }) => void = () => {};
    vi.spyOn(studioProjectsApi, 'create').mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }) as never,
    );
    store()._setRoomInfo('room-a', 'editor');

    const minted = ensureProjectId('tok');
    store()._clearCollab();
    finish({ id: 'draft-1' });

    await expect(minted).resolves.toBe('draft-1');
    expect(store().sessionDraftProjectId).toBeNull();
  });
});

describe("LeaveSavePrompt — Discard this session's changes", () => {
  const discard = async () => {
    render(<LeaveSavePrompt />);
    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: "Discard this session's changes" }),
      );
    });
  };
  const removeSpy = () =>
    vi
      .spyOn(studioProjectsApi, 'remove')
      .mockResolvedValue({ id: 'x', deletedAt: new Date() });

  beforeEach(() => {
    store()._setLeavePrompt(true);
  });

  it('deletes the draft of a session that started empty (a ?collab= joiner)', async () => {
    const remove = removeSpy();
    // The collab link opened an empty project, the first sync pulled the
    // room's project in, and a take minted the draft.
    store()._setRoomInfo('room-a', 'editor', 'room-a');
    makeBeat('Room');
    await recordTake('draft-1');

    await discard();

    expect(remove).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledWith('tok', 'draft-1');
    expect(listKeptSessions('u1')).toEqual([]);
    expect(h.leaveRoom).toHaveBeenCalledTimes(1);
    expect(h.resetToNewProject).toHaveBeenCalledTimes(1);
  });

  it('never deletes a host’s draft that holds their unsaved work from before the session, and keeps that work', async () => {
    const remove = removeSpy();
    // A beat the host never saved, then Create Session from the toolbar, then
    // a take: the draft minted for it carries the beat as well.
    makeBeat('Beat');
    store()._setRoomInfo('room-a', 'owner', 'room-a');
    await recordTake('draft-1');
    expect(store().sessionDraftProjectId).toBe('draft-1');

    await discard();

    expect(remove).not.toHaveBeenCalled();
    // The reset clears the autosave, so the work went to a kept slot first.
    const kept = listKeptSessions('u1');
    expect(kept).toHaveLength(1);
    const session = readKeptSession(kept[0].key)?.session;
    expect(session?.data.tracks.map((t) => t.name)).toEqual(['Beat']);
    expect(h.leaveRoom).toHaveBeenCalledTimes(1);
    expect(h.resetToNewProject).toHaveBeenCalledTimes(1);
  });

  it('keeps the saved song a host started the session from', async () => {
    const remove = removeSpy();
    makeBeat('Song');
    store().setProjectId('song-1');
    store()._setRoomInfo('room-a', 'owner');
    await recordTake('unused');

    await discard();

    expect(remove).not.toHaveBeenCalled();
    expect(h.leaveRoom).toHaveBeenCalledTimes(1);
    expect(h.resetToNewProject).toHaveBeenCalledTimes(1);
  });

  it('keeps the draft once it was saved this session', async () => {
    const remove = removeSpy();
    store()._setRoomInfo('room-a', 'editor');
    store()._setSessionDraftProjectId('draft-1');
    store()._markSessionSaved();

    await discard();

    expect(remove).not.toHaveBeenCalled();
  });

  it('still leaves when the delete fails', async () => {
    vi.spyOn(studioProjectsApi, 'remove').mockRejectedValue(new Error('500'));
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    store()._setRoomInfo('room-a', 'editor');
    store()._setSessionDraftProjectId('draft-1');

    await discard();

    expect(h.leaveRoom).toHaveBeenCalledTimes(1);
    expect(h.resetToNewProject).toHaveBeenCalledTimes(1);
  });

  it('stays in the prompt when the work can’t be set aside on this device', async () => {
    makeBeat('Beat');
    store()._setRoomInfo('room-a', 'owner');
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });

    await discard();

    expect(h.showError).toHaveBeenCalledWith(
      expect.stringMatching(/couldn't be set aside/),
    );
    expect(h.leaveRoom).not.toHaveBeenCalled();
    expect(h.resetToNewProject).not.toHaveBeenCalled();
    expect(store().leavePromptPending).toBe(true);
  });
});

describe('LeaveSavePrompt — Save & Leave', () => {
  /** The cloud as the legacy API keeps it: each save mints or updates. */
  const mockCloud = () => {
    let minted = 0;
    return {
      create: vi
        .spyOn(studioProjectsApi, 'create')
        .mockImplementation(async () => ({ id: `copy-${++minted}` }) as never),
      update: vi
        .spyOn(studioProjectsApi, 'update')
        .mockImplementation(async (_token, id) => ({ id }) as never),
    };
  };
  const saveAndLeave = async () => {
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save & Leave' }));
      // The save waits on its queue, the audio pass and the requests.
      for (let i = 0; i < 10; i++) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    });
  };
  /** A chord lane: today's cloud payload has no place for one. */
  const addChordLane = () =>
    store().setChordRegions([
      {
        id: 'r1',
        startTick: 0,
        endTick: 1920,
        name: 'C',
        noteName: 'C',
        color: [1, 2, 3],
      },
    ]);
  const keptNotice = () =>
    JSON.parse(sessionStorage.getItem('musicAtlas:daw:keptNotice') ?? 'null');

  beforeEach(() => {
    store()._setLeavePrompt(true);
  });

  it('keeps what the cloud copy can’t hold yet, then leaves', async () => {
    const { create, update } = mockCloud();
    // A guest in the host's project, which has a chord lane.
    store()._setRoomInfo('room-a', 'editor', 'room-a');
    makeBeat('Room');
    addChordLane();
    store().setProjectId('host-song');
    render(<LeaveSavePrompt />);

    await saveAndLeave();

    // A copy of the student's own; the host's project is never written.
    expect(create).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith('tok', 'copy-1', expect.anything());
    expect(update).not.toHaveBeenCalledWith(
      'tok',
      'host-song',
      expect.anything(),
    );
    // The reset clears the autosave, so the session went to a kept slot,
    // marked as one whose cloud copy holds the rest, and is announced with a
    // Restore once the editor boots again.
    const kept = listKeptSessions('u1');
    expect(kept).toHaveLength(1);
    const slot = readKeptSession(kept[0].key);
    expect(slot?.cloudCopy).toBe('partial');
    expect(slot?.session.data.chordRegions?.map((r) => r.name)).toEqual(['C']);
    expect(keptNotice()?.key).toBe(kept[0].key);
    expect(h.leaveRoom).toHaveBeenCalledTimes(1);
    expect(h.resetToNewProject).toHaveBeenCalledTimes(1);
  });

  it('keeps nothing when the cloud copy holds the whole session', async () => {
    mockCloud();
    store()._setRoomInfo('room-a', 'editor', 'room-a');
    makeBeat('Room');
    render(<LeaveSavePrompt />);

    await saveAndLeave();

    expect(listKeptSessions('u1')).toEqual([]);
    expect(keptNotice()).toBeNull();
    expect(h.leaveRoom).toHaveBeenCalledTimes(1);
    expect(h.resetToNewProject).toHaveBeenCalledTimes(1);
  });

  it('stays in the prompt when what the copy lacks can’t be set aside, and saves over the same copy when pressed again', async () => {
    const { create, update } = mockCloud();
    store()._setRoomInfo('room-a', 'editor', 'room-a');
    makeBeat('Room');
    addChordLane();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    render(<LeaveSavePrompt />);

    await saveAndLeave();

    expect(h.showError).toHaveBeenCalledWith(
      expect.stringMatching(/couldn't be set aside/),
    );
    expect(h.leaveRoom).not.toHaveBeenCalled();
    expect(h.resetToNewProject).not.toHaveBeenCalled();
    expect(store().leavePromptPending).toBe(true);
    expect(store().chordRegions).toHaveLength(1);
    expect(
      screen.getByRole('button', { name: 'Save & Leave' }),
    ).not.toBeDisabled();

    await saveAndLeave();

    expect(create).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledTimes(2);
    expect(update.mock.calls.map(([, id]) => id)).toEqual(['copy-1', 'copy-1']);
    expect(h.resetToNewProject).not.toHaveBeenCalled();
  });
});
