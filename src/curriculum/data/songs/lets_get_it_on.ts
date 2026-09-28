import type { Song } from '@/curriculum/types/songLibrary';

export const lets_get_it_on: Song = {
  id: 'lets_get_it_on',
  title: 'Let’s Get It On',
  artist: 'Marvin Gaye',
  year: 1973,

  historicalDescription:
    "Marvin Gaye's 'Let's Get It On' becomes one of the most celebrated expressions of sensuality in soul music history. Released at the height of his creative freedom, the song pushes the boundaries of what R&B can say openly about desire and intimacy — transforming the love song into something unapologetically carnal and deeply human.",
  key: 'E♭ major',
  keyRoot: 63,
  mode: 'major',
  tempo: 83,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rnb'],
  techniques: [],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      bars: [
        {
          chords: [
            { degree: '♯4 maj', chordName: 'A', beat: 1, duration: 1 },
            { degree: '1 min7', chordName: 'E♭min7', beat: 2, duration: 1 },
            { degree: '3 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'A♭', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'B♭7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 2 },
            { degree: '3 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'A♭', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'B♭7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Gmin7', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse',
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
          repeatStart: true,
        },
        {
          chords: [{ degree: '2 dom7', chordName: 'F7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 2 },
            { degree: '3 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'A♭', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'B♭7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 2 },
            { degree: '3 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'A♭', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'B♭7', beat: 3, duration: 2 },
          ],
          repeatEnd: true,
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
