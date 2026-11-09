import { describe, expect, it } from 'vitest';
import { KEY_OF_COLORS } from '@/constants/theme';
import type {
  LiteracyChooseChordsStep,
  LiteracyStep,
  MusicLiteracyLesson,
} from '@/content/musicLiteracy/schemas';
import { LITERACY_FIXTURE } from '../__fixtures__/literacyFixture';
import {
  PART2_FIXTURE,
  PART2_GATED_FIXTURE,
  PART2_STEPS,
  part2Step,
} from '../__fixtures__/part2Fixture';
import {
  LITERACY_CHOICES_VERSION,
  choicesStorageKey,
  circleOfFifths,
  dependsOnMode,
  emptyChoices,
  keyFor,
  missingChoices,
  parseChoices,
  pickProgression,
  progressionFor,
  withMode,
  withProgression,
  withTonic,
  type SavedProgression,
} from '../choices';

/**
 * The student's choices: a small versioned object, read and changed only
 * through pure helpers, never mutated; what the lesson plays from it.
 */

const lesson = PART2_FIXTURE;
const chooseX = part2Step('choose-x') as LiteracyChooseChordsStep;
const oneFour: SavedProgression = {
  template: ['1', 'X'],
  chords: ['1', '4'],
  harmony: 'triads',
  tonic: 'G',
  mode: 'major',
};

describe('the choices object', () => {
  it('starts empty, at its version', () => {
    expect(emptyChoices()).toEqual({
      version: LITERACY_CHOICES_VERSION,
      progressions: {},
    });
  });

  it('changes by copy, never in place', () => {
    const none = emptyChoices();
    const keyed = withTonic(none, 'Eb');
    const moded = withMode(keyed, 'minor');
    const saved = withProgression(moded, 'one-x', oneFour);
    expect(none).toEqual(emptyChoices());
    expect(keyed).toEqual({ ...none, tonic: 'Eb' });
    expect(moded.mode).toBe('minor');
    expect(saved.progressions['one-x']).toEqual(oneFour);
    expect(moded.progressions).toEqual({});
    // A progression saved again replaces the one before.
    const again = withProgression(saved, 'one-x', {
      ...oneFour,
      chords: ['1', '5'],
    });
    expect(again.progressions['one-x'].chords).toEqual(['1', '5']);
  });

  it('round-trips through JSON, and starts afresh from anything else', () => {
    const saved = withProgression(
      withMode(withTonic(emptyChoices(), 'A'), 'minor'),
      'one-x',
      oneFour,
    );
    expect(parseChoices(JSON.parse(JSON.stringify(saved)))).toEqual(saved);
    expect(parseChoices(null)).toEqual(emptyChoices());
    expect(parseChoices('C major')).toEqual(emptyChoices());
    expect(parseChoices({ ...saved, version: 2 })).toEqual(emptyChoices());
    expect(parseChoices({ ...saved, tonic: 'H' })).toEqual(emptyChoices());
  });

  it('is kept beside the lesson’s progress', () => {
    expect(choicesStorageKey('music-literacy-part-2')).toBe(
      'music_literacy_choices_music-literacy-part-2',
    );
  });
});

describe('choosing a color', () => {
  it('offers the twelve key centers round the circle, in their colors', () => {
    const major = circleOfFifths();
    expect(major.map((k) => k.label)).toEqual([
      'C',
      'G',
      'D',
      'A',
      'E',
      'B',
      'F♯',
      'D♭',
      'A♭',
      'E♭',
      'B♭',
      'F',
    ]);
    expect(new Set(major.map((k) => k.pitchClass)).size).toBe(12);
    expect(major[0].color).toBe(KEY_OF_COLORS.C);
    // C minor wears E♭'s color.
    expect(circleOfFifths('minor')[0].color).toBe(KEY_OF_COLORS.Eb);
  });
});

describe('what the lesson plays from them', () => {
  it('plays the student’s key in a lesson whose key is theirs, the lesson’s until they choose', () => {
    expect(keyFor(lesson, emptyChoices())).toEqual({
      tonic: 'C',
      mode: 'major',
    });
    const chosen = withMode(withTonic(emptyChoices(), 'Bb'), 'minor');
    expect(keyFor(lesson, chosen)).toEqual({ tonic: 'Bb', mode: 'minor' });
    expect(keyFor(lesson, withTonic(emptyChoices(), 'E'))).toEqual({
      tonic: 'E',
      mode: 'major',
    });
    // Part 1's key is its own, whatever is chosen.
    expect(keyFor(LITERACY_FIXTURE, chosen)).toEqual({
      tonic: 'C',
      mode: 'major',
    });
  });

  it('takes a saved progression only while it fits the step that saves it', () => {
    const choices = withProgression(emptyChoices(), 'one-x', oneFour);
    expect(progressionFor(lesson, choices, 'one-x')).toEqual(oneFour);
    expect(progressionFor(lesson, choices, 'four')).toBeUndefined();
    const stale = withProgression(emptyChoices(), 'one-x', {
      ...oneFour,
      template: ['X', '1'],
    });
    expect(progressionFor(lesson, stale, 'one-x')).toBeUndefined();
  });

  it('makes the progression from the picks, in the key they’re in, or says what’s wrong', () => {
    const key = { tonic: 'F', mode: 'minor' } as const;
    expect(pickProgression(chooseX, ['6'], key)).toEqual({
      progression: {
        template: ['1', 'X'],
        chords: ['1', '6'],
        harmony: 'triads',
        tonic: 'F',
        mode: 'minor',
      },
      problems: [],
    });
    const wrong = pickProgression(chooseX, ['2'], key);
    expect(wrong.progression).toBeNull();
    expect(wrong.problems.map((p) => p.code)).toEqual(['notInPalette']);
    expect(pickProgression(chooseX, [], key).problems[0].code).toBe('unfilled');
  });
});

