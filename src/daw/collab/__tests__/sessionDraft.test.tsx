// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ── Leaving a session never deletes pre-existing work (collab-01) ──────────
// "Leave without saving" used to DELETE whatever projectId was open, so a host
// who started a session from a saved song lost that song. Now the session
// records the draft it minted itself (sessionDraftProjectId, set by
// ensureProjectId) and whether it started from an empty project. The renamed
// "Discard this session's changes" deletes that draft only when the session
// started empty and was never saved; any other session may hold the
// student's own work, so its draft stays and the work is kept on this
// device.
//
// Since milestone 1.4 both choices continue in a new blank project IN PLACE
// (no reload): openSession({kind:'new'}, {source:'leave-collab', keep}),
// which leaves the room before the reset and keeps the outgoing work as a
// device draft when keep is 'auto' (only session work is discarded). Save &
// Leave saves a copy to the student's own projects through saveProject
// first; a session saved only in part is kept by that leave.

const h = vi.hoisted(() => ({
  openSession: vi.fn(),
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));

vi.mock('@/contexts/AuthContext/hooks/useAuthToken', () => ({
  useAuthToken: () => 'tok',
}));
vi.mock('@/daw/session/openSession', () => ({
  openSession: h.openSession,
}));
vi.mock('@/components/utils/toast', () => ({
  showError: h.showError,
  showSuccess: h.showSuccess,
  showWarning: vi.fn(),
}));
// The save's audio pass: nothing in these sessions needs uploading.
vi.mock('@/lib/studio-assets/upload-pending', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('@/lib/studio-assets/upload-pending')
  >()),
  uploadPendingAudioClips: vi.fn(async () => undefined),
  reconcileMissingAssets: vi.fn(async () => ({ unrecoverable: 0 })),
}));

import { registerSaveAuth } from '@/daw/commands/saveProject';
import { forgetLiveSession } from '@/daw/persistence/SessionSerializer';
import { useStore } from '@/daw/store';
import { ensureProjectId, studioProjectsApi } from '@/lib/studio-projects/api';
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

/** A take is recorded: in a room, the first upload mints the cloud project. */
async function recordTake(mintedId: string): Promise<void> {
  vi.spyOn(studioProjectsApi, 'create').mockResolvedValue({
    id: mintedId,
  } as never);
  await ensureProjectId('tok');
}

/** openSession leaves the room, as the switch does, and opens. */
function openSessionLeaves(status: 'ready' | 'refused' = 'ready') {
  h.openSession.mockImplementation(async () => {
    if (status === 'refused') {
      return {
        status: 'refused',
        error: {
          kind: 'storage',
          message: 'kept',
          retryable: false,
          surface: 'toast',
        },
      };
    }
    store()._clearCollab();
    return {
      status: 'ready',
      draftId: 'd-new',
      kept: null,
      forked: false,
      generation: 1,
    };
  });
}

/** The keep policy each openSession call asked for. */
const leaves = () =>
  h.openSession.mock.calls.map(([intent, opts]) => [intent, opts]);

let unregisterAuth: () => void = () => {};

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  useStore.setState(useStore.getInitialState(), true);
  forgetLiveSession();
  h.openSession.mockReset();
  h.showError.mockReset();
  h.showSuccess.mockReset();
  openSessionLeaves();
  unregisterAuth = registerSaveAuth(() => 'tok');
});

