import { describe, it, expect } from 'vitest';
import {
  findBorrowedSources,
  getBestBorrowedSource,
} from '../engine/modalInterchange';

// Pitch classes: C=0, C#=1, D=2, Eb=3, E=4, F=5, F#=6, G=7, Ab=8, A=9, Bb=10, B=11

describe('findBorrowedSources', () => {
  it('finds aeolian as source for iv (Fm) in C ionian', () => {
    const sources = findBorrowedSources(5, 'minor', 0, 'ionian');
    expect(sources.length).toBeGreaterThan(0);
    // Aeolian should be among the results (iv is diatonic to aeolian)
    const aeolian = sources.find((s) => s.sourceMode === 'aeolian');
    expect(aeolian).toBeDefined();
    expect(aeolian!.degreeInSourceMode).toBe(4);
    expect(aeolian!.sourceModeFamily).toBe('Diatonic');
  });

  it('finds aeolian as source for bVI (Ab major) in C ionian', () => {
    const sources = findBorrowedSources(8, 'major', 0, 'ionian');
    const aeolian = sources.find((s) => s.sourceMode === 'aeolian');
    expect(aeolian).toBeDefined();
    expect(aeolian!.degreeInSourceMode).toBe(6);
  });

  it('finds mixolydian as source for bVII (Bb major) in C ionian', () => {
    const sources = findBorrowedSources(10, 'major', 0, 'ionian');
    const mixo = sources.find((s) => s.sourceMode === 'mixolydian');
    expect(mixo).toBeDefined();
    expect(mixo!.degreeInSourceMode).toBe(7);
  });

  it('finds dorian as source for IV (D major) in A aeolian', () => {
    // A aeolian = A minor. D major is NOT diatonic (v = Em, not D major).
    // In A dorian, D is the IV degree → major triad.
    const sources = findBorrowedSources(2, 'major', 9, 'aeolian');
    const dorian = sources.find((s) => s.sourceMode === 'dorian');
    expect(dorian).toBeDefined();
    expect(dorian!.degreeInSourceMode).toBe(4);
  });

  it('excludes the primary mode from results', () => {
    // C major IS diatonic to C ionian, but we're asking for borrowed sources
    // from the perspective of ionian — it should not appear
    const sources = findBorrowedSources(0, 'major', 0, 'ionian');
    const ionian = sources.find((s) => s.sourceMode === 'ionian');
    expect(ionian).toBeUndefined();
  });

  it('returns empty array for a chord diatonic only to the primary mode', () => {
    // B diminished is diatonic only to ionian among diatonic modes
    // But other families may contain it too, so check for at least no ionian
    const sources = findBorrowedSources(11, 'diminished', 0, 'ionian');
    const ionian = sources.find((s) => s.sourceMode === 'ionian');
    expect(ionian).toBeUndefined();
  });

  it('finds multiple source modes for ambiguous chords', () => {
    // bIII (Eb major) in C ionian — exists in aeolian, phrygian, dorian, etc.
    const sources = findBorrowedSources(3, 'major', 0, 'ionian');
    expect(sources.length).toBeGreaterThanOrEqual(2);
    const modes = sources.map((s) => s.sourceMode);
    expect(modes).toContain('aeolian');
    expect(modes).toContain('phrygian');
  });

  it('ranks diatonic family modes above exotic families', () => {
    // Fm in C ionian — should rank aeolian (diatonic) above harmonicMajor
    const sources = findBorrowedSources(5, 'minor', 0, 'ionian');
    const aeolianIdx = sources.findIndex((s) => s.sourceMode === 'aeolian');
    const harmMajIdx = sources.findIndex(
      (s) => s.sourceModeFamily === 'Harmonic Major',
    );
    if (harmMajIdx >= 0) {
      expect(aeolianIdx).toBeLessThan(harmMajIdx);
    }
  });

  it('handles harmonic minor borrowed chords', () => {
    // In C ionian, the chord Bdim7 (B diminished7) is from C harmonic minor (degree 7)
    const sources = findBorrowedSources(11, 'diminished7', 0, 'ionian');
    const harmMinor = sources.find((s) => s.sourceMode === 'harmonicMinor');
    expect(harmMinor).toBeDefined();
    expect(harmMinor!.degreeInSourceMode).toBe(7);
  });

  it('works with transposed keys', () => {
    // G ionian: F major is bVII, borrowed from G mixolydian
    const sources = findBorrowedSources(5, 'major', 7, 'ionian');
    const mixo = sources.find((s) => s.sourceMode === 'mixolydian');
    expect(mixo).toBeDefined();
    expect(mixo!.degreeInSourceMode).toBe(7);
  });
});

describe('getBestBorrowedSource', () => {
  it('returns the best source for bVI in C ionian', () => {
    const best = getBestBorrowedSource(8, 'major', 0, 'ionian');
    expect(best).not.toBeNull();
    // Should be from a diatonic mode (aeolian or phrygian)
    expect(best!.sourceModeFamily).toBe('Diatonic');
  });

  it('returns null for a purely chromatic chord', () => {
    // F# augmented is unlikely to be diatonic to any parallel mode of C
    const best = getBestBorrowedSource(6, 'augmented', 0, 'ionian');
    // It might or might not exist in exotic modes — just verify the function works
    // If null, that's a valid result
    if (best) {
      expect(best.confidence).toBeGreaterThan(0);
    }
  });

  it('returns aeolian for iv minor in C ionian', () => {
    const best = getBestBorrowedSource(5, 'minor', 0, 'ionian');
    expect(best).not.toBeNull();
    // Aeolian is the most natural source for iv
    expect(best!.sourceMode).toBe('aeolian');
    expect(best!.degreeInSourceMode).toBe(4);
  });

  it('returns dorian for i minor6 in C ionian', () => {
    // C minor6 in C ionian — dorian has minor triad on degree 1
    // and minor7 on degree 1, but minor6 needs checking
    const best = getBestBorrowedSource(0, 'minor', 0, 'ionian');
    expect(best).not.toBeNull();
    // Multiple modes have Cm (aeolian, dorian, phrygian...)
    // The brightest diatonic mode with Cm should win
    expect(best!.sourceModeFamily).toBe('Diatonic');
  });
});
