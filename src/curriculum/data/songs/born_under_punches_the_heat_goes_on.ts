import type { Song } from '@/curriculum/types/songLibrary';

export const born_under_punches_the_heat_goes_on: Song = {
  id: 'born_under_punches_the_heat_goes_on',
  title: 'Born Under Punches',
  artist: 'Talking Heads',
  year: 1980,
  historicalDescription:
    "Talking Heads open 'Remain in Light' with 'Born Under Punches', a hypnotic collision of funk, African polyrhythms, and David Byrne's fractured, paranoid lyrics. Recorded in 1980, the track signals a radical leap from the band's art-punk origins — layering loops and interlocking grooves under the influence of Brian Eno and Fela Kuti. It redefines what a rock band can be.",
  key: 'G minor',
  keyRoot: 67,
  mode: 'minor',
  tempo: 114,
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
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '6 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Dmin7', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        { chords: [] },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=w6T_X7MXg40' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
