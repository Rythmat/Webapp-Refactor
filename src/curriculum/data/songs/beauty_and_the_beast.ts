import type { Song } from '@/curriculum/types/songLibrary';

export const beauty_and_the_beast: Song = {
  id: 'beauty_and_the_beast',
  title: 'Beauty And The Beast',
  artist: 'David Bowie',
  year: 1978,
  historicalDescription:
    "David Bowie releases 'Beauty and the Beast' as the opening track of 'Heroes', a record born from his time in divided Berlin. The song captures the fractured, art-rock energy of his celebrated Berlin Trilogy — a period of radical reinvention that reshapes what rock music can be. Its jagged rhythm and split vocal personality embody the duality running through Bowie's most experimental years.",
  key: 'A minor',
  keyRoot: 69,
  mode: 'minor',
  tempo: 124,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['rock'],
  techniques: [],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      measuresPerRow: 5,
      bars: [
        { chords: [], restBars: 4 },
        {
          chords: [
            { degree: '5 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '7 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_b',
      label: 'Section B',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      bars: [
        { chords: [{ degree: '3 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 7', chordName: 'C7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      bars: [
        { chords: [{ degree: '3 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 7', chordName: 'C7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_g',
      label: 'Section G',
      measuresPerRow: 8,
      bars: [
        {
          chords: [
            { degree: '♯6 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯6 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/♯7', chordName: 'E/G♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/♯7', chordName: 'E/G♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 dim7', chordName: 'Gdim7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 dim7', chordName: 'Gdim7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♯7 maj', chordName: 'G♯', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♯7 maj', chordName: 'G♯', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      measuresPerRow: 6,
      bars: [
        {
          chords: [
            { degree: '♯3 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/2', chordName: 'E/B', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♯6 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/2', chordName: 'E/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯3 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_i',
      label: 'Section I',
      measuresPerRow: 6,
      bars: [
        {
          chords: [{ degree: '♯6 7', chordName: 'F♯7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 maj/♯7', chordName: 'E/G♯', beat: 1, duration: 1 },
            { degree: '1 min7', chordName: 'Amin7', beat: 2, duration: 1 },
            { degree: '♯6 7/♭2', chordName: 'F♯7/A♯', beat: 3, duration: 1 },
            { degree: '1 maj', chordName: 'A', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/2', chordName: 'E/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/2', chordName: 'E/B', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '3 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 7', chordName: 'C7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_j',
      label: 'Section J',
      measuresPerRow: 8,
      bars: [
        {
          chords: [
            { degree: '♯6 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯6 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 dim7', chordName: 'Gdim7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 dim7', chordName: 'Gdim7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/2', chordName: 'E/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/2', chordName: 'E/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/2', chordName: 'A/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/2', chordName: 'A/B', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_g_2',
      label: 'Section G',
      measuresPerRow: 8,
      bars: [
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 7/4', chordName: 'E7/D', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♯6 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/2', chordName: 'E/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯3 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♯6 7', chordName: 'F♯7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 maj/♯7', chordName: 'E/G♯', beat: 1, duration: 1 },
            { degree: '1 min7', chordName: 'Amin7', beat: 2, duration: 1 },
            { degree: '♯6 7/♭2', chordName: 'F♯7/A♯', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_l',
      label: 'Section L',
      measuresPerRow: 8,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj/2', chordName: 'E/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/2', chordName: 'E/B', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '3 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 7', chordName: 'C7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♯6 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯6 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=ZJNL8vVGlAM' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
