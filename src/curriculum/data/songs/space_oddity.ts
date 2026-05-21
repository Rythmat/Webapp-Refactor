import type { Song } from '@/curriculum/types/songLibrary';

export const space_oddity: Song = {
  id: 'space_oddity',
  title: 'Space Oddity',
  artist: 'David Bowie',
  year: 1969,
  historicalDescription:
    "David Bowie releases 'Space Oddity' in 1969, timed to capitalize on the world's fascination with the Apollo moon landing. The song introduces Major Tom, an astronaut adrift in space, blending folk, rock, and cinematic storytelling into something unlike anything in pop music. It marks the moment Bowie begins his transformation into one of rock's most theatrical and visionary artists.",
  key: 'F minor',
  keyRoot: 65,
  mode: 'minor',
  tempo: 72,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['rock'],
  techniques: [],

  sections: [
    {
      id: 'section_a',
      label: 'Section A',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♯7 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♯7 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♯7 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♯7 min7', chordName: 'Emin7', beat: 1, duration: 4 },
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
            { degree: '♯3 min7', chordName: 'Amin7', beat: 1, duration: 2 },
            { degree: '♯3 min7/2', chordName: 'Amin7/G', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♯6 maj/♭2', chordName: 'D/F♯', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♯7 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_d',
      label: 'Section D',
      bars: [
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♯7 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯3 min7', chordName: 'Amin7', beat: 1, duration: 2 },
            { degree: '♯3 min7/2', chordName: 'Amin7/G', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '♯6 maj', chordName: 'D', beat: 1, duration: 4 }],
          fermata: true,
        },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      bars: [
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♯7 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_g',
      label: 'Section G',
      measuresPerRow: 5,
      bars: [
        { chords: [{ degree: '♯7 7', chordName: 'E7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'Fmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      measuresPerRow: 6,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♯7 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♯7 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '♯3 min7', chordName: 'Amin7', beat: 2, duration: 2 },
            { degree: '2 maj', chordName: 'G', beat: 4, duration: 1 },
            { degree: '1 maj', chordName: 'F', beat: 5, duration: 1 },
          ],
        },
        { chords: [] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [
            { degree: '5 maj', chordName: 'C', beat: 1, duration: 1 },
            { degree: '1 maj', chordName: 'F', beat: 2, duration: 1 },
            { degree: '2 maj', chordName: 'G', beat: 3, duration: 1 },
            { degree: '♯3 maj', chordName: 'A', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'C', beat: 1, duration: 1 },
            { degree: '1 maj', chordName: 'F', beat: 2, duration: 1 },
            { degree: '2 maj', chordName: 'G', beat: 3, duration: 1 },
            { degree: '♯3 maj', chordName: 'A', beat: 4, duration: 1 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♯7 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_j',
      label: 'Section J',
      bars: [
        {
          chords: [{ degree: '♯3 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♯7 7', chordName: 'E7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♯7 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      measuresPerRow: 5,
      bars: [
        {
          chords: [
            { degree: '5 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '♯7 7', chordName: 'E7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'Fmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_f_2',
      label: 'Section F',
      measuresPerRow: 5,
      bars: [
        {
          chords: [
            { degree: '2 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '♯7 7', chordName: 'E7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♯3 min7', chordName: 'Amin7', beat: 1, duration: 2 },
            { degree: '♯3 min7/2', chordName: 'Amin7/G', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♯6 7/♭2', chordName: 'D7/F♯', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_m',
      label: 'Section M',
      measuresPerRow: 6,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♯7 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♯7 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '♯3 min7', chordName: 'Amin7', beat: 2, duration: 2 },
            { degree: '2 maj', chordName: 'G', beat: 4, duration: 1 },
            { degree: '1 maj', chordName: 'F', beat: 5, duration: 1 },
          ],
        },
        { chords: [] },
      ],
    },
    {
      id: 'section_g_2',
      label: 'Section G',
      bars: [
        {
          chords: [
            { degree: '5 maj', chordName: 'C', beat: 1, duration: 1 },
            { degree: '1 maj', chordName: 'F', beat: 2, duration: 1 },
            { degree: '2 maj', chordName: 'G', beat: 3, duration: 1 },
            { degree: '♯3 maj', chordName: 'A', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'C', beat: 1, duration: 1 },
            { degree: '1 maj', chordName: 'F', beat: 2, duration: 1 },
            { degree: '2 maj', chordName: 'G', beat: 3, duration: 1 },
            { degree: '♯3 maj', chordName: 'A', beat: 4, duration: 1 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♯7 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_o',
      label: 'Section O',
      bars: [
        {
          chords: [{ degree: '♯3 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♯7 7', chordName: 'E7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♯7 maj', chordName: 'E', beat: 1, duration: 4 }],
          fermata: true,
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=iYYRH4apXDo' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
