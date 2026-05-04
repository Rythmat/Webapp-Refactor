import type { Song } from '@/curriculum/types/songLibrary';

export const the_national_anthem: Song = {
  id: 'the_national_anthem',
  title: 'The National Anthem',
  artist: 'Unknown Artist',
  year: undefined,

  key: 'D major',
  keyRoot: 62,
  mode: 'major',
  tempo: 90,
  timeSignature: [4, 4],

  difficulty: 1,
  genreTags: ['rock'],
  techniques: [],

  sections: [
    {
      id: 'section_d',
      label: 'Section D',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_a',
      label: 'Section A',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
  ],

  audioSources: [],
  artistImageSource: 'none',
  popularity: 50,
};
