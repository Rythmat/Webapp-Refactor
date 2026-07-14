import type { Song } from '@/curriculum/types/songLibrary';

export const lets_get_it_on: Song = {
  id: 'lets_get_it_on',
  title: 'Let’s Get It On',
  artist: 'Marvin Gaye',
  year: 1975,

  historicalDescription:
    "Marvin Gaye's 'Let's Get It On' becomes one of the most celebrated expressions of sensuality in soul music history. Released at the height of his creative freedom, the song pushes the boundaries of what R&B can say openly about desire and intimacy — transforming the love song into something unapologetically carnal and deeply human.",
  key: 'B♭ minor',
  keyRoot: 70,
  mode: 'minor',
  tempo: 83,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rnb'],
  techniques: [],

  sections: [
    {
      id: 'section_e',
      label: 'Section E',
      bars: [
        {
          chords: [
            { degree: '♯7 maj', chordName: 'A', beat: 1, duration: 1 },
            { degree: '4 min7', chordName: 'Ebmin7', beat: 2, duration: 1 },
            { degree: '♯6 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '7 maj', chordName: 'A♭', beat: 1, duration: 2 },
            { degree: '1 7', chordName: 'B♭7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Ebmin7', beat: 1, duration: 2 },
            { degree: '♯6 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '7 maj', chordName: 'A♭', beat: 1, duration: 2 },
            { degree: '1 7', chordName: 'B♭7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse',
      repeatCount: 3,
      bars: [
        {
          chords: [{ degree: '7 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♯6 min7', chordName: 'Gmin7', beat: 1, duration: 2 },
            { degree: '7 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus',
      bars: [
        {
          chords: [{ degree: '7 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      bars: [
        {
          chords: [
            { degree: '4 min7', chordName: 'Ebmin7', beat: 1, duration: 2 },
            { degree: '♯6 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '7 maj', chordName: 'A♭', beat: 1, duration: 2 },
            { degree: '1 7', chordName: 'B♭7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Ebmin7', beat: 1, duration: 2 },
            { degree: '♯6 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '7 maj', chordName: 'A♭', beat: 1, duration: 2 },
            { degree: '1 7', chordName: 'B♭7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [{ degree: '7 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [
            { degree: '4 min7', chordName: 'Ebmin7', beat: 1, duration: 2 },
            { degree: '♯6 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '7 maj', chordName: 'A♭', beat: 1, duration: 2 },
            { degree: '1 7', chordName: 'B♭7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Ebmin7', beat: 1, duration: 2 },
            { degree: '♯6 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '7 maj', chordName: 'A♭', beat: 1, duration: 2 },
            { degree: '1 7', chordName: 'B♭7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=AqPBfbLoF_M' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/marvin-gaye.webp',
  popularity: 50,
};
