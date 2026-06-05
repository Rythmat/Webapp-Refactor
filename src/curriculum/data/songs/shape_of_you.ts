import type { Song } from '@/curriculum/types/songLibrary';

export const shape_of_you: Song = {
  id: 'shape_of_you',
  title: 'Shape Of You',
  artist: 'Ed Sheeran',
  year: 2017,
  historicalDescription:
    "Ed Sheeran releases 'Shape Of You' in 2017, a sleek pop track built on tropical house rhythms and a looping melodic hook that makes it almost impossible to ignore. The song becomes one of the best-selling singles of all time, dominating charts worldwide and cementing Sheeran's place not just as a singer-songwriter but as a hitmaking force reshaping mainstream pop.",
  key: 'D♭ minor',
  keyRoot: 61,
  mode: 'minor',
  tempo: 192,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['pop', 'rock'],
  techniques: [],

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
        { chords: [{ degree: '6 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 maj', chordName: 'B', beat: 1, duration: 4 }] },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=JGwWNGJdvx8' },
  ],
  artistImageSource: 'commissioned',

  artistImageRef: '/artists/ed-sheeran.webp',
  popularity: 50,
};
