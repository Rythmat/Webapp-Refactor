import type { Song } from '@/curriculum/types/songLibrary';

export const youre_my_best_friend: Song = {
  id: 'youre_my_best_friend',
  title: 'You’re My Best Friend',
  artist: 'Queen',
  year: 1976,
  historicalDescription:
    "Queen releases 'You're My Best Friend' in 1976, with bassist John Deacon stepping into the spotlight as both writer and performer — playing the distinctive electric piano hook that drives the song. A warm, radio-friendly counterpoint to the band's more bombastic rock, it showcases Queen's range and becomes one of their most beloved singles.",
  key: 'C major',
  keyRoot: 60,
  mode: 'major',
  tempo: 120,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['pop'],
  techniques: [],

  sections: [
    {
      id: 'section_a',
      label: 'Section A',
      bars: [{ chords: [], restBars: 4 }],
    },
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        {
          chords: [
            { degree: '2 min7/1', chordName: 'Dmin7/C', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7/1', chordName: 'Dmin7/C', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_c',
      label: 'Section C',
      bars: [
        {
          chords: [
            { degree: '2 min7/1', chordName: 'Dmin7/C', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7/1', chordName: 'Dmin7/C', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7/1', chordName: 'Dmin7/C', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7/1', chordName: 'Dmin7/C', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_d',
      label: 'Section D',
      bars: [
        {
          chords: [
            { degree: '2 min7/1', chordName: 'Dmin7/C', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7/1', chordName: 'Dmin7/C', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7/1', chordName: 'Dmin7/C', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7/1', chordName: 'Dmin7/C', beat: 1, duration: 4 },
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
            { degree: '1 maj', chordName: 'C', beat: 1, duration: 1 },
            { degree: '1 maj/3', chordName: 'C/E', beat: 2, duration: 1 },
            { degree: '5 maj', chordName: 'G', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'G/B', beat: 1, duration: 1 },
            { degree: '6 min7', chordName: 'Amin7', beat: 2, duration: 3 },
          ],
        },
        { chords: [{ degree: '2 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'C', beat: 1, duration: 1 },
            { degree: '1 maj/3', chordName: 'C/E', beat: 2, duration: 1 },
            { degree: '5 maj', chordName: 'G', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'G/B', beat: 1, duration: 1 },
            { degree: '6 min7', chordName: 'Amin7', beat: 2, duration: 3 },
          ],
        },
        { chords: [{ degree: '2 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 maj/♯5', chordName: 'E/G♯', beat: 1, duration: 4 },
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
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'G', beat: 1, duration: 1 },
            { degree: '1 maj', chordName: 'C', beat: 2, duration: 1 },
            { degree: '5 maj', chordName: 'G', beat: 3, duration: 1 },
            { degree: '4 maj', chordName: 'F', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [
            { degree: '2 min7/1', chordName: 'Dmin7/C', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7/1', chordName: 'Dmin7/C', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 maj/♯5', chordName: 'E/G♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 7/♭7', chordName: 'C7/B♭', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_i',
      label: 'Section I',
      bars: [
        {
          chords: [
            { degree: '4 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 7', chordName: 'E7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '2 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_j',
      label: 'Section J',
      bars: [
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [
            { degree: '2 min7/1', chordName: 'Dmin7/C', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7/1', chordName: 'Dmin7/C', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_l',
      label: 'Section L',
      bars: [
        {
          chords: [
            { degree: '2 min7/1', chordName: 'Dmin7/C', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7/1', chordName: 'Dmin7/C', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_m',
      label: 'Section M',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7/1', chordName: 'Dmin7/C', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7/1', chordName: 'Dmin7/C', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_n',
      label: 'Section N',
      bars: [
        {
          chords: [
            { degree: '2 min7/1', chordName: 'Dmin7/C', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7/1', chordName: 'Dmin7/C', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7/1', chordName: 'Dmin7/C', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7/1', chordName: 'Dmin7/C', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'C', beat: 1, duration: 1 },
            { degree: '1 maj/3', chordName: 'C/E', beat: 2, duration: 1 },
            { degree: '5 maj', chordName: 'G', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'G/B', beat: 1, duration: 1 },
            { degree: '6 min7', chordName: 'Amin7', beat: 2, duration: 3 },
          ],
        },
        { chords: [{ degree: '2 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_p',
      label: 'Section P',
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'C', beat: 1, duration: 1 },
            { degree: '1 maj/3', chordName: 'C/E', beat: 2, duration: 1 },
            { degree: '5 maj', chordName: 'G', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'G/B', beat: 1, duration: 1 },
            { degree: '6 min7', chordName: 'Amin7', beat: 2, duration: 3 },
          ],
        },
        { chords: [{ degree: '2 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 maj/♯5', chordName: 'E/G♯', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_q',
      label: 'Section Q',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_r',
      label: 'Section R',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7/1', chordName: 'Dmin7/C', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7/1', chordName: 'Dmin7/C', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_f_2',
      label: 'Section F',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 maj/♯5', chordName: 'E/G♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 7/♭7', chordName: 'C7/B♭', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_t',
      label: 'Section T',
      bars: [
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 7', chordName: 'E7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '2 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_g_2',
      label: 'Section G',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
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
            { degree: '4 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_h',
      label: 'Section H',
      bars: [
        {
          chords: [
            { degree: '2 min7/1', chordName: 'Dmin7/C', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7/1', chordName: 'Dmin7/C', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7/1', chordName: 'Dmin7/C', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7/1', chordName: 'Dmin7/C', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_x',
      label: 'Section X',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'G/B', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'G/B', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/2', chordName: 'G/D', beat: 1, duration: 2 },
            { degree: '1 maj/3', chordName: 'C/E', beat: 3, duration: 2 },
          ],
          fermata: true,
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=HaZpZQG2z10' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/queen.webp',
  popularity: 50,
};
