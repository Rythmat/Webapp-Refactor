import type { Song } from '@/curriculum/types/songLibrary';

export const just_like_a_woman: Song = {
  id: 'just_like_a_woman',
  title: 'Just Like A Woman',
  artist: 'Bob Dylan',
  year: 1966,
  historicalDescription:
    "Bob Dylan releases 'Just Like a Woman' in 1966, a song that captures his transition from protest folk to a more personal, poetic style. With its tender melody and cryptic imagery, it becomes one of his most debated and celebrated compositions — a portrait of vulnerability wrapped in ambiguity that defines the emotional depth of his mid-60s golden period.",
  key: 'E major',
  keyRoot: 64,
  mode: 'major',
  tempo: 76,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['folk'],
  techniques: [],

  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'B7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'B7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'B7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'B7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'B7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'B7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 1 },
            { degree: '1 maj/3', chordName: 'E/G♯', beat: 2, duration: 1 },
            { degree: '2 min7', chordName: 'F♯min7', beat: 3, duration: 1 },
            { degree: '1 maj', chordName: 'E', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'B7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 1 },
            { degree: '4 maj', chordName: 'A', beat: 2, duration: 1 },
            { degree: '5 dom7', chordName: 'B7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'B/D♯', beat: 1, duration: 1 },
            {
              degree: '2 min7/6',
              chordName: 'F♯min7/C♯',
              beat: 2,
              duration: 1,
            },
            { degree: '4 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'B/D♯', beat: 1, duration: 1 },
            {
              degree: '2 min7/6',
              chordName: 'F♯min7/C♯',
              beat: 2,
              duration: 1,
            },
            { degree: '4 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'B/D♯', beat: 1, duration: 1 },
            {
              degree: '2 min7/6',
              chordName: 'F♯min7/C♯',
              beat: 2,
              duration: 1,
            },
            { degree: '4 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [{ degree: '5 dom7', chordName: 'B7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 1 },
            { degree: '1 maj', chordName: 'E', beat: 2, duration: 1 },
            { degree: '4 maj', chordName: 'A', beat: 3, duration: 1 },
            { degree: '5 maj', chordName: 'B', beat: 4, duration: 1 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 dom7', chordName: 'G♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 dom7', chordName: 'G♯7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 dom7', chordName: 'G♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 dom7', chordName: 'G♯7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '5 dom7', chordName: 'B7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_4',
      label: 'Verse 4',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'B7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'B7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'B7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'B7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 1 },
            { degree: '1 maj/3', chordName: 'E/G♯', beat: 2, duration: 1 },
            { degree: '2 min7', chordName: 'F♯min7', beat: 3, duration: 1 },
            { degree: '1 maj', chordName: 'E', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'B7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_5',
      label: 'Verse 5',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 1 },
            { degree: '4 maj', chordName: 'A', beat: 2, duration: 1 },
            { degree: '5 dom7', chordName: 'B7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'B/D♯', beat: 1, duration: 1 },
            {
              degree: '2 min7/6',
              chordName: 'F♯min7/C♯',
              beat: 2,
              duration: 1,
            },
            { degree: '4 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse_6',
      label: 'Verse 6',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'B/D♯', beat: 1, duration: 1 },
            {
              degree: '2 min7/6',
              chordName: 'F♯min7/C♯',
              beat: 2,
              duration: 1,
            },
            { degree: '4 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'B/D♯', beat: 1, duration: 1 },
            {
              degree: '2 min7/6',
              chordName: 'F♯min7/C♯',
              beat: 2,
              duration: 1,
            },
            { degree: '4 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        {
          chords: [{ degree: '5 dom7', chordName: 'B7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 1 },
            { degree: '1 maj', chordName: 'E', beat: 2, duration: 1 },
            { degree: '4 maj', chordName: 'A', beat: 3, duration: 1 },
            { degree: '5 maj', chordName: 'B', beat: 4, duration: 1 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }],
          fermata: true,
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=dRLXZVojdhQ' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/bob-dylan.webp',
  popularity: 50,
};
