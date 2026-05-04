import type { Song } from '@/curriculum/types/songLibrary';

export const no_diggity_blackstreet: Song = {
  id: 'no_diggity_blackstreet',
  title: 'No Diggity (Blackstreet)',
  artist: 'Unknown Artist',
  year: undefined,

  key: 'E major',
  keyRoot: 64,
  mode: 'major',
  tempo: 90,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['hip_hop'],
  techniques: [],

  sections: [
    {
      id: 'section_d',
      label: 'Section D',
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'F♯min7', beat: 1, duration: 4 },
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
    {
      id: 'intro',
      label: 'Intro',
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],

  audioSources: [],
  artistImageSource: 'none',
  popularity: 50,
};
