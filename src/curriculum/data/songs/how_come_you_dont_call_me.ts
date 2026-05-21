import type { Song } from '@/curriculum/types/songLibrary';

export const how_come_you_dont_call_me: Song = {
  id: 'how_come_you_dont_call_me',
  title: 'How Come You Don’t Call Me',
  artist: 'Alicia Keys and Justin Timberlake',
  year: undefined,

  historicalDescription:
    "Originally written and recorded by Prince, 'How Come You Don't Call Me' becomes a showcase for Alicia Keys on her landmark debut 'Songs in A Minor' — her raw, gospel-drenched piano style transforming the song into a soul confession. The track underscores Keys' gift for channeling classic R&B feeling through a modern lens, honoring Prince's legacy while staking out her own voice.",
  key: 'D♭ major',
  keyRoot: 61,
  mode: 'major',
  tempo: 84,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['pop'],
  techniques: [],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      measuresPerRow: 8,
      repeatCount: 6,
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '♭6 7', chordName: 'A7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '4 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 7', chordName: 'A♭7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '♭6 7', chordName: 'A7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '4 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 7', chordName: 'A♭7sus', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      measuresPerRow: 8,
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
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
            { degree: '1 maj/3', chordName: 'D♭/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'E♭min7', beat: 1, duration: 2 },
            { degree: '1 maj/3', chordName: 'D♭/F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 maj/♭5', chordName: 'E♭/G', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'A♭7sus', beat: 3, duration: 2 },
          ],
        },
        { chords: [] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      measuresPerRow: 8,
      repeatCount: 5,
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '♭6 7', chordName: 'A7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '4 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 7', chordName: 'A♭7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '♭6 7', chordName: 'A7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '4 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 7', chordName: 'A♭7sus', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      measuresPerRow: 8,
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
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
            { degree: '1 maj/3', chordName: 'D♭/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'E♭min7', beat: 1, duration: 2 },
            { degree: '1 maj/3', chordName: 'D♭/F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 maj/♭5', chordName: 'E♭/G', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'A♭7sus', beat: 3, duration: 2 },
          ],
        },
        { chords: [] },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      measuresPerRow: 8,
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '♭6 7', chordName: 'A7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '4 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 7', chordName: 'A♭7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '♭6 7', chordName: 'A7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '4 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 7', chordName: 'A♭7sus', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      measuresPerRow: 8,
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭6 dim7', chordName: 'Adim7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '2 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'E♭min7', beat: 1, duration: 2 },
            { degree: '1 maj/3', chordName: 'D♭/F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 maj/♭5', chordName: 'E♭/G', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'A♭7sus', beat: 3, duration: 2 },
          ],
          fermata: true,
        },
      ],
    },
    {
      id: 'section_g',
      label: 'Section G',
      measuresPerRow: 8,
      repeatCount: 3,
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '♭6 7', chordName: 'A7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '4 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 7', chordName: 'A♭7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '♭6 7', chordName: 'A7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '4 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 7', chordName: 'A♭7sus', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_h',
      label: 'Section H',
      measuresPerRow: 8,
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'E♭min7', beat: 1, duration: 2 },
            { degree: '1 maj/3', chordName: 'D♭/F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 maj/♭5', chordName: 'E♭/G', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'A♭7sus', beat: 3, duration: 2 },
          ],
        },
        { chords: [], fermata: true },
        {
          chords: [{ degree: '♭2 7', chordName: 'D7', beat: 1, duration: 4 }],
          fermata: true,
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
          fermata: true,
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
