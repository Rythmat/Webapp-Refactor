import type { Song } from '@/curriculum/types/songLibrary';

export const wait_in_vain: Song = {
  id: 'wait_in_vain',
  title: 'Wait In Vain',
  artist: 'Bob Marley',
  year: undefined,

  historicalDescription:
    "Bob Marley releases 'Waiting in Vain', a tender reggae love song that shows a softer, more vulnerable side of the artist the world knows as a revolutionary. Where his anthems rally crowds, this song draws them close — its slow, aching rhythm making it one of reggae's most enduring romantic ballads. It cements Marley's gift for channeling deep emotion through the unhurried pulse of Jamaican music.",
  key: 'D♭ major',
  keyRoot: 61,
  mode: 'major',
  tempo: 79,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['reggae'],
  techniques: [],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        {
          chords: [{ degree: '5 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'D♭', beat: 1, duration: 2 },
            { degree: '2 maj', chordName: 'E♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '7 min7', chordName: 'Cmin7', beat: 1, duration: 2 },
            { degree: '6 min7', chordName: 'B♭min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'D♭', beat: 1, duration: 2 },
            { degree: '2 maj', chordName: 'E♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '7 min7', chordName: 'Cmin7', beat: 1, duration: 2 },
            { degree: '6 min7', chordName: 'B♭min7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [{ degree: '5 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=IWxbhC44p2w' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
