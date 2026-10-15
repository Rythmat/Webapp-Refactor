// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  backToMyWork,
  cancelOpen,
  dismissUpgradeLesson,
  retryOpen,
} from '@/daw/session/openSession';
import {
  INITIAL_SESSION_STATE,
  useSessionStore,
} from '@/daw/session/sessionStore';
import { installDomShims } from '@/daw/ui/__tests__/dom';
import { OpenErrorPanel } from '../OpenErrorPanel';
import { OpeningHost } from '../OpeningHost';
import { OpeningOverlay, overlayCopy } from '../OpeningOverlay';

vi.mock('@/daw/session/openSession', () => ({
  backToMyWork: vi.fn(() => Promise.resolve(null)),
  cancelOpen: vi.fn(),
  dismissUpgradeLesson: vi.fn(),
  retryOpen: vi.fn(() => Promise.resolve(null)),
}));
vi.mock('@/telemetry/hooks/useTelemetryProduct', () => ({
  trackPaywallViewed: vi.fn(),
}));

beforeAll(installDomShims);
beforeEach(() => {
  useSessionStore.setState({ ...INITIAL_SESSION_STATE });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const overlay = () => screen.queryByTestId('opening-overlay');

describe('OpeningOverlay', () => {
  it('dims quietly: no card, no buttons, but a screen reader hears it', () => {
    render(
      <OpeningOverlay
        mode="dim"
        label="Opening your last session…"
        waitingFor={null}
        cancellable={false}
        onCancel={() => {}}
      />,
    );
    const el = overlay();
    expect(el?.getAttribute('data-mode')).toBe('dim');
    // The live region is the line alone, never the container.
    expect(el?.getAttribute('role')).toBeNull();
    const live = screen.getByRole('status');
    expect(live.getAttribute('aria-live')).toBe('polite');
    expect(live.textContent).toBe('Opening your last session…');
    expect(screen.queryByTestId('opening-overlay-label')).toBeNull();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(el?.textContent).toBe('Opening your last session…');
    // The token scrim, never a colour literal.
    expect(el?.getAttribute('style')).toContain('var(--daw-bg)');
  });

  it('shows the card with the line, and Cancel only when cancellable', () => {
    const onCancel = vi.fn();
    const { rerender } = render(
      <OpeningOverlay
        mode="full"
        label="Opening ‘Midnight Groove’…"
        waitingFor={null}
        cancellable={false}
        onCancel={onCancel}
      />,
    );
    expect(screen.getByTestId('opening-overlay-label').textContent).toBe(
      'Opening ‘Midnight Groove’…',
    );
    expect(screen.queryByRole('button', { name: 'Cancel' })).toBeNull();
    // The line is the live region; the buttons are outside it.
    const live = screen.getByRole('status');
    expect(live).toBe(screen.getByTestId('opening-overlay-label'));

    rerender(
      <OpeningOverlay
        mode="full"
        label="Opening ‘Midnight Groove’…"
        waitingFor={null}
        cancellable
        onCancel={onCancel}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('waits for the host with Back to my work instead of Cancel', () => {
    const onBack = vi.fn();
    render(
      <OpeningOverlay
        mode="full"
        label="Joining session abcd1234…"
        waitingFor="host"
        cancellable
        onCancel={() => {}}
        onBackToMyWork={onBack}
      />,
    );
    expect(screen.getByTestId('opening-overlay-label').textContent).toBe(
      'Waiting for the host to open the session…',
    );
    expect(screen.queryByRole('button', { name: 'Cancel' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Back to my work' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('moves focus stranded in the editor (or on body) to its button', () => {
    const root = document.createElement('div');
    root.className = 'daw-root';
    const inEditor = document.createElement('button');
    root.appendChild(inEditor);
    document.body.appendChild(root);
    inEditor.focus();
    const { unmount } = render(
      <OpeningOverlay
        mode="full"
        label="x"
        waitingFor={null}
        cancellable
        onCancel={() => {}}
      />,
    );
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Cancel' }),
    );
    unmount();

    // Focus somewhere still usable (outside .daw-root) stays put.
    const outside = document.createElement('input');
    document.body.appendChild(outside);
    outside.focus();
    render(
      <OpeningOverlay
        mode="full"
        label="x"
        waitingFor={null}
        cancellable
        onCancel={() => {}}
      />,
    );
    expect(document.activeElement).toBe(outside);
    root.remove();
    outside.remove();
  });

  it('respects reduced motion on the spinner', () => {
    render(
      <OpeningOverlay
        mode="full"
        label="x"
        waitingFor={null}
        cancellable={false}
        onCancel={() => {}}
      />,
    );
    const spinner = overlay()?.querySelector('svg');
    expect(spinner?.getAttribute('class')).toContain(
      'motion-reduce:animate-none',
    );
  });

  it('words each wait when the open gave no line', () => {
    expect(overlayCopy(null, 'owner')).toBe('Signing you in…');
    expect(overlayCopy(null, 'token')).toBe('Signing you in…');
    expect(overlayCopy(null, 'plan')).toBe('Checking your plan…');
    expect(overlayCopy(null, 'save')).toBe('Finishing your save…');
    expect(overlayCopy(null, 'take')).toBe('Finishing your recording…');
    expect(overlayCopy('Joining session x…', 'host')).toBe(
      'Waiting for the host to open the session…',
    );
    expect(overlayCopy(null, null)).toBe('Opening…');
    expect(overlayCopy('Building your practice track…', null)).toBe(
      'Building your practice track…',
    );
  });
});

describe('OpenErrorPanel', () => {
  function renderPanel(retryable: boolean) {
    const onRetry = vi.fn();
    const onBack = vi.fn();
    render(
      <OpenErrorPanel
        open
        title="Couldn’t open the project"
        reason="You're offline. Check your connection, then try again."
        retryable={retryable}
        onRetry={onRetry}
        onBack={onBack}
      />,
    );
    return { onRetry, onBack };
  }

  it('is an alert dialog with one reason line, focus on Retry', () => {
    const { onRetry, onBack } = renderPanel(true);
    const panel = screen.getByTestId('open-error');
    expect(panel.getAttribute('role')).toBe('alertdialog');
    expect(screen.getByText('Couldn’t open the project')).toBeTruthy();
    expect(screen.getByTestId('open-error-reason').textContent).toBe(
      "You're offline. Check your connection, then try again.",
    );
    const retry = screen.getByRole('button', { name: 'Retry' });
    expect(document.activeElement).toBe(retry);
    expect(retry.getAttribute('data-variant')).toBe('primary');
    fireEvent.click(retry);
    expect(onRetry).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Back to my work' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('hides Retry when it can’t help; Back to my work is the primary', () => {
    renderPanel(false);
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
    const back = screen.getByRole('button', { name: 'Back to my work' });
    expect(document.activeElement).toBe(back);
    expect(back.getAttribute('data-variant')).toBe('primary');
  });

  it('takes Escape as Back to my work', () => {
    const { onBack, onRetry } = renderPanel(true);
    fireEvent.keyDown(screen.getByTestId('open-error'), { key: 'Escape' });
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onRetry).not.toHaveBeenCalled();
  });
});

describe('OpeningHost', () => {
  const host = () =>
    render(
      <MemoryRouter>
        <OpeningHost />
      </MemoryRouter>,
    );

  it('renders nothing while no open is running', () => {
    host();
    expect(overlay()).toBeNull();
    expect(screen.queryByTestId('open-error')).toBeNull();
  });

  it('follows the store: overlay mode, line and Cancel', () => {
    host();
    act(() => {
      useSessionStore.setState({
        phase: 'preparing',
        overlay: 'dim',
        label: 'Opening your last session…',
      });
    });
    expect(overlay()?.getAttribute('data-mode')).toBe('dim');
    act(() => {
      useSessionStore.setState({ overlay: 'full', cancellable: true });
    });
    expect(overlay()?.getAttribute('data-mode')).toBe('full');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(cancelOpen).toHaveBeenCalledTimes(1);
    act(() => {
      useSessionStore.setState({ phase: 'ready', overlay: 'none' });
    });
    expect(overlay()).toBeNull();
  });

  it('offers Back to my work during a host wait', () => {
    host();
    act(() => {
      useSessionStore.setState({
        phase: 'loading',
        overlay: 'full',
        waitingFor: 'host',
        label: 'Waiting for the host to open the session…',
      });
    });
    fireEvent.click(screen.getByRole('button', { name: 'Back to my work' }));
    expect(backToMyWork).toHaveBeenCalledTimes(1);
  });

  it('shows panel errors (not toast ones), with Retry and Back wired', () => {
    host();
    act(() => {
      useSessionStore.setState({
        error: {
          kind: 'not-found',
          message: 'That project could not be found.',
          retryable: false,
          surface: 'toast',
        },
      });
    });
    expect(screen.queryByTestId('open-error')).toBeNull();

    act(() => {
      useSessionStore.setState({
        phase: 'failed',
        intent: {
          kind: 'collab',
          code: 'abcd',
          host: false,
          jamImport: false,
          awaitHost: true,
        },
        retryIntent: {
          kind: 'collab',
          code: 'abcd',
          host: false,
          jamImport: false,
          awaitHost: true,
        },
        error: {
          kind: 'session-ended',
          message: 'That session has ended.',
          retryable: true,
          surface: 'panel',
        },
      });
    });
    expect(screen.getByTestId('open-error')).toBeTruthy();
    expect(screen.getByText('Couldn’t join the session')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(retryOpen).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Back to my work' }));
    expect(backToMyWork).toHaveBeenCalledTimes(1);
  });

  it('shows the Premium lesson prompt and clears it on close', () => {
    host();
    act(() => {
      useSessionStore.setState({ upgradeLessonId: 'some-lesson' });
    });
    expect(
      screen.getByText('This lesson uses Prism, part of Premium'),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
    expect(dismissUpgradeLesson).toHaveBeenCalledTimes(1);
  });
});
