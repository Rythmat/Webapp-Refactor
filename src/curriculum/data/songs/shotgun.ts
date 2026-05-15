import type { Song } from '@/curriculum/types/songLibrary';

export const shotgun: Song = {
  id: 'shotgun',
  title: 'Shotgun',
  artist: 'Jr Walker and the Allstars',
  year: undefined,

  historicalDescription:
    "Jr. Walker and the All Stars release 'Shotgun', a raw, saxophone-driven blast of energy that stands apart from the polished Motown sound dominating the era. Walker's honking, gritty sax leads the charge where most Motown acts feature smooth vocals, making 'Shotgun' an irresistible dance floor igniter. It becomes one of the label's most visceral and enduring hits.",
  key: 'A♭ major',
  keyRoot: 68,
  mode: 'major',
  tempo: 120,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['motown'],
  techniques: [],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      measuresPerRow: 2,
      bars: [
        { chords: [{ degree: '5 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=6FgO2Hs4t_4' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
