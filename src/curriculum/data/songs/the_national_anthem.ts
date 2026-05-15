import type { Song } from '@/curriculum/types/songLibrary';

export const the_national_anthem: Song = {
  id: 'the_national_anthem',
  title: 'The National Anthem',
  artist: 'Radiohead',
  year: 2000,
  historicalDescription:
    "Radiohead releases 'The National Anthem' as part of their landmark album 'Kid A', a jarring, bass-driven collision of rock and free jazz chaos. The track's dense, dissonant brass arrangements and Thom Yorke's distorted vocals signal a radical departure from guitar rock — a deliberate rupture that challenges what a rock band can sound like. It becomes one of the defining artistic statements of the early 2000s.",
  key: 'A major',
  keyRoot: 69,
  mode: 'major',
  tempo: 90,
  timeSignature: [4, 4],

  difficulty: 1,
  genreTags: ['rock'],
  techniques: [],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [] },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=NfQD1QiQ9o4' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
