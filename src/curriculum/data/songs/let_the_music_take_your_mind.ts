import type { Song } from '@/curriculum/types/songLibrary';

export const let_the_music_take_your_mind: Song = {
  id: 'let_the_music_take_your_mind',
  title: 'Let The Music Take Your Mind',
  artist: 'Kool & the Gang',
  year: undefined,

  historicalDescription:
    "Kool And The Gang release 'Let The Music Take Your Mind', an early statement of the raw, horn-driven funk sound that will define the group's identity. Rooted in the streets of Jersey City, the band builds a groove-first philosophy — before the glossy pop crossovers of the 1980s, this is Kool And The Gang at their most instinctive and alive.",
  key: 'E♭ mixolydian',
  keyRoot: 63,
  mode: 'mixolydian',
  tempo: 104,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['funk'],
  techniques: [],

  sections: [
    {
      id: 'verse_1',
      label: 'Verse',
      bars: [
        {
          chords: [
            { degree: '5 dom7', chordName: 'B♭7sus4', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'B♭7sus4', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'B♭7sus4', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'B♭7sus4', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus',
      bars: [
        {
          chords: [
            { degree: '1 dom7', chordName: 'E♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'E♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'E♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'E♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'E♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'E♭7', beat: 1, duration: 4 },
          ],
          repeatEnd: true,
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=iJfKHFrpfzw' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/kool-and-the-gang.webp',
  popularity: 50,
};
