import type { Song } from '@/curriculum/types/songLibrary';

export const paranoid_android: Song = {
  id: 'paranoid_android',
  title: 'Paranoid Android',
  artist: 'Radiohead',
  year: 1997,
  historicalDescription:
    "Radiohead releases 'Paranoid Android' as the lead single from their landmark album OK Computer, a sprawling six-minute epic that defies pop convention by shifting through multiple distinct sections — from acoustic melancholy to abrasive guitar fury to ethereal resolution. The song signals a radical departure from guitar rock norms and cements Radiohead's reputation as one of the most daring and influential bands of their generation.",
  key: 'B♭ major',
  keyRoot: 70,
  mode: 'major',
  tempo: 84,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['rock'],
  techniques: [],

  sections: [
    {
      id: 'section_a',
      label: 'Section A',
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_b',
      label: 'Section B',
      measuresPerRow: 3,
      bars: [
        {
          chords: [
            { degree: '♭5 min7', chordName: 'Emin7b5', beat: 1, duration: 1 },
            { degree: '7 7', chordName: 'A7sus', beat: 2, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭5 min7', chordName: 'Emin7b5', beat: 1, duration: 1 },
            { degree: '7 7', chordName: 'A7sus', beat: 2, duration: 3 },
          ],
        },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      measuresPerRow: 6,
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭5 min7', chordName: 'Emin7b5', beat: 1, duration: 1 },
            { degree: '7 7', chordName: 'A7sus', beat: 2, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_d',
      label: 'Section D',
      measuresPerRow: 6,
      bars: [
        {
          chords: [
            { degree: '♭5 min7', chordName: 'Emin7b5', beat: 1, duration: 1 },
            { degree: '7 7', chordName: 'A7sus', beat: 2, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭5 min7', chordName: 'Emin7b5', beat: 1, duration: 1 },
            { degree: '7 7', chordName: 'A7sus', beat: 2, duration: 3 },
          ],
        },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      measuresPerRow: 6,
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♭5 7', chordName: 'E7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♭5 7', chordName: 'E7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      measuresPerRow: 2,
      bars: [{ chords: [] }, { chords: [] }],
    },
    {
      id: 'section_g',
      label: 'Section G',
      measuresPerRow: 2,
      bars: [{ chords: [] }, { chords: [] }],
    },
    {
      id: 'section_h',
      label: 'Section H',
      measuresPerRow: 6,
      bars: [
        { chords: [{ degree: '2 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '2 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_i',
      label: 'Section I',
      measuresPerRow: 3,
      bars: [
        { chords: [{ degree: '2 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_j',
      label: 'Section J',
      measuresPerRow: 2,
      bars: [
        { chords: [{ degree: '2 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭2 maj', chordName: 'B', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'B♭', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      measuresPerRow: 2,
      bars: [{ chords: [] }, { chords: [] }],
    },
    {
      id: 'section_l',
      label: 'Section L',
      measuresPerRow: 2,
      bars: [{ chords: [] }, { chords: [] }],
    },
    {
      id: 'section_e',
      label: 'Section E',
      measuresPerRow: 6,
      bars: [
        { chords: [{ degree: '2 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '2 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_n',
      label: 'Section N',
      measuresPerRow: 3,
      bars: [
        { chords: [{ degree: '2 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_o',
      label: 'Section O',
      measuresPerRow: 3,
      bars: [
        { chords: [{ degree: '2 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_p',
      label: 'Section P',
      measuresPerRow: 2,
      bars: [{ chords: [] }, { chords: [] }],
    },
    {
      id: 'section_q',
      label: 'Section Q',
      measuresPerRow: 2,
      bars: [{ chords: [] }, { chords: [] }],
    },
    {
      id: 'section_r',
      label: 'Section R',
      measuresPerRow: 9,
      bars: [
        { chords: [{ degree: '2 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '2 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '2 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_s',
      label: 'Section S',
      measuresPerRow: 3,
      bars: [
        { chords: [{ degree: '2 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'A♭', beat: 1, duration: 1 },
            { degree: '1 maj', chordName: 'B♭', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'B♭', beat: 3, duration: 1 },
            { degree: '7 maj', chordName: 'A', beat: 4, duration: 1 },
          ],
        },
        { chords: [] },
      ],
    },
    {
      id: 'section_t',
      label: 'Section T',
      measuresPerRow: 2,
      bars: [{ chords: [] }, { chords: [] }],
    },
    {
      id: 'section_u',
      label: 'Section U',
      measuresPerRow: 6,
      bars: [
        { chords: [{ degree: '2 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '2 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_v',
      label: 'Section V',
      measuresPerRow: 3,
      bars: [
        { chords: [{ degree: '2 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_w',
      label: 'Section W',
      measuresPerRow: 2,
      bars: [
        { chords: [{ degree: '2 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'A♭', beat: 1, duration: 1 },
            { degree: '1 maj', chordName: 'B♭', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'B♭', beat: 3, duration: 1 },
            { degree: '7 maj', chordName: 'A', beat: 4, duration: 1 },
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
            { degree: '2 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 maj/♭2', chordName: 'G/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '7 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_y',
      label: 'Section Y',
      bars: [
        {
          chords: [
            { degree: '3 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '7 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7/2', chordName: 'Dmin7/C', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_z',
      label: 'Section Z',
      measuresPerRow: 6,
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'F/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭5 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '7 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_g_2',
      label: 'Section G',
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 maj/♭2', chordName: 'G/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '7 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_',
      label: 'Section ',
      bars: [
        {
          chords: [
            { degree: '3 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '7 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7/2', chordName: 'Dmin7/C', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section__2',
      label: 'Section ]',
      measuresPerRow: 6,
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'F/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭5 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭5 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_h_2',
      label: 'Section H',
      measuresPerRow: 2,
      bars: [{ chords: [] }, { chords: [] }],
    },
    {
      id: 'section__',
      label: 'Section _',
      measuresPerRow: 2,
      bars: [{ chords: [] }, { chords: [] }],
    },
    {
      id: 'section__3',
      label: 'Section `',
      measuresPerRow: 6,
      bars: [
        { chords: [{ degree: '2 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '2 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_a_2',
      label: 'Section a',
      measuresPerRow: 3,
      bars: [
        { chords: [{ degree: '2 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_b_2',
      label: 'Section b',
      measuresPerRow: 2,
      bars: [
        { chords: [{ degree: '2 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'A♭', beat: 1, duration: 1 },
            { degree: '1 maj', chordName: 'B♭', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'B♭', beat: 3, duration: 1 },
            { degree: '7 maj', chordName: 'A', beat: 4, duration: 1 },
          ],
        },
      ],
    },
    {
      id: 'section_c',
      label: 'Section c',
      measuresPerRow: 2,
      bars: [{ chords: [] }, { chords: [] }],
    },
    {
      id: 'section_d_2',
      label: 'Section d',
      measuresPerRow: 2,
      bars: [{ chords: [] }, { chords: [] }],
    },
    {
      id: 'section_e_2',
      label: 'Section e',
      measuresPerRow: 6,
      bars: [
        { chords: [{ degree: '2 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '2 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_f_2',
      label: 'Section f',
      measuresPerRow: 3,
      bars: [
        { chords: [{ degree: '2 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_g_3',
      label: 'Section g',
      measuresPerRow: 2,
      bars: [
        { chords: [{ degree: '2 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'A♭', beat: 1, duration: 1 },
            { degree: '1 maj', chordName: 'B♭', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'B♭', beat: 3, duration: 1 },
            { degree: '7 maj', chordName: 'A', beat: 4, duration: 1 },
          ],
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=fHiGbolFFGw' },
  ],
  artistImageSource: 'commissioned',

  artistImageRef: '/artists/radiohead.webp',
  popularity: 50,
};
