import type { Song } from '@/curriculum/types/songLibrary';

export const pony: Song = {
  id: 'pony',
  title: 'Pony',
  artist: 'Ginuwine',
  year: 1996,
  historicalDescription:
    "Ginuwine releases 'Pony' in 1996, a slow-burning R&B seduction built on a spare, hypnotic beat produced by Timbaland. The track announces a new era of new jack swing's evolution into something more minimal and sensual, cementing both Ginuwine and Timbaland as defining voices of late-90s R&B. Its iconic opening riff becomes one of the most recognizable moments in the genre.",
  key: 'C♯ minor',
  keyRoot: 61,
  mode: 'minor',
  tempo: 71,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['hip-hop'],
  techniques: [],
  credits: [
    { name: 'Static Major', role: 'songwriter', artistGlobeId: 'static-major' },
    { name: 'Ginuwine', role: 'songwriter', artistGlobeId: 'ginuwine' },
    {
      name: 'Ginuwine',
      role: 'vocals',
      artistGlobeId: 'ginuwine',
      primary: true,
    },
    { name: 'Timbaland', role: 'songwriter', artistGlobeId: 'timbaland' },
  ],
  releases: [{ releaseId: 'ginuwine-ginuwine-the-bachelor', track: 2 }],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=lbnoG2dsUk0' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/ginuwine.webp',
  popularity: 50,
};
