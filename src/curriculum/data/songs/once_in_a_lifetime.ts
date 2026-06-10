import type { Song } from '@/curriculum/types/songLibrary';

export const once_in_a_lifetime: Song = {
  id: 'once_in_a_lifetime',
  title: 'Once In A Lifetime',
  artist: 'Talking Heads',
  year: 1980,
  historicalDescription:
    "Talking Heads release 'Once In A Lifetime', a hypnotic meditation on suburban alienation and the unconscious drift of modern life. Built on African polyrhythms and Brian Eno's production, David Byrne's stream-of-consciousness delivery — 'same as it ever was' — captures something universal about routine and awakening. It becomes one of new wave's defining artistic statements.",
  key: 'A major',
  keyRoot: 69,
  mode: 'major',
  tempo: 118,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        {
          chords: [{ degree: '1 7', chordName: 'A7sus', beat: 1, duration: 4 }],
        },
        { chords: [] },
        { chords: [] },
        { chords: [] },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=5IsSpAOD6K8' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/talking-heads.webp',
  popularity: 50,
};
