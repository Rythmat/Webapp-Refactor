// @vitest-environment jsdom
/**
 * How DawApp wires the editor to openSession (milestone 1.4). Every boot
 * link, a return to the editor and a cold resume open through openSession
 * (src/daw/session/openSession.ts, whose own tests cover what each intent
 * does, links that go out of date while they load, and a room left
 * behind). DawApp's part, pinned here:
 *
 * - It registers SessionDeps ONCE per mount, with methods that read the
 *   latest auth, plan, collab and router: openSession takes a new
 *   registration for the editor having gone, so registering again as auth
 *   resolves would cancel the boot's own open (a cold ?project= link would
 *   turn into a resume). A change is announced instead, and the
 *   registration goes when the editor unmounts.
 * - user() answers null until auth knows who the student is.
 * - navigate() acts only on /studio/editor.
 * - useSessionBoot opens what the URL names, a tick after mount.
 * - The Opening overlay is a direct child of .daw-root; while it shows,
 *   every other direct child is inert (no wrapper, so the lead sheet still
 *   prints), and .daw-root is aria-busy while an open is in progress.
 * - The collab prompts mount at the root, so Practice shows them too.
 *
 * DawApp renders with its views and engine hooks stubbed out.
 *
 * Run: npx vitest run src/daw/__tests__/DawApp.bootLinks.test.tsx
 */
import { act, cleanup, render } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  openSession: vi.fn(async () => ({ status: 'cancelled' })),
  auth: {
    userId: null as string | null,
    token: null as string | null,
    error: null,
    isAuth0Loading: true,
    isBootstrapLoading: true,
    isAuth0Authenticated: false,
  },
  lessonAccess: () => 'open' as const,
  collab: {
    joinRoom: vi.fn(),
    joinRoomById: vi.fn(),
    joinRoomAwaitingHost: vi.fn(),
    createAndJoinRoom: vi.fn(),
    leaveRoom: vi.fn(),
  },
  drafts: { activeDraftId: () => null },
  engine: { isReady: false, initEngine: () => Promise.resolve() },
  nothing: () => null,
  passThrough: ({ children }: { children?: unknown }) => children,
  noop: () => {},
}));

