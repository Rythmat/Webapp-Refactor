import type { Song } from '@/curriculum/types/songLibrary';

export const take_on_me: Song = {
  id: 'take_on_me',
  title: 'Take On Me',
  artist: 'A-ha',
  year: 1984,
  historicalDescription:
    "Norwegian trio A-ha releases 'Take On Me', a synth-pop anthem that initially struggles to find an audience before a landmark rotoscope music video transforms it into a global phenomenon. The song's soaring falsetto hook and cascading synthesizer riff become defining sounds of 1980s pop — proof that a band from Oslo could conquer the world with the right melody and the right image.",
  key: 'B minor',
  keyRoot: 71,
  mode: 'minor',
  tempo: 168,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['pop', 'rock'],
  techniques: [],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      measuresPerRow: 1,
      bars: [{ chords: [], restBars: 8 }],
    },
    {
      id: 'section_b',
      label: 'Section B',
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
      id: 'verse',
      label: 'Verse',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 maj', chordName: 'D', beat: 1, duration: 2 },
            { degree: '2 min7', chordName: 'C♯min7', beat: 3, duration: 2 },
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
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 7', chordName: 'E7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 maj', chordName: 'D', beat: 1, duration: 2 },
            { degree: '2 min7', chordName: 'C♯min7', beat: 3, duration: 2 },
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
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 maj', chordName: 'D', beat: 1, duration: 2 },
            { degree: '2 min7', chordName: 'C♯min7', beat: 3, duration: 2 },
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
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '3 maj', chordName: 'D', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        { chords: [{ degree: '7 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            {
              degree: '2 min7/♯6',
              chordName: 'C♯min7/G♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '3 maj', chordName: 'D', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_i',
      label: 'Section I',
      bars: [
        { chords: [{ degree: '7 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            {
              degree: '2 min7/♯6',
              chordName: 'C♯min7/G♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '3 maj', chordName: 'D', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        { chords: [{ degree: '7 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            {
              degree: '2 min7/♯6',
              chordName: 'C♯min7/G♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '3 maj', chordName: 'D', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_k',
      label: 'Section K',
      bars: [
        { chords: [{ degree: '7 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            {
              degree: '2 min7/♯6',
              chordName: 'C♯min7/G♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
        { chords: [{ degree: '3 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '6 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_m',
      label: 'Section M',
      measuresPerRow: 5,
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
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [], restBars: 4 },
      ],
    },
    {
      id: 'section_f_2',
      label: 'Section F',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 maj', chordName: 'D', beat: 1, duration: 2 },
            { degree: '2 min7', chordName: 'C♯min7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_o',
      label: 'Section O',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 7', chordName: 'E7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_g_2',
      label: 'Section G',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 maj', chordName: 'D', beat: 1, duration: 2 },
            { degree: '2 min7', chordName: 'C♯min7', beat: 3, duration: 2 },
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
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 maj', chordName: 'D', beat: 1, duration: 2 },
            { degree: '2 min7', chordName: 'C♯min7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_r',
      label: 'Section R',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '3 maj', chordName: 'D', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_h',
      label: 'Section H',
      bars: [
        { chords: [{ degree: '7 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            {
              degree: '2 min7/♯6',
              chordName: 'C♯min7/G♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '3 maj', chordName: 'D', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_t',
      label: 'Section T',
      bars: [
        { chords: [{ degree: '7 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            {
              degree: '2 min7/♯6',
              chordName: 'C♯min7/G♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '3 maj', chordName: 'D', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_u',
      label: 'Section U',
      bars: [
        { chords: [{ degree: '7 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            {
              degree: '2 min7/♯6',
              chordName: 'C♯min7/G♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '3 maj', chordName: 'D', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_i_2',
      label: 'Section I',
      bars: [
        { chords: [{ degree: '7 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            {
              degree: '2 min7/♯6',
              chordName: 'C♯min7/G♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '3 maj', chordName: 'D', beat: 1, duration: 4 }] },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=djV11Xbc914' },
  ],
  artistImageSource: 'commissioned',

  artistImageRef: '/artists/a-ha.webp',
  popularity: 50,
};
