import { describe, expect, it } from 'vitest';
import type { NoteEvent } from '../GenrePianoRoll';
import { learnNoteStyles } from '../learnNoteStyles';

// Pins what LearnNotationView painted before this was pulled out of it, so the
// staff reads exactly as it did and the TAB reads the same way.

const KEY = '#ff8800';
const note = (id: string, startTicks: number, color?: string): NoteEvent => ({
  id,
  pitchName: 'C4',
  midi: 60,
  startTicks,
  durationTicks: 480,
  ...(color ? { color } : {}),
});
const events = [note('a', 0, `${KEY}b3`), note('b', 480), note('c', 960)];

describe('learnNoteStyles', () => {
  describe('in time', () => {
    it('colours a note played inside its span and lights the one under the playhead', () => {
      const styles = learnNoteStyles(events, {
        inTime: true,
        performanceMeta: { a: { startTick: 40 } },
        playheadTick: 500,
        keyColor: KEY,
      });
      expect([...styles]).toEqual([
        ['a', { color: `${KEY}b3` }],
        ['b', { color: KEY, glow: true }],
      ]);
    });

    it("doesn't credit a note played outside its span", () => {
      const styles = learnNoteStyles(events, {
        inTime: true,
        performanceMeta: { c: { startTick: 200 } },
        playheadTick: -480,
      });
      expect(styles.size).toBe(0);
    });

    it('lights both notes on a shared boundary tick', () => {
      const styles = learnNoteStyles(events, {
        inTime: true,
        playheadTick: 480,
        keyColor: KEY,
      });
      expect([...styles.keys()]).toEqual(['a', 'b']);
    });

    it('marks a note the playhead passed unplayed only when asked (guitar TAB)', () => {
      const missed = { color: 'rgba(255, 255, 255, 0.3)' };
      const state = {
        inTime: true,
        performanceMeta: { a: { startTick: 40 } },
        playheadTick: 1000,
        keyColor: KEY,
      };
      // By default a passed note keeps its plain look, as the staff draws it.
      expect([...learnNoteStyles(events, state)]).toEqual([
        ['a', { color: `${KEY}b3` }],
        ['c', { color: KEY, glow: true }],
      ]);
      expect([...learnNoteStyles(events, { ...state, missed })]).toEqual([
        ['a', { color: `${KEY}b3` }],
        ['b', missed],
        ['c', { color: KEY, glow: true }],
      ]);
      // Out of time there is no playhead to pass a note.
      expect(
        learnNoteStyles(events, { ...state, inTime: false, missed }).size,
      ).toBe(0);
    });

    it('falls back to the accent colour without a key colour', () => {
      const styles = learnNoteStyles(events, {
        inTime: true,
        performanceMeta: { b: { startTick: 480 } },
        playheadTick: 960,
      });
      expect(styles.get('b')).toEqual({ color: '#7ecfcf' });
      expect(styles.get('c')).toEqual({ color: '#7ecfcf', glow: true });
    });
  });

  describe('out of time', () => {
    it('colours completed notes and lights the current chord, ignoring the playhead', () => {
      const styles = learnNoteStyles(events, {
        inTime: false,
        noteHoldMeta: {
          a: { isCompleted: true, isCurrentChord: false, holdProgress: 1 },
          b: { isCompleted: false, isCurrentChord: true, holdProgress: 0.4 },
          c: { isCompleted: false, isCurrentChord: false, holdProgress: 0 },
        },
        performanceMeta: { c: { startTick: 960 } },
        playheadTick: 960,
        keyColor: KEY,
      });
      expect([...styles]).toEqual([
        ['a', { color: `${KEY}b3` }],
        ['b', { color: KEY, glow: true }],
      ]);
    });

    it('draws nothing before the lesson has started', () => {
      expect(
        learnNoteStyles(events, { inTime: false, playheadTick: 0 }).size,
      ).toBe(0);
    });
  });
});
