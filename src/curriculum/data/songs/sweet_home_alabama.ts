import type { Song } from '@/curriculum/types/songLibrary';

export const sweet_home_alabama: Song = {
  id: 'sweet_home_alabama',
  title: 'Sweet Home Alabama',
  artist: 'Lynyrd Skynyrd',
  year: 1976,
  historicalDescription:
    "Lynyrd Skynyrd's 'Sweet Home Alabama' becomes an anthem of Southern pride and a defining moment for Southern rock. Written partly as a rebuttal to Neil Young's criticisms of the South in 'Southern Man' and 'Alabama', the song stakes out a defiant regional identity — and its three-guitar attack cements Lynyrd Skynyrd as the genre's definitive voice.",
  key: 'D major',
  keyRoot: 62,
  mode: 'major',
  tempo: 98,
  timeSignature: [4, 4],

  difficulty: 1,
  genreTags: ['folk', 'rock'],
  techniques: [],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [] },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=-p8GXZcdrIk' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/lynyrd-skynyrd.webp',
  popularity: 50,
};
