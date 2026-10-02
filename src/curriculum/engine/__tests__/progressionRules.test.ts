import { describe, expect, it } from 'vitest';
import CHORD_PROGRESSION_LIBRARY from '@/curriculum/data/chordProgressionLibrary';
import {
  autoTags,
  canonicalTag,
  explainTags,
  isSeventhChord,
  isStyleTag,
  isTriad,
  isVibeTag,
  mismatchReport,
  mismatches,
  parseRuleChord,
  RULE_READINGS,
  RULED_STYLES,
  RULED_VIBES,
  type RuleEntry,
  type RuleReadings,
  STYLE_INFO,
  STYLE_RULES,
  STYLE_TAGS,
  type StyleTag,
  VIBE_INFO,
  VIBE_RULES,
  VIBE_TAGS,
  type VibeTag,
} from '../progressionRules';

/**
 * The progression rules are the sheet's Algorithms tab written as tests over
 * chords. Each rule gets fixtures that pass and fail under the literal
 * readings, and each alternative reading gets a fixture that shows what
 * flipping it changes. The library tests at the end check invariants only,
 * since the stored tags are expected to change as the owner works through
 * the flags.
 */

type Readings = Partial<RuleReadings>;

const split = (progression: string) => progression.split(' - ');

const vibesOf = (progression: string, readings?: Readings) =>
  autoTags(split(progression), readings).vibes;

const stylesOf = (progression: string, readings?: Readings) =>
  autoTags(split(progression), readings).styles;

const givesVibe = (tag: VibeTag, progression: string, readings?: Readings) =>
  vibesOf(progression, readings).includes(tag);

const givesStyle = (tag: StyleTag, progression: string, readings?: Readings) =>
  stylesOf(progression, readings).includes(tag);

describe('vocabularies', () => {
  it('holds 16 vibes and 15 styles, gospel among them', () => {
    expect(VIBE_TAGS).toHaveLength(16);
    expect(STYLE_TAGS).toHaveLength(15);
    expect(STYLE_TAGS).toContain('gospel');
    expect(new Set(VIBE_TAGS).size).toBe(VIBE_TAGS.length);
    expect(new Set(STYLE_TAGS).size).toBe(STYLE_TAGS.length);
  });

  it('gives the Algorithms tab’s 8 vibes and 9 styles a rule, and no others', () => {
    expect(RULED_VIBES).toEqual([
      'cool',
      'sexy',
      'intriguing',
      'dark',
      'emotional',
      'sophisticated',
      'fun',
      'happy',
    ]);
    expect([...RULED_STYLES].sort()).toEqual(
      [
        'jazz',
        'rock',
        'gospel',
        'funk',
        'r&b',
        'neo-soul',
        'jam-band',
        'pop',
        'hip-hop',
      ].sort(),
    );
    expect(VIBE_RULES.map((r) => r.sheetRow)).toEqual([2, 3, 4, 5, 6, 7, 8, 9]);
    expect(STYLE_RULES.map((r) => r.sheetRow)).toEqual([
      12, 13, 14, 15, 16, 17, 18, 19, 20,
    ]);
  });

  it('marks hasRule on exactly the ruled tags', () => {
    for (const tag of VIBE_TAGS)
      expect(VIBE_INFO[tag].hasRule).toBe(RULED_VIBES.includes(tag));
    for (const tag of STYLE_TAGS)
      expect(STYLE_INFO[tag].hasRule).toBe(RULED_STYLES.includes(tag));
  });

  it('keeps every vibe’s reference data whole', () => {
    for (const tag of VIBE_TAGS) {
      const info = VIBE_INFO[tag];
      expect(info.tag).toBe(tag);
      expect(info.synonyms.length).toBeGreaterThan(0);
      expect(info.tempoRange[0]).toBeLessThan(info.tempoRange[1]);
      expect(info.applicableModes.length).toBeGreaterThan(0);
    }
    for (const tag of STYLE_TAGS) {
      expect(STYLE_INFO[tag].tag).toBe(tag);
      expect(STYLE_INFO[tag].primaryModes.length).toBeGreaterThan(0);
    }
  });

  it('knows every vibe and style the library stores', () => {
    const unknown = CHORD_PROGRESSION_LIBRARY.flatMap((p) => [
      ...p.vibes
        .map(canonicalTag)
        .filter((v) => !isVibeTag(v))
        .map((v) => `${p.id} vibe '${v}'`),
      ...p.styles
        .map(canonicalTag)
        .filter((s) => !isStyleTag(s))
        .map((s) => `${p.id} style '${s}'`),
    ]);
    expect(unknown).toEqual([]);
  });

  it('spells a stored tag the vocabulary’s way', () => {
    expect(canonicalTag(' Neo Soul ')).toBe('neo-soul');
    expect(canonicalTag('R&B')).toBe('r&b');
    expect(canonicalTag('hip hop')).toBe('hip-hop');
  });
});

