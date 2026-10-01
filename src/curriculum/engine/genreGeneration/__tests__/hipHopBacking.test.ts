import { describe, expect, it } from 'vitest';
import type { ActivityStepV2, BackingStyle } from '../../../types/activity.v2';
import { buildBackingNotes } from '../backingPatterns';

const step = (
  chordSymbols: string[],
  grooveId: string,
  backing_style: BackingStyle,
): ActivityStepV2 =>
  ({
    backing_parts: {
      engine_generates: ['drums', 'bass', 'chords'],
      student_plays: [],
    },
    chordSymbols,
    grooveId,
    backing_style,
  }) as unknown as ActivityStepV2;

const part = (notes: ReturnType<typeof buildBackingNotes>, p: string) =>
  notes.filter((n) => n.part === p).sort((a, b) => a.onset - b.onset);

describe('Hip Hop play-along backing', () => {
  it('plays the named drum pattern', () => {
    const notes = buildBackingNotes(
      step(['Cm'], 'trap_a', {}),
      60,
      1,
      'l1a',
      [],
      'hip-hop',
    );
    // Trap A bar 1: kick on 1, the "and" of 3 and the "a" of 4 (steps 0, 10, 13).
    const kicks = part(notes, 'drums')
      .filter((n) => n.note === 36 && n.onset < 1920)
      .map((n) => n.onset / 120);
    expect(kicks).toEqual([0, 10, 13]);
  });

  it('steps the bass down E → D, never up a 7th (D-033)', () => {
    const notes = buildBackingNotes(
      step(['Em', 'Dm'], 'boombap_a', { bassPattern: 'follow_kick' }),
      57,
      2,
      'l2a',
      [],
      'hip-hop',
    );
    const bass = part(notes, 'bass');
    expect(bass[0].note).toBe(28); // E1
    expect(bass.find((n) => n.onset >= 1920)!.note).toBe(26); // D1
  });

  it('starts D♯ an octave down and steps up to E', () => {
    const notes = buildBackingNotes(
      step(['D#dim7', 'Em'], 'laid_back', {
        bassPattern: 'follow_kick',
        bassOffset: -12,
      }),
      64,
      3,
      'l3a',
      [],
      'hip-hop',
    );
    const bass = part(notes, 'bass');
    expect(bass[0].note).toBe(27); // D♯1
    expect(bass.find((n) => n.onset >= 1920)!.note).toBe(28); // E1
  });

  it('plays the Trap foundation: root on 1, the 5 on the "and" of 3', () => {
    const notes = buildBackingNotes(
      step(['Cm'], 'trap_a', { bassPattern: 'trap_foundation' }),
      60,
      1,
      'l1a',
      [],
      'hip-hop',
    );
    const bar1 = part(notes, 'bass').filter((n) => n.onset < 1920);
    expect(bar1.map((n) => [n.onset / 120, n.note])).toEqual([
      [0, 36], // C2
      [10, 43], // G2
    ]);
  });

  it('marks the 808 slide in bar 2', () => {
    const notes = buildBackingNotes(
      step(['Cm'], 'trap_b', { bassPattern: '808_slide' }),
      60,
      1,
      'l1a',
      [],
      'hip-hop',
    );
    const slide = part(notes, 'bass').find((n) => n.glideFrom !== undefined);
    expect(slide).toMatchObject({
      onset: 1920 + 14 * 120,
      note: 48,
      glideFrom: 36,
    });
  });

  it('voices the chords up from the step register', () => {
    const notes = buildBackingNotes(
      step(['Cm'], 'boombap_a', {
        comping: 'chunk_eighths_staccato',
        chordRegister: 84,
      }),
      57,
      2,
      'l2a',
      [],
      'hip-hop',
    );
    const chords = part(notes, 'chords').filter((n) => n.onset < 1920);
    expect(new Set(chords.map((n) => n.note))).toEqual(new Set([84, 87, 91]));
    expect(chords.every((n) => n.duration < 120)).toBe(true); // staccato
    expect(chords.length).toBe(8 * 3); // eight 8th-note chunks
  });
});
