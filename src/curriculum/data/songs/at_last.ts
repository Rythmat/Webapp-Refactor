import type { Song } from '@/curriculum/types/songLibrary';

export const at_last: Song = {
  id: 'at_last',
  title: 'At Last',
  artist: 'Etta James',
  year: 1960,
  historicalDescription:
    "Etta James records 'At Last' in 1960, transforming a 1941 Glenn Miller big band number into an intimate, aching soul ballad. Her voice — raw, powerful, and deeply emotive — strips away the orchestral pageantry and makes the song feel utterly personal. It becomes one of the most enduring vocal performances in American popular music.",
  key: 'F major',
  keyRoot: 65,
  mode: 'major',
  tempo: 59,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['pop'],
  techniques: [],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      measuresPerRow: 8,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'F/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭5 dim7', chordName: 'Bdim7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/5', chordName: 'F/C', beat: 1, duration: 1 },
            { degree: '1 7/♭7', chordName: 'F7/E♭', beat: 2, duration: 1 },
            { degree: '6 7', chordName: 'D7b9', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '♭6 7', chordName: 'D♭7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 7', chordName: 'C7', beat: 1, duration: 4 }],
          fermata: true,
        },
        { chords: [], fermata: true },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'F', beat: 1, duration: 1 },
            { degree: '6 min7', chordName: 'Dmin7', beat: 2, duration: 1 },
            { degree: '2 min7', chordName: 'Gmin7', beat: 3, duration: 1 },
            { degree: '5 7', chordName: 'C7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'F', beat: 1, duration: 1 },
            { degree: '6 min7', chordName: 'Dmin7', beat: 2, duration: 1 },
            { degree: '2 min7', chordName: 'Gmin7', beat: 3, duration: 1 },
            { degree: '5 7', chordName: 'C7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'F', beat: 1, duration: 1 },
            { degree: '6 min7', chordName: 'Dmin7', beat: 2, duration: 1 },
            { degree: '2 min7', chordName: 'Gmin7', beat: 3, duration: 1 },
            { degree: '5 7', chordName: 'C7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'F', beat: 1, duration: 1 },
            { degree: '6 min7', chordName: 'Dmin7', beat: 2, duration: 1 },
            { degree: '♭6 7', chordName: 'D♭7', beat: 3, duration: 1 },
            { degree: '5 7', chordName: 'C7', beat: 4, duration: 1 },
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
            { degree: '1 maj', chordName: 'F', beat: 1, duration: 1 },
            { degree: '6 min7', chordName: 'Dmin7', beat: 2, duration: 1 },
            { degree: '2 min7', chordName: 'Gmin7', beat: 3, duration: 1 },
            { degree: '5 7', chordName: 'C7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'F', beat: 1, duration: 1 },
            { degree: '6 min7', chordName: 'Dmin7', beat: 2, duration: 1 },
            { degree: '2 min7', chordName: 'Gmin7', beat: 3, duration: 1 },
            { degree: '5 7', chordName: 'C7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'F', beat: 1, duration: 1 },
            { degree: '6 min7', chordName: 'Dmin7', beat: 2, duration: 1 },
            { degree: '2 min7', chordName: 'Gmin7', beat: 3, duration: 1 },
            { degree: '5 7', chordName: 'C7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'F', beat: 1, duration: 1 },
            { degree: '4 maj', chordName: 'B♭', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'F', beat: 3, duration: 1 },
            { degree: '♭2 dim7', chordName: 'F♯dim7', beat: 4, duration: 1 },
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
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 1 },
            { degree: '5 7', chordName: 'C7', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '7 7', chordName: 'E7', beat: 1, duration: 1 },
            { degree: '1 7', chordName: 'F7', beat: 2, duration: 1 },
            { degree: '7 7', chordName: 'E7', beat: 3, duration: 1 },
            { degree: '3 min7', chordName: 'Amin7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Dmin7', beat: 1, duration: 1 },
            { degree: '2 7', chordName: 'G7', beat: 2, duration: 1 },
            { degree: '5 maj', chordName: 'C', beat: 3, duration: 1 },
            { degree: '♭6 dim7', chordName: 'C♯dim7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Dmin7', beat: 1, duration: 1 },
            { degree: '2 7', chordName: 'G7', beat: 2, duration: 1 },
            { degree: '5 7', chordName: 'C7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      measuresPerRow: 5,
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'F', beat: 1, duration: 1 },
            { degree: '6 min7', chordName: 'Dmin7', beat: 2, duration: 1 },
            { degree: '2 min7', chordName: 'Gmin7', beat: 3, duration: 1 },
            { degree: '5 7', chordName: 'C7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'F', beat: 1, duration: 1 },
            { degree: '6 min7', chordName: 'Dmin7', beat: 2, duration: 1 },
            { degree: '2 min7', chordName: 'Gmin7', beat: 3, duration: 1 },
            { degree: '5 7', chordName: 'C7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'F', beat: 1, duration: 1 },
            { degree: '6 min7', chordName: 'Dmin7', beat: 2, duration: 1 },
            { degree: '2 min7', chordName: 'Gmin7', beat: 3, duration: 1 },
            { degree: '5 7', chordName: 'C7', beat: 4, duration: 1 },
          ],
        },
        { chords: [], fermata: true },
        { chords: [], fermata: true },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'F', beat: 1, duration: 1 },
            { degree: '1 maj/3', chordName: 'F/A', beat: 2, duration: 1 },
            { degree: '4 maj', chordName: 'B♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭5 dim7', chordName: 'Bdim7', beat: 1, duration: 1 },
            { degree: '1 maj/5', chordName: 'F/C', beat: 2, duration: 1 },
            { degree: '1 7/♭7', chordName: 'F7/E♭', beat: 3, duration: 1 },
            { degree: '6 7', chordName: 'D7b9', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '♭6 7', chordName: 'D♭7', beat: 1, duration: 1 },
            { degree: '5 7', chordName: 'C7', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'F', beat: 3, duration: 1 },
            { degree: '1 maj/4', chordName: 'F/B♭', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }],
          fermata: true,
        },
      ],
    },
    {
      id: 'bridge_2',
      label: 'Bridge',
      bars: [
        {
          chords: [
            { degree: '4 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭5 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭5 maj/♭6', chordName: 'B/D♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭5 maj/6', chordName: 'B/D', beat: 1, duration: 4 },
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
            { degree: '♭7 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [] },
        { chords: [] },
        { chords: [] },
      ],
    },
    {
      id: 'verse_2_2',
      label: 'Verse 2',
      measuresPerRow: 2,
      bars: [
        {
          chords: [
            { degree: '♭7 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 min7', chordName: 'A♭min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_j',
      label: 'Section J',
      measuresPerRow: 2,
      bars: [
        {
          chords: [
            { degree: '♭7 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 min7', chordName: 'A♭min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_k',
      label: 'Section K',
      measuresPerRow: 2,
      bars: [
        {
          chords: [
            { degree: '♭7 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 min7', chordName: 'A♭min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_e_2',
      label: 'Section E',
      measuresPerRow: 2,
      bars: [
        {
          chords: [
            { degree: '♭7 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [] },
      ],
    },
    {
      id: 'section_m',
      label: 'Section M',
      measuresPerRow: 2,
      bars: [
        {
          chords: [
            { degree: '♭7 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [] },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      measuresPerRow: 2,
      bars: [
        {
          chords: [
            { degree: '♭7 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [] },
      ],
    },
    {
      id: 'section_o',
      label: 'Section O',
      measuresPerRow: 2,
      bars: [
        {
          chords: [{ degree: '♭5 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        { chords: [] },
      ],
    },
    {
      id: 'section_p',
      label: 'Section P',
      measuresPerRow: 2,
      bars: [
        {
          chords: [
            { degree: '♭7 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [] },
      ],
    },
    {
      id: 'section_q',
      label: 'Section Q',
      measuresPerRow: 2,
      bars: [
        {
          chords: [{ degree: '♭5 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        { chords: [] },
      ],
    },
    {
      id: 'section_g',
      label: 'Section G',
      bars: [
        {
          chords: [
            { degree: '4 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭5 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭5 maj/♭6', chordName: 'B/D♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭5 maj/6', chordName: 'B/D', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_s',
      label: 'Section S',
      measuresPerRow: 2,
      bars: [
        {
          chords: [
            { degree: '♭7 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [] },
      ],
    },
    {
      id: 'section_h_2',
      label: 'Section H',
      measuresPerRow: 2,
      bars: [
        {
          chords: [
            { degree: '♭7 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 min7', chordName: 'A♭min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_u',
      label: 'Section U',
      measuresPerRow: 2,
      bars: [
        {
          chords: [
            { degree: '♭7 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 min7', chordName: 'A♭min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_i',
      label: 'Section I',
      measuresPerRow: 3,
      bars: [
        {
          chords: [
            { degree: '♭7 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 min7', chordName: 'A♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 7', chordName: 'D♭7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_w',
      label: 'Section W',
      measuresPerRow: 2,
      repeatCount: 4,
      bars: [
        {
          chords: [
            { degree: '♭7 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 min7', chordName: 'A♭min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_j_2',
      label: 'Section J',
      measuresPerRow: 2,
      bars: [
        {
          chords: [
            { degree: '♭7 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 min7', chordName: 'A♭min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_y',
      label: 'Section Y',
      measuresPerRow: 2,
      bars: [
        {
          chords: [
            { degree: '♭7 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 min7', chordName: 'A♭min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=1qJU8G7gR_g' },
  ],
  artistImageSource: 'commissioned',

  artistImageRef: '/artists/etta-james.webp',
  popularity: 50,
};
