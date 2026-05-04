import type { Song } from '@/curriculum/types/songLibrary';

export const it_all_comes_back: Song = {
  id: 'it_all_comes_back',
  title: 'It All Comes Back',
  artist: 'Unknown Artist',
  year: undefined,

  key: 'D major',
  keyRoot: 62,
  mode: 'major',
  tempo: 100,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['funk'],
  techniques: [],

  sections: [
    {
      id: 'section_d',
      label: 'Section D',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'D7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_a',
      label: 'Section A',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'D7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_b',
      label: 'Section B',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'A♭7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'A♭7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_c',
      label: 'Section C',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'B♭7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'A♭7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'intro',
      label: 'Intro',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
  ],

  audioSources: [],
  artistImageSource: 'none',
  popularity: 50,
};
