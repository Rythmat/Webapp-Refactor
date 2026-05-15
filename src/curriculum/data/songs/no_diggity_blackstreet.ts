import type { Song } from '@/curriculum/types/songLibrary';

export const no_diggity_blackstreet: Song = {
  id: 'no_diggity_blackstreet',
  title: 'No Diggity',
  artist: 'Chet Faker',
  year: 2012,
  historicalDescription:
    "Australian musician Chet Faker releases a haunting, stripped-back cover of Blackstreet's 1996 R&B classic 'No Diggity', reframing the hip hop anthem as a moody, minimalist bedroom recording. The cover spreads virally online, introducing Faker to a global audience and establishing his signature approach — dissolving genre boundaries between soul, R&B, and electronic music. It becomes one of the most celebrated reinterpretations of the era.",
  key: 'E♭ minor',
  keyRoot: 63,
  mode: 'minor',
  tempo: 90,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['hip_hop'],
  techniques: [],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      measuresPerRow: 2,
      bars: [
        { chords: [], restBars: 7 },
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        {
          chords: [
            { degree: '3 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=3KL9mRus19o' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
