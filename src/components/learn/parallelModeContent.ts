export interface ParallelModeEntry {
  modeName: string;
  modeSlug: string;
  root: string;
  notes: string[];
  intervals: string;
  parentMode?: string;
}

export interface ParallelKeyEntry {
  keyRoot: string;
  urlParam: string;
  modes: ParallelModeEntry[];
}

export const PARALLEL_MODES_CONTENT: ParallelKeyEntry[] = [
  // ── C ──────────────────────────────────────────────────────────────────
  {
    keyRoot: 'C', urlParam: 'c',
    modes: [
      { modeName: 'Lydian',          modeSlug: 'lydian',          root: 'C', notes: ['C','D','E','F#','G','A','B'],   intervals: '1, 2, 3, #4, 5, 6, 7',    parentMode: 'G Ionian' },
      { modeName: 'Ionian',          modeSlug: 'ionian',          root: 'C', notes: ['C','D','E','F','G','A','B'],    intervals: '1, 2, 3, 4, 5, 6, 7',     parentMode: 'C Ionian' },
      { modeName: 'Mixolydian',      modeSlug: 'mixolydian',      root: 'C', notes: ['C','D','E','F','G','A','Bb'],   intervals: '1, 2, 3, 4, 5, 6, ♭7',    parentMode: 'F Ionian' },
      { modeName: 'Dorian',          modeSlug: 'dorian',          root: 'C', notes: ['C','D','Eb','F','G','A','Bb'],  intervals: '1, 2, ♭3, 4, 5, 6, ♭7',   parentMode: 'Bb Ionian' },
      { modeName: 'Aeolian',         modeSlug: 'aeolian',         root: 'C', notes: ['C','D','Eb','F','G','Ab','Bb'], intervals: '1, 2, ♭3, 4, 5, ♭6, ♭7',  parentMode: 'Eb Ionian' },
      { modeName: 'Phrygian',        modeSlug: 'phrygian',        root: 'C', notes: ['C','Db','Eb','F','G','Ab','Bb'],intervals: '1, ♭2, ♭3, 4, 5, ♭6, ♭7', parentMode: 'Ab Ionian' },
      { modeName: 'Locrian',         modeSlug: 'locrian',         root: 'C', notes: ['C','Db','Eb','F','Gb','Ab','Bb'],intervals:'1, ♭2, ♭3, 4, ♭5, ♭6, ♭7',parentMode: 'Db Ionian' },
      { modeName: 'Harmonic Major',  modeSlug: 'harmonic-major',  root: 'C', notes: ['C','D','E','F','G','Ab','B'],   intervals: '1, 2, 3, 4, 5, ♭6, 7' },
      { modeName: 'Ionian #5',       modeSlug: 'ionian-sharp5',   root: 'C', notes: ['C','D','E','F','G#','A','B'],   intervals: '1, 2, 3, 4, #5, 6, 7' },
      { modeName: 'Mixolydian ♭6',   modeSlug: 'mixolydian-flat6',root: 'C', notes: ['C','D','E','F','G','Ab','Bb'],  intervals: '1, 2, 3, 4, 5, ♭6, ♭7' },
    ],
  },
  // ── G ──────────────────────────────────────────────────────────────────
  {
    keyRoot: 'G', urlParam: 'g',
    modes: [
      { modeName: 'Lydian',          modeSlug: 'lydian',          root: 'G', notes: ['G','A','B','C#','D','E','F#'],  intervals: '1, 2, 3, #4, 5, 6, 7',    parentMode: 'D Ionian' },
      { modeName: 'Ionian',          modeSlug: 'ionian',          root: 'G', notes: ['G','A','B','C','D','E','F#'],   intervals: '1, 2, 3, 4, 5, 6, 7',     parentMode: 'G Ionian' },
      { modeName: 'Mixolydian',      modeSlug: 'mixolydian',      root: 'G', notes: ['G','A','B','C','D','E','F'],    intervals: '1, 2, 3, 4, 5, 6, ♭7',    parentMode: 'C Ionian' },
      { modeName: 'Dorian',          modeSlug: 'dorian',          root: 'G', notes: ['G','A','Bb','C','D','E','F'],   intervals: '1, 2, ♭3, 4, 5, 6, ♭7',   parentMode: 'F Ionian' },
      { modeName: 'Aeolian',         modeSlug: 'aeolian',         root: 'G', notes: ['G','A','Bb','C','D','Eb','F'],  intervals: '1, 2, ♭3, 4, 5, ♭6, ♭7',  parentMode: 'Bb Ionian' },
      { modeName: 'Phrygian',        modeSlug: 'phrygian',        root: 'G', notes: ['G','Ab','Bb','C','D','Eb','F'], intervals: '1, ♭2, ♭3, 4, 5, ♭6, ♭7', parentMode: 'Eb Ionian' },
      { modeName: 'Locrian',         modeSlug: 'locrian',         root: 'G', notes: ['G','Ab','Bb','C','Db','Eb','F'],intervals:'1, ♭2, ♭3, 4, ♭5, ♭6, ♭7',parentMode: 'Ab Ionian' },
      { modeName: 'Harmonic Major',  modeSlug: 'harmonic-major',  root: 'G', notes: ['G','A','B','C','D','Eb','F#'],  intervals: '1, 2, 3, 4, 5, ♭6, 7' },
      { modeName: 'Ionian #5',       modeSlug: 'ionian-sharp5',   root: 'G', notes: ['G','A','B','C','D#','E','F#'],  intervals: '1, 2, 3, 4, #5, 6, 7' },
      { modeName: 'Mixolydian ♭6',   modeSlug: 'mixolydian-flat6',root: 'G', notes: ['G','A','B','C','D','Eb','F'],   intervals: '1, 2, 3, 4, 5, ♭6, ♭7' },
    ],
  },
  // ── D ──────────────────────────────────────────────────────────────────
  {
    keyRoot: 'D', urlParam: 'd',
    modes: [
      { modeName: 'Lydian',          modeSlug: 'lydian',          root: 'D', notes: ['D','E','F#','G#','A','B','C#'],  intervals: '1, 2, 3, #4, 5, 6, 7',    parentMode: 'A Ionian' },
      { modeName: 'Ionian',          modeSlug: 'ionian',          root: 'D', notes: ['D','E','F#','G','A','B','C#'],   intervals: '1, 2, 3, 4, 5, 6, 7',     parentMode: 'D Ionian' },
      { modeName: 'Mixolydian',      modeSlug: 'mixolydian',      root: 'D', notes: ['D','E','F#','G','A','B','C'],    intervals: '1, 2, 3, 4, 5, 6, ♭7',    parentMode: 'G Ionian' },
      { modeName: 'Dorian',          modeSlug: 'dorian',          root: 'D', notes: ['D','E','F','G','A','B','C'],     intervals: '1, 2, ♭3, 4, 5, 6, ♭7',   parentMode: 'C Ionian' },
      { modeName: 'Aeolian',         modeSlug: 'aeolian',         root: 'D', notes: ['D','E','F','G','A','Bb','C'],    intervals: '1, 2, ♭3, 4, 5, ♭6, ♭7',  parentMode: 'F Ionian' },
      { modeName: 'Phrygian',        modeSlug: 'phrygian',        root: 'D', notes: ['D','Eb','F','G','A','Bb','C'],   intervals: '1, ♭2, ♭3, 4, 5, ♭6, ♭7', parentMode: 'Bb Ionian' },
      { modeName: 'Locrian',         modeSlug: 'locrian',         root: 'D', notes: ['D','Eb','F','G','Ab','Bb','C'],  intervals: '1, ♭2, ♭3, 4, ♭5, ♭6, ♭7',parentMode: 'Eb Ionian' },
      { modeName: 'Harmonic Major',  modeSlug: 'harmonic-major',  root: 'D', notes: ['D','E','F#','G','A','Bb','C#'],  intervals: '1, 2, 3, 4, 5, ♭6, 7' },
      { modeName: 'Ionian #5',       modeSlug: 'ionian-sharp5',   root: 'D', notes: ['D','E','F#','G','A#','B','C#'],  intervals: '1, 2, 3, 4, #5, 6, 7' },
      { modeName: 'Mixolydian ♭6',   modeSlug: 'mixolydian-flat6',root: 'D', notes: ['D','E','F#','G','A','Bb','C'],   intervals: '1, 2, 3, 4, 5, ♭6, ♭7' },
    ],
  },
  // ── A ──────────────────────────────────────────────────────────────────
  {
    keyRoot: 'A', urlParam: 'a',
    modes: [
      { modeName: 'Lydian',          modeSlug: 'lydian',          root: 'A', notes: ['A','B','C#','D#','E','F#','G#'],  intervals: '1, 2, 3, #4, 5, 6, 7',    parentMode: 'E Ionian' },
      { modeName: 'Ionian',          modeSlug: 'ionian',          root: 'A', notes: ['A','B','C#','D','E','F#','G#'],   intervals: '1, 2, 3, 4, 5, 6, 7',     parentMode: 'A Ionian' },
      { modeName: 'Mixolydian',      modeSlug: 'mixolydian',      root: 'A', notes: ['A','B','C#','D','E','F#','G'],    intervals: '1, 2, 3, 4, 5, 6, ♭7',    parentMode: 'D Ionian' },
      { modeName: 'Dorian',          modeSlug: 'dorian',          root: 'A', notes: ['A','B','C','D','E','F#','G'],     intervals: '1, 2, ♭3, 4, 5, 6, ♭7',   parentMode: 'G Ionian' },
      { modeName: 'Aeolian',         modeSlug: 'aeolian',         root: 'A', notes: ['A','B','C','D','E','F','G'],      intervals: '1, 2, ♭3, 4, 5, ♭6, ♭7',  parentMode: 'C Ionian' },
      { modeName: 'Phrygian',        modeSlug: 'phrygian',        root: 'A', notes: ['A','Bb','C','D','E','F','G'],     intervals: '1, ♭2, ♭3, 4, 5, ♭6, ♭7', parentMode: 'F Ionian' },
      { modeName: 'Locrian',         modeSlug: 'locrian',         root: 'A', notes: ['A','Bb','C','D','Eb','F','G'],    intervals: '1, ♭2, ♭3, 4, ♭5, ♭6, ♭7',parentMode: 'Bb Ionian' },
      { modeName: 'Harmonic Major',  modeSlug: 'harmonic-major',  root: 'A', notes: ['A','B','C#','D','E','F','G#'],    intervals: '1, 2, 3, 4, 5, ♭6, 7' },
      { modeName: 'Ionian #5',       modeSlug: 'ionian-sharp5',   root: 'A', notes: ['A','B','C#','D','E#','F#','G#'],  intervals: '1, 2, 3, 4, #5, 6, 7' },
      { modeName: 'Mixolydian ♭6',   modeSlug: 'mixolydian-flat6',root: 'A', notes: ['A','B','C#','D','E','F','G'],     intervals: '1, 2, 3, 4, 5, ♭6, ♭7' },
    ],
  },
  // ── E ──────────────────────────────────────────────────────────────────
  {
    keyRoot: 'E', urlParam: 'e',
    modes: [
      { modeName: 'Lydian',          modeSlug: 'lydian',          root: 'E', notes: ['E','F#','G#','A#','B','C#','D#'],  intervals: '1, 2, 3, #4, 5, 6, 7',    parentMode: 'B Ionian' },
      { modeName: 'Ionian',          modeSlug: 'ionian',          root: 'E', notes: ['E','F#','G#','A','B','C#','D#'],   intervals: '1, 2, 3, 4, 5, 6, 7',     parentMode: 'E Ionian' },
      { modeName: 'Mixolydian',      modeSlug: 'mixolydian',      root: 'E', notes: ['E','F#','G#','A','B','C#','D'],    intervals: '1, 2, 3, 4, 5, 6, ♭7',    parentMode: 'A Ionian' },
      { modeName: 'Dorian',          modeSlug: 'dorian',          root: 'E', notes: ['E','F#','G','A','B','C#','D'],     intervals: '1, 2, ♭3, 4, 5, 6, ♭7',   parentMode: 'D Ionian' },
      { modeName: 'Aeolian',         modeSlug: 'aeolian',         root: 'E', notes: ['E','F#','G','A','B','C','D'],      intervals: '1, 2, ♭3, 4, 5, ♭6, ♭7',  parentMode: 'G Ionian' },
      { modeName: 'Phrygian',        modeSlug: 'phrygian',        root: 'E', notes: ['E','F','G','A','B','C','D'],       intervals: '1, ♭2, ♭3, 4, 5, ♭6, ♭7', parentMode: 'C Ionian' },
      { modeName: 'Locrian',         modeSlug: 'locrian',         root: 'E', notes: ['E','F','G','A','Bb','C','D'],      intervals: '1, ♭2, ♭3, 4, ♭5, ♭6, ♭7',parentMode: 'F Ionian' },
      { modeName: 'Harmonic Major',  modeSlug: 'harmonic-major',  root: 'E', notes: ['E','F#','G#','A','B','C','D#'],    intervals: '1, 2, 3, 4, 5, ♭6, 7' },
      { modeName: 'Ionian #5',       modeSlug: 'ionian-sharp5',   root: 'E', notes: ['E','F#','G#','A','B#','C#','D#'],  intervals: '1, 2, 3, 4, #5, 6, 7' },
      { modeName: 'Mixolydian ♭6',   modeSlug: 'mixolydian-flat6',root: 'E', notes: ['E','F#','G#','A','B','C','D'],     intervals: '1, 2, 3, 4, 5, ♭6, ♭7' },
    ],
  },
  // ── B ──────────────────────────────────────────────────────────────────
  {
    keyRoot: 'B', urlParam: 'b',
    modes: [
      { modeName: 'Lydian',          modeSlug: 'lydian',          root: 'B', notes: ['B','C#','D#','E#','F#','G#','A#'],  intervals: '1, 2, 3, #4, 5, 6, 7',    parentMode: 'F# Ionian' },
      { modeName: 'Ionian',          modeSlug: 'ionian',          root: 'B', notes: ['B','C#','D#','E','F#','G#','A#'],   intervals: '1, 2, 3, 4, 5, 6, 7',     parentMode: 'B Ionian' },
      { modeName: 'Mixolydian',      modeSlug: 'mixolydian',      root: 'B', notes: ['B','C#','D#','E','F#','G#','A'],    intervals: '1, 2, 3, 4, 5, 6, ♭7',    parentMode: 'E Ionian' },
      { modeName: 'Dorian',          modeSlug: 'dorian',          root: 'B', notes: ['B','C#','D','E','F#','G#','A'],     intervals: '1, 2, ♭3, 4, 5, 6, ♭7',   parentMode: 'A Ionian' },
      { modeName: 'Aeolian',         modeSlug: 'aeolian',         root: 'B', notes: ['B','C#','D','E','F#','G','A'],      intervals: '1, 2, ♭3, 4, 5, ♭6, ♭7',  parentMode: 'D Ionian' },
      { modeName: 'Phrygian',        modeSlug: 'phrygian',        root: 'B', notes: ['B','C','D','E','F#','G','A'],       intervals: '1, ♭2, ♭3, 4, 5, ♭6, ♭7', parentMode: 'G Ionian' },
      { modeName: 'Locrian',         modeSlug: 'locrian',         root: 'B', notes: ['B','C','D','E','F','G','A'],        intervals: '1, ♭2, ♭3, 4, ♭5, ♭6, ♭7',parentMode: 'C Ionian' },
      { modeName: 'Harmonic Major',  modeSlug: 'harmonic-major',  root: 'B', notes: ['B','C#','D#','E','F#','G','A#'],    intervals: '1, 2, 3, 4, 5, ♭6, 7' },
      { modeName: 'Ionian #5',       modeSlug: 'ionian-sharp5',   root: 'B', notes: ['B','C#','D#','E','FX','G#','A#'],   intervals: '1, 2, 3, 4, #5, 6, 7' },
      { modeName: 'Mixolydian ♭6',   modeSlug: 'mixolydian-flat6',root: 'B', notes: ['B','C#','D#','E','F#','G','A'],     intervals: '1, 2, 3, 4, 5, ♭6, ♭7' },
    ],
  },
  // ── F# ─────────────────────────────────────────────────────────────────
  {
    keyRoot: 'F#', urlParam: 'fsharp',
    modes: [
      { modeName: 'Lydian',          modeSlug: 'lydian',          root: 'F#', notes: ['F#','G#','A#','B#','C#','D#','E#'],  intervals: '1, 2, 3, #4, 5, 6, 7',    parentMode: 'C# Ionian' },
      { modeName: 'Ionian',          modeSlug: 'ionian',          root: 'F#', notes: ['F#','G#','A#','B','C#','D#','E#'],   intervals: '1, 2, 3, 4, 5, 6, 7',     parentMode: 'F# Ionian' },
      { modeName: 'Mixolydian',      modeSlug: 'mixolydian',      root: 'F#', notes: ['F#','G#','A#','B','C#','D#','E'],    intervals: '1, 2, 3, 4, 5, 6, ♭7',    parentMode: 'B Ionian' },
      { modeName: 'Dorian',          modeSlug: 'dorian',          root: 'F#', notes: ['F#','G#','A','B','C#','D#','E'],     intervals: '1, 2, ♭3, 4, 5, 6, ♭7',   parentMode: 'E Ionian' },
      { modeName: 'Aeolian',         modeSlug: 'aeolian',         root: 'F#', notes: ['F#','G#','A','B','C#','D','E'],      intervals: '1, 2, ♭3, 4, 5, ♭6, ♭7',  parentMode: 'A Ionian' },
      { modeName: 'Phrygian',        modeSlug: 'phrygian',        root: 'F#', notes: ['F#','G','A','B','C#','D','E'],       intervals: '1, ♭2, ♭3, 4, 5, ♭6, ♭7', parentMode: 'D Ionian' },
      { modeName: 'Locrian',         modeSlug: 'locrian',         root: 'F#', notes: ['F#','G','A','B','C','D','E'],        intervals: '1, ♭2, ♭3, 4, ♭5, ♭6, ♭7',parentMode: 'G Ionian' },
      { modeName: 'Harmonic Major',  modeSlug: 'harmonic-major',  root: 'F#', notes: ['F#','G#','A#','B','C#','D','E#'],    intervals: '1, 2, 3, 4, 5, ♭6, 7' },
      { modeName: 'Ionian #5',       modeSlug: 'ionian-sharp5',   root: 'F#', notes: ['F#','G#','A#','B','CX','D#','E#'],   intervals: '1, 2, 3, 4, #5, 6, 7' },
      { modeName: 'Mixolydian ♭6',   modeSlug: 'mixolydian-flat6',root: 'F#', notes: ['F#','G#','A#','B','C#','D','E'],     intervals: '1, 2, 3, 4, 5, ♭6, ♭7' },
    ],
  },
  // ── Db / C# ────────────────────────────────────────────────────────────
  {
    keyRoot: 'Db', urlParam: 'dflat',
    modes: [
      { modeName: 'Lydian',          modeSlug: 'lydian',          root: 'Db', notes: ['Db','Eb','F','G','Ab','Bb','C'],      intervals: '1, 2, 3, #4, 5, 6, 7',    parentMode: 'Ab Ionian' },
      { modeName: 'Ionian',          modeSlug: 'ionian',          root: 'Db', notes: ['Db','Eb','F','Gb','Ab','Bb','C'],     intervals: '1, 2, 3, 4, 5, 6, 7',     parentMode: 'Db Ionian' },
      { modeName: 'Mixolydian',      modeSlug: 'mixolydian',      root: 'C#', notes: ['C#','D#','E#','F#','G#','A#','B'],    intervals: '1, 2, 3, 4, 5, 6, ♭7',    parentMode: 'F# Ionian' },
      { modeName: 'Dorian',          modeSlug: 'dorian',          root: 'C#', notes: ['C#','D#','E','F#','G#','A#','B'],     intervals: '1, 2, ♭3, 4, 5, 6, ♭7',   parentMode: 'B Ionian' },
      { modeName: 'Aeolian',         modeSlug: 'aeolian',         root: 'C#', notes: ['C#','D#','E','F#','G#','A','B'],      intervals: '1, 2, ♭3, 4, 5, ♭6, ♭7',  parentMode: 'E Ionian' },
      { modeName: 'Phrygian',        modeSlug: 'phrygian',        root: 'C#', notes: ['C#','D','E','F#','G#','A','B'],       intervals: '1, ♭2, ♭3, 4, 5, ♭6, ♭7', parentMode: 'A Ionian' },
      { modeName: 'Locrian',         modeSlug: 'locrian',         root: 'C#', notes: ['C#','D','E','F#','G','A','B'],        intervals: '1, ♭2, ♭3, 4, ♭5, ♭6, ♭7',parentMode: 'D Ionian' },
      { modeName: 'Harmonic Major',  modeSlug: 'harmonic-major',  root: 'Db', notes: ['Db','Eb','F','Gb','Ab','Bbb','C'],    intervals: '1, 2, 3, 4, 5, ♭6, 7' },
      { modeName: 'Ionian #5',       modeSlug: 'ionian-sharp5',   root: 'Db', notes: ['Db','Eb','F','Gb','A','Bb','C'],      intervals: '1, 2, 3, 4, #5, 6, 7' },
      { modeName: 'Mixolydian ♭6',   modeSlug: 'mixolydian-flat6',root: 'C#', notes: ['C#','D#','E#','F#','G#','A','B'],     intervals: '1, 2, 3, 4, 5, ♭6, ♭7' },
    ],
  },
  // ── Ab / G# ────────────────────────────────────────────────────────────
  {
    keyRoot: 'Ab', urlParam: 'aflat',
    modes: [
      { modeName: 'Lydian',          modeSlug: 'lydian',          root: 'Ab', notes: ['Ab','Bb','C','D','Eb','F','G'],       intervals: '1, 2, 3, #4, 5, 6, 7',    parentMode: 'Eb Ionian' },
      { modeName: 'Ionian',          modeSlug: 'ionian',          root: 'Ab', notes: ['Ab','Bb','C','Db','Eb','F','G'],      intervals: '1, 2, 3, 4, 5, 6, 7',     parentMode: 'Ab Ionian' },
      { modeName: 'Mixolydian',      modeSlug: 'mixolydian',      root: 'Ab', notes: ['Ab','Bb','C','Db','Eb','F','Gb'],     intervals: '1, 2, 3, 4, 5, 6, ♭7',    parentMode: 'Db Ionian' },
      { modeName: 'Dorian',          modeSlug: 'dorian',          root: 'G#', notes: ['G#','A#','B','C#','D#','E#','F#'],    intervals: '1, 2, ♭3, 4, 5, 6, ♭7',   parentMode: 'F# Ionian' },
      { modeName: 'Aeolian',         modeSlug: 'aeolian',         root: 'G#', notes: ['G#','A#','B','C#','D#','E','F#'],     intervals: '1, 2, ♭3, 4, 5, ♭6, ♭7',  parentMode: 'B Ionian' },
      { modeName: 'Phrygian',        modeSlug: 'phrygian',        root: 'G#', notes: ['G#','A','B','C#','D#','E','F#'],      intervals: '1, ♭2, ♭3, 4, 5, ♭6, ♭7', parentMode: 'E Ionian' },
      { modeName: 'Locrian',         modeSlug: 'locrian',         root: 'G#', notes: ['G#','A','B','C#','D','E','F#'],       intervals: '1, ♭2, ♭3, 4, ♭5, ♭6, ♭7',parentMode: 'A Ionian' },
      { modeName: 'Harmonic Major',  modeSlug: 'harmonic-major',  root: 'Ab', notes: ['Ab','Bb','C','Db','Eb','Fb','G'],     intervals: '1, 2, 3, 4, 5, ♭6, 7' },
      { modeName: 'Ionian #5',       modeSlug: 'ionian-sharp5',   root: 'Ab', notes: ['Ab','Bb','C','Db','E','F','G'],       intervals: '1, 2, 3, 4, #5, 6, 7' },
      { modeName: 'Mixolydian ♭6',   modeSlug: 'mixolydian-flat6',root: 'Ab', notes: ['Ab','Bb','C','Db','Eb','Fb','Gb'],    intervals: '1, 2, 3, 4, 5, ♭6, ♭7' },
    ],
  },
  // ── Eb / D# ────────────────────────────────────────────────────────────
  {
    keyRoot: 'Eb', urlParam: 'eflat',
    modes: [
      { modeName: 'Lydian',          modeSlug: 'lydian',          root: 'Eb', notes: ['Eb','F','G','A','Bb','C','D'],        intervals: '1, 2, 3, #4, 5, 6, 7',    parentMode: 'Bb Ionian' },
      { modeName: 'Ionian',          modeSlug: 'ionian',          root: 'Eb', notes: ['Eb','F','G','Ab','Bb','C','D'],       intervals: '1, 2, 3, 4, 5, 6, 7',     parentMode: 'Eb Ionian' },
      { modeName: 'Mixolydian',      modeSlug: 'mixolydian',      root: 'Eb', notes: ['Eb','F','G','Ab','Bb','C','Db'],      intervals: '1, 2, 3, 4, 5, 6, ♭7',    parentMode: 'Ab Ionian' },
      { modeName: 'Dorian',          modeSlug: 'dorian',          root: 'Eb', notes: ['Eb','F','Gb','Ab','Bb','C','Db'],     intervals: '1, 2, ♭3, 4, 5, 6, ♭7',   parentMode: 'Db Ionian' },
      { modeName: 'Aeolian',         modeSlug: 'aeolian',         root: 'D#', notes: ['D#','E#','F#','G#','A#','B','C#'],    intervals: '1, 2, ♭3, 4, 5, ♭6, ♭7',  parentMode: 'F# Ionian' },
      { modeName: 'Phrygian',        modeSlug: 'phrygian',        root: 'D#', notes: ['D#','E','F#','G#','A#','B','C#'],     intervals: '1, ♭2, ♭3, 4, 5, ♭6, ♭7', parentMode: 'B Ionian' },
      { modeName: 'Locrian',         modeSlug: 'locrian',         root: 'D#', notes: ['D#','E','F#','G#','A','B','C#'],      intervals: '1, ♭2, ♭3, 4, ♭5, ♭6, ♭7',parentMode: 'E Ionian' },
      { modeName: 'Harmonic Major',  modeSlug: 'harmonic-major',  root: 'Eb', notes: ['Eb','F','G','Ab','Bb','Cb','D'],      intervals: '1, 2, 3, 4, 5, ♭6, 7' },
      { modeName: 'Ionian #5',       modeSlug: 'ionian-sharp5',   root: 'Eb', notes: ['Eb','F','G','Ab','B','C','D'],        intervals: '1, 2, 3, 4, #5, 6, 7' },
      { modeName: 'Mixolydian ♭6',   modeSlug: 'mixolydian-flat6',root: 'Eb', notes: ['Eb','F','G','Ab','Bb','Cb','Db'],     intervals: '1, 2, 3, 4, 5, ♭6, ♭7' },
    ],
  },
  // ── Bb / A# ────────────────────────────────────────────────────────────
  {
    keyRoot: 'Bb', urlParam: 'bflat',
    modes: [
      { modeName: 'Lydian',          modeSlug: 'lydian',          root: 'Bb', notes: ['Bb','C','D','E','F','G','A'],         intervals: '1, 2, 3, #4, 5, 6, 7',    parentMode: 'F Ionian' },
      { modeName: 'Ionian',          modeSlug: 'ionian',          root: 'Bb', notes: ['Bb','C','D','Eb','F','G','A'],        intervals: '1, 2, 3, 4, 5, 6, 7',     parentMode: 'Bb Ionian' },
      { modeName: 'Mixolydian',      modeSlug: 'mixolydian',      root: 'Bb', notes: ['Bb','C','D','Eb','F','G','Ab'],       intervals: '1, 2, 3, 4, 5, 6, ♭7',    parentMode: 'Eb Ionian' },
      { modeName: 'Dorian',          modeSlug: 'dorian',          root: 'Bb', notes: ['Bb','C','Db','Eb','F','G','Ab'],      intervals: '1, 2, ♭3, 4, 5, 6, ♭7',   parentMode: 'Ab Ionian' },
      { modeName: 'Aeolian',         modeSlug: 'aeolian',         root: 'Bb', notes: ['Bb','C','Db','Eb','F','Gb','Ab'],     intervals: '1, 2, ♭3, 4, 5, ♭6, ♭7',  parentMode: 'Db Ionian' },
      { modeName: 'Phrygian',        modeSlug: 'phrygian',        root: 'A#', notes: ['A#','B','C#','D#','E#','F#','G#'],    intervals: '1, ♭2, ♭3, 4, 5, ♭6, ♭7', parentMode: 'F# Ionian' },
      { modeName: 'Locrian',         modeSlug: 'locrian',         root: 'A#', notes: ['A#','B','C#','D#','E','F#','G#'],     intervals: '1, ♭2, ♭3, 4, ♭5, ♭6, ♭7',parentMode: 'B Ionian' },
      { modeName: 'Harmonic Major',  modeSlug: 'harmonic-major',  root: 'Bb', notes: ['Bb','C','D','Eb','F','Gb','A'],       intervals: '1, 2, 3, 4, 5, ♭6, 7' },
      { modeName: 'Ionian #5',       modeSlug: 'ionian-sharp5',   root: 'Bb', notes: ['Bb','C','D','Eb','F#','G','A'],       intervals: '1, 2, 3, 4, #5, 6, 7' },
      { modeName: 'Mixolydian ♭6',   modeSlug: 'mixolydian-flat6',root: 'Bb', notes: ['Bb','C','D','Eb','F','Gb','Ab'],      intervals: '1, 2, 3, 4, 5, ♭6, ♭7' },
    ],
  },
  // ── F / E# ─────────────────────────────────────────────────────────────
  {
    keyRoot: 'F', urlParam: 'f',
    modes: [
      { modeName: 'Lydian',          modeSlug: 'lydian',          root: 'F',  notes: ['F','G','A','B','C','D','E'],           intervals: '1, 2, 3, #4, 5, 6, 7',    parentMode: 'C Ionian' },
      { modeName: 'Ionian',          modeSlug: 'ionian',          root: 'F',  notes: ['F','G','A','Bb','C','D','E'],          intervals: '1, 2, 3, 4, 5, 6, 7',     parentMode: 'F Ionian' },
      { modeName: 'Mixolydian',      modeSlug: 'mixolydian',      root: 'F',  notes: ['F','G','A','Bb','C','D','Eb'],         intervals: '1, 2, 3, 4, 5, 6, ♭7',    parentMode: 'Bb Ionian' },
      { modeName: 'Dorian',          modeSlug: 'dorian',          root: 'F',  notes: ['F','G','Ab','Bb','C','D','Eb'],        intervals: '1, 2, ♭3, 4, 5, 6, ♭7',   parentMode: 'Eb Ionian' },
      { modeName: 'Aeolian',         modeSlug: 'aeolian',         root: 'F',  notes: ['F','G','Ab','Bb','C','Db','Eb'],       intervals: '1, 2, ♭3, 4, 5, ♭6, ♭7',  parentMode: 'Ab Ionian' },
      { modeName: 'Phrygian',        modeSlug: 'phrygian',        root: 'F',  notes: ['F','Gb','Ab','Bb','C','Db','Eb'],      intervals: '1, ♭2, ♭3, 4, 5, ♭6, ♭7', parentMode: 'Db Ionian' },
      { modeName: 'Locrian',         modeSlug: 'locrian',         root: 'E#', notes: ['E#','F#','G#','A#','B','C#','D#'],     intervals: '1, ♭2, ♭3, 4, ♭5, ♭6, ♭7',parentMode: 'F# Ionian' },
      { modeName: 'Harmonic Major',  modeSlug: 'harmonic-major',  root: 'F',  notes: ['F','G','A','Bb','C','Db','E'],         intervals: '1, 2, 3, 4, 5, ♭6, 7' },
      { modeName: 'Ionian #5',       modeSlug: 'ionian-sharp5',   root: 'F',  notes: ['F','G','A','Bb','C#','D','E'],         intervals: '1, 2, 3, 4, #5, 6, 7' },
      { modeName: 'Mixolydian ♭6',   modeSlug: 'mixolydian-flat6',root: 'F',  notes: ['F','G','A','Bb','C','Db','Eb'],        intervals: '1, 2, 3, 4, 5, ♭6, ♭7' },
    ],
  },
];

export const findByUrlParam = (param: string): ParallelKeyEntry | undefined =>
  PARALLEL_MODES_CONTENT.find((e) => e.urlParam === param);
