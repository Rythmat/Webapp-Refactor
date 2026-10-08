// @vitest-environment jsdom
/**
 * Saving to the cloud (saveCurrentProjectToCloud) and what a link keeps
 * afterwards (decision D7).
 *
 * Today's cloud payload has no place for the chord lane, the mode, the metre,
 * markers, mastering, the Score and Lead Sheet or the Prism builder: only
 * milestone 1.5's document field will. Milestone 1.1 marked a session saved
 * after any cloud save, so a link that followed it (a template, a demo, File
 * ▸ Open) kept nothing, and those fields were gone from everywhere while the
 * student had been told "Project saved". A save now marks the project's
 * baseline as the document it sent, complete only when the cloud copy holds
 * all of it; a partial copy still counts as work to keep.
 *
 * Saves also run one at a time (Cmd-S, File ▸ Save and the leave prompt can
 * overlap), so an older PUT can't finish last and mark the older project as
 * the saved one; a request for the same project while one waits joins it.
 * A save is for the session open when it was asked: one whose session went
 * before it could send (another project opened, File ▸ Delete, Save As)
 * sends nothing, and leaves what is open now as it was.
 *
 * A session kept only because its cloud copy lacks what today's cloud can't
 * hold gives way to other kept work first, so saving and switching projects
 * can't push out work that was never saved anywhere.
 *
 * The API is mocked as the legacy server keeps a project: the last payload
 * written to each id.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { showWarning } from '@/components/utils/toast';
import {
  deserializeCloudProject,
  forgetLiveSession,
  resetSessionToEmpty,
  type CloudProjectDetail,
  type CloudProjectInput,
} from '@/daw/persistence/SessionSerializer';
import {
  hasWorkToKeep,
  isDocumentDirty,
  useSaveStatusStore,
} from '@/daw/persistence/saveStatusStore';
import { useStore } from '@/daw/store';
import type { ChordRegion } from '@/daw/store/prismSlice';
import {
  reconcileMissingAssets,
  uploadPendingAudioClips,
} from '@/lib/studio-assets/upload-pending';
import {
  ensureProjectId,
  SaveSupersededError,
  saveCurrentProjectToCloud,
  studioProjectsApi,
  type StudioProjectDetail,
  type StudioProjectInput,
} from '../api';
import {
  listKeptSessions,
  readKeptSession,
  replaceSession,
  restoreKeptSession,
} from '../localSession';

vi.mock('@/lib/studio-assets/upload-pending', () => ({
  uploadPendingAudioClips: vi.fn(async () => undefined),
  reconcileMissingAssets: vi.fn(async () => ({ unrecoverable: 0 })),
}));
vi.mock('@/components/utils/toast', () => ({
  showError: vi.fn(),
  showSuccess: vi.fn(),
  showWarning: vi.fn(),
}));
vi.mock('@/util/toast', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/util/toast')>()),
  showError: vi.fn(),
  showNotice: vi.fn(),
}));

const s = () => useStore.getState();

/** The mocked cloud: the last payload written under each project id. */
const cloud = new Map<string, StudioProjectInput>();

const detail = (id: string) => ({ id }) as StudioProjectDetail;

function mockCloud() {
  let minted = 0;
  const create = vi
    .spyOn(studioProjectsApi, 'create')
    .mockImplementation(async (_token, body) => {
      const id = `p${++minted}`;
      cloud.set(id, body);
      return detail(id);
    });
  const update = vi
    .spyOn(studioProjectsApi, 'update')
    .mockImplementation(async (_token, id, body) => {
      cloud.set(id, body);
      return detail(id);
    });
  return { create, update };
}

let api: ReturnType<typeof mockCloud>;

/** Hold the next PUT until the returned release runs. */
function holdNextPut(): () => void {
  let release = () => {};
  const gate = new Promise<void>((resolve) => (release = resolve));
  api.update.mockImplementationOnce(async (_token, id, body) => {
    await gate;
    cloud.set(id, body);
    return detail(id);
  });
  return release;
}

/** Hold the next POST (a first save minting its project) until released. */
function holdNextCreate(): () => void {
  let release = () => {};
  const gate = new Promise<void>((resolve) => (release = resolve));
  const create = api.create.getMockImplementation();
  api.create.mockImplementationOnce(async (token, body) => {
    await gate;
    return create!(token, body);
  });
  return release;
}

/**
 * Hold the next save's last step before its PUT (the check for audio a
 * collaborator reclaimed) until released: the student can act meanwhile.
 */
