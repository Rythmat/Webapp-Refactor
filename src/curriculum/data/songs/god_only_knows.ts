import type { Song } from '@/curriculum/types/songLibrary';

export const god_only_knows: Song = {
  id: 'god_only_knows',
  title: 'God Only Knows',
  artist: 'The Beach Boys',
  year: 1966,
  historicalDescription:
    "The Beach Boys release 'God Only Knows' as part of the landmark Pet Sounds album, a song so architecturally ambitious that Paul McCartney calls it the greatest song ever written. Brian Wilson layers orchestral instruments, unusual harmonies, and a tone of aching vulnerability that pushes pop music far beyond the surf and sunshine sound the band is known for. It changes what a pop song is allowed to feel like.",
  key: 'E minor',
  keyRoot: 64,
  mode: 'minor',
  tempo: 115,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['classic_rock'],
  techniques: [],

  sections: [
    {
      id: 'section_a',
      label: 'Section A',
      measuresPerRow: 3,
      bars: [
        { chords: [], restBars: 3 },
        {
          chords: [
            { degree: '1 maj/♯3', chordName: 'E/G♯', beat: 1, duration: 4 },
          ],
        },
        { chords: [] },
      ],
    },
    {
      id: 'section_b',
      label: 'Section B',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj/♯3', chordName: 'E/G♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'A/E', beat: 1, duration: 1 },
            { degree: '5 maj/2', chordName: 'B/F♯', beat: 2, duration: 1 },
            { degree: '6 maj/3', chordName: 'C/G', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        {
          chords: [
            { degree: '7 maj/4', chordName: 'D/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/4', chordName: 'B/A', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_d',
      label: 'Section D',
      bars: [
        {
          chords: [
            { degree: '1 maj/5', chordName: 'E/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 dim7', chordName: 'Cdim7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/5', chordName: 'E/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭5 dim7', chordName: 'B♭dim7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj/♯3', chordName: 'E/G♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 1 },
            { degree: '2 maj', chordName: 'F♯', beat: 2, duration: 1 },
            { degree: '3 maj', chordName: 'G', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      bars: [
        {
          chords: [
            { degree: '7 maj/4', chordName: 'D/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/4', chordName: 'B/A', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_g',
      label: 'Section G',
      bars: [
        {
          chords: [
            { degree: '1 maj/5', chordName: 'E/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 dim7', chordName: 'Cdim7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/5', chordName: 'E/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭5 dim7', chordName: 'B♭dim7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_h',
      label: 'Section H',
      measuresPerRow: 3,
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj/♯3', chordName: 'E/G♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
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
            { degree: '4 maj/1', chordName: 'A/E', beat: 1, duration: 1 },
            { degree: '2 min7', chordName: 'F♯min7', beat: 2, duration: 1 },
            { degree: '4 maj/1', chordName: 'A/E', beat: 3, duration: 1 },
            { degree: '3 maj', chordName: 'G', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'A/E', beat: 1, duration: 1 },
            { degree: '2 min7', chordName: 'F♯min7', beat: 2, duration: 1 },
            { degree: '4 maj/1', chordName: 'A/E', beat: 3, duration: 1 },
            { degree: '3 maj', chordName: 'G', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'A/E', beat: 1, duration: 1 },
            { degree: '2 min7', chordName: 'F♯min7', beat: 2, duration: 1 },
            { degree: '4 maj/1', chordName: 'A/E', beat: 3, duration: 1 },
            { degree: '3 maj', chordName: 'G', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'A/E', beat: 1, duration: 1 },
            { degree: '2 min7', chordName: 'F♯min7', beat: 2, duration: 1 },
            { degree: '4 maj/1', chordName: 'A/E', beat: 3, duration: 1 },
            { degree: '3 maj', chordName: 'G', beat: 4, duration: 1 },
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
            { degree: '3 maj/7', chordName: 'G/D', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7/2', chordName: 'Bmin7/F♯', beat: 1, duration: 2 },
            { degree: '5 min7', chordName: 'Bmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/7', chordName: 'E/D', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_k',
      label: 'Section K',
      bars: [
        {
          chords: [
            { degree: '4 maj/1', chordName: 'A/E', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭2 dim7', chordName: 'Fdim7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'A/E', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯7 dim7', chordName: 'D♯dim7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_l',
      label: 'Section L',
      measuresPerRow: 3,
      bars: [
        { chords: [{ degree: '7 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj/♯6', chordName: 'A/C♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_e_2',
      label: 'Section E',
      bars: [
        {
          chords: [
            { degree: '7 maj/4', chordName: 'D/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/4', chordName: 'B/A', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_n',
      label: 'Section N',
      bars: [
        {
          chords: [
            { degree: '1 maj/5', chordName: 'E/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 dim7', chordName: 'Cdim7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/5', chordName: 'E/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭5 dim7', chordName: 'B♭dim7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj/♯3', chordName: 'E/G♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/♯3', chordName: 'E/G♯', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=NADx3-qRxek' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
