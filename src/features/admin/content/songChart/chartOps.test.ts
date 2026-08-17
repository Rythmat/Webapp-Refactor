import { describe, expect, it } from 'vitest';
import type { SongSection } from '@/curriculum/types/songLibrary';
import {
  addBar,
  addChord,
  addChordAt,
  addSection,
  coerceSongForPreview,
  DEFAULT_CHORD,
  getSections,
  insertBar,
  moveSection,
  normalizeAccidentals,
  removeBar,
  removeChord,
  removeSection,
  updateBar,
  updateChord,
  updateSection,
} from './chartOps';

const sample = (): SongSection[] => [
  {
    id: 'verse_1',
    label: 'Verse 1',
    bars: [
      { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
      { chords: [] },
    ],
  },
  { id: 'chorus_1', label: 'Chorus', bars: [{ chords: [] }] },
];

describe('normalizeAccidentals', () => {
  it('converts ASCII accidentals to ♭/♯ while leaving uppercase roots alone', () => {
    expect(normalizeAccidentals('Bb')).toBe('B♭');
    expect(normalizeAccidentals('F#m')).toBe('F♯m');
    expect(normalizeAccidentals('#4')).toBe('♯4');
    expect(normalizeAccidentals('Bbmaj7/F')).toBe('B♭maj7/F');
  });
});

describe('getSections', () => {
  it('reads a chart and tolerates a missing/invalid one', () => {
    expect(getSections({ sections: sample() })).toHaveLength(2);
    expect(getSections({})).toEqual([]);
    expect(getSections({ sections: 'nope' })).toEqual([]);
  });
});

describe('section ops', () => {
  it('adds a blank-labeled 4-bar section with a unique id, without mutating input', () => {
    const before = sample();
    const after = addSection(before);
    expect(after).toHaveLength(3);
    expect(new Set(after.map((s) => s.id)).size).toBe(3);
    expect(after[2].bars).toHaveLength(4);
    expect(after[2].label).toBe('');
    expect(after[2].bars.every((b) => b.chords.length === 0)).toBe(true);
    expect(before).toHaveLength(2); // immutable
  });

  it('removes and reorders sections', () => {
    expect(removeSection(sample(), 0).map((s) => s.id)).toEqual(['chorus_1']);
    expect(moveSection(sample(), 0, 1).map((s) => s.id)).toEqual([
      'chorus_1',
      'verse_1',
    ]);
    // Out-of-range move is a no-op.
    expect(moveSection(sample(), 1, 5).map((s) => s.id)).toEqual([
      'verse_1',
      'chorus_1',
    ]);
  });

  it('patches section fields', () => {
    const after = updateSection(sample(), 0, { repeatCount: 2, label: 'V1' });
    expect(after[0].repeatCount).toBe(2);
    expect(after[0].label).toBe('V1');
  });
});

describe('bar ops', () => {
  it('adds and removes bars in the right section', () => {
    expect(addBar(sample(), 0)[0].bars).toHaveLength(3);
    expect(removeBar(sample(), 0, 1)[0].bars).toHaveLength(1);
  });

  it('toggles a fermata via updateBar', () => {
    expect(
      updateBar(sample(), 0, 0, { fermata: true })[0].bars[0].fermata,
    ).toBe(true);
  });
});

describe('direct-manipulation ops', () => {
  it('inserts a bar at a specific index', () => {
    const after = insertBar(sample(), 0, 1);
    expect(after[0].bars).toHaveLength(3);
    // The original bar-0 chord stays at index 0; the new empty bar is at index 1.
    expect(after[0].bars[0].chords).toHaveLength(1);
    expect(after[0].bars[1].chords).toHaveLength(0);
  });

  it('adds a chord at a clicked beat, keeping beats sorted', () => {
    // bar 0 already has a beat-1 chord; add one at beat 3.
    const after = addChordAt(sample(), 0, 0, 3);
    expect(after[0].bars[0].chords.map((c) => c.beat)).toEqual([1, 3]);
    // Adding an earlier beat re-sorts.
    const after2 = addChordAt(after, 0, 0, 2);
    expect(after2[0].bars[0].chords.map((c) => c.beat)).toEqual([1, 2, 3]);
  });
});

describe('chord ops', () => {
  it('adds a default chord onto the next free beat', () => {
    const after = addChord(sample(), 0, 0); // bar already has a beat-1 chord
    expect(after[0].bars[0].chords).toHaveLength(2);
    expect(after[0].bars[0].chords[1]).toMatchObject({
      ...DEFAULT_CHORD,
      beat: 2,
    });
  });

  it('adds the first chord at beat 1', () => {
    const after = addChord(sample(), 0, 1); // empty bar
    expect(after[0].bars[1].chords[0].beat).toBe(1);
  });

  it('updates and removes a chord immutably', () => {
    const before = sample();
    const updated = updateChord(before, 0, 0, 0, { chordName: 'Cmaj7' });
    expect(updated[0].bars[0].chords[0].chordName).toBe('Cmaj7');
    expect(before[0].bars[0].chords[0].chordName).toBe('C'); // untouched

    const removed = removeChord(sample(), 0, 0, 0);
    expect(removed[0].bars[0].chords).toHaveLength(0);
  });
});

describe('coerceSongForPreview', () => {
  it('fills schema-valid defaults for a partial draft and passes the chart through', () => {
    const song = coerceSongForPreview({ sections: sample() });
    expect(song.keyRoot).toBe(60);
    expect(song.mode).toBe('major');
    expect(song.timeSignature).toEqual([4, 4]);
    expect(song.sections).toHaveLength(2);
    expect(song.audioSources).toEqual([]);
    expect(song.artistImageSource).toBe('none');
  });

  it('keeps real values when present', () => {
    const song = coerceSongForPreview({
      keyRoot: 62,
      mode: 'dorian',
      timeSignature: [3, 4],
      sections: [],
    });
    expect(song.keyRoot).toBe(62);
    expect(song.mode).toBe('dorian');
    expect(song.timeSignature).toEqual([3, 4]);
  });
});