describe('readings', () => {
  it('defaults to the most literal reading of every clause', () => {
    // Flipping a reading is the owner's call: change RULE_READINGS and this
    // test together.
    expect(RULE_READINGS).toEqual({
      plus: 'both',
      pairsWrapAround: false,
      degrees: 'asWritten',
      slashChordsMatchTheirChord: false,
      qualityFamilies: false,
      triadsMatchTheirSevenths: false,
      parenthesisedSus4: 'sus4Chord',
      sophisticated: 'dominant7PlusEither',
      andGrouping: 'leftToRight',
      funkRepeat: 'atMostThreeDistinct',
      seventhTally: 'everyChord',
      sixthsAreSevenths: false,
      triadQualities: [
        'major',
        'minor',
        'diminished',
        'augmented',
        'sus2',
        'sus4',
      ],
      slashTriadsAreTriads: true,
      popOnlyTriads: 'everyChord',
      hipHopMinorTriad: 'atLeastOne',
    });
  });
});

describe('reading a chord', () => {
  it('splits degree, quality and slash bass', () => {
    expect(parseRuleChord('5 major/7', 3)).toEqual({
      index: 3,
      chord: '5 major/7',
      degree: '5',
      quality: 'major/7',
      base: 'major',
      bass: '7',
    });
    expect(parseRuleChord('#4 minor7b5')).toMatchObject({
      degree: '#4',
      quality: 'minor7b5',
      base: 'minor7b5',
      bass: null,
    });
  });

  it('fixes the known misspellings and reads qualities in lower case', () => {
    expect(parseRuleChord('2 minor 7').chord).toBe('2 minor7');
    expect(parseRuleChord('b7dominant7#11')).toMatchObject({
      degree: 'b7',
      quality: 'dominant7#11',
    });
    expect(parseRuleChord('5 Add4').quality).toBe('add4');
  });

  it('reads a chord it cannot place without failing', () => {
    expect(parseRuleChord('mystery')).toMatchObject({
      degree: '',
      quality: 'mystery',
    });
    expect(autoTags(['mystery', ''])).toEqual({ vibes: [], styles: [] });
    expect(autoTags([])).toEqual({ vibes: [], styles: [] });
  });

  it('counts 7th chords by name, never by a slash bass', () => {
    const seventh = (c: string, r?: Readings) =>
      isSeventhChord(parseRuleChord(c), r);
    expect(seventh('1 major7')).toBe(true);
    expect(seventh('#4 minor7b5')).toBe(true);
    expect(seventh('5 dominant7sus4')).toBe(true);
    expect(seventh('2 minor9')).toBe(true);
    expect(seventh('1 major7/5')).toBe(true);
    expect(seventh('5 major/7')).toBe(false);
    expect(seventh('1 major6add9')).toBe(false);
    expect(seventh('4 minor6')).toBe(false);
    expect(seventh('4 minor6', { sixthsAreSevenths: true })).toBe(true);
  });

  it('counts triads, slash triads included', () => {
    const triad = (c: string, r?: Readings) => isTriad(parseRuleChord(c), r);
    expect(triad('1 major')).toBe(true);
    expect(triad('#4 diminished')).toBe(true);
    expect(triad('5 sus4')).toBe(true);
    expect(triad('1 major/3')).toBe(true);
    expect(triad('1 major/3', { slashTriadsAreTriads: false })).toBe(false);
    expect(triad('1 major7')).toBe(false);
    expect(triad('#4 diminished', { triadQualities: ['major', 'minor'] })).toBe(
      false,
    );
  });
});

