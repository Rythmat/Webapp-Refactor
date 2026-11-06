import { describe, expect, it } from 'vitest';
import type { GuitarStepStatus } from '@/curriculum/guitar/layout/types';
import { resumeScreen } from '../GuidedPlayer';
import { popLevel1Lesson } from '../lessons';
import { chapterScreens } from '../types';

const screens = chapterScreens(popLevel1Lesson()[0]);
const passing =
  (...done: string[]) =>
  (step: string): GuitarStepStatus =>
    done.includes(step) ? 'passed' : 'todo';

describe('where a lesson opens', () => {
  it('opens at the hook when nothing’s done', () => {
    expect(resumeScreen(screens, passing())).toBe(0);
  });

  it('opens on the first screen with something still to play', () => {
    const at = resumeScreen(screens, passing('A1.1', 'A1.2', 'A1.3'));
    expect(screens[at].id).toBe('three-notes');
  });

  it('opens on a part-done screen', () => {
    const at = resumeScreen(screens, passing('A1.1'));
    expect(screens[at].id).toBe('five-notes');
  });

  it('goes back to the top when it’s all been done', () => {
    expect(
      resumeScreen(screens, passing('A1.1', 'A1.2', 'A1.3', 'A2.1', 'A2.2')),
    ).toBe(0);
  });
});
