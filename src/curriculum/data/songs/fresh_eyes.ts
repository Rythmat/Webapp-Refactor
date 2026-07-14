import type { Song } from '@/curriculum/types/songLibrary';

export const fresh_eyes: Song = {
  id: 'fresh_eyes',
  title: 'Fresh Eyes',
  artist: 'Andy Grammer',
  year: 2017,
  historicalDescription:
    "Andy Grammer releases 'Fresh Eyes', a warm pop-rock anthem about rediscovering love for someone familiar. The song captures a universal emotional moment — seeing a partner as if for the first time — and becomes one of Grammer's most celebrated tracks, finding its way into weddings and romantic playlists worldwide.",
  key: 'C major',
  keyRoot: 60,
  mode: 'major',
  tempo: 122,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['pop', 'rock'],
  techniques: [],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      measuresPerRow: 6,
      bars: [
        {
          chords: [
            { degree: '3 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '2 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '2 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=5bgemCaaQkU' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/andy-grammer.webp',
  popularity: 50,
};