describe('vibe rules (Algorithms tab rows 2-9)', () => {
  it('cool: starts on a major7 or a minor7, or has a dominant7(sus4)', () => {
    expect(givesVibe('cool', '1 major7 - 4 major - 5 major')).toBe(true);
    expect(givesVibe('cool', '6 minor7 - 4 major - 5 major')).toBe(true);
    expect(givesVibe('cool', '1 major - 5 dominant7sus4 - 1 major')).toBe(true);
    expect(givesVibe('cool', '1 major - 4 major7 - 5 major')).toBe(false);
    expect(givesVibe('cool', '1 major - 5 dominant7 - 1 major')).toBe(false);
    expect(
      givesVibe('cool', '1 major - 5 dominant7 - 1 major', {
        parenthesisedSus4: 'optionalSus4',
      }),
    ).toBe(true);
  });

  it('sexy: has a dominant7#5', () => {
    expect(givesVibe('sexy', '1 major - 1 dominant7#5 - 4 major')).toBe(true);
    expect(givesVibe('sexy', '1 major - 1 dominant7 - 4 major')).toBe(false);
  });

  it('intriguing: has a chord on b2, written as b2', () => {
    expect(givesVibe('intriguing', '1 major7 - b2 major7')).toBe(true);
    expect(givesVibe('intriguing', '1 major - b2 dominant7 - 1 major')).toBe(
      true,
    );
    expect(
      givesVibe('intriguing', '1 major7 - #1 diminished7 - 2 minor7'),
    ).toBe(false);
    expect(
      givesVibe('intriguing', '1 major7 - #1 diminished7 - 2 minor7', {
        degrees: 'enharmonic',
      }),
    ).toBe(true);
  });

  it('dark: a b2 and a b3, b5, b6 or b7, as "+" says', () => {
    expect(givesVibe('dark', '1 minor - b6 major - b2 major')).toBe(true);
    expect(givesVibe('dark', '1 minor - b2 major - 5 major')).toBe(false);
    const followed = { plus: 'followedBy' } as const;
    expect(givesVibe('dark', '1 minor - b6 major - b2 major', followed)).toBe(
      false,
    );
    expect(givesVibe('dark', '1 minor - b2 major - b6 major', followed)).toBe(
      true,
    );
    expect(
      givesVibe('dark', 'b6 major - 1 minor - b2 major', {
        ...followed,
        pairsWrapAround: true,
      }),
    ).toBe(true);
  });

  it('emotional: has a 4 minor or a b6 major7', () => {
    expect(givesVibe('emotional', '1 major - 4 minor - 1 major')).toBe(true);
    expect(givesVibe('emotional', '1 major7 - b6 major7')).toBe(true);
    expect(givesVibe('emotional', '1 major - b6 major - 1 major')).toBe(false);
    expect(givesVibe('emotional', '1 major7 - 4 minor7')).toBe(false);
    expect(
      givesVibe('emotional', '1 major7 - 4 minor7', {
        triadsMatchTheirSevenths: true,
      }),
    ).toBe(true);
  });

  it('sophisticated: a dominant7 + a major7 or a minor7', () => {
    expect(givesVibe('sophisticated', '2 minor7 - 5 dominant7')).toBe(true);
    expect(givesVibe('sophisticated', '5 dominant7 - 1 major7')).toBe(true);
    expect(givesVibe('sophisticated', '1 major - 5 dominant7 - 1 major')).toBe(
      false,
    );
    expect(givesVibe('sophisticated', '2 minor7 - 3 minor7 - 4 major')).toBe(
      false,
    );
    expect(
      givesVibe('sophisticated', '2 minor7 - 3 minor7 - 4 major', {
        sophisticated: 'minor7Alone',
      }),
    ).toBe(true);
    expect(givesVibe('sophisticated', '5 dominant7#5 - 1 major7')).toBe(false);
    expect(
      givesVibe('sophisticated', '5 dominant7#5 - 1 major7', {
        qualityFamilies: true,
      }),
    ).toBe(true);
  });

  it('fun: 1 dominant7 + 4 major7, or 2 dominant7 + 5 dominant7', () => {
    expect(givesVibe('fun', '1 dominant7 - 4 major7')).toBe(true);
    expect(givesVibe('fun', '1 major - 2 dominant7 - 5 dominant7')).toBe(true);
    expect(givesVibe('fun', '1 dominant7 - 4 major')).toBe(false);
    expect(givesVibe('fun', '2 dominant7 - 5 dominant7sus4')).toBe(false);
  });

  it('happy: 5 dominant7sus4 + 1 major, or 4 major7 + 1 major', () => {
    expect(givesVibe('happy', '1 major - 5 dominant7sus4')).toBe(true);
    expect(givesVibe('happy', '4 major7 - 1 major')).toBe(true);
    expect(givesVibe('happy', '4 major7 - 1 major7')).toBe(false);
    expect(
      givesVibe('happy', '4 major7 - 1 major7', {
        triadsMatchTheirSevenths: true,
      }),
    ).toBe(true);
    expect(givesVibe('happy', '4 major7 - 1 major/3')).toBe(false);
    expect(
      givesVibe('happy', '4 major7 - 1 major/3', {
        slashChordsMatchTheirChord: true,
      }),
    ).toBe(true);
  });
});

