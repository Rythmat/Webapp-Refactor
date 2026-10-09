// @vitest-environment jsdom
/**
 * The fenced cloud save (milestone 1.4): saveCurrentProjectToCloud(token,
 * {fence, mode, nameOverride}), saveProject's path.
 *
 * A save belongs to the session it was asked in. Once another project has
 * opened, nothing more of the save touches the store (no link stamped, no
 * PUT of what is open now, no baseline, no saved event), and what the cloud
 * holds of the outgoing session goes to its draft (patchCloud). A first
 * save's POST carries the project, so no PUT follows unless uploads changed
 * it. A project deleted elsewhere is made again under its name; a 5xx PUT
 * is retried once, a POST never. Save As makes a project of its own and
 * moves the session's link and name only once it exists.
 *
 * The API is mocked as the legacy server keeps a project: the last payload
 * written under each id, echoed back with row ids.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCloudSaveStore } from '@/daw/commands/cloudSaveStore';
import {
  resetSessionToEmpty,
  type CloudProjectInput,
} from '@/daw/persistence/SessionSerializer';
import {
  documentFingerprint,
  isDocumentDirty,
  useSaveStatusStore,
} from '@/daw/persistence/saveStatusStore';
import { registerSessionDeps } from '@/daw/session/sessionDeps';
import {
  bumpSessionGeneration,
  getSessionGeneration,
} from '@/daw/session/sessionGeneration';
import type { DraftSessionPort } from '@/daw/session/types';
import { useStore } from '@/daw/store';
import type { ChordRegion } from '@/daw/store/prismSlice';
import {
  reconcileMissingAssets,
  uploadPendingAudioClips,
} from '@/lib/studio-assets/upload-pending';
import {
  ensureProjectId,
  SAVE_REQUEST_TIMEOUT_MS,
  saveCurrentProjectToCloud,
  studioProjectsApi,
  type FencedSaveOutcome,
  type SaveMode,
  type StudioProjectDetail,
  type StudioProjectInput,
} from '../api';
import { hashFingerprint } from '../drafts/fingerprintHash';
import { StudioApiError } from '../studioApiError';

vi.mock('@/lib/studio-assets/upload-pending', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('@/lib/studio-assets/upload-pending')
  >()),
  uploadPendingAudioClips: vi.fn(async () => undefined),
  reconcileMissingAssets: vi.fn(async () => ({
    reuploaded: 0,
    unrecoverable: 0,
    reuploadFailed: 0,
  })),
}));
vi.mock('@/components/utils/toast', () => ({
  showError: vi.fn(),
  showSuccess: vi.fn(),
  showWarning: vi.fn(),
}));

const s = () => useStore.getState();

/** The mocked cloud: the last payload written under each project id. */
const cloud = new Map<string, StudioProjectInput>();
let minted = 0;

/** What the server answers for a write: the body back, with row ids. */
function stored(id: string, body: StudioProjectInput): StudioProjectDetail {
  const echoed = JSON.parse(JSON.stringify(body)) as CloudProjectInput;
  return {
    ...echoed,
    id,
    createdAt: new Date('2026-10-01T00:00:00Z'),
    updatedAt: new Date(`2026-10-08T10:00:0${minted % 10}Z`),
    tracks: echoed.tracks.map((track, ordinal) => ({
      ...track,
      id: `row-${ordinal}`,
      ordinal,
      audioClips: track.audioClips.map((clip, i) => ({
        ...clip,
        id: `a-${i}`,
      })),
    })),
  } as unknown as StudioProjectDetail;
}

function mockCloud() {
  const create = vi
    .spyOn(studioProjectsApi, 'create')
    .mockImplementation(async (_token, body) => {
      const id = `p${++minted}`;
      cloud.set(id, body);
      return stored(id, body);
    });
  const update = vi
    .spyOn(studioProjectsApi, 'update')
    .mockImplementation(async (_token, id, body) => {
      if (!cloud.has(id)) {
        throw new StudioApiError({
          status: 404,
          method: 'PUT',
          path: `/api/studio/projects/${id}`,
          message: `PUT failed (404): Studio project ${id} not found`,
        });
      }
      cloud.set(id, body);
      return stored(id, body);
    });
  // A GET answers 404 for a project the cloud no longer holds.
  const get = vi
    .spyOn(studioProjectsApi, 'get')
    .mockImplementation(async (_token, id) => {
      const body = cloud.get(id);
      if (!body) {
        throw new StudioApiError({
          status: 404,
          method: 'GET',
          path: `/api/studio/projects/${id}`,
          message: `GET failed (404)`,
        });
      }
      return stored(id, body);
    });
  // A removed project leaves the cloud (no window event in tests).
  const remove = vi
    .spyOn(studioProjectsApi, 'remove')
    .mockImplementation(async (_token, id) => {
      cloud.delete(id);
      return { id, deletedAt: new Date() };
    });
  return { create, update, get, remove };
}

