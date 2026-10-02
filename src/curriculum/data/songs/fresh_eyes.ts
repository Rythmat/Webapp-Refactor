import type { Song } from '@/curriculum/types/songLibrary';

export const fresh_eyes: Song = {
  id: 'fresh_eyes',
  title: 'Fresh Eyes',
  artist: 'Andy Grammer',
  year: 2016,
  historicalDescription:
    "Andy Grammer releases 'Fresh Eyes', a warm pop-rock anthem about rediscovering love for someone familiar. The song captures a universal emotional moment — seeing a partner as if for the first time — and becomes one of Grammer's most celebrated tracks, finding its way into weddings and romantic playlists worldwide.",
  key: 'G major',
  keyRoot: 67,
  mode: 'major',
  tempo: 122,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['pop', 'rock'],
  techniques: [],
  credits: [
    {
      name: 'Ian Kirkpatrick',
      role: 'producer',
      artistGlobeId: 'ian-kirkpatrick',
    },
    { name: 'Andy Grammer', role: 'songwriter', artistGlobeId: 'andy-grammer' },
    { name: 'Ross Golan', role: 'songwriter', artistGlobeId: 'ross-golan' },
    { name: 'Manny Marroquin', role: 'engineer' },
    {
      name: 'Ian Kirkpatrick',
      role: 'songwriter',
      artistGlobeId: 'ian-kirkpatrick',
    },
  ],
  releases: [{ releaseId: 'andy-grammer-the-good-parts', track: 5 }],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'C', beat: 3, duration: 2 },
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
