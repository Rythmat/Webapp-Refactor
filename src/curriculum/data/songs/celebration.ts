import type { Song } from '@/curriculum/types/songLibrary';

export const celebration: Song = {
  id: 'celebration',
  title: 'Celebration',
  artist: 'Kool & the Gang',
  year: undefined,

  historicalDescription:
    "Kool and the Gang releases 'Celebration', a euphoric funk anthem that becomes one of the most recognizable party songs in history. Its irresistible horn-driven groove and jubilant chorus cross every demographic barrier, transforming the band from jazz-funk underground pioneers into mainstream pop stars. The song becomes the soundtrack to Super Bowls, weddings, and New Year's Eve countdowns for decades to come.",
  key: 'A♭ major',
  keyRoot: 68,
  mode: 'major',
  tempo: 120,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['funk'],
  techniques: [],

  sections: [
    {
      id: 'section_a',
      label: 'Section A',
      bars: [{ chords: [], restBars: 8 }],
    },
    {
      id: 'verse',
      label: 'Verse',
      repeatCount: 4,
      bars: [
        {
          chords: [
            { degree: '4 maj/6', chordName: 'D♭/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 maj/6', chordName: 'D♭/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'G♭', beat: 1, duration: 1 },
            { degree: '4 maj/6', chordName: 'D♭/F', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/6', chordName: 'D♭/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 maj/6', chordName: 'D♭/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'G♭', beat: 1, duration: 1 },
            { degree: '4 maj/6', chordName: 'D♭/F', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      repeatCount: 4,
      bars: [
        {
          chords: [
            { degree: '♭7 maj/1', chordName: 'G♭/A♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/1', chordName: 'G♭/A♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'D♭/A♭', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        { chords: [] },
        {
          chords: [
            { degree: '♭7 maj/1', chordName: 'G♭/A♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/1', chordName: 'G♭/A♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'D♭/A♭', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        { chords: [] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [
            { degree: '1 maj/4', chordName: 'A♭/D♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/4', chordName: 'A♭/D♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/6', chordName: 'E♭/F', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '6 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      repeatCount: 4,
      bars: [
        {
          chords: [
            { degree: '4 maj/6', chordName: 'D♭/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 maj/6', chordName: 'D♭/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'G♭', beat: 1, duration: 1 },
            { degree: '4 maj/6', chordName: 'D♭/F', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/6', chordName: 'D♭/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 maj/6', chordName: 'D♭/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'G♭', beat: 1, duration: 1 },
            { degree: '4 maj/6', chordName: 'D♭/F', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      repeatCount: 4,
      bars: [
        {
          chords: [
            { degree: '♭7 maj/1', chordName: 'G♭/A♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/1', chordName: 'G♭/A♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'D♭/A♭', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        { chords: [] },
        {
          chords: [
            { degree: '♭7 maj/1', chordName: 'G♭/A♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/1', chordName: 'G♭/A♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'D♭/A♭', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        { chords: [] },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      bars: [
        {
          chords: [
            { degree: '4 maj/6', chordName: 'D♭/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 maj/6', chordName: 'D♭/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'G♭', beat: 1, duration: 1 },
            { degree: '4 maj/6', chordName: 'D♭/F', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/6', chordName: 'D♭/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 maj/6', chordName: 'D♭/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'G♭', beat: 1, duration: 1 },
            { degree: '4 maj/6', chordName: 'D♭/F', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=3GwjfUFyY6M' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/kool-and-the-gang.webp',
  popularity: 50,
};
