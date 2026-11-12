// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import {
  initialPlayer,
  playerReducer,
} from '@/curriculum/audio/player/playerMachine';
import { isFocusPath } from '@/layouts/DashboardLayout/focusPaths';
import { isGuidedLessonPath } from '../guidedPaths';
import { markGuidedSteps, readGuidedSteps } from '../guidedProgress';

describe('which lessons take the whole window', () => {
  it.each([
    '/learn/keyboard/genre/pop/1',
    '/learn/keyboard/ionian/c',
    '/learn/keyboard/ionian/f-sharp',
    '/learn/guitar/ionian/g',
  ])('%s does', (path) => {
    expect(isGuidedLessonPath(path)).toBe(true);
    expect(isFocusPath(path)).toBe(true);
  });

  it.each([
    '/learn',
    '/learn/keyboard/genre/pop',
    '/learn/keyboard/genre/pop/2',
    '/learn/keyboard/genre/funk/1',
    '/learn/keyboard/dorian/c',
    '/learn/keyboard/theory/diatonic',
    '/learn/bass/ionian/c',
  ])('%s doesn’t', (path) => {
    expect(isGuidedLessonPath(path)).toBe(false);
  });
});

describe('what a guided lesson has marked', () => {
  beforeEach(() => localStorage.clear());

  it('keeps each scope’s steps apart, and each step once', () => {
    markGuidedSteps('pop:1:c', ['A1.1']);
    markGuidedSteps('pop:1:c', ['A1.1', 'A1.2']);
    markGuidedSteps('pop:1:g', ['A1.3']);
    expect([...readGuidedSteps('pop:1:c')]).toEqual(['A1.1', 'A1.2']);
    expect([...readGuidedSteps('pop:1:g')]).toEqual(['A1.3']);
  });

  it('reads nothing from a broken record', () => {
    localStorage.setItem('guided_steps_x', '{');
    expect(readGuidedSteps('x').size).toBe(0);
  });
});

describe('moving on to the next part of a screen', () => {
  it('stays on the screen, ready for a fresh try', () => {
    let state = initialPlayer(2);
    state = playerReducer(state, { type: 'verdict', screenId: 's', ok: true });
    expect(state.phase).toBe('right');
    state = playerReducer(state, { type: 'nextPart' });
    expect(state).toMatchObject({ index: 2, phase: 'acting', attempts: 0 });
    // A first try on the next part still counts as one.
    expect(state.firstTry).toEqual(['s']);
  });
});
