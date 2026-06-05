import type { Song } from '@/curriculum/types/songLibrary';

export const hit_the_road_jack: Song = {
  id: 'hit_the_road_jack',
  title: 'Hit The Road Jack',
  artist: 'Ray Charles',
  year: 1961,
  historicalDescription:
    "Ray Charles records 'Hit The Road Jack', a swinging call-and-response dismissal written by Percy Mayfield, and takes it to #1. The track showcases Charles at the height of his powers — his gospel-drenched vocals trading blows with the Raelettes in a battle of the sexes that feels both playful and devastating. It becomes one of the defining hits of his career.",
  key: 'E♭ major',
  keyRoot: 63,
  mode: 'major',
  tempo: 172,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['jazz'],
  techniques: [],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        {
          chords: [
            { degree: '4 min7', chordName: 'A♭min7', beat: 1, duration: 2 },
            { degree: '♭3 maj', chordName: 'G♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭2 maj', chordName: 'E', beat: 1, duration: 2 },
            { degree: '1 7', chordName: 'E♭7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'A♭min7', beat: 1, duration: 2 },
            { degree: '♭3 maj', chordName: 'G♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭2 maj', chordName: 'E', beat: 1, duration: 2 },
            { degree: '1 7', chordName: 'E♭7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=uSiHqxgE2d0' },
  ],
  artistImageSource: 'commissioned',

  artistImageRef: '/artists/ray-charles.webp',
  popularity: 50,
};
