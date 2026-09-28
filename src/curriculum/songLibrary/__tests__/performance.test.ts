import { describe, expect, it } from 'vitest';
import type { ChordBar, Song } from '@/curriculum/types/songLibrary';
import { performedBars, writtenBarKeys } from '../performance';

/** A bar that plays one chord, named so the performed order reads back. */
const bar = (name: string, marks: Partial<ChordBar> = {}): ChordBar => ({
  chords: [{ degree: '1 maj', chordName: name, beat: 1, duration: 4 }],
  ...marks,
});

const song = (...sections: ChordBar[][]): Song => ({
  id: 't',
  title: 't',
  artist: 't',
  key: 'G major',
  keyRoot: 67,
  mode: 'major',
  tempo: 100,
  timeSignature: [4, 4],
  difficulty: 1,
  genreTags: [],
  techniques: [],
  sections: sections.map((bars, i) => ({ id: `s${i}`, label: 'Verse', bars })),
  audioSources: [],
  artistImageSource: 'none',
});

const order = (s: Song) =>
  performedBars(s)
    .map((b) => b.bar.chords[0]?.chordName)
    .join(' ');

describe('performedBars', () => {
  it('plays a plain chart straight through', () => {
    expect(order(song([bar('A'), bar('B')], [bar('C')]))).toBe('A B C');
  });

  it('repeats back to the start repeat', () => {
    expect(
      order(
        song([
          bar('I'),
          bar('A', { repeatStart: true }),
          bar('B', { repeatEnd: true }),
          bar('C'),
        ]),
      ),
    ).toBe('I A B A B C');
  });

  it('repeats to the top with no start repeat, and honours repeatTimes', () => {
    expect(
      order(song([bar('A'), bar('B', { repeatEnd: true, repeatTimes: 3 })])),
    ).toBe('A B A B A B');
  });

  it('takes first and second endings', () => {
    expect(
      order(
        song([
          bar('A', { repeatStart: true }),
          bar('B'),
          bar('X', { ending: [1], repeatEnd: true }),
          bar('Y', { ending: [2] }),
          bar('C'),
        ]),
      ),
    ).toBe('A B X A B Y C');
  });

  it('plays three endings over three passes', () => {
    expect(
      order(
        song([
          bar('A', { repeatStart: true }),
          bar('X', { ending: [1, 2], repeatEnd: true }),
          bar('Z', { ending: [3] }),
        ]),
      ),
    ).toBe('A X A X A Z');
  });

  it('reads the legacy repeatCount as repeat barlines', () => {
    const s = song([bar('A'), bar('B')]);
    s.sections[0].repeatCount = 3;
    expect(order(s)).toBe('A B A B A B');
  });

  it('D.S. al Coda: back to the segno, then to the coda, where a vamp repeats', () => {
    expect(
      order(
        song(
          [bar('I')],
          [
            bar('V', { segno: true }),
            bar('W', { toCoda: true }),
            bar('B', { jump: 'D.S. al Coda' }),
          ],
          [
            bar('T', { coda: true }),
            bar('O', { repeatStart: true, cue: 'Repeat and Fade' }),
            bar('P', { repeatEnd: true }),
          ],
        ),
      ),
    ).toBe('I V W B V W T O P O P');
  });

  it('does not retake a repeat after a D.S., and plays the last ending', () => {
    expect(
      order(
        song([
          bar('S', { segno: true, repeatStart: true }),
          bar('X', { ending: [1], repeatEnd: true }),
          bar('Y', { ending: [2] }),
          bar('B', { jump: 'D.S.' }),
          bar('E'),
        ]),
      ),
    ).toBe('S X S Y B S Y B E');
  });

  it('D.C. al Fine stops at the Fine on the second pass', () => {
    expect(
      order(
        song([
          bar('A'),
          bar('B', { fine: true }),
          bar('C', { jump: 'D.C. al Fine' }),
        ]),
      ),
    ).toBe('A B C A B');
  });
});

describe('writtenBarKeys', () => {
  it('switches key at a key change and keeps it', () => {
    const keys = writtenBarKeys(
      song([bar('G'), bar('A♭', { keyChange: 'A♭ major' }), bar('D♭')]),
    );
    expect(keys.map((k) => k.tonicPc)).toEqual([7, 8, 8]);
  });
});
