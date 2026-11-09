import { describe, expect, it } from 'vitest';
import { ARCANUM_LEVELS } from '../levels';
import {
  currentLevel,
  EMPTY_PROGRESS,
  levelAfter,
  levelCleared,
  levelOpen,
  levelTasks,
  modeOpen,
  nextTask,
  readProgress,
  withCleared,
  type ArcanumProgress,
} from '../progress';

const clearLevel = (
  p: ArcanumProgress,
  mode: 'novice' | 'pro',
  level: 1 | 2 | 3 | 4 | 5 | 6,
) => levelTasks(mode, level).reduce(withCleared, p);

describe('Major Arcanum progress', () => {
  it('asks for Melody and Chords in every key of a level', () => {
    expect(levelTasks('novice', 2).map((t) => `${t.keyPc}:${t.part}`)).toEqual([
      '7:melody',
      '7:chords',
      '5:melody',
      '5:chords',
    ]);
    let p = EMPTY_PROGRESS;
    expect(nextTask(p, 'novice', 2)).toMatchObject({
      keyPc: 7,
      part: 'melody',
    });
    p = withCleared(p, { mode: 'novice', level: 2, keyPc: 7, part: 'melody' });
    expect(nextTask(p, 'novice', 2)).toMatchObject({
      keyPc: 7,
      part: 'chords',
    });
    p = withCleared(p, { mode: 'novice', level: 2, keyPc: 7, part: 'chords' });
    expect(levelCleared(p, 'novice', 2)).toBe(false);
    expect(nextTask(p, 'novice', 2)).toMatchObject({
      keyPc: 5,
      part: 'melody',
    });
  });

  it('opens a level when the one before is cleared, and a mode when the last is', () => {
    let p = EMPTY_PROGRESS;
    expect(levelOpen(p, 'novice', 1)).toBe(true);
    expect(levelOpen(p, 'novice', 2)).toBe(false);
    p = clearLevel(p, 'novice', 1);
    expect(levelOpen(p, 'novice', 2)).toBe(true);
    expect(modeOpen(p, 'pro')).toBe(false);
    for (const level of ARCANUM_LEVELS) p = clearLevel(p, 'novice', level);
    expect(modeOpen(p, 'pro')).toBe(true);
    expect(currentLevel(p)).toEqual({ mode: 'pro', level: 1 });
    expect(levelAfter('novice', 6)).toEqual({ mode: 'pro', level: 1 });
    expect(levelAfter('maestro', 6)).toBeNull();
  });

  it('reads saved progress defensively', () => {
    expect(readProgress(null)).toEqual(EMPTY_PROGRESS);
    expect(
      readProgress({
        cleared: ['novice:1:0:melody', 'novice:1:0:melody', 'junk', 4],
      }),
    ).toEqual({ version: 1, cleared: ['novice:1:0:melody'] });
  });
});