describe('style rules (Algorithms tab rows 12-20)', () => {
  it('jazz: a 7th-chord pair, needing two different chords', () => {
    expect(givesStyle('jazz', '1 major7 - 4 major7')).toBe(true);
    expect(givesStyle('jazz', '1 minor6 - 2 minor7')).toBe(true);
    expect(givesStyle('jazz', '5 dominant7 - 1 major')).toBe(false);
    expect(givesStyle('jazz', '6 dominant7 - 2 dominant7')).toBe(true);
    expect(givesStyle('jazz', '#1 diminished7 - 2 minor7')).toBe(true);
    expect(givesStyle('jazz', '#1 diminished7 - 2 minor')).toBe(false);
    expect(givesStyle('jazz', '1 major7 - 2 minor - 3 minor')).toBe(false);
    expect(
      givesStyle('jazz', '2 minor7 - 3 minor - 1 major7', {
        plus: 'followedBy',
      }),
    ).toBe(false);
  });

  it('rock: starts on a diatonic triad with fewer than three 7ths, or has a power chord', () => {
    expect(givesStyle('rock', '1 major - 4 major - 5 dominant7')).toBe(true);
    expect(givesStyle('rock', '3 minor - 4 major7 - 5 dominant7')).toBe(true);
    expect(
      givesStyle('rock', '1 major - 4 major7 - 5 dominant7 - 6 minor7'),
    ).toBe(false);
    expect(givesStyle('rock', '1 major7 - 4 major - 5 major')).toBe(false);
    expect(givesStyle('rock', '1 major/3 - 4 major - 5 major')).toBe(false);
    expect(
      givesStyle('rock', '1 major/3 - 4 major - 5 major', {
        slashChordsMatchTheirChord: true,
      }),
    ).toBe(true);
  });

  it('rock: the power chord stands alone when read left to right', () => {
    expect(givesStyle('rock', 'b7 5 - 4 5')).toBe(true);
    expect(
      givesStyle('rock', 'b7 5 - 4 5', { andGrouping: 'andTakesTheRest' }),
    ).toBe(false);
    expect(
      givesStyle('rock', '1 major - 4 major7 - 5 major7 - 6 minor7', {
        andGrouping: 'andTakesTheRest',
      }),
    ).toBe(false);
  });

  it('rock: counts every 7th chord, sixths not included', () => {
    const repeated = '1 major - 5 dominant7 - 5 dominant7 - 5 dominant7';
    expect(givesStyle('rock', repeated)).toBe(false);
    expect(
      givesStyle('rock', repeated, { seventhTally: 'distinctChords' }),
    ).toBe(true);
    const sixths = '1 major - 4 minor6 - 5 major - 2 minor6 - 6 minor6';
    expect(givesStyle('rock', sixths)).toBe(true);
    expect(givesStyle('rock', sixths, { sixthsAreSevenths: true })).toBe(false);
  });

  it('gospel: the four passing moves, by the names the tab writes', () => {
    expect(givesStyle('gospel', '1 major/3 - 4 major')).toBe(true);
    expect(givesStyle('gospel', '5 major/7 - 1 major')).toBe(true);
    expect(givesStyle('gospel', '#4 diminished - 1 major/5')).toBe(true);
    expect(givesStyle('gospel', '#5 diminished - 6 minor')).toBe(true);
    expect(givesStyle('gospel', '1 major - 4 major - 5 major')).toBe(false);
    expect(
      givesStyle('gospel', '5 dominant7 - #5 diminished7 - 6 minor7'),
    ).toBe(false);
    expect(
      givesStyle('gospel', '5 dominant7 - #5 diminished7 - 6 minor7', {
        triadsMatchTheirSevenths: true,
      }),
    ).toBe(true);
    // "+" read as "both": the 1 may come anywhere.
    expect(givesStyle('gospel', '1 major - 4 major - 5 major/7')).toBe(true);
    expect(
      givesStyle('gospel', '1 major - 4 major - 5 major/7', {
        plus: 'followedBy',
      }),
    ).toBe(false);
    expect(
      givesStyle('gospel', '1 major - 4 major - 5 major/7', {
        plus: 'followedBy',
        pairsWrapAround: true,
      }),
    ).toBe(true);
  });

  it('funk: (few chords and a minor7) or a 1 dominant7 or a 4 dominant7', () => {
    expect(givesStyle('funk', '1 minor7 - 4 dominant7')).toBe(true);
    expect(givesStyle('funk', '1 minor7 - 4 minor7 - 5 minor7')).toBe(true);
    expect(
      givesStyle('funk', '1 minor7 - 2 minor7 - 3 minor7 - 4 minor7'),
    ).toBe(false);
    expect(givesStyle('funk', '1 major - 4 major')).toBe(false);
    const busy = '1 dominant7 - 2 minor - 3 minor - 4 major - 5 major';
    expect(givesStyle('funk', busy)).toBe(true);
    expect(givesStyle('funk', busy, { andGrouping: 'andTakesTheRest' })).toBe(
      false,
    );
  });

  it('funk: a repeated chord as "a chord comes back"', () => {
    const back = '1 minor7 - 4 major - 1 minor7 - 5 major - 6 minor';
    expect(givesStyle('funk', back)).toBe(false);
    expect(givesStyle('funk', back, { funkRepeat: 'aChordRepeats' })).toBe(
      true,
    );
    expect(
      givesStyle('funk', '1 minor7 - 4 minor7 - 5 minor7', {
        funkRepeat: 'aChordRepeats',
      }),
    ).toBe(false);
  });

  it('r&b: a major7 pair, a dominant7#5, a dominant7(sus4), or 1 major + 2 minor', () => {
    expect(givesStyle('r&b', '1 major7 - 6 minor7')).toBe(true);
    expect(givesStyle('r&b', '1 major - 3 dominant7#5')).toBe(true);
    expect(givesStyle('r&b', '1 major - 5 dominant7sus4')).toBe(true);
    expect(givesStyle('r&b', '1 major - 2 minor - 5 major')).toBe(true);
    expect(givesStyle('r&b', '1 major - 4 major - 5 major')).toBe(false);
    expect(givesStyle('r&b', '1 major - 5 dominant7')).toBe(false);
    expect(
      givesStyle('r&b', '1 major - 5 dominant7', {
        parenthesisedSus4: 'optionalSus4',
      }),
    ).toBe(true);
  });

  it('neo-soul: as r&b without 1 major + 2 minor', () => {
    expect(givesStyle('neo-soul', '1 major7 - 4 major7')).toBe(true);
    expect(givesStyle('neo-soul', '1 major - 3 dominant7#5')).toBe(true);
    expect(givesStyle('neo-soul', '1 major - 5 dominant7sus4')).toBe(true);
    expect(givesStyle('neo-soul', '1 major - 2 minor - 5 major')).toBe(false);
  });

  it('jam-band: 1 major + 4 major, a minor7, a 4 dominant7, or a b7 major or dominant7', () => {
    expect(givesStyle('jam-band', '1 major - 4 major')).toBe(true);
    expect(givesStyle('jam-band', '1 major - 2 minor7')).toBe(true);
    expect(givesStyle('jam-band', '1 major - 4 dominant7')).toBe(true);
    expect(givesStyle('jam-band', '1 major - b7 major')).toBe(true);
    expect(givesStyle('jam-band', '1 major - b7 dominant7')).toBe(true);
    expect(givesStyle('jam-band', '1 major - 5 major - 6 minor')).toBe(false);
    expect(givesStyle('jam-band', '1 major - 5 major - #4 minor7b5')).toBe(
      false,
    );
  });

  it('pop: only triads, a sus or add chord, a 4 major7 or 6 minor7, or a 5 add4', () => {
    expect(
      givesStyle('pop', '1 major - 1 major/3 - #4 diminished - 5 major'),
    ).toBe(true);
    expect(givesStyle('pop', '1 major7 - 5 sus4')).toBe(true);
    expect(givesStyle('pop', '1 major7 - 4 major7')).toBe(true);
    expect(givesStyle('pop', '2 minor7 - 6 minor7')).toBe(true);
    expect(givesStyle('pop', '1 major7 - 5 Add4')).toBe(true);
    expect(givesStyle('pop', '1 major7 - 2 minor7 - 5 dominant7')).toBe(false);
  });

  it('pop: what counts as a triad, and how many must be', () => {
    const slash = '1 major - 1 major/3 - 5 major';
    expect(givesStyle('pop', slash)).toBe(true);
    expect(givesStyle('pop', slash, { slashTriadsAreTriads: false })).toBe(
      false,
    );
    const dim = '1 major - #4 diminished - 5 major';
    expect(givesStyle('pop', dim)).toBe(true);
    expect(givesStyle('pop', dim, { triadQualities: ['major', 'minor'] })).toBe(
      false,
    );
    const mixed = '1 major7 - 5 major';
    expect(givesStyle('pop', mixed)).toBe(false);
    expect(givesStyle('pop', mixed, { popOnlyTriads: 'atLeastOne' })).toBe(
      true,
    );
  });

  it('hip-hop: has a minor triad', () => {
    expect(givesStyle('hip-hop', '1 major - 6 minor')).toBe(true);
    expect(givesStyle('hip-hop', '1 major - 6 minor7')).toBe(false);
    const every = { hipHopMinorTriad: 'everyChord' } as const;
    expect(givesStyle('hip-hop', '1 major - 6 minor', every)).toBe(false);
    expect(givesStyle('hip-hop', '2 minor - 3 minor - 6 minor', every)).toBe(
      true,
    );
  });
});

