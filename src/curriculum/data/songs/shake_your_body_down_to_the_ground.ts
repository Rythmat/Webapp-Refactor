import type { Song } from '@/curriculum/types/songLibrary';

export const shake_your_body_down_to_the_ground: Song = {
  id: 'shake_your_body_down_to_the_ground',
  title: 'Shake Your Body (Down To The Ground)',
  artist: 'Unknown Artist',
  year: undefined,

  key: 'G major',
  keyRoot: 67,
  mode: 'major',
  tempo: 118,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['pop', 'rock'],
  techniques: [],

  sections: [
    {
      id: 'section_a',
      label: 'Section A',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'G7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'G7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'intro',
      label: 'Intro',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
  ],

  audioSources: [],
  artistImageSource: 'none',
  popularity: 50,
};
