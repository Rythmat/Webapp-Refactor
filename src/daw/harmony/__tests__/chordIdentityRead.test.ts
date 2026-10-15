/**
 * Reading a chord's identity out of the labels a region carries, in every
 * dialect the lane holds (utils/chordRegionNotation lists them), and making
 * one where a chord is made: Prism's graph names, degreeKeys and notes.
 *
 * Run: npx vitest run src/daw/harmony/__tests__/chordIdentityRead.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  ensureChordIdentities,
  ensureChordIdentity,
  identityRelabelled,
  pitchesOfDegreeName,
  pitchesOfLabels,
  pitchesOfNotes,
  type ChordPitches,
  type IdentityLabels,
} from '../chordIdentity';
import { keyFrame } from '../keyFrame';

const C = keyFrame(0, 'ionian');
const Bb = keyFrame(10, 'ionian');
const aMinor = keyFrame(9, 'aeolian');
const cLydian = keyFrame(0, 'lydian');

const chord = (
  rootPc: number,
  quality = 'major',
  bassPc = rootPc,
): ChordPitches => ({ rootPc, quality, bassPc });

const read = (labels: Partial<IdentityLabels>, frame = C) =>
  pitchesOfLabels({ name: '', noteName: '', ...labels }, frame);

describe('pitchesOfLabels, source by source', () => {
  it('analysis: "2 min7" / "D min7" / "2 minor7"', () => {
    expect(
      read({ name: '2 min7', noteName: 'D min7', degreeKey: '2 minor7' }),
    ).toEqual(chord(2, 'minor7'));
  });

  it('a Prism suggestion: the letter name in both, degreeKey long', () => {
    expect(
      read({ name: 'G dom7', noteName: 'G dom7', degreeKey: '5 dominant7' }),
    ).toEqual(chord(7, 'dominant7'));
  });

  it('a curriculum seed: degree labels only, read in the key', () => {
    expect(
      read({ name: '4 maj7', noteName: '4 maj7', degreeKey: '4 major7' }),
    ).toEqual(chord(5, 'major7'));
  });

  it("a song: the letter name wins over a degree counted from the song's key", () => {
    // F/A in B♭; the degree '5 maj/7' alone would read as the engine's F/E.
    expect(read({ name: '5 maj/7', noteName: 'F/A' }, Bb)).toEqual(
      chord(5, 'major', 9),
    );
    expect(read({ name: '♭7 maj', noteName: 'B/D♯' }, C)).toEqual(
      chord(11, 'major', 3),
    );
  });

  it('MusicXML and typed chords before 1.16a: one letter name', () => {
    expect(read({ name: 'D min7', noteName: 'D min7' })).toEqual(
      chord(2, 'minor7'),
    );
    expect(read({ name: 'F#m7b5', noteName: 'F#m7b5' })).toEqual(
      chord(6, 'minor7b5'),
    );
    expect(read({ name: 'Bb/D', noteName: 'Bb/D' })).toEqual(
      chord(10, 'major', 2),
    );
  });

  it('the live analyzer: a bare root takes the quality its name gives', () => {
    expect(read({ name: 'Dminor7', noteName: 'D' })).toEqual(
      chord(2, 'minor7'),
    );
  });

  it("the lead sheet's old placeholder: 'maj' over 'C' is C major", () => {
    expect(read({ name: 'maj', noteName: 'C' })).toEqual(chord(0));
  });

  it("a practice track's '/1' is the key's tonic: its degreeKey has no slash", () => {
    expect(
      read(
        { name: '2 maj/1', noteName: 'D maj/1', degreeKey: '2 major' },
        cLydian,
      ),
    ).toEqual(chord(2, 'major', 0));
  });

  it("Prism's slash chords are the engine's, the bass where CHORDS puts it", () => {
    // '4 major/1' is IV over the tonic: F/C.
    expect(
      read({ name: '4 maj/1', noteName: 'F maj/1', degreeKey: '4 major/1' }),
    ).toEqual(chord(5, 'major', 0));
    // E/G♯ in A minor, saved since the fix as '5 major/3'.
    expect(
      read(
        { name: '5 maj/3', noteName: 'E maj/3', degreeKey: '5 major/3' },
        aMinor,
      ),
    ).toEqual(chord(4, 'major', 8));
  });

  it("an older modal Prism slash chord's letter name corrects its converted degreeKey", () => {
    // Saved before the fix: E/G♯'s '/3' was converted as a key degree.
    expect(
      read(
        { name: '5 maj/5', noteName: 'E maj/3', degreeKey: '5 major/5' },
        aMinor,
      ),
    ).toEqual(chord(4, 'major', 8));
  });

  it("a slash bass from analysis ('C maj/E')", () => {
    expect(
      read({ name: '1 maj', noteName: 'C maj/E', degreeKey: '1 major' }),
    ).toEqual(chord(0, 'major', 4));
  });

  it('a rename that left the degreeKey stale: the letter name wins', () => {
    expect(read({ name: 'Am', noteName: 'Am', degreeKey: '1 major' })).toEqual(
      chord(9, 'minor'),
    );
  });

  it('degree labels need a key; letters do not', () => {
    expect(read({ name: '4 maj7', noteName: '4 maj7' }, null as never)).toBe(
      null,
    );
    expect(read({ name: 'G7', noteName: 'G7' }, null as never)).toEqual(
      chord(7, 'dominant7'),
    );
  });

  it('nothing for text that names no chord', () => {
    for (const text of ['', 'N.C.', 'hello', 'Cxyz']) {
      expect(read({ name: text, noteName: text }), text).toBeNull();
    }
  });
});

describe('pitchesOfDegreeName', () => {
  it("reads Prism's graph names from the parent root", () => {
    expect(pitchesOfDegreeName('6 minor', 0)).toEqual(chord(9, 'minor'));
    expect(pitchesOfDegreeName('b7 dominant7', 0)).toEqual(
      chord(10, 'dominant7'),
    );
  });

  it('puts an engine slash quality’s bass where its intervals do', () => {
    expect(pitchesOfDegreeName('1 major/5', 0)).toEqual(chord(0, 'major', 7));
    expect(pitchesOfDegreeName('3 major/3', 0)).toEqual(chord(4, 'major', 8));
    expect(pitchesOfDegreeName('4 major/1', 0)).toEqual(chord(5, 'major', 0));
    expect(pitchesOfDegreeName('4 minor6/b3', 0)).toEqual(
      chord(5, 'minor6', 8),
    );
  });

  it('nothing for a name without a degree or a known quality', () => {
    expect(pitchesOfDegreeName('major', 0)).toBeNull();
    expect(pitchesOfDegreeName('9 major', 0)).toBeNull();
    expect(pitchesOfDegreeName('1 xyz', 0)).toBeNull();
  });
});

describe('pitchesOfNotes', () => {
  it('reads the chord and its lowest note', () => {
    expect(pitchesOfNotes([52, 55, 60])).toEqual(chord(0, 'major', 4));
    expect(pitchesOfNotes([50, 53, 57, 60])).toEqual(chord(2, 'minor7'));
    expect(pitchesOfNotes([60])).toBeNull();
  });
});

describe('ensureChordIdentity', () => {
  const region: IdentityLabels & { id: string } = {
    id: 'r',
    name: '2 min7',
    noteName: 'D min7',
    degreeKey: '2 minor7',
  };

  it('reads one from the labels, labelled with the name', () => {
    expect(ensureChordIdentity(region, C).identity).toEqual({
      ...chord(2, 'minor7'),
      source: 'derived',
      label: '2 min7',
    });
    expect(ensureChordIdentity(region, C, 'detected').identity?.source).toBe(
      'detected',
    );
  });

  it('keeps a current one, the same object; replaces a stale one', () => {
    const once = ensureChordIdentity(region, C);
    expect(ensureChordIdentity(once, C)).toBe(once);
    const stale = { ...once, name: '5 dom7', noteName: 'G dom7' };
    expect(ensureChordIdentity(stale, C).identity).toMatchObject({
      rootPc: 7,
      quality: 'dominant7',
      label: '5 dom7',
    });
  });

  it('drops a stale one when the labels name no chord', () => {
    const once = ensureChordIdentity(region, C);
    const renamed = { ...once, name: 'hello', noteName: 'hello' };
    delete (renamed as Partial<typeof renamed>).degreeKey;
    expect('identity' in ensureChordIdentity(renamed, C)).toBe(false);
  });

  it('leaves a lane whose chords all have theirs as the same array', () => {
    const lane = ensureChordIdentities([region], C);
    expect(ensureChordIdentities(lane, C)).toBe(lane);
  });
});

describe('identityRelabelled', () => {
  it('carries a current identity to a new name; none for a stale one', () => {
    const named = ensureChordIdentity({ name: '1 maj', noteName: 'C maj' }, C);
    expect(identityRelabelled(named, '4 maj')).toMatchObject({
      rootPc: 0,
      label: '4 maj',
    });
    expect(
      identityRelabelled({ ...named, name: 'other' }, '4 maj'),
    ).toBeUndefined();
  });
});
