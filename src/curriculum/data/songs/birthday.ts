import type { Song } from '@/curriculum/types/songLibrary';

export const birthday: Song = {
  id: 'birthday',
  title: 'Birthday',
  artist: 'The Beatles',
  year: 1968,
  historicalDescription:
    "The Beatles record 'Birthday' during the marathon White Album sessions, with John Lennon and Paul McCartney reportedly writing it on the spot in the studio. A raw, stomping rock and roll burst, it stands out on the double album as a deliberate throwback — pure fun amid the experimental sprawl. Its driving riff and call-and-response vocals make it one of the band's most unguarded moments.",
  key: 'A major',
  keyRoot: 69,
  mode: 'major',
  tempo: 138,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_b',
      label: 'Section B',
      bars: [
        { chords: [{ degree: '4 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_c',
      label: 'Section C',
      bars: [
        { chords: [{ degree: '5 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      measuresPerRow: 1,
      bars: [{ chords: [], restBars: 8 }],
    },
    {
      id: 'section_e',
      label: 'Section E',
      bars: [
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      bars: [
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [{ degree: '♭3 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '♭7 7', chordName: 'G7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭3 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '♭7 7', chordName: 'G7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_h',
      label: 'Section H',
      bars: [
        {
          chords: [{ degree: '♭3 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '♭7 7', chordName: 'G7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭3 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '♭7 7', chordName: 'G7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_i',
      label: 'Section I',
      measuresPerRow: 2,
      bars: [
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_k',
      label: 'Section K',
      bars: [
        { chords: [{ degree: '4 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_l',
      label: 'Section L',
      bars: [
        { chords: [{ degree: '5 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_e_2',
      label: 'Section E',
      bars: [
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_f_2',
      label: 'Section F',
      bars: [
        {
          chords: [{ degree: '♭3 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '♭7 7', chordName: 'G7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭3 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '♭7 7', chordName: 'G7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_o',
      label: 'Section O',
      bars: [
        {
          chords: [{ degree: '♭3 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '♭7 7', chordName: 'G7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭3 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '♭7 7', chordName: 'G7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_p',
      label: 'Section P',
      measuresPerRow: 2,
      bars: [
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_g',
      label: 'Section G',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_r',
      label: 'Section R',
      bars: [
        { chords: [{ degree: '4 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_s',
      label: 'Section S',
      bars: [
        { chords: [{ degree: '5 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_t',
      label: 'Section T',
      measuresPerRow: 3,
      bars: [
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }],
          fermata: true,
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=dhdOPhTHeoE' },
  ],
  artistImageSource: 'commissioned',

  artistImageRef: '/artists/the-beatles.webp',
  popularity: 50,
};