describe('explainTags', () => {
  it('names the clause that fired and the chords it matched', () => {
    const why = explainTags(split('1 minor - b2 major - b6 major'), {
      plus: 'followedBy',
    });
    expect(why.vibes.find((v) => v.tag === 'dark')).toEqual({
      tag: 'dark',
      clauses: [{ clause: 'b2 + b3/b5/b6/b7', chords: [1, 2] }],
    });
  });

  it('lists every clause that fired, in vocabulary order', () => {
    const why = explainTags(split('1 major7 - 5 dominant7sus4 - 4 minor'));
    expect(why.vibes.map((v) => v.tag)).toEqual(['cool', 'emotional']);
    expect(why.vibes[0].clauses.map((c) => c.clause)).toEqual([
      '1st chord = major7',
      'dominant7(sus4)',
    ]);
    const order = why.styles.map((s) => STYLE_TAGS.indexOf(s.tag));
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });
});

describe('mismatches', () => {
  const entry: RuleEntry = Object.freeze({
    id: 7,
    chords: Object.freeze(split('1 major7 - 5 dominant7sus4 - 4 minor')),
    vibes: Object.freeze(['Cool', 'happy', 'melancholic']),
    styles: Object.freeze(['Neo Soul', 'jazz', 'blues']),
  });

  it('flags ruled tags to add and to remove, and leaves rule-less tags alone', () => {
    const m = mismatches(entry);
    expect(m.id).toBe(7);
    // Cool is stored (as "Cool") and given; happy is stored but not given;
    // emotional is given but not stored; melancholic has no rule.
    expect(m.vibes).toEqual({ add: ['emotional'], remove: ['happy'] });
    expect(m.styles.remove).toContain('jazz');
    expect(m.styles.remove).not.toContain('neo-soul');
    expect(m.styles.remove).not.toContain('blues');
    expect(m.count).toBe(
      m.vibes.add.length +
        m.vibes.remove.length +
        m.styles.add.length +
        m.styles.remove.length,
    );
  });

  it('never changes the stored tags', () => {
    expect(() => mismatches(entry)).not.toThrow();
    expect(entry.vibes).toEqual(['Cool', 'happy', 'melancholic']);
    expect(entry.styles).toEqual(['Neo Soul', 'jazz', 'blues']);
  });

  it('finds nothing when the stored tags are exactly the rules’ tags', () => {
    const chords = split('1 major7 - 2 minor7 - 5 dominant7');
    const tags = autoTags(chords);
    expect(
      mismatches({ id: 1, chords, vibes: tags.vibes, styles: tags.styles })
        .count,
    ).toBe(0);
  });

  it('reads a progression with no stored tags as all additions', () => {
    const chords = split('1 major7 - 2 minor7 - 5 dominant7');
    const m = mismatches({ id: 2, chords });
    expect(m.vibes.add).toEqual(autoTags(chords).vibes);
    expect(m.styles.add).toEqual(autoTags(chords).styles);
    expect(m.vibes.remove).toEqual([]);
  });
});

