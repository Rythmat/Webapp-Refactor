import type { Song } from '@/curriculum/types/songLibrary';

export const it_wasnt_me: Song = {
  id: 'it_wasnt_me',
  title: 'It Wasn’t Me',
  artist: 'Shaggy',
  year: 2000,
  historicalDescription:
    "Shaggy releases 'It Wasn't Me', a reggae-fusion track built on deadpan denial and infectious Caribbean rhythm. The song becomes one of the defining pop hits of the early 2000s, blending dancehall attitude with mainstream radio accessibility and cementing Shaggy as one of reggae fusion's biggest crossover stars.",
  key: 'C major',
  keyRoot: 60,
  mode: 'major',
  tempo: 94,
  timeSignature: [4, 4],

  difficulty: 1,
  genreTags: ['reggae'],
  techniques: [],

  sections: [
    {
      id: 'section_a',
      label: 'Section A',
      measuresPerRow: 1,
      bars: [{ chords: [], restBars: 8 }],
    },
    {
      id: 'verse',
      label: 'Verse',
      measuresPerRow: 8,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=2g5Hz17C4is' },
  ],
  artistImageSource: 'commissioned',

  artistImageRef: '/artists/shaggy.webp',
  popularity: 50,
};
