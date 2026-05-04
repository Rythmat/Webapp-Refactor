import type { Song } from '@/curriculum/types/songLibrary';

export const uptight_everythings_alright: Song = {
  id: 'uptight_everythings_alright',
  title: "Uptight (Everything's Alright)",
  artist: 'Unknown Artist',
  year: undefined,

  key: 'D♭ major',
  keyRoot: 61,
  mode: 'major',
  tempo: 137,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['soul', 'r_and_b'],
  techniques: [],

  sections: [
    {
      id: 'section_c',
      label: 'Section C',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_a',
      label: 'Section A',
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'B/D♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_b',
      label: 'Section B',
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'B/D♭', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],

  audioSources: [],
  artistImageSource: 'none',
  popularity: 50,
};
