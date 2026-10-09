// @vitest-environment jsdom
/**
 * saveProject (milestone 1.4, spec E12): one path for File ▸ Save, Cmd-S,
 * the chip's Retry, the leave prompt and Save As.
 *
 * It refuses quietly while a session opens, commits a field being typed in,
 * runs one save at a time (repeats coalesce into one 'again' that saves the
 * newest state), tells the student in plain words for every source (Cmd-S
 * included), records the last save for the chip, and tries once more when
 * the browser comes back online.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { showError, showSuccess, showWarning } from '@/components/utils/toast';
import {
  resetSessionToEmpty,
  type CloudProjectInput,
} from '@/daw/persistence/SessionSerializer';
import {
  documentFingerprint,
  isDocumentDirty,
} from '@/daw/persistence/saveStatusStore';
import { bumpSessionGeneration } from '@/daw/session/sessionGeneration';
import {
  INITIAL_SESSION_STATE,
  useSessionStore,
} from '@/daw/session/sessionStore';
import { useStore } from '@/daw/store';
import type { ChordRegion } from '@/daw/store/prismSlice';
import { hashFingerprint } from '@/lib/studio-projects/drafts/fingerprintHash';
import {
  SAVE_REQUEST_TIMEOUT_MS,
  studioProjectsApi,
  type StudioProjectDetail,
  type StudioProjectInput,
} from '@/lib/studio-projects/api';
import { StudioApiError } from '@/lib/studio-projects/studioApiError';
import {
  INITIAL_CLOUD_SAVE_STATE,
  useCloudSaveStore,
  whenSavesSettled,
} from '../cloudSaveStore';
import { registerSaveAuth, saveProject } from '../saveProject';

vi.mock('@/lib/studio-assets/upload-pending', () => ({
  uploadPendingAudioClips: vi.fn(async () => undefined),
  reconcileMissingAssets: vi.fn(async () => ({
    reuploaded: 0,
    unrecoverable: 0,
  })),
}));
vi.mock('@/components/utils/toast', () => ({
  showError: vi.fn(),
  showSuccess: vi.fn(),
  showWarning: vi.fn(),
}));

const s = () => useStore.getState();
const cloudSave = () => useCloudSaveStore.getState();

const cloud = new Map<string, StudioProjectInput>();
let minted = 0;

function stored(id: string, body: StudioProjectInput): StudioProjectDetail {
  const echoed = JSON.parse(JSON.stringify(body)) as CloudProjectInput;
  return {
    ...echoed,
    id,
    createdAt: new Date('2026-10-01T00:00:00Z'),
    updatedAt: new Date('2026-10-08T12:00:00Z'),
    tracks: echoed.tracks.map((track, ordinal) => ({
      ...track,
      id: `row-${ordinal}`,
      ordinal,
    })),
  } as unknown as StudioProjectDetail;
}

const networkDown = () =>
  new StudioApiError({
    status: 0,
    method: 'PUT',
    path: '/api/studio/projects/p1',
    message: 'PUT /api/studio/projects/p1 failed (network): Failed to fetch',
  });

function spyCloud() {
  return {
    create: vi
      .spyOn(studioProjectsApi, 'create')
      .mockImplementation(async (_t, body) => {
        const id = `p${++minted}`;
        cloud.set(id, body);
        return stored(id, body);
      }),
    update: vi
      .spyOn(studioProjectsApi, 'update')
      .mockImplementation(async (_t, id, body) => {
        cloud.set(id, body);
        return stored(id, body);
      }),
    remove: vi
      .spyOn(studioProjectsApi, 'remove')
      .mockImplementation(async (_t, id) => {
        cloud.delete(id);
        return { id, deletedAt: new Date() };
      }),
  };
}

let api: ReturnType<typeof spyCloud>;
let token: string | null = 'tok';
let unregisterAuth: () => void;

function holdNextPut(): () => void {
  let release = () => {};
  const gate = new Promise<void>((resolve) => (release = resolve));
  const usual = api.update.getMockImplementation()!;
  api.update.mockImplementationOnce(async (t, id, body) => {
    await gate;
    return usual(t, id, body);
  });
  return release;
}

function trackProject(name = 'Beat Tape'): void {
  resetSessionToEmpty();
  s().setProjectName(name);
  const keys = s().addTrack('midi', 'piano-sampler', 'Keys');
  s().addMidiClip(keys, {
    id: 'clip-1',
    startTick: 0,
    events: [
      { note: 60, velocity: 90, startTick: 0, durationTicks: 480, channel: 0 },
    ],
  });
}

const REGION: ChordRegion = {
  id: 'region-1',
  startTick: 0,
  endTick: 1920,
  name: 'Dm7',
  noteName: 'D',
  color: [120, 90, 200],
};

/** No message a student reads carries an id or an HTTP code. */
const plain = (message: unknown) => {
  expect(String(message)).not.toMatch(/\b\d{3}\b|\bp\d\b|\/api\//);
};

beforeEach(() => {
  cloud.clear();
  minted = 0;
  token = 'tok';
  useStore.setState(useStore.getInitialState(), true);
  useCloudSaveStore.setState({ ...INITIAL_CLOUD_SAVE_STATE });
  useSessionStore.setState({ ...INITIAL_SESSION_STATE });
  vi.mocked(showError).mockClear();
  vi.mocked(showSuccess).mockClear();
  vi.mocked(showWarning).mockClear();
  api = spyCloud();
  unregisterAuth = registerSaveAuth(() => token);
});

afterEach(async () => {
  await whenSavesSettled(2000);
  unregisterAuth();
  vi.restoreAllMocks();
});

describe('saveProject', () => {
  it('saves, says so, and records the save for the chip', async () => {
    trackProject();
    const result = await saveProject({ source: 'shortcut' });

    expect(result).toEqual({
      status: 'saved',
      projectId: 'p1',
      complete: true,
      audioLeftOut: 0,
      recreated: false,
      asCopy: false,
    });
    expect(showSuccess).toHaveBeenCalledWith('Project saved');
    expect(cloudSave()).toMatchObject({
      phase: 'idle',
      error: null,
      inFlight: 0,
      savedCount: 1,
      lastSaved: {
        projectId: 'p1',
        fingerprint: hashFingerprint(documentFingerprint()),
        complete: true,
        updatedAt: '2026-10-08T12:00:00.000Z',
      },
    });
    expect(isDocumentDirty()).toBe(false);
  });

  it('shows Saving… while it runs', async () => {
    trackProject();
    const saving = saveProject({ source: 'menu' });
    expect(cloudSave()).toMatchObject({
      phase: 'saving',
      source: 'menu',
      inFlight: 1,
    });
    await saving;
    expect(cloudSave().phase).toBe('idle');
  });

  it('coalesces repeats into one more save of the newest state', async () => {
    trackProject();
    await saveProject({ source: 'menu' });
    api.update.mockClear();

    const release = holdNextPut();
    s().setBpm(100);
    const first = saveProject({ source: 'shortcut' });
    await vi.waitFor(() => expect(api.update).toHaveBeenCalledTimes(1));
    s().setBpm(101);
    const second = saveProject({ source: 'shortcut' });
    s().setBpm(102);
    const third = saveProject({ source: 'chip' });
    expect(third).toBe(second);
    release();

    await Promise.all([first, second]);
    expect(api.update.mock.calls.map(([, , body]) => body.bpm)).toEqual([
      100, 102,
    ]);
    expect(cloud.get('p1')?.bpm).toBe(102);
    expect(isDocumentDirty()).toBe(false);
    expect(cloudSave().savedCount).toBe(3);
  });

  it('keeps an edit made during the PUT unsaved; the record is what was sent', async () => {
    trackProject();
    await saveProject({ source: 'menu' });
    s().setBpm(98);
    const sent = hashFingerprint(documentFingerprint());
    const release = holdNextPut();
    const saving = saveProject({ source: 'shortcut' });
    await vi.waitFor(() => expect(api.update).toHaveBeenCalledTimes(1));
    s().setBpm(140);
    release();
    await saving;

    expect(cloudSave().lastSaved?.fingerprint).toBe(sent);
    expect(isDocumentDirty()).toBe(true);
  });

  it('says which parts stay on this device when the cloud holds it in part', async () => {
    trackProject('Night Drive');
    s().setChordRegions([REGION], true);
    s().setMode('dorian');
    const result = await saveProject({ source: 'shortcut' });

    expect(result).toMatchObject({ status: 'saved', complete: false });
    expect(showSuccess).toHaveBeenCalledWith(
      'Project saved — chord symbols and mode stay on this device for now',
    );
    expect(cloudSave().lastSaved?.complete).toBe(false);
  });

  it('words the caveat from what it sent, not from edits made meanwhile', async () => {
    trackProject();
    const release = holdNextPut();
    await saveProject({ source: 'menu' });
    s().setBpm(91);
    const saving = saveProject({ source: 'shortcut' });
    await vi.waitFor(() => expect(api.update).toHaveBeenCalledTimes(1));
    // Chords added while the PUT is out are not in the saved copy's caveat.
    s().setChordRegions([REGION], true);
    release();

    expect(await saving).toMatchObject({ status: 'saved', complete: true });
    expect(showSuccess).toHaveBeenLastCalledWith('Project saved');
  });

  it('says a single group “stays”', async () => {
    trackProject();
    s().setMode('dorian');
    await saveProject({ source: 'menu' });
    expect(showSuccess).toHaveBeenCalledWith(
      'Project saved — mode stays on this device for now',
    );
  });

  it('says a project of another account was saved to the student’s own', async () => {
    trackProject();
    await saveProject({ source: 'menu' });
    api.update.mockRejectedValueOnce(
      new StudioApiError({
        status: 403,
        method: 'PUT',
        path: '/api/studio/projects/p1',
        message: 'forbidden',
      }),
    );
    s().setBpm(96);
    const result = await saveProject({ source: 'shortcut' });
    expect(result).toMatchObject({ status: 'saved', projectId: 'p2' });
    expect(showWarning).toHaveBeenCalledWith(
      'This project was saved to your account as a new project',
    );
  });

  it('fails a save whose request never answers, says so plainly, and the next save runs', async () => {
    trackProject();
    await saveProject({ source: 'menu' });
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
      api.update.mockImplementationOnce(
        (_t, _id, _body, opts) =>
          new Promise((_, reject) => {
            opts?.signal?.addEventListener('abort', () =>
              reject(opts.signal?.reason),
            );
          }),
      );
      s().setBpm(92);
      const hung = saveProject({ source: 'shortcut' });
      await vi.advanceTimersByTimeAsync(SAVE_REQUEST_TIMEOUT_MS + 10);
      const result = await hung;
      expect(result).toMatchObject({
        status: 'failed',
        error: { kind: 'server' },
      });
      expect(cloudSave().phase).toBe('error');
      expect(showError).toHaveBeenLastCalledWith(
        "Couldn't save: the server took too long to answer. Try again.",
      );
    } finally {
      vi.useRealTimers();
    }
    expect(await saveProject({ source: 'chip' })).toMatchObject({
      status: 'saved',
    });
    expect(cloud.get('p1')?.bpm).toBe(92);
    expect(cloudSave().phase).toBe('idle');
  });

  it('leaves the success words to the leave flow', async () => {
    trackProject();
    const result = await saveProject({ source: 'leave', asNewProject: true });
    expect(result).toMatchObject({ status: 'saved', asCopy: true });
    expect(showSuccess).not.toHaveBeenCalled();
  });

  it('a Cmd-S asked while Save As runs saves into the copy', async () => {
    trackProject('Original');
    await saveProject({ source: 'menu' });
    let release = () => {};
    const gate = new Promise<void>((resolve) => (release = resolve));
    const usual = api.create.getMockImplementation()!;
    api.create.mockImplementationOnce(async (t, body) => {
      await gate;
      return usual(t, body);
    });
    const copy = saveProject({ source: 'menu', saveAs: { name: 'Copy' } });
    await vi.waitFor(() => expect(api.create).toHaveBeenCalledTimes(2));
    s().setBpm(133);
    const plain = saveProject({ source: 'shortcut' });
    release();

    expect(await copy).toMatchObject({ status: 'saved', projectId: 'p2' });
    expect(await plain).toMatchObject({ status: 'saved', projectId: 'p2' });
    expect(cloud.get('p2')?.bpm).toBe(133);
    expect(showSuccess).toHaveBeenLastCalledWith('Project saved');
  });

  it('refuses quietly while a session is opening', async () => {
    trackProject();
    useSessionStore.setState({ phase: 'preparing' });
    const result = await saveProject({ source: 'shortcut' });

    expect(result).toMatchObject({
      status: 'failed',
      error: { kind: 'superseded' },
    });
    expect(api.create).not.toHaveBeenCalled();
    expect(showError).not.toHaveBeenCalled();
    expect(cloudSave()).toMatchObject({ phase: 'idle', inFlight: 0 });
  });

  it('says so when signed out', async () => {
    trackProject();
    token = null;
    const result = await saveProject({ source: 'shortcut' });

    expect(result).toMatchObject({
      status: 'failed',
      error: { kind: 'signed-out' },
    });
    expect(showError).toHaveBeenCalledWith("Couldn't save: you're signed out.");
    expect(cloudSave()).toMatchObject({
      phase: 'error',
      error: { kind: 'signed-out' },
    });
    expect(api.create).not.toHaveBeenCalled();
  });

  it('words a server failure plainly, with no ids or codes', async () => {
    trackProject();
    await saveProject({ source: 'menu' });
    api.update
      .mockRejectedValueOnce(
        new StudioApiError({
          status: 500,
          method: 'PUT',
          path: '/api/studio/projects/p1',
          message: 'PUT /api/studio/projects/p1 failed (500): boom',
        }),
      )
      .mockRejectedValueOnce(
        new StudioApiError({
          status: 500,
          method: 'PUT',
          path: '/api/studio/projects/p1',
          message: 'PUT /api/studio/projects/p1 failed (500): boom',
        }),
      );
    s().setBpm(99);
    const result = await saveProject({ source: 'menu' });

    expect(result).toMatchObject({
      status: 'failed',
      error: { kind: 'server' },
    });
    const [message] = vi.mocked(showError).mock.calls[0];
    plain(message);
    expect(cloudSave().phase).toBe('error');
    // The chip's Retry: the next save clears it.
    await saveProject({ source: 'chip' });
    expect(cloudSave()).toMatchObject({ phase: 'idle', error: null });
  });

  it('retries once when the browser comes back online', async () => {
    trackProject();
    await saveProject({ source: 'menu' });
    s().setBpm(97);
    api.update.mockRejectedValueOnce(networkDown());

    const result = await saveProject({ source: 'shortcut' });
    expect(result).toMatchObject({
      status: 'failed',
      error: { kind: 'offline' },
    });
    expect(cloudSave().error?.kind).toBe('offline');
    plain(vi.mocked(showError).mock.calls[0][0]);
    expect(api.update).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new Event('online'));
    await vi.waitFor(() => expect(cloudSave().phase).toBe('idle'));
    await whenSavesSettled(2000);
    expect(api.update).toHaveBeenCalledTimes(2);
    expect(cloud.get('p1')?.bpm).toBe(97);

    // Once only: another 'online' does nothing more.
    window.dispatchEvent(new Event('online'));
    await whenSavesSettled(2000);
    expect(api.update).toHaveBeenCalledTimes(2);
  });

  it('does not retry on online once another project has opened', async () => {
    trackProject();
    await saveProject({ source: 'menu' });
    api.update.mockRejectedValueOnce(networkDown());
    s().setBpm(97);
    await saveProject({ source: 'shortcut' });

    bumpSessionGeneration('open:new');
    window.dispatchEvent(new Event('online'));
    await whenSavesSettled(2000);
    expect(api.update).toHaveBeenCalledTimes(1);
  });

  it('says a project deleted elsewhere was saved as a new one', async () => {
    trackProject();
    await saveProject({ source: 'menu' });
    api.update.mockRejectedValueOnce(
      new StudioApiError({
        status: 404,
        method: 'PUT',
        path: '/api/studio/projects/p1',
        message: 'gone',
      }),
    );
    s().setBpm(96);
    const result = await saveProject({ source: 'menu' });

    expect(result).toMatchObject({
      status: 'saved',
      projectId: 'p2',
      recreated: true,
    });
    expect(showWarning).toHaveBeenCalledWith(
      'The saved copy was deleted, so this was saved as a new project',
    );
  });

  it('Save As takes the new name and link once saved, and says so', async () => {
    trackProject('Original');
    await saveProject({ source: 'menu' });
    const result = await saveProject({
      source: 'menu',
      saveAs: { name: '  Copy Name ' },
    });

    expect(result).toMatchObject({
      status: 'saved',
      projectId: 'p2',
      asCopy: true,
    });
    expect([s().projectName, s().projectId]).toEqual(['Copy Name', 'p2']);
    expect(showSuccess).toHaveBeenLastCalledWith('Saved as “Copy Name”');
    expect(isDocumentDirty()).toBe(false);
  });

  it('a failed Save As leaves the name and the link alone', async () => {
    trackProject('Original');
    await saveProject({ source: 'menu' });
    api.create.mockRejectedValueOnce(
      new StudioApiError({
        status: 500,
        method: 'POST',
        path: '/api/studio/projects',
        message: 'boom',
      }),
    );
    const result = await saveProject({
      source: 'menu',
      saveAs: { name: 'Copy Name' },
    });

    expect(result).toMatchObject({ status: 'failed' });
    expect([s().projectName, s().projectId]).toEqual(['Original', 'p1']);
    expect(api.create).toHaveBeenCalledTimes(2);
  });

  it('commits the field being typed in before it saves', async () => {
    trackProject('Old Name');
    const root = document.createElement('div');
    root.className = 'daw-root';
    const input = document.createElement('input');
    input.value = 'Typed Name';
    // The name field commits on blur, as TransportBar's does.
    input.addEventListener('blur', () => s().setProjectName(input.value));
    root.appendChild(input);
    document.body.appendChild(root);
    input.focus();

    await saveProject({ source: 'shortcut' });
    root.remove();

    expect(cloud.get('p1')?.name).toBe('Typed Name');
  });

  it('lets an open wait for it', async () => {
    trackProject();
    const release = holdNextPut();
    await saveProject({ source: 'menu' });
    s().setBpm(90);
    const saving = saveProject({ source: 'menu' });
    await vi.waitFor(() => expect(api.update).toHaveBeenCalled());
    expect(await whenSavesSettled(20)).toBe(false);
    release();
    await saving;
    expect(await whenSavesSettled(20)).toBe(true);
  });
});
