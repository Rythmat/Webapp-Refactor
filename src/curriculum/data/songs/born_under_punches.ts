import type { Song } from '@/curriculum/types/songLibrary';

export const born_under_punches: Song = {
  id: 'born_under_punches',
  title: 'Born Under Punches',
  artist: 'Talking Heads',
  year: 1983,

  historicalDescription:
    "Talking Heads open 'Remain in Light' with 'Born Under Punches (The Heat Goes On)', a relentless collision of funk, African polyrhythm, and David Byrne's fractured, fevered vocals. Produced with Brian Eno, the album marks the band's full embrace of the layered, groove-driven approach they call 'painting with sound.' It redefines what a rock band can do with rhythm and becomes one of the most influential records of the new wave era.",
  key: 'G minor',
  keyRoot: 67,
  mode: 'minor',
  tempo: 114,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['new_wave', 'art_rock'],
  techniques: [],

  sections: [
    {
      id: 'verse_1',
      label: 'Verse',
      bars: [
        {
          chords: [
            { degree: '2 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '6 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=w6T_X7MXg40' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
