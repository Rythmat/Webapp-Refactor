import type { Song } from '@/curriculum/types/songLibrary';

export const will_you_be_there: Song = {
  id: 'will_you_be_there',
  title: 'Will You Be There',
  artist: 'Michael Jackson',
  year: 1993,
  historicalDescription:
    "Michael Jackson releases 'Will You Be There' as part of the Dangerous era, a sweeping gospel-infused ballad that opens with a sample of Beethoven's Ninth Symphony before building into a soaring plea for unconditional love. Featured in the film Free Willy, the song reaches millions and showcases Jackson at his most emotionally raw — gospel, orchestral pop, and vulnerability fused into one unforgettable moment.",
  key: 'D major',
  keyRoot: 62,
  mode: 'major',
  tempo: 83,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['pop'],
  techniques: [],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      measuresPerRow: 5,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7/1', chordName: 'Emin7/D', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7/1', chordName: 'Emin7/D', beat: 1, duration: 4 },
          ],
        },
        { chords: [], restBars: 8 },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      measuresPerRow: 5,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7/1', chordName: 'Emin7/D', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7/1', chordName: 'Emin7/D', beat: 1, duration: 4 },
          ],
        },
        { chords: [], restBars: 8 },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7/1', chordName: 'Emin7/D', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7/1', chordName: 'Emin7/D', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [
            { degree: '♭3 maj', chordName: 'F', beat: 1, duration: 1 },
            { degree: '♭2 maj', chordName: 'E♭', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'F', beat: 1, duration: 1 },
            { degree: '♭2 maj', chordName: 'E♭', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'F', beat: 1, duration: 1 },
            { degree: '♭2 maj', chordName: 'E♭', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      bars: [
        { chords: [{ degree: '2 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 min7/2', chordName: 'F♯min7/E', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '2 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 min7/2', chordName: 'F♯min7/E', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      bars: [
        {
          chords: [{ degree: '3 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            {
              degree: '♭5 min7/3',
              chordName: 'G♯min7/F♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [{ degree: '3 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            {
              degree: '♭5 min7/3',
              chordName: 'G♯min7/F♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
      ],
    },
    {
      id: 'section_g',
      label: 'Section G',
      bars: [
        {
          chords: [{ degree: '♭5 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            {
              degree: '♭6 min7/♭5',
              chordName: 'B♭min7/A♭',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [{ degree: '♭5 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            {
              degree: '♭6 min7/♭5',
              chordName: 'B♭min7/A♭',
              beat: 1,
              duration: 4,
            },
          ],
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=jQY_QL_wvQU' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
