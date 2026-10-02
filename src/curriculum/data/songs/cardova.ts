import type { Song } from '@/curriculum/types/songLibrary';

export const cardova: Song = {
  id: 'cardova',
  title: 'Cardova',
  artist: 'The Meters',
  year: 1969,
  historicalDescription:
    "The Meters lay down 'Cardova' in New Orleans, a lean, hypnotic instrumental that showcases the band's revolutionary approach to funk — locking into a groove so tight it feels like a single organism breathing. As the house band for Josie Records, the Meters essentially define the New Orleans funk sound, stripping soul music down to its rhythmic core and influencing generations of producers, DJs, and musicians worldwide.",
  key: 'C major',
  keyRoot: 60,
  mode: 'major',
  tempo: 88,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['funk'],
  techniques: [],
  credits: [
    { name: 'Art Neville', role: 'songwriter', artistGlobeId: 'art-neville' },
    {
      name: 'Ziggy Modeliste',
      role: 'songwriter',
      artistGlobeId: 'ziggy-modeliste',
    },
    {
      name: 'Marshall E. Sehorn',
      role: 'producer',
      artistGlobeId: 'marshall-e-sehorn',
    },
    {
      name: 'George Porter, Jr.',
      role: 'songwriter',
      artistGlobeId: 'george-porter-jr',
    },
    {
      name: 'Allen Toussaint',
      role: 'producer',
      artistGlobeId: 'allen-toussaint',
    },
    {
      name: 'Leo Nocentelli',
      role: 'songwriter',
      artistGlobeId: 'leo-nocentelli',
    },
  ],
  releases: [{ releaseId: 'the-meters-the-meters' }],

  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [{ degree: '1 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        {
          chords: [{ degree: '1 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'B♭', beat: 1, duration: 2 },
            { degree: '4 dom7', chordName: 'F7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [{ degree: '1 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        {
          chords: [{ degree: '1 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'B♭', beat: 1, duration: 2 },
            { degree: '4 dom7', chordName: 'F7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        {
          chords: [{ degree: '1 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'interlude',
      label: 'Interlude',
      instrumental: true,
      bars: [{ chords: [], restBars: 14 }],
    },
    {
      id: 'verse_4',
      label: 'Verse 4',
      bars: [
        {
          chords: [{ degree: '1 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=4kd3QuTexvM' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/the-meters.webp',
  popularity: 50,
};
