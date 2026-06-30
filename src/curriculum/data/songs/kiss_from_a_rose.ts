import type { Song } from '@/curriculum/types/songLibrary';

export const kiss_from_a_rose: Song = {
  id: 'kiss_from_a_rose',
  title: 'Kiss From A Rose',
  artist: 'Seal',
  year: 1994,
  historicalDescription:
    "Seal releases 'Kiss From A Rose', a baroque-tinged pop ballad unlike almost anything else on the radio in 1994. Its unusual structure, soaring vocal performance, and haunting orchestration set it apart — but it is the song's placement on the Batman Forever soundtrack in 1995 that transforms it into a global phenomenon, sweeping the Grammy Awards and cementing Seal as one of the defining voices of the decade.",
  key: 'G minor',
  keyRoot: 67,
  mode: 'minor',
  tempo: 130,
  timeSignature: [6, 8],

  difficulty: 2,
  genreTags: ['pop'],
  techniques: [],

  sections: [
    {
      id: 'section_a',
      label: 'Section A',
      measuresPerRow: 6,
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 6 },
          ],
        },
        { chords: [{ degree: '7 maj', chordName: 'F', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 6 },
          ],
        },
        { chords: [{ degree: '7 maj', chordName: 'F', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      measuresPerRow: 7,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
        {
          chords: [{ degree: '6 maj', chordName: 'E♭', beat: 1, duration: 6 }],
        },
        { chords: [{ degree: '7 maj', chordName: 'F', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
        {
          chords: [{ degree: '6 maj', chordName: 'E♭', beat: 1, duration: 6 }],
        },
        { chords: [{ degree: '7 maj', chordName: 'F', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
      ],
    },
    {
      id: 'section_c',
      label: 'Section C',
      measuresPerRow: 9,
      bars: [
        { chords: [{ degree: '7 maj', chordName: 'F', beat: 1, duration: 6 }] },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [{ degree: '6 maj', chordName: 'E♭', beat: 1, duration: 6 }],
        },
        { chords: [{ degree: '7 maj', chordName: 'F', beat: 1, duration: 6 }] },
        {
          chords: [{ degree: '6 maj', chordName: 'E♭', beat: 1, duration: 6 }],
        },
        { chords: [{ degree: '7 maj', chordName: 'F', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      measuresPerRow: 7,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
        {
          chords: [{ degree: '6 maj', chordName: 'E♭', beat: 1, duration: 6 }],
        },
        { chords: [{ degree: '7 maj', chordName: 'F', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
        { chords: [{ degree: '7 maj', chordName: 'F', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      measuresPerRow: 8,
      bars: [
        {
          chords: [{ degree: '6 maj', chordName: 'E♭', beat: 1, duration: 6 }],
        },
        { chords: [{ degree: '7 maj', chordName: 'F', beat: 1, duration: 6 }] },
        {
          chords: [{ degree: '6 maj', chordName: 'E♭', beat: 1, duration: 6 }],
        },
        { chords: [{ degree: '7 maj', chordName: 'F', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 6 },
          ],
        },
        { chords: [{ degree: '7 maj', chordName: 'F', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      measuresPerRow: 9,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
        {
          chords: [{ degree: '6 maj', chordName: 'E♭', beat: 1, duration: 6 }],
        },
        { chords: [{ degree: '7 maj', chordName: 'F', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
        {
          chords: [{ degree: '6 maj', chordName: 'E♭', beat: 1, duration: 6 }],
        },
        { chords: [{ degree: '7 maj', chordName: 'F', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
        {
          chords: [{ degree: '6 maj', chordName: 'E♭', beat: 1, duration: 6 }],
        },
        { chords: [{ degree: '7 maj', chordName: 'F', beat: 1, duration: 6 }] },
      ],
    },
    {
      id: 'section_g',
      label: 'Section G',
      measuresPerRow: 10,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
        {
          chords: [{ degree: '6 maj', chordName: 'E♭', beat: 1, duration: 6 }],
        },
        { chords: [{ degree: '7 maj', chordName: 'F', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [{ degree: '6 maj', chordName: 'E♭', beat: 1, duration: 6 }],
        },
        { chords: [{ degree: '7 maj', chordName: 'F', beat: 1, duration: 6 }] },
        {
          chords: [{ degree: '6 maj', chordName: 'E♭', beat: 1, duration: 6 }],
        },
        { chords: [{ degree: '7 maj', chordName: 'F', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      measuresPerRow: 9,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
        {
          chords: [{ degree: '6 maj', chordName: 'E♭', beat: 1, duration: 6 }],
        },
        { chords: [{ degree: '7 maj', chordName: 'F', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
        { chords: [{ degree: '7 maj', chordName: 'F', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
        {
          chords: [{ degree: '6 maj', chordName: 'E♭', beat: 1, duration: 6 }],
        },
        { chords: [{ degree: '7 maj', chordName: 'F', beat: 1, duration: 6 }] },
      ],
    },
    {
      id: 'section_i',
      label: 'Section I',
      measuresPerRow: 10,
      bars: [
        {
          chords: [{ degree: '6 maj', chordName: 'E♭', beat: 1, duration: 6 }],
        },
        { chords: [{ degree: '7 maj', chordName: 'F', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 6 },
          ],
        },
        { chords: [{ degree: '7 maj', chordName: 'F', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
        {
          chords: [{ degree: '6 maj', chordName: 'E♭', beat: 1, duration: 6 }],
        },
        { chords: [{ degree: '7 maj', chordName: 'F', beat: 1, duration: 6 }] },
        {
          chords: [{ degree: '6 maj', chordName: 'E♭', beat: 1, duration: 6 }],
        },
        { chords: [{ degree: '7 maj', chordName: 'F', beat: 1, duration: 6 }] },
      ],
    },
    {
      id: 'section_e_2',
      label: 'Section E',
      measuresPerRow: 8,
      bars: [
        { chords: [{ degree: '7 maj', chordName: 'F', beat: 1, duration: 6 }] },
        {
          chords: [
            { degree: '4 maj/7', chordName: 'C/F', beat: 1, duration: 6 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 6 }] },
        {
          chords: [{ degree: '3 maj', chordName: 'B♭', beat: 1, duration: 6 }],
        },
        { chords: [{ degree: '7 maj', chordName: 'F', beat: 1, duration: 6 }] },
        {
          chords: [
            { degree: '4 maj/7', chordName: 'C/F', beat: 1, duration: 6 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 6 }] },
        {
          chords: [{ degree: '3 maj', chordName: 'B♭', beat: 1, duration: 6 }],
        },
      ],
    },
    {
      id: 'section_k',
      label: 'Section K',
      measuresPerRow: 8,
      bars: [
        { chords: [{ degree: '7 maj', chordName: 'F', beat: 1, duration: 6 }] },
        {
          chords: [
            { degree: '4 maj/7', chordName: 'C/F', beat: 1, duration: 6 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 6 }] },
        {
          chords: [{ degree: '3 maj', chordName: 'B♭', beat: 1, duration: 6 }],
        },
        { chords: [{ degree: '7 maj', chordName: 'F', beat: 1, duration: 6 }] },
        {
          chords: [
            { degree: '4 maj/7', chordName: 'C/F', beat: 1, duration: 6 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 6 }] },
        {
          chords: [{ degree: '3 maj', chordName: 'B♭', beat: 1, duration: 6 }],
        },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      measuresPerRow: 9,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
        {
          chords: [{ degree: '6 maj', chordName: 'E♭', beat: 1, duration: 6 }],
        },
        { chords: [{ degree: '7 maj', chordName: 'F', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
        {
          chords: [{ degree: '6 maj', chordName: 'E♭', beat: 1, duration: 6 }],
        },
        { chords: [{ degree: '7 maj', chordName: 'F', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
        {
          chords: [{ degree: '6 maj', chordName: 'E♭', beat: 1, duration: 6 }],
        },
        { chords: [{ degree: '7 maj', chordName: 'F', beat: 1, duration: 6 }] },
      ],
    },
    {
      id: 'section_m',
      label: 'Section M',
      measuresPerRow: 10,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
        {
          chords: [{ degree: '6 maj', chordName: 'E♭', beat: 1, duration: 6 }],
        },
        { chords: [{ degree: '7 maj', chordName: 'F', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [{ degree: '6 maj', chordName: 'E♭', beat: 1, duration: 6 }],
        },
        { chords: [{ degree: '7 maj', chordName: 'F', beat: 1, duration: 6 }] },
        {
          chords: [{ degree: '6 maj', chordName: 'E♭', beat: 1, duration: 6 }],
        },
        { chords: [{ degree: '7 maj', chordName: 'F', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
      ],
    },
    {
      id: 'section_g_2',
      label: 'Section G',
      measuresPerRow: 7,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
        {
          chords: [{ degree: '6 maj', chordName: 'E♭', beat: 1, duration: 6 }],
        },
        { chords: [{ degree: '7 maj', chordName: 'F', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
        { chords: [{ degree: '7 maj', chordName: 'F', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
      ],
    },
    {
      id: 'section_o',
      label: 'Section O',
      measuresPerRow: 8,
      bars: [
        {
          chords: [{ degree: '6 maj', chordName: 'E♭', beat: 1, duration: 6 }],
        },
        { chords: [{ degree: '7 maj', chordName: 'F', beat: 1, duration: 6 }] },
        {
          chords: [{ degree: '6 maj', chordName: 'E♭', beat: 1, duration: 6 }],
        },
        { chords: [{ degree: '7 maj', chordName: 'F', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 6 },
          ],
        },
        { chords: [{ degree: '7 maj', chordName: 'F', beat: 1, duration: 6 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }],
          fermata: true,
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=hDd2G_V1rzc' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/seal.webp',
  popularity: 50,
};
