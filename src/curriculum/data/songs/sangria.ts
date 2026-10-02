import type { Song } from '@/curriculum/types/songLibrary';

export const sangria: Song = {
  id: 'sangria',
  title: 'Sangria',
  artist: 'Blake Shelton',
  year: 2014,
  historicalDescription:
    "Blake Shelton releases 'Sangria', a sun-soaked country love song that leans into relaxed, almost tropical warmth rather than traditional Nashville twang. The track captures a mid-2010s moment when mainstream country was stretching its borders, blending laid-back summer moods with radio-ready hooks — and Shelton, already a dominant force on the charts, delivers it with effortless charm.",
  key: 'F♯ minor',
  keyRoot: 66,
  mode: 'minor',
  tempo: 116,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['folk'],
  techniques: [],
  credits: [
    { name: 'Bryan Sutton', role: 'performer', instrument: 'acoustic-guitar' },
    { name: 'Trevor Rosen', role: 'songwriter', artistGlobeId: 'trevor-rosen' },
    { name: 'Derek Wells', role: 'performer', instrument: 'electric-guitar' },
    { name: 'Justin Niebank', role: 'engineer' },
    { name: 'Charles Judge', role: 'performer', instrument: 'synthesizer' },
    { name: 'Josh Osborne', role: 'songwriter', artistGlobeId: 'josh-osborne' },
    { name: 'JT Harding', role: 'songwriter', artistGlobeId: 'jt-harding' },
    { name: 'Aubrey Haynie', role: 'performer', instrument: 'violin' },
    { name: 'Ben Phillips', role: 'engineer' },
    { name: 'Derek Wells', role: 'performer', instrument: 'acoustic-guitar' },
    {
      name: 'Scott Hendricks',
      role: 'producer',
      artistGlobeId: 'scott-hendricks',
    },
  ],
  releases: [
    { releaseId: 'blake-shelton-bringing-back-the-sunshine', track: 6 },
  ],

  sections: [
    {
      id: 'verse_1',
      label: 'Verse',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus',
      bars: [
        {
          chords: [{ degree: '♭6 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'E', beat: 1, duration: 4 }],
          repeatEnd: true,
          repeatTimes: 3,
        },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
          fermata: true,
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=KoQrH6EMnas' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/blake-shelton.webp',
  popularity: 50,
};
