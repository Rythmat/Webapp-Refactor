import type { Song } from '@/curriculum/types/songLibrary';

export const hey_ya: Song = {
  id: 'hey_ya',
  title: 'Hey Ya!',
  artist: 'Outkast',
  year: 2003,
  historicalDescription:
    "Outkast's Andre 3000 releases 'Hey Ya!' in 2003, a song so genre-defying it collapses the walls between hip hop, funk, pop, and rock into a single irresistible burst of energy. Despite its relentlessly upbeat sound, the lyrics wrestle with relationship disillusionment — a contradiction that makes it one of the most deceptively complex pop songs of its era. It becomes a cultural flashpoint, cementing Outkast's status as the most adventurous act in hip hop.",
  key: 'E minor',
  keyRoot: 64,
  mode: 'minor',
  tempo: 162,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['hip hop'],
  techniques: [],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      measuresPerRow: 6,
      bars: [
        { chords: [{ degree: '3 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=PWgvGjAhvIw' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/outkast.webp',
  popularity: 50,
};