function holdNextReconcile(): () => void {
  let release = () => {};
  const gate = new Promise<void>((resolve) => (release = resolve));
  vi.mocked(reconcileMissingAssets).mockImplementationOnce(async () => {
    await gate;
    return { reuploaded: 0, unrecoverable: 0 };
  });
  return release;
}

/** A project of tracks and notes only: all of it fits today's payload. */
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

/** The 1.1 regression's project: what only the 1.5 document will carry. */
function harmonyProject(): void {
  trackProject('Night Drive');
  s().setMode('dorian');
  s().setChordRegions([REGION], true);
  s().addMarker(1920, 'Chorus');
  s().setTimeSignature(3, 4);
}

const openTemplate = () => s().loadProjectTemplate('project-pop');

/** What the mocked API sends back for `id`, as `GET /projects/:id` would. */
function fetched(id: string): CloudProjectDetail {
  const body = cloud.get(id) as unknown as CloudProjectInput;
  return {
    ...body,
    id,
    createdAt: new Date(),
    updatedAt: new Date(),
    tracks: body.tracks.map((track, ordinal) => ({
      ...track,
      id: `row-${ordinal}`,
      ordinal,
    })),
  };
}

/** Open a cloud project the way `?project=` and File ▸ Open do. */
const openFromCloud = (id: string) =>
  replaceSession('u1', () => deserializeCloudProject(fetched(id)), {
    reopenable: true,
  });

