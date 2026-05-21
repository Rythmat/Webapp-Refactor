import type { Song } from '@/curriculum/types/songLibrary';

export const how_come_you_dont_call_me_timberlake: Song = {
  id: 'how_come_you_dont_call_me_timberlake',
  title: 'How Come You Don’t Call Me',
  artist: 'Alicia Keys and Justin Timberlake',
  year: undefined,

  historicalDescription:
    "Alicia Keys and Justin Timberlake reimagine Prince's classic 'How Come U Don't Call Me Anymore', a track Keys first made her own on her landmark debut 'Songs in A Minor'. The pairing of two of pop's most gifted vocalists breathes new tension into Prince's raw plea — a testament to how deeply his catalog continues to resonate across generations.",
  key: 'D♭ major',
  keyRoot: 61,
  mode: 'major',
  tempo: 90,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['pop_rock'],
  techniques: [],

  sections: [
    {
      id: 'section_a',
      label: 'Section A',
      measuresPerRow: 1,
      bars: [{ chords: [], restBars: 4 }],
    },
    {
      id: 'verse',
      label: 'Verse',
      measuresPerRow: 3,
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭6 7', chordName: 'A7', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'A♭7sus', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_c',
      label: 'Section C',
      measuresPerRow: 3,
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭6 7', chordName: 'A7', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'A♭7sus', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'D♭/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'E♭min7', beat: 1, duration: 1 },
            { degree: '1 maj/3', chordName: 'D♭/F', beat: 2, duration: 1 },
            { degree: '4 maj', chordName: 'G♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 maj/♭5', chordName: 'E♭/G', beat: 1, duration: 1 },
            { degree: '5 7', chordName: 'A♭7sus', beat: 2, duration: 3 },
          ],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      measuresPerRow: 6,
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭6 7', chordName: 'A7', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'A♭7sus', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭6 7', chordName: 'A7', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'A♭7sus', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'D♭/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'E♭min7', beat: 1, duration: 1 },
            { degree: '1 maj/3', chordName: 'D♭/F', beat: 2, duration: 1 },
            { degree: '4 maj', chordName: 'G♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 maj/♭5', chordName: 'E♭/G', beat: 1, duration: 1 },
            { degree: '5 7', chordName: 'A♭7sus', beat: 2, duration: 3 },
          ],
        },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      measuresPerRow: 6,
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭6 7', chordName: 'A7', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'A♭7sus', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭6 7', chordName: 'A7', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'A♭7sus', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      measuresPerRow: 6,
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '3 7', chordName: 'F7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '2 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'E♭min7', beat: 1, duration: 1 },
            { degree: '1 maj/3', chordName: 'D♭/F', beat: 2, duration: 1 },
            { degree: '4 maj', chordName: 'G♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 maj/♭5', chordName: 'E♭/G', beat: 1, duration: 1 },
            { degree: '5 7', chordName: 'A♭7sus', beat: 2, duration: 3 },
          ],
        },
      ],
    },
    {
      id: 'section_g',
      label: 'Section G',
      measuresPerRow: 6,
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭6 7', chordName: 'A7', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'A♭7sus', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭6 7', chordName: 'A7', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'A♭7sus', beat: 3, duration: 2 },
          ],
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=-ez-rivUZgc' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
