import type { Song } from '@/curriculum/types/songLibrary';

export const i_feel_for_you: Song = {
  id: 'i_feel_for_you',
  title: 'I Feel For You',
  artist: 'Prince',
  year: 2019,
  historicalDescription:
    "Prince writes and records 'I Feel For You', a sleek funk-pop gem that will take on a life far beyond its author. Chaka Khan's 1984 cover — featuring a Stevie Wonder harmonica intro and a Melle Mel rap — becomes a landmark crossover hit, carrying Prince's songwriting genius from Minneapolis to the global pop mainstream.",
  key: 'F♯ major',
  keyRoot: 66,
  mode: 'major',
  tempo: 122,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['funky_pop'],
  techniques: [],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj', chordName: 'B', beat: 1, duration: 2 },
            { degree: '1 maj/3', chordName: 'F♯/A♯', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'G♯min7', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'C♯7sus', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_b',
      label: 'Section B',
      measuresPerRow: 5,
      bars: [
        { chords: [{ degree: '1 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj', chordName: 'B', beat: 1, duration: 2 },
            { degree: '1 maj/3', chordName: 'F♯/A♯', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'G♯min7', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'C♯7sus', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 7', chordName: 'C♯7sus', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      measuresPerRow: 8,
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_d',
      label: 'Section D',
      measuresPerRow: 8,
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj', chordName: 'B', beat: 1, duration: 2 },
            { degree: '1 maj/3', chordName: 'F♯/A♯', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'G♯min7', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'C♯7sus', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      measuresPerRow: 5,
      bars: [
        { chords: [{ degree: '1 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj', chordName: 'B', beat: 1, duration: 2 },
            { degree: '1 maj/3', chordName: 'F♯/A♯', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'G♯min7', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'C♯7sus', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 7', chordName: 'C♯7sus', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♭7 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♭7 7', chordName: 'E7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_h',
      label: 'Section H',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♭7 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♭7 7', chordName: 'E7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj', chordName: 'B', beat: 1, duration: 2 },
            { degree: '1 maj/3', chordName: 'F♯/A♯', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'G♯min7', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'C♯7sus', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_j',
      label: 'Section J',
      measuresPerRow: 5,
      bars: [
        { chords: [{ degree: '1 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj', chordName: 'B', beat: 1, duration: 2 },
            { degree: '1 maj/3', chordName: 'F♯/A♯', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'G♯min7', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'C♯7sus', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 7', chordName: 'C♯7sus', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♭7 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♭7 7', chordName: 'E7', beat: 1, duration: 4 }] },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=MEtx6L4U9rI' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
