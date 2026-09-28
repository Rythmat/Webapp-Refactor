import type { Song } from '@/curriculum/types/songLibrary';

export const i_feel_for_you: Song = {
  id: 'i_feel_for_you',
  title: 'I Feel For You',
  artist: 'Prince',
  year: 1979,
  historicalDescription:
    "Prince writes and records 'I Feel For You', a sleek funk-pop gem that will take on a life far beyond its author. Chaka Khan's 1984 cover — featuring a Stevie Wonder harmonica intro and a Melle Mel rap — becomes a landmark crossover hit, carrying Prince's songwriting genius from Minneapolis to the global pop mainstream.",
  key: 'F♯ major',
  keyRoot: 66,
  mode: 'major',
  tempo: 122,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['funk', 'pop'],
  techniques: [],

  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [
            { degree: '1 dom7', chordName: 'F♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'B', beat: 1, duration: 2 },
            { degree: '1 maj/3', chordName: 'F♯/A♯', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'G♯min7', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'C♯7sus', beat: 3, duration: 2 },
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
            { degree: '1 dom7', chordName: 'F♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'B', beat: 1, duration: 2 },
            { degree: '1 maj/3', chordName: 'F♯/A♯', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'G♯min7', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'C♯7sus', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'C♯7sus', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
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
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [
            { degree: '1 dom7', chordName: 'F♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'B', beat: 1, duration: 2 },
            { degree: '1 maj/3', chordName: 'F♯/A♯', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'G♯min7', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'C♯7sus', beat: 3, duration: 2 },
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
            { degree: '1 dom7', chordName: 'F♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'B', beat: 1, duration: 2 },
            { degree: '1 maj/3', chordName: 'F♯/A♯', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'G♯min7', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'C♯7sus', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'C♯7sus', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        {
          chords: [
            { degree: '1 dom7', chordName: 'F♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 dom7', chordName: 'E7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 dom7', chordName: 'E7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 dom7', chordName: 'E7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 dom7', chordName: 'E7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_4',
      label: 'Verse 4',
      bars: [
        {
          chords: [
            { degree: '1 dom7', chordName: 'F♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'B', beat: 1, duration: 2 },
            { degree: '1 maj/3', chordName: 'F♯/A♯', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'G♯min7', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'C♯7sus', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'chorus_3',
      label: 'Chorus 3',
      bars: [
        {
          chords: [
            { degree: '1 dom7', chordName: 'F♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'B', beat: 1, duration: 2 },
            { degree: '1 maj/3', chordName: 'F♯/A♯', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'G♯min7', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'C♯7sus', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'C♯7sus', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_5',
      label: 'Verse 5',
      bars: [
        {
          chords: [
            { degree: '1 dom7', chordName: 'F♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 dom7', chordName: 'E7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 dom7', chordName: 'E7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=MEtx6L4U9rI' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/prince.webp',
  popularity: 50,
};
