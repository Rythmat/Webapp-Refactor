import type { Song } from '@/curriculum/types/songLibrary';

export const thats_the_way_i_like_it: Song = {
  id: 'thats_the_way_i_like_it',
  title: "That's The Way (I Like It)",
  artist: 'Unknown Artist',
  year: undefined,

  key: 'E♭ major',
  keyRoot: 63,
  mode: 'major',
  tempo: 109,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['funk'],
  techniques: [],

  sections: [
    {
      id: 'section_f',
      label: 'Section F',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'Fmin7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_a',
      label: 'Section A',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'Fmin7', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'Cmin7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_c',
      label: 'Section C',
      bars: [
      { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
      { chords: [{ degree: '1 maj', chordName: 'Cmin7', beat: 1, duration: 4 }] },
      ],
    },
  ],

  audioSources: [],
  artistImageSource: 'none',
  popularity: 50,
};
