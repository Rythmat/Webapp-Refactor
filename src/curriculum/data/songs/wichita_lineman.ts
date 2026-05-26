import type { Song } from '@/curriculum/types/songLibrary';

export const wichita_lineman: Song = {
  id: 'wichita_lineman',
  title: 'Wichita Lineman',
  artist: 'Glen Campbell',
  year: 1968,
  historicalDescription:
    "Glen Campbell releases 'Wichita Lineman', Jimmy Webb's meditation on loneliness and longing set against the vast Oklahoma plains. A telephone lineman becomes an unlikely romantic hero, and the song blurs the line between country and pop with an orchestral sophistication rarely heard in either genre. It becomes one of the first country songs to be widely recognized as serious art.",
  key: 'C major',
  keyRoot: 60,
  mode: 'major',
  tempo: 86,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['folk'],
  techniques: [],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      measuresPerRow: 6,
      bars: [
        {
          chords: [{ degree: '♭7 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 maj/6', chordName: 'F/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 7', chordName: 'C7sus', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Dmin7', beat: 1, duration: 2 },
            { degree: '6 min7', chordName: 'Amin7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 maj', chordName: 'D', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      measuresPerRow: 6,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'G/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '5 min7/♭7',
              chordName: 'Gmin7/B♭',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [
            { degree: '2 maj/6', chordName: 'D/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '6 7', chordName: 'A7sus', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      repeatCount: 3,
      bars: [
        {
          chords: [{ degree: '♭7 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [{ degree: '♭7 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=Q8P_xTBpAcY' },
  ],
  artistImageSource: 'commissioned',

  artistImageRef: '/artists/glen-campbell.webp',
  popularity: 50,
};