describe('what a step still needs', () => {
  const all = withProgression(
    withMode(withTonic(emptyChoices(), 'D'), 'major'),
    'one-x',
    oneFour,
  );

  it('sends the student to choose the key first, then the mode', () => {
    expect(
      missingChoices(lesson, part2Step('choose-key'), emptyChoices()),
    ).toEqual([]);
    expect(
      missingChoices(lesson, part2Step('choose-mode'), emptyChoices()),
    ).toEqual([{ choice: 'key', at: 'choose-key' }]);
    expect(
      missingChoices(lesson, part2Step('one-three-five'), emptyChoices()),
    ).toEqual([
      { choice: 'key', at: 'choose-key' },
      { choice: 'mode', at: 'choose-mode' },
    ]);
    expect(missingChoices(lesson, part2Step('one-three-five'), all)).toEqual(
      [],
    );
  });

  it('needs the mode only where it changes the sound', () => {
    expect(dependsOnMode(lesson, part2Step('one-three-five'))).toBe(true);
    expect(dependsOnMode(lesson, part2Step('one-seven-one'))).toBe(true);
    expect(dependsOnMode(lesson, part2Step('the-1-chord'))).toBe(true);
    expect(dependsOnMode(lesson, part2Step('choose-x'))).toBe(true);
    // A saved progression plays in its own mode.
    expect(dependsOnMode(lesson, part2Step('play-1-x'))).toBe(false);
    expect(dependsOnMode(lesson, part2Step('hear-four'))).toBe(false);
    const ones = {
      tag: 'ones',
      title: 'Ones',
      call: {
        bars: 1,
        notes: [{ tick: 0, duration: 480, degree: '1' as const }],
      },
    };
    expect(dependsOnMode(lesson, ones)).toBe(false);
    // Chromatic numbering spells its flats out.
    expect(dependsOnMode(LITERACY_FIXTURE, LITERACY_FIXTURE.steps[2])).toBe(
      false,
    );
  });

  it('needs a progression saved before it plays one', () => {
    const keyed = withMode(withTonic(emptyChoices(), 'D'), 'major');
    expect(missingChoices(lesson, part2Step('play-1-x'), keyed)).toEqual([
      { choice: 'progression', name: 'one-x', at: 'choose-x' },
    ]);
    expect(missingChoices(lesson, part2Step('play-1-x'), all)).toEqual([]);
    expect(missingChoices(lesson, part2Step('hear-four'), all)).toEqual([
      { choice: 'progression', name: 'four', at: 'choose-four' },
    ]);
  });

  it('with a gate, sends a student who skipped it back there, for both', () => {
    // A melody on the 1 alone sounds the same in major and minor; past the
    // gate it still waits for the mode, chosen once for every step.
    const ones: LiteracyStep = {
      tag: 'ones',
      section: 'Create a Melody',
      title: 'Ones',
      call: {
        bars: 1,
        notes: [{ tick: 0, duration: 480, degree: '1' }],
      },
    };
    const gated: MusicLiteracyLesson = {
      ...PART2_GATED_FIXTURE,
      steps: [
        ...PART2_GATED_FIXTURE.steps.slice(0, 2),
        ones,
        ...PART2_GATED_FIXTURE.steps.slice(2),
      ],
    };
    const keyed = withTonic(emptyChoices(), 'D');
    expect(missingChoices(gated, ones, emptyChoices())).toEqual([
      { choice: 'key', at: 'choose-key' },
      { choice: 'mode', at: 'choose-mode' },
    ]);
    expect(missingChoices(gated, ones, keyed)).toEqual([
      { choice: 'mode', at: 'choose-mode' },
    ]);
    expect(missingChoices(gated, ones, withMode(keyed, 'minor'))).toEqual([]);
    // Without a gate it plays in either.
    const ungated = {
      ...PART2_FIXTURE,
      steps: [...PART2_FIXTURE.steps, ones],
    };
    expect(missingChoices(ungated, ones, keyed)).toEqual([]);
    // In the gate: the key first, then major or minor.
    expect(missingChoices(gated, gated.steps[0], emptyChoices())).toEqual([]);
    expect(missingChoices(gated, gated.steps[1], emptyChoices())).toEqual([
      { choice: 'key', at: 'choose-key' },
    ]);
    // A step asking again later never takes the gate's place.
    const again: MusicLiteracyLesson = {
      ...gated,
      steps: [
        ...gated.steps,
        { ...PART2_STEPS.mode, tag: 'mode-again', section: '7th Chords' },
        { ...ones, tag: 'ones-again', section: '7th Chords' },
      ],
    };
    expect(
      missingChoices(again, again.steps.at(-1)!, keyed).map((m) => m.at),
    ).toEqual(['choose-mode']);
  });

  it('needs nothing in Part 1', () => {
    for (const step of LITERACY_FIXTURE.steps)
      expect(missingChoices(LITERACY_FIXTURE, step, null)).toEqual([]);
  });
});
