import type { Song } from '@/curriculum/types/songLibrary';

export const this_must_be_the_place: Song = {
  id: 'this_must_be_the_place',
  title: 'This Must Be The Place',
  artist: 'Unknown Artist',
  year: undefined,

  historicalDescription:
    "Several artists have recorded songs titled 'This Must Be the Place', but the most iconic is Talking Heads' tender 1983 ode to home and belonging, a rare moment of warmth in David Byrne's catalog. Built on a gentle, swaying groove, it stands apart from the band's more angular art-rock — a love song, Byrne admits, to his own band. It becomes one of the most emotionally resonant songs of the decade.",
  key: 'E minor',
  keyRoot: 64,
  mode: 'minor',
  tempo: 114,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['pop', 'rock'],
  techniques: [],

  sections: [
    {
      id: 'section_e',
      label: 'Section E',
      bars: [
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 1 },
            { degree: '3 maj/7', chordName: 'G/D', beat: 2, duration: 1 },
            { degree: '1 min7', chordName: 'Emin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'Emin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '3 maj/7', chordName: 'G/D', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'Emin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'Emin7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=Fb2q141rMNE' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
