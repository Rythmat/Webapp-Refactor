import type { Song } from '@/curriculum/types/songLibrary';

export const black_dog: Song = {
  id: 'black_dog',
  title: 'Black Dog',
  artist: 'Led Zeppelin',
  year: 1971,
  historicalDescription:
    "Led Zeppelin releases 'Black Dog' on their landmark fourth album, an untitled record often called 'Led Zeppelin IV.' The track's jagged, stop-start guitar riff — traded between Robert Plant's raw vocal calls and Jimmy Page's thunderous response — becomes one of the defining moments of hard rock. It crystallizes Zeppelin's power and unpredictability at the peak of their creative force.",
  key: 'A major',
  keyRoot: 69,
  mode: 'major',
  tempo: 165,
  timeSignature: [4, 4],

  difficulty: 1,
  genreTags: ['rock'],
  techniques: [],

  sections: [
    {
      id: 'section_a',
      label: 'Section A',
      measuresPerRow: 1,
      bars: [{ chords: [], restBars: 4 }],
    },
    {
      id: 'verse',
      label: 'Verse',
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
      id: 'section_c',
      label: 'Section C',
      bars: [
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
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
      id: 'section_e',
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
      id: 'section_f',
      label: 'Section F',
      measuresPerRow: 5,
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
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭3 5', chordName: 'C5', beat: 1, duration: 2 },
            { degree: '1 5', chordName: 'A5', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_h',
      label: 'Section H',
      bars: [
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
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
      id: 'section_j',
      label: 'Section J',
      bars: [
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_k',
      label: 'Section K',
      bars: [
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_e_2',
      label: 'Section E',
      repeatCount: 4,
      bars: [
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭3 5', chordName: 'C5', beat: 1, duration: 2 },
            { degree: '1 5', chordName: 'A5', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 5', chordName: 'G5', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_m',
      label: 'Section M',
      bars: [
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_f_2',
      label: 'Section F',
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
      id: 'section_o',
      label: 'Section O',
      bars: [
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_g',
      label: 'Section G',
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
      id: 'section_q',
      label: 'Section Q',
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
      id: 'section_r',
      label: 'Section R',
      measuresPerRow: 5,
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
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_h_2',
      label: 'Section H',
      bars: [
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭3 5', chordName: 'C5', beat: 1, duration: 2 },
            { degree: '1 5', chordName: 'A5', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_t',
      label: 'Section T',
      bars: [
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_i',
      label: 'Section I',
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
      id: 'section_v',
      label: 'Section V',
      bars: [
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_w',
      label: 'Section W',
      bars: [
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_j_2',
      label: 'Section J',
      bars: [
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭3 5', chordName: 'C5', beat: 1, duration: 2 },
            { degree: '1 5', chordName: 'A5', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 5', chordName: 'G5', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=2KPEHohJMuw' },
  ],
  artistImageSource: 'commissioned',

  artistImageRef: '/artists/led-zeppelin.webp',
  popularity: 50,
};
