// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LEGACY_AUTOSAVE_KEY as IMPORT_LEGACY_KEY } from '@/daw/persistence/drafts/legacyImport';
import { SESSION_SCHEMA_VERSION } from '@/daw/persistence/projectDocument/codec';
import {
  INITIAL_SESSION_STATE,
  useSessionStore,
} from '@/daw/session/sessionStore';
import { setLocalStoreUser, userKeyOf } from '@/lib/local-store/userScope';
import { createWrite } from '@/lib/studio-projects/drafts/__tests__/draftTestUtils';
import {
  DRAFT_LOCK_PREFIX,
  setDefaultLockManager,
} from '@/lib/studio-projects/drafts/draftLock';
import {
  getDraftStore,
  resetDraftStoreForTests,
} from '@/lib/studio-projects/drafts/draftStore';
import {
  DASHBOARD_SCHEMA_VERSION,
  findContinueTarget,
  LEGACY_AUTOSAVE_KEY,
  StudioNewProject,
} from '../StudioNewProject';

const A = 'student-a';
const KEY_A = userKeyOf(A);

function Where() {
  const location = useLocation();
  return <div data-testid="where">{location.pathname + location.search}</div>;
}

function renderTile() {
  return render(
    <MemoryRouter initialEntries={['/studio']}>
      <Routes>
        <Route path="/studio" element={<StudioNewProject />} />
        <Route path="/studio/editor" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
}

const tile = () => screen.queryByTestId('studio-continue-tile');

/** A lock manager whose query reports `held` draft ids as locked. */
function locksHolding(...held: string[]): LockManager {
  return {
    query: () =>
      Promise.resolve({
        held: held.map((id) => ({
          name: DRAFT_LOCK_PREFIX + id,
          mode: 'exclusive' as const,
        })),
        pending: [],
      }),
    request: () => Promise.reject(new Error('not used')),
  } as unknown as LockManager;
}

let restoreLocks: () => void = () => {};
const pause = () => new Promise((r) => setTimeout(r, 5));

async function seed(
  draftId: string,
  userKey: string,
  extra: Parameters<typeof createWrite>[3] = {},
) {
  await getDraftStore().write(createWrite(draftId, userKey, 'work', extra));
}

beforeEach(() => {
  localStorage.clear();
  resetDraftStoreForTests();
  setLocalStoreUser(undefined);
  useSessionStore.setState({ ...INITIAL_SESSION_STATE });
  // No real navigator.locks in tests (Node 24 has a process-wide one).
  restoreLocks = setDefaultLockManager(() => locksHolding());
});

afterEach(() => {
  restoreLocks();
  cleanup();
  setLocalStoreUser(undefined);
  resetDraftStoreForTests();
  localStorage.clear();
});

describe('StudioNewProject: Continue last session', () => {
  it('keeps the dashboard’s copies of the editor constants in step', () => {
    expect(DASHBOARD_SCHEMA_VERSION).toBe(SESSION_SCHEMA_VERSION);
    expect(LEGACY_AUTOSAVE_KEY).toBe(IMPORT_LEGACY_KEY);
  });

  it('links the newest draft with content to ?draft=, by its name', async () => {
    setLocalStoreUser(A);
    await seed('older', KEY_A, { name: 'Older' });
    await new Promise((r) => setTimeout(r, 5));
    await seed('newest', KEY_A, { name: 'Midnight Groove' });
    renderTile();
    await waitFor(() => expect(tile()).toBeTruthy());
    expect(tile()?.textContent).toContain('Midnight Groove');
    expect(tile()?.getAttribute('data-href')).toBe(
      '/studio/editor?draft=newest',
    );
    act(() => tile()?.click());
    expect(screen.getByTestId('where').textContent).toBe(
      '/studio/editor?draft=newest',
    );
  });

  it('goes to the plain editor when this page’s editor holds the user’s live draft', async () => {
    setLocalStoreUser(A);
    await seed('live', KEY_A, { name: 'Live one' });
    await new Promise((r) => setTimeout(r, 5));
    await seed('newer', KEY_A, { name: 'Newer one' });
    useSessionStore.setState({ draftId: 'live', userKey: KEY_A });
    renderTile();
    await waitFor(() => expect(tile()?.textContent).toContain('Live one'));
    expect(tile()?.getAttribute('data-href')).toBe('/studio/editor');
  });

  it('ignores a live draft that belongs to someone else', async () => {
    setLocalStoreUser(A);
    await seed('mine', KEY_A, { name: 'Mine' });
    useSessionStore.setState({ draftId: 'theirs', userKey: 'student-b' });
    renderTile();
    await waitFor(() =>
      expect(tile()?.getAttribute('data-href')).toBe(
        '/studio/editor?draft=mine',
      ),
    );
  });

  it('skips empty drafts and drafts a newer version wrote', async () => {
    setLocalStoreUser(A);
    await seed('ok', KEY_A, { name: 'Fine' });
    await new Promise((r) => setTimeout(r, 5));
    await seed('empty', KEY_A, { hasContent: false });
    await new Promise((r) => setTimeout(r, 5));
    await seed('future', KEY_A, { schema: 99 });
    const target = await findContinueTarget(KEY_A, {
      draftId: null,
      userKey: null,
    });
    expect(target).toEqual({
      href: '/studio/editor?draft=ok',
      name: 'Fine',
    });
  });

  it('never links a draft the boot prune removes before the claim', async () => {
    setLocalStoreUser(A);
    // A cloud-equal draft below a newer blank one: prune keeps only the
    // newest of the two, which holds nothing, so there is nothing to offer.
    await seed('saved', KEY_A, { name: 'Saved' });
    await pause();
    await getDraftStore().write(createWrite('blank', KEY_A, 'empty'));
    await pause();
    await getDraftStore().write(
      createWrite('equal', KEY_A, 'cloud-equal', { name: 'Equal' }),
    );
    const none = { draftId: null, userKey: null };
    // 'saved' has work and stays; 'equal' (newest) holds content.
    expect((await findContinueTarget(KEY_A, none))?.href).toBe(
      '/studio/editor?draft=equal',
    );
    await getDraftStore().remove('saved');
    await pause();
    await getDraftStore().write(createWrite('blank2', KEY_A, 'empty'));
    // Newest is blank, the cloud-equal one is pruned at boot: no tile.
    expect(await findContinueTarget(KEY_A, none)).toBeNull();
  });

  it('never offers a draft another tab holds', async () => {
    setLocalStoreUser(A);
    await seed('free', KEY_A, { name: 'Free' });
    await pause();
    await seed('held', KEY_A, { name: 'Held' });
    const target = await findContinueTarget(
      KEY_A,
      { draftId: null, userKey: null },
      { locks: locksHolding('held') },
    );
    expect(target?.href).toBe('/studio/editor?draft=free');
    expect(
      await findContinueTarget(
        KEY_A,
        { draftId: null, userKey: null },
        { locks: locksHolding('held', 'free') },
      ),
    ).toBeNull();
  });

  it('prefers the session draft to newer kept or recovered work, as resume does', async () => {
    setLocalStoreUser(A);
    await seed('session', KEY_A, { name: 'My session' });
    await pause();
    await seed('kept', KEY_A, { origin: 'kept', keptAt: 5, name: 'Kept' });
    await pause();
    await seed('rec', KEY_A, { origin: 'recovered', name: 'Recovered' });
    const none = { draftId: null, userKey: null };
    expect((await findContinueTarget(KEY_A, none))?.href).toBe(
      '/studio/editor?draft=session',
    );
    await getDraftStore().remove('session');
    expect((await findContinueTarget(KEY_A, none))?.href).toBe(
      '/studio/editor?draft=rec',
    );
  });

  it('never offers another user’s draft', async () => {
    setLocalStoreUser(A);
    await seed('b1', userKeyOf('student-b'), { name: 'B’s work' });
    renderTile();
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
    expect(tile()).toBeNull();
  });

  it('with no drafts yet, offers a pre-1.4 autosave through the plain editor', async () => {
    setLocalStoreUser(A);
    localStorage.setItem(
      LEGACY_AUTOSAVE_KEY,
      JSON.stringify({ version: 2, data: { projectName: 'Old song' } }),
    );
    renderTile();
    await waitFor(() => expect(tile()?.textContent).toContain('Old song'));
    expect(tile()?.getAttribute('data-href')).toBe('/studio/editor');
    // Read only: the key is never rewritten.
    expect(localStorage.getItem(LEGACY_AUTOSAVE_KEY)).toBe(
      JSON.stringify({ version: 2, data: { projectName: 'Old song' } }),
    );
  });

  it('never offers the pre-1.4 autosave when someone else’s Studio data is on the device', async () => {
    setLocalStoreUser(A);
    localStorage.setItem('musicAtlas:daw:prefs:someoneElse', '{}');
    localStorage.setItem(
      LEGACY_AUTOSAVE_KEY,
      JSON.stringify({ version: 2, data: { projectName: 'Their song' } }),
    );
    expect(
      await findContinueTarget(KEY_A, { draftId: null, userKey: null }),
    ).toBeNull();
    // A signed-out ('anon') namespace is nobody else.
    localStorage.removeItem('musicAtlas:daw:prefs:someoneElse');
    localStorage.setItem('musicAtlas:daw:prefs:anon', '{}');
    expect(
      (await findContinueTarget(KEY_A, { draftId: null, userKey: null }))?.name,
    ).toBe('Their song');
  });

  it('is hidden with nothing to continue, and while the user is unknown', async () => {
    await seed('x', KEY_A);
    renderTile();
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
    // Unknown user: no lookup, no tile.
    expect(tile()).toBeNull();
    cleanup();

    setLocalStoreUser('nobody');
    renderTile();
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
    expect(tile()).toBeNull();
    expect(screen.getByText('Blank Project')).toBeTruthy();
  });

  it('shows the tile once auth names the user', async () => {
    await seed('x', KEY_A, { name: 'Later' });
    renderTile();
    expect(tile()).toBeNull();
    act(() => setLocalStoreUser(A));
    await waitFor(() => expect(tile()?.textContent).toContain('Later'));
  });
});
