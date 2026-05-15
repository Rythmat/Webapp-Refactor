import type { Song } from '@/curriculum/types/songLibrary';

export const i_believe_in_a_thing_called_love: Song = {
  id: 'i_believe_in_a_thing_called_love',
  title: 'I Believe In A Thing Called Love',
  artist: 'The Darkness',
  year: 2002,
  historicalDescription:
    "The Darkness release 'I Believe In A Thing Called Love', a shameless, falsetto-drenched love letter to 1970s glam rock and arena rock excess. At a time when post-grunge earnestness dominates rock radio, the Suffolk band's bombastic guitars and Justin Hawkins' soaring screams feel both ridiculous and completely genuine — and the world loves them for it. The song becomes a global hit, briefly making glam rock cool again.",
  key: 'F♯ minor',
  keyRoot: 66,
  mode: 'minor',
  tempo: 128,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['glam_rock'],
  techniques: [],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      measuresPerRow: 7,
      bars: [
        { chords: [], restBars: 4 },
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '3 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      measuresPerRow: 6,
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '3 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_c',
      label: 'Section C',
      measuresPerRow: 6,
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '3 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      measuresPerRow: 6,
      bars: [
        { chords: [{ degree: '7 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '7 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      bars: [
        { chords: [{ degree: '7 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '♯3 maj', chordName: 'A♯', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      measuresPerRow: 8,
      bars: [
        { chords: [{ degree: '7 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_g',
      label: 'Section G',
      measuresPerRow: 6,
      bars: [
        { chords: [{ degree: '7 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '6 maj', chordName: 'D', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      measuresPerRow: 6,
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '3 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_i',
      label: 'Section I',
      measuresPerRow: 6,
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '3 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_j',
      label: 'Section J',
      measuresPerRow: 6,
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '3 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_e_2',
      label: 'Section E',
      measuresPerRow: 6,
      bars: [
        { chords: [{ degree: '7 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '7 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_l',
      label: 'Section L',
      bars: [
        { chords: [{ degree: '7 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '♯3 maj', chordName: 'A♯', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      measuresPerRow: 8,
      bars: [
        { chords: [{ degree: '7 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_n',
      label: 'Section N',
      measuresPerRow: 6,
      bars: [
        { chords: [{ degree: '7 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '6 maj', chordName: 'D', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_g_2',
      label: 'Section G',
      measuresPerRow: 6,
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '3 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_p',
      label: 'Section P',
      measuresPerRow: 6,
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '3 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_h',
      label: 'Section H',
      measuresPerRow: 6,
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '3 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_r',
      label: 'Section R',
      measuresPerRow: 6,
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '3 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_i_2',
      label: 'Section I',
      measuresPerRow: 6,
      bars: [
        { chords: [{ degree: '7 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '7 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_t',
      label: 'Section T',
      bars: [
        { chords: [{ degree: '7 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '♯3 maj', chordName: 'A♯', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_j_2',
      label: 'Section J',
      measuresPerRow: 5,
      bars: [
        { chords: [], restBars: 6 },
        {
          chords: [
            { degree: '5 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '6 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 maj', chordName: 'D', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_k',
      label: 'Section K',
      measuresPerRow: 8,
      repeatCount: 4,
      bars: [
        { chords: [{ degree: '7 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_l_2',
      label: 'Section L',
      bars: [
        { chords: [{ degree: '7 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '7 maj', chordName: 'E', beat: 1, duration: 4 }],
          fermata: true,
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=tKjZuykKY1I' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
