import type { Song } from '@/curriculum/types/songLibrary';

export const summer_soft: Song = {
  id: 'summer_soft',
  title: 'Summer Soft',
  artist: 'Stevie Wonder',
  year: 1976,
  historicalDescription:
    "Stevie Wonder releases 'Summer Soft' as part of his landmark double album 'Songs in the Key of Life' — a sweeping meditation on love, loss, and the turning of seasons. The song captures Wonder at the height of his creative powers, blending lush orchestration with an intimate tenderness that sets it apart from the album's more celebrated tracks. 'Songs in the Key of Life' is widely regarded as one of the greatest albums ever made, and 'Summer Soft' is among its most quietly affecting moments.",
  key: 'F♯ minor',
  keyRoot: 66,
  mode: 'minor',
  tempo: 106,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['pop'],
  techniques: [],

  sections: [
    {
      id: 'section_a',
      label: 'Section A',
      measuresPerRow: 2,
      bars: [{ chords: [], restBars: 1 }, { chords: [] }],
    },
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '♯7 7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 7', chordName: 'A7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_c',
      label: 'Section C',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '5 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♯7 7/♭5', chordName: 'F7/C', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♯3 7', chordName: 'B♭7sus', beat: 1, duration: 4 },
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
            { degree: '4 maj/3', chordName: 'B/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'A♭min7', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'D♭7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'G♭', beat: 1, duration: 1 },
            { degree: '7 maj', chordName: 'E', beat: 2, duration: 1 },
            { degree: '♯6 min7', chordName: 'E♭min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 7', chordName: 'D7', beat: 1, duration: 1 },
            { degree: '5 7', chordName: 'D♭7', beat: 2, duration: 1 },
            { degree: '♭5 7', chordName: 'C7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [
            { degree: '4 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '7 7', chordName: 'E7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '7 7', chordName: 'E7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_g',
      label: 'Section G',
      measuresPerRow: 5,
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'G♭', beat: 1, duration: 1 },
            { degree: '7 maj', chordName: 'E', beat: 2, duration: 1 },
            { degree: '♯6 min7', chordName: 'E♭min7', beat: 3, duration: 2 },
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
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '♯7 7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 7', chordName: 'A7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_i',
      label: 'Section I',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '5 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_e_2',
      label: 'Section E',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♯7 7/♭5', chordName: 'F7/C', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♯3 7', chordName: 'B♭7sus', beat: 1, duration: 4 },
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
            { degree: '4 maj/3', chordName: 'B/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'A♭min7', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'D♭7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'G♭', beat: 1, duration: 1 },
            { degree: '7 maj', chordName: 'E', beat: 2, duration: 1 },
            { degree: '♯6 min7', chordName: 'E♭min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 7', chordName: 'D7', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'D♭7', beat: 3, duration: 2 },
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
            { degree: '♭5 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '♯7 7', chordName: 'F7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭5 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '♯7 7', chordName: 'F7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_m',
      label: 'Section M',
      bars: [
        {
          chords: [{ degree: '♭2 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '6 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭2 maj', chordName: 'G', beat: 1, duration: 1 },
            { degree: '♯7 maj', chordName: 'F', beat: 2, duration: 1 },
            { degree: '7 min7', chordName: 'Emin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♯6 7', chordName: 'E♭7', beat: 1, duration: 2 },
            { degree: '6 7', chordName: 'D7', beat: 3, duration: 2 },
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
            { degree: '5 min7', chordName: 'D♭min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 7', chordName: 'G♭7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 min7', chordName: 'D♭min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 7', chordName: 'G♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_o',
      label: 'Section O',
      bars: [
        {
          chords: [{ degree: '2 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♯6 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 maj', chordName: 'A♭', beat: 1, duration: 1 },
            { degree: '1 maj', chordName: 'G♭', beat: 2, duration: 1 },
            { degree: '♯7 min7', chordName: 'Fmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '7 7', chordName: 'E7', beat: 1, duration: 2 },
            { degree: '♯6 7', chordName: 'E♭7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_h',
      label: 'Section H',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '♭2 7', chordName: 'G7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '♭2 7', chordName: 'G7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_q',
      label: 'Section Q',
      bars: [
        { chords: [{ degree: '3 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 maj', chordName: 'A', beat: 1, duration: 1 },
            { degree: '♭2 maj', chordName: 'G', beat: 2, duration: 1 },
            { degree: '1 min7', chordName: 'F♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♯7 7', chordName: 'F7', beat: 1, duration: 2 },
            { degree: '7 7', chordName: 'E7', beat: 3, duration: 2 },
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
            { degree: '♯6 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '2 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♯6 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '2 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_s',
      label: 'Section S',
      bars: [
        {
          chords: [{ degree: '♯3 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♯7 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♯3 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '2 maj', chordName: 'A♭', beat: 2, duration: 1 },
            { degree: '♭2 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 7', chordName: 'F♯7', beat: 1, duration: 2 },
            { degree: '♯7 7', chordName: 'F7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_j',
      label: 'Section J',
      bars: [
        {
          chords: [
            { degree: '7 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '3 7', chordName: 'A7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '7 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '3 7', chordName: 'A7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_u',
      label: 'Section U',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'B', beat: 1, duration: 1 },
            { degree: '3 maj', chordName: 'A', beat: 2, duration: 1 },
            { degree: '2 min7', chordName: 'G♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭2 7', chordName: 'G7', beat: 1, duration: 1 },
            { degree: '1 7', chordName: 'F♯7', beat: 2, duration: 1 },
            { degree: '♯7 7', chordName: 'F7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=Kfuapstb50o' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
