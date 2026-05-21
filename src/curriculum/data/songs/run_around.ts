import type { Song } from '@/curriculum/types/songLibrary';

export const run_around: Song = {
  id: 'run_around',
  title: 'Run-Around',
  artist: 'Blues Traveler',
  year: 1994,
  historicalDescription:
    "Blues Traveler releases 'Run-Around' in 1994, a blues-rock anthem built around John Popper's virtuosic harmonica work and a deceptively catchy melody. The song becomes a massive radio hit, introducing a generation to the band's jam-band roots and proving that guitar-driven blues rock with genuine instrumental chops can still conquer mainstream airwaves.",
  key: 'D major',
  keyRoot: 62,
  mode: 'major',
  tempo: 152,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['blues_rock'],
  techniques: [],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        {
          chords: [
            { degree: '4 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '♭7 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Amin7', beat: 1, duration: 2 },
            { degree: '1 7', chordName: 'D7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '♭7 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Amin7', beat: 1, duration: 2 },
            { degree: '1 7', chordName: 'D7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=ousaiByU1ko' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