vi.mock('@/daw/session/openSession', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/daw/session/openSession')>()),
  openSession: h.openSession,
}));
vi.mock('@/contexts/AuthContext/hooks/useAuthContext', () => ({
  useAuthContext: () => h.auth,
}));
vi.mock('@/contexts/AuthContext/hooks/useAuthToken', () => ({
  useAuthToken: () => h.auth.token,
}));
vi.mock('@/daw/components/Tutorial/useLessonAccess', () => ({
  useLessonAccess: () => h.lessonAccess,
}));
vi.mock('@/daw/persistence/drafts/autosave', () => ({
  useDraftAutosave: h.noop,
}));
vi.mock('@/daw/persistence/drafts/draftSessionPort', () => ({
  getDraftSessionPort: () => h.drafts,
}));
vi.mock('@/daw/persistence/drafts/devHandle', () => ({
  installDraftDevHandle: () => h.noop,
}));
vi.mock('@/daw/audio/AudioEngine', () => ({ audioEngine: {} }));
vi.mock('@/daw/hooks/useAudioEngine', () => ({
  useAudioEngine: () => h.engine,
  useStartAudioOnGesture: h.noop,
}));
vi.mock('@/daw/collab/CollabProvider', () => ({
  CollabProvider: h.passThrough,
  useCollab: () => h.collab,
}));
vi.mock('@/daw/dev/DevProfiler', () => ({
  DevProfiler: h.passThrough,
  devMark: h.noop,
  useDevCommitCount: h.noop,
}));
vi.mock('@/daw/hooks/usePrefsSync', () => ({ usePrefsSync: h.noop }));
vi.mock('@/daw/hooks/useDawBodyTokens', () => ({
  useDawBodyTokens: h.noop,
}));
vi.mock('@/daw/hooks/useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: h.noop,
}));
vi.mock('@/daw/hooks/useAudioChordDetection', () => ({
  useAudioChordDetection: h.noop,
}));
vi.mock('@/daw/hooks/useGuitarMidiDetection', () => ({
  useGuitarMidiDetection: h.noop,
}));
vi.mock('@/daw/hooks/useMidiInputRouting', () => ({
  useMidiInputRouting: h.noop,
}));
vi.mock('@/daw/hooks/useStudioMonitor', () => ({
  useStudioMonitor: h.noop,
}));
vi.mock('@/daw/hooks/useCollabAudioLoader', () => ({
  useCollabAudioLoader: h.noop,
}));
vi.mock('@/daw/hooks/usePlaybackEngine', () => ({
  usePlaybackEngine: h.noop,
}));
vi.mock('@/daw/hooks/useTheme', () => ({ useTheme: h.noop }));
vi.mock('@/daw/hooks/useTransport', () => ({ useTransport: h.noop }));
vi.mock('@/daw/components/ChannelStrip/ChannelStrip', () => ({
  ChannelStrip: h.nothing,
}));
vi.mock('@/daw/components/Library/LibraryPanel', () => ({
  LibraryPanel: h.nothing,
}));
vi.mock('@/daw/components/PianoRoll/PianoRollModal', () => ({
  PianoRollModal: h.nothing,
}));
vi.mock('@/daw/components/Library/ChordAnalysisPrompt', () => ({
  ChordAnalysisPrompt: h.nothing,
}));
vi.mock('@/daw/components/LeadSheet/LeadSheetView', () => ({
  LeadSheetView: h.nothing,
}));
vi.mock('@/daw/components/LeadSheet/SendToSetList', () => ({
  SetListUpdatePrompt: h.nothing,
}));
vi.mock('@/daw/components/Score/ScoreView', () => ({ ScoreView: h.nothing }));
vi.mock('@/daw/components/Practice/PracticeTrackView', () => ({
  PracticeTrackView: () => <div data-testid="practice-view" />,
}));
vi.mock('@/daw/components/Studio/StudioView', () => ({
  StudioView: h.nothing,
}));
vi.mock('@/daw/components/Timeline/TimelineWithHeaders', () => ({
  TimelineWithHeaders: () => <div data-testid="timeline" />,
}));
vi.mock('@/daw/components/Prism/PrismSuggestionModal', () => ({
  PrismSuggestionModal: h.nothing,
}));
vi.mock('@/daw/components/Transport/SettingsModal', () => ({
  SettingsModal: h.nothing,
}));
vi.mock('@/daw/components/Transport/RecordingLimitModal', () => ({
  RecordingLimitModal: h.nothing,
}));
vi.mock('@/daw/components/Transport/RecordGuard', () => ({
  RecordGuard: h.nothing,
}));
vi.mock('@/daw/components/Tutorial/TutorialLayer', () => ({
  TutorialLayer: h.nothing,
}));
vi.mock('@/daw/components/Tutorial/UpgradeLessonDialog', () => ({
  UpgradeLessonDialog: h.nothing,
}));
vi.mock('@/daw/components/Transport/TransportBar', () => ({
  TransportBar: () => <div data-testid="transport-bar" />,
}));
vi.mock('@/daw/collab/ui/UserList', () => ({ UserList: h.nothing }));
vi.mock('@/daw/collab/ui/ChatPanel', () => ({ ChatPanel: h.nothing }));
vi.mock('@/daw/collab/ui/LeaveSavePrompt', () => ({
  LeaveSavePrompt: () => <span data-testid="leave-prompt-host" />,
}));
vi.mock('@/daw/collab/ui/KickedModal', () => ({
  KickedModal: () => <span data-testid="kicked-host" />,
}));
vi.mock('@/daw/shell/projects/ProjectsDialogHost', () => ({
  ProjectsDialogHost: h.nothing,
}));
vi.mock('@/daw/shell/topbar/EditorTopRailSlot', () => ({
  EditorTopRailSlot: h.nothing,
}));

import {
  getSessionDeps,
  onSessionDepsChanged,
} from '@/daw/session/sessionDeps';
import {
  INITIAL_SESSION_STATE,
  useSessionStore,
} from '@/daw/session/sessionStore';
import { resetSessionBootForTests } from '@/daw/session/useSessionBoot';
import { useStore } from '@/daw/store';
import { DawApp } from '../DawApp';

