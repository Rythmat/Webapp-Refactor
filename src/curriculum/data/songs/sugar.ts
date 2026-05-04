import type { Song } from '@/curriculum/types/songLibrary';

export const sugar: Song = {
  id: 'sugar',
  title: "Sugar",
  artist: 'Unknown Artist',
  year: undefined,

  key: 'D♭ major',
  keyRoot: 61,
  mode: 'major',
  tempo: 120,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['pop'],
  techniques: [],

  sections: [
    {
      id: 'section_a',
      label: 'Section A',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'G♭', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'B♭min7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'E♭min7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'G♭', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_b',
      label: 'Section B',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'B♭min7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'E♭min7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'G♭', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_c',
      label: 'Section C',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'B♭min7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'E♭min7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'G♭', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'intro',
      label: 'Intro',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'B♭min7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'E♭min7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }] },
      ],
    },
  ],

  audioSources: [],
  artistImageSource: 'none',
  popularity: 50,
};
