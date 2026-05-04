import type { Song } from '@/curriculum/types/songLibrary';

export const dont_stop_til_you_get_enough: Song = {
  id: 'dont_stop_til_you_get_enough',
  title: "Don't Stop 'Til You Get Enough",
  artist: 'Unknown Artist',
  year: undefined,

  key: 'B major',
  keyRoot: 71,
  mode: 'major',
  tempo: 120,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['funky_pop'],
  techniques: [],

  sections: [
    {
      id: 'section_b',
      label: 'Section B',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'A/B', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_a',
      label: 'Section A',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj', chordName: 'E/F♯', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'E/F♯', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_c',
      label: 'Section C',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'A/B', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
      ],
    },
  ],

  audioSources: [],
  artistImageSource: 'none',
  popularity: 50,
};
