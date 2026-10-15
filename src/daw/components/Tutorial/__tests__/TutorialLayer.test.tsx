// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

const reportCompletion = vi.hoisted(() => vi.fn());
vi.mock('@/features/classroom/msp', async () => ({
  studioTutorialActivityRef: (
    await vi.importActual<typeof import('@/features/classroom/msp')>(
      '@/features/classroom/msp',
    )
  ).studioTutorialActivityRef,
  useMspModuleCompletion: () => ({ reportCompletion }),
}));

import { installDawCss, resolvedBackground } from '@/daw/__tests__/dawTokens';
import { useStore } from '@/daw/store';
import { TutorialLayer } from '../TutorialLayer';
import { getTutorial } from '../tutorials';

// ── The lesson overlay inherits the DAW tokens (practice-tutorial-24) ───────
// The overlay portals to <body>. It used to copy seven --color-* values from
// .daw-root onto itself in an effect, so its first frame had none and a theme
// change mid-lesson never reached it. It now holds body.daw-active itself
// (useDawBodyTokens) and inherits the palette from there, so the coach card
// never depends on anything else in the editor having set the class.

let removeCss: () => void;
beforeAll(() => {
  removeCss = installDawCss();
});
afterAll(() => removeCss());
afterEach(() => {
  act(() => useStore.getState().quitTutorial());
  cleanup();
  reportCompletion.mockClear();
  vi.useRealTimers();
});

describe('TutorialLayer', () => {
  it('holds the DAW tokens itself and copies none onto its portal', () => {
    // As in the editor: DawApp's .daw-root holds the layer, which portals out
    // of it. Nothing else in this test sets body.daw-active.
    const dawRoot = document.createElement('div');
    dawRoot.className = 'daw-root';
    document.body.appendChild(dawRoot);

    act(() => useStore.getState().startTutorial('make-first-track'));
    const { unmount } = render(<TutorialLayer />, { container: dawRoot });
    expect(document.body).toHaveClass('daw-active');

    const card = screen
      .getByRole('button', { name: 'Quit tutorial' })
      .closest<HTMLElement>('div[style*="position: fixed"]')!;
    const overlay = card.parentElement!;
    expect(overlay.closest('.daw-root')).toBeNull();
    expect(overlay.parentElement).toBe(document.body);

    const inlineTokens = Array.from(overlay.style).filter((name) =>
      name.startsWith('--'),
    );
    expect(inlineTokens).toEqual([]);
    expect(resolvedBackground(card)).toBe('#1a1a1a');

    // Leaving the editor takes the class off the rest of the app.
    unmount();
    expect(document.body).not.toHaveClass('daw-active');
    dawRoot.remove();
  });
});

// ── A step's preconditions, once (milestone 1.15) ──────────────────────────
// A step sets its view up as it arrives. The layer mounting again over the
// same step (a return to the editor), or a lesson resumed with its draft,
// leaves the student's view as it is: re-applying the step's tab there
// rewrote the restored view (the harness's R2, R5 and R12 channel strip
// losses).

const LESSON = 'make-first-track';
/** make-first-track's free-form 'experiment' step: it opens the Prism tab. */
const EXPERIMENT = 6;
const s = () => useStore.getState();

describe('TutorialLayer preconditions', () => {
  it('applies a step’s preconditions as it arrives, and not again on a remount', () => {
    act(() => {
      s().startTutorial(LESSON);
      s().goToTutorialStep(EXPERIMENT);
      s().setChannelStripTab(null);
    });
    const first = render(<TutorialLayer />);
    expect(s().channelStripTab).toBe('prism');
    expect(s().tutorialStepPrepared).toBe(true);

    // The student opens another tab, leaves the editor and comes back.
    act(() => s().setChannelStripTab('fx'));
    first.unmount();
    render(<TutorialLayer />);
    expect(s().channelStripTab).toBe('fx');
  });

  it('leaves a resumed step’s view as its draft kept it', () => {
    act(() => {
      s().setChannelStripTab('fx');
      s().resumeTutorial(LESSON, EXPERIMENT);
    });
    render(<TutorialLayer />);
    expect(s().tutorialStepIndex).toBe(EXPERIMENT);
    expect(s().channelStripTab).toBe('fx');
    screen.getByRole('button', { name: 'Quit tutorial' });
  });

  it('applies the next step’s preconditions when the student moves on', () => {
    act(() => {
      s().resumeTutorial(LESSON, EXPERIMENT - 1);
      s().setChannelStripTab('fx');
    });
    render(<TutorialLayer />);
    expect(s().channelStripTab).toBe('fx');
    act(() => s().goToTutorialStep(EXPERIMENT));
    expect(s().channelStripTab).toBe('prism');
  });
});

describe('TutorialLayer completion', () => {
  it('reports completion for its own lesson only (practice-tutorial-09)', async () => {
    vi.useFakeTimers();
    const last = getTutorial(LESSON)!.steps.length - 1;
    act(() => s().resumeTutorial(LESSON, last));
    render(<TutorialLayer />);
    act(() => s().completeTutorialStep(false));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(reportCompletion).toHaveBeenCalledTimes(1);
    expect(reportCompletion).toHaveBeenCalledWith(undefined, {
      module: 'studio',
      activityRef: `studio:tutorial:${LESSON}`,
    });
    expect(s().activeTutorialId).toBeNull();
  });
});
