// @vitest-environment jsdom
/**
 * Studio Basics 6 · The Score, on the course's song. Each step's check is
 * armed as the lesson layer arms it: it doesn't pass then, and it passes once
 * the student's move lands in the store (scoreToSaveTestUtils.ts).
 *
 * Run: npx vitest run src/daw/components/Tutorial/studioBasics/__tests__/score.test.ts
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { printSheet } from '@/daw/commands/projectCommands';
import { mintNoteId } from '@/daw/model/noteIds';
import {
  arm,
  describeLessonConventions,
  openDemoSong,
  s,
  writeEvents,
} from './scoreToSaveTestUtils';

const SCORE = 'studio-basics-score';

beforeEach(openDemoSong);
afterEach(() => vi.restoreAllMocks());

describe('the course’s song, for the Score', () => {
  it('has four tracks of notes, each note with its own id', () => {
    expect(s().tracks.map((t) => t.name)).toEqual([
      'Melody',
      'Chords',
      'Bass',
      'Drums',
    ]);
    // The Score's checks read each note's own id.
    expect(
      s().tracks.every((t) =>
        t.midiClips.every((c) => c.events.every((e) => !!e.id)),
      ),
    ).toBe(true);
    // Add notes is off, so turning it on is a real move.
    expect(s().scoreNoteInput).toBe(false);
  });
});

describe('The Score', () => {
  it('open-score passes once the Score is open', () => {
    const { passes } = arm(SCORE, 'open-score');
    expect(s().currentView).toBe('arrange');
    expect(passes()).toBe(false);
    s().setCurrentView('leadsheet');
    expect(passes()).toBe(false);
    s().setCurrentView('score');
    expect(passes()).toBe(true);
  });

  it('add-notes-on passes once Add notes is on', () => {
    const { passes } = arm(SCORE, 'add-notes-on');
    expect(passes()).toBe(false);
    s().setScoreNoteInput(true);
    expect(passes()).toBe(true);
  });

  it('add-a-note passes for a new note, even one written over another', () => {
    s().setScoreNoteInput(true);
    let { passes } = arm(SCORE, 'add-a-note');
    expect(passes()).toBe(false);
    // A note that changes, or one taken away, is not a new note.
    writeEvents('Melody', (events) => [
      { ...events[0], note: events[0].note + 1 },
      ...events.slice(2),
    ]);
    expect(passes()).toBe(false);
    // Note input overwrites what starts under the new note: one goes, one
    // comes, and the count stays the same.
    ({ passes } = arm(SCORE, 'add-a-note'));
    writeEvents('Melody', ([first, ...rest]) => [
      { ...first, id: mintNoteId(), note: 79 },
      ...rest,
    ]);
    expect(passes()).toBe(true);
  });

  it('move-the-note passes when a note’s pitch or length changes', () => {
    let { passes } = arm(SCORE, 'move-the-note');
    expect(passes()).toBe(false);
    // A new note is not a changed one.
    writeEvents('Melody', (events) => [
      ...events,
      { ...events[0], id: mintNoteId(), startTick: 7200 },
    ]);
    expect(passes()).toBe(false);
    // ↑: the same note, a step higher.
    writeEvents('Melody', ([first, ...rest]) => [
      { ...first, note: first.note + 1 },
      ...rest,
    ]);
    expect(passes()).toBe(true);
    // A new length counts too.
    ({ passes } = arm(SCORE, 'move-the-note'));
    writeEvents('Bass', ([first, ...rest]) => [
      { ...first, durationTicks: first.durationTicks / 2 },
      ...rest,
    ]);
    expect(passes()).toBe(true);
  });

  it('add-notes-off passes once Add notes is off', () => {
    s().setScoreNoteInput(true);
    const { passes } = arm(SCORE, 'add-notes-off');
    expect(passes()).toBe(false);
    s().setScoreNoteInput(false);
    expect(passes()).toBe(true);
  });

  it('print passes when the Score’s print dialog opens, not the lead sheet’s', () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    const { passes } = arm(SCORE, 'print');
    expect(passes()).toBe(false);
    printSheet('printLeadSheet');
    expect(passes()).toBe(false);
    printSheet('printScore');
    expect(passes()).toBe(true);
    expect(print).toHaveBeenCalledTimes(2);
  });
});

describeLessonConventions(SCORE);
