import type { Song } from '@/curriculum/types/songLibrary';

export const slippery_people: Song = {
  id: 'slippery_people',
  title: 'Slippery People',
  artist: 'Talking Heads',
  year: 1983,
  historicalDescription:
    "Talking Heads release 'Slippery People' from their landmark album 'Speaking in Tongues', a track that fuses funk, gospel, and art-rock into something utterly their own. David Byrne's jerky, possessed vocal delivery and the band's polyrhythmic groove capture the anxious energy of early-80s New York. The song becomes a centerpiece of their legendary Stop Making Sense concert film, one of the greatest live documents in rock history.",
  key: 'A minor',
  keyRoot: 69,
  mode: 'minor',
  tempo: 104,
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
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=paSczHpWC3I' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
