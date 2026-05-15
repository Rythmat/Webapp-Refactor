import type { Song } from '@/curriculum/types/songLibrary';

export const stop_making_sense_girlfriend_is_better: Song = {
  id: 'stop_making_sense_girlfriend_is_better',
  title: 'Stop Making Sense/Girlfriend Is Better',
  artist: 'Talking Heads',
  year: undefined,

  historicalDescription:
    "Talking Heads release 'Stop Making Sense', the concert film directed by Jonathan Demme that captures the band at the peak of their powers. 'Girlfriend Is Better' becomes one of its defining moments — David Byrne stalking the stage in his oversized suit, blending African rhythms, funk, and art-rock into something utterly alive. The film redefines what a concert movie can be.",
  key: 'D minor',
  keyRoot: 62,
  mode: 'minor',
  tempo: 119,
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
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=9r7X3f2gFz4' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
