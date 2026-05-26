import type { Song } from '@/curriculum/types/songLibrary';

export const chains: Song = {
  id: 'chains',
  title: 'Chains',
  artist: 'The Beatles',
  year: 1963,
  historicalDescription:
    "The Beatles record 'Chains', a Gerry Goffin and Carole King composition, for their debut album 'Please Please Me'. One of the few tracks on the album sung by George Harrison, it captures the Fab Four in their earliest phase — hungry, tight, and still channeling the American girl-group sound they grew up idolizing. The cover choice reveals just how deeply Brill Building pop shaped the Beatles before they began writing the world's soundtrack themselves.",
  key: 'B♭ major',
  keyRoot: 70,
  mode: 'major',
  tempo: 124,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      measuresPerRow: 6,
      bars: [
        { chords: [{ degree: '1 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_c',
      label: 'Section C',
      measuresPerRow: 6,
      bars: [
        { chords: [{ degree: '1 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      measuresPerRow: 8,
      bars: [
        { chords: [{ degree: '4 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'F7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      measuresPerRow: 6,
      bars: [
        { chords: [{ degree: '1 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      measuresPerRow: 6,
      bars: [
        { chords: [{ degree: '1 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=rJOhavaeJYk' },
  ],
  artistImageSource: 'commissioned',

  artistImageRef: '/artists/the-beatles.webp',
  popularity: 50,
};
