// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
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
import { openSession } from '@/daw/session/openSession';
import {
  registerSessionDeps,
  type SessionDeps,
} from '@/daw/session/sessionDeps';
import {
  INITIAL_SESSION_STATE,
  useSessionStore,
} from '@/daw/session/sessionStore';
import type { DraftSessionPort } from '@/daw/session/types';
import { useStore } from '@/daw/store';
import { installDomShims } from '@/daw/ui/__tests__/dom';
import { DEVICE_USER_KEY } from '@/lib/local-store/userScope';
import type {
  DraftMeta,
  QuarantineRecord,
} from '@/lib/studio-projects/drafts/types';
import {
  studioProjectsApi,
  type StudioProjectSummary,
} from '@/lib/studio-projects/projectsClient';
import { clearCloudProjectCache } from '../cloudProjectList';
import { ProjectsDialogHost } from '../ProjectsDialogHost';
import { useProjectsDialogStore } from '../useProjectsDialogStore';

vi.mock('@/daw/session/openSession', () => ({
  openSession: vi.fn(() => Promise.resolve({ status: 'cancelled' })),
}));

const USER = { userId: 'student-a', userKey: 'student-a' };
const NOW = Date.now();

function meta(partial: Partial<DraftMeta> & { draftId: string }): DraftMeta {
  return {
    v: 1,
    userKey: USER.userKey,
    origin: 'session',
    createdAt: NOW - 3_600_000,
    updatedAt: NOW - 300_000,
    writeSeq: 1,
    writer: { build: 'test', doc: 'doc' },
    schema: 3,
    name: `Draft ${partial.draftId}`,
    trackCount: 1,
    chars: 100,
    contentHash: 'h1:c',
    docFingerprint: 'h1:work',
    hasContent: true,
    baseline: { source: 'new', reopenable: true, fingerprint: 'h1:base' },
    media: [],
    mediaMissing: 0,
    ...partial,
  };
}

function summary(id: string, name: string): StudioProjectSummary {
  return {
    id,
    name,
    composerName: null,
    bpm: 100,
    createdAt: new Date(NOW - 86_400_000),
    updatedAt: new Date(NOW - 600_000),
    libraryGenre: null,
    libraryStatus: null,
    libraryInstruments: [],
    collaborators: [],
  };
}

interface Lists {
  mine: DraftMeta[];
  device: DraftMeta[];
  quarantined: QuarantineRecord[];
  locked: Set<string>;
}

let lists: Lists;
let drafts: {
  activeDraftId: ReturnType<typeof vi.fn>;
  listDrafts: ReturnType<typeof vi.fn>;
  deleteDraft: ReturnType<typeof vi.fn>;
  claimDeviceDraft: ReturnType<typeof vi.fn>;
};
let token: string | null;
let user: { userId: string; userKey: string } | null;
let unregister: () => void;

beforeAll(installDomShims);

beforeEach(() => {
  lists = { mine: [], device: [], quarantined: [], locked: new Set() };
  token = 'tok';
  user = USER;
  drafts = {
    activeDraftId: vi.fn(() => 'live'),
    listDrafts: vi.fn(() =>
      Promise.resolve({
        mine: [...lists.mine],
        device: [...lists.device],
        quarantined: [...lists.quarantined],
        locked: new Set(lists.locked),
      }),
    ),
    deleteDraft: vi.fn((id: string) => {
      lists.mine = lists.mine.filter((m) => m.draftId !== id);
      return Promise.resolve('deleted' as const);
    }),
    claimDeviceDraft: vi.fn((_user: unknown, id: string) => {
      const found = lists.device.find((m) => m.draftId === id);
      lists.device = lists.device.filter((m) => m.draftId !== id);
      if (found) lists.mine.push({ ...found, userKey: USER.userKey });
      return Promise.resolve(found ?? null);
    }),
  };
  const deps = {
    user: () => user,
    token: () => token,
    lessonAccess: () => 'open',
    collab: {} as SessionDeps['collab'],
    drafts: drafts as unknown as DraftSessionPort,
    navigate: () => {},
    openProjectsDialog: () => {},
  } satisfies SessionDeps;
  unregister = registerSessionDeps(deps);
  useSessionStore.setState({ ...INITIAL_SESSION_STATE, draftId: 'live' });
  useStore.setState({ roomId: null, projectId: null });
  useProjectsDialogStore.setState({
    open: false,
    sortBy: 'recent',
    focusDraftId: null,
  });
  clearCloudProjectCache();
  vi.spyOn(studioProjectsApi, 'list').mockResolvedValue([]);
});