afterEach(() => {
  cleanup();
  unregisterAuth();
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

  it('deletes the draft of a session that started empty (a ?collab= joiner), keeping nothing of it', async () => {
    const remove = removeSpy();
    // The collab link opened an empty project, the first sync pulled the
    // room's project in, and a take minted the draft.
    store()._setRoomInfo('room-a', 'editor', 'room-a');
    makeBeat('Room');
    await recordTake('draft-1');

    await discard();

    expect(remove).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledWith('tok', 'draft-1');
    expect(leaves()).toEqual([
      [{ kind: 'new' }, { source: 'leave-collab', keep: 'discard' }],
    ]);
    expect(store().leavePromptPending).toBe(false);
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
    // The work is kept on this device by the open (keep 'auto').
    expect(leaves()).toEqual([
      [{ kind: 'new' }, { source: 'leave-collab', keep: 'auto' }],
    ]);
  });

  it('keeps the saved song a host started the session from', async () => {
    const remove = removeSpy();
    makeBeat('Song');
    store().setProjectId('song-1');
    store()._setRoomInfo('room-a', 'owner');
    await recordTake('unused');

    await discard();

    expect(remove).not.toHaveBeenCalled();
    expect(leaves()).toEqual([
      [{ kind: 'new' }, { source: 'leave-collab', keep: 'auto' }],
    ]);
  });

  it('keeps the draft, and the work, once it was saved this session', async () => {
    const remove = removeSpy();
    store()._setRoomInfo('room-a', 'editor');
    store()._setSessionDraftProjectId('draft-1');
    store()._markSessionSaved();

    await discard();

    expect(remove).not.toHaveBeenCalled();
    expect(leaves()).toEqual([
      [{ kind: 'new' }, { source: 'leave-collab', keep: 'auto' }],
    ]);
  });

  it('deletes nothing when the leave is refused, since the room still plays its takes', async () => {
    const remove = removeSpy();
    openSessionLeaves('refused');
    store()._setRoomInfo('room-a', 'editor', 'room-a');
    makeBeat('Room');
    await recordTake('draft-1');

    await discard();

    expect(leaves()).toEqual([
      [{ kind: 'new' }, { source: 'leave-collab', keep: 'discard' }],
    ]);
    expect(remove).not.toHaveBeenCalled();
    expect(store().roomId).toBe('room-a');
    expect(store().leavePromptPending).toBe(true);
  });

  it('still leaves when the delete fails', async () => {
    vi.spyOn(studioProjectsApi, 'remove').mockRejectedValue(new Error('500'));
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    store()._setRoomInfo('room-a', 'editor');
    store()._setSessionDraftProjectId('draft-1');

    await discard();

    expect(leaves()).toEqual([
      [{ kind: 'new' }, { source: 'leave-collab', keep: 'discard' }],
    ]);
  });

  it('comes back when the work can’t be kept on this device, still in the room', async () => {
    openSessionLeaves('refused');
    makeBeat('Beat');
    store()._setRoomInfo('room-a', 'owner');

    await discard();

    // openSession said why (a toast); the student is still in the room.
    expect(h.openSession).toHaveBeenCalledTimes(1);
    expect(store().roomId).toBe('room-a');
    expect(store().leavePromptPending).toBe(true);
    expect(
      screen.getByRole('button', { name: "Discard this session's changes" }),
    ).not.toBeDisabled();
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
    });
    // The save waits on its queue, the audio pass and the requests: done
    // once the prompt no longer reads Saving… (or has closed).
    await waitFor(
      () =>
        expect(screen.queryByRole('button', { name: 'Saving…' })).toBeNull(),
      { timeout: 5000 },
    );
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

  beforeEach(() => {
    store()._setLeavePrompt(true);
  });

  it('saves a copy of the student’s own, then leaves keeping what the copy can’t hold', async () => {
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
    expect(update).not.toHaveBeenCalledWith(
      'tok',
      'host-song',
      expect.anything(),
    );
    expect(h.showSuccess).toHaveBeenCalledWith('Saved to your projects');
    // In place, keeping what the copy can't hold (keep 'auto').
    expect(leaves()).toEqual([
      [{ kind: 'new' }, { source: 'leave-collab', keep: 'auto' }],
    ]);
  });

  it('stays in the prompt when the save fails, and leaves nothing', async () => {
    vi.spyOn(studioProjectsApi, 'create').mockRejectedValue(new Error('500'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    store()._setRoomInfo('room-a', 'editor', 'room-a');
    makeBeat('Room');
    render(<LeaveSavePrompt />);

    await saveAndLeave();

    expect(h.openSession).not.toHaveBeenCalled();
    expect(h.showSuccess).not.toHaveBeenCalled();
    expect(store().leavePromptPending).toBe(true);
    expect(
      screen.getByRole('button', { name: 'Save & Leave' }),
    ).not.toBeDisabled();
  });

  it('saves over the same copy when pressed again after the leave was refused', async () => {
    const { create, update } = mockCloud();
    openSessionLeaves('refused');
    store()._setRoomInfo('room-a', 'editor', 'room-a');
    makeBeat('Room');
    addChordLane();
    render(<LeaveSavePrompt />);

    await saveAndLeave();

    expect(store().leavePromptPending).toBe(true);
    expect(store().chordRegions).toHaveLength(1);
    expect(
      screen.getByRole('button', { name: 'Save & Leave' }),
    ).not.toBeDisabled();

    await saveAndLeave();

    expect(create).toHaveBeenCalledTimes(1);
    expect(new Set(update.mock.calls.map(([, id]) => id))).toEqual(
      new Set(['copy-1']),
    );
    expect(h.openSession).toHaveBeenCalledTimes(2);
  });
});
