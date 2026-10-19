// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const reportCompletion = vi.hoisted(() => vi.fn());
vi.mock('@/features/classroom/msp', async () => ({
  studioTutorialActivityRef: (
    await vi.importActual<typeof import('@/features/classroom/msp')>(
      '@/features/classroom/msp',
    )
  ).studioTutorialActivityRef,
  useMspModuleCompletion: () => ({ reportCompletion }),
}));

import { useStore } from '@/daw/store';
import { useTutorialProgressStore } from '@/features/tutorials/useTutorialProgressStore';
import { GLIDE_MS, readingMs } from '../demo/demoTypes';
import { TutorialLayer } from '../TutorialLayer';
import { getTutorial } from '../tutorials';
import { anchorEl, stubReducedMotion } from './anchorTestUtils';

// ── A lesson step's "watch me" demo, in the lesson layer ───────────────────
// Studio Basics' first lesson, over stand-ins for the anchors it uses (the
// view tabs, which switch the view on mousedown as Radix's do, and the
// mixer): the demo plays as the step arrives, behind a blocker, with the
// coach card in its Watch state; the step's check is armed only on the
// student's turn, so the demo's own click on Mix doesn't pass "open Mix".
// Skip and Show me again; a course lesson's end card and Next; a step with
// no demo as before.

const LESSON = 'studio-basics-your-tracks';
const s = () => useStore.getState();
const steps = () => getTutorial(LESSON)!.steps;

const MIX = { top: 10, left: 400, width: 50, height: 24 };
const CREATE = { top: 10, left: 330, width: 60, height: 24 };

function studioAnchors() {
  const mix = anchorEl('view-switch-studio', MIX, { tag: 'button' });
  mix.addEventListener('mousedown', () => s().setCurrentView('studio'));
  const create = anchorEl('view-switch-arrange', CREATE, { tag: 'button' });
  create.addEventListener('mousedown', () => s().setCurrentView('arrange'));
  anchorEl('mixer-section', { top: 200, left: 100, width: 800, height: 300 });
  anchorEl('view-switch-score', { ...MIX, left: 470 }, { tag: 'button' });
  anchorEl('add-track-button', { top: 120, left: 20, width: 90, height: 24 });
  return { mix, create };
}

/** Plays the step's whole demo (each beat's glide, reading time and pause). */
const DEMO_MS = 20_000;
const advance = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });

const card = () => screen.getByTestId('tutorial-coach-card');
const blocker = () => screen.queryByTestId('tutorial-demo-blocker');

