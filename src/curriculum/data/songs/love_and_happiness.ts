import type { Song } from '@/curriculum/types/songLibrary';

export const love_and_happiness: Song = {
  id: 'love_and_happiness',
  title: 'Love And Happiness',
  artist: 'Al Green',
  year: 2001,
  historicalDescription:
    "Al Green's 'Love And Happiness' stands as one of the defining monuments of Southern soul, recorded at the height of his creative partnership with producer Willie Mitchell in Memphis. The track captures the raw, spiritual tension at the heart of Green's genius — the push and pull between earthly desire and divine devotion. Decades after its release, it remains a cornerstone of soul music, endlessly sampled and covered.",
  key: 'A♭ minor',
  keyRoot: 68,
  mode: 'minor',
  tempo: 98,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['soul'],
  techniques: [],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      measuresPerRow: 7,
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
          fermata: true,
        },
        { chords: [{ degree: '6 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'D♯7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '6 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'D♯7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      measuresPerRow: 6,
      bars: [
        { chords: [{ degree: '3 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 7/♭2', chordName: 'B7/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '7 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '7 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_c',
      label: 'Section C',
      measuresPerRow: 5,
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '7 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭5 maj', chordName: 'D', beat: 1, duration: 1 },
            { degree: '4 min7', chordName: 'C♯min7', beat: 2, duration: 1 },
            { degree: '3 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭5 maj', chordName: 'D', beat: 1, duration: 1 },
            { degree: '4 min7', chordName: 'C♯min7', beat: 2, duration: 1 },
            { degree: '3 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭5 maj', chordName: 'D', beat: 1, duration: 1 },
            { degree: '4 min7', chordName: 'C♯min7', beat: 2, duration: 1 },
            { degree: '3 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      measuresPerRow: 6,
      bars: [
        { chords: [{ degree: '6 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'D♯7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '6 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'D♯7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      measuresPerRow: 6,
      bars: [
        { chords: [{ degree: '6 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'D♯7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '6 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'D♯7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      measuresPerRow: 6,
      bars: [
        { chords: [{ degree: '3 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 7/♭2', chordName: 'B7/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '7 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '7 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_h',
      label: 'Section H',
      measuresPerRow: 5,
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '7 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭5 maj', chordName: 'D', beat: 1, duration: 1 },
            { degree: '4 min7', chordName: 'C♯min7', beat: 2, duration: 1 },
            { degree: '3 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭5 maj', chordName: 'D', beat: 1, duration: 1 },
            { degree: '4 min7', chordName: 'C♯min7', beat: 2, duration: 1 },
            { degree: '3 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭5 maj', chordName: 'D', beat: 1, duration: 1 },
            { degree: '4 min7', chordName: 'C♯min7', beat: 2, duration: 1 },
            { degree: '3 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      measuresPerRow: 6,
      bars: [
        { chords: [{ degree: '6 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'D♯7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '6 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'D♯7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_f_2',
      label: 'Section F',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_g',
      label: 'Section G',
      measuresPerRow: 6,
      bars: [
        { chords: [{ degree: '6 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'D♯7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '6 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'D♯7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_h_2',
      label: 'Section H',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=cPkXeWww0U8' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
