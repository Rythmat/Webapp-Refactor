import type { Song } from '@/curriculum/types/songLibrary';

export const shut_up_and_dance: Song = {
  id: 'shut_up_and_dance',
  title: 'Shut Up And Dance',
  artist: 'Walk The Moon',
  year: 2014,
  historicalDescription:
    "Walk The Moon releases 'Shut Up And Dance', a euphoric pop-rock anthem that captures the carefree energy of a perfect night out. Its irresistible new wave-influenced hooks and sing-along chorus turn it into an unexpected global smash, dominating radio and playlists in 2014 and cementing the Cincinnati band's place in mainstream pop consciousness.",
  key: 'D♭ major',
  keyRoot: 61,
  mode: 'major',
  tempo: 128,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['pop', 'rock'],
  techniques: [],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      bars: [
        { chords: [], restBars: 2 },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A♭', beat: 3, duration: 2 },
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
            { degree: '4 maj', chordName: 'G♭', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'G♭', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [
            { degree: '1 maj/3', chordName: 'D♭/F', beat: 1, duration: 2 },
            {
              degree: '2 min7/4',
              chordName: 'E♭min7/G♭',
              beat: 3,
              duration: 2,
            },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'D♭', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'D♭/F', beat: 1, duration: 2 },
            {
              degree: '2 min7/4',
              chordName: 'E♭min7/G♭',
              beat: 3,
              duration: 2,
            },
          ],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'pre_chorus',
      label: 'Pre-Chorus',
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'D♭', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'G♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'D♭', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'G♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'G♭', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A♭', beat: 3, duration: 2 },
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
            { degree: '4 maj', chordName: 'G♭', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'G♭', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A♭', beat: 3, duration: 2 },
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
            { degree: '1 maj/3', chordName: 'D♭/F', beat: 1, duration: 2 },
            {
              degree: '2 min7/4',
              chordName: 'E♭min7/G♭',
              beat: 3,
              duration: 2,
            },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'D♭', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'D♭/F', beat: 1, duration: 2 },
            {
              degree: '2 min7/4',
              chordName: 'E♭min7/G♭',
              beat: 3,
              duration: 2,
            },
          ],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'D♭', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'G♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'D♭', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'G♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'D♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'G♭', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'D♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'G♭', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'D♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'G♭', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'D♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'G♭', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A♭', beat: 3, duration: 2 },
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
            { degree: '1 maj/3', chordName: 'D♭/F', beat: 1, duration: 2 },
            {
              degree: '2 min7/4',
              chordName: 'E♭min7/G♭',
              beat: 3,
              duration: 2,
            },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'D♭', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'D♭/F', beat: 1, duration: 2 },
            {
              degree: '2 min7/4',
              chordName: 'E♭min7/G♭',
              beat: 3,
              duration: 2,
            },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'D♭', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A♭', beat: 3, duration: 2 },
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
            { degree: '1 maj/3', chordName: 'D♭/F', beat: 1, duration: 2 },
            {
              degree: '2 min7/4',
              chordName: 'E♭min7/G♭',
              beat: 3,
              duration: 2,
            },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'D♭', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'D♭/F', beat: 1, duration: 2 },
            {
              degree: '2 min7/4',
              chordName: 'E♭min7/G♭',
              beat: 3,
              duration: 2,
            },
          ],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_5',
      label: 'Verse 5',
      bars: [
        { chords: [], restBars: 4 },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        { chords: [] },
        {
          chords: [
            { degree: '1 maj', chordName: 'D♭', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'G♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'D♭', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'G♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=6JCLY0Rlx6Q' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/walk-the-moon.webp',
  popularity: 50,
};
