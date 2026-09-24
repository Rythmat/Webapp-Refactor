import type { Song } from '@/curriculum/types/songLibrary';

export const new_york_new_york: Song = {
  id: 'new_york_new_york',
  title: 'New York, New York',
  artist: 'Frank Sinatra',
  year: 1980,
  historicalDescription:
    "Frank Sinatra releases 'New York, New York', a sweeping ode to ambition and reinvention that becomes his signature anthem in the final chapter of his career. Written by John Kander and Fred Ebb, the song transforms a theme from the 1977 Martin Scorsese film into something far larger — a rallying cry for the city itself. Sinatra's recording becomes the unofficial anthem of New York, played at Madison Square Garden and Yankee Stadium after every home game.",
  key: 'D major',
  keyRoot: 62,
  mode: 'major',
  tempo: 108,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['jazz'],
  techniques: [],

  sections: [
    {
      id: 'section_a',
      label: 'Section A',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'A7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'A7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'A7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'A7', beat: 3, duration: 2 },
          ],
        },
        { chords: [] },
        { chords: [] },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'A7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'A7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'A7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'A7', beat: 3, duration: 2 },
          ],
        },
        { chords: [] },
        { chords: [] },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'A7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'A7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [] },
        { chords: [] },
        { chords: [] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '6 7', chordName: 'B7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'A7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'A7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [] },
        { chords: [] },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/5', chordName: 'D/A', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '6 7', chordName: 'B7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 2 },
            { degree: '3 min7', chordName: 'F♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'A7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_g',
      label: 'Section G',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        { chords: [] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'A7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭6 7', chordName: 'B♭7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      bars: [
        {
          chords: [{ degree: '♭2 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        { chords: [] },
        {
          chords: [{ degree: '♭2 7', chordName: 'E♭7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭5 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭5 min7', chordName: 'A♭min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [] },
      ],
    },
    {
      id: 'section_i',
      label: 'Section I',
      bars: [
        {
          chords: [{ degree: '♭2 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        { chords: [] },
        {
          chords: [
            { degree: '4 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '♭7 7', chordName: 'C7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '6 7', chordName: 'B7', beat: 1, duration: 4 }],
          fermata: true,
        },
        {
          chords: [{ degree: '♭6 7', chordName: 'B♭7', beat: 1, duration: 4 }],
          fermata: true,
        },
        { chords: [] },
      ],
    },
    {
      id: 'section_g_2',
      label: 'Section G',
      bars: [
        {
          chords: [{ degree: '♭2 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭3 min7', chordName: 'Fmin7', beat: 1, duration: 2 },
            { degree: '♭6 7', chordName: 'B♭7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '♭2 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭3 min7', chordName: 'Fmin7', beat: 1, duration: 2 },
            { degree: '♭6 7', chordName: 'B♭7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '♭2 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        { chords: [] },
      ],
    },
    {
      id: 'section_k',
      label: 'Section K',
      bars: [
        {
          chords: [
            { degree: '♭6 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭2 7', chordName: 'E♭7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭5 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭5 min7', chordName: 'A♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '♭7 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [] },
      ],
    },
    {
      id: 'section_h',
      label: 'Section H',
      bars: [
        {
          chords: [
            { degree: '♭3 min7', chordName: 'Fmin7', beat: 1, duration: 2 },
            { degree: '4 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭5 maj', chordName: 'A♭', beat: 1, duration: 2 },
            { degree: '♭6 7', chordName: 'B♭7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '♭2 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        { chords: [] },
        {
          chords: [
            { degree: '♭3 min7', chordName: 'Fmin7', beat: 1, duration: 2 },
            { degree: '♭6 7', chordName: 'B♭7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '2 7', chordName: 'E7', beat: 1, duration: 4 }],
          fermata: true,
        },
        {
          chords: [{ degree: '♭2 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        { chords: [] },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=le1QF3uoQNg' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/frank-sinatra.webp',
  popularity: 50,
};
