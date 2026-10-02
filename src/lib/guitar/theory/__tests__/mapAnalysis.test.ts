/**
 * The §2.7 fixture table: every Music Map fact the chips and popovers show,
 * over all 60 Book One maps (with the Db Ex1-3 and Eb Ex3 corrections).
 */

import { describe, expect, it } from 'vitest';
import { GUITAR_KEY_ORDER } from '@/curriculum/data/guitar/bookOne';
import {
  chordRootName,
  chordSymbol,
  getGuitarCenter,
} from '@/curriculum/data/guitar/centers';
import type {
  GuitarKeyName,
  GuitarMusicMap,
} from '@/curriculum/data/guitar/types';
import { spellChordTones } from '../chordTones';
import {
  analyzeChange,
  analyzeMusicMap,
  octaveReturnKind,
  topLineRuns,
} from '../mapAnalysis';
import type { ChangeInfo, MusicMapAnalysis } from '../types';

interface Analyzed {
  key: GuitarKeyName;
  map: GuitarMusicMap;
  tag: string;
  analysis: MusicMapAnalysis;
}

const MAPS: Analyzed[] = GUITAR_KEY_ORDER.flatMap((key) =>
  getGuitarCenter(key).musicMaps.map((map) => ({
    key,
    map,
    tag: `${key} Ex${map.example}`,
    analysis: analyzeMusicMap(map, 'ionian'),
  })),
);

const wrap = (flag: boolean) => (flag ? ' (wraps)' : '');

function patterns(id: string) {
  return MAPS.flatMap(({ tag, analysis }) =>
    analysis.patterns
      .filter((p) => p.id === id)
      .map((p) => `${tag} bar ${p.startBar + 1}${wrap(p.wrapsRepeat)}`),
  );
}

function changes(test: (c: ChangeInfo) => boolean, format: DescribeChange) {
  return MAPS.flatMap((m) =>
    m.analysis.changes.filter(test).map((c) => format(m, c)),
  );
}

type DescribeChange = (m: Analyzed, c: ChangeInfo) => string;

const chords: DescribeChange = ({ key, map, tag }, c) => {
  const name = (i: number) =>
    chordSymbol(getGuitarCenter(key), map.bars[i].degree, map.bars[i].quality);
  return `${tag} ${name(c.fromBar)}→${name(c.toBar)}`;
};

