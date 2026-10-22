// @vitest-environment jsdom
/**
 * A new project's composer is whoever started it (owner, 2026-10-22): a
 * new or template project opens with the signed-in student's name as its
 * composer, as part of its seed (no edit to undo, no work to keep). A demo
 * keeps its own, and a student with no name leaves it empty.
 * Run: npx vitest run src/daw/session/__tests__/composerSeed.test.ts
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/util/toast', () => ({
  showNotice: vi.fn(() => 1),
  showError: vi.fn(),
  showSuccess: vi.fn(),
  showLoading: vi.fn(),
  dismissToast: vi.fn(),
}));

import { composerNameOf } from '@/daw/model/composerName';
import { forgetLiveSession } from '@/daw/persistence/SessionSerializer';
import { markDocumentBaseline } from '@/daw/persistence/saveStatusStore';
import { useStore } from '@/daw/store';
import { canUndo, resetUndoHistory } from '@/daw/store/undoMiddleware';
import { openSession, resetOpenSessionForTests } from '../openSession';
import { registerSessionDeps } from '../sessionDeps';
import { INITIAL_SESSION_STATE, useSessionStore } from '../sessionStore';
import { installFakeDeps, setEditorUrl, type FakeEnv } from './fakes';

let env: FakeEnv;
let name: string | null = 'Aaron';

beforeEach(() => {
  resetOpenSessionForTests();
  useStore.setState(useStore.getInitialState(), true);
  forgetLiveSession();
  resetUndoHistory();
  markDocumentBaseline();
  useSessionStore.setState({ ...INITIAL_SESSION_STATE });
  localStorage.clear();
  setEditorUrl('');
  env = installFakeDeps();
  env.unregister();
  env.unregister = registerSessionDeps({
    ...env.deps,
    userName: () => name,
  });
  name = 'Aaron';
});

afterEach(() => {
  env.unregister();
});

const composer = () => useStore.getState().composerName;

describe('a new project’s composer', () => {
  it('is the student who started it, and no edit', async () => {
    const opened = await openSession({ kind: 'new' }, { source: 'menu' });
    expect(opened.status).toBe('ready');
    expect(composer()).toBe('Aaron');
    expect(canUndo()).toBe(false);
  });

  it('is theirs on a project from a template too', async () => {
    await openSession(
      { kind: 'template', templateId: 'project-pop' },
      { source: 'library' },
    );
    expect(composer()).toBe('Aaron');
  });

  it('stays empty for a student with no name', async () => {
    name = null;
    await openSession({ kind: 'new' }, { source: 'menu' });
    expect(composer()).toBe('');
  });

  it('leaves an untouched new project untouched: opening another keeps nothing', async () => {
    await openSession({ kind: 'new' }, { source: 'menu' });
    const outcome = await openSession({ kind: 'new' }, { source: 'menu' });
    expect(outcome).toMatchObject({ status: 'ready', kept: null });
  });
});

describe('composerNameOf', () => {
  it('takes the nickname, else the username, else the full name', () => {
    expect(
      composerNameOf({ nickname: 'Az', username: 'aaron', fullName: 'A B' }),
    ).toBe('Az');
    expect(composerNameOf({ nickname: '', username: 'aaron' })).toBe('aaron');
    expect(composerNameOf({ fullName: ' Aaron B ' })).toBe('Aaron B');
    expect(composerNameOf(null)).toBe('');
  });
});
