import type { Song } from '@/curriculum/types/songLibrary';

export const houses_in_motion: Song = {
  id: 'houses_in_motion',
  title: 'Houses In Motion',
  artist: 'Talking Heads',
  year: 1981,
  historicalDescription:
    "Talking Heads release 'Houses In Motion' from their landmark album 'Remain in Light', a record that reshapes what rock music can be. Built on interlocking rhythms drawn from West African music and produced with Brian Eno, the track pulses with a hypnotic urgency that places David Byrne's fractured lyrical visions inside a groove that never lets go. It marks a turning point where art rock and the dancefloor become the same place.",
  key: 'E minor',
  keyRoot: 64,
  mode: 'minor',
  tempo: 204,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      measuresPerRow: 8,
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7/7', chordName: 'Emin7/D', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7/7', chordName: 'Emin7/D', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7/7', chordName: 'Emin7/D', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7/7', chordName: 'Emin7/D', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=Yt9_uyXgOzc' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
