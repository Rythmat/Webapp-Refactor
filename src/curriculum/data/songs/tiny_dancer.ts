import type { Song } from '@/curriculum/types/songLibrary';

export const tiny_dancer: Song = {
  id: 'tiny_dancer',
  title: 'Tiny Dancer',
  artist: 'Elton John',
  year: 2009,
  historicalDescription:
    "Elton John and Bernie Taupin's 'Tiny Dancer' captures the sun-drenched romanticism of early 1970s California, painting a portrait of a free-spirited dancer against the backdrop of the LA music scene. Though not an immediate chart sensation on release, the song becomes one of rock's most beloved anthems — immortalized for a new generation by its unforgettable appearance in Cameron Crowe's Almost Famous.",
  key: 'C minor',
  keyRoot: 60,
  mode: 'minor',
  tempo: 74,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['rock'],
  techniques: [],

  sections: [
    {
      id: 'section_a',
      label: 'Section A',
      measuresPerRow: 8,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      measuresPerRow: 7,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'F/C', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'F/C', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj/♯6', chordName: 'F/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/♯7', chordName: 'G/B', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_c',
      label: 'Section C',
      measuresPerRow: 7,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'F/C', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'F/C', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj/♯6', chordName: 'F/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/5', chordName: 'C/G', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      measuresPerRow: 8,
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♯3 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯6 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 7/♭5', chordName: 'D7/F♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7/4', chordName: 'Dmin7/F', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '♯3 7', chordName: 'E7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♯6 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      measuresPerRow: 6,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj', chordName: 'G', beat: 1, duration: 1 },
            { degree: '4 maj', chordName: 'F', beat: 2, duration: 1 },
            { degree: '♯3 min7', chordName: 'Emin7', beat: 3, duration: 1 },
            { degree: '2 min7', chordName: 'Dmin7', beat: 4, duration: 1 },
          ],
        },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      measuresPerRow: 5,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      measuresPerRow: 6,
      bars: [
        {
          chords: [
            { degree: '6 maj', chordName: 'A♭', beat: 1, duration: 2 },
            { degree: '7 maj', chordName: 'B♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Gmin7', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'Cmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '6 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '7 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 7/♯7', chordName: 'G7/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 7/2', chordName: 'G7/D', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      measuresPerRow: 7,
      repeatCount: 4,
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj/♯3', chordName: 'C/E', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/♯3', chordName: 'C/E', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj/♯3', chordName: 'C/E', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/♯6', chordName: 'G/A', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_i',
      label: 'Section I',
      measuresPerRow: 7,
      bars: [
        {
          chords: [
            { degree: '5 maj/♯6', chordName: 'G/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/♯6', chordName: 'G/A', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_e_2',
      label: 'Section E',
      measuresPerRow: 7,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'F/C', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'F/C', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj/♯6', chordName: 'F/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/♯7', chordName: 'G/B', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_k',
      label: 'Section K',
      measuresPerRow: 7,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'F/C', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'F/C', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj/♯6', chordName: 'F/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/5', chordName: 'C/G', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_f_2',
      label: 'Section F',
      measuresPerRow: 8,
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♯3 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯6 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 7/♭5', chordName: 'D7/F♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7/4', chordName: 'Dmin7/F', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '♯3 7', chordName: 'E7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♯6 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_m',
      label: 'Section M',
      measuresPerRow: 9,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj', chordName: 'G', beat: 1, duration: 1 },
            { degree: '4 maj', chordName: 'F', beat: 2, duration: 1 },
            { degree: '♯3 min7', chordName: 'Emin7', beat: 3, duration: 1 },
            { degree: '2 min7', chordName: 'Dmin7', beat: 4, duration: 1 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_g',
      label: 'Section G',
      measuresPerRow: 6,
      bars: [
        {
          chords: [
            { degree: '6 maj', chordName: 'A♭', beat: 1, duration: 2 },
            { degree: '7 maj', chordName: 'B♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Gmin7', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'Cmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '6 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '7 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 7/♯7', chordName: 'G7/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 7/2', chordName: 'G7/D', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_h',
      label: 'Section H',
      measuresPerRow: 8,
      repeatCount: 4,
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj/♯3', chordName: 'C/E', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/♯3', chordName: 'C/E', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj/♯3', chordName: 'C/E', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/♯6', chordName: 'G/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/♯6', chordName: 'G/A', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_i_2',
      label: 'Section I',
      measuresPerRow: 7,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }],
          fermata: true,
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=yYcyacLRPNs' },
  ],
  artistImageSource: 'commissioned',

  artistImageRef: '/artists/elton-john.webp',
  popularity: 50,
};