let api: ReturnType<typeof mockCloud>;
let patchCloud: ReturnType<typeof vi.fn<DraftSessionPort['patchCloud']>>;
let unregister: () => void;

const apiError = (status: number, method = 'PUT') =>
  new StudioApiError({ status, method, path: '/x', message: `${status}` });

/** Hold the next POST until the returned release runs. */
function holdCreate(): () => void {
  let release = () => {};
  const gate = new Promise<void>((resolve) => (release = resolve));
  const usual = api.create.getMockImplementation()!;
  api.create.mockImplementationOnce(async (token, body) => {
    await gate;
    return usual(token, body);
  });
  return release;
}

/** Hold the next PUT until the returned release runs. */
function holdUpdate(): () => void {
  let release = () => {};
  const gate = new Promise<void>((resolve) => (release = resolve));
  const usual = api.update.getMockImplementation()!;
  api.update.mockImplementationOnce(async (token, id, body) => {
    await gate;
    return usual(token, id, body);
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

const fence = () => ({
  generation: getSessionGeneration(),
  draftId: 'draft-A',
});

const save = (mode: SaveMode = 'save', nameOverride?: string) =>
  saveCurrentProjectToCloud('tok', { fence: fence(), mode, nameOverride });

const saved = (outcome: FencedSaveOutcome) => {
  if (outcome.status !== 'saved') throw new Error('expected a save');
  return outcome;
};

beforeEach(() => {
  cloud.clear();
  minted = 0;
  useStore.setState(useStore.getInitialState(), true);
  vi.mocked(uploadPendingAudioClips).mockClear();
  vi.mocked(reconcileMissingAssets).mockClear();
  api = mockCloud();
  patchCloud = vi.fn<DraftSessionPort['patchCloud']>(async () => undefined);
  unregister = registerSessionDeps({
    user: () => null,
    token: () => 'tok',
    lessonAccess: () => 'open',
    collab: {} as never,
    drafts: {
      activeDraftId: () => 'draft-A',
      patchCloud,
    } as unknown as DraftSessionPort,
    navigate: () => {},
    openProjectsDialog: () => {},
  });
});

afterEach(() => {
  unregister();
  vi.restoreAllMocks();
});

describe('a first save', () => {
  it('POSTs the project and sends no PUT: the POST carried it', async () => {
    trackProject();
    const events: unknown[] = [];
    const listen = (e: Event) => events.push((e as CustomEvent).detail);
    window.addEventListener('ma-studio-project-saved', listen);

    const done = saved(await save());
    window.removeEventListener('ma-studio-project-saved', listen);

    expect(api.create).toHaveBeenCalledTimes(1);
    expect(api.update).not.toHaveBeenCalled();
    expect(s().projectId).toBe('p1');
    expect(done).toMatchObject({ projectId: 'p1', complete: true });
    expect(done.updatedAt).toMatch(/^2026-10-08T10:00:0\d\.000Z$/);
    expect(isDocumentDirty()).toBe(false);
    expect(events).toEqual([
      { projectId: 'p1', generation: getSessionGeneration() },
    ]);
  });

  it('PUTs after uploads stamped assets the POST could not carry', async () => {
    trackProject();
    const vox = s().addTrack('audio', 'vocal-fx', 'Vox');
    s().addAudioClip(vox, {
      id: 'take',
      startTick: 0,
      duration: 960,
      fadeInTicks: 0,
      fadeOutTicks: 0,
      assetId: null,
    });
    vi.mocked(uploadPendingAudioClips).mockImplementationOnce(async () => {
      s().updateAudioClip(vox, 'take', { assetId: 'asset-1' });
    });

    const done = saved(await save());

    expect(api.update).toHaveBeenCalledTimes(1);
    expect(cloud.get('p1')?.tracks[1].audioClips[0].assetId).toBe('asset-1');
    expect(done.complete).toBe(true);
  });

  it('whose POST comes back after another project opened links nothing, PUTs nothing, and tells the draft', async () => {
    trackProject('Draft A');
    const release = holdCreate();
    const saving = save();
    await vi.waitFor(() => expect(api.create).toHaveBeenCalledTimes(1));
    const sentFingerprint = hashFingerprint(documentFingerprint());

    // Another project opens while the POST is out.
    bumpSessionGeneration('open:template');
    resetSessionToEmpty();
    release();

    const outcome = await saving;
    expect(outcome).toEqual({
      status: 'superseded',
      projectId: 'p1',
      routed: true,
    });
    expect(s().projectId).toBeNull();
    expect(api.update).not.toHaveBeenCalled();
    expect(patchCloud).toHaveBeenCalledWith('draft-A', {
      projectId: 'p1',
      cloud: expect.objectContaining({
        projectId: 'p1',
        savedFingerprint: sentFingerprint,
        savedComplete: true,
      }),
    });
  });
});

describe('a save of a linked project', () => {
  beforeEach(async () => {
    trackProject();
    await save();
    api.create.mockClear();
  });

  it('PUTs the newest state, and baselines it', async () => {
    s().setBpm(98);
    const done = saved(await save());
    expect(api.update).toHaveBeenCalledTimes(1);
    expect(cloud.get('p1')?.bpm).toBe(98);
    expect(done.snapshot.fingerprint).toBe(
      hashFingerprint(documentFingerprint()),
    );
    expect(isDocumentDirty()).toBe(false);
  });

  it('keeps an edit made during the PUT unsaved, and records what was sent', async () => {
    s().setBpm(98);
    const sent = hashFingerprint(documentFingerprint());
    const release = holdUpdate();
    const saving = save();
    await vi.waitFor(() => expect(api.update).toHaveBeenCalledTimes(1));

    s().setBpm(140);
    release();
    const done = saved(await saving);

    expect(done.snapshot.fingerprint).toBe(sent);
    expect(cloud.get('p1')?.bpm).toBe(98);
    // The baseline is the snapshot the PUT sent (1.3's documentSnapshot),
    // so the edit made meanwhile still reads unsaved.
    expect(isDocumentDirty()).toBe(true);
  });

  it('re-creates a project deleted elsewhere, under its name', async () => {
    cloud.delete('p1');
    s().setBpm(97);

    const done = saved(await save());

    expect(done.recreated).toBe(true);
    expect(done.projectId).toBe('p2');
    expect(s().projectId).toBe('p2');
    expect(cloud.get('p2')).toMatchObject({ name: 'Beat Tape', bpm: 97 });
    expect(isDocumentDirty()).toBe(false);
    // And the next save goes to the new project.
    s().setBpm(96);
    await save();
    expect(cloud.get('p2')?.bpm).toBe(96);
  });

  it('re-creates a project deleted elsewhere that still has audio to upload, and uploads it there', async () => {
    const vox = s().addTrack('audio', 'vocal-fx', 'Vox');
    const clip = (id: string, assetId: string | null) => ({
      id,
      startTick: 0,
      duration: 960,
      fadeInTicks: 0,
      fadeOutTicks: 0,
      assetId,
    });
    s().addAudioClip(vox, clip('take', null)); // never uploaded
    s().addAudioClip(vox, clip('old', 'asset-old')); // reclaimed by the delete
    cloud.delete('p1');
    const reclaimed = new Set(['asset-old']);

    // The asset API refuses a project that is gone; DELETE reclaimed its
    // assets, which re-upload from memory into a project that exists.
    vi.mocked(uploadPendingAudioClips).mockImplementation(async (_t, pid) => {
      if (!cloud.has(pid)) {
        throw Object.assign(new Error('POST /assets failed (404)'), {
          name: 'AudioUploadError',
        });
      }
      s().updateAudioClip(vox, 'take', { assetId: `asset-take@${pid}` });
    });
    vi.mocked(reconcileMissingAssets).mockImplementation(async (_t, pid) => {
      const old = s()
        .tracks.find((t) => t.id === vox)!
        .audioClips.find((c) => c.id === 'old')!;
      if (!old.assetId || !reclaimed.has(old.assetId)) {
        return { reuploaded: 0, unrecoverable: 0, reuploadFailed: 0 };
      }
      if (!cloud.has(pid)) {
        s().updateAudioClip(vox, 'old', { assetId: null });
        return { reuploaded: 0, unrecoverable: 0, reuploadFailed: 1 };
      }
      s().updateAudioClip(vox, 'old', { assetId: `asset-re@${pid}` });
      return { reuploaded: 1, unrecoverable: 0, reuploadFailed: 0 };
    });

    try {
      const done = saved(await save());
      expect(done).toMatchObject({
        projectId: 'p2',
        recreated: true,
        recreatedReason: 'deleted',
        unrecoverable: 0,
        audioClipsLeftOut: 0,
      });
      expect(api.get).toHaveBeenCalledWith('tok', 'p1', expect.anything());
      // The re-create names no asset (the old ones may be gone): the audio
      // goes up into the new project, and the PUT carries it.
      expect(api.create.mock.calls.at(-1)?.[1].tracks[1].audioClips).toEqual(
        [],
      );
      const assets = cloud
        .get('p2')!
        .tracks[1].audioClips.map((c) => c.assetId)
        .sort();
      expect(assets).toEqual(['asset-re@p2', 'asset-take@p2']);
      expect(s().projectId).toBe('p2');
      expect(isDocumentDirty()).toBe(false);
    } finally {
      vi.mocked(uploadPendingAudioClips).mockReset();
      vi.mocked(reconcileMissingAssets).mockReset();
      vi.mocked(reconcileMissingAssets).mockResolvedValue({
        reuploaded: 0,
        unrecoverable: 0,
        reuploadFailed: 0,
      });
    }
  });

  it('keeps an upload failure when the project is still there', async () => {
    const vox = s().addTrack('audio', 'vocal-fx', 'Vox');
    s().addAudioClip(vox, {
      id: 'take',
      startTick: 0,
      duration: 960,
      fadeInTicks: 0,
      fadeOutTicks: 0,
      assetId: null,
    });
    vi.mocked(uploadPendingAudioClips).mockRejectedValueOnce(
      Object.assign(new Error('GCS upload failed (503)'), {
        name: 'AudioUploadError',
      }),
    );
    await expect(save()).rejects.toMatchObject({ name: 'AudioUploadError' });
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.create).not.toHaveBeenCalled();
    expect(s().projectId).toBe('p1');
  });

  it('retries a 5xx PUT once', async () => {
    api.update.mockRejectedValueOnce(apiError(503));
    s().setBpm(99);
    saved(await save());
    expect(api.update).toHaveBeenCalledTimes(2);
    expect(cloud.get('p1')?.bpm).toBe(99);
  });

  it('fails after a second 5xx, and leaves the work unsaved', async () => {
    api.update
      .mockRejectedValueOnce(apiError(500))
      .mockRejectedValueOnce(apiError(500));
    s().setBpm(99);
    await expect(save()).rejects.toMatchObject({ status: 500 });
    expect(api.update).toHaveBeenCalledTimes(2);
    expect(isDocumentDirty()).toBe(true);
  });

  it('does not retry a 4xx', async () => {
    api.update.mockRejectedValueOnce(apiError(400));
    await expect(save()).rejects.toMatchObject({ status: 400 });
    expect(api.update).toHaveBeenCalledTimes(1);
    expect(api.create).not.toHaveBeenCalled();
  });

  it('saves a project this account cannot write (403) as a new one of its own', async () => {
    api.update.mockRejectedValueOnce(apiError(403));
    s().setBpm(97);
    const done = saved(await save());
    expect(done).toMatchObject({
      projectId: 'p2',
      recreated: true,
      recreatedReason: 'other-account',
    });
    expect(s().projectId).toBe('p2');
    expect(cloud.get('p2')).toMatchObject({ name: 'Beat Tape', bpm: 97 });
  });

  it('times a PUT that never answers out, and the next save runs', async () => {
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
      s().setBpm(98);
      const hung = save();
      const outcome = expect(hung).rejects.toMatchObject({
        name: 'TimeoutError',
      });
      await vi.advanceTimersByTimeAsync(SAVE_REQUEST_TIMEOUT_MS + 10);
      await outcome;
      // A timeout is not a 5xx: no retry.
      expect(api.update).toHaveBeenCalledTimes(1);
      expect(isDocumentDirty()).toBe(true);

      saved(await save());
      expect(cloud.get('p1')?.bpm).toBe(98);
    } finally {
      vi.useRealTimers();
    }
  });

  it('follows a re-create it queued behind: a Cmd-S asked meanwhile saves into the new project', async () => {
    cloud.delete('p1');
    const release = holdCreate();
    s().setBpm(97);
    const first = save();
    await vi.waitFor(() => expect(api.create).toHaveBeenCalledTimes(1));
    s().setBpm(96);
    const second = save(); // asked while linked to the deleted p1
    release();

    expect(saved(await first).projectId).toBe('p2');
    const done = saved(await second);
    expect(done.projectId).toBe('p2');
    expect(cloud.get('p2')?.bpm).toBe(96);
    expect(api.create).toHaveBeenCalledTimes(1);
  });

  it('sends nothing when the student deleted it while the save waited', async () => {
    const release = holdUpdate();
    s().setBpm(90);
    const first = save();
    await vi.waitFor(() => expect(api.update).toHaveBeenCalledTimes(1));
    s().setBpm(91);
    const second = save();
    s().setProjectId(null); // File ▸ Delete
    release();
    await first;
    expect(await second).toMatchObject({ status: 'superseded' });
    expect(api.update).toHaveBeenCalledTimes(1);
    expect(api.create).not.toHaveBeenCalled();
  });

  it('marks the save incomplete when the PUT echo lost track settings', async () => {
    const usual = api.update.getMockImplementation()!;
    api.update.mockImplementationOnce(async (token, id, body) => {
      const detail = await usual(token, id, body);
      return {
        ...detail,
        tracks: detail.tracks.map((t) => ({ ...t, settings: undefined })),
      } as StudioProjectDetail;
    });
    s().setBpm(95);
    const done = saved(await save());
    expect(done.echoMismatch).toBe(true);
    expect(done.complete).toBe(false);
    expect(useSaveStatusStore.getState().savedComplete).toBe(false);
  });

  it('PUTs into the outgoing row but leaves the new session alone when it opened meanwhile', async () => {
    const release = holdUpdate();
    s().setBpm(93);
    const saving = save();
    await vi.waitFor(() => expect(api.update).toHaveBeenCalledTimes(1));
    const announced = vi.fn();
    window.addEventListener('ma-studio-project-saved', announced);

    bumpSessionGeneration('open:project');
    resetSessionToEmpty();
    release();
    const outcome = await saving;
    window.removeEventListener('ma-studio-project-saved', announced);

    expect(outcome).toMatchObject({ status: 'superseded', projectId: 'p1' });
    expect(announced).not.toHaveBeenCalled();
    expect(s().projectId).toBeNull();
    expect(patchCloud).toHaveBeenCalledWith(
      'draft-A',
      expect.objectContaining({ projectId: 'p1' }),
    );
  });
});

describe('a project today’s cloud holds only in part', () => {
  it('saves incomplete (D7)', async () => {
    trackProject('Night Drive');
    s().setChordRegions([REGION], true);
    s().setMode('dorian');
    const done = saved(await save());
    expect(done.complete).toBe(false);
    expect(useSaveStatusStore.getState().savedInPart).toBe(true);
  });
});

describe('Save As', () => {
  beforeEach(async () => {
    trackProject('Original');
    await save();
    api.create.mockClear();
  });

  it('makes a new project and only then takes its name and link', async () => {
    const release = holdCreate();
    const saving = save('saveAs', 'My Copy');
    await vi.waitFor(() => expect(api.create).toHaveBeenCalledTimes(1));
    // Nothing moves while the POST is out.
    expect([s().projectName, s().projectId]).toEqual(['Original', 'p1']);
    release();

    const done = saved(await saving);
    expect(done.asCopy).toBe(true);
    expect([s().projectName, s().projectId]).toEqual(['My Copy', 'p2']);
    expect(cloud.get('p2')?.name).toBe('My Copy');
    expect(cloud.get('p1')?.name).toBe('Original');
    expect(isDocumentDirty()).toBe(false);
  });

  it('whose PUTs fail undoes its stamps and removes the copy', async () => {
    const vox = s().addTrack('audio', 'vocal-fx', 'Vox');
    s().addAudioClip(vox, {
      id: 'take',
      startTick: 0,
      duration: 960,
      fadeInTicks: 0,
      fadeOutTicks: 0,
      assetId: null,
    });
    vi.mocked(uploadPendingAudioClips).mockImplementationOnce(
      async (_t, _pid, opts) => {
        s().updateAudioClip(vox, 'take', { assetId: 'asset-copy' });
        opts?.onStamp?.({
          kind: 'clip',
          trackId: vox,
          clipId: 'take',
          assetId: 'asset-copy',
        });
      },
    );
    api.update
      .mockRejectedValueOnce(apiError(500))
      .mockRejectedValueOnce(apiError(500));

    await expect(save('saveAs', 'My Copy')).rejects.toMatchObject({
      status: 500,
    });
    // The take is pending again: its bytes stay in the draft, not in a
    // copy that never became the session's project.
    const take = s()
      .tracks.find((t) => t.id === vox)!
      .audioClips.find((c) => c.id === 'take')!;
    expect(take.assetId).toBeNull();
    expect(api.remove).toHaveBeenCalledWith('tok', 'p2');
    expect([s().projectName, s().projectId]).toEqual(['Original', 'p1']);
  });

  it('followed by a Cmd-S asked while it ran saves into the copy', async () => {
    const release = holdCreate();
    const copy = save('saveAs', 'My Copy');
    await vi.waitFor(() => expect(api.create).toHaveBeenCalledTimes(1));
    s().setBpm(133);
    const plain = save(); // asked while linked to p1
    release();

    expect(saved(await copy).projectId).toBe('p2');
    const done = saved(await plain);
    expect(done.projectId).toBe('p2');
    expect(cloud.get('p2')?.bpm).toBe(133);
    expect(cloud.get('p1')?.bpm).toBe(120);
  });

  it('that fails leaves the name and the link alone', async () => {
    api.create.mockRejectedValueOnce(apiError(500, 'POST'));
    await expect(save('saveAs', 'My Copy')).rejects.toMatchObject({
      status: 500,
    });
    // A POST is never retried.
    expect(api.create).toHaveBeenCalledTimes(1);
    expect([s().projectName, s().projectId]).toEqual(['Original', 'p1']);
    expect(isDocumentDirty()).toBe(false);
  });
});

describe('Save As during a first save', () => {
  it('makes a copy of its own rather than joining the first save’s create', async () => {
    trackProject('Draft');
    const release = holdCreate();
    const first = save();
    await vi.waitFor(() => expect(api.create).toHaveBeenCalledTimes(1));
    const copy = save('saveAs', 'Draft (mine)');
    release();

    saved(await first);
    const done = saved(await copy);
    expect(api.create).toHaveBeenCalledTimes(2);
    expect(done.projectId).toBe('p2');
    expect(cloud.get('p1')?.name).toBe('Draft');
    expect(cloud.get('p2')?.name).toBe('Draft (mine)');
    expect(s().projectId).toBe('p2');
  });
});

describe('a leave copy (asNew)', () => {
  it('saves under the session name as a new project and links it', async () => {
    trackProject('Shared Song');
    await save();
    s().setBpm(101);
    const done = saved(await save('asNew'));
    expect(done.projectId).toBe('p2');
    expect(s().projectId).toBe('p2');
    expect(cloud.get('p2')).toMatchObject({ name: 'Shared Song', bpm: 101 });
    expect(cloud.get('p1')?.bpm).toBe(120);
  });
});

describe('a create routed to the outgoing draft', () => {
  it('records it incomplete when the POST answer lost what was sent', async () => {
    trackProject('Draft A');
    let release = () => {};
    const gate = new Promise<void>((resolve) => (release = resolve));
    const usual = api.create.getMockImplementation()!;
    api.create.mockImplementationOnce(async (token, body) => {
      await gate;
      const detail = await usual(token, body);
      return {
        ...detail,
        tracks: detail.tracks.map((t) => ({ ...t, settings: undefined })),
      } as StudioProjectDetail;
    });
    const saving = save();
    await vi.waitFor(() => expect(api.create).toHaveBeenCalledTimes(1));
    bumpSessionGeneration('open:template');
    resetSessionToEmpty();
    release();

    expect(await saving).toMatchObject({ status: 'superseded' });
    expect(patchCloud).toHaveBeenCalledWith('draft-A', {
      projectId: 'p1',
      cloud: expect.objectContaining({ savedComplete: false }),
    });
  });
});

describe('ensureProjectId (a collab take’s mint)', () => {
  it('counts as a save in flight while it creates', async () => {
    trackProject();
    const release = holdCreate();
    const minting = ensureProjectId('tok');
    expect(useCloudSaveStore.getState().inFlight).toBe(1);
    release();
    expect(await minting).toBe('p1');
    expect(useCloudSaveStore.getState().inFlight).toBe(0);
  });
});
