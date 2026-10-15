import { describe, it, expect } from 'vitest';
import { noteEditorOriginTick } from '../noteEditorOrigin';

const BAR = 1920; // 4/4 at PPQ 480

const at = (...ticks: number[]) => ticks.map((startTick) => ({ startTick }));

describe('noteEditorOriginTick', () => {
  it('starts every editor at the clip’s own tick 0', () => {
    expect(noteEditorOriginTick(at(0, 480, 1920), BAR)).toBe(0);
    // A clip whose first note comes late (a rest at the front) still starts
    // at its own start, so its bar lines are its real bars.
    expect(noteEditorOriginTick(at(960, 2880), BAR)).toBe(0);
  });

  it('is 0 for an emptied clip, wherever the clip sits in the song', () => {
    // The old modal origin fell back to clip.startTick here, so the next note
    // drawn into a clip at bar 9 was stored eight bars late.
    expect(noteEditorOriginTick([], BAR)).toBe(0);
  });

  it('reaches back by whole bars for notes stored before the clip start', () => {
    expect(noteEditorOriginTick(at(-100, 0), BAR)).toBe(-BAR);
    expect(noteEditorOriginTick(at(-BAR), BAR)).toBe(-BAR);
    expect(noteEditorOriginTick(at(-BAR - 1, 480), BAR)).toBe(-2 * BAR);
    // 3/4: the editor's bar is three beats.
    expect(noteEditorOriginTick(at(-10), 1440)).toBe(-1440);
  });
});
