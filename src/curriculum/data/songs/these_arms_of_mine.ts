import type { Song } from '@/curriculum/types/songLibrary';

export const these_arms_of_mine: Song = {
  id: 'these_arms_of_mine',
  title: 'These Arms Of Mine',
  artist: 'Otis Redding',
  year: 1962,
  historicalDescription:
    "Otis Redding records 'These Arms Of Mine' at Stax Records in Memphis, pouring raw emotional longing into a slow, aching ballad that becomes his debut single. The recording captures a 21-year-old finding his voice — a voice so devastatingly sincere it redefines what Southern soul can feel like. It marks the beginning of one of the most powerful careers in American music.",
  key: 'B♭ major',
  keyRoot: 70,
  mode: 'major',
  tempo: 58,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['rnb'],
  techniques: [],

  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 aug', chordName: 'B♭(♯5)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj6', chordName: 'B♭6', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=GVbTE4wCbpw' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/otis-redding.webp',
  popularity: 50,
};
