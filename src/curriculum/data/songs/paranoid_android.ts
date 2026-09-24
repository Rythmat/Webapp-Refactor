import type { Song } from '@/curriculum/types/songLibrary';

export const paranoid_android: Song = {
  id: 'paranoid_android',
  title: 'Paranoid Android',
  artist: 'Radiohead',
  year: 1997,
  historicalDescription:
    "Radiohead releases 'Paranoid Android' as the lead single from their landmark album OK Computer, a sprawling six-minute epic that defies pop convention by shifting through multiple distinct sections — from acoustic melancholy to abrasive guitar fury to ethereal resolution. The song signals a radical departure from guitar rock norms and cements Radiohead's reputation as one of the most daring and influential bands of their generation.",
  key: 'G minor & A minor',
  keyRoot: 67,
  mode: 'minor',
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
            { degree: '4 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_b',
      label: 'Section B',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7b5', beat: 1, duration: 1 },
            { degree: '2 7', chordName: 'A7sus', beat: 2, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7b5', beat: 1, duration: 1 },
            { degree: '2 7', chordName: 'A7sus', beat: 2, duration: 3 },
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
            { degree: '4 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7b5', beat: 1, duration: 1 },
            { degree: '2 7', chordName: 'A7sus', beat: 2, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_d',
      label: 'Section D',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7b5', beat: 1, duration: 1 },
            { degree: '2 7', chordName: 'A7sus', beat: 2, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7b5', beat: 1, duration: 1 },
            { degree: '2 7', chordName: 'A7sus', beat: 2, duration: 3 },
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
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '6 7', chordName: 'E7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '6 7', chordName: 'E7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [{ chords: [] }, { chords: [] }],
    },
    {
      id: 'section_g',
      label: 'Section G',
      bars: [{ chords: [] }, { chords: [] }],
    },
    {
      id: 'section_h',
      label: 'Section H',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭2 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭2 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_i',
      label: 'Section I',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭2 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_j',
      label: 'Section J',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 maj', chordName: 'B', beat: 1, duration: 2 },
            { degree: '♭3 maj', chordName: 'B♭', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [{ chords: [] }, { chords: [] }],
    },
    {
      id: 'section_l',
      label: 'Section L',
      bars: [{ chords: [] }, { chords: [] }],
    },
    {
      id: 'section_e',
      label: 'Section E',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭2 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭2 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_n',
      label: 'Section N',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭2 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_o',
      label: 'Section O',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭2 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_p',
      label: 'Section P',
      bars: [{ chords: [] }, { chords: [] }],
    },
    {
      id: 'section_q',
      label: 'Section Q',
      bars: [{ chords: [] }, { chords: [] }],
    },
    {
      id: 'section_r',
      label: 'Section R',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭2 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭2 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭2 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_s',
      label: 'Section S',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭2 maj', chordName: 'A♭', beat: 1, duration: 1 },
            { degree: '♭3 maj', chordName: 'B♭', beat: 2, duration: 1 },
            { degree: '♭3 maj', chordName: 'B♭', beat: 3, duration: 1 },
            { degree: '2 maj', chordName: 'A', beat: 4, duration: 1 },
          ],
        },
        { chords: [] },
      ],
    },
    {
      id: 'section_t',
      label: 'Section T',
      bars: [{ chords: [] }, { chords: [] }],
    },
    {
      id: 'section_u',
      label: 'Section U',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭2 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭2 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_v',
      label: 'Section V',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭2 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_w',
      label: 'Section W',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭2 maj', chordName: 'A♭', beat: 1, duration: 1 },
            { degree: '♭3 maj', chordName: 'B♭', beat: 2, duration: 1 },
            { degree: '♭3 maj', chordName: 'B♭', beat: 3, duration: 1 },
            { degree: '2 maj', chordName: 'A', beat: 4, duration: 1 },
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
            { degree: '4 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'G/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '2 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_y',
      label: 'Section Y',
      bars: [
        {
          chords: [
            { degree: '5 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '2 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7/4', chordName: 'Dmin7/C', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_z',
      label: 'Section Z',
      bars: [
        {
          chords: [{ degree: '♭3 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭7 maj/2', chordName: 'F/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '6 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '2 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_g_2',
      label: 'Section G',
      bars: [
        {
          chords: [
            { degree: '4 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'G/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '2 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_',
      label: 'Section ',
      bars: [
        {
          chords: [
            { degree: '5 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '2 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7/4', chordName: 'Dmin7/C', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section__2',
      label: 'Section ]',
      bars: [
        {
          chords: [{ degree: '♭3 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭7 maj/2', chordName: 'F/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '6 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '6 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_h_2',
      label: 'Section H',
      bars: [{ chords: [] }, { chords: [] }],
    },
    {
      id: 'section__',
      label: 'Section _',
      bars: [{ chords: [] }, { chords: [] }],
    },
    {
      id: 'section__3',
      label: 'Section `',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭2 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭2 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_a_2',
      label: 'Section a',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭2 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_b_2',
      label: 'Section b',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭2 maj', chordName: 'A♭', beat: 1, duration: 1 },
            { degree: '♭3 maj', chordName: 'B♭', beat: 2, duration: 1 },
            { degree: '♭3 maj', chordName: 'B♭', beat: 3, duration: 1 },
            { degree: '2 maj', chordName: 'A', beat: 4, duration: 1 },
          ],
        },
      ],
    },
    {
      id: 'section_c',
      label: 'Section c',
      bars: [{ chords: [] }, { chords: [] }],
    },
    {
      id: 'section_d_2',
      label: 'Section d',
      bars: [{ chords: [] }, { chords: [] }],
    },
    {
      id: 'section_e_2',
      label: 'Section e',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭2 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭2 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_f_2',
      label: 'Section f',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭2 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_g_3',
      label: 'Section g',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭2 maj', chordName: 'A♭', beat: 1, duration: 1 },
            { degree: '♭3 maj', chordName: 'B♭', beat: 2, duration: 1 },
            { degree: '♭3 maj', chordName: 'B♭', beat: 3, duration: 1 },
            { degree: '2 maj', chordName: 'A', beat: 4, duration: 1 },
          ],
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=fHiGbolFFGw' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/radiohead.webp',
  popularity: 50,
};
