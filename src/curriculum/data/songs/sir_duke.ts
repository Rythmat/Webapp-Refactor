import type { Song } from '@/curriculum/types/songLibrary';

export const sir_duke: Song = {
  id: 'sir_duke',
  title: 'Sir Duke',
  artist: 'Stevie Wonder',
  year: 1976,
  historicalDescription:
    "Stevie Wonder records 'Sir Duke' as a jubilant tribute to Duke Ellington, weaving together jazz, funk, and soul into a celebration of music's power to move people. Released from his landmark album 'Songs in the Key of Life', the track honors the giants who shaped American music — Ellington, Basie, Ella, and Armstrong — while demonstrating that Wonder himself has joined their ranks.",
  key: 'F♯ major',
  keyRoot: 66,
  mode: 'major',
  tempo: 109,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['funk'],
  techniques: [],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      measuresPerRow: 3,
      bars: [
        { chords: [], restBars: 7 },
        { chords: [{ degree: '1 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      measuresPerRow: 8,
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭2 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭2 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_c',
      label: 'Section C',
      measuresPerRow: 8,
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭2 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭2 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 7', chordName: 'F7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_d',
      label: 'Section D',
      bars: [
        {
          chords: [
            { degree: '♭7 7', chordName: 'E7', beat: 1, duration: 1 },
            { degree: '6 7', chordName: 'D♯7', beat: 2, duration: 1 },
            { degree: '♭6 7', chordName: 'D7', beat: 3, duration: 1 },
            { degree: '5 7', chordName: 'C♯7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '♭6 7', chordName: 'D7', beat: 1, duration: 1 },
            { degree: '6 7', chordName: 'D♯7', beat: 2, duration: 1 },
            { degree: '♭7 7', chordName: 'E7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 7', chordName: 'E7', beat: 1, duration: 1 },
            { degree: '6 7', chordName: 'D♯7', beat: 2, duration: 1 },
            { degree: '♭6 7', chordName: 'D7', beat: 3, duration: 1 },
            { degree: '5 7', chordName: 'C♯7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '♭6 7', chordName: 'D7', beat: 1, duration: 1 },
            { degree: '6 7', chordName: 'D♯7', beat: 2, duration: 1 },
            { degree: '♭7 7', chordName: 'E7', beat: 3, duration: 1 },
            { degree: '7 7', chordName: 'F7', beat: 4, duration: 1 },
            { degree: '1 7', chordName: 'F♯7', beat: 4, duration: 1 },
          ],
        },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      measuresPerRow: 8,
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '7 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 maj/6', chordName: 'B/D♯', beat: 1, duration: 1 },
            { degree: '5 min7', chordName: 'C♯min7', beat: 2, duration: 1 },
            { degree: '1 7', chordName: 'F♯7sus', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 7', chordName: 'F♯7sus', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      measuresPerRow: 8,
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '7 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 maj/6', chordName: 'B/D♯', beat: 1, duration: 1 },
            { degree: '5 min7', chordName: 'C♯min7', beat: 2, duration: 1 },
            { degree: '1 7', chordName: 'F♯7sus', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 7', chordName: 'F♯7sus', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [{ chords: [] }, { chords: [] }, { chords: [] }, { chords: [] }],
    },
    {
      id: 'section_h',
      label: 'Section H',
      bars: [{ chords: [] }, { chords: [] }, { chords: [] }, { chords: [] }],
    },
    {
      id: 'section_i',
      label: 'Section I',
      measuresPerRow: 3,
      bars: [{ chords: [] }, { chords: [] }, { chords: [] }],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      measuresPerRow: 8,
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭2 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭2 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_k',
      label: 'Section K',
      measuresPerRow: 8,
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭2 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭2 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 7', chordName: 'F7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_l',
      label: 'Section L',
      bars: [
        {
          chords: [
            { degree: '♭7 7', chordName: 'E7', beat: 1, duration: 1 },
            { degree: '6 7', chordName: 'D♯7', beat: 2, duration: 1 },
            { degree: '♭6 7', chordName: 'D7', beat: 3, duration: 1 },
            { degree: '5 7', chordName: 'C♯7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '♭6 7', chordName: 'D7', beat: 1, duration: 1 },
            { degree: '6 7', chordName: 'D♯7', beat: 2, duration: 1 },
            { degree: '♭7 7', chordName: 'E7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 7', chordName: 'E7', beat: 1, duration: 1 },
            { degree: '6 7', chordName: 'D♯7', beat: 2, duration: 1 },
            { degree: '♭6 7', chordName: 'D7', beat: 3, duration: 1 },
            { degree: '5 7', chordName: 'C♯7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '♭6 7', chordName: 'D7', beat: 1, duration: 1 },
            { degree: '6 7', chordName: 'D♯7', beat: 2, duration: 1 },
            { degree: '♭7 7', chordName: 'E7', beat: 3, duration: 1 },
            { degree: '7 7', chordName: 'F7', beat: 4, duration: 1 },
            { degree: '1 7', chordName: 'F♯7', beat: 4, duration: 1 },
          ],
        },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      measuresPerRow: 8,
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '7 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 maj/6', chordName: 'B/D♯', beat: 1, duration: 1 },
            { degree: '5 min7', chordName: 'C♯min7', beat: 2, duration: 1 },
            { degree: '1 7', chordName: 'F♯7sus', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 7', chordName: 'F♯7sus', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_n',
      label: 'Section N',
      measuresPerRow: 8,
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '7 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 maj/6', chordName: 'B/D♯', beat: 1, duration: 1 },
            { degree: '5 min7', chordName: 'C♯min7', beat: 2, duration: 1 },
            { degree: '1 7', chordName: 'F♯7sus', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 7', chordName: 'F♯7sus', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_f_2',
      label: 'Section F',
      bars: [{ chords: [] }, { chords: [] }, { chords: [] }, { chords: [] }],
    },
    {
      id: 'section_p',
      label: 'Section P',
      bars: [{ chords: [] }, { chords: [] }, { chords: [] }, { chords: [] }],
    },
    {
      id: 'section_q',
      label: 'Section Q',
      measuresPerRow: 3,
      bars: [{ chords: [] }, { chords: [] }, { chords: [] }],
    },
    {
      id: 'section_g',
      label: 'Section G',
      measuresPerRow: 8,
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '7 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 maj/6', chordName: 'B/D♯', beat: 1, duration: 1 },
            { degree: '5 min7', chordName: 'C♯min7', beat: 2, duration: 1 },
            { degree: '1 7', chordName: 'F♯7sus', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 7', chordName: 'F♯7sus', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_s',
      label: 'Section S',
      measuresPerRow: 8,
      repeatCount: 3,
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '7 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 maj/6', chordName: 'B/D♯', beat: 1, duration: 1 },
            { degree: '5 min7', chordName: 'C♯min7', beat: 2, duration: 1 },
            { degree: '1 7', chordName: 'F♯7sus', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 7', chordName: 'F♯7sus', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_h_2',
      label: 'Section H',
      bars: [{ chords: [] }, { chords: [] }, { chords: [] }, { chords: [] }],
    },
    {
      id: 'section_u',
      label: 'Section U',
      bars: [{ chords: [] }, { chords: [] }, { chords: [] }, { chords: [] }],
    },
    {
      id: 'section_v',
      label: 'Section V',
      bars: [{ chords: [] }, { chords: [] }, { chords: [] }, { chords: [] }],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=ETFvmkIA6S4' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/stevie-wonder.webp',
  popularity: 50,
};
