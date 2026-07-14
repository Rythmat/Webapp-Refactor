import type { Song } from '@/curriculum/types/songLibrary';

export const whats_up: Song = {
  id: 'whats_up',
  title: 'What’s Up',
  artist: '4 Non Blondes',
  year: 1993,
  historicalDescription:
    "4 Non Blondes release 'What's Up', a raw, anthemic rock track built around Linda Perry's anguished vocal howl and a simple, repeating guitar figure. Emerging from San Francisco's early 90s alternative scene, the song captures a generation's frustration and yearning, becoming an unexpected global hit and one of the most recognizable rock songs of the decade.",
  key: 'A major',
  keyRoot: 69,
  mode: 'major',
  tempo: 67,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=6NXnxTNIWkc' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/4-non-blondes.webp',
  popularity: 50,
};