beforeEach(() => {
  vi.useFakeTimers();
  stubReducedMotion(false);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  useTutorialProgressStore.setState({ completedAt: {} });
  act(() => {
    s().quitTutorial();
    s().setCurrentView('arrange');
  });
});
afterEach(() => {
  act(() => s().quitTutorial());
  cleanup();
  document.body.innerHTML = '';
  reportCompletion.mockClear();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('a step with a demo', () => {
  it('plays the demo first, behind a blocker, with the card in its Watch state', async () => {
    studioAnchors();
    act(() => s().startTutorial(LESSON));
    render(<TutorialLayer />);

    expect(s().tutorialDemoPhase).toBe('watch');
    expect(within(card()).getByText('Watch')).toBeInTheDocument();
    expect(
      within(card()).getByRole('button', { name: /Skip/ }),
    ).toBeInTheDocument();
    expect(within(card()).queryByRole('button', { name: /Next/ })).toBeNull();
    expect(blocker()).not.toBeNull();
    // A course lesson says where it is in the course.
    expect(screen.getByTestId('tutorial-lesson-place')).toHaveTextContent(
      'Lesson 1 of 9',
    );

    // The cursor goes to Mix, the callout says what it is, and it clicks.
    const first = steps()[0].demo![0];
    await advance(GLIDE_MS + 10);
    const cursor = screen.getByTestId('tutorial-demo-cursor');
    expect(cursor.dataset.x).toBe('425');
    expect(cursor.dataset.y).toBe('22');
    expect(screen.getByTestId('tutorial-demo-callout')).toHaveTextContent(
      first.caption,
    );
    expect(screen.getByTestId('tutorial-demo-caption')).toHaveTextContent(
      first.caption,
    );
    await advance(readingMs(first.caption));
    expect(s().currentView).toBe('studio');
    // The demo opened Mix, and that doesn't pass "open Mix".
    expect(s().tutorialStepStatus).toBe('waiting');

    await advance(DEMO_MS);
    // It left the Studio as it found it, and it's the student's turn.
    expect(s().currentView).toBe('arrange');
    expect(s().tutorialDemoPhase).toBe('turn');
    expect(blocker()).toBeNull();
    expect(screen.queryByTestId('tutorial-demo-stage')).toBeNull();
    expect(within(card()).getByText(/Your turn/)).toBeInTheDocument();
    expect(
      within(card()).getByRole('button', { name: /Show me again/ }),
    ).toBeInTheDocument();
    expect(s().tutorialStepIndex).toBe(0);

    // Now the student's move passes it.
    act(() => s().setCurrentView('studio'));
    expect(s().tutorialStepStatus).toBe('done');
    await advance(1000);
    expect(s().tutorialStepIndex).toBe(1);
  });

  it('skips to the student’s turn, leaving the Studio as the demo would', async () => {
    studioAnchors();
    act(() => s().startTutorial(LESSON));
    render(<TutorialLayer />);
    const first = steps()[0].demo![0];
    await advance(GLIDE_MS + readingMs(first.caption) + 10);
    expect(s().currentView).toBe('studio');

    fireEvent.click(within(card()).getByRole('button', { name: /Skip/ }));
    await advance(1000);
    expect(s().tutorialDemoPhase).toBe('turn');
    // The demo's last beat (back to Create) still ran.
    expect(s().currentView).toBe('arrange');
    expect(s().tutorialStepStatus).toBe('waiting');
    expect(blocker()).toBeNull();
  });

  it('shows the demo again on request, its check unarmed until it ends', async () => {
    studioAnchors();
    act(() => s().startTutorial(LESSON));
    render(<TutorialLayer />);
    await advance(DEMO_MS);
    expect(s().tutorialDemoPhase).toBe('turn');

    fireEvent.click(
      within(card()).getByRole('button', { name: /Show me again/ }),
    );
    expect(s().tutorialDemoPhase).toBe('watch');
    expect(blocker()).not.toBeNull();
    // Whatever opens Mix while it replays passes nothing.
    act(() => s().setCurrentView('studio'));
    await advance(100);
    expect(s().tutorialStepStatus).toBe('waiting');

    await advance(DEMO_MS);
    expect(s().tutorialDemoPhase).toBe('turn');
    expect(s().currentView).toBe('arrange');
    // Armed again, against the Studio the replay left.
    act(() => s().setCurrentView('studio'));
    expect(s().tutorialStepStatus).toBe('done');
  });

  it('passes over a beat whose target isn’t on screen, and never hangs', async () => {
    // No mixer, no view tabs: nothing to point at.
    act(() => s().startTutorial(LESSON));
    render(<TutorialLayer />);
    expect(s().tutorialDemoPhase).toBe('watch');
    await advance(3 * 1600 + 3 * 100);
    expect(s().tutorialDemoPhase).toBe('turn');
    expect(screen.queryByTestId('tutorial-demo-callout')).toBeNull();
  });

  it('ripples on a click, and under reduced motion jumps with no ripple, captions kept', async () => {
    studioAnchors();
    act(() => s().startTutorial(LESSON));
    const { unmount } = render(<TutorialLayer />);
    const first = steps()[0].demo![0];
    await advance(GLIDE_MS + readingMs(first.caption) + 10);
    expect(screen.getByTestId('tutorial-demo-ripple')).toBeInTheDocument();
    unmount();

    act(() => {
      s().quitTutorial();
      s().setCurrentView('arrange');
    });
    stubReducedMotion(true);
    act(() => s().startTutorial(LESSON));
    render(<TutorialLayer />);
    // No glide: the callout is there as the cursor is.
    await advance(10);
    expect(screen.getByTestId('tutorial-demo-callout')).toHaveTextContent(
      first.caption,
    );
    await advance(readingMs(first.caption));
    expect(s().currentView).toBe('studio');
    expect(screen.queryByTestId('tutorial-demo-ripple')).toBeNull();
  });

  it('is the student’s turn at once on a step resumed with its draft', () => {
    studioAnchors();
    act(() => s().resumeTutorial(LESSON, 0));
    render(<TutorialLayer />);
    expect(s().tutorialDemoPhase).toBe('turn');
    expect(blocker()).toBeNull();
    expect(
      within(card()).getByRole('button', { name: /Show me again/ }),
    ).toBeInTheDocument();
    act(() => s().setCurrentView('studio'));
    expect(s().tutorialStepStatus).toBe('done');
  });
});

describe('a step without a demo', () => {
  it('runs as it always has: no Watch, no blocker, its check armed at once', () => {
    act(() => {
      s().startTutorial('make-first-track');
      s().goToTutorialStep(1); // open-prism: channelStripTab === 'prism'
    });
    render(<TutorialLayer />);
    expect(s().tutorialDemoPhase).toBe('turn');
    expect(blocker()).toBeNull();
    expect(within(card()).queryByText('Watch')).toBeNull();
    expect(within(card()).queryByText(/Your turn/)).toBeNull();
    expect(
      within(card()).queryByRole('button', { name: /Show me again/ }),
    ).toBeNull();
    expect(screen.queryByTestId('tutorial-lesson-place')).toBeNull();
    // Its precondition opened the Prism tab, which passes it quietly.
    expect(s().tutorialStepStatus).toBe('done');
    expect(s().tutorialStepCelebrate).toBe(false);
  });

  it('closes a lesson outside a course when it ends, with no end card', async () => {
    const last = getTutorial('pop-flip-a-sample')!.steps.length - 1;
    act(() => s().resumeTutorial('pop-flip-a-sample', last));
    render(<TutorialLayer />);
    act(() => s().completeTutorialStep(false));
    await advance(1000);
    expect(s().activeTutorialId).toBeNull();
    expect(s().finishedTutorialId).toBeNull();
    expect(screen.queryByTestId('tutorial-end-card')).toBeNull();
  });
});

describe('a course lesson’s end', () => {
  it('offers the next lesson, on the same project', async () => {
    studioAnchors();
    act(() => {
      s().addTrack('midi', 'piano-sampler', 'My keys');
      s().resumeTutorial(LESSON, steps().length - 1);
    });
    const tracks = s().tracks;
    render(<TutorialLayer />);
    fireEvent.click(within(card()).getByRole('button', { name: /Finish/ }));

    const end = screen.getByTestId('tutorial-end-card');
    expect(end).toHaveTextContent('Studio Basics');
    expect(end).toHaveTextContent('Lesson 1 of 9');
    expect(end).toHaveTextContent('Your Tracks');
    expect(s().activeTutorialId).toBeNull();
    expect(s().finishedTutorialId).toBe(LESSON);
    expect(useTutorialProgressStore.getState().completedAt[LESSON]).toEqual(
      expect.any(Number),
    );
    expect(reportCompletion).toHaveBeenCalledWith(undefined, {
      module: 'studio',
      activityRef: `studio:tutorial:${LESSON}`,
    });

    fireEvent.click(
      within(end).getByRole('button', { name: /Next: Add a Track/ }),
    );
    expect(s().activeTutorialId).toBe('studio-basics-add-a-track');
    expect(s().finishedTutorialId).toBeNull();
    // No reset: the student's project is the one the next lesson runs on.
    expect(s().tracks).toBe(tracks);
    expect(screen.queryByTestId('tutorial-end-card')).toBeNull();
    expect(screen.getByTestId('tutorial-lesson-place')).toHaveTextContent(
      'Lesson 2 of 9',
    );
  });

  it('ends the course on its last lesson: Back to the course or Done', () => {
    act(() => s().resumeTutorial('studio-basics-save-and-export', 0));
    render(<TutorialLayer />);
    fireEvent.click(within(card()).getByRole('button', { name: /Finish/ }));
    const end = screen.getByTestId('tutorial-end-card');
    expect(end).toHaveTextContent('Course complete');
    expect(end).toHaveTextContent('Lesson 9 of 9');
    expect(within(end).queryByRole('button', { name: /Next:/ })).toBeNull();
    expect(
      within(end).getByRole('button', { name: 'Back to the course' }),
    ).toBeInTheDocument();
    fireEvent.click(within(end).getByRole('button', { name: 'Done' }));
    expect(s().finishedTutorialId).toBeNull();
    expect(screen.queryByTestId('tutorial-end-card')).toBeNull();
  });

  it('goes back to the course’s listing on the Production tab', () => {
    function Where() {
      return <output aria-label="where">{useLocation().pathname}</output>;
    }
    act(() => s().resumeTutorial('studio-basics-record', 0));
    render(
      <MemoryRouter initialEntries={['/studio/editor']}>
        <Routes>
          <Route path="*" element={<TutorialLayer />} />
        </Routes>
        <Where />
      </MemoryRouter>,
    );
    fireEvent.click(within(card()).getByRole('button', { name: /Finish/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Back to the course' }));
    expect(screen.getByLabelText('where')).toHaveTextContent(
      '/studio/production',
    );
    expect(s().finishedTutorialId).toBeNull();
  });
});
