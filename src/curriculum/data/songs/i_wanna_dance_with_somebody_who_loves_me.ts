import type { Song } from '@/curriculum/types/songLibrary';

export const i_wanna_dance_with_somebody_who_loves_me: Song = {
  id: 'i_wanna_dance_with_somebody_who_loves_me',
  title: 'I Wanna Dance With Somebody (Who Loves Me)',
  artist: 'Whitney Houston',
  year: 1987,
  historicalDescription:
    "Whitney Houston releases 'I Wanna Dance With Somebody (Who Loves Me)' in 1987, and its euphoric energy becomes an instant anthem of the decade. The song showcases Houston's extraordinary vocal range and marks her commercial peak, cementing her status as the defining pop voice of the era — joyful, powerful, and impossible to ignore.",
  key: 'F♯ major',
  keyRoot: 66,
  mode: 'major',
  tempo: 120,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['pop', 'rock'],
  techniques: [],

  sections: [
    {
      id: 'section_a',
      label: 'Section A',
      bars: [
        { chords: [], restBars: 2 },
        {
          chords: [{ degree: '1 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_b',
      label: 'Section B',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_c',
      label: 'Section C',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'A♭min7', beat: 1, duration: 1 },
            { degree: '3 min7', chordName: 'B♭min7', beat: 2, duration: 1 },
            { degree: '4 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 7', chordName: 'D♭7', beat: 1, duration: 1 },
            { degree: '1 maj', chordName: 'G♭', beat: 2, duration: 3 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        {
          chords: [{ degree: '5 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'A♭min7', beat: 1, duration: 2 },
            { degree: '1 maj/3', chordName: 'G♭/B♭', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      bars: [
        {
          chords: [{ degree: '5 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'A♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/5', chordName: 'G♭/D♭', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'D♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'G♭/B♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/4', chordName: 'D♭/B', beat: 1, duration: 1 },
            { degree: '1 maj/4', chordName: 'G♭/B', beat: 2, duration: 1 },
            { degree: '4 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_g',
      label: 'Section G',
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'A♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'G♭/B♭', beat: 1, duration: 2 },
            { degree: '5 maj/6', chordName: 'D♭/E♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'B', beat: 1, duration: 1 },
            { degree: '1 maj/3', chordName: 'G♭/B♭', beat: 2, duration: 1 },
            { degree: '4 maj', chordName: 'B', beat: 3, duration: 1 },
            { degree: '5 maj', chordName: 'D♭', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_i',
      label: 'Section I',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 7', chordName: 'D♭7sus', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_k',
      label: 'Section K',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_l',
      label: 'Section L',
      measuresPerRow: 3,
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'A♭min7', beat: 1, duration: 1 },
            { degree: '3 min7', chordName: 'B♭min7', beat: 2, duration: 1 },
            { degree: '4 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 7', chordName: 'D♭7', beat: 1, duration: 1 },
            { degree: '1 maj', chordName: 'G♭', beat: 2, duration: 3 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_e_2',
      label: 'Section E',
      bars: [
        {
          chords: [{ degree: '5 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'A♭min7', beat: 1, duration: 2 },
            { degree: '1 maj/3', chordName: 'G♭/B♭', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_n',
      label: 'Section N',
      bars: [
        {
          chords: [{ degree: '5 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'A♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/5', chordName: 'G♭/D♭', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'D♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'G♭/B♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/4', chordName: 'D♭/B', beat: 1, duration: 1 },
            { degree: '1 maj/4', chordName: 'G♭/B', beat: 2, duration: 1 },
            { degree: '4 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_p',
      label: 'Section P',
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'A♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'G♭/B♭', beat: 1, duration: 2 },
            { degree: '5 maj/6', chordName: 'D♭/E♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'B', beat: 1, duration: 1 },
            { degree: '1 maj/3', chordName: 'G♭/B♭', beat: 2, duration: 1 },
            { degree: '4 maj', chordName: 'B', beat: 3, duration: 1 },
            { degree: '5 maj', chordName: 'D♭', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_g_2',
      label: 'Section G',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_r',
      label: 'Section R',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 7', chordName: 'D♭7sus', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_h',
      label: 'Section H',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_t',
      label: 'Section T',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'A♭min7', beat: 1, duration: 1 },
            { degree: '3 min7', chordName: 'B♭min7', beat: 2, duration: 1 },
            { degree: '4 maj', chordName: 'B', beat: 3, duration: 1 },
            { degree: '5 7', chordName: 'D♭7sus', beat: 4, duration: 1 },
          ],
        },
      ],
    },
    {
      id: 'section_i_2',
      label: 'Section I',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'A♭min7', beat: 1, duration: 2 },
            { degree: '3 min7', chordName: 'B♭min7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_v',
      label: 'Section V',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_j',
      label: 'Section J',
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'A♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/5', chordName: 'G♭/D♭', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'D♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'G♭/B♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/4', chordName: 'D♭/B', beat: 1, duration: 1 },
            { degree: '1 maj/4', chordName: 'G♭/B', beat: 2, duration: 1 },
            { degree: '4 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_x',
      label: 'Section X',
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'A♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'G♭/B♭', beat: 1, duration: 2 },
            { degree: '5 maj/6', chordName: 'D♭/E♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'B', beat: 1, duration: 1 },
            { degree: '1 maj/3', chordName: 'G♭/B♭', beat: 2, duration: 1 },
            { degree: '4 maj', chordName: 'B', beat: 3, duration: 1 },
            { degree: '5 maj', chordName: 'D♭', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_k_2',
      label: 'Section K',
      bars: [
        {
          chords: [{ degree: '2 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '2 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '2 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '2 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_z',
      label: 'Section Z',
      bars: [
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
          chords: [{ degree: '5 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 7', chordName: 'E♭7sus', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_l_2',
      label: 'Section L',
      bars: [
        {
          chords: [{ degree: '2 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '2 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '2 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '2 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_',
      label: 'Section ',
      bars: [
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
          chords: [{ degree: '5 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'B♭min7', beat: 1, duration: 1 },
            { degree: '♭5 min7', chordName: 'Cmin7', beat: 2, duration: 1 },
            { degree: '5 maj', chordName: 'D♭', beat: 3, duration: 1 },
            { degree: '6 7', chordName: 'E♭7', beat: 4, duration: 1 },
          ],
        },
      ],
    },
    {
      id: 'section_m',
      label: 'Section M',
      bars: [
        {
          chords: [{ degree: '2 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '2 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '2 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '2 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_n_2',
      label: 'Section N',
      bars: [
        {
          chords: [{ degree: '2 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '2 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '2 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '2 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section__',
      label: 'Section _',
      bars: [
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
          chords: [{ degree: '5 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'B♭min7', beat: 1, duration: 1 },
            { degree: '♭5 min7', chordName: 'Cmin7', beat: 2, duration: 1 },
            { degree: '5 maj', chordName: 'D♭', beat: 3, duration: 1 },
            { degree: '6 7', chordName: 'E♭7', beat: 4, duration: 1 },
          ],
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=eH3giaIzONA' },
  ],
  artistImageSource: 'commissioned',

  artistImageRef: '/artists/whitney-houston.webp',
  popularity: 50,
};
