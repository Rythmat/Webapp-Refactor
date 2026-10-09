// @vitest-environment jsdom
/**
 * The editor's boot hook: one open per navigation, a tick after mount (a
 * StrictMode mount React throws away starts nothing), the first run opens
 * the URL's intent or resumes, later runs only for a boot key or
 * ?projects=1, and a remount on a navigation that already opened carries on
 * with the session instead of opening its link again.
 *
 * Run: npx vitest run src/daw/session/__tests__/useSessionBoot.test.tsx
 */
import { StrictMode, type ReactNode } from 'react';
import { act, render } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { openSession } from '../openSession';
import { resetSessionBootForTests, useSessionBoot } from '../useSessionBoot';
import { registerSessionDeps, type SessionDeps } from '../sessionDeps';

vi.mock('../openSession', () => ({
  openSession: vi.fn(async () => ({ status: 'ready' })),
}));

const open = vi.mocked(openSession);

let navigateTo: (to: string) => void = () => {};

function Editor() {
  useSessionBoot();
  const navigate = useNavigate();
  navigateTo = (to) => navigate(to);
  return null;
}

function mount(initial: string, wrap = (node: ReactNode) => node) {
  return render(
    wrap(
      <MemoryRouter initialEntries={[initial]}>
        <Editor />
      </MemoryRouter>,
    ) as JSX.Element,
  );
}

const tick = () => act(() => new Promise<void>((r) => setTimeout(r, 5)));

const openProjectsDialog = vi.fn();
let unregister: () => void = () => {};

beforeEach(() => {
  resetSessionBootForTests();
  unregister = registerSessionDeps({
    openProjectsDialog,
  } as unknown as SessionDeps);
});

afterEach(() => {
  unregister();
  vi.clearAllMocks();
});

describe('useSessionBoot', () => {
  it('opens the link once under StrictMode, a tick after mount', async () => {
    mount('/studio/editor?template=project-pop', (node) => (
      <StrictMode>{node}</StrictMode>
    ));
    expect(open).not.toHaveBeenCalled();
    await tick();
    expect(open).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledWith(
      { kind: 'template', templateId: 'project-pop' },
      { source: 'boot' },
    );
  });

  it('resumes on a bare URL', async () => {
    mount('/studio/editor');
    await tick();
    expect(open).toHaveBeenCalledWith({ kind: 'resume' }, { source: 'boot' });
  });

  it('opens a link that arrives while the editor is open', async () => {
    mount('/studio/editor');
    await tick();
    open.mockClear();
    act(() => navigateTo('/studio/editor?demo=demo-midnight-groove&msp=1'));
    await tick();
    expect(open).toHaveBeenCalledWith(
      { kind: 'demo', demoId: 'demo-midnight-groove' },
      { source: 'link' },
    );
  });

  it('ignores later navigations without a boot key', async () => {
    mount('/studio/editor?new=1');
    await tick();
    open.mockClear();
    // openSession's strip (a replace) and other in-editor navigations.
    act(() => navigateTo('/studio/editor?msp=1'));
    await tick();
    act(() => navigateTo('/studio/editor'));
    await tick();
    expect(open).not.toHaveBeenCalled();
  });

  it('opens the Projects dialog for ?projects=1 once the session is ready', async () => {
    mount('/studio/editor?projects=1');
    await tick();
    expect(open).toHaveBeenCalledWith({ kind: 'resume' }, { source: 'boot' });
    await tick();
    expect(openProjectsDialog).toHaveBeenCalledTimes(1);
  });

  it('a remount on a navigation that opened resumes instead of reopening its link', async () => {
    const first = render(
      <MemoryRouter
        initialEntries={[
          { pathname: '/studio/editor', search: '?new=1', key: 'k1' },
        ]}
      >
        <Editor />
      </MemoryRouter>,
    );
    await tick();
    first.unmount();
    open.mockClear();
    render(
      <MemoryRouter
        initialEntries={[
          { pathname: '/studio/editor', search: '?new=1', key: 'k1' },
        ]}
      >
        <Editor />
      </MemoryRouter>,
    );
    await tick();
    expect(open).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledWith({ kind: 'resume' }, { source: 'boot' });
  });
});