/** Where the router is: what navigate() did. */
let routed = '';
function WhereAmI() {
  const location = useLocation();
  routed = location.pathname + location.search;
  return null;
}

function boot(query = '') {
  window.history.replaceState({}, '', `/studio/editor${query}`);
  return render(
    <MemoryRouter initialEntries={[`/studio/editor${query}`]}>
      <DawApp />
      <WhereAmI />
    </MemoryRouter>,
  );
}

/** Let the boot's tick and any effects run. */
async function flush(): Promise<void> {
  await act(async () => {
    for (let i = 0; i < 3; i++) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  });
}

function signIn(): void {
  Object.assign(h.auth, {
    userId: 'u1',
    token: 'tok',
    isAuth0Loading: false,
    isBootstrapLoading: false,
    isAuth0Authenticated: true,
  });
}

const root = () => document.querySelector<HTMLElement>('.daw-root')!;

beforeEach(() => {
  Object.assign(h.auth, {
    userId: null,
    token: null,
    error: null,
    isAuth0Loading: true,
    isBootstrapLoading: true,
    isAuth0Authenticated: false,
  });
  h.openSession.mockClear();
  resetSessionBootForTests();
  useStore.setState(useStore.getInitialState(), true);
  useSessionStore.setState({ ...INITIAL_SESSION_STATE }, true);
});

afterEach(() => {
  cleanup();
  window.history.replaceState({}, '', '/');
});

describe('SessionDeps', () => {
  it('are registered once per mount, and announce auth as it resolves', async () => {
    const changes = vi.fn();
    const stop = onSessionDepsChanged(changes);
    const view = boot();
    await flush();
    const registered = getSessionDeps();
    expect(registered).not.toBeNull();
    // Auth hasn't said who the student is yet: an open waits.
    expect(registered!.user()).toBeNull();
    expect(registered!.token()).toBeNull();
    changes.mockClear();

    signIn();
    view.rerender(
      <MemoryRouter initialEntries={['/studio/editor']}>
        <DawApp />
        <WhereAmI />
      </MemoryRouter>,
    );
    await flush();

    // The same registration, now answering the student and their token.
    expect(getSessionDeps()).toBe(registered);
    expect(changes).toHaveBeenCalled();
    expect(registered!.user()).toEqual({ userId: 'u1', userKey: 'u1' });
    expect(registered!.token()).toBe('tok');
    stop();
  });

  it('say a signed-out student is known, under anon', async () => {
    Object.assign(h.auth, {
      isAuth0Loading: false,
      isBootstrapLoading: false,
      isAuth0Authenticated: false,
    });
    boot();
    await flush();

    expect(getSessionDeps()!.user()).toEqual({
      userId: null,
      userKey: 'anon',
    });
  });

  it('wait while a signed-in student’s profile is missing, never filing under anon', async () => {
    // Auth0 kept the session, but /auth/me failed: no user id, an error.
    Object.assign(h.auth, {
      userId: null,
      token: 'tok',
      error: new Error('profile failed'),
      isAuth0Loading: false,
      isBootstrapLoading: false,
      isAuth0Authenticated: true,
    });
    const view = boot();
    await flush();
    expect(getSessionDeps()!.user()).toBeNull();

    // The profile loads: the same registration now answers the student.
    signIn();
    h.auth.error = null;
    view.rerender(
      <MemoryRouter initialEntries={['/studio/editor']}>
        <DawApp />
        <WhereAmI />
      </MemoryRouter>,
    );
    await flush();
    expect(getSessionDeps()!.user()).toEqual({ userId: 'u1', userKey: 'u1' });
  });

  it('say a student signed out with an auth error is known, under anon', async () => {
    Object.assign(h.auth, {
      error: new Error('bootstrap failed'),
      isAuth0Loading: false,
      isBootstrapLoading: true,
      isAuth0Authenticated: false,
    });
    boot();
    await flush();
    expect(getSessionDeps()!.user()).toEqual({
      userId: null,
      userKey: 'anon',
    });
  });

  it('reach collab and drafts through the editor’s own', async () => {
    boot();
    await flush();
    const deps = getSessionDeps()!;

    deps.collab.leaveRoom();
    deps.collab.joinRoom('abc', 'owner', undefined, 'studio-abc', 'abc');
    deps.collab.joinRoomById('abc', 'editor');
    expect(h.collab.leaveRoom).toHaveBeenCalledTimes(1);
    expect(h.collab.joinRoom).toHaveBeenCalledWith(
      'abc',
      'owner',
      undefined,
      'studio-abc',
      'abc',
    );
    expect(h.collab.joinRoomById).toHaveBeenCalledWith('abc', 'editor');
    expect(deps.drafts).toBe(h.drafts);
  });

  it('navigate on the editor, and nowhere else', async () => {
    boot('?template=project-pop');
    await flush();
    const deps = getSessionDeps()!;

    act(() => deps.navigate('?draft=d1', { replace: true }));
    expect(routed).toBe('/studio/editor?draft=d1');

    window.history.replaceState({}, '', '/studio');
    act(() => deps.navigate('', { replace: true }));
    expect(routed).toBe('/studio/editor?draft=d1');
  });

  it('go when the editor unmounts', async () => {
    const view = boot();
    await flush();
    expect(getSessionDeps()).not.toBeNull();

    view.unmount();
    expect(getSessionDeps()).toBeNull();
  });
});

