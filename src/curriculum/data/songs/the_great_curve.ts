import type { Song } from '@/curriculum/types/songLibrary';

export const the_great_curve: Song = {
  id: 'the_great_curve',
  title: 'The Great Curve',
  artist: 'Unknown Artist',
  year: undefined,

  key: 'C major',
  keyRoot: 60,
  mode: 'major',
  tempo: 153,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['pop'],
  techniques: [],

  sections: [
    {
      id: 'section_f',
      label: 'Section F',
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
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
