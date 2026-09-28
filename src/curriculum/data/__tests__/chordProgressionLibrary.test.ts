import { describe, expect, it } from 'vitest';
import CHORD_PROGRESSION_LIBRARY from '@/curriculum/data/chordProgressionLibrary';
import { VIBE_ALGORITHMS } from '@/curriculum/engine/vibeAlgorithms';

/**
 * The progression library's own consistency.
 *
 * It was seeded from the "Every Chord Progression" sheets and imported again on
 * 2026-09-26 (109 rows the sheets had gained). The derived fields —
 * `chordCount`, `startingChord`, `startingDegree`, `progression` — are written
 * alongside `chords` rather than computed, so they can disagree with it, and an
 * importer is exactly how that happens.
 */

const VALID_VIBES = new Set(Object.keys(VIBE_ALGORITHMS));
const VALID_COMPLEXITY = new Set(['triad', '7th', 'extended']);

describe('chord progression library', () => {
  it('holds the imported corpus', () => {
    expect(CHORD_PROGRESSION_LIBRARY.length).toBeGreaterThan(690);
  });

  it('gives every entry a unique id', () => {
    const ids = CHORD_PROGRESSION_LIBRARY.map((p) => p.id);
    expect(ids.length).toBe(new Set(ids).size);
  });

  it('keeps the derived fields true to `chords`', () => {
    const wrong: string[] = [];
    for (const p of CHORD_PROGRESSION_LIBRARY) {
      if (p.chordCount !== p.chords.length)
        wrong.push(
          `${p.id}: chordCount ${p.chordCount} vs ${p.chords.length} chords`,
        );
      if (p.startingChord !== p.chords[0])
        wrong.push(
          `${p.id}: startingChord '${p.startingChord}' vs '${p.chords[0]}'`,
        );
      if (p.progression !== p.chords.join(' - '))
        wrong.push(`${p.id}: progression string does not match chords`);
    }
    expect(wrong).toEqual([]);
  });

  it('never leaves a progression empty', () => {
    const empty = CHORD_PROGRESSION_LIBRARY.filter(
      (p) => p.chords.length === 0 || p.chords.some((c) => !c.trim()),
    ).map((p) => String(p.id));
    expect(empty).toEqual([]);
  });

  it('uses vibes the algorithms know', () => {
    const unknown = CHORD_PROGRESSION_LIBRARY.flatMap((p) =>
      p.vibes.filter((v) => !VALID_VIBES.has(v)).map((v) => `${p.id}: '${v}'`),
    );
    expect(unknown).toEqual([]);
  });

  it('uses a complexity tier the filter understands', () => {
    const bad = CHORD_PROGRESSION_LIBRARY.filter(
      (p) => !VALID_COMPLEXITY.has(p.complexity),
    ).map((p) => `${p.id}: '${p.complexity}'`);
    expect(bad).toEqual([]);
  });
});