describe('the boot', () => {
  it('opens what the URL names, a tick after mount', async () => {
    signIn();
    boot('?template=project-pop&utm_source=mail');
    expect(h.openSession).not.toHaveBeenCalled();
    await flush();

    expect(h.openSession).toHaveBeenCalledTimes(1);
    expect(h.openSession).toHaveBeenCalledWith(
      { kind: 'template', templateId: 'project-pop' },
      { source: 'boot' },
    );
  });

  it('resumes when the URL names nothing', async () => {
    boot();
    await flush();

    expect(h.openSession).toHaveBeenCalledWith(
      { kind: 'resume' },
      { source: 'boot' },
    );
  });
});

describe('the Opening overlay', () => {
  it('sits at .daw-root, and makes everything else there inert while it shows', async () => {
    boot();
    await flush();
    expect(root()).not.toHaveAttribute('aria-busy');

    act(() =>
      useSessionStore.setState({
        phase: 'preparing',
        overlay: 'full',
        label: 'Opening ‘Pop’…',
      }),
    );

    const overlay = document.querySelector(
      '[data-testid=opening-overlay]',
    ) as HTMLElement;
    expect(overlay.parentElement).toBe(root());
    expect(root()).toHaveAttribute('aria-busy', 'true');
    const others = Array.from(root().children).filter((c) => c !== overlay);
    expect(others.length).toBeGreaterThan(0);
    for (const child of others) expect(child).toHaveAttribute('inert');
    expect(overlay).not.toHaveAttribute('inert');
    // No wrapper: the editor's views are still direct children (the lead
    // sheet's print rule hides every other direct child).
    expect(
      root().querySelector(':scope > [data-testid=transport-bar]'),
    ).not.toBeNull();

    // A view mounted while it shows is inert too.
    act(() => useStore.setState({ currentView: 'score' }));
    act(() => useStore.setState({ currentView: 'arrange' }));
    await flush();
    for (const child of Array.from(root().children)) {
      if (child !== overlay) expect(child).toHaveAttribute('inert');
    }

    act(() => useSessionStore.setState({ phase: 'ready', overlay: 'none' }));
    expect(document.querySelector('[data-testid=opening-overlay]')).toBeNull();
    expect(root()).not.toHaveAttribute('aria-busy');
    for (const child of Array.from(root().children)) {
      expect(child).not.toHaveAttribute('inert');
    }
  });
});

describe('the collab prompts', () => {
  it('mount at the root, in Practice too', async () => {
    useStore.setState({
      currentView: 'practice',
      practiceSession: { id: 'p' } as never,
    });
    boot();
    await flush();

    expect(
      document.querySelector('[data-testid=practice-view]'),
    ).not.toBeNull();
    expect(
      root().querySelector(':scope > [data-testid=leave-prompt-host]'),
    ).not.toBeNull();
    expect(
      root().querySelector(':scope > [data-testid=kicked-host]'),
    ).not.toBeNull();
  });
});
