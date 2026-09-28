import type { Song } from '@/curriculum/types/songLibrary';

export const as: Song = {
  id: 'as',
  title: 'As',
  artist: 'Stevie Wonder',
  year: 1976,
  historicalDescription:
    "Stevie Wonder releases 'As' as part of his landmark double album 'Songs in the Key of Life', a sweeping declaration of unconditional love built on a churning funk groove and gospel-soaked joy. The song becomes one of Wonder's most beloved deep cuts — a near-eight-minute meditation that showcases his genius for fusing soul, funk, and spiritual euphoria into something timeless. Decades later it endures as a standard, covered and sampled across generations.",
  key: 'B major',
  keyRoot: 71,
  mode: 'major',
  tempo: 100,
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
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 dom7', chordName: 'B7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 dom7', chordName: 'B7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 dom7', chordName: 'B7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 dom7', chordName: 'B7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 1 },
            { degree: '7 min7', chordName: 'A♯min7', beat: 2, duration: 1 },
            { degree: '3 maj', chordName: 'D♯', beat: 3, duration: 1 },
            { degree: '6 min7', chordName: 'G♯min7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'C♯min7', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'F♯7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 dom7', chordName: 'B7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 dom7', chordName: 'B7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 2 },
            { degree: '7 min7', chordName: 'A♯min7', beat: 3, duration: 1 },
            { degree: '3 maj', chordName: 'D♯', beat: 4, duration: 1 },
          ],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 2 },
            { degree: '7 min7', chordName: 'A♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'B', beat: 1, duration: 2 },
            { degree: '2 maj', chordName: 'C♯', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 2 },
            { degree: '7 min7', chordName: 'A♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'B', beat: 1, duration: 2 },
            { degree: '2 maj', chordName: 'C♯', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 2 },
            { degree: '7 min7', chordName: 'A♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'B', beat: 1, duration: 2 },
            { degree: '2 maj', chordName: 'C♯', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 2 },
            { degree: '7 min7', chordName: 'A♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'B', beat: 1, duration: 2 },
            { degree: '♭5 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭3 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 maj', chordName: 'D♯', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'F♯', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 dom7', chordName: 'B7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 dom7', chordName: 'B7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 1 },
            { degree: '7 min7', chordName: 'A♯min7', beat: 2, duration: 1 },
            { degree: '3 maj', chordName: 'D♯', beat: 3, duration: 1 },
            { degree: '6 min7', chordName: 'G♯min7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'C♯min7', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'F♯7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse_4',
      label: 'Verse 4',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 dom7', chordName: 'B7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 dom7', chordName: 'B7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 2 },
            { degree: '7 min7', chordName: 'A♯min7', beat: 3, duration: 1 },
            { degree: '3 maj', chordName: 'D♯', beat: 4, duration: 1 },
          ],
        },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 2 },
            { degree: '7 min7', chordName: 'A♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'B', beat: 1, duration: 2 },
            { degree: '2 maj', chordName: 'C♯', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 2 },
            { degree: '7 min7', chordName: 'A♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'B', beat: 1, duration: 2 },
            { degree: '2 maj', chordName: 'C♯', beat: 3, duration: 2 },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=GYQfWJNWe3I' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/stevie-wonder.webp',
  popularity: 50,
};
