import type { Song } from '@/curriculum/types/songLibrary';

export const unforgettable: Song = {
  id: 'unforgettable',
  title: 'Unforgettable',
  artist: 'Nat King Cole',
  year: 1952,
  historicalDescription:
    "Nat King Cole records 'Unforgettable', a lush, aching ballad that cements his transformation from jazz pianist to one of America's most beloved vocalists. His warm, velvet baritone turns the song into a standard — timeless enough that decades later, his daughter Natalie duets with him from beyond the grave in a landmark technological reunion.",
  key: 'C minor',
  keyRoot: 60,
  mode: 'minor',
  tempo: 89,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['jazz'],
  techniques: [],

  sections: [
    {
      id: 'section_a',
      label: 'Section A',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 dim7', chordName: 'A♭dim7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 dim7', chordName: 'A♭dim7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_c',
      label: 'Section C',
      bars: [
        {
          chords: [{ degree: '7 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '7 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'G7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      bars: [
        {
          chords: [{ degree: '3 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '6 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '7 maj', chordName: 'B♭', beat: 1, duration: 2 },
            { degree: '3 7', chordName: 'E♭7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Dmin7', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'G7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 dim7', chordName: 'A♭dim7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 dim7', chordName: 'A♭dim7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_g',
      label: 'Section G',
      bars: [
        {
          chords: [{ degree: '7 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '7 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'G7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [{ degree: '3 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '6 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '7 maj', chordName: 'B♭', beat: 1, duration: 2 },
            { degree: '3 7', chordName: 'E♭7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Dmin7', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'G7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_i',
      label: 'Section I',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'Cmin7', beat: 1, duration: 2 },
            { degree: '4 7', chordName: 'F7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '7 maj', chordName: 'B♭', beat: 1, duration: 2 },
            { degree: '5 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'E♭min7', beat: 1, duration: 2 },
            { degree: '6 7', chordName: 'A♭7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_e_2',
      label: 'Section E',
      bars: [
        {
          chords: [{ degree: '♭2 maj', chordName: 'C♯', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭2 maj', chordName: 'C♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♯3 dim7', chordName: 'Edim7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯3 dim7', chordName: 'Edim7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_k',
      label: 'Section K',
      bars: [
        {
          chords: [{ degree: '♭5 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭5 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '7 min7', chordName: 'A♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '3 7', chordName: 'D♯7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      bars: [
        {
          chords: [{ degree: '♯7 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '♯3 7', chordName: 'E7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭5 maj', chordName: 'F♯', beat: 1, duration: 2 },
            { degree: '♯7 7', chordName: 'B7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '7 min7', chordName: 'A♯min7', beat: 1, duration: 2 },
            { degree: '3 7', chordName: 'D♯7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_m',
      label: 'Section M',
      bars: [
        { chords: [{ degree: '6 7', chordName: 'G♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 7', chordName: 'G♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 7', chordName: 'G♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_g_2',
      label: 'Section G',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 dim7', chordName: 'A♭dim7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 dim7', chordName: 'A♭dim7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_o',
      label: 'Section O',
      bars: [
        {
          chords: [{ degree: '7 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '7 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'G7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_h',
      label: 'Section H',
      measuresPerRow: 7,
      bars: [
        {
          chords: [{ degree: '3 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '6 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '7 maj', chordName: 'B♭', beat: 1, duration: 2 },
            { degree: '3 7', chordName: 'E♭7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Dmin7', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'G7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'Cmin7', beat: 1, duration: 2 },
            { degree: '4 7', chordName: 'F7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '7 maj', chordName: 'B♭', beat: 1, duration: 4 }],
          fermata: true,
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=iF7kOq0peAU' },
  ],
  artistImageSource: 'commissioned',

  artistImageRef: '/artists/nat-king-cole.webp',
  popularity: 50,
};
