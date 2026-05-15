import type { Song } from '@/curriculum/types/songLibrary';

export const shake_it_off: Song = {
  id: 'shake_it_off',
  title: 'Shake It Off',
  artist: 'Taylor Swift',
  year: 2014,
  historicalDescription:
    "Taylor Swift releases 'Shake It Off' in 2014, marking a deliberate pivot from country to pure pop and announcing her album '1989'. The song's carefree message of brushing off critics becomes an anthem for self-empowerment, signaling a new era in Swift's career and cementing her status as one of pop music's most commanding figures.",
  key: 'G major',
  keyRoot: 67,
  mode: 'major',
  tempo: 80,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['synth_pop'],
  techniques: [],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      measuresPerRow: 1,
      bars: [{ chords: [], restBars: 2 }],
    },
    {
      id: 'verse',
      label: 'Verse',
      measuresPerRow: 5,
      repeatCount: 3,
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'A min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'A min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      measuresPerRow: 5,
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'A min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'A min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      measuresPerRow: 5,
      repeatCount: 3,
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'A min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'A min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      measuresPerRow: 5,
      repeatCount: 3,
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'A min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'A min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      measuresPerRow: 1,
      bars: [{ chords: [], restBars: 9 }],
    },
    {
      id: 'section_f',
      label: 'Section F',
      measuresPerRow: 5,
      repeatCount: 4,
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'A min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'A min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=nfWlot6h_JM' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
