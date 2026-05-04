import type { Song } from '@/curriculum/types/songLibrary';

export const this_must_be_the_place_naive_melody: Song = {
  id: 'this_must_be_the_place_naive_melody',
  title: 'This Must Be The Place (Naive Melody)',
  artist: 'Unknown Artist',
  year: undefined,

  key: 'G major',
  keyRoot: 67,
  mode: 'major',
  tempo: 114,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['pop'],
  techniques: [],

  sections: [
    {
      id: 'section_d',
      label: 'Section D',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'G/D', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'G/D', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_a',
      label: 'Section A',
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],

  audioSources: [],
  artistImageSource: 'none',
  popularity: 50,
};
