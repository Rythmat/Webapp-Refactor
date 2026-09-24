import type { Song } from '@/curriculum/types/songLibrary';

export const sir_duke: Song = {
  id: 'sir_duke',
  title: 'Sir Duke',
  artist: 'Stevie Wonder',
  year: 1976,
  historicalDescription:
    "Stevie Wonder records 'Sir Duke' as a jubilant tribute to Duke Ellington, weaving together jazz, funk, and soul into a celebration of music's power to move people. Released from his landmark album 'Songs in the Key of Life', the track honors the giants who shaped American music — Ellington, Basie, Ella, and Armstrong — while demonstrating that Wonder himself has joined their ranks.",
  key: 'B major',
  keyRoot: 71,
  mode: 'major',
  tempo: 109,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['funk'],
  techniques: [],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [
        { chords: [], restBars: 7 },
        { chords: [{ degree: '5 dom7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 dom7', chordName: 'F♯7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 dom7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 dom7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 dom7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♭5 dom7', chordName: 'F7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'pre_chorus_1',
      label: 'Pre-Chorus 1',
      bars: [
        {
          chords: [
            { degree: '4 dom7', chordName: 'E7', beat: 1, duration: 1 },
            { degree: '3 dom7', chordName: 'D♯7', beat: 2, duration: 1 },
            { degree: '♭3 dom7', chordName: 'D7', beat: 3, duration: 1 },
            { degree: '2 dom7', chordName: 'C♯7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '♭3 dom7', chordName: 'D7', beat: 1, duration: 1 },
            { degree: '3 dom7', chordName: 'D♯7', beat: 2, duration: 1 },
            { degree: '4 dom7', chordName: 'E7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'E7', beat: 1, duration: 1 },
            { degree: '3 dom7', chordName: 'D♯7', beat: 2, duration: 1 },
            { degree: '♭3 dom7', chordName: 'D7', beat: 3, duration: 1 },
            { degree: '2 dom7', chordName: 'C♯7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '♭3 dom7', chordName: 'D7', beat: 1, duration: 1 },
            { degree: '3 dom7', chordName: 'D♯7', beat: 2, duration: 1 },
            { degree: '4 dom7', chordName: 'E7', beat: 3, duration: 1 },
            { degree: '♭5 dom7', chordName: 'F7', beat: 4, duration: 1 },
            { degree: '5 dom7', chordName: 'F♯7', beat: 4, duration: 1 },
          ],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭5 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭5 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'B/D♯', beat: 1, duration: 1 },
            { degree: '2 min7', chordName: 'C♯min7', beat: 2, duration: 1 },
            { degree: '5 dom7', chordName: 'F♯7sus', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'F♯7sus', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭5 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭5 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'B/D♯', beat: 1, duration: 1 },
            { degree: '2 min7', chordName: 'C♯min7', beat: 2, duration: 1 },
            { degree: '5 dom7', chordName: 'F♯7sus', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'F♯7sus', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'interlude_1',
      label: 'Interlude 1',
      instrumental: true,
      bars: [
        { chords: [] },
        { chords: [] },
        { chords: [] },
        { chords: [] },
        { chords: [] },
        { chords: [] },
        { chords: [] },
        { chords: [] },
        { chords: [] },
        { chords: [] },
        { chords: [] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 dom7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 dom7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 dom7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♭5 dom7', chordName: 'F7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'pre_chorus_2',
      label: 'Pre-Chorus 2',
      bars: [
        {
          chords: [
            { degree: '4 dom7', chordName: 'E7', beat: 1, duration: 1 },
            { degree: '3 dom7', chordName: 'D♯7', beat: 2, duration: 1 },
            { degree: '♭3 dom7', chordName: 'D7', beat: 3, duration: 1 },
            { degree: '2 dom7', chordName: 'C♯7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '♭3 dom7', chordName: 'D7', beat: 1, duration: 1 },
            { degree: '3 dom7', chordName: 'D♯7', beat: 2, duration: 1 },
            { degree: '4 dom7', chordName: 'E7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'E7', beat: 1, duration: 1 },
            { degree: '3 dom7', chordName: 'D♯7', beat: 2, duration: 1 },
            { degree: '♭3 dom7', chordName: 'D7', beat: 3, duration: 1 },
            { degree: '2 dom7', chordName: 'C♯7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '♭3 dom7', chordName: 'D7', beat: 1, duration: 1 },
            { degree: '3 dom7', chordName: 'D♯7', beat: 2, duration: 1 },
            { degree: '4 dom7', chordName: 'E7', beat: 3, duration: 1 },
            { degree: '♭5 dom7', chordName: 'F7', beat: 4, duration: 1 },
            { degree: '5 dom7', chordName: 'F♯7', beat: 4, duration: 1 },
          ],
        },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭5 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭5 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'B/D♯', beat: 1, duration: 1 },
            { degree: '2 min7', chordName: 'C♯min7', beat: 2, duration: 1 },
            { degree: '5 dom7', chordName: 'F♯7sus', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'F♯7sus', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭5 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭5 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'B/D♯', beat: 1, duration: 1 },
            { degree: '2 min7', chordName: 'C♯min7', beat: 2, duration: 1 },
            { degree: '5 dom7', chordName: 'F♯7sus', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'F♯7sus', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'interlude_2',
      label: 'Interlude 2',
      instrumental: true,
      bars: [
        { chords: [] },
        { chords: [] },
        { chords: [] },
        { chords: [] },
        { chords: [] },
        { chords: [] },
        { chords: [] },
        { chords: [] },
        { chords: [] },
        { chords: [] },
        { chords: [] },
      ],
    },
    {
      id: 'chorus_3',
      label: 'Chorus 3',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭5 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭5 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'B/D♯', beat: 1, duration: 1 },
            { degree: '2 min7', chordName: 'C♯min7', beat: 2, duration: 1 },
            { degree: '5 dom7', chordName: 'F♯7sus', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'F♯7sus', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭5 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭5 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'B/D♯', beat: 1, duration: 1 },
            { degree: '2 min7', chordName: 'C♯min7', beat: 2, duration: 1 },
            { degree: '5 dom7', chordName: 'F♯7sus', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'F♯7sus', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      instrumental: true,
      bars: [
        { chords: [] },
        { chords: [] },
        { chords: [] },
        { chords: [] },
        { chords: [] },
        { chords: [] },
        { chords: [] },
        { chords: [] },
        { chords: [] },
        { chords: [] },
        { chords: [] },
        { chords: [] },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=ETFvmkIA6S4' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/stevie-wonder.webp',
  popularity: 50,
};
