import type { Song } from '@/curriculum/types/songLibrary';

export const beautiful: Song = {
  id: 'beautiful',
  title: 'Beautiful',
  artist: 'Carole King',
  year: 1971,
  historicalDescription:
    "Carole King opens her landmark album 'Tapestry' with 'Beautiful', a quiet affirmation of self-worth that sets the emotional tone for one of the best-selling albums in history. In 1971, King steps out from behind the songwriting desk — where she had crafted hits for others for over a decade — and plants her own voice at the center of popular music. The song's gentle confidence resonates with a generation searching for exactly that.",
  key: 'E♭ major',
  keyRoot: 63,
  mode: 'major',
  tempo: 152,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['rock'],
  techniques: [],

  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'C min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/5', chordName: 'E♭/B♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'F min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/5', chordName: 'E♭/B♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'C min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '2 dom7', chordName: 'F7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'E♭/G', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 maj/5', chordName: 'E♭/B♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/5', chordName: 'E♭/B♭', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '♯5 dom7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♯5 dom7', chordName: 'B7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj/5', chordName: 'E♭/B♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '1 dim7/5',
              chordName: 'E♭dim7/B♭',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [
            { degree: '4 maj/5', chordName: 'A♭/B♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/5', chordName: 'A♭/B♭', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'C min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'C min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '6 min7/5',
              chordName: 'C min7/B♭',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [
            {
              degree: '6 min7/5',
              chordName: 'C min7/B♭',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [
            {
              degree: '6 min7/♯4',
              chordName: 'C min7/A',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [
            {
              degree: '6 min7/♯4',
              chordName: 'C min7/A',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'bridge_1',
      label: 'Bridge 1',
      bars: [
        { chords: [{ degree: '3 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '7 dom7', chordName: 'D7b9', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '7 dom7', chordName: 'D7b9', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '3 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'F min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'F min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'interlude_1',
      label: 'Interlude 1',
      instrumental: true,
      bars: [
        {
          chords: [
            { degree: '1 maj/3', chordName: 'E♭/G', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'E♭/G', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯2 dim7', chordName: 'F♯dim7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯2 dim7', chordName: 'F♯dim7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '3 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'C min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/5', chordName: 'E♭/B♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'F min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/5', chordName: 'E♭/B♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'C min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '2 dom7', chordName: 'F7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'E♭/G', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 maj/5', chordName: 'E♭/B♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/5', chordName: 'E♭/B♭', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '♯5 dom7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♯5 dom7', chordName: 'B7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj/5', chordName: 'E♭/B♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '1 dim7/5',
              chordName: 'E♭dim7/B♭',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [
            { degree: '4 maj/5', chordName: 'A♭/B♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/5', chordName: 'A♭/B♭', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'bridge_2',
      label: 'Bridge 2',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj6', chordName: 'D♭6', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj6', chordName: 'D♭6', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 maj/6', chordName: 'A♭/C', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/6', chordName: 'A♭/C', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'E♭/G', beat: 1, duration: 2 },
            { degree: '2 min7', chordName: 'F min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'E♭/G', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'E♭/G', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '♯5 dom7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♯5 dom7', chordName: 'B7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_4',
      label: 'Verse 4',
      bars: [
        {
          chords: [
            { degree: '♯6 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯6 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '♯6 min7/♯5',
              chordName: 'C♯min7/B',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [
            {
              degree: '♯6 min7/♯5',
              chordName: 'C♯min7/B',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [
            {
              degree: '♯6 min7/5',
              chordName: 'C♯min7/A♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [
            {
              degree: '♯6 min7/5',
              chordName: 'C♯min7/A♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [{ degree: '♯4 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♯4 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'bridge_3',
      label: 'Bridge 3',
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'G♯', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'G♯', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'D♯7b9', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'D♯7b9', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'G♯', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'G♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♯2 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯2 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'interlude_2',
      label: 'Interlude 2',
      instrumental: true,
      bars: [
        {
          chords: [
            { degree: '♯1 maj/4', chordName: 'E/G♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯1 maj/4', chordName: 'E/G♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 dim7', chordName: 'Gdim7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 dim7', chordName: 'Gdim7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'G♯', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'G♯', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'G♯', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'G♯', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_5',
      label: 'Verse 5',
      bars: [
        {
          chords: [
            { degree: '♯6 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯6 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯1 maj/♯5', chordName: 'E/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯1 maj/♯5', chordName: 'E/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♯4 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♯4 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♯2 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯2 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯1 maj/♯5', chordName: 'E/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯1 maj/♯5', chordName: 'E/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯6 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯6 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'chorus_3',
      label: 'Chorus 3',
      bars: [
        {
          chords: [{ degree: '♯2 dom7', chordName: 'F♯7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♯1 maj/4', chordName: 'E/G♯', beat: 1, duration: 1 },
            { degree: '♯4 min7', chordName: 'Amin7', beat: 2, duration: 1 },
            { degree: '♯2 dom7/5', chordName: 'F♯7/A♯', beat: 3, duration: 1 },
            { degree: '♯4 maj', chordName: 'A', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '♯1 maj/♯5', chordName: 'E/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯1 maj/♯5', chordName: 'E/B', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '6 dom7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 dom7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 dom7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 dom7', chordName: 'C7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge_4',
      label: 'Bridge 4',
      bars: [
        {
          chords: [
            { degree: '♯2 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯2 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 dim7', chordName: 'Gdim7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 dim7', chordName: 'Gdim7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯1 maj/♯5', chordName: 'E/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯1 maj/♯5', chordName: 'E/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯4 maj/♯5', chordName: 'A/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯4 maj/♯5', chordName: 'A/B', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_6',
      label: 'Verse 6',
      bars: [
        {
          chords: [{ degree: '♯1 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♯1 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♯1 dom7/7', chordName: 'E7/D', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯1 dom7/7', chordName: 'E7/D', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♯4 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♯4 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♯2 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯2 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯1 maj/♯5', chordName: 'E/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯6 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♯2 dom7', chordName: 'F♯7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♯1 maj/4', chordName: 'E/G♯', beat: 1, duration: 1 },
            { degree: '♯4 min7', chordName: 'Amin7', beat: 2, duration: 1 },
            { degree: '♯2 dom7/5', chordName: 'F♯7/A♯', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        {
          chords: [{ degree: '♯4 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♯4 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♯1 maj/♯5', chordName: 'E/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯1 maj/♯5', chordName: 'E/B', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '6 dom7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 dom7', chordName: 'C7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♯2 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=dj4A62pJ1Vs' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/carole-king.webp',
  popularity: 50,
};
