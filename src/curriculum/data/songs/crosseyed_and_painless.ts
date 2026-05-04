import type { Song } from '@/curriculum/types/songLibrary';

export const crosseyed_and_painless: Song = {
  id: 'crosseyed_and_painless',
  title: 'Crosseyed and Painless',
  artist: 'Unknown Artist',
  year: undefined,

  key: 'A major',
  keyRoot: 69,
  mode: 'major',
  tempo: 136,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],

  sections: [
    {
      id: 'section_b',
      label: 'Section B',
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'Bmin7', beat: 1, duration: 4 },
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