describe('Music Map analysis', () => {
  it('finds each 2-5-1, flagging the one across the repeat', () => {
    expect(patterns('two-five-one')).toEqual([
      'G Ex4 bar 3 (wraps)',
      'A Ex5 bar 1',
      'F# Ex4 bar 2',
    ]);
    // C Ex4 is 4-5-1-2: the 2 comes after the 1, so no 2-5-1.
    const cEx4 = MAPS.find((m) => m.tag === 'C Ex4');
    expect(cEx4?.analysis.degrees).toEqual([4, 5, 1, 2]);
    expect(cEx4?.analysis.patterns.some((p) => p.id === 'two-five-one')).toBe(
      false,
    );
  });

  it('finds the 1-6-2-5 turnaround from bar 1 only', () => {
    expect(patterns('turnaround-1625')).toEqual(['G Ex4 bar 1']);
  });

  it('finds 5 → 1 outside a 2-5-1', () => {
    expect(patterns('five-to-one')).toEqual([
      'C Ex4 bar 2',
      'D Ex3 bar 2 (wraps)',
      'B Ex3 bar 1',
      'Ab Ex5 bar 2',
    ]);
  });

  it('spells why 5 dom7 pulls to 1', () => {
    const pulls = MAPS.flatMap(({ key, tag, map, analysis }) =>
      analysis.dom7ToOne.map((bar) => {
        const next = (bar + 1) % map.bars.length;
        const [, third, , seventh] = spellChordTones(
          chordRootName(getGuitarCenter(key), 5),
          'dom7',
        );
        const [tonic, tonicThird] = spellChordTones(
          chordRootName(getGuitarCenter(key), 1),
          'maj',
        );
        return `${tag} ${chordSymbol(getGuitarCenter(key), 5, 'dom7')} → ${chordSymbol(getGuitarCenter(key), 1, map.bars[next].quality)}: ${seventh}→${tonicThird}, ${third}→${tonic}${wrap(next === 0)}`;
      }),
    );
    expect(pulls).toEqual([
      'C Ex4 G7 → Cmaj7: F→E, B→C',
      'G Ex4 D7 → Gmaj7: C→B, F#→G (wraps)',
      'F# Ex4 C#7 → F#maj7: B→A#, E#→F#',
    ]);
  });

  it('flags maps starting on 6, chord 7 and triad bars in 7th maps', () => {
    const tags = (test: (a: MusicMapAnalysis) => boolean) =>
      MAPS.filter((m) => test(m.analysis)).map((m) => m.tag);
    expect(tags((a) => a.startsOnSix)).toEqual([
      'C Ex5',
      'E Ex3',
      'F# Ex4',
      'Ab Ex5',
      'Bb Ex3',
      'F Ex3',
    ]);
    expect(tags((a) => a.hasSevenChord)).toEqual(['Bb Ex4']);
    expect(
      MAPS.filter((m) => m.analysis.triadBarsIn7thMap.length).map(
        (m) =>
          `${m.tag} ${m.analysis.triadBarsIn7thMap.map((b) => b + 1).join(',')}`,
      ),
    ).toEqual([
      'D Ex4 1,2,3',
      'A Ex5 1,2,3',
      'E Ex4 1,2,3',
      'B Ex4 1,2,3,4',
      'Ab Ex4 1',
      'Ab Ex5 2',
      'Eb Ex5 4',
      'F Ex4 3',
    ]);
  });

  it('finds same-fret root moves from string 6 to 5, never at the nut', () => {
    const degrees: DescribeChange = ({ tag, analysis }, c) =>
      `${tag} ${analysis.degrees[c.fromBar]}→${analysis.degrees[c.toBar]}${wrap(c.wrapsRepeat)}`;
    expect(changes((c) => c.sameFretRootMove === 'r6-to-r5', degrees)).toEqual([
      'G Ex2 1→4',
      'G Ex4 2→5',
      'B Ex3 5→1',
      'F# Ex2 1→4',
      'F# Ex4 2→5',
      'Ab Ex2 1→4',
      'Ab Ex5 1→4',
      'Eb Ex3 6→2 (wraps)',
      'Bb Ex2 1→4',
      'F Ex2 1→4',
    ]);
    // A Ex5 5→1 and E Ex2 1→4 move 6 → 5 at fret 0: open strings, no chip.
    const at = (tag: string, bar: number) =>
      MAPS.find((m) => m.tag === tag)?.analysis.changes[bar];
    expect(at('A Ex5', 1)?.sameFretRootMove).toBeUndefined();
    expect(at('E Ex2', 0)?.sameFretRootMove).toBeUndefined();
  });

  it('marks changes that share no notes as tricky', () => {
    expect(changes((c) => c.isTricky, chords)).toEqual([
      'C Ex3 C→Dm',
      'C Ex3 Dm→C',
      'D Ex4 A→Bm',
      'D Ex4 Gmaj7→A',
      'E Ex4 E→F#m',
      'E Ex4 A→G#m7',
      'B Ex4 D#m→C#m',
      'B Ex4 F#→G#m',
      'Db Ex3 Ebm→Db',
      'Db Ex3 Db→Ebm',
      'Ab Ex4 Eb→Dbmaj7',
    ]);
  });

  it('anchors a finger that stays on the same string and fret', () => {
    const anchors: DescribeChange = (m, c) =>
      `${chords(m, c)} ${c.anchors
        .map((a) => `s${a.string}f${a.fret}:${a.finger}`)
        .join(' ')}`;
    expect(changes((c) => c.anchors.length > 0, anchors)).toEqual([
      'C Ex2 C→F s2f1:1',
      'C Ex2 F→C s2f1:1',
      'C Ex5 Am7→Cmaj7 s4f5:3',
      // The §2.7 table leaves out these two, but the book fingering keeps
      // a finger down here as well: G → Bm (index, string 5 fret 2) and
      // A → F#m (middle, string 3 fret 2).
      'G Ex3 G→Bm s5f2:1',
      'G Ex3 Bm→G s5f2:1',
      'A Ex3 A→F#m s3f2:2',
      'A Ex3 F#m→A s3f2:2',
      'B Ex5 D#m7→Bmaj7 s4f8:3 s2f7:2',
      'F# Ex5 G#m7→Bmaj7 s4f4:3',
      'F Ex3 Dm→Bb s2f3:3',
      'F Ex3 Bb→Dm s2f3:3',
    ]);
  });

  it('gives identical neighbouring chords no anchors', () => {
    const same = changes(
      (c) => c.sharedPitchClasses.length === 4 && c.anchors.length === 0,
      chords,
    );
    expect(same).toContain('D Ex5 Dmaj7→Dmaj7');
    expect(same).toContain('F# Ex5 Bmaj7→Bmaj7');
    const bar = getGuitarCenter('D').musicMaps[4].bars[0];
    expect(analyzeChange(bar, bar, 0, 1).anchors).toEqual([]);
  });

  it('loops every map: n bars make n changes, the last across the repeat', () => {
    for (const { tag, map, analysis } of MAPS) {
      const n = map.bars.length;
      expect(analysis.changes, tag).toHaveLength(n > 1 ? n : 0);
      if (n > 1) expect(analysis.changes[n - 1].wrapsRepeat).toBe(true);
    }
  });
});

describe('the 7th-chord page (B8)', () => {
  it('finds the climbing top line', () => {
    const runs = Object.fromEntries(
      GUITAR_KEY_ORDER.map((key) => [
        key,
        topLineRuns(getGuitarCenter(key))
          .map((r) => `${r.start + 1}-${r.end + 1}`)
          .join(' '),
      ]),
    );
    expect(runs).toEqual({
      C: '1-8',
      G: '1-5 6-8',
      D: '1-8',
      A: '3-8',
      E: '2-4 5-8',
      B: '1-8',
      'F#': '1-5 6-8',
      Db: '3-5 6-8',
      Ab: '3-8',
      Eb: '1-3 4-8',
      Bb: '1-8',
      F: '4-8',
    });
  });

  it('knows how the closing 1 returns', () => {
    const kinds = Object.fromEntries(
      GUITAR_KEY_ORDER.map((key) => [
        key,
        octaveReturnKind(getGuitarCenter(key)),
      ]),
    );
    expect(kinds).toEqual({
      C: 'same-shape',
      G: 'new-shape',
      D: 'same-shape',
      A: 'new-shape',
      E: 'new-shape',
      B: 'same-shape',
      'F#': 'new-shape',
      Db: 'not-higher',
      Ab: 'new-shape',
      Eb: 'not-higher',
      Bb: 'same-shape',
      F: 'new-shape',
    });
  });
});
