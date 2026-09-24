import type { Song } from '@/curriculum/types/songLibrary';

export const p_y_t_pretty_young_thing: Song = {
  id: 'p_y_t_pretty_young_thing',
  title: 'P.Y.T. (Pretty Young Thing)',
  artist: 'Michael Jackson',
  year: 1983,
  historicalDescription:
    "Michael Jackson releases 'P.Y.T. (Pretty Young Thing)' as part of the landmark Thriller album, the best-selling record of all time. Propelled by irresistible, synth-driven grooves and Jackson's elastic, playful vocals, the track captures the euphoric energy of early 1980s pop at its peak. It cements Thriller's dominance across pop, R&B, and dance floors worldwide.",
  key: 'B dorian',
  keyRoot: 71,
  mode: 'dorian',
  tempo: 128,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['pop', 'rock'],
  techniques: [],

  sections: [
    {
      id: 'section_a',
      label: 'Section A',
      bars: [
        {
          chords: [
            { degree: '1 min7/♭7', chordName: 'Bmin7/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7b5', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7/5', chordName: 'Bmin7/F♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/1', chordName: 'A/B', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 7', chordName: 'E7sus', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 min7/1', chordName: 'F♯min7/B', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_c',
      label: 'Section C',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 7', chordName: 'E7sus', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 min7/1', chordName: 'F♯min7/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      bars: [
        {
          chords: [{ degree: '♭6 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [
            {
              degree: '2 min7/5',
              chordName: 'C♯min7/F♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 min7/1', chordName: 'F♯min7/B', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 7', chordName: 'B7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭6 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      bars: [
        {
          chords: [{ degree: '♭6 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [
            {
              degree: '2 min7/5',
              chordName: 'C♯min7/F♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        {
          chords: [
            {
              degree: '♭7 min7/♭3',
              chordName: 'Amin7/D',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [{ degree: '1 7', chordName: 'B7alt', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [
            { degree: '4 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '♭7 6', chordName: 'A6', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '♭7 6', chordName: 'A6', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_g',
      label: 'Section G',
      bars: [
        {
          chords: [{ degree: '♭6 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭3 maj/5', chordName: 'D/F♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7/1', chordName: 'F♯min7/B', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 7', chordName: 'B7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_h',
      label: 'Section H',
      bars: [
        { chords: [{ degree: '♭7 6', chordName: 'A6', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '♭7 6', chordName: 'A6', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_i',
      label: 'Section I',
      bars: [
        {
          chords: [
            { degree: '5 min7/1', chordName: 'F♯min7/B', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 7', chordName: 'B7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭6 maj/♭7', chordName: 'G/A', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '♭7 9', chordName: 'A9', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 7', chordName: 'E7sus', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 min7/1', chordName: 'F♯min7/B', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_k',
      label: 'Section K',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 7', chordName: 'E7sus', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 min7/1', chordName: 'F♯min7/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_e_2',
      label: 'Section E',
      bars: [
        {
          chords: [{ degree: '♭6 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [
            {
              degree: '2 min7/5',
              chordName: 'C♯min7/F♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 min7/1', chordName: 'F♯min7/B', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 7', chordName: 'B7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭6 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_m',
      label: 'Section M',
      bars: [
        {
          chords: [{ degree: '♭6 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [
            {
              degree: '2 min7/5',
              chordName: 'C♯min7/F♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        {
          chords: [
            {
              degree: '♭7 min7/♭3',
              chordName: 'Amin7/D',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [{ degree: '1 7', chordName: 'B7alt', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      bars: [
        {
          chords: [
            { degree: '4 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '♭7 6', chordName: 'A6', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '♭7 6', chordName: 'A6', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_o',
      label: 'Section O',
      bars: [
        {
          chords: [{ degree: '♭6 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭3 maj/5', chordName: 'D/F♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7/1', chordName: 'F♯min7/B', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 7', chordName: 'B7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_p',
      label: 'Section P',
      bars: [
        { chords: [{ degree: '♭7 6', chordName: 'A6', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '♭7 6', chordName: 'A6', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭6 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭3 maj/5', chordName: 'D/F♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7/1', chordName: 'F♯min7/B', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_g_2',
      label: 'Section G',
      bars: [
        {
          chords: [
            { degree: '5 min7/1', chordName: 'F♯min7/B', beat: 1, duration: 4 },
          ],
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
      id: 'section_h_2',
      label: 'Section H',
      bars: [
        {
          chords: [{ degree: '♭7 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 maj/6', chordName: 'E/G♯', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'F♯7sus', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_t',
      label: 'Section T',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_u',
      label: 'Section U',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭3 maj/5', chordName: 'D/F♯', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 7', chordName: 'B7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_i_2',
      label: 'Section I',
      bars: [
        {
          chords: [
            { degree: '4 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '♭7 6', chordName: 'A6', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '♭7 6', chordName: 'A6', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_w',
      label: 'Section W',
      bars: [
        {
          chords: [{ degree: '♭6 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭3 maj/5', chordName: 'D/F♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7/1', chordName: 'F♯min7/B', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [] },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=1ZZQuj6htF4' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/michael-jackson.webp',
  popularity: 50,
};
