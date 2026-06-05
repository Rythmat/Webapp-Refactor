import type { Song } from '@/curriculum/types/songLibrary';

export const me_myself_and_i: Song = {
  id: 'me_myself_and_i',
  title: 'Me, Myself and I',
  artist: 'Beyonce',
  year: 2003,
  historicalDescription:
    "Beyoncé releases 'Me, Myself and I' as part of her debut solo album 'Dangerously in Love', announcing herself as a formidable solo force after her years fronting Destiny's Child. The song's defiant anthem of self-reliance resonates deeply, capturing a cultural moment where female independence in R&B is both a personal statement and a commercial force.",
  key: 'F♯ major',
  keyRoot: 66,
  mode: 'major',
  tempo: 84,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['hip hop'],
  techniques: [],

  sections: [
    {
      id: 'section_a',
      label: 'Section A',
      measuresPerRow: 1,
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'E♭min7', beat: 1, duration: 2 },
            { degree: '7 min7', chordName: 'Fmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'E♭min7', beat: 1, duration: 2 },
            { degree: '7 min7', chordName: 'Fmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_c',
      label: 'Section C',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'E♭min7', beat: 1, duration: 2 },
            { degree: '7 min7', chordName: 'Fmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'E♭min7', beat: 1, duration: 2 },
            { degree: '♭6 min7', chordName: 'Dmin7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'D♭7', beat: 1, duration: 4 }] },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=4S37SGxZSMc' },
  ],
  artistImageSource: 'commissioned',

  artistImageRef: '/artists/beyonce.webp',
  popularity: 50,
};