describe('mismatchReport', () => {
  const chords = split('1 major7 - 2 minor7 - 5 dominant7');
  const agreed = autoTags(chords);
  const entries: RuleEntry[] = [
    { id: 1, chords, vibes: agreed.vibes, styles: agreed.styles },
    { id: 2, chords, vibes: [...agreed.vibes, 'happy'], styles: agreed.styles },
    { id: 3, chords, vibes: [], styles: [] },
  ];

  it('keeps only flagged progressions, in input order', () => {
    const report = mismatchReport(entries);
    expect(report.flaggedIds).toEqual([2, 3]);
    expect([...report.byId.keys()]).toEqual([2, 3]);
    expect(report.byId.get(2)?.vibes).toEqual({ add: [], remove: ['happy'] });
    expect(report.totals.entries).toBe(3);
    expect(report.totals.flagged).toBe(2);
    expect(report.totals.removals).toBe(1);
    expect(report.totals.additions).toBe(
      agreed.vibes.length + agreed.styles.length,
    );
  });

  it('tallies each ruled tag', () => {
    const report = mismatchReport(entries);
    expect(report.vibes.happy).toEqual({
      stored: 1,
      suggested: 0,
      agree: 0,
      add: 0,
      remove: 1,
    });
    expect(report.vibes.cool).toEqual({
      stored: 2,
      suggested: 3,
      agree: 2,
      add: 1,
      remove: 0,
    });
    expect(report.vibes.melancholic.suggested).toBe(0);
  });

  it('runs over the whole library with consistent tallies', () => {
    const report = mismatchReport(CHORD_PROGRESSION_LIBRARY);
    expect(report.totals.entries).toBe(CHORD_PROGRESSION_LIBRARY.length);
    const ids = new Set(CHORD_PROGRESSION_LIBRARY.map((p) => p.id));
    expect(report.flaggedIds.every((id) => ids.has(id))).toBe(true);
    let additions = 0;
    let removals = 0;
    for (const tally of [
      ...RULED_VIBES.map((t) => report.vibes[t]),
      ...RULED_STYLES.map((t) => report.styles[t]),
    ]) {
      expect(tally.agree + tally.add).toBe(tally.suggested);
      expect(tally.agree + tally.remove).toBe(tally.stored);
      additions += tally.add;
      removals += tally.remove;
    }
    expect(additions).toBe(report.totals.additions);
    expect(removals).toBe(report.totals.removals);
    for (const p of CHORD_PROGRESSION_LIBRARY) {
      const m = mismatches(p);
      expect(report.byId.get(p.id)?.count ?? 0).toBe(m.count);
    }
  });
});
