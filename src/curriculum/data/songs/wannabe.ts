import type { Song } from '@/curriculum/types/songLibrary';

export const wannabe: Song = {
  id: 'wannabe',
  title: 'Wannabe',
  artist: 'The Spice Girls',
  year: 1996,
  historicalDescription:
    "The Spice Girls burst onto the global stage with 'Wannabe', a brash, infectious debut that turns girl-group pop into a manifesto. The track rockets to number one in 37 countries, introducing 'Girl Power' as a cultural rallying cry for a generation. Five distinct personalities, one unstoppable hook — pop music would never look quite the same again.",
  key: 'B major',
  keyRoot: 71,
  mode: 'major',
  tempo: 116,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['pop'],
  techniques: [],

  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }],
          repeatStart: true,
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '7 maj', chordName: 'A♯', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭3 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '7 maj', chordName: 'A♯', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        {
          chords: [{ degree: '5 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '5 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }],
          repeatEnd: true,
        },
      ],
    },
    {
      id: 'pre_chorus_1',
      label: 'Pre-Chorus 1',
      bars: [
        {
          chords: [{ degree: '5 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '5 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_3',
      label: 'Chorus 2',
      bars: [
        {
          chords: [{ degree: '5 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '5 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 2',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭3 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '7 maj', chordName: 'A♯', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭3 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '7 maj', chordName: 'A♯', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'pre_chorus_2',
      label: 'Pre-Chorus 2',
      bars: [
        { chords: [] },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '5 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_4',
      label: 'Chorus 3',
      bars: [
        {
          chords: [{ degree: '5 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '5 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_4',
      label: 'Verse 3',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭3 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '7 maj', chordName: 'A♯', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭3 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '7 maj', chordName: 'A♯', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'pre_chorus_3',
      label: 'Pre-Chorus 3',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭3 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '7 maj', chordName: 'A♯', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭3 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus_5',
      label: 'Chorus 4',
      bars: [
        {
          chords: [{ degree: '5 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '5 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_5',
      label: 'Verse 4',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭3 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '7 maj', chordName: 'A♯', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭3 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '7 maj', chordName: 'A♯', beat: 3, duration: 2 },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=gJLIiF15wjQ' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/the-spice-girls.webp',
  popularity: 50,
};
