import type { Song } from '@/curriculum/types/songLibrary';

export const raging: Song = {
  id: 'raging',
  title: 'Raging',
  artist: 'Kygo',
  year: 2016,
  historicalDescription:
    "Kygo releases 'Raging' in 2016, a track that showcases the Norwegian producer's signature tropical house sound blending organic piano melodies with soaring electronic production. At a time when streaming platforms are reshaping how pop music reaches global audiences, Kygo's emotionally charged style earns him a massive international following and cements his place as a pioneer of the chillwave-meets-pop movement.",
  key: 'E♭ minor',
  keyRoot: 63,
  mode: 'minor',
  tempo: 102,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['pop', 'rock'],
  techniques: [],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      repeatCount: 3,
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '3 5', chordName: 'F♯5', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '3 5', chordName: 'F♯5', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      measuresPerRow: 5,
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 maj/2', chordName: 'C♯/F', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '3 5', chordName: 'F♯5', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '7 maj', chordName: 'C♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '7 maj/2', chordName: 'C♯/F', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      repeatCount: 6,
      bars: [
        { chords: [{ degree: '6 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '7 maj', chordName: 'C♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      measuresPerRow: 6,
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '3 5', chordName: 'F♯5', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '3 5', chordName: 'F♯5', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '3 5', chordName: 'F♯5', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      measuresPerRow: 5,
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 maj/2', chordName: 'C♯/F', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '3 5', chordName: 'F♯5', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '7 maj', chordName: 'C♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '7 maj/2', chordName: 'C♯/F', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      measuresPerRow: 5,
      bars: [
        { chords: [{ degree: '6 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '7 maj', chordName: 'C♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [], restBars: 1 },
      ],
    },
    {
      id: 'section_g',
      label: 'Section G',
      repeatCount: 6,
      bars: [
        { chords: [{ degree: '6 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '7 maj', chordName: 'C♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=ZWyktWYW3ZM' },
  ],
  artistImageSource: 'commissioned',

  artistImageRef: '/artists/kygo.webp',
  popularity: 50,
};
