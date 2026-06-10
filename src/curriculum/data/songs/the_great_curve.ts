import type { Song } from '@/curriculum/types/songLibrary';

export const the_great_curve: Song = {
  id: 'the_great_curve',
  title: 'The Great Curve',
  artist: 'Talking Heads',
  year: 1980,
  historicalDescription:
    "Talking Heads release 'The Great Curve' on their landmark album 'Remain in Light', a record that rewires the DNA of rock by fusing it with West African polyrhythmic grooves and dense, interlocking guitar parts. Co-produced with Brian Eno, the track pulses with a collective, almost ceremonial energy — David Byrne's fractured vocals circling layers of rhythm like a chant. It marks a turning point where art-rock fully embraces the global.",
  key: 'F minor',
  keyRoot: 65,
  mode: 'minor',
  tempo: 153,
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
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=3N5qQrGSuJ4' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/talking-heads.webp',
  popularity: 50,
};
