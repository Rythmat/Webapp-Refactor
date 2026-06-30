import { describe, it, expect } from 'vitest';
import { rolling_in_the_deep } from '@/curriculum/data/songs/rolling_in_the_deep';
import type { Song } from '@/curriculum/types/songLibrary';
import { songToUnison } from '../converters/songToUnison';

const PPQ = 480;

// Small synthetic fixture for unit-level assertions about the converter's tick
// math and section handling. Production fidelity is covered by the real-Song
// describe block below.
function tinySong(): Song {
  return {
    id: 'tiny',
    title: 'Tiny',
    artist: 'Test',
    key: 'C major',
    keyRoot: 60,
    mode: 'major',
    tempo: 100,
    timeSignature: [4, 4],
    difficulty: 1,
    genreTags: [],
    techniques: [],
    sections: [
      {
        id: 'a',
        label: 'Verse',
        bars: [
          {
            chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }],
          },
          {
            chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }],
          },
        ],
      },
      {
        id: 'b',
        label: 'Chorus',
        repeatCount: 2,
        bars: [
          {
            chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }],
          },
          {
            chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }],
          },
        ],
      },
    ],
    audioSources: [],
    artistImageSource: 'none',
  };
}

describe('songToUnison', () => {
  it('produces a valid UnisonDocument', () => {
    const doc = songToUnison(tinySong());

    expect(doc.version).toBe('1.0.0');
    expect(doc.metadata.source).toBe('lead-sheet');
    expect(doc.analysis.chordTimeline.length).toBe(4);
  });

  it('carries title, tempo, and time signature from the Song', () => {
    const doc = songToUnison(tinySong());

    expect(doc.metadata.title).toBe('Tiny');
    expect(doc.rhythm.bpm).toBe(100);
    expect(doc.rhythm.timeSignatureNumerator).toBe(4);
    expect(doc.rhythm.timeSignatureDenominator).toBe(4);
  });

  it('places chord regions at correct bar/beat positions', () => {
    const doc = songToUnison(tinySong());
    const timeline = doc.analysis.chordTimeline;

    expect(timeline[0].startTick).toBe(0);
    expect(timeline[0].endTick).toBe(4 * PPQ);
    expect(timeline[1].startTick).toBe(4 * PPQ);
    expect(timeline[2].startTick).toBe(8 * PPQ);
    expect(timeline[3].startTick).toBe(12 * PPQ);
  });

  it('emits form sections at the right measure indices', () => {
    const doc = songToUnison(tinySong());
    expect(doc.form).not.toBeNull();
    expect(doc.form!.sections.length).toBe(2);
    expect(doc.form!.sections[0].startMeasure).toBe(0);
    expect(doc.form!.sections[0].type).toBe('verse');
    expect(doc.form!.sections[1].startMeasure).toBe(2);
    expect(doc.form!.sections[1].type).toBe('chorus');
  });

  it('records a repeat marker for sections with repeatCount > 1', () => {
    const doc = songToUnison(tinySong());
    expect(doc.form!.repeats.length).toBe(1);
    expect(doc.form!.repeats[0].startMeasure).toBe(2);
    expect(doc.form!.repeats[0].endMeasure).toBe(3);
  });

  it('handles restBars by advancing the measure cursor without emitting chords', () => {
    const song = tinySong();
    song.sections = [
      {
        id: 'a',
        label: 'Verse',
        bars: [
          { chords: [], restBars: 4 },
          {
            chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }],
          },
        ],
      },
    ];

    const doc = songToUnison(song);
    expect(doc.analysis.chordTimeline.length).toBe(1);
    // The single chord should appear at measure 4 (after the 4-bar rest).
    expect(doc.analysis.chordTimeline[0].startTick).toBe(4 * 4 * PPQ);
  });

  it('honours an explicit title override', () => {
    const doc = songToUnison(tinySong(), { title: 'Override' });
    expect(doc.metadata.title).toBe('Override');
  });
});

describe('songToUnison with real Song fixture', () => {
  it('converts Rolling In The Deep without error', () => {
    const doc = songToUnison(rolling_in_the_deep);

    expect(doc.version).toBe('1.0.0');
    expect(doc.metadata.title).toBe('Rolling In The Deep');
    expect(doc.metadata.source).toBe('lead-sheet');
    expect(doc.rhythm.bpm).toBe(106);
    expect(doc.analysis.chordTimeline.length).toBeGreaterThan(0);
  });

  it('emits one form section per Song section', () => {
    const doc = songToUnison(rolling_in_the_deep);
    expect(doc.form).not.toBeNull();
    expect(doc.form!.sections.length).toBe(rolling_in_the_deep.sections.length);
  });

  it('emits a repeat marker for every section with repeatCount > 1', () => {
    const doc = songToUnison(rolling_in_the_deep);
    const repeatSections = rolling_in_the_deep.sections.filter(
      (s) => s.repeatCount && s.repeatCount > 1,
    );
    expect(doc.form!.repeats.length).toBe(repeatSections.length);
  });

  it('runs harmonic analysis end-to-end (key detected, progression matches considered)', () => {
    const doc = songToUnison(rolling_in_the_deep);
    expect(doc.analysis.key).toBeDefined();
    expect(doc.analysis.key.rootName).toBeTruthy();
    expect(Array.isArray(doc.analysis.progressionMatches)).toBe(true);
  });
});

describe('songToUnison with applyGenreVoicings', () => {
  it('leaves voicingNotes undefined when no genre voicings are requested', () => {
    const doc = songToUnison(tinySong());
    for (const c of doc.analysis.chordTimeline) {
      expect(c.voicingNotes).toBeUndefined();
    }
  });

  it('populates voicingNotes for covered chords when a (genre, level) is given', () => {
    const doc = songToUnison(tinySong(), {
      applyGenreVoicings: { genre: 'pop', level: 1 },
    });

    const covered = doc.analysis.chordTimeline.filter((c) => c.voicingNotes);
    // tinySong is all maj triads — pop L1 covers maj, so every chord should be voiced.
    expect(covered.length).toBe(doc.analysis.chordTimeline.length);
    for (const c of covered) {
      expect(c.voicingId).toContain('pop:L1');
      expect(c.voicingNotes!.length).toBeGreaterThan(0);
    }
  });

  it('skips chords whose quality the taxonomy does not cover', () => {
    // rolling_in_the_deep contains dom7 and min7 — pop L1 covers neither;
    // those chords should be left untouched.
    const doc = songToUnison(rolling_in_the_deep, {
      applyGenreVoicings: { genre: 'pop', level: 1 },
    });

    const dom7s = doc.analysis.chordTimeline.filter(
      (c) => c.quality === 'dominant7',
    );
    if (dom7s.length > 0) {
      for (const c of dom7s) {
        expect(c.voicingNotes).toBeUndefined();
      }
    }
  });
});
