import { describe, expect, it } from 'vitest';
import CHORD_PROGRESSION_LIBRARY from '@/curriculum/data/chordProgressionLibrary';
import { CHORDS } from '@/daw/prism-engine/data/chords';
import { PROGRESSION_GRAPH } from '@/daw/prism-engine/data/progressionGraph';
import {
  buildOpeningForest,
  buildOpeningTree,
  CHORD_SPELLING_FIXES,
  chordsOfOpening,
  normalizeChordSpelling,
  openingKey,
  type OpeningTreeEntry,
} from '../openingTree';

/**
 * The opening tree folds the progression library into one prefix tree per
 * starting chord. Prism is to read it as its progression graph and Tesseract,
 * the console's progression map, is to draw it, so these tests pin three
 * things: the shape on a small hand-made library, agreement with Prism's graph
 * where the two should agree, and the counts on the real library.
 */

const DEGREE = /^(?:b|#)?[1-7]$/;

/** Why a chord is not one Prism can play, or null when it is. */
function problem(chord: string): string | null {
  const [main, bass] = chord.split('/');
  const space = main.indexOf(' ');
  if (space < 0) return 'no quality';
  if (!DEGREE.test(main.slice(0, space))) return 'bad degree';
  if (!(main.slice(space + 1) in CHORDS)) return 'unknown quality';
  if (bass !== undefined && !DEGREE.test(bass)) return 'bad bass';
  return null;
}

/**
 * A small library. The jazz pair comes first, so "2 minor7" is seen before
 * "1 major" but holds fewer progressions. Under "1 major", "6 minor" is seen
 * first but "5 major" holds more. Under "1 major|6 minor" the two children
 * hold one progression each, so library order decides.
 */
const FIXTURE: OpeningTreeEntry[] = [
  {
    id: 1,
    chords: ['2 minor7', '5 dominant7', '1 major7'],
    styles: ['jazz'],
    songIds: ['autumn-leaves'],
  },
  {
    id: 2,
    chords: ['1 major', '6 minor', '4 major', '5 major'],
    vibes: ['happy'],
    styles: ['pop'],
    songIds: ['let-it-be'],
  },
  {
    id: 3,
    chords: ['1 major', '5 major', '6 minor', '4 major'],
    vibes: ['happy', 'emotional'],
    styles: ['pop', 'rock'],
  },
  { id: 4, chords: ['1 major', '5 major', '6 minor'], vibes: ['emotional'] },
  { id: 5, chords: ['2 minor7', '5 dominant7', '1 major7'], styles: ['jazz'] },
  {
    id: 6,
    chords: ['1 major', '6 minor', '2 minor', '5 major'],
    vibes: ['emotional'],
  },
  { id: 7, chords: ['1 major', '5 major', '1 major'], vibes: ['emotional'] },
];

describe('normalizeChordSpelling', () => {
  it('corrects the four known misspellings to chords Prism can play', () => {
    expect(Object.keys(CHORD_SPELLING_FIXES).sort()).toEqual([
      '1 maj/5',
      '2 maj',
      '2 minor 7',
      'b7dominant7#11',
    ]);
    for (const [wrong, right] of Object.entries(CHORD_SPELLING_FIXES)) {
      expect(normalizeChordSpelling(wrong)).toBe(right);
      expect(problem(right)).toBeNull();
    }
  });

  it('tidies spacing first, then corrects', () => {
    expect(normalizeChordSpelling('  2   minor 7 ')).toBe('2 minor7');
    expect(normalizeChordSpelling(' 4  major7')).toBe('4 major7');
  });

  it('leaves correct chords alone', () => {
    for (const chord of [
      '1 major7',
      'b7 dominant7#11',
      '5 major/7',
      '2 minor7',
    ])
      expect(normalizeChordSpelling(chord)).toBe(chord);
  });
});

describe('openingKey', () => {
  it('joins chords with "|" and reads them back', () => {
    const chords = ['1 major7', '2 minor7', '5 dominant7'];
    expect(openingKey(chords)).toBe('1 major7|2 minor7|5 dominant7');
    expect(chordsOfOpening(openingKey(chords))).toEqual(chords);
    expect(chordsOfOpening('')).toEqual([]);
  });
});

describe('buildOpeningForest on a small library', () => {
  const forest = buildOpeningForest(FIXTURE);
  const node = (id: string) => forest.nodes.get(id)!;

  it('makes one node per opening, keyed by the opening itself', () => {
    expect([...forest.nodes.keys()]).toEqual([
      '1 major',
      '1 major|5 major',
      '1 major|5 major|6 minor',
      '1 major|5 major|6 minor|4 major',
      '1 major|5 major|1 major',
      '1 major|6 minor',
      '1 major|6 minor|4 major',
      '1 major|6 minor|4 major|5 major',
      '1 major|6 minor|2 minor',
      '1 major|6 minor|2 minor|5 major',
      '2 minor7',
      '2 minor7|5 dominant7',
      '2 minor7|5 dominant7|1 major7',
    ]);
    expect(node('1 major|5 major|6 minor')).toMatchObject({
      chord: '6 minor',
      depth: 3,
      parentId: '1 major|5 major',
      rootId: '1 major',
    });
    expect(node('2 minor7')).toMatchObject({ depth: 1, parentId: null });
  });

  it('puts the busiest branch first and breaks ties by library order', () => {
    // "2 minor7" was seen first but holds 2 progressions to "1 major"'s 5.
    expect(forest.rootIds).toEqual(['1 major', '2 minor7']);
    // "6 minor" was seen first but holds 2 to "5 major"'s 3.
    expect(node('1 major').childIds).toEqual([
      '1 major|5 major',
      '1 major|6 minor',
    ]);
    // One each: library order decides.
    expect(node('1 major|6 minor').childIds).toEqual([
      '1 major|6 minor|4 major',
      '1 major|6 minor|2 minor',
    ]);
  });

  it('records where each progression ends, inner nodes and shared ends included', () => {
    expect(node('1 major|5 major|6 minor').endIds).toEqual([4]);
    expect(node('1 major|5 major|6 minor').childIds).toHaveLength(1);
    expect(node('2 minor7|5 dominant7|1 major7').endIds).toEqual([1, 5]);
    expect(node('1 major|5 major').endIds).toEqual([]);
    expect(forest.endNodeOf.get(7)).toBe('1 major|5 major|1 major');
    expect(forest.endNodeOf.size).toBe(FIXTURE.length);
    expect(forest.skippedIds).toEqual([]);
  });

  it('counts the progressions below each node, its own ends included', () => {
    expect(node('1 major').countBelow).toBe(5);
    expect(node('1 major|5 major').countBelow).toBe(3);
    expect(node('1 major|5 major|6 minor').countBelow).toBe(2);
    expect(node('2 minor7|5 dominant7|1 major7').countBelow).toBe(2);
  });

  it('gathers the vibes, styles and songs below, most used first', () => {
    expect(node('1 major').vibes).toEqual(['emotional', 'happy']);
    expect(node('1 major').styles).toEqual(['pop', 'rock']);
    expect(node('1 major').songIds).toEqual(['let-it-be']);
    expect(node('1 major|5 major').songIds).toEqual([]);
    expect(node('2 minor7').styles).toEqual(['jazz']);
    expect(node('2 minor7').songIds).toEqual(['autumn-leaves']);
  });

  it('fixes misspellings, so a misspelt chord joins the right branch', () => {
    const fixed = buildOpeningForest([
      { id: 1, chords: ['6 minor7', '2 minor7', '5 dominant7'] },
      { id: 2, chords: ['6 minor7', ' 2 minor 7', '5 dominant7'] },
    ]);
    expect(fixed.nodes.size).toBe(3);
    expect(fixed.nodes.get('6 minor7|2 minor7|5 dominant7')!.endIds).toEqual([
      1, 2,
    ]);
  });

  it('skips entries it cannot place', () => {
    const skipped = buildOpeningForest([
      { id: 1, chords: [] },
      { id: 2, chords: ['1 major', '  '] },
      { id: 3, chords: ['1 major|4 major'] },
      { id: 4, chords: ['1 major', '4 major'] },
    ]);
    expect(skipped.skippedIds).toEqual([1, 2, 3]);
    expect([...skipped.endNodeOf.keys()]).toEqual([4]);
    expect([...skipped.nodes.keys()]).toEqual(['1 major', '1 major|4 major']);
  });
});

describe('buildOpeningTree', () => {
  it('gives Prism its shape: openings that continue, mapped to next chords in order', () => {
    const graph = buildOpeningTree(FIXTURE);
    expect(graph).toEqual({
      '1 major': ['5 major', '6 minor'],
      '1 major|5 major': ['6 minor', '1 major'],
      '1 major|5 major|6 minor': ['4 major'],
      '1 major|6 minor': ['4 major', '2 minor'],
      '1 major|6 minor|4 major': ['5 major'],
      '1 major|6 minor|2 minor': ['5 major'],
      '2 minor7': ['5 dominant7'],
      '2 minor7|5 dominant7': ['1 major7'],
    });
    // Prism lists its first chords in key order, so key order matters too.
    expect(Object.keys(graph).filter((k) => !k.includes('|'))).toEqual([
      '1 major',
      '2 minor7',
    ]);
  });

  it("rebuilds Prism's graph exactly from Prism's own complete paths", () => {
    const paths: string[][] = [];
    const walk = (path: string[]) => {
      const next = PROGRESSION_GRAPH[openingKey(path)];
      if (!next) paths.push(path);
      else for (const chord of next) walk([...path, chord]);
    };
    for (const key of Object.keys(PROGRESSION_GRAPH))
      if (!key.includes('|')) walk([key]);

    const rebuilt = buildOpeningTree(
      paths.map((chords, i) => ({ id: i + 1, chords })),
    );
    const asSets = (graph: Record<string, string[]>) =>
      Object.fromEntries(
        Object.entries(graph).map(([k, v]) => [k, [...v].sort()]),
      );
    expect(paths).toHaveLength(649);
    expect(asSets(rebuilt)).toEqual(asSets(PROGRESSION_GRAPH));
  });
});

describe('the opening tree of the real library', () => {
  const forest = buildOpeningForest(CHORD_PROGRESSION_LIBRARY);
  const nodes = [...forest.nodes.values()];

  it('holds 18 trees and 1,246 openings', () => {
    expect(forest.skippedIds).toEqual([]);
    expect(forest.rootIds).toHaveLength(18);
    expect(nodes).toHaveLength(1246);
    const byDepth: number[] = [];
    for (const n of nodes)
      byDepth[n.depth - 1] = (byDepth[n.depth - 1] ?? 0) + 1;
    expect(byDepth).toEqual([18, 143, 339, 568, 143, 33, 2]);
    // Links: every node but a root has exactly one parent.
    expect(nodes.filter((n) => n.parentId !== null)).toHaveLength(1228);
    expect(nodes.filter((n) => n.childIds.length === 0)).toHaveLength(667);
    expect(
      nodes.filter((n) => n.childIds.length === 1 && n.endIds.length === 0),
    ).toHaveLength(313);
  });

  it('orders the trees by how many progressions each holds', () => {
    expect(
      forest.rootIds.map((id) => [id, forest.nodes.get(id)!.countBelow]),
    ).toEqual([
      ['1 major7', 298],
      ['1 major', 93],
      ['2 minor', 60],
      ['2 minor7', 49],
      ['6 minor7', 34],
      ['5 dominant7', 30],
      ['4 major7', 29],
      ['3 minor7', 27],
      ['4 major', 22],
      ['3 minor', 17],
      ['6 minor', 9],
      ['5 major', 8],
      ['1 dominant7', 7],
      ['3 dominant7', 7],
      ['b7 major', 2],
      ['#5 diminished7', 1],
      ['3 major/#5', 1],
      ['3 dominant7#5', 1],
    ]);
  });

  it('ends all 695 progressions on 687 nodes', () => {
    expect(forest.endNodeOf.size).toBe(CHORD_PROGRESSION_LIBRARY.length);
    expect(CHORD_PROGRESSION_LIBRARY).toHaveLength(695);
    const ends = nodes.filter((n) => n.endIds.length > 0);
    expect(ends).toHaveLength(687);
    expect(ends.filter((n) => n.childIds.length > 0)).toHaveLength(20);
    expect(
      ends
        .filter((n) => n.endIds.length > 1)
        .map((n) => n.endIds.join('/'))
        .sort(),
    ).toEqual([
      '151/152',
      '475/481',
      '485/494',
      '486/495',
      '487/496',
      '488/497',
      '489/498',
      '510/515',
    ]);
    for (const entry of CHORD_PROGRESSION_LIBRARY)
      expect(forest.endNodeOf.get(entry.id)).toBe(
        openingKey(entry.chords.map(normalizeChordSpelling)),
      );
  });

  it('names only chords Prism can play, once the spellings are fixed', () => {
    const bad = new Set<string>();
    for (const n of nodes) if (problem(n.chord)) bad.add(n.chord);
    expect([...bad]).toEqual([]);
  });

  /**
   * Prism's graph was exported from the sheet in March 2026 and has drifted
   * from the library since. Until Prism reads the generated tree, this pins
   * the drift exactly, so nothing new slips in unseen. The Prism diff report
   * written for the owner explains each line. When Prism is switched over,
   * this becomes a plain equality test.
   */
  it("agrees with Prism's current graph except for the known drift", () => {
    const tree = buildOpeningTree(CHORD_PROGRESSION_LIBRARY);
    const same = (a: string[], b: string[]) =>
      [...a].sort().join(',') === [...b].sort().join(',');
    const shared = Object.keys(tree).filter((k) => k in PROGRESSION_GRAPH);
    expect(Object.keys(tree)).toHaveLength(579);
    expect(Object.keys(PROGRESSION_GRAPH)).toHaveLength(548);
    expect(shared).toHaveLength(539);
    expect(
      shared.filter((k) => !same(tree[k], PROGRESSION_GRAPH[k])).sort(),
    ).toEqual([
      '1 major7',
      '1 major7|1 dominant7',
      '1 major7|1 dominant7|4 major7',
      '1 major7|2 dominant7',
      '1 major7|2 minor7|3 dominant7#5',
      '1 major7|2 minor7|3 minor7|4 minor7',
      '1 major7|b7 major7|6 minor7',
      '5 major',
    ]);
    expect(
      Object.keys(PROGRESSION_GRAPH)
        .filter((k) => !(k in tree))
        .sort(),
    ).toEqual([
      '1 major7|1 dominant7|4 minor6',
      '1 major7|1 dominant7|4 minor6|1 major/3',
      '1 major7|1 dominant7|4 minor7',
      '1 major7|1 dominant7|4 minor7|2 minor7b5',
      '1 major7|1 dominant7|b2 major7',
      '1 major7|b5 dominant7sus4',
      '1 major7|b5 dominant7sus4|4 dominant7sus4',
      '1 major7|b5 dominant7sus4|4 dominant7sus4|5 dominant7sus4',
      '1 major7|b7 major7|6 minor7|4 minor6/b3',
    ]);
  });
});
