import type { Song } from '@/curriculum/types/songLibrary';

export const blackbird: Song = {
  id: 'blackbird',
  title: 'Blackbird',
  artist: 'The Beatles',
  year: 1968,
  historicalDescription:
    "Paul McCartney records 'Blackbird' as a spare, fingerpicked acoustic guitar piece for the Beatles' sprawling White Album. Written against the backdrop of the American civil rights movement, the song's call to 'take these broken wings and learn to fly' resonates far beyond its intimate arrangement — a quiet protest wrapped in folk simplicity.",
  key: 'G major',
  keyRoot: 67,
  mode: 'major',
  tempo: 92,
  timeSignature: [3, 4],

  difficulty: 3,
  genreTags: ['folk', 'rock'],
  techniques: [],

  sections: [
    {
      id: 'section_a',
      label: 'Section A',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 3 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'G/B', beat: 1, duration: 3 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 3 }] },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 3 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'G/B', beat: 1, duration: 3 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 3 }] },
      ],
    },
    {
      id: 'section_c',
      label: 'Section C',
      measuresPerRow: 7,
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 3 }] },
        {
          chords: [
            { degree: '2 7/♭5', chordName: 'A7/C♯', beat: 1, duration: 3 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'D7', beat: 1, duration: 3 }] },
        {
          chords: [
            { degree: '3 7/♭6', chordName: 'B7/D♯', beat: 1, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 3 },
          ],
        },
        {
          chords: [
            {
              degree: '4 min7/♭6',
              chordName: 'Cmin7/E♭',
              beat: 1,
              duration: 3,
            },
          ],
        },
        {
          chords: [
            { degree: '1 maj/5', chordName: 'G/D', beat: 1, duration: 1 },
            { degree: '2 7/♭5', chordName: 'A7/C♯', beat: 2, duration: 1 },
            { degree: '2 min7/4', chordName: 'Amin7/C', beat: 3, duration: 2 },
            { degree: '4 min7', chordName: 'Cmin7', beat: 5, duration: 1 },
          ],
        },
      ],
    },
    {
      id: 'section_d',
      label: 'Section D',
      measuresPerRow: 9,
      bars: [
        {
          chords: [
            { degree: '1 maj/3', chordName: 'G/B', beat: 1, duration: 3 },
          ],
        },
        { chords: [{ degree: '2 7', chordName: 'A7', beat: 1, duration: 3 }] },
        { chords: [{ degree: '5 7', chordName: 'D7', beat: 1, duration: 3 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 3 }] },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 3 }] },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'G/B', beat: 1, duration: 3 },
          ],
        },
        { chords: [{ degree: '2 7', chordName: 'A7', beat: 1, duration: 3 }] },
        { chords: [{ degree: '5 7', chordName: 'D7', beat: 1, duration: 3 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 3 }] },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      measuresPerRow: 10,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 3 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'G/B', beat: 1, duration: 3 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 3 }] },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 3 }] },
        {
          chords: [
            { degree: '2 7/♭5', chordName: 'A7/C♯', beat: 1, duration: 3 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'D7', beat: 1, duration: 3 }] },
        {
          chords: [
            { degree: '3 7/♭6', chordName: 'B7/D♯', beat: 1, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 3 },
          ],
        },
        {
          chords: [
            {
              degree: '4 min7/♭6',
              chordName: 'Cmin7/E♭',
              beat: 1,
              duration: 3,
            },
          ],
        },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      measuresPerRow: 6,
      bars: [
        {
          chords: [
            { degree: '1 maj/5', chordName: 'G/D', beat: 1, duration: 1 },
            { degree: '2 7/♭5', chordName: 'A7/C♯', beat: 2, duration: 1 },
            { degree: '2 min7/4', chordName: 'Amin7/C', beat: 3, duration: 2 },
            { degree: '4 min7', chordName: 'Cmin7', beat: 5, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'G/B', beat: 1, duration: 3 },
          ],
        },
        { chords: [{ degree: '2 7', chordName: 'A7', beat: 1, duration: 3 }] },
        { chords: [{ degree: '5 7', chordName: 'D7', beat: 1, duration: 3 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 3 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 3 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      measuresPerRow: 7,
      bars: [
        {
          chords: [
            { degree: '♭7 maj', chordName: 'F', beat: 1, duration: 1 },
            { degree: '4 maj/6', chordName: 'C/E', beat: 2, duration: 1 },
            { degree: '5 min7', chordName: 'Dmin7', beat: 3, duration: 1 },
            { degree: '4 maj', chordName: 'C', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'B♭', beat: 1, duration: 3 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 3 }] },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'F', beat: 1, duration: 1 },
            { degree: '4 maj/6', chordName: 'C/E', beat: 2, duration: 1 },
            { degree: '5 min7', chordName: 'Dmin7', beat: 3, duration: 1 },
            { degree: '4 maj', chordName: 'C', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'B♭', beat: 1, duration: 3 }],
        },
        { chords: [{ degree: '2 7', chordName: 'A7', beat: 1, duration: 3 }] },
        { chords: [{ degree: '5 7', chordName: 'D7', beat: 1, duration: 3 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      measuresPerRow: 5,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 3 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'G/B', beat: 1, duration: 3 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 3 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 3 }] },
      ],
    },
    {
      id: 'section_i',
      label: 'Section I',
      measuresPerRow: 8,
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 3 }],
          fermata: true,
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 3 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'G/B', beat: 1, duration: 3 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 3 }] },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'G/B', beat: 1, duration: 3 },
          ],
        },
        { chords: [{ degree: '2 7', chordName: 'A7', beat: 1, duration: 3 }] },
        {
          chords: [
            { degree: '2 min7/5', chordName: 'Amin7/D', beat: 1, duration: 3 },
          ],
        },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      measuresPerRow: 9,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 3 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'G/B', beat: 1, duration: 3 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 3 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 3 }] },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 3 }] },
        {
          chords: [
            { degree: '2 7/♭5', chordName: 'A7/C♯', beat: 1, duration: 3 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'D7', beat: 1, duration: 3 }] },
        {
          chords: [
            { degree: '3 7/♭6', chordName: 'B7/D♯', beat: 1, duration: 3 },
          ],
        },
      ],
    },
    {
      id: 'section_k',
      label: 'Section K',
      measuresPerRow: 7,
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 3 },
          ],
        },
        {
          chords: [
            {
              degree: '4 min7/♭6',
              chordName: 'Cmin7/E♭',
              beat: 1,
              duration: 3,
            },
          ],
        },
        {
          chords: [
            { degree: '1 maj/5', chordName: 'G/D', beat: 1, duration: 1 },
            { degree: '2 7/♭5', chordName: 'A7/C♯', beat: 2, duration: 1 },
            { degree: '2 min7/4', chordName: 'Amin7/C', beat: 3, duration: 2 },
            { degree: '4 min7', chordName: 'Cmin7', beat: 5, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'G/B', beat: 1, duration: 3 },
          ],
        },
        { chords: [{ degree: '2 7', chordName: 'A7', beat: 1, duration: 3 }] },
        { chords: [{ degree: '5 7', chordName: 'D7', beat: 1, duration: 3 }] },
        { chords: [{ degree: '5 7', chordName: 'D7', beat: 1, duration: 3 }] },
      ],
    },
    {
      id: 'section_f_2',
      label: 'Section F',
      measuresPerRow: 11,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 3 }] },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 3 }] },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'G/B', beat: 1, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 3 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'D7', beat: 1, duration: 3 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 3 }] },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 3 }] },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'G/B', beat: 1, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 3 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'D7', beat: 1, duration: 3 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 3 }],
          fermata: true,
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=Man4Xw8Xypo' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/the-beatles.webp',
  popularity: 50,
};
