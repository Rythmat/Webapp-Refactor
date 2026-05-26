import type { Song } from '@/curriculum/types/songLibrary';

export const easy: Song = {
  id: 'easy',
  title: 'Easy',
  artist: 'The Commodores',
  year: 1977,
  historicalDescription:
    "The Commodores release 'Easy', a slow-burning soul ballad that reveals a softer side of the Motown-signed funk outfit. Written by Lionel Richie, the song's quiet, confessional tone stands in contrast to the band's harder dance tracks — and becomes one of the defining moments of 1970s soft soul, foreshadowing Richie's massively successful solo career.",
  key: 'B♭ minor',
  keyRoot: 70,
  mode: 'minor',
  tempo: 68,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['pop'],
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
      measuresPerRow: 8,
      bars: [
        {
          chords: [{ degree: '7 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '1 min7/4',
              chordName: 'B♭min7/E♭',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [{ degree: '7 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '1 min7/4',
              chordName: 'B♭min7/E♭',
              beat: 1,
              duration: 4,
            },
          ],
        },
      ],
    },
    {
      id: 'section_c',
      label: 'Section C',
      measuresPerRow: 8,
      bars: [
        {
          chords: [{ degree: '7 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '1 min7/4',
              chordName: 'B♭min7/E♭',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [{ degree: '7 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '1 min7/4',
              chordName: 'B♭min7/E♭',
              beat: 1,
              duration: 4,
            },
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
          chords: [{ degree: '7 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '1 min7/4',
              chordName: 'B♭min7/E♭',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [{ degree: '7 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '1 min7/4',
              chordName: 'B♭min7/E♭',
              beat: 1,
              duration: 4,
            },
          ],
        },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      measuresPerRow: 7,
      bars: [
        {
          chords: [{ degree: '7 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '1 min7/4',
              chordName: 'B♭min7/E♭',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [{ degree: '6 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '3 maj/5', chordName: 'D♭/F', beat: 1, duration: 2 },
            { degree: '3 maj/4', chordName: 'D♭/E♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '7 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      measuresPerRow: 6,
      bars: [
        {
          chords: [{ degree: '6 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Fmin7', beat: 1, duration: 2 },
            { degree: '4 min7', chordName: 'E♭min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            {
              degree: '4 min7/7',
              chordName: 'E♭min7/A♭',
              beat: 1,
              duration: 2,
            },
            { degree: '3 maj/5', chordName: 'D♭/F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '6 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Fmin7', beat: 1, duration: 2 },
            { degree: '4 min7', chordName: 'E♭min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            {
              degree: '4 min7/7',
              chordName: 'E♭min7/A♭',
              beat: 1,
              duration: 2,
            },
            { degree: '3 maj/5', chordName: 'D♭/F', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_g',
      label: 'Section G',
      bars: [
        {
          chords: [{ degree: '6 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '6 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Fmin7', beat: 1, duration: 2 },
            { degree: '4 min7', chordName: 'E♭min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            {
              degree: '1 min7/7',
              chordName: 'B♭min7/A♭',
              beat: 1,
              duration: 4,
            },
          ],
        },
      ],
    },
    {
      id: 'section_h',
      label: 'Section H',
      bars: [
        {
          chords: [{ degree: '♭2 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '6 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭2 maj/4', chordName: 'B/E♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '3 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      measuresPerRow: 8,
      bars: [
        {
          chords: [{ degree: '7 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '1 min7/4',
              chordName: 'B♭min7/E♭',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [{ degree: '7 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '1 min7/4',
              chordName: 'B♭min7/E♭',
              beat: 1,
              duration: 4,
            },
          ],
        },
      ],
    },
    {
      id: 'section_e_2',
      label: 'Section E',
      measuresPerRow: 8,
      bars: [
        {
          chords: [{ degree: '7 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '1 min7/4',
              chordName: 'B♭min7/E♭',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [{ degree: '7 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '♭2 min7/♭5',
              chordName: 'Bmin7/E',
              beat: 1,
              duration: 4,
            },
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
          chords: [{ degree: '♯7 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭2 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '♭2 min7/♭5',
              chordName: 'Bmin7/E',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [{ degree: '♯7 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭2 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '♭2 min7/♭5',
              chordName: 'Bmin7/E',
              beat: 1,
              duration: 4,
            },
          ],
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=9nBSd1U18vM' },
  ],
  artistImageSource: 'commissioned',

  artistImageRef: '/artists/the-commodores.webp',
  popularity: 50,
};