afterEach(() => {
  cleanup();
  unregister();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

async function openDialog(opts?: { focusDraftId?: string }) {
  render(<ProjectsDialogHost />);
  await act(async () => {
    useProjectsDialogStore.getState().openDialog(opts);
    await new Promise((r) => setTimeout(r, 0));
  });
  return screen.findByRole('dialog', { name: 'Projects' });
}

const rows = () => screen.queryAllByTestId('projects-row');
const rowFor = (attr: string, value: string) =>
  rows().find((row) => row.getAttribute(attr) === value);

describe('ProjectsDialog', () => {
  it('opens a tick after the store asks, titled Projects, search focused', async () => {
    const dialog = await openDialog();
    expect(dialog).toBeTruthy();
    const search = screen.getByRole('searchbox', { name: 'Search projects' });
    expect(document.activeElement).toBe(search);
    expect(drafts.listDrafts).toHaveBeenCalledWith(USER);
  });

  it('hands focus back to the menu trigger, not a lingering menu item', async () => {
    // A Radix menu can stay mounted (closed) with focus on its item.
    const trigger = document.createElement('button');
    trigger.id = 'file-trigger';
    trigger.textContent = 'File';
    const menu = document.createElement('div');
    menu.setAttribute('role', 'menu');
    menu.setAttribute('aria-labelledby', 'file-trigger');
    const item = document.createElement('div');
    item.setAttribute('role', 'menuitem');
    item.tabIndex = 0;
    menu.appendChild(item);
    document.body.append(trigger, menu);
    item.focus();
    try {
      await openDialog();
      expect(document.activeElement).toBe(
        screen.getByRole('searchbox', { name: 'Search projects' }),
      );
      act(() => useProjectsDialogStore.getState().close());
      await waitFor(() => expect(document.activeElement).toBe(trigger));
    } finally {
      trigger.remove();
      menu.remove();
    }
  });

  it('lists the three sections with their rows and data attributes', async () => {
    lists.mine = [
      meta({ draftId: 'live', name: 'My live song' }),
      meta({
        draftId: 'kept1',
        origin: 'kept',
        keptAt: NOW - 60_000,
        name: 'Kept groove',
        projectId: 'p1',
      }),
    ];
    lists.device = [
      meta({
        draftId: 'dev1',
        userKey: DEVICE_USER_KEY,
        origin: 'migrated',
        name: 'Old autosave',
        docFingerprint: null,
      }),
    ];
    vi.mocked(studioProjectsApi.list).mockResolvedValue([
      summary('p1', 'Cloud groove'),
    ]);
    await openDialog();
    await waitFor(() => expect(rowFor('data-project-id', 'p1')).toBeTruthy());

    const live = rowFor('data-draft-id', 'live');
    expect(live?.getAttribute('data-section')).toBe('device');
    expect(live?.getAttribute('data-tags')).toContain('open-now');
    expect(live?.getAttribute('data-origin')).toBe('session');
    const kept = rowFor('data-draft-id', 'kept1');
    expect(kept?.getAttribute('data-tags')).toContain('kept');
    expect(kept?.getAttribute('data-tags')).toContain('changes-on-device');
    const found = rowFor('data-draft-id', 'dev1');
    expect(found?.getAttribute('data-section')).toBe('found');
    const cloudRow = rowFor('data-project-id', 'p1');
    expect(cloudRow?.getAttribute('data-section')).toBe('account');
    expect(cloudRow?.getAttribute('data-tags')).toBe('changes-on-device');
    expect(
      screen.getByRole('region', { name: 'Found on this device' }),
    ).toBeTruthy();
  });

  it('searches by name, ignoring case and accents', async () => {
    lists.mine = [
      meta({ draftId: 'a', name: 'Canción' }),
      meta({ draftId: 'b', name: 'Blues' }),
    ];
    await openDialog();
    await waitFor(() => expect(rows()).toHaveLength(2));
    fireEvent.change(
      screen.getByRole('searchbox', { name: 'Search projects' }),
      {
        target: { value: 'CANCION' },
      },
    );
    expect(rows().map((r) => r.getAttribute('data-draft-id'))).toEqual(['a']);
  });

  it('opens a draft through openSession after closing', async () => {
    lists.mine = [meta({ draftId: 'other' })];
    await openDialog();
    await waitFor(() => expect(rowFor('data-draft-id', 'other')).toBeTruthy());
    const row = rowFor('data-draft-id', 'other');
    if (!row) throw new Error('row');
    fireEvent.click(within(row).getByRole('button', { name: 'Open' }));
    expect(useProjectsDialogStore.getState().open).toBe(false);
    expect(openSession).toHaveBeenCalledWith(
      { kind: 'draft', draftId: 'other' },
      { source: 'dialog' },
    );
  });

  it('opens an account project, or its saved version', async () => {
    lists.mine = [meta({ draftId: 'w', projectId: 'p1' })];
    vi.mocked(studioProjectsApi.list).mockResolvedValue([
      summary('p1', 'Cloud groove'),
    ]);
    await openDialog();
    await waitFor(() => expect(rowFor('data-project-id', 'p1')).toBeTruthy());
    const row = rowFor('data-project-id', 'p1');
    if (!row) throw new Error('row');
    fireEvent.click(
      within(row).getByRole('button', { name: 'Open saved version' }),
    );
    expect(openSession).toHaveBeenCalledWith(
      { kind: 'project', projectId: 'p1', fromCloud: true },
      { source: 'dialog' },
    );
  });

  it('opens a plain account project', async () => {
    vi.mocked(studioProjectsApi.list).mockResolvedValue([
      summary('p2', 'Other'),
    ]);
    await openDialog();
    await waitFor(() => expect(rowFor('data-project-id', 'p2')).toBeTruthy());
    const row = rowFor('data-project-id', 'p2');
    if (!row) throw new Error('row');
    fireEvent.click(within(row).getByRole('button', { name: 'Open' }));
    expect(openSession).toHaveBeenCalledWith(
      { kind: 'project', projectId: 'p2' },
      { source: 'dialog' },
    );
  });

  it('deletes a device draft only after the confirm', async () => {
    lists.mine = [meta({ draftId: 'gone', name: 'Bye' })];
    await openDialog();
    await waitFor(() => expect(rowFor('data-draft-id', 'gone')).toBeTruthy());
    const row = rowFor('data-draft-id', 'gone');
    if (!row) throw new Error('row');
    fireEvent.click(
      within(row).getByRole('button', { name: 'Delete from this device' }),
    );
    const confirm = await screen.findByRole('alertdialog');
    expect(drafts.deleteDraft).not.toHaveBeenCalled();
    // Cancel first: nothing is deleted.
    fireEvent.click(within(confirm).getByRole('button', { name: 'Cancel' }));
    expect(drafts.deleteDraft).not.toHaveBeenCalled();

    fireEvent.click(
      within(rowFor('data-draft-id', 'gone') as HTMLElement).getByRole(
        'button',
        { name: 'Delete from this device' },
      ),
    );
    const again = await screen.findByRole('alertdialog');
    await act(async () => {
      fireEvent.click(
        within(again).getByRole('button', { name: 'Delete from this device' }),
      );
    });
    expect(drafts.deleteDraft).toHaveBeenCalledWith('gone');
    await waitFor(() =>
      expect(rowFor('data-draft-id', 'gone')).toBeUndefined(),
    );
  });

  it('says when Delete removes the only copy', async () => {
    lists.mine = [
      meta({ draftId: 'local', name: 'Never saved' }),
      meta({ draftId: 'linked', name: 'Linked', projectId: 'p1' }),
      meta({ draftId: 'orphan', name: 'Orphan', projectId: 'gone' }),
    ];
    vi.mocked(studioProjectsApi.list).mockResolvedValue([
      summary('p1', 'Cloud'),
    ]);
    await openDialog();
    await waitFor(() => expect(rowFor('data-project-id', 'p1')).toBeTruthy());
    const confirmFor = async (id: string) => {
      fireEvent.click(
        within(rowFor('data-draft-id', id) as HTMLElement).getByRole('button', {
          name: 'Delete from this device',
        }),
      );
      const dialog = await screen.findByRole('alertdialog');
      const text = dialog.textContent ?? '';
      fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
      await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
      return text;
    };
    expect(await confirmFor('local')).toContain(
      'Deleting it removes the only copy',
    );
    expect(await confirmFor('orphan')).toContain(
      'Deleting it removes the only copy',
    );
    expect(await confirmFor('linked')).toContain(
      'Anything saved to your account stays there',
    );
    expect(drafts.deleteDraft).not.toHaveBeenCalled();
  });

  it('never lets anyone delete work found on this device', async () => {
    lists.device = [
      meta({
        draftId: 'dev1',
        userKey: DEVICE_USER_KEY,
        origin: 'migrated',
        docFingerprint: null,
      }),
    ];
    await openDialog();
    await waitFor(() => expect(rowFor('data-draft-id', 'dev1')).toBeTruthy());
    const row = rowFor('data-draft-id', 'dev1') as HTMLElement;
    expect(
      within(row).queryByRole('button', { name: 'Delete from this device' }),
    ).toBeNull();
    expect(within(row).getByRole('button', { name: 'Open' })).toBeTruthy();
  });

  it('shows nothing from the last opening, or the last user, until the drafts are listed again', async () => {
    lists.mine = [meta({ draftId: 'a1', name: 'A’s draft', projectId: 'p9' })];
    lists.device = [
      meta({
        draftId: 'dev1',
        userKey: DEVICE_USER_KEY,
        origin: 'migrated',
        projectId: 'pb',
        docFingerprint: null,
      }),
    ];
    lists.quarantined = [
      {
        userKey: USER.userKey,
        source: 'legacy-unreadable',
        reason: 'x',
        build: 'b',
        hash: 'h',
        raw: '{}',
        at: NOW,
      },
    ];
    await openDialog();
    await waitFor(() => expect(rowFor('data-draft-id', 'a1')).toBeTruthy());
    expect(screen.getByTestId('projects-quarantine')).toBeTruthy();
    act(() => useProjectsDialogStore.getState().close());
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    // Student B, same page, same host: B's lists and account list hang.
    user = { userId: 'student-b', userKey: 'student-b' };
    token = 'tok-b';
    drafts.listDrafts.mockReturnValue(new Promise(() => {}));
    vi.mocked(studioProjectsApi.list).mockResolvedValue([
      summary('pb', 'B’s project'),
    ]);
    await act(async () => {
      useProjectsDialogStore.getState().openDialog();
      await new Promise((r) => setTimeout(r, 10));
    });
    // The dialog shows a tick after the store opens (effects flush as the
    // act above ends), with nothing from A's opening in it.
    expect(
      await screen.findByRole('dialog', { name: 'Projects' }),
    ).toBeTruthy();
    expect(rowFor('data-draft-id', 'a1')).toBeUndefined();
    expect(rowFor('data-draft-id', 'dev1')).toBeUndefined();
    expect(screen.queryByTestId('projects-quarantine')).toBeNull();
    expect(
      screen.queryAllByRole('button', { name: 'Delete from this device' }),
    ).toHaveLength(0);
    // The account list loaded for B, but the draft lists didn't: no claim.
    await waitFor(() => expect(rowFor('data-project-id', 'pb')).toBeTruthy());
    expect(drafts.claimDeviceDraft).not.toHaveBeenCalled();
    expect(screen.getByText('Loading…')).toBeTruthy();
  });

  it('marks nothing missing from the account on reopen until this opening’s fetch answers', async () => {
    lists.mine = [meta({ draftId: 'w', projectId: 'p1' })];
    vi.mocked(studioProjectsApi.list).mockResolvedValue([]);
    await openDialog();
    await waitFor(() =>
      expect(rowFor('data-draft-id', 'w')?.getAttribute('data-tags')).toContain(
        'not-in-account',
      ),
    );
    act(() => useProjectsDialogStore.getState().close());
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    // Saved since: the account now has it, but the fetch is slow.
    let answer: (list: StudioProjectSummary[]) => void = () => {};
    vi.mocked(studioProjectsApi.list).mockReturnValue(
      new Promise((resolve) => {
        answer = resolve;
      }),
    );
    await act(async () => {
      useProjectsDialogStore.getState().openDialog();
      await new Promise((r) => setTimeout(r, 10));
    });
    await waitFor(() => expect(rowFor('data-draft-id', 'w')).toBeTruthy());
    expect(
      rowFor('data-draft-id', 'w')?.getAttribute('data-tags'),
    ).not.toContain('not-in-account');
    await act(async () => {
      answer([summary('p1', 'Saved since')]);
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(rowFor('data-draft-id', 'w')?.getAttribute('data-tags')).toContain(
      'changes-on-device',
    );
  });

  it('offers no Delete on the open draft, a locked one or an account row', async () => {
    lists.mine = [meta({ draftId: 'live' }), meta({ draftId: 'locked' })];
    lists.locked = new Set(['locked']);
    vi.mocked(studioProjectsApi.list).mockResolvedValue([
      summary('p1', 'Cloud'),
    ]);
    await openDialog();
    await waitFor(() => expect(rowFor('data-project-id', 'p1')).toBeTruthy());
    for (const row of rows()) {
      expect(
        within(row).queryByRole('button', { name: 'Delete from this device' }),
      ).toBeNull();
    }
    expect(
      rowFor('data-draft-id', 'locked')?.getAttribute('data-tags'),
    ).toContain('other-tab');
  });

  it('downloads the quarantined drafts as one JSON file', async () => {
    lists.quarantined = [
      {
        id: 1,
        userKey: USER.userKey,
        source: 'legacy-unreadable',
        reason: 'parse',
        build: 'old',
        hash: 'h',
        raw: '{bad',
        at: 1,
      },
      {
        id: 2,
        userKey: USER.userKey,
        source: 'draft',
        reason: 'corrupt',
        build: 'old',
        hash: 'h2',
        raw: '{worse',
        at: 2,
      },
      // A legacy backup: a kept copy, not a draft that failed to open. Left
      // out of the count, still in the download.
      {
        id: 3,
        userKey: USER.userKey,
        source: 'legacy-backup',
        reason: 'backup',
        build: 'old',
        hash: 'h3',
        raw: '{kept',
        at: 3,
      },
    ];
    const created: Blob[] = [];
    const createObjectURL = vi.fn((blob: Blob) => {
      created.push(blob);
      return 'blob:x';
    });
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    await openDialog();
    const line = await screen.findByTestId('projects-quarantine');
    expect(line.textContent).toContain('2 drafts couldn’t be opened');
    fireEvent.click(within(line).getByRole('button', { name: 'Download' }));
    expect(click).toHaveBeenCalledTimes(1);
    expect(created).toHaveLength(1);
    // jsdom's Blob has no text(); read it the old way.
    const text = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsText(created[0]);
    });
    expect(created[0].type).toBe('application/json');
    const parsed = JSON.parse(text) as { drafts: QuarantineRecord[] };
    expect(parsed.drafts.map((d) => d.raw)).toEqual([
      '{bad',
      '{worse',
      '{kept',
    ]);
  });

  it('shows no “couldn’t be opened” line for legacy backups alone', async () => {
    lists.mine = [meta({ draftId: 'a1' })];
    lists.quarantined = [
      {
        userKey: USER.userKey,
        source: 'legacy-backup',
        reason: 'backup',
        build: 'b',
        hash: 'h',
        raw: '{}',
        at: NOW,
      },
    ];
    await openDialog();
    await waitFor(() => expect(rowFor('data-draft-id', 'a1')).toBeTruthy());
    expect(screen.queryByTestId('projects-quarantine')).toBeNull();
  });

  it('disables Open in a room', async () => {
    useStore.setState({ roomId: 'room-1' });
    lists.mine = [meta({ draftId: 'other' })];
    vi.mocked(studioProjectsApi.list).mockResolvedValue([
      summary('p2', 'Other'),
    ]);
    await openDialog();
    await waitFor(() => expect(rowFor('data-project-id', 'p2')).toBeTruthy());
    for (const row of rows()) {
      const open = within(row).queryByRole('button', { name: 'Open' });
      if (open) expect((open as HTMLButtonElement).disabled).toBe(true);
    }
    expect(screen.getByTestId('projects-in-room')).toBeTruthy();
  });

  it('claims a ~device draft whose project is in the account list', async () => {
    lists.device = [
      meta({
        draftId: 'dev1',
        userKey: DEVICE_USER_KEY,
        origin: 'migrated',
        projectId: 'p1',
        docFingerprint: null,
      }),
    ];
    vi.mocked(studioProjectsApi.list).mockResolvedValue([
      summary('p1', 'Cloud groove'),
    ]);
    await openDialog();
    await waitFor(() =>
      expect(drafts.claimDeviceDraft).toHaveBeenCalledWith(USER, 'dev1'),
    );
    await waitFor(() =>
      expect(
        rowFor('data-draft-id', 'dev1')?.getAttribute('data-section'),
      ).toBe('device'),
    );
  });

  it('signed out: drafts only, and a note for the account', async () => {
    token = null;
    lists.mine = [meta({ draftId: 'w' })];
    await openDialog();
    await waitFor(() => expect(rowFor('data-draft-id', 'w')).toBeTruthy());
    expect(studioProjectsApi.list).not.toHaveBeenCalled();
    expect(screen.getByTestId('projects-account-note').textContent).toBe(
      'Sign in to see projects saved to your account.',
    );
  });

  it('shows an error with Retry when the account list fails', async () => {
    vi.mocked(studioProjectsApi.list).mockRejectedValueOnce(new Error('500'));
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    await openDialog();
    const note = await screen.findByText(/couldn’t load/);
    vi.mocked(studioProjectsApi.list).mockResolvedValue([
      summary('p3', 'Back again'),
    ]);
    fireEvent.click(within(note).getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(rowFor('data-project-id', 'p3')).toBeTruthy());
  });

  it('never shows one user’s cached list to the next', async () => {
    vi.mocked(studioProjectsApi.list).mockResolvedValue([
      summary('pa', 'A’s project'),
    ]);
    await openDialog();
    await waitFor(() => expect(rowFor('data-project-id', 'pa')).toBeTruthy());
    act(() => useProjectsDialogStore.getState().close());
    cleanup();
    unregister();

    // Student B on the same page: the fetch hangs, A's list never shows.
    unregister = registerSessionDeps({
      user: () => ({ userId: 'student-b', userKey: 'student-b' }),
      token: () => 'tok-b',
      lessonAccess: () => 'open',
      collab: {} as SessionDeps['collab'],
      drafts: drafts as unknown as DraftSessionPort,
      navigate: () => {},
      openProjectsDialog: () => {},
    });
    vi.mocked(studioProjectsApi.list).mockReturnValue(new Promise(() => {}));
    await openDialog();
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
    expect(rowFor('data-project-id', 'pa')).toBeUndefined();
  });
});