beforeEach(() => {
  localStorage.clear();
  cloud.clear();
  useStore.setState(useStore.getInitialState(), true);
  forgetLiveSession();
  vi.mocked(reconcileMissingAssets).mockClear();
  vi.mocked(uploadPendingAudioClips).mockClear();
  api = mockCloud();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('a link after a cloud save', () => {
  // The 1.1 regression: "Project saved", then a template link, and the chord
  // lane, the mode, the marker and the metre were gone.
  it('keeps a project the cloud holds only in part, and Restore brings it all back', async () => {
    harmonyProject();
    await saveCurrentProjectToCloud('tok');

    // What the cloud copy holds: no chord lane, no mode, no markers, no metre.
    const sent = cloud.get('p1') as unknown as Record<string, unknown>;
    expect(sent).not.toHaveProperty('chordRegions');
    expect(sent).not.toHaveProperty('markers');
    expect(sent.prism).not.toHaveProperty('mode');
    expect(useSaveStatusStore.getState().savedComplete).toBe(false);
    expect(isDocumentDirty()).toBe(false);

    const opened = await replaceSession('u1', openTemplate, {
      reopenable: true,
    });

    expect(opened.status).toBe('opened');
    const kept = opened.status === 'opened' ? opened.kept : null;
    expect(kept?.projectName).toBe('Night Drive');
    expect(restoreKeptSession(kept!.key)).toBe(true);
    expect(s().chordRegions.map((r) => r.name)).toEqual(['Dm7']);
    expect(s().mode).toBe('dorian');
    expect(s().markers.map((m) => m.name)).toEqual(['Chorus']);
    expect([s().timeSignatureNumerator, s().timeSignatureDenominator]).toEqual([
      3, 4,
    ]);
    // And it still saves back to the same cloud project.
    expect(s().projectId).toBe('p1');
  });

  it('keeps nothing of a project the cloud holds whole', async () => {
    trackProject();
    await saveCurrentProjectToCloud('tok');

    expect(useSaveStatusStore.getState().savedComplete).toBe(true);
    expect(hasWorkToKeep()).toBe(false);
    const opened = await replaceSession('u1', openTemplate, {
      reopenable: true,
    });
    expect(opened).toEqual({ status: 'opened', kept: null });
  });

  it('keeps an edit made while the save was in flight', async () => {
    trackProject();
    const release = holdNextPut();
    const saving = saveCurrentProjectToCloud('tok');
    await vi.waitFor(() => expect(api.update).toHaveBeenCalledTimes(1));

    s().updateTrack(s().tracks[0].id, { volume: 0.25 });
    release();
    await saving;

    expect(cloud.get('p1')?.tracks[0].volume).not.toBe(0.25);
    expect(hasWorkToKeep()).toBe(true);
    const opened = await replaceSession('u1', openTemplate, {
      reopenable: true,
    });
    expect(opened.status === 'opened' && opened.kept).toBeTruthy();
  });

  it('keeps the work when the save failed', async () => {
    trackProject();
    api.update.mockRejectedValueOnce(new Error('PUT failed (500)'));

    await expect(saveCurrentProjectToCloud('tok')).rejects.toThrow('500');
    expect(hasWorkToKeep()).toBe(true);
  });

  it('keeps work again once the saved project changes', async () => {
    trackProject();
    await saveCurrentProjectToCloud('tok');
    s().addMarker(960, 'Intro');

    expect(hasWorkToKeep()).toBe(true);
  });

  // Every template sets the Prism generator's strum, which today's payload
  // can't carry; it shapes the next Create, not the project, so a template
  // saved untouched is saved whole and reopens with nothing to keep.
  it.each(['project-pop', 'project-rock', 'project-indie', 'project-rnb'])(
    'keeps nothing when %s, saved untouched, is opened again',
    async (template) => {
      await replaceSession('u1', () => s().loadProjectTemplate(template), {
        reopenable: true,
      });
      await saveCurrentProjectToCloud('tok');
      expect(useSaveStatusStore.getState().savedComplete).toBe(true);

      const opened = await openFromCloud(s().projectId!);

      expect(opened).toEqual({ status: 'opened', kept: null });
      expect(listKeptSessions('u1')).toEqual([]);
    },
  );
});

describe('kept work after saves', () => {
  it('never-saved work outlives sessions kept only for their cloud copy’s gaps', async () => {
    trackProject('Unsaved U');
    s().updateTrack(s().tracks[0].id, { volume: 0.31 });
    await replaceSession('u1', openTemplate, { reopenable: true });

    // Five rounds of: a project with a chord lane, saved (in part), then a
    // link to something else.
    for (let round = 1; round <= 5; round++) {
      harmonyProject();
      s().setProjectName(`Saved ${round}`);
      await saveCurrentProjectToCloud('tok');
      expect(useSaveStatusStore.getState().savedInPart).toBe(true);
      const opened = await replaceSession('u1', openTemplate, {
        reopenable: true,
      });
      const kept = opened.status === 'opened' ? opened.kept : null;
      expect(readKeptSession(kept!.key)?.cloudCopy).toBe('partial');
    }

    expect(listKeptSessions('u1').map((k) => k.projectName)).toEqual([
      'Saved 5',
      'Saved 4',
      'Saved 3',
      'Saved 2',
      'Unsaved U',
    ]);
  });

  it('keeps a session edited after its save as unsaved work, not as a cloud copy', async () => {
    harmonyProject();
    await saveCurrentProjectToCloud('tok');
    s().addMarker(3840, 'Bridge');

    const opened = await replaceSession('u1', openTemplate, {
      reopenable: true,
    });

    const kept = opened.status === 'opened' ? opened.kept : null;
    expect(readKeptSession(kept!.key)).not.toHaveProperty('cloudCopy');
  });
});

describe('a link after File ▸ Delete', () => {
  // The cloud copy is gone but the project stays open: it is the only copy
  // now, though nothing in it changed since it was opened.
  it('keeps a cloud project that was deleted while open', async () => {
    trackProject('Gone From The Cloud');
    await saveCurrentProjectToCloud('tok');
    resetSessionToEmpty();
    await openFromCloud('p1');
    expect(s().projectName).toBe('Gone From The Cloud');
    expect(hasWorkToKeep()).toBe(false);

    // FileMenu's Delete: the request, then the link let go.
    vi.spyOn(studioProjectsApi, 'remove').mockImplementation(async (_t, id) => {
      cloud.delete(id);
      return { id, deletedAt: new Date() };
    });
    await studioProjectsApi.remove('tok', 'p1');
    s().setProjectId(null);
    expect(isDocumentDirty()).toBe(false);

    const opened = await replaceSession('u1', openTemplate, {
      reopenable: true,
    });

    const kept = opened.status === 'opened' ? opened.kept : null;
    expect(kept?.projectName).toBe('Gone From The Cloud');
    // The only copy of all of it now, not a cloud copy in part.
    expect(readKeptSession(kept!.key)).not.toHaveProperty('cloudCopy');
    expect(restoreKeptSession(kept!.key)).toBe(true);
    expect(s().tracks.map((t) => t.name)).toEqual(['Keys']);
    // Its next save makes a new cloud project rather than a dangling one.
    expect(s().projectId).toBeNull();
  });

  it('keeps nothing of a cloud project that was only opened', async () => {
    trackProject();
    await saveCurrentProjectToCloud('tok');
    resetSessionToEmpty();
    await openFromCloud('p1');

    const opened = await replaceSession('u1', openTemplate, {
      reopenable: true,
    });
    expect(opened).toEqual({ status: 'opened', kept: null });
  });

  it('keeps a project deleted while its save was still uploading, and sends nothing', async () => {
    trackProject('Deleted Mid-Save');
    await saveCurrentProjectToCloud('tok');
    s().setBpm(99);
    const release = holdNextReconcile();
    const saving = saveCurrentProjectToCloud('tok');
    await vi.waitFor(() =>
      expect(reconcileMissingAssets).toHaveBeenCalledTimes(2),
    );

    // FileMenu's Delete, while the save waits.
    vi.spyOn(studioProjectsApi, 'remove').mockImplementation(async (_t, id) => {
      cloud.delete(id);
      return { id, deletedAt: new Date() };
    });
    await studioProjectsApi.remove('tok', 'p1');
    s().setProjectId(null);
    vi.mocked(showWarning).mockClear();
    release();

    await expect(saving).rejects.toBeInstanceOf(SaveSupersededError);
    // The student deleted it themself: nothing to tell.
    expect(showWarning).not.toHaveBeenCalled();
    expect(api.update).toHaveBeenCalledTimes(1);
    expect(useSaveStatusStore.getState().savedComplete).toBe(false);
    expect(hasWorkToKeep()).toBe(true);
    const opened = await replaceSession('u1', openTemplate, {
      reopenable: true,
    });
    const kept = opened.status === 'opened' ? opened.kept : null;
    expect(kept?.projectName).toBe('Deleted Mid-Save');
    expect(restoreKeptSession(kept!.key)).toBe(true);
    expect([s().bpm, s().projectId]).toEqual([99, null]);
  });
});

describe('saves', () => {
  it('run one at a time, so the newer project is the one saved', async () => {
    trackProject();
    const release = holdNextPut();
    const first = saveCurrentProjectToCloud('tok');
    await vi.waitFor(() => expect(api.update).toHaveBeenCalledTimes(1));

    // Cmd-S again, after another edit, while the first PUT is still out.
    s().setBpm(100);
    const second = saveCurrentProjectToCloud('tok');
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(api.update).toHaveBeenCalledTimes(1);

    release();
    await first;
    await second;

    expect(api.update.mock.calls.map(([, , body]) => body.bpm)).toEqual([
      120, 100,
    ]);
    expect(cloud.get('p1')?.bpm).toBe(100);
    expect(isDocumentDirty()).toBe(false);
    expect(hasWorkToKeep()).toBe(false);
  });

  it('go on after one fails', async () => {
    trackProject();
    api.update.mockRejectedValueOnce(new Error('PUT failed (503)'));

    const failed = saveCurrentProjectToCloud('tok');
    await vi.waitFor(() => expect(api.update).toHaveBeenCalledTimes(1));
    const next = saveCurrentProjectToCloud('tok');

    await expect(failed).rejects.toThrow('503');
    await expect(next).resolves.toEqual(detail('p1'));
    expect(hasWorkToKeep()).toBe(false);
  });

  it('asked for together are one save', async () => {
    trackProject();
    const first = saveCurrentProjectToCloud('tok');
    const second = saveCurrentProjectToCloud('tok');

    expect(second).toBe(first);
    await second;
    expect(api.create).toHaveBeenCalledTimes(1);
    expect(api.update.mock.calls.map(([, id]) => id)).toEqual(['p1']);
  });

  it('join the save still waiting its turn, which sends the newest project', async () => {
    trackProject();
    const release = holdNextPut();
    const first = saveCurrentProjectToCloud('tok');
    await vi.waitFor(() => expect(api.update).toHaveBeenCalledTimes(1));

    // Cmd-S twice more during the long PUT, after more edits.
    s().setBpm(100);
    const second = saveCurrentProjectToCloud('tok');
    s().setBpm(101);
    const third = saveCurrentProjectToCloud('tok-refreshed');
    expect(third).toBe(second);

    release();
    await Promise.all([first, second]);
    expect(
      api.update.mock.calls.map(([token, , body]) => [token, body.bpm]),
    ).toEqual([
      ['tok', 120],
      ['tok-refreshed', 101],
    ]);
    expect(isDocumentDirty()).toBe(false);
  });

  it('mint one cloud project with an upload that minted it first', async () => {
    trackProject();
    const release = holdNextCreate();
    // A recording's upload starts the project; Cmd-S comes while it mints.
    const minting = ensureProjectId('tok');
    const saving = saveCurrentProjectToCloud('tok');
    release();

    await expect(minting).resolves.toBe('p1');
    await saving;
    expect(api.create).toHaveBeenCalledTimes(1);
    expect(api.update.mock.calls.map(([, id]) => id)).toEqual(['p1']);
  });

  it('send nothing for a session gone while they waited their turn', async () => {
    trackProject();
    const release = holdNextPut();
    const first = saveCurrentProjectToCloud('tok');
    await vi.waitFor(() => expect(api.update).toHaveBeenCalledTimes(1));
    s().setBpm(100);
    const second = saveCurrentProjectToCloud('tok');

    // A template link opens before the first save is back.
    await replaceSession('u1', openTemplate, { reopenable: true });
    vi.mocked(showWarning).mockClear();
    release();

    await first;
    await expect(second).rejects.toBeInstanceOf(SaveSupersededError);
    // The student asked for it, so they hear it didn't happen, and where
    // their work went.
    expect(vi.mocked(showWarning).mock.calls).toEqual([
      [
        "Your save didn't finish: another project was opened first. Your unsaved work was kept on this device.",
      ],
    ]);
    // The template was never asked to be saved: nothing minted, nothing sent.
    expect(api.create).toHaveBeenCalledTimes(1);
    expect(api.update).toHaveBeenCalledTimes(1);
    expect(s().projectId).toBeNull();
    expect(hasWorkToKeep()).toBe(false);
  });

  it('leave a project opened while a first save was minting as it opened', async () => {
    trackProject('Project Y');
    await saveCurrentProjectToCloud('tok');
    resetSessionToEmpty();
    trackProject('Draft A');
    const release = holdNextCreate();
    const saving = saveCurrentProjectToCloud('tok');
    await vi.waitFor(() => expect(api.create).toHaveBeenCalledTimes(2));

    // File ▸ Open of Project Y while the POST is out.
    await openFromCloud('p1');
    release();

    await expect(saving).rejects.toBeInstanceOf(SaveSupersededError);
    expect([s().projectName, s().projectId]).toEqual(['Project Y', 'p1']);
    // The new row holds Draft A as the POST sent it, and nothing more.
    expect(cloud.get('p2')?.name).toBe('Draft A');
    expect(api.update.mock.calls.map(([, id]) => id)).toEqual(['p1']);
    expect(hasWorkToKeep()).toBe(false);
  });

  it('do not rename the old project when Save As comes while one uploads', async () => {
    trackProject('Original');
    await saveCurrentProjectToCloud('tok');
    s().setBpm(99);
    const release = holdNextReconcile();
    const saving = saveCurrentProjectToCloud('tok');
    await vi.waitFor(() =>
      expect(reconcileMissingAssets).toHaveBeenCalledTimes(2),
    );

    // FileMenu's Save As: the new name, the link let go, then its save.
    s().setProjectName('Copy');
    s().setProjectId(null);
    const savingAs = saveCurrentProjectToCloud('tok', 'Copy');
    release();

    await expect(saving).rejects.toBeInstanceOf(SaveSupersededError);
    await savingAs;
    expect(cloud.get('p1')?.name).toBe('Original');
    expect(cloud.get('p2')?.name).toBe('Copy');
    expect(s().projectId).toBe('p2');
    expect(hasWorkToKeep()).toBe(false);
  });

  it('keep a save under a name of its own apart from a plain save waiting', async () => {
    trackProject('Draft');
    const release = holdNextCreate();
    const running = saveCurrentProjectToCloud('tok');
    await vi.waitFor(() => expect(api.create).toHaveBeenCalledTimes(1));
    const waiting = saveCurrentProjectToCloud('tok');

    // A non-host's copy in a shared session keeps the shared title and
    // saves under its own name.
    const named = saveCurrentProjectToCloud('tok', 'My Copy');
    expect(named).not.toBe(waiting);
    release();

    await Promise.all([running, waiting, named]);
    expect(api.update.mock.calls.at(-1)?.[2].name).toBe('My Copy');
  });

  it('mark nothing when another project opened while one was in flight', async () => {
    trackProject();
    const release = holdNextPut();
    const saving = saveCurrentProjectToCloud('tok');
    await vi.waitFor(() => expect(api.update).toHaveBeenCalledTimes(1));
    const announced = vi.fn();
    window.addEventListener('ma-studio-project-saved', announced);

    await replaceSession('u1', openTemplate, { reopenable: true });
    release();
    await saving;
    window.removeEventListener('ma-studio-project-saved', announced);

    // The template is as it opened, and a save of the old project can't
    // stand in for its baseline, nor ask the set lists about the template.
    expect(isDocumentDirty()).toBe(false);
    expect(useSaveStatusStore.getState().savedComplete).toBe(true);
    expect(announced).not.toHaveBeenCalled();
    s().updateTrack(s().tracks[0].id, { volume: 0.1 });
    expect(hasWorkToKeep()).toBe(true);
  });

  it('send nothing for a project deleted while they waited their turn', async () => {
    trackProject('Deleted While Waiting');
    await saveCurrentProjectToCloud('tok');
    s().setBpm(99);
    const release = holdNextPut();
    const running = saveCurrentProjectToCloud('tok');
    await vi.waitFor(() => expect(api.update).toHaveBeenCalledTimes(2));
    s().setBpm(100);
    const waiting = saveCurrentProjectToCloud('tok');

    // File ▸ Delete, before either is back: a save asked for the deleted
    // project must not bring it back as a new one.
    s().setProjectId(null);
    release();

    await running;
    await expect(waiting).rejects.toBeInstanceOf(SaveSupersededError);
    expect(api.create).toHaveBeenCalledTimes(1);
    expect(api.update).toHaveBeenCalledTimes(2);
    expect(s().projectId).toBeNull();
    expect(hasWorkToKeep()).toBe(true);
  });

  it('never upload what is open now for a first save another project replaced', async () => {
    trackProject('Project Y');
    await saveCurrentProjectToCloud('tok');
    resetSessionToEmpty();
    trackProject('Draft A');
    const release = holdNextCreate();
    const saving = saveCurrentProjectToCloud('tok');
    await vi.waitFor(() => expect(api.create).toHaveBeenCalledTimes(2));

    await openFromCloud('p1');
    // A take recorded into Project Y, its bytes not uploaded yet.
    const guitar = s().addTrack('audio', 'guitar-fx', 'Guitar');
    s().updateTrack(guitar, {
      audioClips: [
        {
          id: 'take-1',
          startTick: 0,
          duration: 1920,
          fadeInTicks: 0,
          fadeOutTicks: 0,
          assetId: null,
        },
      ],
    });
    release();

    await expect(saving).rejects.toBeInstanceOf(SaveSupersededError);
    expect(uploadPendingAudioClips).not.toHaveBeenCalled();
  });

  it('let Save & Leave make its own copy while a Cmd-S waits', async () => {
    trackProject('Shared Song');
    await saveCurrentProjectToCloud('tok');
    s().setBpm(99);
    const release = holdNextPut();
    const running = saveCurrentProjectToCloud('tok');
    await vi.waitFor(() => expect(api.update).toHaveBeenCalledTimes(2));
    s().setBpm(100);
    const waiting = saveCurrentProjectToCloud('tok');

    // LeaveSavePrompt's Save & Leave: a new project of the student's own.
    s().setProjectId(null);
    const leaving = saveCurrentProjectToCloud('tok');
    expect(leaving).not.toBe(waiting);
    release();

    await running;
    await expect(waiting).rejects.toBeInstanceOf(SaveSupersededError);
    await leaving;
    expect(s().projectId).toBe('p2');
    expect(cloud.get('p2')?.bpm).toBe(100);
    expect(hasWorkToKeep()).toBe(false);
  });

  it('keep a save asked for after another project opened as that project’s own', async () => {
    trackProject('Draft A');
    const release = holdNextCreate();
    const first = saveCurrentProjectToCloud('tok');
    await vi.waitFor(() => expect(api.create).toHaveBeenCalledTimes(1));
    const againForA = saveCurrentProjectToCloud('tok');

    await replaceSession('u1', openTemplate, { reopenable: true });
    const forTemplate = saveCurrentProjectToCloud('tok');
    expect(forTemplate).not.toBe(againForA);
    // A take recorded into the template mints its project meanwhile.
    const minting = ensureProjectId('tok');
    release();

    await expect(first).rejects.toBeInstanceOf(SaveSupersededError);
    await expect(againForA).rejects.toBeInstanceOf(SaveSupersededError);
    const templateId = await minting;
    await forTemplate;
    expect(s().projectId).toBe(templateId);
    expect(cloud.get(templateId)?.name).toBe(s().projectName);
    expect(cloud.get(templateId)?.name).not.toBe('Draft A');
    expect(api.update.mock.calls.map(([, id]) => id)).toEqual([templateId]);
  });
});
