import type { Song } from '@/curriculum/types/songLibrary';

export const it_all_comes_back: Song = {
  id: 'it_all_comes_back',
  title: 'It All Comes Back',
  artist: 'Tower Of Power',
  year: 1993,
  historicalDescription:
    "Tower of Power, the Oakland funk and soul institution formed in the late 1960s, releases 'It All Comes Back' in 1993 — a testament to their enduring groove at a time when funk is being rediscovered by a new generation. While hip hop producers are sampling the band's classic horn-driven sound, Tower of Power proves they can still deliver the real thing live and on record, keeping the Bay Area's soulful tradition alive.",
  key: 'D major',
  keyRoot: 62,
  mode: 'major',
  tempo: 100,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['funk'],
  techniques: [],

  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        { chords: [{ degree: '1 dom7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'D7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [{ degree: '♭6 dom7', chordName: 'B♭7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭5 dom7', chordName: 'A♭7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 dom7', chordName: 'B♭7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭5 dom7', chordName: 'A♭7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 dom7', chordName: 'B♭7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭5 dom7', chordName: 'A♭7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 dom7', chordName: 'B♭7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '♭7 dom7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [] },
        { chords: [] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        { chords: [{ degree: '1 dom7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'D7', beat: 1, duration: 4 }] },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=Q2kujcF-nk0' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/tower-of-power.webp',
  popularity: 50,
};
