import type { Song } from '@/curriculum/types/songLibrary';

export const let_the_music_take_your_mind: Song = {
  id: 'let_the_music_take_your_mind',
  title: 'Let The Music Take Your Mind',
  artist: 'Kool & the Gang',
  year: undefined,

  historicalDescription:
    "Kool And The Gang release 'Let The Music Take Your Mind', an early statement of the raw, horn-driven funk sound that will define the group's identity. Rooted in the streets of Jersey City, the band builds a groove-first philosophy — before the glossy pop crossovers of the 1980s, this is Kool And The Gang at their most instinctive and alive.",
  key: 'E♭ major',
  keyRoot: 63,
  mode: 'major',
  tempo: 104,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['funk'],
  techniques: [],

  sections: [
    {
      id: 'chorus_1',
      label: 'Chorus',
      bars: [
        {
          chords: [{ degree: '5 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      measuresPerRow: 2,
      bars: [
        { chords: [{ degree: '1 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse',
      measuresPerRow: 2,
      bars: [
        { chords: [{ degree: '1 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      measuresPerRow: 2,
      repeatCount: 4,
      bars: [
        { chords: [{ degree: '1 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [{ degree: '5 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'intro',
      label: 'Intro',
      measuresPerRow: 2,
      bars: [
        { chords: [{ degree: '1 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      measuresPerRow: 2,
      bars: [
        { chords: [{ degree: '1 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_8',
      label: 'Section H',
      measuresPerRow: 2,
      bars: [
        { chords: [{ degree: '1 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=iJfKHFrpfzw' },
  ],
  artistImageSource: 'commissioned',

  artistImageRef: '/artists/kool-and-the-gang.webp',
  popularity: 50,
};
