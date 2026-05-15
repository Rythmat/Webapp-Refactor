import type { Song } from '@/curriculum/types/songLibrary';

export const creep: Song = {
  id: 'creep',
  title: 'Creep',
  artist: 'Radiohead',
  year: 1992,
  historicalDescription:
    "Radiohead releases 'Creep', a song about yearning and self-loathing that initially struggles in the UK before exploding in Israel and becoming a global hit. The track's quiet-loud dynamics — delicate verses erupting into a raw, distorted chorus — capture the alienation of a generation and introduce the world to a band that will go on to redefine rock music entirely.",
  key: 'G major',
  keyRoot: 67,
  mode: 'major',
  tempo: 97,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 7', chordName: 'B7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_b',
      label: 'Section B',
      measuresPerRow: 5,
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }],
          fermata: true,
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=XFkzRNyygfk' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
