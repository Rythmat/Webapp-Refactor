import { describe, expect, it } from 'vitest';
import { LITERACY_FIXTURE } from '@/curriculum/engine/musicLiteracy/__fixtures__/literacyFixture';
import { PART2_FIXTURE } from '@/curriculum/engine/musicLiteracy/__fixtures__/part2Fixture';
import {
  emptyChoices,
  withMode,
  withTonic,
} from '@/curriculum/engine/musicLiteracy/choices';
import {
  createPass,
  transcribeCall,
} from '@/curriculum/engine/musicLiteracy/createPass';
import { stepNotes } from '@/curriculum/engine/musicLiteracy/literacy';
import { attackAt, chordLabelsByBar, isRightKey } from '../literacyKeys';

/**
 * Which keys the player shows right (the key's color) or wrong (gray), pass
 * by pass, and the chord a chord step is on.
 */

const cMajor = withMode(withTonic(emptyChoices(), 'C'), 'major');
const step = (tag: string) => PART2_FIXTURE.steps.find((s) => s.tag === tag)!;

describe('a key pressed', () => {
  it('in the echo: never wrong in the teacher’s turn, the answer’s pitch after', () => {
    const notes = stepNotes(LITERACY_FIXTURE, LITERACY_FIXTURE.steps[0]);
    const ctx = {
      pass: 'echo' as const,
      notes,
      create: null,
      transcription: null,
    };
    expect(isRightKey(64, 2400, ctx)).toBe(true); // the words
    expect(isRightKey(64, 7680, ctx)).toBe(false); // the answer: C
    expect(isRightKey(60, 7680, ctx)).toBe(true);
    // The challenge grades the teacher's turn too.
    expect(isRightKey(64, 2400, { ...ctx, pass: 'challenge' })).toBe(false);
  });

  it('in a chord echo: a note of the chord answered now', () => {
    const notes = stepNotes(PART2_FIXTURE, step('the-1-chord'), cMajor);
    const ctx = {
      pass: 'echo' as const,
      notes,
      create: null,
      transcription: null,
    };
    expect(isRightKey(64, 5760, ctx)).toBe(true); // E of C major
    expect(isRightKey(65, 5760, ctx)).toBe(false); // F: bar 2's
    expect(isRightKey(65, 7680, ctx)).toBe(true);
  });

  it('in a create pass: the step’s notes in the call, the student’s call in the repeat', () => {
    const notes = stepNotes(PART2_FIXTURE, step('one-three-five'), cMajor);
    const create = createPass(PART2_FIXTURE, step('one-three-five'), cMajor)!;
    const ctx = { pass: 'create' as const, notes, create, transcription: null };
    expect(isRightKey(62, 500, ctx)).toBe(true); // the count-in
    expect(isRightKey(64, 2000, ctx)).toBe(true); // a 3: one of 1, 3, 5
    expect(isRightKey(62, 2000, ctx)).toBe(false); // a 2: not
    // Their call: 1 then 5. The repeat wants the 5 on beat 2.
    const transcription = transcribeCall(create, [
      { midi: 60, onset: 1920, duration: 200 },
      { midi: 67, onset: 2400, duration: 200 },
    ]);
    const repeat = { ...ctx, transcription };
    expect(isRightKey(67, 4320, repeat)).toBe(true);
    expect(isRightKey(64, 4320, repeat)).toBe(false);
  });
});

describe('the chord now', () => {
  it('is the attack sounding, or the last begun', () => {
    const { chords } = stepNotes(PART2_FIXTURE, step('the-1-chord'), cMajor);
    const call = chords!.call;
    expect(chordLabelsByBar(call)).toEqual(['1 maj', '4 maj']);
    expect(attackAt(call, 1000)).toBeNull();
    expect(attackAt(call, 1920)).toMatchObject({ sounding: true });
    expect(attackAt(call, 1920)!.attack.chord.label).toBe('1 maj');
    expect(attackAt(call, 3900)!.attack.chord.label).toBe('4 maj');
  });
});
