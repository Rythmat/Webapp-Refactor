// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { useStore } from '@/daw/store';
import { startCourseInPlace, startLessonInPlace } from '../startLessonInPlace';

// ── A lesson on the song that is open ──────────────────────────────────────
// "Learn the Studio with this song" (the band's practice screen) starts
// Studio Basics on the student's own project: no reset, the practice session
// kept for the way back, and the lesson on Create.

const s = () => useStore.getState();

beforeEach(() => {
  useStore.setState(useStore.getInitialState(), true);
});

describe('starting a lesson in place', () => {
  it('runs the course’s first lesson on the open project, from the practice screen', () => {
    s().addTrack('midi', 'piano-sampler', 'My chords');
    s().setPracticeSession({ kind: 'theory' } as never);
    s().setCurrentView('practice');
    const tracks = s().tracks;
    const session = s().practiceSession;

    startCourseInPlace('studio-basics');

    expect(s().activeTutorialId).toBe('studio-basics-your-tracks');
    expect(s().tutorialStepIndex).toBe(0);
    expect(s().currentView).toBe('arrange');
    // Nothing reset: the same song, and the practice screen to go back to.
    expect(s().tracks).toBe(tracks);
    expect(s().practiceSession).toBe(session);
  });

  it('leaves the view alone outside the practice screen', () => {
    s().setCurrentView('score');
    startLessonInPlace('studio-basics-score');
    expect(s().activeTutorialId).toBe('studio-basics-score');
    expect(s().currentView).toBe('score');
  });

  it('replaces a finished lesson’s end card', () => {
    s().startTutorial('studio-basics-your-tracks');
    s().finishTutorial();
    expect(s().finishedTutorialId).toBe('studio-basics-your-tracks');
    startCourseInPlace('studio-basics');
    expect(s().finishedTutorialId).toBeNull();
    expect(s().activeTutorialId).toBe('studio-basics-your-tracks');
  });
});
