import type { Song } from '@/curriculum/types/songLibrary';

export const shotgun: Song = {
  id: 'shotgun',
  title: 'Shotgun',
  artist: 'Unknown Artist',
  year: undefined,

  key: 'A♭ major',
  keyRoot: 68,
  mode: 'major',
  tempo: 120,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['soul', 'r_and_b'],
  techniques: [],

  sections: [
    {
      id: 'section_a',
      label: 'Section A',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'E♭7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'A♭7', beat: 1, duration: 4 }],
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
