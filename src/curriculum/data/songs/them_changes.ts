import type { Song } from '@/curriculum/types/songLibrary';

export const them_changes: Song = {
  id: 'them_changes',
  title: 'Them Changes',
  artist: 'Unknown Artist',
  year: undefined,

  key: 'E major',
  keyRoot: 64,
  mode: 'major',
  tempo: 112,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['funk_rock'],
  techniques: [],

  sections: [
    {
      id: 'section_c',
      label: 'Section C',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_a',
      label: 'Section A',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'E7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_b',
      label: 'Section B',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
  ],

  audioSources: [],
  artistImageSource: 'none',
  popularity: 50,
};
