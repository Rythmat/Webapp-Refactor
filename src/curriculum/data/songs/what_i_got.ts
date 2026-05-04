import type { Song } from '@/curriculum/types/songLibrary';

export const what_i_got: Song = {
  id: 'what_i_got',
  title: "What I Got",
  artist: 'Unknown Artist',
  year: undefined,

  key: 'C major',
  keyRoot: 60,
  mode: 'major',
  tempo: 94,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['pop'],
  techniques: [],

  sections: [
    {
      id: 'section_d',
      label: 'Section D',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'G7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'Dmin7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_a',
      label: 'Section A',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'G7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'Dmin7', beat: 1, duration: 4 }] },
      ],
    },
  ],

  audioSources: [],
  artistImageSource: 'none',
  popularity: 50,
};
